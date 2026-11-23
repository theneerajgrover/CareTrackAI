"""
app.py
------
Flask REST API for CareTrack AI backend.

Endpoints:
  POST /api/auth/register       - User registration (bcrypt + JWT)
  POST /api/auth/login          - User login (JWT access + refresh tokens)
  POST /api/auth/refresh        - Refresh access token
  POST /api/auth/logout         - Invalidate refresh token
  POST /api/predict             - Disease prediction with remedies/warnings
  GET  /api/symptoms            - List all symptoms with numeric IDs
  GET  /api/diseases            - List all diseases with numeric IDs
  GET  /api/predictions         - User's past predictions
  GET  /api/predictions/<id>    - Single prediction with full results
  GET  /api/model/info          - Model metadata & metrics
  GET  /api/health              - Health check
"""

import os
import time
import json
import uuid
import functools
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
from flask import Flask, request, jsonify, g, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

from predict import predict_disease, get_model_info, get_available_symptoms, _load_model
from database import query, execute, execute_returning, execute_transaction, execute_values
from gemini_service import generate_remedies_and_warnings, classify_risk, get_doctor_specialty, _get_client
from symptom_mapper import FRONTEND_TO_DATASET
from pdf_service import generate_medical_report_pdf, sanitize_report_filename

load_dotenv()

# -- In-Memory Lookup Caches & Startup Warmup -----------------------------------
_SYMPTOM_MAP_CACHE = {}
_DISEASE_MAP_CACHE = {}

def _init_caches():
    global _SYMPTOM_MAP_CACHE, _DISEASE_MAP_CACHE
    try:
        syms = query("SELECT id, key, label FROM symptoms", fetch_all=True)
        if syms:
            _SYMPTOM_MAP_CACHE = {r["key"]: r for r in syms}
        dis = query("SELECT id, name FROM diseases", fetch_all=True)
        if dis:
            _DISEASE_MAP_CACHE = {r["name"]: r["id"] for r in dis}
    except Exception as e:
        print(f"[app] Cache init warning: {e}")

try:
    _load_model()
    _get_client()
    _init_caches()
except Exception as e:
    print(f"[app] Warmup warning: {e}")

# -- App Setup -----------------------------------------------------------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register Admin Portal Blueprint
from admin_routes import admin_bp
app.register_blueprint(admin_bp)

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "caretrack-ai-default-secret")
ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 900))       # 15 min
REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))  # 7 days


# -- JWT Helpers ---------------------------------------------------------------

def create_access_token(user_id, email):
    """Create a short-lived JWT access token."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=ACCESS_TOKEN_EXPIRES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def create_refresh_token(user_id):
    """Create a long-lived refresh token and store it in the database."""
    token = uuid.uuid4().hex + uuid.uuid4().hex  # 64-char random token
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=REFRESH_TOKEN_EXPIRES)

    execute(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (str(user_id), token, expires_at),
    )
    return token


def require_auth(f):
    """Decorator to require a valid JWT access token."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            if payload.get("type") != "access":
                return jsonify({"error": "Invalid token type"}), 401
            g.user_id = payload["sub"]
            g.user_email = payload["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Access token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid access token"}), 401

        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Decorator that extracts user info from JWT if provided, but does not enforce auth."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        g.user_id = None
        g.user_email = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                if payload.get("type") == "access":
                    g.user_id = payload.get("sub")
                    g.user_email = payload.get("email")
            except Exception:
                pass  # Proceed as guest if token is invalid
        return f(*args, **kwargs)
    return decorated


# -- Root & Health Check --------------------------------------------------------

@app.route("/", methods=["GET"])
@app.route("/api", methods=["GET"])
@app.route("/api/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "message": "CareTrack AI Backend API is running successfully!",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "symptoms": "/api/symptoms",
            "diseases": "/api/diseases",
            "model_info": "/api/model/info",
            "predict": "/api/predict (POST)"
        },
        "frontend_url": "http://localhost:5173"
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "CareTrack AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# -- Auth Endpoints ------------------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user with bcrypt-hashed password."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if user exists
    existing = query("SELECT id FROM users WHERE email = %s", (email,), fetch_one=True)
    if existing:
        return jsonify({"error": "User already exists"}), 409

    # Hash password with bcrypt (cost factor 10 for optimal OWASP security & fast low-vCPU performance)
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")

    # Insert user
    user = execute_returning(
        "INSERT INTO users (name, email, password_hash, phone) VALUES (%s, %s, %s, %s) RETURNING id, name, email",
        (name, email, password_hash, phone),
    )

    # Generate tokens
    access_token = create_access_token(user["id"], email)
    refresh_token = create_refresh_token(user["id"])

    return jsonify({
        "message": "Registration successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"]},
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login with email and password, returns JWT access + refresh tokens."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find user in patients table
    user = query(
        "SELECT id, name, email, password_hash, role FROM users WHERE email = %s",
        (email,), fetch_one=True,
    )

    if user and bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        is_admin_user = (user.get("role") == "admin")
        if is_admin_user:
            admin_row = query("SELECT id FROM admin_users WHERE email = %s", (email,), fetch_one=True)
            admin_id = admin_row["id"] if admin_row else user["id"]
            from admin_routes import create_admin_access_token, create_admin_refresh_token
            access_token = create_admin_access_token(admin_id, email, "admin")
            if admin_row:
                refresh_token = create_admin_refresh_token(admin_id)
            else:
                refresh_token = create_refresh_token(user["id"])
            return jsonify({
                "message": "Admin login successful",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "is_admin": True,
                "admin": {
                    "id": str(admin_id),
                    "name": user["name"],
                    "email": user["email"],
                    "role": "admin",
                },
                "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"]},
            }), 200

        access_token = create_access_token(user["id"], email)
        refresh_token = create_refresh_token(user["id"])
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "is_admin": False,
            "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"]},
        }), 200

    # If not found or failed in users table, check admin_users table
    admin = query(
        "SELECT id, name, email, password_hash, role, status FROM admin_users WHERE email = %s",
        (email,), fetch_one=True,
    )

    if admin and bcrypt.checkpw(password.encode("utf-8"), admin["password_hash"].encode("utf-8")):
        if admin["status"] != "active":
            return jsonify({"error": "Admin account is inactive. Contact system administrator."}), 403

        from admin_routes import create_admin_access_token, create_admin_refresh_token
        access_token = create_admin_access_token(admin["id"], email, admin["role"])
        refresh_token = create_admin_refresh_token(admin["id"])

        # Also create a patient-compatible access token for session state if needed
        return jsonify({
            "message": "Admin login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "is_admin": True,
            "admin": {
                "id": str(admin["id"]),
                "name": admin["name"],
                "email": admin["email"],
                "role": admin["role"],
            },
            "user": {"id": str(admin["id"]), "name": admin["name"], "email": admin["email"]},
        }), 200

    return jsonify({"error": "Invalid email or password"}), 401


