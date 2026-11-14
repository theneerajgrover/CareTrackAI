"""
symptom_mapper.py
-----------------
Maps frontend symptom keys (from React symptoms.ts and user inputs) to
the dataset's 377 column names.

Supports:
- Exact 1-to-1 and 1-to-many column mappings
- Standard clinical synonyms and historical aliases (e.g. itching, nodal_skin_eruptions)
- Whitespace, hyphen, casing, and punctuation normalization
- Direct feature column fallback
- Deduplication of matched and unmatched symptom keys
"""

import re

# --------------------------------------------------------------------------
# Frontend symptom key / alias  →  dataset column name(s)
# --------------------------------------------------------------------------
FRONTEND_TO_DATASET = {
    # ── General & Whole Body ──
    "fever": ["fever"],
    "chills": ["chills"],
    "fatigue": ["fatigue"],
    "weakness": ["weakness"],
    "feeling_ill": ["feeling_ill"],
    "feeling_hot": ["feeling_hot_and_cold"],
    "feeling_cold": ["feeling_cold"],
    "sweating": ["sweating"],
    "night_sweats": ["sweating"],
    "weight_gain": ["weight_gain"],
    "recent_weight_loss": ["recent_weight_loss"],
    "decreased_appetite": ["decreased_appetite"],
    "excessive_appetite": ["excessive_appetite"],
    "ache_all_over": ["ache_all_over"],
    "malaise": ["feeling_ill"],
    "restlessness": ["restlessness"],
    "dehydration": ["decreased_appetite"],
    "swollen_lymph_nodes": ["swollen_lymph_nodes"],

    # ── Head & Neurological ──
    "headache": ["headache", "frontal_headache"],
    "frontal_headache": ["frontal_headache"],
    "dizziness": ["dizziness"],
    "lightheadedness": ["dizziness", "fainting"],
    "seizures": ["seizures"],
    "fainting": ["fainting"],
    "loss_of_sensation": ["loss_of_sensation"],
    "paresthesia": ["paresthesia"],
    "memory_disturbance": ["disturbance_of_memory"],
    "slurring_words": ["slurring_words"],
    "focal_weakness": ["focal_weakness"],
    "sleepiness": ["sleepiness"],
    "insomnia": ["insomnia"],
    "difficulty_concentrating": ["disturbance_of_memory"],
    "confusion": ["disturbance_of_memory"],
    "tremors": ["abnormal_involuntary_movements"],
    "involuntary_movements": ["abnormal_involuntary_movements"],

    # ── Respiratory ──
    "cough": ["cough"],
    "dry_cough": ["cough"],
    "productive_cough": ["cough", "coughing_up_sputum"],
    "difficulty_breathing": ["difficulty_breathing"],
    "shortness_of_breath": ["shortness_of_breath"],
    "wheezing": ["wheezing"],
    "rapid_breathing": ["breathing_fast"],
    "congestion_in_chest": ["congestion_in_chest"],
    "coughing_up_sputum": ["coughing_up_sputum"],
    "hemoptysis": ["hemoptysis"],
    "hurts_to_breathe": ["hurts_to_breath"],
    "apnea": ["apnea"],
    "hoarseness": ["hoarse_voice"],
    "stridor": ["abnormal_breathing_sounds"],

    # ── Heart & Circulation ──
    "palpitations": ["palpitations"],
    "irregular_heartbeat": ["irregular_heartbeat"],
    "increased_heart_rate": ["increased_heart_rate"],
    "decreased_heart_rate": ["decreased_heart_rate"],
    "chest_pain": ["sharp_chest_pain", "burning_chest_pain"],
    "chest_tightness": ["chest_tightness"],
    "poor_circulation": ["poor_circulation"],
    "peripheral_edema": ["peripheral_edema"],
    "flushing": ["flushing"],
    "cold_hands_feet": ["feeling_cold"],
    "high_blood_pressure": ["increased_heart_rate"],

    # ── Eyes & Vision ──
    "diminished_vision": ["diminished_vision"],
    "double_vision": ["double_vision"],
    "eye_pain": ["pain_in_eye"],
    "eye_redness": ["eye_redness"],
    "itchiness_of_eye": ["itchiness_of_eye"],
    "watery_eyes": ["lacrimation"],
    "blurred_vision": ["diminished_vision"],
    "eye_discharge": ["white_discharge_from_eye"],
    "eyelid_swelling": ["eyelid_swelling"],
    "spots_in_vision": ["spots_or_clouds_in_vision"],
    "sensitivity_to_light": ["eye_burns_or_stings"],
    "foreign_body_sensation": ["foreign_body_sensation_in_eye"],

    # ── Ear, Nose & Throat ──
    "ear_pain": ["ear_pain"],
    "ringing_in_ear": ["ringing_in_ear"],
    "plugged_ear": ["plugged_feeling_in_ear"],
    "hearing_reduction": ["diminished_hearing"],
    "nasal_congestion": ["nasal_congestion"],
    "runny_nose": ["coryza"],
    "sneezing": ["sneezing"],
    "nosebleed": ["nosebleed"],
    "sinus_congestion": ["sinus_congestion"],
    "sore_throat": ["sore_throat"],
    "throat_irritation": ["throat_irritation"],
    "difficulty_swallowing": ["difficulty_in_swallowing"],
    "throat_swelling": ["throat_swelling"],
    "tonsil_swelling": ["swollen_or_red_tonsils"],
    "loss_of_smell": ["disturbance_of_smell_or_taste"],
    "loss_of_taste": ["disturbance_of_smell_or_taste"],

    # ── Digestive & Stomach ──
    "nausea": ["nausea"],
    "vomiting": ["vomiting"],
    "diarrhea": ["diarrhea"],
    "constipation": ["constipation"],
    "heartburn": ["heartburn"],
    "flatulence": ["flatulence"],
    "abdominal_pain": ["sharp_abdominal_pain"],
    "upper_abdominal_pain": ["upper_abdominal_pain"],
    "lower_abdominal_pain": ["lower_abdominal_pain"],
    "stomach_bloating": ["stomach_bloating"],
    "abdominal_cramps": ["sharp_abdominal_pain"],
    "blood_in_stool": ["blood_in_stool"],
    "loss_of_bowel_control": ["incontinence_of_stool"],
    "indigestion": ["heartburn"],
    "regurgitation": ["regurgitation"],

    # ── Urinary & Kidney ──
    "frequent_urination": ["frequent_urination"],
    "painful_urination": ["painful_urination"],
    "blood_in_urine": ["blood_in_urine"],
    "low_urine_output": ["low_urine_output"],
    "urine_retention": ["retention_of_urine"],
    "unusual_urine_color": ["unusual_color_or_odor_to_urine"],
    "urine_odor": ["unusual_color_or_odor_to_urine"],
    "excessive_nighttime_urination": ["excessive_urination_at_night"],
    "urgency_to_urinate": ["frequent_urination"],

    # ── Musculoskeletal ──
    "joint_pain": ["joint_pain"],
    "joint_swelling": ["joint_swelling"],
    "joint_stiffness": ["joint_stiffness_or_tightness"],
    "muscle_pain": ["muscle_pain"],
    "muscle_weakness": ["muscle_weakness"],
    "muscle_stiffness": ["muscle_stiffness_or_tightness"],
    "muscle_cramps": ["muscle_cramps_contractures_or_spasms"],
    "back_pain": ["back_pain", "low_back_pain"],
    "neck_pain": ["neck_pain"],
    "shoulder_pain": ["shoulder_pain"],
    "knee_pain": ["knee_pain"],
    "hip_pain": ["hip_pain"],
    "wrist_pain": ["wrist_pain"],
    "elbow_pain": ["elbow_pain"],
    "ankle_pain": ["ankle_pain"],
    "leg_pain": ["leg_pain"],
    "arm_pain": ["arm_pain"],
    "flank_pain": ["side_pain"],

    # ── Skin & Hair ──
    "itching": ["itching_of_skin"],
    "itching_of_skin": ["itching_of_skin"],
    "nodal_skin_eruptions": ["skin_lesion"],
    "skin_rash": ["skin_rash"],
    "skin_irritation": ["skin_irritation"],
    "skin_dryness": ["skin_dryness_peeling_scaliness_or_roughness"],
    "skin_lesion": ["skin_lesion"],
    "skin_swelling": ["skin_swelling"],
    "acne": ["acne_or_pimples"],
    "skin_peeling": ["skin_dryness_peeling_scaliness_or_roughness"],
    "bruising": ["skin_lesion"],
    "nail_abnormalities": ["irregular_appearing_nails"],
    "hair_loss": ["too_little_hair"],
    "scalp_itching": ["itchy_scalp"],
    "hives": ["allergic_reaction"],
    "jaundice": ["jaundice"],

    # ── Mouth, Teeth & Jaw ──
    "toothache": ["toothache"],
    "mouth_ulcer": ["mouth_ulcer"],
    "mouth_pain": ["mouth_pain"],
    "gum_pain": ["gum_pain"],
    "bleeding_gums": ["bleeding_gums"],
    "tongue_pain": ["tongue_pain"],
    "swollen_tongue": ["swollen_tongue"],
    "jaw_pain": ["jaw_pain"],
    "jaw_swelling": ["jaw_swelling"],
    "lip_swelling": ["lip_swelling"],
    "dry_mouth": ["mouth_dryness"],
    "bad_breath": ["mouth_dryness"],

    # ── Mental & Behavioral ──
    "anxiety": ["anxiety_and_nervousness"],
    "depression": ["depression"],
    "mood_swings": ["emotional_symptoms"],
    "irritability": ["emotional_symptoms"],
    "excessive_anger": ["excessive_anger"],
    "fears_phobias": ["fears_and_phobias"],
    "low_self_esteem": ["low_self_esteem"],
    "obsessions_compulsions": ["obsessions_and_compulsions"],
    "panic_attacks": ["anxiety_and_nervousness"],
    "social_withdrawal": ["emotional_symptoms"],
    "behavioral_changes": ["hostile_behavior"],
    "delusions": ["delusions_or_hallucinations"],
    "hallucinations": ["delusions_or_hallucinations"],

    # ── Women's Health ──
    "vaginal_itching": ["vaginal_itching"],
    "vaginal_dryness": ["vaginal_dryness"],
    "vaginal_discharge": ["vaginal_discharge"],
    "vaginal_pain": ["vaginal_pain"],
    "painful_menstruation": ["painful_menstruation"],
    "heavy_menstrual_flow": ["heavy_menstrual_flow"],
    "irregular_menstruation": ["unpredictable_menstruation"],
    "absent_menstruation": ["absence_of_menstruation"],
    "hot_flashes": ["hot_flashes"],
    "pelvic_pain": ["pelvic_pain"],
    "breast_pain": ["pain_or_soreness_of_breast"],
    "breast_lump": ["lump_or_mass_of_breast"],

    # ── Men's Health ──
    "testicular_pain": ["pain_in_testicles"],
    "scrotal_swelling": ["swelling_of_scrotum"],
    "groin_pain": ["groin_pain"],
    "penile_discharge": ["penile_discharge"],
    "erectile_problems": ["impotence"],
    "premature_ejaculation": ["premature_ejaculation"],
    "prostate_symptoms": ["symptoms_of_prostate"],
    "painful_urination_male": ["painful_urination"],

    # ── Other Symptoms ──
    "numbness": ["loss_of_sensation"],
    "burning_sensation": ["skin_irritation"],
    "swollen_glands": ["swollen_lymph_nodes"],
    "excessive_thirst": ["excessive_appetite"],
    "excessive_hunger": ["excessive_appetite"],
    "general_pain": ["ache_all_over"],
    "bleeding": ["rectal_bleeding"],
    "abscess": ["pus_in_sputum"],
    "swelling": ["peripheral_edema"],

    # ── Clinical & Historical Aliases (Verified against 377 features) ──
    "continuous_sneezing": ["sneezing"],
    "shivering": ["chills"],
    "stomach_pain": ["sharp_abdominal_pain"],
    "belly_pain": ["sharp_abdominal_pain"],
    "acidity": ["heartburn"],
    "ulcers_on_tongue": ["mouth_ulcer"],
    "burning_micturition": ["painful_urination"],
    "spotting_urination": ["blood_in_urine"],
    "cold_hands_and_feets": ["feeling_cold"],
    "cold_hands_and_feet": ["feeling_cold"],
    "weight_loss": ["recent_weight_loss"],
    "lethargy": ["fatigue"],
    "patches_in_throat": ["throat_irritation"],
    "high_fever": ["fever"],
    "mild_fever": ["fever"],
    "sunken_eyes": ["diminished_vision"],
    "breathlessness": ["shortness_of_breath"],
    "yellowish_skin": ["jaundice"],
    "dark_urine": ["unusual_color_or_odor_to_urine"],
    "yellow_urine": ["unusual_color_or_odor_to_urine"],
    "yellowing_of_eyes": ["jaundice"],
    "loss_of_appetite": ["decreased_appetite"],
    "pain_behind_the_eyes": ["pain_in_eye"],
    "diarrhoea": ["diarrhea"],
    "swelled_lymph_nodes": ["swollen_lymph_nodes"],
    "blurred_and_distorted_vision": ["diminished_vision"],
    "phlegm": ["coughing_up_sputum"],
    "redness_of_eyes": ["eye_redness"],
    "sinus_pressure": ["sinus_congestion"],
    "fast_heart_rate": ["increased_heart_rate"],
    "bloody_stool": ["blood_in_stool"],
    "swollen_legs": ["peripheral_edema"],
    "slurred_speech": ["slurring_words"],
    "hip_joint_pain": ["hip_pain"],
    "stiff_neck": ["neck_pain"],
    "swelling_joints": ["joint_swelling"],
    "movement_stiffness": ["joint_stiffness_or_tightness"],
    "loss_of_balance": ["dizziness"],
    "passage_of_gases": ["flatulence"],
    "abnormal_menstruation": ["unpredictable_menstruation"],
    "watering_from_eyes": ["lacrimation"],
    "increased_appetite": ["excessive_appetite"],
    "lack_of_concentration": ["disturbance_of_memory"],
    "blood_in_sputum": ["hemoptysis"],
    "pus_filled_pimples": ["acne_or_pimples"],
    "blackheads": ["acne_or_pimples"],
    "blister": ["skin_lesion"],
}


