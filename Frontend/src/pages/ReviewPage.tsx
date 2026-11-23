import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Edit2, User, Activity, Sparkles, Check } from 'lucide-react'
import { SYMPTOM_CATEGORIES } from '../data/symptoms'
import { staggerContainer, staggerItem, buttonHover, buttonTap, fadeUp } from '../motion/variants'
import type { PatientDetails, SelectedSymptom, Page } from '../types'
import '../styles/assessment.css'

interface ReviewPageProps {
  patientDetails: PatientDetails
  selectedSymptoms: Record<string, SelectedSymptom>
  onNavigate: (page: Page) => void
  onEditSymptoms: () => void
}

const STEPS = [
  { num: 1, label: 'Vitals' },
  { num: 2, label: 'Symptoms' },
  { num: 3, label: 'Review' },
  { num: 4, label: 'Analysis' },
]

export default function ReviewPage({
  patientDetails,
  selectedSymptoms,
  onNavigate,
  onEditSymptoms,
}: ReviewPageProps) {
  const total = Object.keys(selectedSymptoms).length
  const byCategory = SYMPTOM_CATEGORIES.map((cat) => ({
    category: cat,
    symptoms: cat.symptoms.filter((s) => selectedSymptoms[s.key]),
  })).filter((g) => g.symptoms.length > 0)

  const currentStep = 3

  return (
    <div className="assessment-bg">
      <div className="assessment-container assessment-container--review">
        {/* Progress Header */}
        <motion.div className="assessment-progress-header" variants={fadeUp} initial="hidden" animate="visible">
          <button onClick={() => onNavigate('symptom-categories')} className="assessment-exit-btn">
            <ArrowLeft size={13} />
            Back to Symptoms
          </button>

          <div className="assessment-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`assessment-step ${i + 1 === currentStep ? 'active' : ''} ${i + 1 < currentStep ? 'completed' : ''}`}
              >
                <div className="assessment-step-dot">
                  {i + 1 < currentStep ? <Check size={13} strokeWidth={3} /> : step.num}
                </div>
                <span className="assessment-step-label">{step.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Title */}
        <motion.div
          className="assessment-step-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="assessment-step-badge">
            <Sparkles size={10} />
            STEP 03 / 04
          </div>
          <h1 className="assessment-step-heading">Review Your Assessment Profile</h1>
          <p className="assessment-step-desc">
            Verify patient vitals and reported symptoms before initializing machine learning inference.
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patient Vitals Card */}
          <motion.div variants={staggerItem} className="assessment-review-card">
            <div className="assessment-review-header">
              <div className="assessment-review-title">
                <div className="assessment-section-icon assessment-section-icon--primary">
                  <User size={14} />
                </div>
                Patient Vitals Profile
              </div>
              <button onClick={() => onNavigate('patient-details')} className="assessment-edit-btn">
                <Edit2 size={10} />
                Edit Vitals
              </button>
            </div>

            <div className="assessment-review-grid">
              <div>
                <p className="assessment-review-item-label">FULL NAME</p>
                <p className="assessment-review-item-value">{patientDetails.name || '—'}</p>
              </div>
              <div>
                <p className="assessment-review-item-label">AGE & GENDER</p>
                <p className="assessment-review-item-value">
                  {patientDetails.age ? `${patientDetails.age} yrs` : '—'} · {patientDetails.gender || '—'}
                </p>
              </div>
              <div>
                <p className="assessment-review-item-label">BLOOD GROUP</p>
                <p className="assessment-review-item-value" style={{ color: 'var(--color-accent)' }}>
                  {patientDetails.bloodGroup || 'O+'}
                </p>
              </div>
              <div>
                <p className="assessment-review-item-label">HEIGHT & WEIGHT</p>
                <p className="assessment-review-item-value">
                  {patientDetails.height ? `${patientDetails.height} cm` : '—'} · {patientDetails.weight ? `${patientDetails.weight} kg` : '—'}
                </p>
              </div>
              <div>
                <p className="assessment-review-item-label">DATE OF BIRTH</p>
                <p className="assessment-review-item-value">{patientDetails.dob || '—'}</p>
              </div>
            </div>
          </motion.div>

          {/* Selected Symptoms Card */}
          <motion.div variants={staggerItem} className="assessment-review-card">
            <div className="assessment-review-header">
              <div className="assessment-review-title">
                <div className="assessment-section-icon assessment-section-icon--health">
                  <Activity size={14} />
                </div>
                Reported Symptoms
                <span className="assessment-count-badge" style={{ padding: '2px 10px', fontSize: 10 }}>
                  <span className={`assessment-count-dot ${total > 0 ? 'active' : ''}`} />
                  {total}
                </span>
              </div>
              <button onClick={onEditSymptoms} className="assessment-edit-btn">
                <Edit2 size={10} />
                Modify
              </button>
            </div>

            {byCategory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byCategory.map(({ category, symptoms }) => (
                  <div key={category.id}>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      {category.label} ({symptoms.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {symptoms.map((s) => (
                        <span key={s.key} className="assessment-chip">
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontStyle: 'italic' }}>
                No symptoms selected yet.
              </p>
            )}
          </motion.div>

          {/* Action CTA */}
          <div className="assessment-actions" style={{ borderTop: 'none', paddingTop: 8 }}>
            <button
              onClick={() => onNavigate('symptom-categories')}
              className="assessment-btn-cancel"
            >
              Add More Symptoms
            </button>
            <motion.button
              onClick={() => onNavigate('analyzing')}
              disabled={total === 0}
              className="assessment-submit-btn"
              whileHover={total > 0 ? buttonHover : {}}
              whileTap={total > 0 ? buttonTap : {}}
            >
              <Sparkles size={14} />
              Run Health AI Analysis
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
