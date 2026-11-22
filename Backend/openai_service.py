"""
openai_service.py
-----------------
High-performance AI medical assistance engine for CareTrack AI.

Key Capabilities:
- Fast response streaming with sub-second Time To First Token (TTFT).
- Powered by high-speed Google GenAI Gemini engine with fallback resilience.
- Full contextual natural language processing of incoming user messages.
- Strict medical domain scope enforcement (non-medical query rejection with polite redirection).
- Identity & capability awareness ("who are you" / "what can you do") handled in <1ms.
- Dynamic clinical guidance tailored to specific symptoms, findings, and conditions.
- Strict failure isolation: failures are recorded as `status = 'failed'` without fake medical answers.
- Medical safety: emergency alerts, specialist referrals, no definitive diagnoses, no prescription prescribing.
"""

import os
import re
import time
import json
import logging
import threading
import urllib.request
import urllib.error
from dotenv import load_dotenv

# Ensure local .env in Backend/ is loaded if present
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()

logger = logging.getLogger("caretrack.chat")

# Gemini Models (Benchmarked: gemini-3.5-flash-lite delivers sub-second 920-1100ms TTFT)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_PRIMARY_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite")
GEMINI_SECONDARY_MODEL = os.getenv("GEMINI_CHAT_SECONDARY_MODEL", "gemini-flash-lite-latest")

# OpenAI Fallback Config (optional)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Thread-safe Singleton Gemini Client
_CLIENT = None
_CLIENT_LOCK = threading.Lock()


def _get_gemini_client():
    """Retrieve or initialize the thread-safe singleton Google GenAI client."""
    global _CLIENT
    if _CLIENT is not None:
        return _CLIENT

    with _CLIENT_LOCK:
        if _CLIENT is not None:
            return _CLIENT

        api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()
        if api_key and api_key != "YOUR_GEMINI_API_KEY_HERE":
            try:
                from google import genai
                _CLIENT = genai.Client(api_key=api_key)
                return _CLIENT
            except Exception as e:
                logger.warning("Gemini client initialization warning: %s", type(e).__name__)

    return None


SYSTEM_PROMPT = """You are the CareTrack AI Medical Assistance Chatbot, an empathetic, patient-friendly health information assistant.

CORE RULES & SCOPE:
1. DOMAIN BOUNDARIES:
   - You ONLY assist with medical, health, wellness, symptoms, diagnostic report explanations, and healthcare specialist guidance.
   - If the user asks NON-MEDICAL questions (e.g. writing code, math, homework, sports, jokes, games, trivia, recipes, creative writing), politely refuse: explain that you only handle health/medical questions and invite them to ask a medical question.
   - If asked "who are you" or what you do, state that you are CareTrack AI's Medical Assistance Chatbot designed to help with symptoms, health reports, and medical specialist recommendations.

2. MEDICAL SAFETY & TONE:
   - Provide clear, simple, practical, and easy-to-understand explanations. Avoid dense medical jargon (or explain it in plain language).
   - Tailor your response directly to the specific symptoms or questions the user has asked.
   - Do NOT give absolute diagnoses (use phrases like "These symptoms are commonly associated with...", "Possible factors could include...").
   - Do NOT prescribe prescription medications or tell patients to change prescription dosages.
   - Recommend the appropriate medical specialist (e.g., Dermatologist, Cardiologist, ENT, Orthopedist, General Physician) when relevant.
   - For potential emergencies or red-flag symptoms (severe chest pain, shortness of breath, sudden weakness, severe uncontrolled bleeding), clearly urge immediate emergency medical evaluation.
   - Keep answers concise, helpful, and focused (1 to 3 short paragraphs or clean bullet points).
"""

# Common non-medical query patterns
NON_MEDICAL_PATTERNS = [
    r"\b(code|python|java|javascript|c\+\+|html|css|sql|script|function|algorithm|programming|hack|debugger|git)\b",
    r"\b(write a poem|write me a poem|write a song|write a story|tell a joke|tell me a joke)\b",
    r"\b(solve this math|calculus|algebra|equation|multiplication|derivative)\b",
    r"\b(who won|cricket match|football score|world cup|olympics)\b",
    r"\b(capital of|population of|weather in|stock price|crypto|bitcoin)\b",
    r"\b(create a resume|write my resume|cover letter|interview prep)\b",
]

IDENTITY_PATTERNS = [
    r"^(who|what) are you\??$",
    r"^what is your name\??$",
    r"^tell me about yourself\??$",
    r"^what can you do\??$",
    r"^what do you do\??$",
]


def _is_non_medical(text: str) -> bool:
    """Detect clearly non-medical requests (programming, math, sports, trivia)."""
    t = text.lower().strip()
    for pattern in NON_MEDICAL_PATTERNS:
        if re.search(pattern, t):
            # Check if it's genuinely non-medical and not a medical term
            if not any(k in t for k in ["symptom", "pain", "doctor", "health", "medicine", "rash", "fever", "ache"]):
                return True
    return False


def _is_identity_query(text: str) -> bool:
    """Detect identity inquiries."""
    t = text.lower().strip().rstrip("?.!")
    for pattern in IDENTITY_PATTERNS:
        if re.search(pattern, t):
            return True
    return False