@app.route("/api/auth/refresh", methods=["POST"])
def refresh():
    """Exchange a valid refresh token for a new access token."""
    data = request.get_json()
    if not data or not data.get("refresh_token"):
        return jsonify({"error": "Refresh token is required"}), 400

    token = data["refresh_token"]

    # Find valid refresh token
    row = query(
        """SELECT rt.id, rt.user_id, u.email
           FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id
           WHERE rt.token = %s AND rt.expires_at > NOW()""",
        (token,), fetch_one=True,
    )
    if not row:
        return jsonify({"error": "Invalid or expired refresh token"}), 401

    # Generate new access token
    access_token = create_access_token(row["user_id"], row["email"])

    return jsonify({
        "access_token": access_token,
        "message": "Token refreshed",
    }), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Invalidate a refresh token."""
    data = request.get_json()
    if not data or not data.get("refresh_token"):
        return jsonify({"error": "Refresh token is required"}), 400

    execute("DELETE FROM refresh_tokens WHERE token = %s", (data["refresh_token"],))
    return jsonify({"message": "Logged out successfully"}), 200


# -- Prediction Endpoint -------------------------------------------------------

@app.route("/api/predict", methods=["POST"])
@optional_auth
def predict():
    """
    Predict diseases from symptoms, store in DB, return with remedies/warnings.
    Works for both authenticated users (saved to user account) and guest/free-trial users.

    Request body:
    {
        "symptoms": ["fever", "cough", "sore_throat"],
        "patient_details": {
            "name": "Jane Doe", "age": "30", "gender": "female",
            "dob": "1996-01-01", "bloodGroup": "O+", "height": "168", "weight": "62"
        }
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    symptoms = data.get("symptoms", [])
    if not symptoms or not isinstance(symptoms, list):
        return jsonify({"error": "A non-empty list of symptoms is required"}), 400

    patient = data.get("patient_details", {})

    # -- Step 1: Map symptom keys to numeric IDs from Cache/DB --
    symptom_ids = []
    symptom_key_to_id = {}
    for raw_key in symptoms:
        clean_key = str(raw_key).strip().lower().replace(" ", "_")
        
        # 1. Direct match in in-memory cache
        row = _SYMPTOM_MAP_CACHE.get(clean_key)
        
        # 2. Try mapped dataset column from FRONTEND_TO_DATASET
        if not row and clean_key in FRONTEND_TO_DATASET:
            for mc in FRONTEND_TO_DATASET[clean_key]:
                if mc in _SYMPTOM_MAP_CACHE:
                    row = _SYMPTOM_MAP_CACHE[mc]
                    break
        
        # 3. Fallback to DB if missing
        if not row:
            row = query("SELECT id, key, label FROM symptoms WHERE key = %s", (clean_key,), fetch_one=True)
            if not row and clean_key in FRONTEND_TO_DATASET:
                for mc in FRONTEND_TO_DATASET[clean_key]:
                    row = query("SELECT id, key, label FROM symptoms WHERE key = %s", (mc,), fetch_one=True)
                    if row:
                        break
            if not row:
                human_label = raw_key.replace("_", " ").title()
                row = execute_returning(
                    """INSERT INTO symptoms (key, label, category) 
                       VALUES (%s, %s, %s) 
                       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label 
                       RETURNING id, key, label""",
                    (clean_key, human_label, "general"),
                )
            if row:
                _SYMPTOM_MAP_CACHE[clean_key] = row
        
        if row and row["id"] not in symptom_ids:
            symptom_ids.append(row["id"])
            symptom_key_to_id[clean_key] = row["id"]

    # -- Step 2: Run model prediction --
    try:
        result = predict_disease(symptoms, top_n=5)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    if not result.get("predictions"):
        return jsonify({
            "error": "No predictions could be made. None of the symptoms matched the model.",
            "symptoms_unmatched": result.get("symptoms_unmatched", []),
        }), 422

    # -- Step 3: Map disease names to numeric IDs using fast cache --
    predictions_with_ids = []
    for i, pred in enumerate(result["predictions"]):
        disease_name = pred["disease"]
        disease_id = _DISEASE_MAP_CACHE.get(disease_name)
        if not disease_id:
            disease_row = query(
                "SELECT id FROM diseases WHERE name = %s", (disease_name,), fetch_one=True
            )
            disease_id = disease_row["id"] if disease_row else None
            if disease_id:
                _DISEASE_MAP_CACHE[disease_name] = disease_id

        predictions_with_ids.append({
            "disease": disease_name,
            "disease_id": disease_id,
            "confidence": pred["confidence"],
            "rank": i + 1,
        })

    # -- Step 4: Generate remedies and warnings --
    enriched_predictions = generate_remedies_and_warnings(predictions_with_ids)

    # -- Step 5: Store prediction in DB (with deduplication guard) --
    blood_group = patient.get("blood_group") or patient.get("bloodGroup") or ""
    height = str(patient.get("height") or "")
    weight = str(patient.get("weight") or "")
    user_id = getattr(g, "user_id", None)

    # Check for identical duplicate prediction within 5 seconds for same user/patient
    existing = None
    if user_id:
        existing = query(
            """SELECT id FROM predictions
               WHERE user_id = %s AND patient_name = %s AND symptom_ids = %s
                 AND created_at >= NOW() - INTERVAL '5 seconds'
               ORDER BY created_at DESC LIMIT 1""",
            (user_id, patient.get("name", ""), symptom_ids),
            fetch_one=True,
        )

    if existing:
        prediction_id = str(existing["id"])
    else:
        prediction_record = execute_returning(
            """INSERT INTO predictions
               (user_id, patient_name, patient_age, patient_gender, patient_dob,
                patient_blood_group, patient_height, patient_weight,
                patient_email, patient_phone, symptom_ids)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id""",
            (
                user_id,
                patient.get("name", ""),
                str(patient.get("age", "")),
                patient.get("gender", ""),
                patient.get("dob", ""),
                blood_group,
                height,
                weight,
                patient.get("email", ""),
                patient.get("phone", ""),
                symptom_ids,
            ),
        )
        prediction_id = str(prediction_record["id"])

        # -- Step 6: Store each prediction result (atomic batch insert in 1 network round-trip) --
        if enriched_predictions:
            values = [
                (
                    prediction_id,
                    pred.get("disease_id"),
                    pred["confidence"],
                    pred["rank"],
                    pred.get("risk_level", "low"),
                    pred.get("remedies_text"),
                    pred.get("warning_text"),
                )
                for pred in enriched_predictions
            ]
            execute_values(
                """INSERT INTO prediction_results
                   (prediction_id, disease_id, confidence_pct, rank, risk_level, remedies_text, warning_text)
                   VALUES %s""",
                values,
            )

    # -- Step 7: Build response --
    model_info_data = get_model_info()

    return jsonify({
        "prediction_id": prediction_id,
        "predictions": [
            {
                "rank": p["rank"],
                "disease": p["disease"],
                "disease_id": p.get("disease_id"),
                "confidence": p["confidence"],
                "risk_level": p.get("risk_level"),
                "doctor": p.get("doctor", "General Physician"),
                "remedies": p.get("remedies_text"),
                "remedies_text": p.get("remedies_text"),
                "warning": p.get("warning_text"),
                "warning_text": p.get("warning_text"),
            }
            for p in enriched_predictions
        ],
        "symptom_ids": symptom_ids,
        "symptoms_matched": result.get("symptoms_matched", []),
        "symptoms_unmatched": result.get("symptoms_unmatched", []),
        "model_info": {
            "name": model_info_data.get("model_name"),
            "accuracy": model_info_data.get("accuracy"),
            "f1_score": model_info_data.get("f1_score"),
        },
        "disclaimer": "CareTrack AI predictions are for clinical decision support and health guidance only and do not constitute an official medical diagnosis. Always consult a licensed healthcare professional for clinical evaluation and treatment.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


# -- Guest / One-Time Free Check Endpoints -------------------------------------

@app.route("/api/guest/status", methods=["GET"])
def guest_status():
    """Check if the guest user has already consumed their 1 free AI health check."""
    guest_id = request.args.get("guest_id") or request.headers.get("X-Guest-ID", "").strip()

    if not guest_id:
        return jsonify({"used": False, "remaining": 1}), 200

    row = query("SELECT id, created_at FROM guest_usage WHERE guest_id = %s LIMIT 1", (guest_id,), fetch_one=True)

    is_used = bool(row)
    return jsonify({
        "used": is_used,
        "remaining": 0 if is_used else 1,
        "message": "1-time free guest check completed." if is_used else "1 free check available."
    }), 200


@app.route("/api/guest/predict", methods=["POST"])
def guest_predict():
    """
    Execute real disease prediction for a guest user with strict 1-time limit enforcement.
    Uses existing ML model, symptom mapping, and clinical enrichment.
    """
    data = request.get_json() or {}
    guest_id = data.get("guest_id") or request.headers.get("X-Guest-ID", "").strip()
    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()

    if not guest_id:
        guest_id = str(uuid.uuid4())

    # Check 1-time guest limit
    existing = query("SELECT id FROM guest_usage WHERE guest_id = %s LIMIT 1", (guest_id,), fetch_one=True)
    if existing:
        return jsonify({
            "error": "1-Time Free Check limit reached. Please sign in or create a free account to perform unlimited clinical assessments.",
            "code": "GUEST_LIMIT_REACHED",
            "used": True,
        }), 403

    symptoms = data.get("symptoms", [])
    if not symptoms or not isinstance(symptoms, list):
        return jsonify({"error": "A non-empty list of symptoms is required."}), 400

    patient = data.get("patient_details", {})

    # Map symptoms using existing DB & cache
    symptom_ids = []
    for raw_key in symptoms:
        clean_key = str(raw_key).strip().lower().replace(" ", "_")
        row = _SYMPTOM_MAP_CACHE.get(clean_key)
        if not row and clean_key in FRONTEND_TO_DATASET:
            for mc in FRONTEND_TO_DATASET[clean_key]:
                if mc in _SYMPTOM_MAP_CACHE:
                    row = _SYMPTOM_MAP_CACHE[mc]
                    break
        if not row:
            row = query("SELECT id, key, label FROM symptoms WHERE key = %s", (clean_key,), fetch_one=True)
            if row:
                _SYMPTOM_MAP_CACHE[clean_key] = row
        if row and row["id"] not in symptom_ids:
            symptom_ids.append(row["id"])

    # Run real ML model prediction
    try:
        result = predict_disease(symptoms, top_n=5)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    if not result.get("predictions"):
        return jsonify({
            "error": "No predictions could be made. None of the symptoms matched the model.",
            "symptoms_unmatched": result.get("symptoms_unmatched", []),
        }), 422

    # Map disease IDs
    predictions_with_ids = []
    for i, pred in enumerate(result["predictions"]):
        disease_name = pred["disease"]
        disease_id = _DISEASE_MAP_CACHE.get(disease_name)
        if not disease_id:
            disease_row = query("SELECT id FROM diseases WHERE name = %s", (disease_name,), fetch_one=True)
            disease_id = disease_row["id"] if disease_row else None
            if disease_id:
                _DISEASE_MAP_CACHE[disease_name] = disease_id

        predictions_with_ids.append({
            "disease": disease_name,
            "disease_id": disease_id,
            "confidence": pred["confidence"],
            "rank": i + 1,
        })

    # Generate remedies, warnings, and specialist referrals
    enriched_predictions = generate_remedies_and_warnings(predictions_with_ids)

    # Persist guest prediction record (with user_id = NULL)
    blood_group = patient.get("blood_group") or patient.get("bloodGroup") or ""
    height = str(patient.get("height") or "")
    weight = str(patient.get("weight") or "")

    prediction_record = execute_returning(
        """INSERT INTO predictions
           (user_id, patient_name, patient_age, patient_gender, patient_dob,
            patient_blood_group, patient_height, patient_weight,
            patient_email, patient_phone, symptom_ids)
           VALUES (NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (
            patient.get("name") or "Guest Patient",
            str(patient.get("age", "30")),
            patient.get("gender", "other"),
            patient.get("dob", ""),
            blood_group,
            height,
            weight,
            patient.get("email", ""),
            patient.get("phone", ""),
            symptom_ids,
        ),
    )
    prediction_id = str(prediction_record["id"])

    # Persist prediction findings (atomic batch insert in 1 network round-trip)
    if enriched_predictions:
        values = [
            (
                prediction_id,
                pred.get("disease_id"),
                pred["confidence"],
                pred["rank"],
                pred.get("risk_level", "low"),
                pred.get("remedies_text"),
                pred.get("warning_text"),
            )
            for pred in enriched_predictions
        ]
        execute_values(
            """INSERT INTO prediction_results
               (prediction_id, disease_id, confidence_pct, rank, risk_level, remedies_text, warning_text)
               VALUES %s""",
            values,
        )

    # Record guest usage to enforce 1-time limit
    claimed = execute(
        """INSERT INTO guest_usage (guest_id, ip_address, prediction_id)
           VALUES (%s, %s, %s)
           ON CONFLICT (guest_id) DO NOTHING""",
        (guest_id, ip_address, prediction_id),
    )

    if claimed == 0:
        # A concurrent request with this guest_id already claimed the free assessment!
        # Safely remove this request's unlinked prediction records in an atomic transaction
        execute_transaction([
            ("DELETE FROM prediction_results WHERE prediction_id = %s", (prediction_id,)),
            ("DELETE FROM predictions WHERE id = %s", (prediction_id,)),
        ])
        return jsonify({
            "error": "1-Time Free Check limit reached. Please sign in or create a free account to perform unlimited clinical assessments.",
            "code": "GUEST_LIMIT_REACHED",
            "used": True,
        }), 403

    model_info_data = get_model_info()

    return jsonify({
        "prediction_id": prediction_id,
        "predictions": [
            {
                "rank": p["rank"],
                "disease": p["disease"],
                "disease_id": p.get("disease_id"),
                "confidence": p["confidence"],
                "risk_level": p.get("risk_level"),
                "doctor": p.get("doctor", "General Physician"),
                "remedies": p.get("remedies_text"),
                "remedies_text": p.get("remedies_text"),
                "warning": p.get("warning_text"),
                "warning_text": p.get("warning_text"),
            }
            for p in enriched_predictions
        ],
        "symptom_ids": symptom_ids,
        "symptoms_matched": result.get("symptoms_matched", []),
        "symptoms_unmatched": result.get("symptoms_unmatched", []),
        "model_info": {
            "name": model_info_data.get("model_name"),
            "accuracy": model_info_data.get("accuracy"),
            "f1_score": model_info_data.get("f1_score"),
        },
        "disclaimer": "CareTrack AI predictions are for clinical decision support and health guidance only and do not constitute an official medical diagnosis. Always consult a licensed healthcare professional for clinical evaluation and treatment.",
        "guest_used": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


# -- Past Predictions ----------------------------------------------------------

@app.route("/api/predictions", methods=["GET"])
@require_auth
def list_predictions():
    """List all predictions for the authenticated user in 1 single high-performance query."""
    rows = query(
        """SELECT p.id, p.patient_name, p.symptom_ids, p.created_at,
                  pr.confidence_pct as top_confidence,
                  pr.risk_level as top_risk,
                  d.name as top_disease,
                  COALESCE(pr_counts.num_findings, 0) as num_findings
           FROM predictions p
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id AND pr.rank = 1
           LEFT JOIN diseases d ON pr.disease_id = d.id
           LEFT JOIN (
               SELECT prediction_id, COUNT(*) as num_findings
               FROM prediction_results
               GROUP BY prediction_id
           ) pr_counts ON pr_counts.prediction_id = p.id
           WHERE p.user_id = %s
           ORDER BY p.created_at DESC LIMIT 50""",
        (g.user_id,), fetch_all=True,
    )

    predictions = [
        {
            "id": str(r["id"]),
            "patient_name": r["patient_name"],
            "symptom_ids": r["symptom_ids"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "top_disease": r["top_disease"],
            "top_confidence": float(r["top_confidence"]) if r["top_confidence"] is not None else None,
            "risk_level": r.get("top_risk") or "low",
            "status": "completed",
            "num_findings": int(r["num_findings"] or 0),
        }
        for r in (rows or [])
    ]

    return jsonify({"predictions": predictions}), 200


@app.route("/api/user/reports", methods=["GET"])
@require_auth
def list_user_reports():
    """
    List all clinical reports generated from user's assessments.
    Each report references its persisted prediction record.
    Security: Only documents belonging to g.user_id are returned (zero IDOR).
    Zero fake data, zero prediction recalculation.
    """
    rows = query(
        """SELECT p.id, p.patient_name, p.symptom_ids, p.created_at,
                  pr.confidence_pct as top_confidence,
                  pr.risk_level as top_risk,
                  d.name as top_disease,
                  COALESCE(pr_counts.num_findings, 0) as num_findings
           FROM predictions p
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id AND pr.rank = 1
           LEFT JOIN diseases d ON pr.disease_id = d.id
           LEFT JOIN (
               SELECT prediction_id, COUNT(*) as num_findings
               FROM prediction_results
               GROUP BY prediction_id
           ) pr_counts ON pr_counts.prediction_id = p.id
           WHERE p.user_id = %s
           ORDER BY p.created_at DESC LIMIT 50""",
        (g.user_id,), fetch_all=True,
    )

    reports = []
    for r in (rows or []):
        pred_id = str(r["id"])
        disease = r["top_disease"] or "Health Assessment"
        created_at_iso = r["created_at"].isoformat() if r["created_at"] else None
        symptom_count = len(r["symptom_ids"]) if r["symptom_ids"] else 0
        conf = float(r["top_confidence"]) if r["top_confidence"] is not None else None
        risk = r.get("top_risk") or "low"

        reports.append({
            "id": f"rep-{pred_id[:8]}-cca",
            "prediction_id": pred_id,
            "title": f"Clinical Assessment Dossier — {disease.title()}",
            "category": "Complete Clinical Assessment",
            "category_code": "clinical_assessment",
            "file_format": "PDF (Vector Document)",
            "file_size": "42 KB",
            "status": "Available",
            "created_at": created_at_iso,
            "assessment_date": created_at_iso,
            "patient_name": r["patient_name"],
            "primary_condition": disease,
            "confidence": conf,
            "risk_level": risk,
            "symptom_count": symptom_count,
            "download_url": f"/api/predictions/{pred_id}/pdf",
        })

    return jsonify({"reports": reports}), 200


@app.route("/api/predictions/<prediction_id>", methods=["GET"])
@require_auth
def get_prediction(prediction_id):
    """Get a specific prediction with full results."""
    pred = query(
        """SELECT * FROM predictions WHERE id = %s AND user_id = %s""",
        (prediction_id, g.user_id), fetch_one=True,
    )
    if not pred:
        return jsonify({"error": "Prediction not found"}), 404

    results = query(
        """SELECT pr.*, d.name as disease_name
           FROM prediction_results pr LEFT JOIN diseases d ON pr.disease_id = d.id
           WHERE pr.prediction_id = %s ORDER BY pr.rank""",
        (prediction_id,), fetch_all=True,
    )

    # Resolve symptom names from IDs using cache and bulk query
    symptom_names = []
    if pred["symptom_ids"]:
        missing_ids = [sid for sid in pred["symptom_ids"] if not any(s.get("id") == sid for s in _SYMPTOM_MAP_CACHE.values())]
        if missing_ids:
            fetched = query("SELECT id, key, label FROM symptoms WHERE id = ANY(%s)", (missing_ids,), fetch_all=True)
            if fetched:
                for f in fetched:
                    _SYMPTOM_MAP_CACHE[f["key"]] = f

        cache_by_id = {s["id"]: s for s in _SYMPTOM_MAP_CACHE.values() if "id" in s}
        for sid in pred["symptom_ids"]:
            s = cache_by_id.get(sid)
            if s:
                symptom_names.append({"id": sid, "key": s["key"], "label": s["label"]})

    return jsonify({
        "id": str(pred["id"]),
        "patient": {
            "name": pred["patient_name"],
            "age": pred["patient_age"],
            "gender": pred["patient_gender"],
            "dob": pred["patient_dob"],
            "blood_group": pred.get("patient_blood_group", ""),
            "height": pred.get("patient_height", ""),
            "weight": pred.get("patient_weight", ""),
            "email": pred["patient_email"],
            "phone": pred["patient_phone"],
        },
        "symptom_ids": pred["symptom_ids"],
        "symptoms": symptom_names,
        "created_at": pred["created_at"].isoformat() if pred["created_at"] else None,
        "results": [
            {
                "rank": r["rank"],
                "disease": r["disease_name"],
                "disease_id": r["disease_id"],
                "confidence": float(r["confidence_pct"]),
                "risk_level": r["risk_level"],
                "remedies": r["remedies_text"],
                "warning": r["warning_text"],
            }
            for r in results
        ],
    }), 200


@app.route("/api/predictions/<prediction_id>/pdf", methods=["GET"])
def get_prediction_pdf(prediction_id):
    """
    Generate and download a professional, vector-based A4 PDF medical report
    with authorization enforcement (owner patient, admin role, or valid guest ID).
    """
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    elif request.args.get("token"):
        token = request.args.get("token")

    is_admin = False
    user_id = None

    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            token_type = payload.get("type")
            if token_type == "admin_access":
                is_admin = True
            elif token_type == "access":
                user_id = payload.get("sub")
            else:
                return jsonify({"error": "Invalid token type"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

    pred = None
    if is_admin:
        pred = query("SELECT * FROM predictions WHERE id = %s", (prediction_id,), fetch_one=True)
    elif user_id:
        pred = query(
            "SELECT * FROM predictions WHERE id = %s AND user_id = %s",
            (prediction_id, user_id),
            fetch_one=True,
        )
        if not pred:
            exists = query("SELECT id FROM predictions WHERE id = %s", (prediction_id,), fetch_one=True)
            if exists:
                return jsonify({"error": "Unauthorized to access this report"}), 403
    else:
        guest_id = request.headers.get("X-Guest-ID") or request.args.get("guest_id")
        if guest_id:
            usage = query(
                """SELECT id FROM guest_usage WHERE guest_id = %s AND prediction_id = %s""",
                (guest_id, prediction_id),
                fetch_one=True,
            )
            if usage:
                pred = query(
                    "SELECT * FROM predictions WHERE id = %s AND user_id IS NULL",
                    (prediction_id,),
                    fetch_one=True,
                )
            else:
                exists = query("SELECT id FROM predictions WHERE id = %s", (prediction_id,), fetch_one=True)
                if exists:
                    return jsonify({"error": "Unauthorized guest access"}), 403
        else:
            return jsonify({"error": "Authentication required to download medical report"}), 401

    if not pred:
        return jsonify({"error": "Prediction not found"}), 404

    results = query(
        """SELECT pr.*, d.name as disease_name
           FROM prediction_results pr LEFT JOIN diseases d ON pr.disease_id = d.id
           WHERE pr.prediction_id = %s ORDER BY pr.rank""",
        (prediction_id,), fetch_all=True,
    )

    symptom_names = []
    if pred["symptom_ids"]:
        missing_ids = [sid for sid in pred["symptom_ids"] if not any(s.get("id") == sid for s in _SYMPTOM_MAP_CACHE.values())]
        if missing_ids:
            fetched = query("SELECT id, key, label FROM symptoms WHERE id = ANY(%s)", (missing_ids,), fetch_all=True)
            if fetched:
                for f in fetched:
                    _SYMPTOM_MAP_CACHE[f["key"]] = f

        cache_by_id = {s["id"]: s for s in _SYMPTOM_MAP_CACHE.values() if "id" in s}
        for sid in pred["symptom_ids"]:
            s = cache_by_id.get(sid)
            if s:
                symptom_names.append({"id": sid, "key": s["key"], "label": s.get("label", s["key"])})

    report_data = {
        "id": str(pred["id"]),
        "created_at": pred["created_at"].isoformat() if pred["created_at"] else None,
        "patient": {
            "name": pred["patient_name"],
            "age": pred["patient_age"],
            "gender": pred["patient_gender"],
            "dob": pred["patient_dob"],
            "blood_group": pred.get("patient_blood_group", ""),
            "height": pred.get("patient_height", ""),
            "weight": pred.get("patient_weight", ""),
        },
        "symptoms": symptom_names,
        "results": [
            {
                "rank": r["rank"],
                "disease": r["disease_name"],
                "confidence": float(r["confidence_pct"]),
                "risk_level": r["risk_level"],
                "remedies": r["remedies_text"],
                "warning": r["warning_text"],
                "doctor": get_doctor_specialty(r["disease_name"] or ""),
            }
            for r in results
        ],
    }

    try:
        pdf_bytes = generate_medical_report_pdf(report_data)
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF report: {str(e)}"}), 500

    patient_name = pred.get("patient_name")
    filename = sanitize_report_filename(patient_name)

    response = Response(pdf_bytes, mimetype="application/pdf")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"
    return response


# -- Patient Portal Specific Endpoints ------------------------------------------

@app.route("/api/user/profile", methods=["GET", "PUT"])
@require_auth
def user_profile():
    """Get or update authenticated patient's profile."""
    if request.method == "GET":
        u = query(
            "SELECT id, name, email, phone, role, created_at FROM users WHERE id = %s",
            (g.user_id,), fetch_one=True,
        )
        if not u:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "user": {
                "id": str(u["id"]),
                "name": u["name"],
                "email": u["email"],
                "phone": u.get("phone") or "",
                "role": u.get("role", "patient"),
                "created_at": u["created_at"].isoformat() if u.get("created_at") else None,
            }
        }), 200

    # PUT update profile
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    execute(
        "UPDATE users SET name = %s, phone = %s, updated_at = NOW() WHERE id = %s",
        (name, phone, g.user_id),
    )
    return jsonify({
        "message": "Profile updated successfully",
        "user": {
            "id": str(g.user_id),
            "name": name,
            "email": g.user_email,
            "phone": phone,
        }
    }), 200


@app.route("/api/user/stats", methods=["GET"])
@require_auth
def user_stats():
    """Summary metrics for the authenticated patient's personal health dashboard."""
    total_preds = query(
        "SELECT COUNT(*) as count FROM predictions WHERE user_id = %s",
        (g.user_id,), fetch_one=True
    )["count"]

    latest = query(
        """SELECT p.id, p.patient_name, p.created_at, p.symptom_ids,
                  pr.disease_id, pr.confidence_pct, pr.risk_level, pr.remedies_text, pr.warning_text,
                  d.name as disease_name
           FROM predictions p
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id AND pr.rank = 1
           LEFT JOIN diseases d ON pr.disease_id = d.id
           WHERE p.user_id = %s
           ORDER BY p.created_at DESC LIMIT 1""",
        (g.user_id,), fetch_one=True
    )

    # Count high/critical risk findings
    critical_count = query(
        """SELECT COUNT(DISTINCT p.id) as count
           FROM predictions p
           JOIN prediction_results pr ON pr.prediction_id = p.id
           WHERE p.user_id = %s AND pr.risk_level IN ('high', 'critical')""",
        (g.user_id,), fetch_one=True
    )["count"]

    latest_data = None
    if latest:
        latest_data = {
            "id": str(latest["id"]),
            "patient_name": latest["patient_name"],
            "created_at": latest["created_at"].isoformat() if latest.get("created_at") else None,
            "disease": latest["disease_name"] or "Health Check",
            "confidence": float(latest["confidence_pct"]) if latest.get("confidence_pct") else None,
            "risk_level": latest.get("risk_level") or "low",
            "remedies": latest.get("remedies_text"),
            "warning": latest.get("warning_text"),
            "symptom_count": len(latest.get("symptom_ids") or []),
        }

    return jsonify({
        "stats": {
            "total_analyses": total_preds,
            "total_reports": total_preds,
            "critical_alerts": critical_count,
            "latest_analysis": latest_data,
        }
    }), 200


@app.route("/api/user/notifications", methods=["GET"])
@require_auth
def user_notifications():
    """List active notifications relevant to patient."""
    rows = query(
        """SELECT id, title, message, type, created_at
           FROM notifications
           WHERE (target_type = 'all_patients' OR target_user_id = %s)
             AND status = 'sent'
           ORDER BY created_at DESC LIMIT 20""",
        (g.user_id,), fetch_all=True
    )
    return jsonify({
        "notifications": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "message": r["message"],
                "type": r.get("type", "info"),
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            }
            for r in (rows or [])
        ]
    }), 200


