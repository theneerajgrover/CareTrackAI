"""
db_setup.py
-----------
One-time database setup for CareTrack AI.

Creates the 'caretrack_ai' database, all tables, and seeds the symptoms
and diseases lookup tables from the training dataset.

Also creates admin portal tables (admin_users, feedback, notifications,
notification_reads, audit_logs, ai_models) and seeds a default admin account.

Usage:
    python db_setup.py
"""

import os
import sys
import json
import psycopg2
from psycopg2 import sql
import pandas as pd
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# -- Config --------------------------------------------------------------------
DB_PASSWORD = os.getenv("DB_PASSWORD", "Neeraj@0069")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = "caretrack_ai"
DB_USER = os.getenv("DB_USER", "postgres")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "Dataset", "data.csv")
TRAINING_RESULTS_PATH = os.path.join(BASE_DIR, "Model", "training_results.json")


def create_database():
    """Create the caretrack_ai database if it doesn't exist."""
    print("[1/7] Creating database...")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname="postgres"
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    if cur.fetchone():
        print(f"  Database '{DB_NAME}' already exists.")
    else:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
        print(f"  [OK] Created database '{DB_NAME}'.")

    cur.close()
    conn.close()


def create_tables():
    """Create all tables (existing + admin portal)."""
    print("\n[2/7] Creating tables...")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    statements = [
        # ── Existing Tables (unchanged) ──────────────────────────────────

        # Users table
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        # Symptoms lookup table (numeric ID -> symptom info)
        """
        CREATE TABLE IF NOT EXISTS symptoms (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            label VARCHAR(255) NOT NULL,
            category VARCHAR(100)
        );
        """,
        # Diseases lookup table (numeric ID -> disease name)
        """
        CREATE TABLE IF NOT EXISTS diseases (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        # Refresh tokens table
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(512) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        # Predictions table (stores patient info + symptom IDs as integer array)
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            patient_name VARCHAR(255),
            patient_age VARCHAR(10),
            patient_gender VARCHAR(20),
            patient_dob VARCHAR(20),
            patient_blood_group VARCHAR(10),
            patient_height VARCHAR(20),
            patient_weight VARCHAR(20),
            patient_email VARCHAR(255),
            patient_phone VARCHAR(50),
            symptom_ids INTEGER[] NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        # Prediction results table (top 5 diseases with confidence, remedies, warnings)
        """
        CREATE TABLE IF NOT EXISTS prediction_results (
            id SERIAL PRIMARY KEY,
            prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
            disease_id INTEGER REFERENCES diseases(id),
            confidence_pct DECIMAL(5,2) NOT NULL,
            rank INTEGER NOT NULL,
            risk_level VARCHAR(20) DEFAULT 'low',
            remedies_text TEXT,
            warning_text TEXT
        );
        """,
        # Existing indexes
        """CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);""",
        """CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_id ON prediction_results(prediction_id);""",
        """CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);""",
        """CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);""",

        # ── New: Add columns to users table (safe ALTER with IF NOT EXISTS) ──

        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
                ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'patient';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
                ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
                ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
            END IF;
        END $$;
        """,

        # ── New: Add is_active column to symptoms table ──

        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='symptoms' AND column_name='is_active') THEN
                ALTER TABLE symptoms ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='symptoms' AND column_name='created_at') THEN
                ALTER TABLE symptoms ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='symptoms' AND column_name='updated_at') THEN
                ALTER TABLE symptoms ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            END IF;
        END $$;
        """,

        # ── New: Add status to predictions table ──

        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='predictions' AND column_name='status') THEN
                ALTER TABLE predictions ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='predictions' AND column_name='processing_time_ms') THEN
                ALTER TABLE predictions ADD COLUMN processing_time_ms INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='predictions' AND column_name='model_version') THEN
                ALTER TABLE predictions ADD COLUMN model_version VARCHAR(100);
            END IF;
        END $$;
        """,

        # ── Admin Portal Tables ──────────────────────────────────────────

        # Admin users table (separate from patients)
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) DEFAULT 'admin',
            status VARCHAR(20) DEFAULT 'active',
            phone VARCHAR(50),
            avatar_url VARCHAR(500),
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """,

        # Admin refresh tokens
        """
        CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
            id SERIAL PRIMARY KEY,
            admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
            token VARCHAR(512) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,

        # Feedback table
        """
        CREATE TABLE IF NOT EXISTS feedback (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            user_name VARCHAR(255),
            user_email VARCHAR(255),
            subject VARCHAR(500),
            message TEXT NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            priority VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(20) DEFAULT 'new',
            admin_response TEXT,
            responded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            responded_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """,

        # Notifications table
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(30) DEFAULT 'info',
            target_type VARCHAR(30) DEFAULT 'all_patients',
            target_user_id UUID,
            created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,

        # Notification read receipts
        """
        CREATE TABLE IF NOT EXISTS notification_reads (
            id SERIAL PRIMARY KEY,
            notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            read_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(notification_id, user_id)
        );
        """,

        # Audit logs table
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            admin_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50),
            resource_id VARCHAR(255),
            details TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,

        # AI model versions table
        """
        CREATE TABLE IF NOT EXISTS ai_models (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            version VARCHAR(50) NOT NULL,
            model_type VARCHAR(100),
            status VARCHAR(30) DEFAULT 'production',
            accuracy DECIMAL(6,4),
            precision_score DECIMAL(6,4),
            recall DECIMAL(6,4),
            f1_score DECIMAL(6,4),
            num_features INTEGER,
            num_diseases INTEGER,
            num_train_samples INTEGER,
            num_test_samples INTEGER,
            train_time_seconds DECIMAL(10,2),
            training_date TIMESTAMP,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(name, version)
        );
        """,

        # ── Admin Portal Indexes ─────────────────────────────────────────

        """CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_admin_id ON admin_refresh_tokens(admin_id);""",
        """CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_token ON admin_refresh_tokens(token);""",
        """CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);""",
        """CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);""",
        """CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);""",
        """CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);""",
        """CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type);""",
        """CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);""",

        # ── Chatbot Tables ───────────────────────────────────────────────
        """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL DEFAULT 'Medical Inquiry',
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            sender VARCHAR(16) NOT NULL,
            content TEXT NOT NULL,
            model VARCHAR(64) DEFAULT 'gpt-4o-mini',
            response_time_ms INTEGER DEFAULT 0,
            status VARCHAR(32) DEFAULT 'success',
            error_message TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        """CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);""",
        """CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at DESC);""",
        """CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);""",
        """CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);""",
        """CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);""",
        """CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);""",
        """CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);""",
        """CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);""",
        """CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);""",
        """CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);""",
        """CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);""",
        """CREATE INDEX IF NOT EXISTS idx_symptoms_category ON symptoms(category);""",
        """CREATE INDEX IF NOT EXISTS idx_symptoms_is_active ON symptoms(is_active);""",
    ]

    for stmt in statements:
        cur.execute(stmt)

    conn.commit()
    cur.close()
    conn.close()
    print("  [OK] All tables created (including admin portal tables).")


def seed_symptoms():
    """Seed the symptoms table from the dataset columns."""
    print("\n[3/7] Seeding symptoms table...")
    # Read just the header to get symptom column names
    df = pd.read_csv(DATASET_PATH, nrows=0)
    df.columns = df.columns.str.strip()
    symptom_cols = list(df.columns[1:])  # Skip 'diseases' column

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    # Check if already seeded
    cur.execute("SELECT COUNT(*) FROM symptoms")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  Symptoms table already has {count} entries. Skipping.")
        cur.close()
        conn.close()
        return

    # Insert each symptom
    for i, col_key in enumerate(symptom_cols):
        # Generate a human-readable label from the key
        label = col_key.replace("_", " ").title()
        # Assign a rough category based on position (simplified)
        category = "general"
        cur.execute(
            "INSERT INTO symptoms (key, label, category) VALUES (%s, %s, %s) ON CONFLICT (key) DO NOTHING",
            (col_key, label, category),
        )

    conn.commit()
    cur.execute("SELECT COUNT(*) FROM symptoms")
    final_count = cur.fetchone()[0]
    cur.close()
    conn.close()
    print(f"  [OK] Seeded {final_count} symptoms.")


def seed_diseases():
    """Seed the diseases table from the dataset's disease column."""
    print("\n[4/7] Seeding diseases table...")
    df = pd.read_csv(DATASET_PATH, usecols=[0])
    df.columns = df.columns.str.strip()
    disease_col = df.columns[0]
    unique_diseases = sorted(df[disease_col].str.strip().unique())

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    # Check if already seeded
    cur.execute("SELECT COUNT(*) FROM diseases")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"  Diseases table already has {count} entries. Skipping.")
        cur.close()
        conn.close()
        return

    for disease_name in unique_diseases:
        cur.execute(
            "INSERT INTO diseases (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (disease_name,),
        )

    conn.commit()
    cur.execute("SELECT COUNT(*) FROM diseases")
    final_count = cur.fetchone()[0]
    cur.close()
    conn.close()
    print(f"  [OK] Seeded {final_count} diseases.")


