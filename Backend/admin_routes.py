"""
admin_routes.py
---------------
Flask Blueprint for CareTrack AI Admin Portal.

Provides all admin-only API endpoints with RBAC enforcement.
All endpoints require a valid admin JWT token (separate from patient tokens).

Endpoints:
  POST /api/admin/auth/login       - Admin login
  POST /api/admin/auth/logout      - Admin logout
  POST /api/admin/auth/refresh     - Refresh admin token
  GET  /api/admin/auth/me          - Current admin info

  GET  /api/admin/dashboard/stats  - Dashboard KPIs
  GET  /api/admin/dashboard/activity - Recent activity
  GET  /api/admin/dashboard/charts - Chart data

  GET  /api/admin/patients         - Patient list (paginated)
  GET  /api/admin/patients/<id>    - Patient detail

  GET  /api/admin/analyses         - Analysis list (paginated)
  GET  /api/admin/analyses/<id>    - Analysis detail

  GET  /api/admin/reports          - Reports list (paginated)
  GET  /api/admin/reports/<id>     - Report detail

  GET  /api/admin/symptoms         - Symptoms list (paginated)
  GET  /api/admin/symptoms/categories - Category list
  PATCH /api/admin/symptoms/<id>   - Update symptom

  GET  /api/admin/ai/stats         - AI prediction stats
  GET  /api/admin/ai/models        - Model versions
  GET  /api/admin/ai/models/<id>   - Model detail

  GET  /api/admin/feedback         - Feedback list (paginated)
  PATCH /api/admin/feedback/<id>   - Update feedback

  GET  /api/admin/notifications         - Notification list
  POST /api/admin/notifications         - Create notification
  GET  /api/admin/notifications/stats   - Notification analytics

  GET  /api/admin/system/health    - System health checks
  GET  /api/admin/audit            - Audit logs (paginated)

  GET  /api/admin/search           - Global search
  GET  /api/admin/export/<resource> - CSV export
"""

import os
import io
import csv
import uuid
import functools
import json
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt
from flask import Blueprint, request, jsonify, g, Response
from database import query, execute, execute_returning

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "caretrack-ai-default-secret")
ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 900))
REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))


# ── Admin JWT Helpers ────────────────────────────────────────────────────────

def create_admin_access_token(admin_id, email, role):
    """Create a short-lived JWT access token for admin."""
    payload = {
        "sub": str(admin_id),
        "email": email,
        "role": role,
        "type": "admin_access",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=ACCESS_TOKEN_EXPIRES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def create_admin_refresh_token(admin_id):
    """Create a long-lived refresh token for admin."""
    token = uuid.uuid4().hex + uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=REFRESH_TOKEN_EXPIRES)
    execute(
        "INSERT INTO admin_refresh_tokens (admin_id, token, expires_at) VALUES (%s, %s, %s)",
        (str(admin_id), token, expires_at),
    )
    return token


def require_admin(f):
    """Decorator requiring a valid admin JWT access token."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            if payload.get("type") != "admin_access":
                return jsonify({"error": "Invalid token type — admin access required"}), 403
            g.admin_id = payload["sub"]
            g.admin_email = payload["email"]
            g.admin_role = payload.get("role", "admin")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Admin access token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid admin access token"}), 401

        return f(*args, **kwargs)
    return decorated


def log_audit(action, resource_type=None, resource_id=None, details=None):
    """Log an admin action to the audit trail."""
    try:
        admin_id = getattr(g, "admin_id", None)
        admin_email = getattr(g, "admin_email", None)
        ip_address = request.remote_addr
        execute(
            """INSERT INTO audit_logs (admin_id, admin_email, action, resource_type, resource_id, details, ip_address)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (admin_id, admin_email, action, resource_type, str(resource_id) if resource_id else None, details, ip_address),
        )
    except Exception as e:
        print(f"[admin] Audit log error: {e}")


# ── Auth Endpoints ───────────────────────────────────────────────────────────

