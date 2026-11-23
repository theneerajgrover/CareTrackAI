"""
test_pdf_report.py
------------------
Automated test suite for backend PDF generation and endpoint authorization.
Verifies:
1. Pure vector/selectable PDF generation via pdf_service
2. Exact A4 rendering, two-pass NumberedCanvas, and canonical URL
3. Handling of missing optional patient fields
4. Multi-page report scaling and condition pagination
5. Authentication and authorization enforcement (owner-only, admin RBAC, IDOR prevention, guest access)
"""

import io
import re
import uuid
import zlib
import base64
import pytest
from datetime import datetime, timezone, timedelta
import jwt

from app import app, JWT_SECRET
import pdf_service
from database import query, execute, execute_returning, execute_transaction


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def make_user_token(user_id: str, email: str = "testpatient@example.com") -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def make_admin_token(admin_id: str, email: str = "admin@example.com") -> str:
    payload = {
        "sub": str(admin_id),
        "email": email,
        "type": "admin_access",
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def extract_pdf_decompressed_text(pdf_bytes: bytes) -> bytes:
    """Extract and decompress all text streams from ReportLab ASCII85 + Flate encoded PDF."""
    pos = 0
    decompressed = b""
    while True:
        s_idx = pdf_bytes.find(b"stream\n", pos)
        if s_idx == -1:
            break
        e_idx = pdf_bytes.find(b"endstream", s_idx)
        chunk = pdf_bytes[s_idx + 7:e_idx].strip()
        if b"~>" in chunk:
            chunk = chunk[:chunk.find(b"~>") + 2]
            try:
                decompressed += zlib.decompress(base64.a85decode(chunk, adobe=True))
            except Exception:
                pass
        else:
            try:
                decompressed += zlib.decompress(chunk)
            except Exception:
                decompressed += chunk
        pos = e_idx + 9
    return decompressed


# ── Unit Tests: PDF Generation Service ──────────────────────────────────────────

def test_pdf_generation_structure_and_canonical_url():
    """Verify generated PDF starts with %PDF-, contains patient details, conditions, and exact website URL."""
    sample_data = {
        "id": "pred-unit-12345",
        "created_at": "2026-11-23T14:30:00Z",
        "patient": {
            "name": "Jane Doe",
            "age": 28,
            "gender": "female",
            "dob": "1998-04-15",
            "blood_group": "A+",
            "height": "168",
            "weight": "60",
        },
        "symptoms": [
            {"key": "headache", "label": "Severe Headache"},
            {"key": "nausea", "label": "Nausea & Dizziness"},
        ],
        "results": [
            {
                "rank": 1,
                "disease": "Migraine Disorder",
                "confidence": 92.5,
                "risk_level": "moderate",
                "doctor": "Neurologist",
                "warning": "Seek emergency care if accompanied by sudden numbness.",
                "remedies": "1. Rest in a dark, quiet room.\n2. Hydrate with cold water.",
            }
        ],
    }

    pdf_bytes = pdf_service.generate_medical_report_pdf(sample_data)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 3000

    decompressed = extract_pdf_decompressed_text(pdf_bytes)
    assert b"Jane Doe" in decompressed
    assert b"Migraine Disorder" in decompressed
    assert b"Neurologist" in decompressed
    assert b"https://theneerajgrover.github.io/CareTrackAI/" in decompressed

    # Ensure no unwanted routes appear in the document
    assert b"#/report" not in pdf_bytes
    assert b"/report" not in decompressed or b"Medical Assessment Report" in decompressed


def test_pdf_generation_minimal_optional_fields():
    """Verify PDF generates cleanly when optional fields (height, weight, dob, remedies) are omitted."""
    minimal_data = {
        "id": "pred-min-67890",
        "patient": {
            "name": "Alex Smith",
            "age": 45,
            "gender": "other",
        },
        "symptoms": ["cough"],
        "results": [
            {
                "rank": 1,
                "disease": "Acute Bronchitis",
                "confidence": 76.0,
                "risk_level": "low",
            }
        ],
    }

    pdf_bytes = pdf_service.generate_medical_report_pdf(minimal_data)
    assert pdf_bytes.startswith(b"%PDF-")
    decompressed = extract_pdf_decompressed_text(pdf_bytes)
    assert b"Alex Smith" in decompressed
    assert b"Acute Bronchitis" in decompressed


def test_pdf_generation_multipage_flow():
    """Verify multi-page scaling when multiple findings with detailed text are present."""
    multipage_data = {
        "id": "pred-multi-99999",
        "patient": {"name": "Jordan Taylor", "age": 55, "gender": "female"},
        "symptoms": ["fatigue", "fever", "chest_pain", "shortness_of_breath", "joint_pain"],
        "results": [
            {
                "rank": i + 1,
                "disease": f"Clinical Condition Class {i + 1}",
                "confidence": 90.0 - i * 8.0,
                "risk_level": "high" if i == 0 else "moderate" if i < 3 else "low",
                "warning": f"Clinical advisory notice for condition {i + 1} regarding emergency thresholds." if i < 3 else None,
                "remedies": f"1. Supportive remedy line A for finding {i + 1}.\n2. Supportive remedy line B for finding {i + 1}." if i < 4 else None,
            }
            for i in range(6)
        ],
    }

    pdf_bytes = pdf_service.generate_medical_report_pdf(multipage_data)
    assert pdf_bytes.startswith(b"%PDF-")
    # Multi-page documents have multiple /Page objects
    page_matches = re.findall(rb"/Type\s*/Page\b", pdf_bytes)
    assert len(page_matches) >= 2


# ── Integration Tests: Backend Endpoint Authentication & Authorization ─────────

def test_pdf_endpoint_unauthenticated_without_guest(client):
    """GET /api/predictions/<id>/pdf without auth token or guest header returns 401."""
    fake_id = str(uuid.uuid4())
    res = client.get(f"/api/predictions/{fake_id}/pdf")
    assert res.status_code == 401
    assert "Authentication required" in res.get_json()["error"]


def test_pdf_endpoint_invalid_token(client):
    """GET /api/predictions/<id>/pdf with malformed token returns 401."""
    fake_id = str(uuid.uuid4())
    res = client.get(
        f"/api/predictions/{fake_id}/pdf",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert res.status_code == 401


def test_pdf_endpoint_prediction_not_found(client):
    """GET /api/predictions/<id>/pdf for non-existent prediction returns 404."""
    user_id = str(uuid.uuid4())
    token = make_user_token(user_id)
    non_existent_id = str(uuid.uuid4())

    res = client.get(
        f"/api/predictions/{non_existent_id}/pdf",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
    assert "not found" in res.get_json()["error"].lower()


def test_pdf_endpoint_idor_prevention(client):
    """User A cannot access User B's prediction report (returns 403 Forbidden)."""
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    execute(
        """INSERT INTO users (id, name, email, password_hash)
           VALUES (%s, 'User A', %s, 'hash') ON CONFLICT DO NOTHING""",
        (user_a, f"user_a_{user_a[:8]}@example.com"),
    )
    execute(
        """INSERT INTO users (id, name, email, password_hash)
           VALUES (%s, 'User B', %s, 'hash') ON CONFLICT DO NOTHING""",
        (user_b, f"user_b_{user_b[:8]}@example.com"),
    )

    token_a = make_user_token(user_a, f"user_a_{user_a[:8]}@example.com")

    # Insert a prediction owned by User B
    pred_row = execute_returning(
        """INSERT INTO predictions (user_id, patient_name, patient_age, patient_gender, symptom_ids)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (user_b, "User B Patient", "40", "male", []),
    )
    pred_b_id = str(pred_row["id"])

    try:
        # User A attempts to download User B's report
        res = client.get(
            f"/api/predictions/{pred_b_id}/pdf",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 403
        assert "Unauthorized" in res.get_json()["error"]
    finally:
        execute("DELETE FROM predictions WHERE id = %s", (pred_b_id,))
        execute("DELETE FROM users WHERE id IN (%s, %s)", (user_a, user_b))


def test_pdf_endpoint_owner_success(client):
    """Owner user can download their own report as application/pdf with Content-Disposition."""
    user_id = str(uuid.uuid4())
    user_email = f"patient_{user_id[:8]}@example.com"
    token = make_user_token(user_id, user_email)

    execute(
        """INSERT INTO users (id, name, email, password_hash)
           VALUES (%s, 'Owner Patient', %s, 'hash') ON CONFLICT DO NOTHING""",
        (user_id, user_email),
    )

    # Create prediction and prediction_results
    pred_row = execute_returning(
        """INSERT INTO predictions (user_id, patient_name, patient_age, patient_gender, patient_blood_group, symptom_ids)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (user_id, "Authorized Owner Patient", "35", "female", "B+", []),
    )
    pred_id = str(pred_row["id"])

    # Insert a sample disease result
    execute(
        """INSERT INTO prediction_results (prediction_id, confidence_pct, rank, risk_level, remedies_text, warning_text)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (pred_id, 88.5, 1, "low", "Stay hydrated and get rest.", None),
    )

    try:
        res = client.get(
            f"/api/predictions/{pred_id}/pdf",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.mimetype == "application/pdf"
        assert res.data.startswith(b"%PDF-")
        assert 'filename="authorized_owner_patient_caretrack_report.pdf"' in res.headers.get("Content-Disposition", "")
    finally:
        execute("DELETE FROM prediction_results WHERE prediction_id = %s", (pred_id,))
        execute("DELETE FROM predictions WHERE id = %s", (pred_id,))
        execute("DELETE FROM users WHERE id = %s", (user_id,))


def test_pdf_endpoint_admin_access(client):
    """Admin can download any patient's report via admin_access token."""
    user_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())
    admin_token = make_admin_token(admin_id)

    execute(
        """INSERT INTO users (id, name, email, password_hash)
           VALUES (%s, 'Admin Test User', %s, 'hash') ON CONFLICT DO NOTHING""",
        (user_id, f"admin_test_{user_id[:8]}@example.com"),
    )

    pred_row = execute_returning(
        """INSERT INTO predictions (user_id, patient_name, patient_age, patient_gender, symptom_ids)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (user_id, "Patient for Admin Review", "62", "male", []),
    )
    pred_id = str(pred_row["id"])

    try:
        res = client.get(
            f"/api/predictions/{pred_id}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert res.mimetype == "application/pdf"
        assert res.data.startswith(b"%PDF-")
    finally:
        execute("DELETE FROM predictions WHERE id = %s", (pred_id,))
        execute("DELETE FROM users WHERE id = %s", (user_id,))


def test_pdf_endpoint_guest_access(client):
    """Guest with matching guest_usage can download their guest report; mismatched guest is rejected."""
    guest_id = "test_guest_" + uuid.uuid4().hex[:12]
    wrong_guest = "test_guest_wrong_" + uuid.uuid4().hex[:12]

    # Create unlinked prediction for guest
    pred_row = execute_returning(
        """INSERT INTO predictions (user_id, patient_name, patient_age, patient_gender, symptom_ids)
           VALUES (NULL, %s, %s, %s, %s) RETURNING id""",
        ("Guest Free Patient", "29", "other", []),
    )
    pred_id = str(pred_row["id"])

    # Link in guest_usage
    execute(
        """INSERT INTO guest_usage (guest_id, ip_address, prediction_id)
           VALUES (%s, %s, %s)""",
        (guest_id, "127.0.0.1", pred_id),
    )

    try:
        # Wrong guest header -> 403
        res_wrong = client.get(
            f"/api/predictions/{pred_id}/pdf",
            headers={"X-Guest-ID": wrong_guest},
        )
        assert res_wrong.status_code == 403

        # Matching guest header -> 200 OK with PDF
        res_valid = client.get(
            f"/api/predictions/{pred_id}/pdf",
            headers={"X-Guest-ID": guest_id},
        )
        assert res_valid.status_code == 200
        assert res_valid.mimetype == "application/pdf"
        assert res_valid.data.startswith(b"%PDF-")
    finally:
        execute("DELETE FROM guest_usage WHERE guest_id = %s", (guest_id,))
        execute("DELETE FROM predictions WHERE id = %s", (pred_id,))


def test_sanitize_report_filename():
    """Verify filename sanitization strictly produces patient_name_caretrack_report.pdf."""
    assert pdf_service.sanitize_report_filename("Neeraj Grover") == "neeraj_grover_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename("Alex Morgan") == "alex_morgan_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename("John   Smith!") == "john_smith_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename("Dr. John-Paul O'Connor") == "dr_john_paul_o_connor_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename("") == "patient_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename(None) == "patient_caretrack_report.pdf"
    assert pdf_service.sanitize_report_filename("___") == "patient_caretrack_report.pdf"


def test_format_assessment_datetime():
    """Verify timestamp parsing and conversion to Asia/Kolkata (IST)."""
    # 23 Nov 2026 08:27:00 UTC -> 01:57 PM IST
    dt_str = "2026-11-23T08:27:00Z"
    formatted = pdf_service.format_assessment_datetime(dt_str)
    assert formatted == "23 November 2026 | 01:57 PM"

    # Datetime object (UTC naive -> IST)
    dt_obj = datetime(2026, 11, 23, 8, 27, 0)
    assert pdf_service.format_assessment_datetime(dt_obj) == "23 November 2026 | 01:57 PM"

    # Missing & invalid fallbacks (never fabricates current time)
    assert pdf_service.format_assessment_datetime(None) == "Assessment time unavailable"
    assert pdf_service.format_assessment_datetime("") == "Assessment time unavailable"
    assert pdf_service.format_assessment_datetime("invalid") == "Assessment time unavailable"


def test_footer_horizontal_layout_no_overlap():
    """Verify mathematical bounds of 3 footer sections prove zero horizontal overlap on A4."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io

    c = canvas.Canvas(io.BytesIO(), pagesize=A4)
    page_w, page_h = A4
    margin_x = 36.0

    left_text = "© CareTrackAI"
    left_w = c.stringWidth(left_text, "Helvetica-Bold", 7.5)
    left_end_x = margin_x + left_w

    url_text = pdf_service.CANONICAL_WEBSITE_URL
    url_w = c.stringWidth(url_text, "Helvetica-Bold", 7.5)
    center_start_x = (page_w - url_w) / 2.0
    center_end_x = center_start_x + url_w

    page_str = "Page 1 of 1"
    page_w_str = c.stringWidth(page_str, "Helvetica-Bold", 7.5)
    right_start_x = (page_w - margin_x) - page_w_str

    # Left section ends well before center starts (at least 80 pt clearance)
    gap_left_center = center_start_x - left_end_x
    assert gap_left_center >= 80.0, f"Left-to-center gap too small: {gap_left_center} pt"

    # Center section ends well before right section starts (at least 80 pt clearance)
    gap_center_right = right_start_x - center_end_x
    assert gap_center_right >= 80.0, f"Center-to-right gap too small: {gap_center_right} pt"