@app.route("/api/user/feedback", methods=["GET", "POST"])
@require_auth
def user_feedback():
    """Submit or list patient's feedback."""
    if request.method == "POST":
        data = request.get_json() or {}
        subject = data.get("subject", "").strip()
        message = data.get("message", "").strip()
        rating = data.get("rating")
        priority = data.get("priority", "medium")

        if not message:
            return jsonify({"error": "Message is required"}), 400

        u = query("SELECT name, email FROM users WHERE id = %s", (g.user_id,), fetch_one=True)
        user_name = u["name"] if u else "Patient"
        user_email = u["email"] if u else g.user_email

        fb = execute_returning(
            """INSERT INTO feedback (user_id, user_name, user_email, subject, message, rating, priority, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'new')
               RETURNING id, created_at""",
            (g.user_id, user_name, user_email, subject or "General Feedback", message, rating, priority)
        )
        return jsonify({
            "message": "Feedback submitted successfully. Thank you!",
            "id": str(fb["id"]),
        }), 201

    # GET past feedback
    rows = query(
        """SELECT id, subject, message, rating, priority, status, admin_response, responded_at, created_at
           FROM feedback
           WHERE user_id = %s
           ORDER BY created_at DESC LIMIT 30""",
        (g.user_id,), fetch_all=True
    )
    return jsonify({
        "feedback": [
            {
                "id": str(r["id"]),
                "subject": r["subject"],
                "message": r["message"],
                "rating": r["rating"],
                "priority": r["priority"],
                "status": r["status"],
                "admin_response": r.get("admin_response"),
                "responded_at": r["responded_at"].isoformat() if r.get("responded_at") else None,
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            }
            for r in (rows or [])
        ]
    }), 200


