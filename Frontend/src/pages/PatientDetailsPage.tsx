import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, User, Ruler, Scale, Droplets, Calendar,
  Heart, Check, ShieldCheck, Sparkles, AlertCircle, Info, Activity
} from 'lucide-react'
import { fadeUp, buttonHover, buttonTap } from '../motion/variants'
import type { PatientDetails, Page } from '../types'
import '../styles/assessment.css'

interface PatientDetailsPageProps {
  details: PatientDetails
  onSave: (details: PatientDetails) => void
  onNavigate: (page: Page) => void
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']

const STEPS = [
  { num: 1, title: 'Patient Vitals', desc: 'Baseline priors' },
  { num: 2, title: 'Symptom Mapping', desc: 'Report signals' },
  { num: 3, title: 'Clinical Review', desc: 'Verify assessment' },
  { num: 4, title: 'AI Inference', desc: 'Gaussian NB' },
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

  // Real-time BMI calculation & physiological classification
  const bmiData = useMemo(() => {
    const h = parseFloat(form.height)
    const w = parseFloat(form.weight)
    if (h >= 50 && h <= 250 && w >= 20 && w <= 300) {
      const heightM = h / 100
      const score = parseFloat((w / (heightM * heightM)).toFixed(1))
      if (score < 18.5) {
        return { score, label: 'Underweight', color: '#0891b2', bg: '#ecfeff', text: '#0e7490', pct: 20 }
      } else if (score <= 24.9) {
        return { score, label: 'Healthy Weight', color: '#059669', bg: '#ecfdf5', text: '#065f46', pct: 50 }
      } else if (score <= 29.9) {
        return { score, label: 'Overweight', color: '#d97706', bg: '#fffbeb', text: '#92400e', pct: 75 }
      } else {
        return { score, label: 'Obese Range', color: '#dc2626', bg: '#fef2f2', text: '#991b1b', pct: 95 }
      }
    }
    return null
  }, [form.height, form.weight])

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
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      // Auto-compute age if DOB is changed and age is empty
      if (key === 'dob' && val && !prev.age) {
        const birthYear = new Date(val).getFullYear()
        const thisYear = new Date().getFullYear()
        if (birthYear > 1900 && birthYear <= thisYear) {
          next.age = String(thisYear - birthYear)
        }
      }
      return next
    })
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
        {/* Topbar Navigation */}
        <motion.div className="assessment-topbar" variants={fadeUp} initial="hidden" animate="visible">
          <button type="button" onClick={() => onNavigate('home')} className="assessment-exit-btn">
            <ArrowLeft size={14} />
            <span>Exit Assessment</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="assessment-badge-triage">
              <Activity size={12} className="text-accent animate-pulse" />
              Clinical Diagnostic Triage
            </span>
          </div>
        </motion.div>

        {/* 4-Step Stepper Card */}
        <motion.div
          className="assessment-stepper-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="assessment-steps">
            {STEPS.map((step) => {
              const isActive = step.num === currentStep
              const isCompleted = step.num < currentStep
              return (
                <div
                  key={step.num}
                  className={`assessment-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="assessment-step-dot">
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : step.num}
                  </div>
                  <div className="assessment-step-info">
                    <span className="assessment-step-number">STEP 0{step.num}</span>
                    <span className="assessment-step-title">{step.title}</span>
                    <span className="assessment-step-desc">{step.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* 2-Column Split Desktop Grid */}
        <div className="assessment-grid-layout">
          {/* Main Assessment Form */}
          <motion.div
            className="assessment-main-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-[10.5px] font-mono font-bold uppercase tracking-wider mb-2">
                <User size={12} />
                STEP 01 / 04 · CLINICAL INTAKE
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight m-0">
                Patient Details & Physiological Vitals
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1.5 mb-0 leading-relaxed">
                Provide baseline patient demographics to calibrate Bayesian disease prevalence priors and age-adjusted clinical risk scores.
              </p>
            </div>

            <form onSubmit={handleContinue}>
              {/* Group 1: Personal Demographics */}
              <div className="assessment-section-card">
                <div className="assessment-section-header">
                  <div className="assessment-section-icon assessment-section-icon--primary">
                    <User size={16} />
                  </div>
                  <span className="assessment-section-title">Personal Demographics</span>
                  <span className="assessment-section-subtitle">Epidemiological Baseline</span>
                </div>

                {/* Full Name */}
                <div className="assessment-field">
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
                  {errors.name && <p className="assessment-error"><AlertCircle size={12} /> {errors.name}</p>}
                </div>

                {/* Age & Date of Birth */}
                <div className="grid sm:grid-cols-2 gap-3.5 assessment-field">
                  <div>
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
                    {errors.age && <p className="assessment-error"><AlertCircle size={12} /> {errors.age}</p>}
                  </div>

                  <div>
                    <label className="assessment-label">
                      <Calendar size={13} className="text-muted-foreground" />
                      Date of Birth <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => set('dob', e.target.value)}
                      className="assessment-input"
                    />
                  </div>
                </div>

                {/* Biological Gender Tactile Segmented Selector */}
                <div className="assessment-field">
                  <label className="assessment-label">
                    Biological Gender <span className="text-[10px] text-muted-foreground font-normal">(Used for physiological risk curves)</span>
                  </label>
                  <div className="assessment-segmented-group">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other / Non-Binary' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('gender', opt.value)}
                        className={`assessment-segment-btn ${form.gender === opt.value ? 'active' : ''}`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group 2: Physiological Vitals & Blood Group */}
              <div className="assessment-section-card">
                <div className="assessment-section-header">
                  <div className="assessment-section-icon assessment-section-icon--health">
                    <Heart size={16} />
                  </div>
                  <span className="assessment-section-title">Physiological Vitals & Metrics</span>
                  <span className="assessment-section-subtitle">Physiological Prior Tuning</span>
                </div>

                {/* Height & Weight */}
                <div className="grid sm:grid-cols-2 gap-3.5 assessment-field">
                  <div>
                    <label className="assessment-label">
                      <Ruler size={13} className="text-muted-foreground" />
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 175"
                      value={form.height}
                      onChange={(e) => set('height', e.target.value)}
                      className="assessment-input"
                    />
                  </div>

                  <div>
                    <label className="assessment-label">
                      <Scale size={13} className="text-muted-foreground" />
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 70"
                      value={form.weight}
                      onChange={(e) => set('weight', e.target.value)}
                      className="assessment-input"
                    />
                  </div>
                </div>

                {/* Blood Group Tactile Matrix */}
                <div className="assessment-field">
                  <label className="assessment-label">
                    <Droplets size={13} className="text-muted-foreground" />
                    Blood Group
                  </label>
                  <div className="assessment-pills-grid">
                    {BLOOD_GROUPS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => set('bloodGroup', bg)}
                        className={`assessment-pill-btn ${form.bloodGroup === bg ? 'active' : ''}`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="assessment-actions">
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel Assessment
                </button>

                <motion.button
                  type="submit"
                  className="assessment-btn-primary"
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                >
                  <span>Continue to Symptom Selection</span>
                  <ArrowRight size={14} />
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* Contextual Clinical Intelligence Sidebar */}
          <motion.div
            className="assessment-sidebar"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            {/* Card 1: Why Vitals Matter */}
            <div className="assessment-info-card assessment-info-card--primary">
              <div className="assessment-info-title">
                <Sparkles size={16} className="text-accent" />
                <span>Why Baseline Vitals Matter</span>
              </div>
              <p className="assessment-info-desc">
                Our Bayesian inference model calibrates 713 clinical disease priors against your age and biological demographics.
                For example, pediatric conditions are filtered out for adults, and age-correlated cardiovascular risks are accurately stratified.
              </p>
            </div>

            {/* Card 2: Live Physiological Telemetry (Real-Time BMI Gauge) */}
            <div className="assessment-info-card">
              <div className="assessment-info-title">
                <Activity size={16} className="text-success" />
                <span>Real-Time Physiological Telemetry</span>
              </div>
              <p className="assessment-info-desc">
                Physiological vitals help calibrate systemic risk factors such as metabolic, circulatory, and cardiac disease baselines.
              </p>

              {bmiData ? (
                <div className="assessment-telemetry-box">
                  <div className="assessment-telemetry-metric">
                    <div>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase block font-semibold">Body Mass Index</span>
                      <span className="assessment-bmi-value">{bmiData.score} <span className="text-[12px] font-normal text-muted-foreground font-sans">kg/m²</span></span>
                    </div>
                    <span
                      className="assessment-bmi-badge"
                      style={{ background: bmiData.bg, color: bmiData.text, border: `1px solid ${bmiData.color}40` }}
                    >
                      <Check size={10} strokeWidth={3} />
                      {bmiData.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${bmiData.pct}%`, background: bmiData.color }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2 block font-mono">
                    Standard WHO adult BMI classification
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-border bg-slate-50/60 mt-3 text-center">
                  <p className="text-[11.5px] text-muted-foreground font-medium m-0">
                    Enter Height & Weight to compute live BMI telemetry and physiological risk calibration.
                  </p>
                </div>
              )}
            </div>

            {/* Card 3: Clinical Security & Privacy */}
            <div className="assessment-info-card">
              <div className="assessment-info-title">
                <ShieldCheck size={16} className="text-accent" />
                <span>Encrypted & Confidential</span>
              </div>
              <p className="assessment-info-desc">
                Your medical assessment session is encrypted end-to-end. We do not sell your health data or share clinical identifiers with third parties.
              </p>
            </div>

            {/* Card 4: Clinical Advisory */}
            <div className="assessment-info-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <div className="assessment-info-title" style={{ color: '#92400e' }}>
                <Info size={16} className="text-amber-600" />
                <span>Clinical Triage Scope</span>
              </div>
              <p className="assessment-info-desc" style={{ color: '#78350f' }}>
                CareTrack AI provides clinical triage assistance and health risk stratification. In case of acute medical emergencies, immediately contact local emergency medical services (911/112).
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