def seed_admin():
    """Seed the default admin account into both admin_users and users tables."""
    print("\n[5/7] Seeding default admin account...")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    password = "Admin@CareTrack2026"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    email = "admin@caretrack.ai"

    # Seed/Update in admin_users
    cur.execute("SELECT COUNT(*) FROM admin_users WHERE email = %s", (email,))
    if cur.fetchone()[0] == 0:
        cur.execute(
            """INSERT INTO admin_users (name, email, password_hash, role, status)
               VALUES (%s, %s, %s, %s, %s)""",
            ("CareTrack Admin", email, password_hash, "admin", "active"),
        )
    else:
        cur.execute(
            """UPDATE admin_users SET password_hash = %s, status = 'active' WHERE email = %s""",
            (password_hash, email),
        )

    # Seed/Update in users
    cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (email,))
    if cur.fetchone()[0] == 0:
        cur.execute(
            """INSERT INTO users (name, email, password_hash, role, status)
               VALUES (%s, %s, %s, %s, %s)""",
            ("CareTrack Admin", email, password_hash, "admin", "active"),
        )
    else:
        cur.execute(
            """UPDATE users SET password_hash = %s, role = 'admin', status = 'active' WHERE email = %s""",
            (password_hash, email),
        )

    conn.commit()
    cur.close()
    conn.close()
    print(f"  [OK] Default admin verified: {email} / {password}")