@admin_bp.route("/auth/login", methods=["POST"])
def admin_login():
    """Admin login with email and password."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find admin
    admin = query(
        "SELECT id, name, email, password_hash, role, status FROM admin_users WHERE email = %s",
        (email,), fetch_one=True,
    )
    if not admin:
        return jsonify({"error": "Invalid email or password"}), 401

    if admin["status"] != "active":
        return jsonify({"error": "Account is inactive. Contact system administrator."}), 403

    # Verify password
    if not bcrypt.checkpw(password.encode("utf-8"), admin["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    # Update last login
    execute("UPDATE admin_users SET last_login = NOW() WHERE id = %s", (str(admin["id"]),))

    # Generate tokens
    access_token = create_admin_access_token(admin["id"], email, admin["role"])
    refresh_token = create_admin_refresh_token(admin["id"])

    # Audit log
    g.admin_id = str(admin["id"])
    g.admin_email = email
    log_audit("admin_login", "admin_user", admin["id"])

    return jsonify({
        "message": "Admin login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "admin": {
            "id": str(admin["id"]),
            "name": admin["name"],
            "email": admin["email"],
            "role": admin["role"],
        },
    }), 200


@admin_bp.route("/auth/logout", methods=["POST"])
def admin_logout():
    """Invalidate admin refresh token."""
    data = request.get_json()
    if not data or not data.get("refresh_token"):
        return jsonify({"error": "Refresh token is required"}), 400
    execute("DELETE FROM admin_refresh_tokens WHERE token = %s", (data["refresh_token"],))
    return jsonify({"message": "Admin logged out successfully"}), 200


@admin_bp.route("/auth/refresh", methods=["POST"])
def admin_refresh():
    """Refresh admin access token."""
    data = request.get_json()
    if not data or not data.get("refresh_token"):
        return jsonify({"error": "Refresh token is required"}), 400

    token = data["refresh_token"]
    row = query(
        """SELECT art.id, art.admin_id, au.email, au.role
           FROM admin_refresh_tokens art JOIN admin_users au ON art.admin_id = au.id
           WHERE art.token = %s AND art.expires_at > NOW()""",
        (token,), fetch_one=True,
    )
    if not row:
        return jsonify({"error": "Invalid or expired refresh token"}), 401

    access_token = create_admin_access_token(row["admin_id"], row["email"], row["role"])
    return jsonify({"access_token": access_token, "message": "Admin token refreshed"}), 200


@admin_bp.route("/auth/me", methods=["GET"])
@require_admin
def admin_me():
    """Get current admin info."""
    admin = query(
        "SELECT id, name, email, role, status, last_login, created_at FROM admin_users WHERE id = %s",
        (g.admin_id,), fetch_one=True,
    )
    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    return jsonify({
        "id": str(admin["id"]),
        "name": admin["name"],
        "email": admin["email"],
        "role": admin["role"],
        "status": admin["status"],
        "last_login": admin["last_login"].isoformat() if admin["last_login"] else None,
        "created_at": admin["created_at"].isoformat() if admin["created_at"] else None,
    }), 200


# ── Dashboard Endpoints ─────────────────────────────────────────────────────

@admin_bp.route("/dashboard/stats", methods=["GET"])
@require_admin
def dashboard_stats():
    """Get dashboard KPI statistics."""
    date_range = request.args.get("range", "30")
    try:
        days = int(date_range)
    except ValueError:
        days = 30

    date_filter = f"NOW() - INTERVAL '{days} days'"

    # Patient stats
    total_patients = query("SELECT COUNT(*) as count FROM users", fetch_one=True)["count"]
    new_patients = query(f"SELECT COUNT(*) as count FROM users WHERE created_at >= {date_filter}", fetch_one=True)["count"]
    active_patients = query(f"SELECT COUNT(DISTINCT user_id) as count FROM predictions WHERE user_id IS NOT NULL AND created_at >= {date_filter}", fetch_one=True)["count"]

    # Analysis stats
    total_analyses = query("SELECT COUNT(*) as count FROM predictions", fetch_one=True)["count"]
    analyses_today = query("SELECT COUNT(*) as count FROM predictions WHERE created_at >= CURRENT_DATE", fetch_one=True)["count"]
    analyses_week = query("SELECT COUNT(*) as count FROM predictions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'", fetch_one=True)["count"]
    analyses_month = query("SELECT COUNT(*) as count FROM predictions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'", fetch_one=True)["count"]

    # Report stats (predictions with results = reports)
    total_reports = query("SELECT COUNT(DISTINCT prediction_id) as count FROM prediction_results", fetch_one=True)["count"]
    reports_today = query(
        "SELECT COUNT(DISTINCT pr.prediction_id) as count FROM prediction_results pr JOIN predictions p ON pr.prediction_id = p.id WHERE p.created_at >= CURRENT_DATE",
        fetch_one=True)["count"]

    # AI stats
    total_predictions_results = query("SELECT COUNT(*) as count FROM prediction_results", fetch_one=True)["count"]

    # Feedback stats
    total_feedback = query("SELECT COUNT(*) as count FROM feedback", fetch_one=True)["count"]
    pending_feedback = query("SELECT COUNT(*) as count FROM feedback WHERE status IN ('new', 'in_review')", fetch_one=True)["count"]
    resolved_feedback = query("SELECT COUNT(*) as count FROM feedback WHERE status IN ('resolved', 'closed')", fetch_one=True)["count"]
    critical_feedback = query("SELECT COUNT(*) as count FROM feedback WHERE priority = 'critical' AND status NOT IN ('resolved', 'closed')", fetch_one=True)["count"]

    # System
    try:
        query("SELECT 1", fetch_one=True)
        db_status = "operational"
    except Exception:
        db_status = "unavailable"

    return jsonify({
        "patients": {
            "total": total_patients,
            "new": new_patients,
            "active": active_patients,
        },
        "analyses": {
            "total": total_analyses,
            "today": analyses_today,
            "this_week": analyses_week,
            "this_month": analyses_month,
        },
        "reports": {
            "total": total_reports,
            "today": reports_today,
        },
        "ai": {
            "total_prediction_results": total_predictions_results,
        },
        "feedback": {
            "total": total_feedback,
            "pending": pending_feedback,
            "resolved": resolved_feedback,
            "critical": critical_feedback,
        },
        "system": {
            "api": "operational",
            "database": db_status,
        },
        "date_range_days": days,
    }), 200


@admin_bp.route("/dashboard/activity", methods=["GET"])
@require_admin
def dashboard_activity():
    """Get recent activity feed."""
    limit = min(int(request.args.get("limit", 20)), 50)

    activities = []

    # Recent predictions
    preds = query(
        """SELECT id, patient_name, created_at FROM predictions
           ORDER BY created_at DESC LIMIT %s""",
        (limit,), fetch_all=True,
    )
    for p in preds:
        activities.append({
            "type": "analysis_completed",
            "message": f"AI analysis completed for {p['patient_name'] or 'Unknown Patient'}",
            "resource_type": "prediction",
            "resource_id": str(p["id"]),
            "timestamp": p["created_at"].isoformat() if p["created_at"] else None,
        })

    # Recent registrations
    users = query(
        """SELECT id, name, created_at FROM users
           ORDER BY created_at DESC LIMIT %s""",
        (limit,), fetch_all=True,
    )
    for u in users:
        activities.append({
            "type": "patient_registered",
            "message": f"New patient registered: {u['name']}",
            "resource_type": "user",
            "resource_id": str(u["id"]),
            "timestamp": u["created_at"].isoformat() if u["created_at"] else None,
        })

    # Recent feedback
    fbs = query(
        """SELECT id, user_name, subject, created_at FROM feedback
           ORDER BY created_at DESC LIMIT %s""",
        (limit,), fetch_all=True,
    )
    for fb in fbs:
        activities.append({
            "type": "feedback_received",
            "message": f"Feedback received from {fb['user_name'] or 'Anonymous'}: {fb['subject'] or 'No subject'}",
            "resource_type": "feedback",
            "resource_id": str(fb["id"]),
            "timestamp": fb["created_at"].isoformat() if fb["created_at"] else None,
        })

    # Recent audit logs
    logs = query(
        """SELECT id, admin_email, action, resource_type, created_at FROM audit_logs
           ORDER BY created_at DESC LIMIT %s""",
        (limit,), fetch_all=True,
    )
    for log in logs:
        activities.append({
            "type": "admin_action",
            "message": f"Admin {log['admin_email'] or 'System'}: {log['action']}",
            "resource_type": log["resource_type"],
            "resource_id": str(log["id"]),
            "timestamp": log["created_at"].isoformat() if log["created_at"] else None,
        })

    # Sort by timestamp descending
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return jsonify({"activities": activities[:limit]}), 200


@admin_bp.route("/dashboard/charts", methods=["GET"])
@require_admin
def dashboard_charts():
    """Get chart data for dashboard."""
    days = int(request.args.get("range", 30))

    # Patient registrations over time
    patient_trend = query(
        f"""SELECT DATE(created_at) as date, COUNT(*) as count
           FROM users WHERE created_at >= NOW() - INTERVAL '{days} days'
           GROUP BY DATE(created_at) ORDER BY date""",
        fetch_all=True,
    )

    # Analysis activity over time
    analysis_trend = query(
        f"""SELECT DATE(created_at) as date, COUNT(*) as count
           FROM predictions WHERE created_at >= NOW() - INTERVAL '{days} days'
           GROUP BY DATE(created_at) ORDER BY date""",
        fetch_all=True,
    )

    # Symptom category distribution
    category_dist = query(
        """SELECT category, COUNT(*) as count FROM symptoms
           WHERE is_active = TRUE GROUP BY category ORDER BY count DESC""",
        fetch_all=True,
    )

    # Top symptoms used in analyses
    top_symptoms = query(
        """SELECT s.label, s.category, COUNT(*) as usage_count
           FROM predictions p, UNNEST(p.symptom_ids) AS sid
           JOIN symptoms s ON s.id = sid
           GROUP BY s.label, s.category
           ORDER BY usage_count DESC LIMIT 10""",
        fetch_all=True,
    )

    # Disease prediction distribution (top 10)
    disease_dist = query(
        """SELECT d.name, COUNT(*) as count
           FROM prediction_results pr JOIN diseases d ON pr.disease_id = d.id
           GROUP BY d.name ORDER BY count DESC LIMIT 10""",
        fetch_all=True,
    )

    return jsonify({
        "patient_trend": [{"date": str(r["date"]), "count": r["count"]} for r in (patient_trend or [])],
        "analysis_trend": [{"date": str(r["date"]), "count": r["count"]} for r in (analysis_trend or [])],
        "category_distribution": [{"category": r["category"], "count": r["count"]} for r in (category_dist or [])],
        "top_symptoms": [{"label": r["label"], "category": r["category"], "count": r["usage_count"]} for r in (top_symptoms or [])],
        "disease_distribution": [{"name": r["name"], "count": r["count"]} for r in (disease_dist or [])],
    }), 200


# ── Patient Endpoints ────────────────────────────────────────────────────────

@admin_bp.route("/patients", methods=["GET"])
@require_admin
def list_patients():
    """List patients with pagination, search, filtering."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 20)), 100)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "")
    sort_by = request.args.get("sort", "created_at")
    sort_dir = request.args.get("dir", "desc")
    offset = (page - 1) * per_page

    allowed_sorts = {"name": "name", "email": "email", "created_at": "created_at", "last_login": "last_login"}
    sort_col = allowed_sorts.get(sort_by, "created_at")
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    where_clauses = []
    params = []

    if search:
        where_clauses.append("(name ILIKE %s OR email ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])
    if status:
        where_clauses.append("status = %s")
        params.append(status)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    # Get total count
    total = query(f"SELECT COUNT(*) as count FROM users {where_sql}", params, fetch_one=True)["count"]

    # Get patients
    rows = query(
        f"""SELECT id, name, email, phone, role, status, created_at, last_login
           FROM users {where_sql}
           ORDER BY {sort_col} {sort_direction}
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    # Get analysis counts for each patient
    patients = []
    for r in rows:
        analysis_count = query(
            "SELECT COUNT(*) as count FROM predictions WHERE user_id = %s",
            (str(r["id"]),), fetch_one=True,
        )["count"]

        last_analysis = query(
            "SELECT created_at FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(r["id"]),), fetch_one=True,
        )

        patients.append({
            "id": str(r["id"]),
            "name": r["name"],
            "email": r["email"],
            "phone": r.get("phone"),
            "status": r.get("status", "active"),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "last_login": r["last_login"].isoformat() if r.get("last_login") else None,
            "analysis_count": analysis_count,
            "last_analysis": last_analysis["created_at"].isoformat() if last_analysis and last_analysis["created_at"] else None,
        })

    log_audit("view_patients", "patients")

    return jsonify({
        "patients": patients,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/patients/<patient_id>", methods=["GET"])
@require_admin
def get_patient(patient_id):
    """Get detailed patient profile."""
    patient = query(
        "SELECT id, name, email, phone, role, status, created_at, last_login FROM users WHERE id = %s",
        (patient_id,), fetch_one=True,
    )
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    # Get analysis history
    analyses = query(
        """SELECT p.id, p.patient_name, p.patient_age, p.patient_gender,
                  p.symptom_ids, p.created_at, p.status,
                  COUNT(pr.id) as result_count
           FROM predictions p
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id
           WHERE p.user_id = %s
           GROUP BY p.id
           ORDER BY p.created_at DESC LIMIT 50""",
        (patient_id,), fetch_all=True,
    )

    analysis_list = []
    for a in analyses:
        # Get top disease for this analysis
        top_result = query(
            """SELECT d.name as disease, pr.confidence_pct, pr.risk_level
               FROM prediction_results pr JOIN diseases d ON pr.disease_id = d.id
               WHERE pr.prediction_id = %s ORDER BY pr.rank LIMIT 1""",
            (str(a["id"]),), fetch_one=True,
        )

        # Resolve symptom names
        symptom_names = []
        if a["symptom_ids"]:
            for sid in a["symptom_ids"]:
                s = query("SELECT label, category FROM symptoms WHERE id = %s", (sid,), fetch_one=True)
                if s:
                    symptom_names.append({"label": s["label"], "category": s["category"]})

        analysis_list.append({
            "id": str(a["id"]),
            "patient_name": a["patient_name"],
            "symptom_count": len(a["symptom_ids"]) if a["symptom_ids"] else 0,
            "symptoms": symptom_names,
            "status": a.get("status", "completed"),
            "result_count": a["result_count"],
            "top_disease": top_result["disease"] if top_result else None,
            "top_confidence": float(top_result["confidence_pct"]) if top_result else None,
            "created_at": a["created_at"].isoformat() if a["created_at"] else None,
        })

    log_audit("view_patient", "user", patient_id)

    return jsonify({
        "patient": {
            "id": str(patient["id"]),
            "name": patient["name"],
            "email": patient["email"],
            "phone": patient.get("phone"),
            "status": patient.get("status", "active"),
            "created_at": patient["created_at"].isoformat() if patient["created_at"] else None,
            "last_login": patient["last_login"].isoformat() if patient.get("last_login") else None,
        },
        "analyses": analysis_list,
        "total_analyses": len(analysis_list),
    }), 200


# ── Analysis Endpoints ───────────────────────────────────────────────────────

@admin_bp.route("/analyses", methods=["GET"])
@require_admin
def list_analyses():
    """List analyses with pagination, search, filtering."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 20)), 100)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "")
    date_from = request.args.get("date_from", "")
    date_to = request.args.get("date_to", "")
    offset = (page - 1) * per_page

    where_clauses = []
    params = []

    if search:
        where_clauses.append("p.patient_name ILIKE %s")
        params.append(f"%{search}%")
    if status:
        where_clauses.append("p.status = %s")
        params.append(status)
    if date_from:
        where_clauses.append("p.created_at >= %s")
        params.append(date_from)
    if date_to:
        where_clauses.append("p.created_at <= %s::date + INTERVAL '1 day'")
        params.append(date_to)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    total = query(f"SELECT COUNT(*) as count FROM predictions p {where_sql}", params, fetch_one=True)["count"]

    rows = query(
        f"""SELECT p.id, p.user_id, p.patient_name, p.patient_age, p.patient_gender,
                   p.symptom_ids, p.created_at, p.status, p.processing_time_ms, p.model_version,
                   u.name as user_name, u.email as user_email
           FROM predictions p
           LEFT JOIN users u ON p.user_id = u.id
           {where_sql}
           ORDER BY p.created_at DESC
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    analyses = []
    for r in rows:
        result_count = query(
            "SELECT COUNT(*) as count FROM prediction_results WHERE prediction_id = %s",
            (str(r["id"]),), fetch_one=True,
        )["count"]

        top_result = query(
            """SELECT d.name as disease, pr.confidence_pct
               FROM prediction_results pr JOIN diseases d ON pr.disease_id = d.id
               WHERE pr.prediction_id = %s ORDER BY pr.rank LIMIT 1""",
            (str(r["id"]),), fetch_one=True,
        )

        # Get symptom categories
        categories = set()
        if r["symptom_ids"]:
            for sid in r["symptom_ids"][:5]:  # Limit to avoid excessive queries
                s = query("SELECT category FROM symptoms WHERE id = %s", (sid,), fetch_one=True)
                if s:
                    categories.add(s["category"])

        analyses.append({
            "id": str(r["id"]),
            "patient_name": r["patient_name"],
            "patient_age": r["patient_age"],
            "patient_gender": r["patient_gender"],
            "user_name": r["user_name"],
            "user_email": r["user_email"],
            "symptom_count": len(r["symptom_ids"]) if r["symptom_ids"] else 0,
            "categories": list(categories),
            "status": r.get("status", "completed"),
            "result_count": result_count,
            "top_disease": top_result["disease"] if top_result else None,
            "top_confidence": float(top_result["confidence_pct"]) if top_result else None,
            "processing_time_ms": r.get("processing_time_ms"),
            "model_version": r.get("model_version"),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })

    return jsonify({
        "analyses": analyses,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/analyses/<analysis_id>", methods=["GET"])
@require_admin
def get_analysis(analysis_id):
    """Get detailed analysis."""
    pred = query("SELECT * FROM predictions WHERE id = %s", (analysis_id,), fetch_one=True)
    if not pred:
        return jsonify({"error": "Analysis not found"}), 404

    results = query(
        """SELECT pr.*, d.name as disease_name
           FROM prediction_results pr LEFT JOIN diseases d ON pr.disease_id = d.id
           WHERE pr.prediction_id = %s ORDER BY pr.rank""",
        (analysis_id,), fetch_all=True,
    )

    symptom_names = []
    if pred["symptom_ids"]:
        for sid in pred["symptom_ids"]:
            s = query("SELECT key, label, category FROM symptoms WHERE id = %s", (sid,), fetch_one=True)
            if s:
                symptom_names.append({"key": s["key"], "label": s["label"], "category": s["category"]})

    log_audit("view_analysis", "prediction", analysis_id)

    return jsonify({
        "id": str(pred["id"]),
        "patient": {
            "name": pred["patient_name"],
            "age": pred["patient_age"],
            "gender": pred["patient_gender"],
            "dob": pred.get("patient_dob"),
            "blood_group": pred.get("patient_blood_group"),
            "email": pred.get("patient_email"),
            "phone": pred.get("patient_phone"),
        },
        "symptoms": symptom_names,
        "symptom_ids": pred["symptom_ids"],
        "status": pred.get("status", "completed"),
        "processing_time_ms": pred.get("processing_time_ms"),
        "model_version": pred.get("model_version"),
        "created_at": pred["created_at"].isoformat() if pred["created_at"] else None,
        "results": [
            {
                "rank": r["rank"],
                "disease": r["disease_name"],
                "confidence": float(r["confidence_pct"]),
                "risk_level": r["risk_level"],
                "remedies": r["remedies_text"],
                "warning": r["warning_text"],
            }
            for r in results
        ],
    }), 200


# ── Report Endpoints ─────────────────────────────────────────────────────────

@admin_bp.route("/reports", methods=["GET"])
@require_admin
def list_reports():
    """List reports (predictions with results)."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 20)), 100)
    search = request.args.get("search", "").strip()
    date_from = request.args.get("date_from", "")
    date_to = request.args.get("date_to", "")
    offset = (page - 1) * per_page

    where_clauses = ["EXISTS (SELECT 1 FROM prediction_results pr WHERE pr.prediction_id = p.id)"]
    params = []

    if search:
        where_clauses.append("p.patient_name ILIKE %s")
        params.append(f"%{search}%")
    if date_from:
        where_clauses.append("p.created_at >= %s")
        params.append(date_from)
    if date_to:
        where_clauses.append("p.created_at <= %s::date + INTERVAL '1 day'")
        params.append(date_to)

    where_sql = "WHERE " + " AND ".join(where_clauses)

    total = query(f"SELECT COUNT(*) as count FROM predictions p {where_sql}", params, fetch_one=True)["count"]

    rows = query(
        f"""SELECT p.id, p.patient_name, p.patient_age, p.patient_gender,
                   p.created_at, p.status, p.model_version,
                   COUNT(pr.id) as result_count
           FROM predictions p
           LEFT JOIN prediction_results pr ON pr.prediction_id = p.id
           {where_sql}
           GROUP BY p.id
           ORDER BY p.created_at DESC
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    reports = []
    for r in rows:
        top_result = query(
            """SELECT d.name as disease, pr.confidence_pct, pr.risk_level
               FROM prediction_results pr JOIN diseases d ON pr.disease_id = d.id
               WHERE pr.prediction_id = %s ORDER BY pr.rank LIMIT 1""",
            (str(r["id"]),), fetch_one=True,
        )
        reports.append({
            "id": str(r["id"]),
            "patient_name": r["patient_name"],
            "patient_age": r["patient_age"],
            "patient_gender": r["patient_gender"],
            "result_count": r["result_count"],
            "top_disease": top_result["disease"] if top_result else None,
            "risk_level": top_result["risk_level"] if top_result else None,
            "status": r.get("status", "completed"),
            "model_version": r.get("model_version"),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })

    return jsonify({
        "reports": reports,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/reports/<report_id>", methods=["GET"])
@require_admin
def get_report(report_id):
    """Get report detail (same as analysis detail)."""
    log_audit("view_report", "prediction", report_id)
    # Reuse analysis detail logic
    return get_analysis(report_id)


# ── Symptom Endpoints ────────────────────────────────────────────────────────

@admin_bp.route("/symptoms", methods=["GET"])
@require_admin
def list_symptoms():
    """List symptoms with pagination, search, category filter."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 50)), 200)
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "")
    status = request.args.get("status", "")
    offset = (page - 1) * per_page

    where_clauses = []
    params = []

    if search:
        where_clauses.append("(key ILIKE %s OR label ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])
    if category:
        where_clauses.append("category = %s")
        params.append(category)
    if status == "active":
        where_clauses.append("is_active = TRUE")
    elif status == "inactive":
        where_clauses.append("is_active = FALSE")

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    total = query(f"SELECT COUNT(*) as count FROM symptoms {where_sql}", params, fetch_one=True)["count"]

    rows = query(
        f"""SELECT id, key, label, category, is_active, created_at, updated_at
           FROM symptoms {where_sql}
           ORDER BY category, label
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    symptoms = [{
        "id": r["id"],
        "key": r["key"],
        "label": r["label"],
        "category": r["category"],
        "is_active": r.get("is_active", True),
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
        "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
    } for r in rows]

    return jsonify({
        "symptoms": symptoms,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/symptoms/categories", methods=["GET"])
@require_admin
def list_symptom_categories():
    """List symptom categories with counts."""
    rows = query(
        """SELECT category, COUNT(*) as count,
                  SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
           FROM symptoms GROUP BY category ORDER BY category""",
        fetch_all=True,
    )

    # Category label mapping
    CATEGORY_LABELS = {
        "general": "General & Whole Body",
        "head_neuro": "Head & Neurological",
        "respiratory": "Respiratory",
        "heart_circulation": "Heart & Circulation",
        "eyes_vision": "Eyes & Vision",
        "ent": "Ear, Nose & Throat",
        "digestive": "Digestive & Stomach",
        "urinary": "Urinary & Kidney",
        "musculoskeletal": "Musculoskeletal",
        "skin": "Skin & Hair",
        "mouth": "Mouth, Teeth & Jaw",
        "mental": "Mental & Behavioral",
        "womens_health": "Women's Health",
        "mens_health": "Men's Health",
        "other": "Other Symptoms",
    }

    categories = [{
        "id": r["category"],
        "label": CATEGORY_LABELS.get(r["category"], r["category"].replace("_", " ").title()),
        "count": r["count"],
        "active_count": r["active_count"],
    } for r in rows]

    return jsonify({"categories": categories}), 200


@admin_bp.route("/symptoms/<int:symptom_id>", methods=["PATCH"])
@require_admin
def update_symptom(symptom_id):
    """Update symptom (active/inactive status)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    updates = []
    params = []

    if "is_active" in data:
        updates.append("is_active = %s")
        params.append(data["is_active"])
    if "label" in data:
        updates.append("label = %s")
        params.append(data["label"])
    if "category" in data:
        updates.append("category = %s")
        params.append(data["category"])

    if not updates:
        return jsonify({"error": "No fields to update"}), 400

    updates.append("updated_at = NOW()")
    params.append(symptom_id)

    execute(f"UPDATE symptoms SET {', '.join(updates)} WHERE id = %s", params)
    log_audit("update_symptom", "symptom", symptom_id, json.dumps(data))

    return jsonify({"message": "Symptom updated"}), 200


# ── AI/Model Endpoints ──────────────────────────────────────────────────────

@admin_bp.route("/ai/stats", methods=["GET"])
@require_admin
def ai_stats():
    """Get AI prediction statistics."""
    total_predictions = query("SELECT COUNT(*) as count FROM predictions", fetch_one=True)["count"]
    completed = query("SELECT COUNT(*) as count FROM predictions WHERE status = 'completed'", fetch_one=True)["count"]
    failed = query("SELECT COUNT(*) as count FROM predictions WHERE status = 'failed'", fetch_one=True)["count"]
    total_results = query("SELECT COUNT(*) as count FROM prediction_results", fetch_one=True)["count"]

    # Average confidence
    avg_confidence = query(
        "SELECT AVG(confidence_pct) as avg FROM prediction_results WHERE rank = 1",
        fetch_one=True,
    )

    # Risk level distribution
    risk_dist = query(
        """SELECT risk_level, COUNT(*) as count FROM prediction_results
           WHERE rank = 1 GROUP BY risk_level ORDER BY count DESC""",
        fetch_all=True,
    )

    # Prediction volume over time (last 30 days)
    volume = query(
        """SELECT DATE(created_at) as date, COUNT(*) as count
           FROM predictions WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date""",
        fetch_all=True,
    )

    # Current model
    current_model = query(
        "SELECT * FROM ai_models WHERE status = 'production' ORDER BY created_at DESC LIMIT 1",
        fetch_one=True,
    )

    model_info = None
    if current_model:
        model_info = {
            "id": current_model["id"],
            "name": current_model["name"],
            "version": current_model["version"],
            "model_type": current_model["model_type"],
            "status": current_model["status"],
            "accuracy": float(current_model["accuracy"]) if current_model["accuracy"] else None,
            "f1_score": float(current_model["f1_score"]) if current_model["f1_score"] else None,
            "num_features": current_model["num_features"],
            "num_diseases": current_model["num_diseases"],
            "training_date": current_model["training_date"].isoformat() if current_model["training_date"] else None,
        }

    return jsonify({
        "predictions": {
            "total": total_predictions,
            "completed": completed,
            "failed": failed,
            "total_results": total_results,
        },
        "avg_top_confidence": round(float(avg_confidence["avg"]), 2) if avg_confidence and avg_confidence["avg"] else None,
        "risk_distribution": [{"level": r["risk_level"], "count": r["count"]} for r in (risk_dist or [])],
        "volume": [{"date": str(r["date"]), "count": r["count"]} for r in (volume or [])],
        "current_model": model_info,
    }), 200


@admin_bp.route("/ai/models", methods=["GET"])
@require_admin
def list_models():
    """List all AI model versions."""
    rows = query(
        """SELECT id, name, version, model_type, status, accuracy, precision_score,
                  recall, f1_score, num_features, num_diseases,
                  num_train_samples, num_test_samples, train_time_seconds,
                  training_date, created_at
           FROM ai_models ORDER BY created_at DESC""",
        fetch_all=True,
    )

    models = [{
        "id": r["id"],
        "name": r["name"],
        "version": r["version"],
        "model_type": r["model_type"],
        "status": r["status"],
        "accuracy": float(r["accuracy"]) if r["accuracy"] else None,
        "precision": float(r["precision_score"]) if r["precision_score"] else None,
        "recall": float(r["recall"]) if r["recall"] else None,
        "f1_score": float(r["f1_score"]) if r["f1_score"] else None,
        "num_features": r["num_features"],
        "num_diseases": r["num_diseases"],
        "num_train_samples": r["num_train_samples"],
        "num_test_samples": r["num_test_samples"],
        "train_time_seconds": float(r["train_time_seconds"]) if r["train_time_seconds"] else None,
        "training_date": r["training_date"].isoformat() if r["training_date"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    } for r in rows]

    return jsonify({"models": models}), 200


@admin_bp.route("/ai/models/<int:model_id>", methods=["GET"])
@require_admin
def get_model(model_id):
    """Get model detail."""
    r = query("SELECT * FROM ai_models WHERE id = %s", (model_id,), fetch_one=True)
    if not r:
        return jsonify({"error": "Model not found"}), 404

    metadata = {}
    if r.get("metadata_json"):
        try:
            metadata = json.loads(r["metadata_json"])
        except json.JSONDecodeError:
            pass

    return jsonify({
        "id": r["id"],
        "name": r["name"],
        "version": r["version"],
        "model_type": r["model_type"],
        "status": r["status"],
        "accuracy": float(r["accuracy"]) if r["accuracy"] else None,
        "precision": float(r["precision_score"]) if r["precision_score"] else None,
        "recall": float(r["recall"]) if r["recall"] else None,
        "f1_score": float(r["f1_score"]) if r["f1_score"] else None,
        "num_features": r["num_features"],
        "num_diseases": r["num_diseases"],
        "num_train_samples": r["num_train_samples"],
        "num_test_samples": r["num_test_samples"],
        "train_time_seconds": float(r["train_time_seconds"]) if r["train_time_seconds"] else None,
        "training_date": r["training_date"].isoformat() if r["training_date"] else None,
        "metadata": metadata,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }), 200


# ── Feedback Endpoints ───────────────────────────────────────────────────────

@admin_bp.route("/feedback", methods=["GET"])
@require_admin
def list_feedback():
    """List feedback with pagination, search, filtering."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 20)), 100)
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "")
    priority = request.args.get("priority", "")
    offset = (page - 1) * per_page

    where_clauses = []
    params = []

    if search:
        where_clauses.append("(subject ILIKE %s OR message ILIKE %s OR user_name ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if status:
        where_clauses.append("status = %s")
        params.append(status)
    if priority:
        where_clauses.append("priority = %s")
        params.append(priority)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    total = query(f"SELECT COUNT(*) as count FROM feedback {where_sql}", params, fetch_one=True)["count"]

    rows = query(
        f"""SELECT id, user_id, user_name, user_email, subject, message, rating,
                   priority, status, admin_response, responded_at, created_at, updated_at
           FROM feedback {where_sql}
           ORDER BY
             CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
             created_at DESC
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    feedbacks = [{
        "id": str(r["id"]),
        "user_id": str(r["user_id"]) if r["user_id"] else None,
        "user_name": r["user_name"],
        "user_email": r["user_email"],
        "subject": r["subject"],
        "message": r["message"],
        "rating": r["rating"],
        "priority": r["priority"],
        "status": r["status"],
        "admin_response": r["admin_response"],
        "responded_at": r["responded_at"].isoformat() if r["responded_at"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    } for r in rows]

    # Stats
    stats = {
        "total": total,
        "by_status": {},
        "by_priority": {},
    }
    status_counts = query("SELECT status, COUNT(*) as count FROM feedback GROUP BY status", fetch_all=True)
    for sc in (status_counts or []):
        stats["by_status"][sc["status"]] = sc["count"]
    priority_counts = query("SELECT priority, COUNT(*) as count FROM feedback GROUP BY priority", fetch_all=True)
    for pc in (priority_counts or []):
        stats["by_priority"][pc["priority"]] = pc["count"]

    avg_rating = query("SELECT AVG(rating) as avg FROM feedback WHERE rating IS NOT NULL", fetch_one=True)
    stats["avg_rating"] = round(float(avg_rating["avg"]), 1) if avg_rating and avg_rating["avg"] else None

    return jsonify({
        "feedback": feedbacks,
        "stats": stats,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/feedback/<feedback_id>", methods=["PATCH"])
@require_admin
def update_feedback(feedback_id):
    """Update feedback status, priority, or admin response."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    updates = []
    params = []

    if "status" in data:
        updates.append("status = %s")
        params.append(data["status"])
    if "priority" in data:
        updates.append("priority = %s")
        params.append(data["priority"])
    if "admin_response" in data:
        updates.append("admin_response = %s")
        params.append(data["admin_response"])
        updates.append("responded_by = %s")
        params.append(g.admin_id)
        updates.append("responded_at = NOW()")

    if not updates:
        return jsonify({"error": "No fields to update"}), 400

    updates.append("updated_at = NOW()")
    params.append(feedback_id)

    execute(f"UPDATE feedback SET {', '.join(updates)} WHERE id = %s", params)
    log_audit("update_feedback", "feedback", feedback_id, json.dumps(data))

    return jsonify({"message": "Feedback updated"}), 200


# ── Notification Endpoints ───────────────────────────────────────────────────

@admin_bp.route("/notifications", methods=["GET"])
@require_admin
def list_notifications():
    """List notifications."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 20)), 100)
    offset = (page - 1) * per_page

    total = query("SELECT COUNT(*) as count FROM notifications", fetch_one=True)["count"]

    rows = query(
        """SELECT n.id, n.title, n.message, n.type, n.target_type, n.target_user_id,
                  n.status, n.created_at, au.name as created_by_name,
                  (SELECT COUNT(*) FROM notification_reads nr WHERE nr.notification_id = n.id) as read_count
           FROM notifications n
           LEFT JOIN admin_users au ON n.created_by = au.id
           ORDER BY n.created_at DESC
           LIMIT %s OFFSET %s""",
        (per_page, offset), fetch_all=True,
    )

    notifications = [{
        "id": str(r["id"]),
        "title": r["title"],
        "message": r["message"],
        "type": r["type"],
        "target_type": r["target_type"],
        "target_user_id": str(r["target_user_id"]) if r["target_user_id"] else None,
        "status": r["status"],
        "created_by_name": r["created_by_name"],
        "read_count": r["read_count"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    } for r in rows]

    return jsonify({
        "notifications": notifications,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


@admin_bp.route("/notifications", methods=["POST"])
@require_admin
def create_notification():
    """Create and send a notification."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    notif_type = data.get("type", "info")
    target_type = data.get("target_type", "all_patients")
    target_user_id = data.get("target_user_id")

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    result = execute_returning(
        """INSERT INTO notifications (title, message, type, target_type, target_user_id, created_by, status)
           VALUES (%s, %s, %s, %s, %s, %s, 'sent')
           RETURNING id""",
        (title, message, notif_type, target_type, target_user_id, g.admin_id),
    )

    log_audit("create_notification", "notification", result["id"], f"Target: {target_type}")

    return jsonify({
        "message": "Notification created and sent",
        "id": str(result["id"]),
    }), 201


@admin_bp.route("/notifications/stats", methods=["GET"])
@require_admin
def notification_stats():
    """Get notification analytics."""
    total = query("SELECT COUNT(*) as count FROM notifications", fetch_one=True)["count"]
    total_reads = query("SELECT COUNT(*) as count FROM notification_reads", fetch_one=True)["count"]

    by_type = query(
        "SELECT type, COUNT(*) as count FROM notifications GROUP BY type",
        fetch_all=True,
    )
    by_target = query(
        "SELECT target_type, COUNT(*) as count FROM notifications GROUP BY target_type",
        fetch_all=True,
    )
    by_status = query(
        "SELECT status, COUNT(*) as count FROM notifications GROUP BY status",
        fetch_all=True,
    )

    # Notification volume over time
    volume = query(
        """SELECT DATE(created_at) as date, COUNT(*) as count
           FROM notifications WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date""",
        fetch_all=True,
    )

    return jsonify({
        "total": total,
        "total_reads": total_reads,
        "by_type": {r["type"]: r["count"] for r in (by_type or [])},
        "by_target": {r["target_type"]: r["count"] for r in (by_target or [])},
        "by_status": {r["status"]: r["count"] for r in (by_status or [])},
        "volume": [{"date": str(r["date"]), "count": r["count"]} for r in (volume or [])],
    }), 200


# ── System Health Endpoints ──────────────────────────────────────────────────

@admin_bp.route("/system/health", methods=["GET"])
@require_admin
def system_health():
    """Check system health for all services."""
    services = {}

    # Database
    try:
        query("SELECT 1", fetch_one=True)
        db_tables = query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'",
            fetch_one=True,
        )
        services["database"] = {
            "status": "operational",
            "details": f"{db_tables['count']} tables",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        services["database"] = {
            "status": "unavailable",
            "details": str(e),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    # Backend API
    services["backend_api"] = {
        "status": "operational",
        "details": "Flask API running",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    # AI Service
    try:
        from predict import get_model_info
        model_info = get_model_info()
        services["ai_service"] = {
            "status": "operational",
            "details": f"Model: {model_info.get('model_name', 'Unknown')} ({model_info.get('num_features', 0)} features, {model_info.get('num_diseases', 0)} diseases)",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        services["ai_service"] = {
            "status": "degraded",
            "details": str(e),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    # Authentication Service
    services["authentication"] = {
        "status": "operational",
        "details": "JWT authentication active",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    # Gemini AI Service
    try:
        from gemini_service import _get_client
        client = _get_client()
        services["gemini_service"] = {
            "status": "operational" if client else "degraded",
            "details": "Gemini AI client ready" if client else "Gemini AI client not initialized",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        services["gemini_service"] = {
            "status": "unavailable",
            "details": str(e),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    # Overall status
    statuses = [s["status"] for s in services.values()]
    if all(s == "operational" for s in statuses):
        overall = "operational"
    elif any(s == "unavailable" for s in statuses):
        overall = "degraded"
    else:
        overall = "degraded"

    return jsonify({
        "overall": overall,
        "services": services,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }), 200


# ── Audit Log Endpoints ─────────────────────────────────────────────────────

@admin_bp.route("/audit", methods=["GET"])
@require_admin
def list_audit_logs():
    """List audit logs with pagination and filtering."""
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 30)), 100)
    action = request.args.get("action", "")
    date_from = request.args.get("date_from", "")
    date_to = request.args.get("date_to", "")
    offset = (page - 1) * per_page

    where_clauses = []
    params = []

    if action:
        where_clauses.append("action = %s")
        params.append(action)
    if date_from:
        where_clauses.append("created_at >= %s")
        params.append(date_from)
    if date_to:
        where_clauses.append("created_at <= %s::date + INTERVAL '1 day'")
        params.append(date_to)

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    total = query(f"SELECT COUNT(*) as count FROM audit_logs {where_sql}", params, fetch_one=True)["count"]

    rows = query(
        f"""SELECT id, admin_id, admin_email, action, resource_type, resource_id,
                   details, ip_address, created_at
           FROM audit_logs {where_sql}
           ORDER BY created_at DESC
           LIMIT %s OFFSET %s""",
        params + [per_page, offset], fetch_all=True,
    )

    logs = [{
        "id": r["id"],
        "admin_id": str(r["admin_id"]) if r["admin_id"] else None,
        "admin_email": r["admin_email"],
        "action": r["action"],
        "resource_type": r["resource_type"],
        "resource_id": r["resource_id"],
        "details": r["details"],
        "ip_address": r["ip_address"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    } for r in rows]

    # Available action types
    action_types = query(
        "SELECT DISTINCT action FROM audit_logs ORDER BY action",
        fetch_all=True,
    )

    return jsonify({
        "logs": logs,
        "action_types": [a["action"] for a in (action_types or [])],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        },
    }), 200


# ── Global Search ────────────────────────────────────────────────────────────

@admin_bp.route("/search", methods=["GET"])
@require_admin
def global_search():
    """Search across multiple resources."""
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({"error": "Search query must be at least 2 characters"}), 400

    results = {"patients": [], "symptoms": [], "analyses": [], "feedback": []}
    search_term = f"%{q}%"

    # Search patients
    patients = query(
        "SELECT id, name, email FROM users WHERE name ILIKE %s OR email ILIKE %s LIMIT 5",
        (search_term, search_term), fetch_all=True,
    )
    results["patients"] = [{"id": str(p["id"]), "name": p["name"], "email": p["email"]} for p in (patients or [])]

    # Search symptoms
    symptoms = query(
        "SELECT id, key, label, category FROM symptoms WHERE label ILIKE %s OR key ILIKE %s LIMIT 5",
        (search_term, search_term), fetch_all=True,
    )
    results["symptoms"] = [{"id": s["id"], "key": s["key"], "label": s["label"], "category": s["category"]} for s in (symptoms or [])]

    # Search analyses by patient name
    analyses = query(
        "SELECT id, patient_name, created_at FROM predictions WHERE patient_name ILIKE %s ORDER BY created_at DESC LIMIT 5",
        (search_term,), fetch_all=True,
    )
    results["analyses"] = [{"id": str(a["id"]), "patient_name": a["patient_name"], "created_at": a["created_at"].isoformat() if a["created_at"] else None} for a in (analyses or [])]

    # Search feedback
    feedbacks = query(
        "SELECT id, subject, user_name FROM feedback WHERE subject ILIKE %s OR message ILIKE %s LIMIT 5",
        (search_term, search_term), fetch_all=True,
    )
    results["feedback"] = [{"id": str(f["id"]), "subject": f["subject"], "user_name": f["user_name"]} for f in (feedbacks or [])]

    return jsonify({"results": results, "query": q}), 200


# ── Export Endpoints ─────────────────────────────────────────────────────────

@admin_bp.route("/export/<resource>", methods=["GET"])
@require_admin
def export_data(resource):
    """Export data as CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    if resource == "patients":
        writer.writerow(["ID", "Name", "Email", "Phone", "Status", "Created At"])
        rows = query("SELECT id, name, email, phone, status, created_at FROM users ORDER BY created_at DESC", fetch_all=True)
        for r in rows:
            writer.writerow([str(r["id"]), r["name"], r["email"], r.get("phone", ""), r.get("status", "active"),
                           r["created_at"].isoformat() if r["created_at"] else ""])

    elif resource == "analyses":
        writer.writerow(["ID", "Patient Name", "Age", "Gender", "Symptom Count", "Status", "Created At"])
        rows = query("SELECT id, patient_name, patient_age, patient_gender, symptom_ids, status, created_at FROM predictions ORDER BY created_at DESC LIMIT 1000", fetch_all=True)
        for r in rows:
            writer.writerow([str(r["id"]), r["patient_name"], r["patient_age"], r["patient_gender"],
                           len(r["symptom_ids"]) if r["symptom_ids"] else 0,
                           r.get("status", "completed"),
                           r["created_at"].isoformat() if r["created_at"] else ""])

    elif resource == "feedback":
        writer.writerow(["ID", "User", "Email", "Subject", "Rating", "Priority", "Status", "Created At"])
        rows = query("SELECT id, user_name, user_email, subject, rating, priority, status, created_at FROM feedback ORDER BY created_at DESC", fetch_all=True)
        for r in rows:
            writer.writerow([str(r["id"]), r["user_name"], r["user_email"], r["subject"],
                           r["rating"], r["priority"], r["status"],
                           r["created_at"].isoformat() if r["created_at"] else ""])

    else:
        return jsonify({"error": f"Unknown resource: {resource}"}), 400

    log_audit("export_data", resource, details=f"Exported {resource} as CSV")

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=caretrack_{resource}_{datetime.now().strftime('%Y%m%d')}.csv"},
    )
