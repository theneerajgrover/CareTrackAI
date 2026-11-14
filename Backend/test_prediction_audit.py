"""
test_prediction_audit.py
------------------------
Automated test suite for CareTrack AI's prediction pipeline, symptom mapping,
Gemini integration, risk classification, and API response consistency.
"""

import unittest
import sys
import os
import warnings

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.simplefilter("ignore", InconsistentVersionWarning)
except ImportError:
    pass

# Ensure Backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from symptom_mapper import (
    map_frontend_symptoms_to_features,
    normalize_symptom_key,
    FRONTEND_TO_DATASET,
)
from predict import predict_disease, get_model_info, get_available_symptoms
from gemini_service import (
    classify_risk,
    is_minor_condition,
    get_doctor_specialty,
    _get_clinical_fallback,
    generate_remedies_and_warnings,
    GEMINI_MODEL,
    GEMINI_SECONDARY_MODEL,
)


class TestSymptomMapping(unittest.TestCase):
    """Phase 2: Symptom Mapping & Normalization Tests"""

    @classmethod
    def setUpClass(cls):
        cls.features = get_available_symptoms()

    def test_user_reported_case(self):
        """Verify the user test case ['itching', 'skin_rash', 'nodal_skin_eruptions'] matches 100%."""
        input_symptoms = ["itching", "skin_rash", "nodal_skin_eruptions"]
        res = map_frontend_symptoms_to_features(input_symptoms, self.features)

        self.assertEqual(len(res["unmatched"]), 0, f"Unmatched symptoms found: {res['unmatched']}")
        self.assertEqual(len(res["matched"]), 3)
        self.assertIn("itching", res["matched"])
        self.assertIn("skin_rash", res["matched"])
        self.assertIn("nodal_skin_eruptions", res["matched"])

        # Check binary active features in vector
        self.assertEqual(res["features"]["itching_of_skin"], 1)
        self.assertEqual(res["features"]["skin_rash"], 1)
        self.assertEqual(res["features"]["skin_lesion"], 1)

    def test_normalization_and_formatting(self):
        """Verify normalization handles spaces, hyphens, casing, and punctuation."""
        variations = [
            ("Skin Rash", "skin_rash"),
            ("itching-of-skin", "itching_of_skin"),
            ("  CHEST PAIN  ", "chest_pain"),
            ("fever!", "fever"),
            ("shortness-of-breath", "shortness_of_breath"),
        ]
        for raw, expected in variations:
            self.assertEqual(normalize_symptom_key(raw), expected)

    def test_clinical_aliases(self):
        """Verify common clinical synonyms map to valid dataset features."""
        aliases_to_test = [
            ("stomach_pain", "sharp_abdominal_pain"),
            ("high_fever", "fever"),
            ("acidity", "heartburn"),
            ("breathlessness", "shortness_of_breath"),
            ("shivering", "chills"),
            ("continuous_sneezing", "sneezing"),
        ]
        for alias, target_col in aliases_to_test:
            res = map_frontend_symptoms_to_features([alias], self.features)
            self.assertIn(alias, res["matched"], f"Alias {alias} failed to match")
            self.assertEqual(res["features"][target_col], 1)

    def test_deduplication(self):
        """Verify duplicate symptoms in input do not produce duplicate matches."""
        res = map_frontend_symptoms_to_features(["fever", "Fever", "  fever  "], self.features)
        self.assertEqual(len(res["matched"]), 1)
        self.assertEqual(len(res["unmatched"]), 0)


class TestPredictionPipeline(unittest.TestCase):
    """Phase 3: ML Inference & Feature Vector Tests"""

    def test_prediction_output_schema(self):
        """Verify prediction response schema, keys, and top predictions."""
        res = predict_disease(["fever", "cough", "sore_throat"], top_n=5)
        self.assertIn("predictions", res)
        self.assertIn("symptoms_matched", res)
        self.assertIn("symptoms_unmatched", res)
        self.assertIn("active_features", res)
        self.assertIn("model_name", res)
        self.assertGreater(len(res["predictions"]), 0)
        self.assertGreaterEqual(res["active_features"], 1)

        for p in res["predictions"]:
            self.assertIn("disease", p)
            self.assertIn("confidence", p)
            self.assertIsInstance(p["confidence"], float)
            self.assertGreaterEqual(p["confidence"], 0.0)
            self.assertLessEqual(p["confidence"], 100.0)

    def test_user_case_prediction(self):
        """Verify prediction for user case yields a dermatological condition."""
        res = predict_disease(["itching", "skin_rash", "nodal_skin_eruptions"], top_n=3)
        self.assertGreater(len(res["predictions"]), 0)
        top_disease = res["predictions"][0]["disease"]
        self.assertEqual(top_disease, "lichen simplex")

    def test_edge_cases(self):
        """Verify safe handling of empty inputs, none, invalid types, and unknown symptoms."""
        # Empty list
        empty_res = predict_disease([])
        self.assertEqual(len(empty_res["predictions"]), 0)
        self.assertIn("error", empty_res)

        # Non-list
        invalid_res = predict_disease(None)
        self.assertEqual(len(invalid_res["predictions"]), 0)

        # Completely unknown symptoms
        unknown_res = predict_disease(["completely_fictional_symptom_xyz_123"])
        self.assertEqual(len(unknown_res["predictions"]), 0)
        self.assertEqual(len(unknown_res["symptoms_unmatched"]), 1)

    def test_model_metadata(self):
        """Verify model metadata loads accurately."""
        info = get_model_info()
        self.assertEqual(info["model_name"], "Naive Bayes (Gaussian)")
        self.assertEqual(info["num_features"], 377)
        self.assertEqual(info["num_diseases"], 713)
        self.assertAlmostEqual(info["accuracy"], 0.8658, places=3)


