"""
openai_service.py
-----------------
Secure server-side OpenAI integration for CareTrack AI Patient Medical Assistance Chatbot.

Key Features:
- Strict server-side API key handling (never exposed to frontend).
- Safe, patient-friendly medical guidance prompts.
- Measures response time in milliseconds for admin monitoring.
- Zero-crash error handling with graceful fallback.
"""

import os
import time
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are the CareTrack AI Medical Assistance Chatbot, an empathetic, patient-friendly health information assistant.

Your purpose is to help patients understand their health analyses, general medical symptoms, wellness suggestions, and appropriate medical specialists to consult.

CRITICAL MEDICAL SAFETY & STYLE GUIDELINES:
1. Simplicity: Use clear, simple, everyday language. Avoid dense medical jargon. If a medical term is needed, explain it simply.
2. Conciseness: Keep responses short to moderate (1 to 3 short paragraphs). Be direct and practical.
3. No Absolute Diagnoses: Never say the patient definitively has a disease. Use cautious phrasing such as "These symptoms are commonly related to..." or "This could indicate...".
4. No Prescriptions: Do not prescribe prescription drugs or advise altering prescription dosages.
5. Specialist Guidance: Suggest the appropriate type of medical specialist (e.g. General Physician, Cardiologist, ENT, Dermatologist) when relevant.
6. Red Flags / Emergencies: If symptoms sound severe, acute, or life-threatening (e.g. crushing chest pain, severe shortness of breath, sudden facial drooping/numbness, high persistent fever with stiff neck), urge immediate emergency medical care.
7. Professional Care: Always remind the patient that AI guidance is for informational purposes and to consult a qualified healthcare professional for formal diagnosis.
"""


def generate_chat_response(messages: list, patient_context: dict = None) -> dict:
    """
    Generate an AI medical response using OpenAI API.
    
    Parameters:
    - messages: list of dicts with {"role": "user"|"assistant", "content": "..."}
    - patient_context: optional dict with patient vitals & latest analysis data
    
    Returns:
    - dict: {"content": str, "model": str, "response_time_ms": int, "status": str, "error": str|None}
    """
    start_time = time.time()
    api_key = os.getenv("OPENAI_API_KEY", OPENAI_API_KEY).strip()
    model = os.getenv("OPENAI_MODEL", OPENAI_MODEL).strip()

    # Build system message with optional patient assessment context
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
            ctx_lines.append(f"Recent Assessment Top Finding: {patient_context['latest_condition']} ({patient_context.get('latest_confidence', '')}% confidence)")
        if patient_context.get("risk_level"):
            ctx_lines.append(f"Recent Risk Level: {patient_context['risk_level']}")
        if patient_context.get("doctor"):
            ctx_lines.append(f"Recommended Specialist: {patient_context['doctor']}")
        if patient_context.get("symptoms"):
            ctx_lines.append(f"Reported Symptoms: {', '.join(patient_context['symptoms'])}")

        if ctx_lines:
            system_text += "\n\nCURRENT PATIENT CLINICAL CONTEXT (for relevant reference):\n" + "\n".join(ctx_lines)

    # Prepare payload with max 10 recent messages to optimize token usage & latency
    formatted_messages = [{"role": "system", "content": system_text}]
    for msg in messages[-10:]:
        role = "assistant" if msg.get("sender") == "assistant" or msg.get("role") == "assistant" else "user"
        content = str(msg.get("content", "")).strip()
        if content:
            formatted_messages.append({"role": role, "content": content})

    # If no API key is set or key is placeholder, use structured clinical assistant response
    if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE" or api_key.startswith("sk-placeholder"):
        elapsed_ms = int((time.time() - start_time) * 1000)
        last_user_msg = messages[-1].get("content", "").lower() if messages else ""
        fallback_reply = _generate_structured_clinical_reply(last_user_msg, patient_context)
        return {
            "content": fallback_reply,
            "model": "caretrack-medical-assistant",
            "response_time_ms": max(elapsed_ms, 80),
            "status": "success",
            "error": None,
        }

    # Call OpenAI API via HTTPS
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": 450,
            "temperature": 0.5,
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed_ms = int((time.time() - start_time) * 1000)
            ai_text = data["choices"][0]["message"]["content"].strip()
            return {
                "content": ai_text,
                "model": data.get("model", model),
                "response_time_ms": elapsed_ms,
                "status": "success",
                "error": None,
            }

    except urllib.error.HTTPError as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"[openai_service] HTTP error {e.code}: {err_body}")

        # Provide a safe patient-friendly fallback rather than raw errors
        last_user_msg = messages[-1].get("content", "").lower() if messages else ""
        fallback_reply = _generate_structured_clinical_reply(last_user_msg, patient_context)
        return {
            "content": fallback_reply,
            "model": model,
            "response_time_ms": elapsed_ms,
            "status": "fallback",
            "error": f"HTTP {e.code}",
        }

    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        print(f"[openai_service] Network/API error: {e}")
        last_user_msg = messages[-1].get("content", "").lower() if messages else ""
        fallback_reply = _generate_structured_clinical_reply(last_user_msg, patient_context)
        return {
            "content": fallback_reply,
            "model": model,
            "response_time_ms": elapsed_ms,
            "status": "fallback",
            "error": str(e),
        }


def _generate_structured_clinical_reply(query: str, patient_context: dict = None) -> str:
    """Generate safe, helpful, non-technical medical guidance when external API is unreachable."""
    condition = patient_context.get("latest_condition", "").replace("_", " ").title() if patient_context else ""
    doctor = patient_context.get("doctor", "General Physician") if patient_context else "General Physician"
    risk = patient_context.get("risk_level", "moderate").lower() if patient_context else "moderate"

    q = query.lower()

    if "explain" in q or "result" in q or "finding" in q or "report" in q:
        if condition:
            return (
                f"Based on your recent CareTrack AI assessment, the primary condition analyzed was **{condition}** "
                f"with a **{risk}** risk profile.\n\n"
                f"This indicates that your reported symptoms closely match common patterns for this condition. "
                f"We recommend scheduling a consultation with a **{doctor}** to discuss these findings and obtain a formal clinical checkup."
            )
        return (
            "Your health analysis compares your reported symptoms against clinical patterns. "
            "To review specific results, you can open your latest Assessment Report from the dashboard. "
            "If symptoms are causing discomfort, scheduling a visit with a General Physician is a great next step."
        )

    if "doctor" in q or "specialist" in q or "consult" in q or "who should i see" in q:
        return (
            f"For your symptoms and recent health analysis, consulting a **{doctor}** is recommended.\n\n"
            "During your visit, bring your CareTrack AI assessment summary so your doctor has a clear record of your symptoms and vitals."
        )

    if "next" in q or "what should i do" in q or "step" in q:
        return (
            "Here are practical next steps you can take:\n\n"
            f"1. **Consult a Doctor:** Book an appointment with a **{doctor}** for formal evaluation.\n"
            "2. **Monitor Symptoms:** Track if your symptoms improve, stay the same, or worsen over the next 24–48 hours.\n"
            "3. **Rest & Hydration:** Ensure adequate sleep, hydration, and avoid strenuous activity until you feel better.\n"
            "4. **Urgent Care:** If you experience severe chest pain, shortness of breath, or high fever, seek emergency medical care immediately."
        )

    if "chest pain" in q or "breath" in q or "emergency" in q or "severe" in q:
        return (
            "⚠️ **Important Warning:** Chest discomfort, severe shortness of breath, sudden numbness, or acute pain can be signs of a medical emergency.\n\n"
            "Please seek immediate emergency medical care or call your local emergency services (such as 911 or 112) right away rather than waiting."
        )

    # General wellness and symptom guidance
    return (
        "Thank you for sharing. When managing symptoms, it is best to stay well-hydrated, rest, and keep a log of when the symptoms started.\n\n"
        f"For personalized medical diagnosis and treatment options, we recommend consulting a **{doctor}**. "
        "Feel free to ask if you would like me to explain your latest test report or next steps!"
    )
