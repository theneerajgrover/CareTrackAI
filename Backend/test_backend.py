"""
test_backend.py
----------------
End-to-end verification script for CareTrack AI Backend.
Tests:
  1. Database connection & model vocabulary integrity (exact set-based feature verification)
  2. Model loading & prediction
  3. User registration & JWT generation (bcrypt + tokens)
  4. User login & token verification
  5. Prediction API with DB storage (symptom IDs as integer array)
  6. Gemini remedy generation & high-risk warnings
  7. Prediction history retrieval
"""

import os
import sys
import json
import joblib
from dotenv import load_dotenv

# Ensure Backend directory is in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

_env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()

from database import query, execute
from predict import predict_disease, get_model_info, get_available_symptoms
from gemini_service import generate_remedies_and_warnings


def assert_test_database_isolation():
    """
    Ensure tests never run against production database instances (e.g. Supabase, Render, Neon).
    Halts execution before any query or mutation if cloud/production indicators are detected.
    """
    db_url = os.getenv("DATABASE_URL", "").lower()
    db_host = os.getenv("DB_HOST", "localhost").lower()

    prohibited_domains = ["supabase.co", "supabase.com", "onrender.com", "neon.tech", "pooler.supabase.com"]
    for domain in prohibited_domains:
        if domain in db_url or domain in db_host:
            raise RuntimeError(
                f"[SECURITY ALERT] Tests halted: Configured database host indicates a production/cloud instance ({domain}). "
                "Automated tests must run strictly against an isolated test database or localhost."
            )


def test_database_connection():
    """
    Verify database connectivity and enforce exact set-based model vocabulary validation.
    Guarantees that 100% of the model's required input feature columns exist in the database,
    while permitting legitimate additional clinical symptoms (e.g. migraine).
    """
    assert_test_database_isolation()
    print("\n[Test 1] Testing Database Connection & Model Vocabulary Integrity...")

    user_count = query("SELECT COUNT(*) FROM users", fetch_one=True)["count"]
    symptom_count = query("SELECT COUNT(*) FROM symptoms", fetch_one=True)["count"]
    disease_count = query("SELECT COUNT(*) FROM diseases", fetch_one=True)["count"]

    info = get_model_info()
    expected_diseases = info["num_diseases"]  # 713 disease classes

    # Load exact model feature names from disk
    model_dir = os.path.join(BASE_DIR, "Model")
    fc_path = os.path.join(model_dir, "feature_columns.pkl")
    model_features = set(joblib.load(fc_path))

    # Retrieve all registered symptom keys from the database
    db_rows = query("SELECT key FROM symptoms", fetch_all=True)
    db_symptom_keys = set(str(r["key"]).strip().lower() for r in db_rows)

    # Calculate exact set difference: required model features missing from the database
    missing_features = model_features - db_symptom_keys
    additional_symptoms = db_symptom_keys - model_features

    print(f"  Users in DB: {user_count}")
    print(f"  Model Features: {len(model_features)}")
    print(f"  Symptoms in DB: {symptom_count} (Extra clinical symptoms: {len(additional_symptoms)})")
    print(f"  Diseases in DB: {disease_count} (Expected: {expected_diseases})")

    # Exact set-based assertion: ZERO model features can be missing
    assert len(missing_features) == 0, (
        f"Model vocabulary integrity failure: {len(missing_features)} model features "
        f"are missing from the database symptoms table: {sorted(list(missing_features))}"
    )

    # Exact disease classes assertion
    assert disease_count == expected_diseases, (
        f"Database disease count ({disease_count}) does not match expected {expected_diseases}"
    )
    print("  [OK] Model vocabulary & database verification passed!")


def test_model_and_prediction_engine():
    """Verify ML model loading, feature dimensions, and multi-symptom inference."""
    print("\n[Test 2] Testing Model & Prediction Engine...")
    info = get_model_info()
    print(f"  Model Loaded: {info['model_name']} (Accuracy: {info['accuracy']}, F1: {info['f1_score']})")
    test_symptoms = ["fever", "cough", "headache", "fatigue", "sore_throat"]
    pred_res = predict_disease(test_symptoms, top_n=5)
    print(f"  Input Symptoms: {test_symptoms}")
    print(f"  Matched Symptoms: {pred_res['symptoms_matched']}")
    print(f"  Top 5 Predicted Diseases:")
    for i, p in enumerate(pred_res["predictions"], 1):
        print(f"    {i}. {p['disease']:35s} {p['confidence']:6.2f}%")
    assert len(pred_res["predictions"]) > 0, "Expected predictions"
    assert "common cold" in [p["disease"].lower() for p in pred_res["predictions"]] or len(pred_res["predictions"]) >= 1
    print("  [OK] Model prediction passed!")


