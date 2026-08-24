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
import uuid
import functools
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

from predict import predict_disease, get_model_info, get_available_symptoms, _load_model
from database import query, execute, execute_returning
from gemini_service import generate_remedies_and_warnings, classify_risk, _get_client
from symptom_mapper import FRONTEND_TO_DATASET

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

    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

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
        "SELECT id, name, email, password_hash FROM users WHERE email = %s",
        (email,), fetch_one=True,
    )

    if user and bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
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

        # -- Step 6: Store each prediction result (batch insert) --
        if enriched_predictions:
            for pred in enriched_predictions:
                execute(
                    """INSERT INTO prediction_results
                       (prediction_id, disease_id, confidence_pct, rank, risk_level, remedies_text, warning_text)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (
                        prediction_id,
                        pred.get("disease_id"),
                        pred["confidence"],
                        pred["rank"],
                        pred.get("risk_level", "low"),
                        pred.get("remedies_text"),
                        pred.get("warning_text"),
                    ),
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
                "warning": p.get("warning_text"),
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


# -- Past Predictions ----------------------------------------------------------

@app.route("/api/predictions", methods=["GET"])
@require_auth
def list_predictions():
    """List all predictions for the authenticated user."""
    rows = query(
        """SELECT id, patient_name, symptom_ids, created_at
           FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 50""",
        (g.user_id,), fetch_all=True,
    )

    predictions = []
    for row in rows:
        results = query(
            """SELECT pr.rank, pr.confidence_pct, pr.risk_level, d.name as disease
               FROM prediction_results pr LEFT JOIN diseases d ON pr.disease_id = d.id
               WHERE pr.prediction_id = %s ORDER BY pr.rank""",
            (str(row["id"]),), fetch_all=True,
        )
        predictions.append({
            "id": str(row["id"]),
            "patient_name": row["patient_name"],
            "symptom_ids": row["symptom_ids"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "top_disease": results[0]["disease"] if results else None,
            "top_confidence": float(results[0]["confidence_pct"]) if results else None,
            "num_findings": len(results),
        })

    return jsonify({"predictions": predictions}), 200


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

    # Resolve symptom names from IDs
    symptom_names = []
    if pred["symptom_ids"]:
        for sid in pred["symptom_ids"]:
            s = query("SELECT key, label FROM symptoms WHERE id = %s", (sid,), fetch_one=True)
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
