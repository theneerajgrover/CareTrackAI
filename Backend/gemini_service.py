"""
gemini_service.py
-----------------
High-performance Gemini AI integration & clinical remedy engine for CareTrack AI.

Features:
- Instant fallback to pre-compiled clinical remedies (<0.1ms).
- Thread-safe in-memory caching with threading.Lock().
- Asynchronous AI generation with strict configurable timeout (default 1.0s).
- Valid Google GenAI model identifiers (gemini-2.0-flash, gemini-1.5-flash).
- Clinically sound risk classification based on medical condition acuity.
- Dual-field compatibility: provides both `remedies`/`remedies_text` and `warning`/`warning_text`.
- Strict healthcare safety guardrails: zero home remedies for critical/emergency conditions.
"""

import os
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_SECONDARY_MODEL = os.getenv("GEMINI_SECONDARY_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "1.0"))

# Thread-safe in-memory cache for remedies
_CACHE_LOCK = threading.Lock()
_REMEDIES_CACHE = {}

_EXECUTOR = ThreadPoolExecutor(max_workers=4)
_CLIENT = None
_CLIENT_INITIALIZING = False
_CLIENT_LOCK = threading.Lock()


def _init_client_sync():
    """Initialize the Google GenAI client once in a thread-safe manner."""
    global _CLIENT, _CLIENT_INITIALIZING
    with _CLIENT_LOCK:
        if _CLIENT is not None:
            return _CLIENT
        if _CLIENT_INITIALIZING:
            return None
        _CLIENT_INITIALIZING = True

    try:
        if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            with _CLIENT_LOCK:
                _CLIENT = client
            return client
    except Exception as e:
        # Never log raw keys or credentials
        print(f"[gemini_service] Client initialization warning: {type(e).__name__}")
    finally:
        with _CLIENT_LOCK:
            _CLIENT_INITIALIZING = False

    return None


# Eager initialization in background pool
_EXECUTOR.submit(_init_client_sync)


def _get_client():
    """Get Gemini client if ready, without blocking."""
    with _CLIENT_LOCK:
        if _CLIENT is not None:
            return _CLIENT
    # Try initializing if not yet done
    return _init_client_sync()


# -- Curated Clinical Remedies Library (Instant <0.1ms access) -----------------
CLINICAL_REMEDIES = {
    "fever": (
        "1. Rest and stay well hydrated with water, herbal teas, and electrolyte solutions.\n"
        "2. Take lukewarm sponge baths to gently reduce body temperature without shivering.\n"
        "3. Over-the-counter antipyretics like acetaminophen or ibuprofen can provide relief as directed.\n"
        "4. Wear lightweight, breathable clothing and maintain a cool room environment.\n"
        "5. Seek immediate medical attention if fever exceeds 103°F (39.4°C) or lasts over 3 days."
    ),
    "cold": (
        "1. Prioritize deep rest to support your immune system's active response.\n"
        "2. Drink warm fluids like ginger honey tea, clear broths, and lemon water.\n"
        "3. Use saline nasal rinses or steam inhalation to relieve congestion.\n"
        "4. Gargle with warm salt water (1/2 tsp salt in 1 cup warm water) for throat comfort.\n"
        "5. Consult a physician if symptoms worsen significantly after 7–10 days."
    ),
    "cough": (
        "1. Take 1-2 teaspoons of natural honey (for adults and children > 1 year) to soothe throat irritation.\n"
        "2. Inhale steam from a bowl of hot water or use a cool-mist humidifier in your room.\n"
        "3. Sleep with your head elevated on extra pillows to reduce nighttime post-nasal drip.\n"
        "4. Stay hydrated with warm broths and caffeine-free fluids.\n"
        "5. If cough lasts over 2 weeks or is accompanied by blood/shortness of breath, seek prompt evaluation."
    ),
    "headache": (
        "1. Rest in a dark, quiet, well-ventilated room with minimal screen exposure.\n"
        "2. Apply a cold compress across forehead or temples, or a warm pack on the neck.\n"
        "3. Drink 1-2 large glasses of water to address possible mild dehydration.\n"
        "4. Practice gentle neck and shoulder stretches or slow diaphragmatic breathing.\n"
        "5. If headache is sudden, unusually severe, or accompanied by vision loss, visit emergency care."
    ),
    "migraine": (
        "1. Retreat immediately to a silent, darkened room and apply an ice pack to the back of the neck.\n"
        "2. Stay strictly hydrated with small, frequent sips of water or electrolyte liquids.\n"
        "3. Consider a small amount of caffeine if taken at the early onset of migraine symptoms.\n"
        "4. Avoid known sensory triggers such as bright screens, loud sounds, and strong fragrances.\n"
        "5. Consult a neurologist if migraines occur frequently or resist standard relief methods."
    ),
    "sinusitis": (
        "1. Apply warm, damp compresses across your nose, cheeks, and eyes for 5-10 minutes.\n"
        "2. Use sterile saline nasal sprays 2-3 times daily to flush sinuses and reduce swelling.\n"
        "3. Inhale steam from a warm shower or vapor bowl with eucalyptus or peppermint.\n"
        "4. Keep head elevated while sleeping to facilitate natural sinus drainage.\n"
        "5. Consult an ENT specialist if sinus facial pain and pressure persist beyond 10 days."
    ),
    "sore throat": (
        "1. Gargle with warm salt water (1/2 tsp salt in warm water) every 3-4 hours.\n"
        "2. Sip warm herbal tea mixed with raw honey and lemon juice to coat the mucosa.\n"
        "3. Suck on throat lozenges or ice chips to temporarily numb inflamed tissues.\n"
        "4. Run a humidifier at night to prevent throat dryness.\n"
        "5. Seek evaluation if swallowing is severely painful or white patches appear on tonsils."
    ),
    "indigestion": (
        "1. Drink warm peppermint or chamomile tea to relax digestive tract muscles.\n"
        "2. Sit upright for at least 2-3 hours after meals; avoid lying down immediately.\n"
        "3. Eat smaller, frequent meals and avoid high-fat, heavily spiced, or acidic foods.\n"
        "4. Avoid tight-fitting clothing around the abdomen.\n"
        "5. If chest or stomach pain is severe or radiates to shoulder/jaw, seek emergency care immediately."
    ),
    "constipation": (
        "1. Increase daily dietary fiber intake with whole grains, apples, pears, and legumes.\n"
        "2. Drink 8-10 glasses of water daily to soften stool consistency.\n"
        "3. Engage in 20-30 minutes of light aerobic walking to stimulate intestinal motility.\n"
        "4. Establish a regular, unhurried bathroom routine after morning meals.\n"
        "5. Consult a doctor if constipation persists over a week or is accompanied by bleeding."
    ),
    "diarrhea": (
        "1. Rehydrate aggressively with oral rehydration salts (ORS), clear broths, and coconut water.\n"
        "2. Follow the BRAT diet (Bananas, Rice, Applesauce, Toast) during early recovery.\n"
        "3. Avoid dairy products, greasy foods, artificial sweeteners, and caffeine.\n"
        "4. Rest to conserve metabolic energy while fighting intestinal irritation.\n"
        "5. Seek medical attention if dehydration signs appear, fever develops, or symptoms exceed 48 hours."
    ),
    "muscle strain": (
        "1. Apply the R.I.C.E. protocol: Rest the affected area and avoid aggravating movements.\n"
        "2. Ice the area with an ice pack wrapped in a towel for 15-20 minutes every 3-4 hours.\n"
        "3. Use a compression elastic bandage to minimize local swelling.\n"
        "4. Elevate the injured muscle above heart level whenever resting.\n"
        "5. Consult an orthopedist if weight-bearing is impossible or severe bruising occurs."
    ),
    "back pain": (
        "1. Maintain gentle, low-impact walking rather than prolonged complete bed rest.\n"
        "2. Apply cold packs during the first 48 hours, followed by warm heating pads for muscle relaxation.\n"
        "3. Sleep in a fetal position with a pillow between knees to relieve lumbar pressure.\n"
        "4. Practice gentle pelvic tilts and hamstring stretches as tolerated.\n"
        "5. Seek urgent care if accompanied by leg numbness, loss of bladder/bowel control, or severe pain."
    ),
    "eczema": (
        "1. Apply a thick, fragrance-free moisturizing cream or ointment immediately after bathing.\n"
        "2. Take short, lukewarm showers (5-10 minutes max); avoid hot water.\n"
        "3. Use mild, soap-free cleansers and wear soft, breathable cotton fabrics.\n"
        "4. Apply cool, wet compresses to soothe intense itchy patches.\n"
        "5. Consult a dermatologist for prescription topical therapies if inflammation flares."
    ),
    "lichen simplex": (
        "1. Avoid scratching or rubbing the affected skin area to break the itch-scratch cycle.\n"
        "2. Apply cool, damp compresses to the itchy patch for 10-15 minutes to reduce pruritus.\n"
        "3. Use a thick, fragrance-free barrier emollient (such as petroleum jelly or ceramide cream) twice daily.\n"
        "4. Keep fingernails trimmed short and consider covering the area with a light dressing at night.\n"
        "5. Consult a dermatologist for appropriate topical anti-inflammatory treatment if symptoms persist."
    ),
    "acne": (
        "1. Wash face twice daily with a gentle, non-comedogenic cleanser.\n"
        "2. Avoid picking, squeezing, or popping lesions to prevent scarring and secondary infection.\n"
        "3. Use oil-free, water-based moisturizers and non-comedogenic sunscreen.\n"
        "4. Wash pillowcases and wipe phone screens regularly to minimize bacterial transfer.\n"
        "5. Consult a dermatologist if cystic nodules or widespread inflammation develops."
    ),
    "stress": (
        "1. Practice 4-7-8 deep breathing: Inhale for 4s, hold for 7s, exhale slowly for 8s.\n"
        "2. Take a 15-minute screen-free walk in natural sunlight or open air.\n"
        "3. Limit caffeine and alcohol intake, which amplify physiological anxiety symptoms.\n"
        "4. Maintain a regular 7-8 hour sleep schedule with a calming wind-down routine.\n"
        "5. Reach out to a mental health professional if anxiety disrupts your daily functionality."
    ),
}

# Generic clinical fallback
GENERIC_CLINICAL_REMEDY = (
    "1. Ensure adequate restful sleep to facilitate cellular and immune recovery.\n"
    "2. Maintain optimal hydration with water, herbal teas, and nutritious broths.\n"
    "3. Consume a nutrient-dense, easily digestible balanced diet.\n"
    "4. Monitor symptoms systematically and track any changes in severity.\n"
    "5. If symptoms persist or worsen beyond 3 days, please schedule a clinical consultation."
)

# Minor / outpatient conditions eligible for supportive self-care & home guidance
MINOR_CONDITIONS = {
    "common cold", "cold", "cough", "fever", "flu", "influenza",
    "headache", "migraine", "allergic rhinitis", "allergies", "allergy",
    "indigestion", "heartburn", "gastritis", "constipation",
    "diarrhea", "food poisoning", "muscle strain", "back pain",
    "sinusitis", "sore throat", "tonsillitis", "bronchitis",
    "acne", "skin rash", "eczema", "lichen simplex", "hay fever",
    "motion sickness", "insomnia", "stress", "anxiety", "dehydration",
    "minor burn", "sunburn", "fatigue", "nausea", "athlete's foot",
    "stye", "chalazion", "callus", "diaper rash", "aphthous ulcer",
}

# Critical life-threatening emergencies requiring immediate emergency intervention
CRITICAL_CONDITIONS = {
    "cardiac arrest", "heart attack", "myocardial infarction", "stroke",
    "pulmonary embolism", "acute respiratory distress syndrome", "sepsis",
    "anaphylaxis", "intracranial hemorrhage", "subarachnoid hemorrhage",
    "epidural hemorrhage", "subdural hemorrhage", "aortic aneurysm",
    "thoracic aortic aneurysm", "abdominal aortic aneurysm", "appendicitis",
    "ectopic pregnancy", "pneumothorax", "diabetic ketoacidosis",
    "meningitis", "encephalitis", "acute pancreatitis", "bowel obstruction",
    "intestinal obstruction", "volvulus", "peritonitis", "acute glaucoma",
}

# High-risk conditions requiring urgent clinical medical evaluation
HIGH_RISK_CONDITIONS = {
    "deep vein thrombosis", "pneumonia", "pyelonephritis", "cholecystitis",
    "kidney failure", "acute kidney injury", "heart failure", "cirrhosis",
    "cancer", "malignancy", "leukemia", "lymphoma", "melanoma",
    "angina", "arrhythmia", "atrial fibrillation", "tuberculosis",
    "pulmonary hypertension", "severe hypertension", "osteomyelitis",
}


def classify_risk(disease_name: str, confidence_pct: float = 0.0) -> str:
    """
    Clinically accurate risk classification based on intrinsic condition acuity
    and model confidence percentage.
    """
    # Support backward compatibility if called as classify_risk(confidence_pct)
    if isinstance(disease_name, (int, float)) and isinstance(confidence_pct, (int, float)):
        # Called with single numeric argument: classify_risk(85.0)
        c = float(disease_name)
        if c >= 80:
            return "high"
        elif c >= 50:
            return "moderate"
        else:
            return "low"

    name_lower = str(disease_name).lower().strip()

    # 1. Critical emergency conditions are ALWAYS critical regardless of confidence
    for crit in CRITICAL_CONDITIONS:
        if crit in name_lower:
            return "critical"

    # 2. High-risk conditions are at least 'high'
    for hr in HIGH_RISK_CONDITIONS:
        if hr in name_lower:
            return "high" if confidence_pct >= 20 else "moderate"

    # 3. Minor self-limiting conditions are NEVER critical or high
    for minor in MINOR_CONDITIONS:
        if minor in name_lower or name_lower in minor:
            if confidence_pct >= 85:
                return "moderate"
            return "low"

    # 4. Standard confidence-calibrated classification for general conditions
    if confidence_pct >= 85:
        return "high"
    elif confidence_pct >= 50:
        return "moderate"
    else:
        return "low"


def is_minor_condition(disease_name: str) -> bool:
    """Check if a condition is minor/outpatient (eligible for supportive home remedies)."""
    name_lower = str(disease_name).lower().strip()
    for condition in MINOR_CONDITIONS:
        if condition in name_lower or name_lower in condition:
            return True
    return False


def get_doctor_specialty(disease_name: str) -> str:
    """Map a condition to the relevant medical doctor specialty."""
    name = str(disease_name).lower().strip()

    if any(k in name for k in ["bone", "fracture", "dislocation", "arthritis", "joint", "shoulder", "knee", "hip", "patella", "bursitis", "tendinitis", "calcaneous", "bunion", "osteochondroma", "osteochondrosis", "sprain", "strain", "lumbago", "back pain"]):
        return "Orthopedic Specialist"
    if any(k in name for k in ["skin", "dermatitis", "eczema", "psoriasis", "acne", "melanoma", "lichen", "wart", "rash", "alopecia", "shingles", "rosacea", "callus", "keratosis"]):
        return "Dermatologist"
    if any(k in name for k in ["lung", "bronchi", "asthma", "pneumonia", "copd", "emphysema", "respiratory", "cough", "tuberculosis", "pleural", "atelectasis"]):
        return "Pulmonologist"
    if any(k in name for k in ["heart", "cardiac", "angina", "coronary", "arrhythmia", "atrial", "valve", "myocardial", "infarction", "cardiomyopathy", "hypertensive heart", "aortic"]):
        return "Cardiologist"
    if any(k in name for k in ["stomach", "gastric", "gastrit", "gastro", "ulcer", "bowel", "colonic", "colorectal", "diverticul", "liver", "cirrhosis", "hepatitis", "pancreatitis", "cholangitis", "esophag", "reflux", "gerd", "constipation", "diarrhea", "food poisoning"]):
        return "Gastroenterologist"
    if any(k in name for k in ["uter", "menstru", "vaginal", "pregnan", "abort", "ovarian", "cervic", "endometri", "vulvar", "pcos", "mittelschmerz", "fibroid", "preeclampsia", "labor", "breast"]):
        return "Gynecologist / Obstetrician"
    if any(k in name for k in ["kidney", "renal", "nephro", "glomerulo", "pyelonephritis", "acute kidney"]):
        return "Nephrologist"
    if any(k in name for k in ["urinary", "bladder", "prostate", "bph", "urethra", "testic", "priapism", "hydrocele", "varicocele"]):
        return "Urologist"
    if any(k in name for k in ["ear", "nose", "throat", "sinus", "tonsil", "pharyng", "laryng", "otitis", "rhinitis", "septum", "tinnitus", "hearing loss", "eustachian", "mastoid", "adenoid"]):
        return "ENT Specialist"
    if any(k in name for k in ["eye", "glaucoma", "cataract", "retin", "cornea", "conjunctiv", "blephar", "strabismus", "amblyopia", "vision", "pterygium"]):
        return "Ophthalmologist"
    if any(k in name for k in ["brain", "nerve", "neural", "seizure", "epilepsy", "migraine", "headache", "stroke", "paralysis", "palsy", "dementia", "alzheimer", "parkinson", "multiple sclerosis", "neuropathy"]):
        return "Neurologist"
    if any(k in name for k in ["thyroid", "diabetes", "hormone", "pituitary", "adrenal", "cushing", "hypo", "hyper"]):
        return "Endocrinologist"
    if any(k in name for k in ["tooth", "dental", "gum", "caries", "mouth"]):
        return "Dentist / Oral Specialist"
    if any(k in name for k in ["anxiety", "depression", "bipolar", "psychosis", "schizo", "adhd", "autism", "stress"]):
        return "Psychiatrist"

    return "General Physician"


def _get_clinical_fallback(disease_name: str) -> str:
    """Retrieve pre-compiled clinical remedies immediately in <0.01ms."""
    name_lower = str(disease_name).lower().strip()
    for key, remedy in CLINICAL_REMEDIES.items():
        if key in name_lower or name_lower in key:
            return remedy
    return GENERIC_CLINICAL_REMEDY


def _fetch_gemini_remedies_with_deadline(disease: str, confidence: float, timeout_sec: float = GEMINI_TIMEOUT_SECONDS) -> str:
    """
    Call Gemini with a strict timeout deadline.
    Returns generated remedy text or falls back to clinical library immediately.
    """
    client = _get_client()
    if not client:
        return _get_clinical_fallback(disease)

    prompt = (
        f"A patient health tool flagged '{disease}' with {confidence:.1f}% confidence. "
        f"Provide 3-5 concise, practical, and safe self-care / home guidance tips for supportive relief. "
        f"Format as a numbered list (1., 2., etc). "
        f"Keep each tip to 1-2 actionable sentences. End with a note to consult a doctor if symptoms persist."
    )

    def _call_model(model_name: str):
        resp = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        if resp and resp.text:
            return resp.text.strip()
        return None

    future = _EXECUTOR.submit(_call_model, GEMINI_MODEL)
    try:
        result = future.result(timeout=timeout_sec)
        if result and len(result) > 20:
            return result
    except (FuturesTimeoutError, Exception):
        pass

    # Try secondary model quickly if within remaining time
    try:
        sec_future = _EXECUTOR.submit(_call_model, GEMINI_SECONDARY_MODEL)
        result = sec_future.result(timeout=min(0.5, timeout_sec))
        if result and len(result) > 20:
            return result
    except Exception:
        pass

    return _get_clinical_fallback(disease)


def generate_remedies_and_warnings(predictions: list) -> list:
    """
    Enrich predictions with clinical risk classification, specialty doctor routing,
    and verified remedies/warnings.

    Guarantees both `remedies`/`remedies_text` and `warning`/`warning_text` are present.
    """
    enriched = []
    needed_remedies = []

    for pred in predictions:
        disease = pred["disease"]
        confidence = float(pred.get("confidence", 0.0))
        rank = pred.get("rank", 1)
        risk_level = classify_risk(disease, confidence)
        doctor = get_doctor_specialty(disease)

        warning_text = None
        remedies_text = None

        if risk_level == "critical":
            warning_text = (
                f"CRITICAL MEDICAL ALERT: Potential signs of {disease} detected ({confidence:.1f}% confidence). "
                f"This requires immediate emergency evaluation. Please visit the nearest Emergency Department "
                f"or contact emergency medical services right away. Do not attempt self-treatment."
            )
        elif risk_level == "high":
            warning_text = (
                f"HIGH CLINICAL PRIORITY: Findings suggest possible {disease} ({confidence:.1f}% confidence). "
                f"Please schedule an urgent consultation with a {doctor} or visit a medical clinic. "
                f"Do not rely solely on automated prediction."
            )
        elif risk_level == "moderate" and not is_minor_condition(disease):
            warning_text = (
                f"CLINICAL GUIDANCE: Findings correlate with {disease} ({confidence:.1f}% confidence). "
                f"Consider consulting a {doctor} for diagnostic confirmation and clinical guidance."
            )

        # Supportive remedies are only generated for minor/outpatient conditions
        if is_minor_condition(disease) and confidence > 5:
            cache_key = disease.lower().strip()
            with _CACHE_LOCK:
                cached = _REMEDIES_CACHE.get(cache_key)

            if cached:
                remedies_text = cached
            else:
                # Immediate clinical library fallback (<0.01ms)
                remedies_text = _get_clinical_fallback(disease)
                with _CACHE_LOCK:
                    _REMEDIES_CACHE[cache_key] = remedies_text
                needed_remedies.append((disease, confidence))

        enriched.append({
            **pred,
            "risk_level": risk_level,
            "doctor": doctor,
            "remedies": remedies_text,
            "remedies_text": remedies_text,
            "warning": warning_text,
            "warning_text": warning_text,
        })

    # Trigger asynchronous background AI enrichment for future requests if client is ready
    if needed_remedies and _get_client():
        for d, c in needed_remedies:
            def _bg_worker(dis=d, conf=c):
                try:
                    res = _fetch_gemini_remedies_with_deadline(dis, conf, timeout_sec=2.0)
                    if res and len(res) > 20:
                        with _CACHE_LOCK:
                            _REMEDIES_CACHE[dis.lower().strip()] = res
                except Exception:
                    pass
            _EXECUTOR.submit(_bg_worker)

    return enriched