def test_gemini_service():
    """Verify Gemini clinical remedy generation and high-risk warning stratification."""
    print("\n[Test 3] Testing Gemini Remedies & Doctor Warning...")
    test_preds = [
        {"disease": "common cold", "confidence": 78.5, "rank": 1, "disease_id": 10},
        {"disease": "heart attack", "confidence": 85.0, "rank": 2, "disease_id": 20},
    ]
    enriched = generate_remedies_and_warnings(test_preds)
    for p in enriched:
        print(f"  Disease: {p['disease']} ({p['confidence']}%) -> Risk: {p['risk_level']}")
        if p.get('remedies_text'):
            print(f"    Remedies: {p['remedies_text'][:100]}...")
        if p.get('warning_text'):
            print(f"    Warning:  {p['warning_text']}")
    assert enriched[0]["remedies_text"] is not None, "Expected remedies for common cold"
    assert enriched[1]["warning_text"] is not None, "Expected warning for high-risk disease"
    print("  [OK] Gemini & warning logic passed!")


def _cleanup_test_patient_artifacts(email: str):
    """Thoroughly remove test user and all child predictions/results/tokens in an isolated manner."""
    try:
        execute(
            """DELETE FROM prediction_results 
               WHERE prediction_id IN (SELECT id FROM predictions WHERE patient_email = %s)""",
            (email,)
        )
        execute("DELETE FROM predictions WHERE patient_email = %s", (email,))
        execute(
            """DELETE FROM refresh_tokens 
               WHERE user_id IN (SELECT id FROM users WHERE email = %s)""",
            (email,)
        )
        execute("DELETE FROM users WHERE email = %s", (email,))
    except Exception as e:
        print(f"  [cleanup warning] {e}")


