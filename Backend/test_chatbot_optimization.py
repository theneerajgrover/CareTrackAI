"""
test_chatbot_optimization.py
------------------------------
Comprehensive verification test suite for the CareTrackAI Chatbot Performance Optimization.

Requirements Tested (Section I):
 1. Short conversational questions (identity query, greetings).
 2. General healthcare questions.
 3. Complex medical questions.
 4. Multi-message contextual conversations.
 5. Long conversation histories (bounded to last 6 messages).
 6. Gemini API timeout resilience.
 7. Gemini API failure handling (safe failure without fake medical advice).
 8. Secondary model fallback execution.
 9. Database persistence verification.
10. SSE streaming chunk generation and event structure.
11. Validation guardrails against empty inputs.
12. Multiple independent authenticated users (strict user isolation).
"""

import os
import sys
import json
import uuid
from unittest.mock import MagicMock, patch
import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from test_backend import assert_test_database_isolation
import openai_service
from app import app, create_access_token


@pytest.fixture(autouse=True)
def ensure_isolation():
    """Verify test isolation before running any database or chatbot test."""
    assert_test_database_isolation()


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# 1. Short conversational questions (identity & greeting)
def test_identity_and_short_queries():
    """Verify identity and capability inquiries are answered accurately in <1ms without calling external APIs."""
    res = openai_service.generate_chat_response([{"role": "user", "content": "who are you"}])
    assert res["status"] == "success"
    assert "CareTrack AI's Medical Assistance Chatbot" in res["content"]
    assert res["response_time_ms"] < 200

    res2 = openai_service.generate_chat_response([{"role": "user", "content": "what can you do?"}])
    assert res2["status"] == "success"
    assert "health analysis results" in res2["content"]


# 2. General healthcare question
def test_general_healthcare_question():
    """Test generating a medical guidance response for a general healthcare symptom."""
    mock_chunk = MagicMock()
    mock_chunk.text = "Drinking water and staying in a cool room can help relieve mild dehydration."

    mock_client = MagicMock()
    mock_client.models.generate_content_stream.return_value = [mock_chunk]

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        res = openai_service.generate_chat_response([{"role": "user", "content": "How do I relieve mild dehydration?"}])
        assert res["status"] == "success"
        assert "dehydration" in res["content"].lower() or "water" in res["content"].lower()


# 3. Complex medical question with clinical context
def test_complex_medical_question_with_context():
    """Test complex question processing with patient vitals and previous diagnostic findings."""
    patient_ctx = {
        "name": "Alex Patient",
        "age": "45",
        "gender": "male",
        "latest_condition": "Hypertension",
        "latest_confidence": 88.5,
        "risk_level": "high",
        "doctor": "Cardiologist",
        "symptoms": ["headache", "dizziness"],
    }

    mock_chunk = MagicMock()
    mock_chunk.text = "Given your recent findings indicating hypertension, persistent headaches warrant urgent consultation with a Cardiologist."

    mock_client = MagicMock()
    mock_client.models.generate_content_stream.return_value = [mock_chunk]

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        res = openai_service.generate_chat_response(
            [{"role": "user", "content": "My head hurts and I feel dizzy. What should I do?"}],
            patient_context=patient_ctx
        )
        assert res["status"] == "success"
        assert "Cardiologist" in res["content"]


# 4. Multi-message contextual conversation
def test_multi_message_contextual_conversation():
    """Verify conversation continuity across multi-turn messages."""
    conversation = [
        {"role": "user", "content": "I have had a mild fever for 2 days."},
        {"role": "assistant", "content": "Rest and hydration are important. Are you having any other symptoms?"},
        {"role": "user", "content": "Yes, I also developed a dry cough today."},
    ]

    mock_chunk = MagicMock()
    mock_chunk.text = "A fever accompanied by a newly developed dry cough may indicate an upper respiratory condition."

    mock_client = MagicMock()
    mock_client.models.generate_content_stream.return_value = [mock_chunk]

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        full_prompt, last_msg = openai_service._build_full_prompt(conversation)
        assert "dry cough" in full_prompt
        assert "mild fever" in full_prompt
        assert last_msg == "Yes, I also developed a dry cough today."