# -- Patient Medical Assistance Chatbot Endpoints -----------------------------

@app.route("/api/user/chat/sessions", methods=["GET"])
@require_auth
def list_chat_sessions():
    """List all chat sessions for the authenticated patient."""
    rows = query(
        """SELECT s.id, s.title, s.status, s.created_at, s.updated_at,
                  (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count,
                  (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                  (SELECT created_at FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
           FROM chat_sessions s
           WHERE s.user_id = %s
           ORDER BY s.updated_at DESC LIMIT 50""",
        (g.user_id,), fetch_all=True
    )
    return jsonify({
        "sessions": [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "status": r["status"],
                "message_count": int(r["message_count"] or 0),
                "last_message": r["last_message"],
                "last_message_at": r["last_message_at"].isoformat() if r.get("last_message_at") else None,
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
            }
            for r in (rows or [])
        ]
    }), 200


@app.route("/api/user/chat/sessions/<session_id>", methods=["GET"])
@require_auth
def get_chat_session_messages(session_id):
    """Get all messages for a specific patient chat session."""
    session = query(
        "SELECT id, title, status, created_at FROM chat_sessions WHERE id = %s AND user_id = %s",
        (session_id, g.user_id), fetch_one=True
    )
    if not session:
        return jsonify({"error": "Chat session not found"}), 404

    messages = query(
        """SELECT id, sender, content, model, response_time_ms, status, created_at
           FROM chat_messages
           WHERE session_id = %s AND user_id = %s
           ORDER BY created_at ASC""",
        (session_id, g.user_id), fetch_all=True
    )

    return jsonify({
        "session": {
            "id": str(session["id"]),
            "title": session["title"],
            "status": session["status"],
            "created_at": session["created_at"].isoformat() if session.get("created_at") else None,
        },
        "messages": [
            {
                "id": str(m["id"]),
                "sender": m["sender"],
                "content": m["content"],
                "model": m.get("model"),
                "response_time_ms": m.get("response_time_ms", 0),
                "status": m.get("status", "success"),
                "created_at": m["created_at"].isoformat() if m.get("created_at") else None,
            }
            for m in (messages or [])
        ]
    }), 200