def normalize_symptom_key(key: str) -> str:
    """
    Normalize a raw symptom string into a canonical snake_case lookup key.
    Handles spaces, hyphens, uppercase characters, and punctuation.
    """
    if not isinstance(key, str):
        key = str(key)
    # Strip whitespace, lower case, replace hyphens and spaces with underscores
    s = key.strip().lower()
    s = re.sub(r"[\s\-]+", "_", s)
    # Remove any characters that are not alphanumeric or underscore
    s = re.sub(r"[^\w]", "", s)
    # Collapse multiple consecutive underscores
    s = re.sub(r"_+", "_", s)
    return s.strip("_")


def map_frontend_symptoms_to_features(symptom_keys: list, feature_columns: list) -> dict:
    """
    Convert a list of frontend symptom keys into a binary feature dict
    matching the model's training columns.

    Parameters
    ----------
    symptom_keys : list[str]
        Symptom keys from the frontend (e.g. ["itching", "skin_rash", "nodal_skin_eruptions"]).
    feature_columns : list[str]
        The exact 377 column names the model was trained on.

    Returns
    -------
    dict
        {
            "features": {col: 0/1, ...},
            "matched": list of successfully matched original keys (deduplicated),
            "unmatched": list of unmatched keys (deduplicated),
        }
    """
    feature_set = set(feature_columns)
    features = {col: 0 for col in feature_columns}
    matched = []
    unmatched = []
    seen = set()

    if not symptom_keys or not isinstance(symptom_keys, (list, tuple)):
        return {
            "features": features,
            "matched": [],
            "unmatched": [],
        }

    for raw_key in symptom_keys:
        if raw_key is None:
            continue
        raw_key_str = str(raw_key).strip()
        if not raw_key_str:
            continue

        clean_key = normalize_symptom_key(raw_key_str)
        if clean_key in seen:
            continue
        seen.add(clean_key)

        found = False

        # 1. Lookup in semantic dictionary
        dataset_cols = FRONTEND_TO_DATASET.get(clean_key)
        if dataset_cols:
            for col in dataset_cols:
                if col in feature_set:
                    features[col] = 1
                    found = True

        # 2. Direct match in model feature columns
        if not found and clean_key in feature_set:
            features[clean_key] = 1
            found = True

        # 3. Fuzzy match: check if clean_key matches any feature column directly
        if not found:
            for col in feature_columns:
                if clean_key == col or (len(clean_key) > 4 and clean_key in col):
                    features[col] = 1
                    found = True
                    break

        if found:
            matched.append(raw_key_str)
        else:
            unmatched.append(raw_key_str)

    return {
        "features": features,
        "matched": matched,
        "unmatched": unmatched,
    }