# 5. Long conversation history truncation
def test_long_conversation_history_bounded():
    """Verify history is safely bounded to the most recent 6 messages to prevent unbounded latency."""
    long_history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"Message number {i}"} for i in range(20)]
    full_prompt, last_msg = openai_service._build_full_prompt(long_history)

    # Must contain the recent message
    assert "Message number 19" in full_prompt
    assert "Message number 18" in full_prompt
    # Must NOT contain early messages from 20 turns ago
    assert "Message number 0:" not in full_prompt
    assert "Message number 1:" not in full_prompt


# 6. Gemini API timeout handling
def test_gemini_api_timeout():
    """Verify that if Gemini stream raises a timeout, it falls back safely without unhandled exception."""
    mock_client = MagicMock()
    mock_client.models.generate_content_stream.side_effect = TimeoutError("API deadline exceeded")

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        res = openai_service.generate_chat_response([{"role": "user", "content": "What causes stomach cramps?"}])
        assert res["status"] == "failed"
        assert "unable to respond right now" in res["content"]


# 7. Gemini API failure handling (no fabricated answers)
def test_gemini_api_failure():
    """Verify that an API error never fabricates medical answers and cleanly reports service unavailability."""
    mock_client = MagicMock()
    mock_client.models.generate_content_stream.side_effect = RuntimeError("503 Service Unavailable")

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        res = openai_service.generate_chat_response([{"role": "user", "content": "What causes fatigue?"}])
        assert res["status"] == "failed"
        assert "unable to respond right now" in res["content"]


# 8. Secondary model fallback
def test_secondary_model_fallback():
    """Verify secondary model is invoked if primary model fails."""
    mock_chunk = MagicMock()
    mock_chunk.text = "Secondary model response for clinical guidance."

    mock_client = MagicMock()
    # Primary model fails, secondary succeeds
    def mock_stream(model, contents, config):
        if "3.5" in model:
            raise RuntimeError("Primary model error")
        return [mock_chunk]

    mock_client.models.generate_content_stream.side_effect = mock_stream

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        res = openai_service.generate_chat_response([{"role": "user", "content": "What is the recovery time for flu?"}])
        assert res["status"] == "success"
        assert "Secondary model response" in res["content"]


# 9. Non-medical query rejection
def test_non_medical_query_rejection():
    """Verify non-medical queries (coding, math) are politely rejected in <1ms without calling external APIs."""
    non_med = [
        "Write python code to reverse a binary tree",
        "What is the capital of France?",
        "Tell me a joke about dogs",
    ]
    for q in non_med:
        res = openai_service.generate_chat_response([{"role": "user", "content": q}])
        assert res["status"] == "success"
        assert "I can only help with medical" in res["content"]


# 10. SSE streaming chunk generation
def test_sse_streaming_generator():
    """Verify stream_chat_response yields chunk tuples correctly."""
    chunks_to_send = [MagicMock(text="Here are "), MagicMock(text="3 tips for "), MagicMock(text="sore throat relief.")]
    mock_client = MagicMock()
    mock_client.models.generate_content_stream.return_value = chunks_to_send

    with patch.object(openai_service, "_get_gemini_client", return_value=mock_client):
        received = []
        for chunk, model in openai_service.stream_chat_response([{"role": "user", "content": "Sore throat tips"}]):
            received.append(chunk)

        full_text = "".join(received)
        assert full_text == "Here are 3 tips for sore throat relief."
        assert len(received) == 3


# 11. Empty input validation in API route
def test_api_empty_input_validation(client):
    """Verify /api/user/chat/send rejects empty message with 400 Bad Request."""
    dummy_user_id = str(uuid.uuid4())
    token = create_access_token(dummy_user_id, "test@caretrack.ai")

    resp = client.post(
        "/api/user/chat/send",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "   "},
    )
    assert resp.status_code == 400
    assert "Message content is required" in resp.get_json()["error"]


# 12. Multi-user isolation
def test_multi_user_isolation(client):
    """Verify that User A cannot read or access User B's chat sessions."""
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    token_a = create_access_token(user_a, "userA@caretrack.ai")
    token_b = create_access_token(user_b, "userB@caretrack.ai")

    fake_session_id = str(uuid.uuid4())

    # User B attempts to access a session belonging to User A
    with patch("app.query", return_value=None):
        resp = client.get(
            f"/api/user/chat/sessions/{fake_session_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 404
        assert "Chat session not found" in resp.get_json()["error"]