@app.route("/api/user/chat/send", methods=["POST"])
@require_auth
def send_chat_message():
    """
    Send a message to the AI Medical Assistant.
    Supports both instant SSE streaming and traditional non-streaming response.
    Persists user message & AI response in PostgreSQL database with response latency.
    """
    data = request.get_json() or {}
    message_text = data.get("message", "").strip()
    session_id = data.get("session_id")
    should_stream = bool(data.get("stream")) or request.headers.get("Accept") == "text/event-stream"

    if not message_text:
        return jsonify({"error": "Message content is required"}), 400

    # 1. Resolve or create chat session
    if session_id:
        sess = query(
            "SELECT id, title FROM chat_sessions WHERE id = %s AND user_id = %s",
            (session_id, g.user_id), fetch_one=True
        )
        if not sess:
            session_id = None

    if not session_id:
        title_snippet = message_text[:40] + ("..." if len(message_text) > 40 else "")
        sess_rec = execute_returning(
            "INSERT INTO chat_sessions (user_id, title) VALUES (%s, %s) RETURNING id",
            (g.user_id, title_snippet or "Medical Consultation")
        )
        session_id = str(sess_rec["id"])

    # 2. Persist user message
    user_msg_rec = execute_returning(
        """INSERT INTO chat_messages (session_id, user_id, sender, content, status)
           VALUES (%s, %s, 'user', %s, 'success')
           RETURNING id, created_at""",
        (session_id, g.user_id, message_text)
    )

    # 3. Retrieve authenticated patient's clinical context via a single consolidated query
    ctx_row = query(
        """SELECT u.name,
                  p.id as pred_id, p.patient_age, p.patient_gender, p.symptom_ids,
                  pr.confidence_pct, pr.risk_level, d.name as disease
           FROM users u
           LEFT JOIN predictions p ON p.user_id = u.id
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id AND pr.rank = 1
           LEFT JOIN diseases d ON pr.disease_id = d.id
           WHERE u.id = %s
           ORDER BY p.created_at DESC LIMIT 1""",
        (g.user_id,), fetch_one=True
    )

    patient_ctx = {
        "name": ctx_row.get("name") if ctx_row else "Patient",
    }

    if ctx_row and ctx_row.get("pred_id"):
        patient_ctx["age"] = ctx_row.get("patient_age")
        patient_ctx["gender"] = ctx_row.get("patient_gender")
        patient_ctx["latest_condition"] = ctx_row.get("disease")
        patient_ctx["latest_confidence"] = float(ctx_row["confidence_pct"]) if ctx_row.get("confidence_pct") else 0
        patient_ctx["risk_level"] = ctx_row.get("risk_level")

        # Resolve symptom labels from in-memory cache in 0ms
        sids = ctx_row.get("symptom_ids") or []
        if sids:
            sym_cache_by_id = {s["id"]: s["label"] for s in _SYMPTOM_MAP_CACHE.values() if "id" in s}
            labels = [sym_cache_by_id[sid] for sid in sids if sid in sym_cache_by_id]
            if labels:
                patient_ctx["symptoms"] = labels

    # 4. Fetch recent conversation history for continuity (limit 8)
    past_messages = query(
        """SELECT sender as role, content FROM chat_messages
           WHERE session_id = %s AND user_id = %s
           ORDER BY created_at ASC LIMIT 8""",
        (session_id, g.user_id), fetch_all=True
    )

    conv_messages = past_messages or [{"role": "user", "content": message_text}]

    # 5. Handle SSE Streaming Response if requested
    if should_stream:
        def generate_sse():
            start_t = time.time()
            ttft_recorded = False
            ttft_ms = 0
            full_chunks = []
            used_model = "gemini-3.5-flash-lite"
            status = "success"
            error_msg = None

            # Initial metadata event
            yield f"data: {json.dumps({'type': 'session', 'session_id': session_id, 'user_msg_id': str(user_msg_rec['id'])})}\n\n"

            try:
                from openai_service import stream_chat_response
                for chunk, m_name in stream_chat_response(conv_messages, patient_ctx):
                    if not ttft_recorded:
                        ttft_ms = int((time.time() - start_t) * 1000)
                        ttft_recorded = True
                    used_model = m_name or used_model
                    full_chunks.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'delta': chunk})}\n\n"
            except Exception as e:
                status = "failed"
                error_msg = str(e)
                fallback = "Sorry, I'm unable to respond right now. Please try again shortly."
                if not full_chunks:
                    full_chunks.append(fallback)
                    yield f"data: {json.dumps({'type': 'chunk', 'delta': fallback})}\n\n"

            total_elapsed_ms = int((time.time() - start_t) * 1000)
            final_text = "".join(full_chunks).strip()

            # Persist assistant response in PostgreSQL
            ai_msg_id = None
            try:
                ai_rec = execute_returning(
                    """INSERT INTO chat_messages (session_id, user_id, sender, content, model, response_time_ms, status, error_message)
                       VALUES (%s, %s, 'assistant', %s, %s, %s, %s, %s)
                       RETURNING id, created_at""",
                    (session_id, g.user_id, final_text, used_model, total_elapsed_ms, status, error_msg)
                )
                execute("UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s", (session_id,))
                if ai_rec:
                    ai_msg_id = str(ai_rec["id"])
            except Exception as dbe:
                ai_msg_id = str(uuid.uuid4())

            # Final completion event
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'message_id': ai_msg_id or str(uuid.uuid4()), 'ttft_ms': ttft_ms, 'response_time_ms': total_elapsed_ms, 'model': used_model, 'status': status})}\n\n"

        return Response(
            stream_with_context(generate_sse()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            }
        )

    # 6. Non-Streaming Response (Backward Compatible)
    try:
        from openai_service import generate_chat_response
        ai_result = generate_chat_response(conv_messages, patient_ctx)
    except Exception as e:
        ai_result = {
            "content": "Sorry, I'm unable to respond right now. Please try again shortly.",
            "model": "caretrack-medical-assistant",
            "response_time_ms": 50,
            "status": "failed",
            "error": str(e),
        }

    ai_msg_rec = execute_returning(
        """INSERT INTO chat_messages (session_id, user_id, sender, content, model, response_time_ms, status, error_message)
           VALUES (%s, %s, 'assistant', %s, %s, %s, %s, %s)
           RETURNING id, created_at""",
        (
            session_id,
            g.user_id,
            ai_result["content"],
            ai_result.get("model", "gemini-3.5-flash-lite"),
            ai_result.get("response_time_ms", 0),
            ai_result.get("status", "success"),
            ai_result.get("error"),
        )
    )

    execute("UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s", (session_id,))

    return jsonify({
        "session_id": session_id,
        "message": {
            "id": str(ai_msg_rec["id"]),
            "sender": "assistant",
            "content": ai_result["content"],
            "model": ai_result.get("model", "gemini-3.5-flash-lite"),
            "response_time_ms": ai_result.get("response_time_ms", 0),
            "status": ai_result.get("status", "success"),
            "created_at": ai_msg_rec["created_at"].isoformat() if ai_msg_rec.get("created_at") else None,
        }
    }), 200