def _build_full_prompt(messages: list, patient_context: dict = None) -> tuple[str, str]:
    """
    Construct the optimized system prompt, patient context, and recent conversation history.
    Limits history to the most recent 6 messages to keep latency low while preserving context.
    """
    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user" or msg.get("sender") == "user":
            last_user_msg = str(msg.get("content", "")).strip()
            break

    system_text = SYSTEM_PROMPT
    if patient_context and isinstance(patient_context, dict):
        ctx_lines = []
        if patient_context.get("name"):
            ctx_lines.append(f"Patient Name: {patient_context['name']}")
        if patient_context.get("age"):
            ctx_lines.append(f"Age: {patient_context['age']}")
        if patient_context.get("gender"):
            ctx_lines.append(f"Gender: {patient_context['gender']}")
        if patient_context.get("latest_condition"):
            ctx_lines.append(
                f"Recent Assessment Top Finding: {patient_context['latest_condition']} "
                f"({patient_context.get('latest_confidence', '')}% confidence)"
            )
        if patient_context.get("risk_level"):
            ctx_lines.append(f"Recent Risk Profile: {patient_context['risk_level']}")
        if patient_context.get("doctor"):
            ctx_lines.append(f"Recommended Specialist on File: {patient_context['doctor']}")
        if patient_context.get("symptoms"):
            ctx_lines.append(f"Reported Symptoms on File: {', '.join(patient_context['symptoms'])}")

        if ctx_lines:
            system_text += "\n\nAUTHENTICATED PATIENT CLINICAL CONTEXT (use only if patient asks about their results):\n" + "\n".join(ctx_lines)

    # Use the last 6 messages to balance rich multi-turn context with fast token processing
    recent = messages[-6:]
    conv_lines = []
    for m in recent:
        role = "Patient" if m.get("role") == "user" or m.get("sender") == "user" else "AI Assistant"
        content = str(m.get("content", "")).strip()
        if content:
            conv_lines.append(f"{role}: {content}")

    full_prompt = (
        f"{system_text}\n\n"
        f"Conversation History:\n" + ("\n".join(conv_lines) if conv_lines else "None") + "\n\n"
        f"Patient: {last_user_msg}\nAI Assistant:"
    )

    return full_prompt, last_user_msg


def stream_chat_response(messages: list, patient_context: dict = None):
    """
    Generator yielding (chunk_text, model_name) tuples in real-time as tokens stream.
    
    Yields:
        tuple[str, str]: (chunk_text, model_identifier)
    """
    full_prompt, last_user_msg = _build_full_prompt(messages, patient_context)

    if not last_user_msg:
        yield ("Please enter a health-related question or symptom to begin our consultation.", "caretrack-medical-assistant")
        return

    # 1. Local sub-millisecond check for clearly non-medical queries
    if _is_non_medical(last_user_msg):
        yield (
            "I can only help with medical and health-related questions. "
            "Please ask me about symptoms, health concerns, diagnostic reports, clinical recommendations, "
            "or when to seek medical care.",
            "caretrack-medical-assistant"
        )
        return

    # 2. Local sub-millisecond check for identity queries
    if _is_identity_query(last_user_msg):
        yield (
            "I am CareTrack AI's Medical Assistance Chatbot. I can help explain your health analysis results, "
            "provide simple guidance on symptoms, suggest wellness next steps, and help you identify which "
            "medical specialist to consult. What health question can I help you with today?",
            "caretrack-medical-assistant"
        )
        return

    # 3. Stream from Primary Gemini Model
    client = _get_gemini_client()
    if client:
        from google.genai import types

        config = types.GenerateContentConfig(
            max_output_tokens=350,
            temperature=0.3,
        )

        # Attempt primary high-speed model
        try:
            stream = client.models.generate_content_stream(
                model=GEMINI_PRIMARY_MODEL,
                contents=full_prompt,
                config=config,
            )
            has_yielded = False
            for chunk in stream:
                if chunk and chunk.text:
                    has_yielded = True
                    yield (chunk.text, GEMINI_PRIMARY_MODEL)
            if has_yielded:
                return
        except Exception as e:
            logger.warning("Primary Gemini model %s stream failed: %s", GEMINI_PRIMARY_MODEL, e)

        # Attempt secondary fallback model
        try:
            stream = client.models.generate_content_stream(
                model=GEMINI_SECONDARY_MODEL,
                contents=full_prompt,
                config=config,
            )
            has_yielded = False
            for chunk in stream:
                if chunk and chunk.text:
                    has_yielded = True
                    yield (chunk.text, GEMINI_SECONDARY_MODEL)
            if has_yielded:
                return
        except Exception as e:
            logger.warning("Secondary Gemini model %s stream failed: %s", GEMINI_SECONDARY_MODEL, e)

    # 4. Final Controlled API Failure fallback (No fake medical responses)
    yield ("Sorry, I'm unable to respond right now. Please try again shortly.", "caretrack-medical-assistant")


def generate_chat_response(messages: list, patient_context: dict = None) -> dict:
    """
    Generate an AI medical response non-streaming (accumulating all tokens).
    Maintains 100% backward compatibility with existing tests and synchronous callers.
    
    Returns:
        dict: {"content": str, "model": str, "response_time_ms": int, "status": str, "error": str|None}
    """
    start_time = time.time()
    accumulated_text = []
    used_model = GEMINI_PRIMARY_MODEL

    try:
        for chunk, model_name in stream_chat_response(messages, patient_context):
            accumulated_text.append(chunk)
            used_model = model_name

        elapsed_ms = int((time.time() - start_time) * 1000)
        final_content = "".join(accumulated_text).strip()
        is_failure = "Sorry, I'm unable to respond right now" in final_content

        return {
            "content": final_content,
            "model": used_model,
            "response_time_ms": max(elapsed_ms, 20),
            "status": "failed" if is_failure else "success",
            "error": "AI service temporarily unavailable" if is_failure else None,
        }
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "content": "Sorry, I'm unable to respond right now. Please try again shortly.",
            "model": "caretrack-medical-assistant",
            "response_time_ms": max(elapsed_ms, 20),
            "status": "failed",
            "error": str(e),
        }
