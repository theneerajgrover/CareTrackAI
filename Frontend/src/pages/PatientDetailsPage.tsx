import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, User, Ruler, Scale, Droplets, Calendar, Heart, Check } from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem, buttonHover, buttonTap } from '../motion/variants'
import type { PatientDetails, Page } from '../types'
import '../styles/assessment.css'

interface PatientDetailsPageProps {
  details: PatientDetails
  onSave: (details: PatientDetails) => void
  onNavigate: (page: Page) => void
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']

const STEPS = [
  { num: 1, label: 'Vitals' },
  { num: 2, label: 'Symptoms' },
  { num: 3, label: 'Review' },
  { num: 4, label: 'Analysis' },
]

export default function PatientDetailsPage({ details, onSave, onNavigate }: PatientDetailsPageProps) {
  const [form, setForm] = useState<PatientDetails>({
    name: details.name || '',
    age: details.age || '',
    gender: details.gender || 'male',
    dob: details.dob || '',
    bloodGroup: details.bloodGroup || 'O+',
    height: details.height || '',
    weight: details.weight || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Patient name is required'
    if (!form.age.trim() || isNaN(Number(form.age)) || Number(form.age) <= 0) {
      errs.age = 'Valid age is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) {
      onSave(form)
      onNavigate('symptom-categories')
    }
  }

  function set(key: keyof PatientDetails, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const currentStep = 1

  return (
    <div className="assessment-bg">
      <div className="assessment-container">
        {/* Progress Header */}
        <motion.div className="assessment-progress-header" variants={fadeUp} initial="hidden" animate="visible">
          <button onClick={() => onNavigate('home')} className="assessment-exit-btn">
            <ArrowLeft size={13} />
            Exit Assessment
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
            <User size={10} />
            STEP 01 / 04
          </div>
          <h1 className="assessment-step-heading">Patient Details & Vitals</h1>
          <p className="assessment-step-desc">
            Enter the patient's basic vitals to calibrate disease prediction priors and age-specific baseline risks.
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          className="assessment-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <form onSubmit={handleContinue}>
            {/* Section: Personal Information */}
            <motion.div className="assessment-section" variants={staggerContainer} initial="hidden" animate="visible">
              <div className="assessment-section-header">
                <div className="assessment-section-icon assessment-section-icon--primary">
                  <User size={14} />
                </div>
                <span className="assessment-section-title">Personal Information</span>
              </div>

              <motion.div variants={staggerItem} className="assessment-field">
                <label className="assessment-label">
                  Full Name <span className="assessment-label-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={`assessment-input ${errors.name ? 'assessment-input--error' : ''}`}
                />
                {errors.name && <p className="assessment-error">{errors.name}</p>}
              </motion.div>

              <div className="assessment-grid-2">
                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">
                    Age (Years) <span className="assessment-label-required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 32"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                    className={`assessment-input ${errors.age ? 'assessment-input--error' : ''}`}
                  />
                  {errors.age && <p className="assessment-error">{errors.age}</p>}
                </motion.div>

                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">Biological Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => set('gender', e.target.value)}
                    className="assessment-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Non-Binary</option>
                  </select>
                </motion.div>
              </div>

              <div className="assessment-grid-2">
                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">
                    <Calendar size={11} style={{ opacity: 0.5 }} />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => set('dob', e.target.value)}
                    className="assessment-input"
                  />
                </motion.div>

                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">
                    <Droplets size={11} style={{ opacity: 0.5 }} />
                    Blood Group
                  </label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => set('bloodGroup', e.target.value)}
                    className="assessment-input"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </motion.div>
              </div>
            </motion.div>

            {/* Section: Physical & Medical */}
            <motion.div className="assessment-section" variants={staggerContainer} initial="hidden" animate="visible">
              <div className="assessment-section-header">
                <div className="assessment-section-icon assessment-section-icon--health">
                  <Heart size={14} />
                </div>
                <span className="assessment-section-title">Physical & Medical</span>
              </div>

              <div className="assessment-grid-2">
                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">
                    <Ruler size={11} style={{ opacity: 0.5 }} />
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={form.height}
                    onChange={(e) => set('height', e.target.value)}
                    className="assessment-input"
                  />
                </motion.div>

                <motion.div variants={staggerItem} className="assessment-field">
                  <label className="assessment-label">
                    <Scale size={11} style={{ opacity: 0.5 }} />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={form.weight}
                    onChange={(e) => set('weight', e.target.value)}
                    className="assessment-input"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Actions */}
            <div className="assessment-actions">
              <button type="button" onClick={() => onNavigate('home')} className="assessment-btn-cancel">
                Cancel
              </button>
              <motion.button
                type="submit"
                className="assessment-btn-primary"
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Continue to Symptoms
                <ArrowRight size={13} />
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