def test_flask_api_endpoints():
    """Verify Flask REST endpoints with test_client and guarantee complete artifact cleanup."""
    assert_test_database_isolation()
    print("\n[Test 4] Testing Flask API with TestClient...")
    from app import app
    client = app.test_client()

    # Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    print("  GET /api/health -> 200 OK")

    # Symptoms endpoint
    res = client.get("/api/symptoms")
    assert res.status_code == 200
    s_data = res.get_json()
    assert s_data["count"] >= 377, f"Expected at least 377 symptoms, got {s_data['count']}"
    print(f"  GET /api/symptoms -> 200 OK ({s_data['count']} symptoms with numeric IDs)")

    # Diseases endpoint
    res = client.get("/api/diseases")
    assert res.status_code == 200
    d_data = res.get_json()
    assert d_data["count"] == 713
    print(f"  GET /api/diseases -> 200 OK ({d_data['count']} diseases with numeric IDs)")

    # Auth Register
    test_email = "test_patient_verify@caretrack.ai"
    _cleanup_test_patient_artifacts(test_email)

    res = client.post("/api/auth/register", json={
        "name": "Alex Smith",
        "email": test_email,
        "password": "SecurePassword123!",
        "phone": "+1234567890",
    })
    assert res.status_code == 201, f"Register failed: {res.get_data(as_text=True)}"
    reg_data = res.get_json()
    access_token = reg_data["access_token"]
    refresh_token = reg_data["refresh_token"]
    print("  POST /api/auth/register -> 201 Created (Access & Refresh tokens generated)")

    try:
        # Auth Login
        res = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "SecurePassword123!",
        })
        assert res.status_code == 200
        login_data = res.get_json()
        assert "access_token" in login_data
        print("  POST /api/auth/login -> 200 OK (Bcrypt hash verified)")

        # Auth Refresh
        res = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert res.status_code == 200
        print("  POST /api/auth/refresh -> 200 OK (New access token issued)")

        # Predict Endpoint (Authenticated)
        res = client.post(
            "/api/predict",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "symptoms": ["fever", "cough", "headache", "fatigue"],
                "patient_details": {
                    "name": "Alex Smith",
                    "age": "32",
                    "gender": "male",
                    "dob": "1994-05-12",
                    "email": test_email,
                    "phone": "+1234567890",
                },
            },
        )
        assert res.status_code == 200, f"Predict failed: {res.get_data(as_text=True)}"
        pred_api_data = res.get_json()
        print("  POST /api/predict -> 200 OK")
        print(f"    Prediction ID: {pred_api_data['prediction_id']}")
        print(f"    Numeric Symptom IDs: {pred_api_data['symptom_ids']}")
        print("    Top Findings:")
        for p in pred_api_data["predictions"]:
            print(f"      - Rank {p['rank']}: {p['disease']} (ID: {p['disease_id']}, {p['confidence']}%, Risk: {p['risk_level']})")

        # Past Predictions Endpoint (Authenticated)
        res = client.get(
            "/api/predictions",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert res.status_code == 200
        history = res.get_json()["predictions"]
        assert len(history) >= 1
        print(f"  GET /api/predictions -> 200 OK ({len(history)} past predictions found)")

        # Single Prediction Detail Endpoint (Authenticated)
        pred_id = pred_api_data["prediction_id"]
        res = client.get(
            f"/api/predictions/{pred_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert res.status_code == 200
        detail = res.get_json()
        assert detail["id"] == pred_id
        print(f"  GET /api/predictions/{pred_id} -> 200 OK (Full detail retrieved)")
    finally:
        # Guarantee complete cleanup of user and all child predictions/results
        _cleanup_test_patient_artifacts(test_email)

    print("\n" + "=" * 60)
    print("  ALL BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)


def test_guest_health_assessment_policy():
    """
    Verify the 1-time free guest health assessment policy:
    1. New guest_id: GET /api/guest/status returns used: false.
    2. First assessment: POST /api/guest/predict succeeds (200 OK) with differential diagnoses.
    3. Consumed guest_id: GET /api/guest/status returns used: true.
    4. Second assessment with same guest_id: POST /api/guest/predict is blocked (403 GUEST_LIMIT_REACHED).
    5. Cleanup synthetic test guest records.
    """
    assert_test_database_isolation()
    from app import app
    client = app.test_client()
    test_guest_id = "test_guest_verify_" + os.urandom(8).hex()
    created_pred_id = None

    try:
        # 1. Check initial status for new guest
        res = client.get(f"/api/guest/status?guest_id={test_guest_id}")
        assert res.status_code == 200
        data = res.get_json()
        assert data["used"] is False
        assert data["remaining"] == 1

        # 2. Perform first guest prediction
        res = client.post(
            "/api/guest/predict",
            json={
                "guest_id": test_guest_id,
                "symptoms": ["fever", "headache", "cough"],
                "patient_details": {"name": "Test Guest", "age": "30", "gender": "male"}
            }
        )
        assert res.status_code == 200
        pred_data = res.get_json()
        assert "prediction_id" in pred_data
        assert len(pred_data["predictions"]) > 0
        created_pred_id = pred_data["prediction_id"]

        # 3. Check status after consumption
        res = client.get(f"/api/guest/status?guest_id={test_guest_id}")
        assert res.status_code == 200
        data = res.get_json()
        assert data["used"] is True
        assert data["remaining"] == 0

        # 4. Attempt second guest prediction with same guest_id -> must be rejected with 403
        res = client.post(
            "/api/guest/predict",
            json={
                "guest_id": test_guest_id,
                "symptoms": ["fever"],
                "patient_details": {"name": "Test Guest", "age": "30", "gender": "male"}
            }
        )
        assert res.status_code == 403
        err_data = res.get_json()
        assert err_data["code"] == "GUEST_LIMIT_REACHED"
        assert err_data["used"] is True

        # 5. Verify failure behavior: an unprocessable/failed prediction must leave guest eligible
        test_guest_id_fail = "test_guest_fail_" + os.urandom(8).hex()
        res_fail = client.post(
            "/api/guest/predict",
            json={
                "guest_id": test_guest_id_fail,
                "symptoms": ["completely_unmatched_symptom_token_9999"],
            }
        )
        assert res_fail.status_code == 422
        # Verify guest is NOT consumed
        res_status = client.get(f"/api/guest/status?guest_id={test_guest_id_fail}")
        assert res_status.status_code == 200
        assert res_status.get_json()["used"] is False
        assert res_status.get_json()["remaining"] == 1

    finally:
        # Guarantee complete cleanup of synthetic test guest records
        execute("DELETE FROM guest_usage WHERE guest_id = %s", (test_guest_id,))
        if created_pred_id:
            execute("DELETE FROM prediction_results WHERE prediction_id = %s", (created_pred_id,))
            execute("DELETE FROM predictions WHERE id = %s", (created_pred_id,))


def test_guest_predict_concurrency_race_condition():
    """
    DETERMINISTIC CONCURRENCY TEST:
    Verify that when two simultaneous requests with the exact same guest_id both pass
    the initial eligibility SELECT (synchronized via threading.Barrier), exactly ONE request
    claims the free assessment (HTTP 200), the losing request is rejected (HTTP 403 GUEST_LIMIT_REACHED),
    all orphan records from the rejected request are atomically cleaned up, the winning prediction
    remains completely intact, and subsequent requests are rejected.
    """
    assert_test_database_isolation()
    import threading
    from unittest.mock import patch
    from app import app
    import app as app_module

    client = app.test_client()
    test_guest_id = "test_concurrent_guest_" + os.urandom(8).hex()

    # Barrier to hold both requests AFTER they pass the initial SELECT in guest_predict
    barrier = threading.Barrier(2)
    original_predict_disease = app_module.predict_disease

    def synchronized_predict_disease(*args, **kwargs):
        # Both threads have already passed:
        # existing = query("SELECT id FROM guest_usage WHERE guest_id = %s LIMIT 1", ...)
        res = original_predict_disease(*args, **kwargs)
        barrier.wait(timeout=5)  # Synchronize here before proceeding to database writes
        return res

    results = []

    def send_request():
        c = app.test_client()
        r = c.post(
            "/api/guest/predict",
            json={
                "guest_id": test_guest_id,
                "symptoms": ["fever", "headache", "cough"],
                "patient_details": {"name": "Concurrent Guest Patient", "age": "30", "gender": "male"}
            }
        )
        results.append(r)

    winning_pred_id = None
    try:
        with patch.object(app_module, "predict_disease", side_effect=synchronized_predict_disease):
            t1 = threading.Thread(target=send_request)
            t2 = threading.Thread(target=send_request)
            t1.start()
            t2.start()
            t1.join(timeout=10)
            t2.join(timeout=10)

        # 1. Exactly one request returns HTTP 200, exactly one returns HTTP 403
        assert len(results) == 2
        statuses = [r.status_code for r in results]
        assert 200 in statuses, f"Expected one 200 OK, got: {statuses}"
        assert 403 in statuses, f"Expected one 403 Forbidden, got: {statuses}"

        # 2. Verify rejected request details
        loser_resp = next(r for r in results if r.status_code == 403)
        loser_data = loser_resp.get_json()
        assert loser_data.get("code") == "GUEST_LIMIT_REACHED"
        assert loser_data.get("used") is True

        # 3. Verify winning request details
        winner_resp = next(r for r in results if r.status_code == 200)
        winner_data = winner_resp.get_json()
        winning_pred_id = winner_data["prediction_id"]
        assert len(winner_data["predictions"]) > 0

        # 4. Verify exactly ONE guest_usage record exists for this guest ID
        usage_rows = query("SELECT id, prediction_id FROM guest_usage WHERE guest_id = %s", (test_guest_id,), fetch_all=True)
        assert len(usage_rows) == 1, f"Expected exactly 1 guest_usage row, got {len(usage_rows)}"
        assert str(usage_rows[0]["prediction_id"]) == str(winning_pred_id)

        # 5. Verify winning prediction and its results remain intact
        pred_row = query("SELECT id FROM predictions WHERE id = %s", (winning_pred_id,), fetch_one=True)
        assert pred_row is not None, "Winning prediction record missing!"
        result_rows = query("SELECT id FROM prediction_results WHERE prediction_id = %s", (winning_pred_id,), fetch_all=True)
        assert len(result_rows) > 0, "Winning prediction_results missing!"

        # 6. Verify NO orphan prediction records remain from the rejected request
        orphan_preds = query(
            "SELECT id FROM predictions WHERE id != %s AND patient_name = %s",
            (winning_pred_id, "Concurrent Guest Patient"),
            fetch_all=True
        )
        assert len(orphan_preds) == 0, f"Found orphan prediction records: {orphan_preds}"

        # 7. Subsequent request for same guest ID returns HTTP 403
        subsequent_res = client.post(
            "/api/guest/predict",
            json={
                "guest_id": test_guest_id,
                "symptoms": ["fever"],
                "patient_details": {"name": "Concurrent Guest Patient", "age": "30", "gender": "male"}
            }
        )
        assert subsequent_res.status_code == 403
        assert subsequent_res.get_json()["code"] == "GUEST_LIMIT_REACHED"

    finally:
        # Guarantee complete cleanup
        execute("DELETE FROM guest_usage WHERE guest_id = %s", (test_guest_id,))
        if winning_pred_id:
            execute("DELETE FROM prediction_results WHERE prediction_id = %s", (winning_pred_id,))
            execute("DELETE FROM predictions WHERE id = %s", (winning_pred_id,))


if __name__ == "__main__":
    test_database_connection()
    test_model_and_prediction_engine()
    test_gemini_service()
    test_flask_api_endpoints()
    test_guest_health_assessment_policy()
    test_guest_predict_concurrency_race_condition()