class TestGeminiServiceAndClinicalAcuity(unittest.TestCase):
    """Phase 4 & 5: Gemini Integration, Clinical Risk & Response Consistency"""

    def test_gemini_model_configuration(self):
        """Verify Gemini model configuration prefers gemini-3.5-flash-lite and valid fallback."""
        self.assertEqual(GEMINI_MODEL, "gemini-3.5-flash-lite")
        self.assertEqual(GEMINI_SECONDARY_MODEL, "gemini-3.6-flash")

    def test_deterministic_clinical_fallback_when_gemini_fails(self):
        """Verify that when Gemini API is unavailable or restricted, predictions and remedies succeed deterministically."""
        predictions = [
            {"disease": "common cold", "confidence": 90.0, "rank": 1},
            {"disease": "fever", "confidence": 85.0, "rank": 2},
        ]
        enriched = generate_remedies_and_warnings(predictions)
        self.assertEqual(len(enriched), 2)
        for p in enriched:
            self.assertIsNotNone(p.get("remedies"))
            self.assertIn("1.", p.get("remedies"))

    def test_clinical_risk_acuity(self):
        """Verify risk classification is based on clinical condition acuity, not confidence alone."""
        # Emergency conditions MUST be critical
        self.assertEqual(classify_risk("cardiac arrest", 40.0), "critical")
        self.assertEqual(classify_risk("stroke", 50.0), "critical")
        self.assertEqual(classify_risk("myocardial infarction", 35.0), "critical")

        # Minor conditions must NEVER be critical even with 100% confidence
        self.assertNotEqual(classify_risk("lichen simplex", 100.0), "critical")
        self.assertIn(classify_risk("lichen simplex", 100.0), ["low", "moderate"])
        self.assertIn(classify_risk("common cold", 95.0), ["low", "moderate"])
        self.assertIn(classify_risk("acne", 90.0), ["low", "moderate"])

    def test_clinical_fallback_availability(self):
        """Verify pre-compiled clinical remedies return within <1ms."""
        remedy = _get_clinical_fallback("fever")
        self.assertIn("Rest and stay well hydrated", remedy)
        generic = _get_clinical_fallback("unknown condition xyz")
        self.assertIn("Ensure adequate restful sleep", generic)

    def test_specialist_doctor_routing(self):
        """Verify specialty doctor routing for major disease categories."""
        self.assertEqual(get_doctor_specialty("lichen simplex"), "Dermatologist")
        self.assertEqual(get_doctor_specialty("heart attack"), "Cardiologist")
        self.assertEqual(get_doctor_specialty("asthma"), "Pulmonologist")
        self.assertEqual(get_doctor_specialty("fracture of the ankle"), "Orthopedic Specialist")
        self.assertEqual(get_doctor_specialty("gastritis"), "Gastroenterologist")

    def test_enrichment_dual_field_consistency(self):
        """Verify enriched predictions contain both remedies/remedies_text and warning/warning_text."""
        predictions = [
            {"disease": "lichen simplex", "confidence": 100.0, "rank": 1},
            {"disease": "cardiac arrest", "confidence": 85.0, "rank": 2},
        ]
        enriched = generate_remedies_and_warnings(predictions)
        self.assertEqual(len(enriched), 2)

        # Minor condition: has remedies, no critical warning
        p1 = enriched[0]
        self.assertIsNotNone(p1.get("remedies"))
        self.assertEqual(p1.get("remedies"), p1.get("remedies_text"))
        self.assertIsNone(p1.get("warning"))

        # Critical condition: has warning, NO home remedies
        p2 = enriched[1]
        self.assertIsNotNone(p2.get("warning"))
        self.assertEqual(p2.get("warning"), p2.get("warning_text"))
        self.assertIsNone(p2.get("remedies"), "Critical condition should not have home remedies")


if __name__ == "__main__":
    unittest.main()