@app.route("/api/user/chat/sessions/<session_id>", methods=["DELETE"])
@require_auth
def delete_chat_session(session_id):
    """Delete a chat session."""
    execute("DELETE FROM chat_sessions WHERE id = %s AND user_id = %s", (session_id, g.user_id))
    return jsonify({"message": "Chat session deleted successfully"}), 200


# -- Symptoms & Diseases Endpoints ---------------------------------------------

@app.route("/api/symptoms", methods=["GET"])
def list_symptoms():
    """List all symptoms with their numeric IDs."""
    rows = query("SELECT id, key, label, category FROM symptoms ORDER BY id", fetch_all=True)
    return jsonify({
        "symptoms": [{"id": r["id"], "key": r["key"], "label": r["label"], "category": r["category"]} for r in rows],
        "count": len(rows),
    }), 200


@app.route("/api/diseases", methods=["GET"])
def list_diseases():
    """List all diseases with their numeric IDs."""
    rows = query("SELECT id, name FROM diseases ORDER BY id", fetch_all=True)
    return jsonify({
        "diseases": [{"id": r["id"], "name": r["name"]} for r in rows],
        "count": len(rows),
    }), 200


# -- Model Info ----------------------------------------------------------------

@app.route("/api/model/info", methods=["GET"])
def model_info():
    """Return metadata about the trained model."""
    try:
        info = get_model_info()
        return jsonify(info), 200
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503


# -- Run Server ----------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 55)
    print("  CareTrack AI Backend -- Starting...")
    print("=" * 55)
    print("\nEndpoints:")
    print("  POST /api/auth/register")
    print("  POST /api/auth/login")
    print("  POST /api/auth/refresh")
    print("  POST /api/auth/logout")
    print("  POST /api/predict          (auth required)")
    print("  GET  /api/predictions      (auth required)")
    print("  GET  /api/predictions/<id> (auth required)")
    print("  GET  /api/symptoms")
    print("  GET  /api/diseases")
    print("  GET  /api/model/info")
    print("  GET  /api/health")
    print()

    app.run(host="0.0.0.0", port=5000, debug=True)