def seed_ai_model():
    """Seed the initial AI model record from training_results.json."""
    print("\n[6/7] Seeding AI model record...")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    # Check if model already exists
    cur.execute("SELECT COUNT(*) FROM ai_models")
    if cur.fetchone()[0] > 0:
        print("  AI model record already exists. Skipping.")
        cur.close()
        conn.close()
        return

    # Load training results
    if not os.path.exists(TRAINING_RESULTS_PATH):
        print("  Training results not found. Skipping.")
        cur.close()
        conn.close()
        return

    with open(TRAINING_RESULTS_PATH) as f:
        results = json.load(f)

    best_model_name = results.get("best_model", "Unknown")
    best_metrics = results.get(best_model_name, {})

    cur.execute(
        """INSERT INTO ai_models (name, version, model_type, status,
           accuracy, precision_score, recall, f1_score,
           num_features, num_diseases, num_train_samples, num_test_samples,
           train_time_seconds, training_date, metadata_json)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)""",
        (
            "CareTrack Symptom Model",
            "v1.0",
            best_model_name,
            "production",
            best_metrics.get("accuracy"),
            best_metrics.get("precision"),
            best_metrics.get("recall"),
            best_metrics.get("f1_score"),
            results.get("num_features"),
            results.get("num_diseases"),
            results.get("num_train_samples"),
            results.get("num_test_samples"),
            best_metrics.get("train_time_seconds"),
            json.dumps({
                "all_models": {k: v for k, v in results.items() if isinstance(v, dict) and "accuracy" in v}
            }),
        ),
    )

    conn.commit()
    cur.close()
    conn.close()
    print(f"  [OK] Seeded AI model: {best_model_name} (v1.0, production)")


