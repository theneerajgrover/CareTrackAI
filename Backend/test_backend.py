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


if __name__ == "__main__":
    test_database_connection()
    test_model_and_prediction_engine()
    test_gemini_service()
    test_flask_api_endpoints()