def update_symptom_categories():
    """Update symptom categories from the frontend mapping."""
    print("\n[7/7] Updating symptom categories...")

    # Category mapping based on Frontend/src/data/symptoms.ts
    CATEGORY_MAP = {
        "general": ["fever", "chills", "fatigue", "weakness", "feeling_ill", "feeling_hot_and_cold",
                     "feeling_cold", "sweating", "weight_gain", "recent_weight_loss",
                     "decreased_appetite", "excessive_appetite", "ache_all_over", "restlessness",
                     "swollen_lymph_nodes"],
        "head_neuro": ["headache", "frontal_headache", "dizziness", "seizures", "fainting",
                       "loss_of_sensation", "paresthesia", "disturbance_of_memory", "slurring_words",
                       "focal_weakness", "sleepiness", "insomnia", "abnormal_involuntary_movements"],
        "respiratory": ["cough", "coughing_up_sputum", "difficulty_breathing", "shortness_of_breath",
                        "wheezing", "breathing_fast", "congestion_in_chest", "hemoptysis",
                        "hurts_to_breath", "apnea", "hoarse_voice", "abnormal_breathing_sounds"],
        "heart_circulation": ["palpitations", "irregular_heartbeat", "increased_heart_rate",
                              "decreased_heart_rate", "sharp_chest_pain", "burning_chest_pain",
                              "chest_tightness", "poor_circulation", "peripheral_edema", "flushing"],
        "eyes_vision": ["diminished_vision", "double_vision", "pain_in_eye", "eye_redness",
                        "itchiness_of_eye", "lacrimation", "white_discharge_from_eye",
                        "eyelid_swelling", "spots_or_clouds_in_vision", "eye_burns_or_stings",
                        "foreign_body_sensation_in_eye"],
        "ent": ["ear_pain", "ringing_in_ear", "plugged_feeling_in_ear", "diminished_hearing",
                "nasal_congestion", "coryza", "sneezing", "nosebleed", "sinus_congestion",
                "sore_throat", "throat_irritation", "difficulty_in_swallowing", "throat_swelling",
                "swollen_or_red_tonsils", "disturbance_of_smell_or_taste"],
        "digestive": ["nausea", "vomiting", "diarrhea", "constipation", "heartburn", "flatulence",
                      "sharp_abdominal_pain", "upper_abdominal_pain", "lower_abdominal_pain",
                      "stomach_bloating", "blood_in_stool", "incontinence_of_stool", "regurgitation"],
        "urinary": ["frequent_urination", "painful_urination", "blood_in_urine", "low_urine_output",
                    "retention_of_urine", "unusual_color_or_odor_to_urine",
                    "excessive_urination_at_night"],
        "musculoskeletal": ["joint_pain", "joint_swelling", "joint_stiffness_or_tightness",
                           "muscle_pain", "muscle_weakness", "muscle_stiffness_or_tightness",
                           "muscle_cramps_contractures_or_spasms", "back_pain", "low_back_pain",
                           "neck_pain", "shoulder_pain", "knee_pain", "hip_pain", "wrist_pain",
                           "elbow_pain", "ankle_pain", "leg_pain", "arm_pain", "side_pain"],
        "skin": ["skin_rash", "skin_irritation", "itching_of_skin",
                 "skin_dryness_peeling_scaliness_or_roughness", "skin_lesion", "skin_swelling",
                 "acne_or_pimples", "irregular_appearing_nails", "too_little_hair", "itchy_scalp",
                 "allergic_reaction", "jaundice"],
        "mouth": ["toothache", "mouth_ulcer", "mouth_pain", "gum_pain", "bleeding_gums",
                  "tongue_pain", "swollen_tongue", "jaw_pain", "jaw_swelling", "lip_swelling",
                  "mouth_dryness"],
        "mental": ["anxiety_and_nervousness", "depression", "emotional_symptoms", "excessive_anger",
                   "fears_and_phobias", "low_self_esteem", "obsessions_and_compulsions",
                   "hostile_behavior", "delusions_or_hallucinations"],
        "womens_health": ["vaginal_itching", "vaginal_dryness", "vaginal_discharge", "vaginal_pain",
                          "painful_menstruation", "heavy_menstrual_flow", "unpredictable_menstruation",
                          "absence_of_menstruation", "hot_flashes", "pelvic_pain",
                          "pain_or_soreness_of_breast", "lump_or_mass_of_breast"],
        "mens_health": ["pain_in_testicles", "swelling_of_scrotum", "groin_pain", "penile_discharge",
                        "impotence", "premature_ejaculation", "symptoms_of_prostate"],
        "other": ["rectal_bleeding", "pus_in_sputum"],
    }

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    updated = 0
    for category, keys in CATEGORY_MAP.items():
        for key in keys:
            cur.execute(
                "UPDATE symptoms SET category = %s WHERE key = %s AND category = 'general'",
                (category, key),
            )
            updated += cur.rowcount

    conn.commit()
    cur.close()
    conn.close()
    print(f"  [OK] Updated {updated} symptom categories.")


def main():
    print("=" * 60)
    print("  CareTrack AI -- Database Setup (with Admin Portal)")
    print("=" * 60)

    create_database()
    create_tables()
    seed_symptoms()
    seed_diseases()
    seed_admin()
    seed_ai_model()
    update_symptom_categories()

    print("\n" + "=" * 60)
    print("  [OK] Database setup complete!")
    print("  Admin login: admin@caretrack.ai / Admin@CareTrack2026")
    print("=" * 60)


if __name__ == "__main__":
    main()
