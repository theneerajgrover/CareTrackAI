import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, User, Ruler, Scale, Droplets, Calendar,
  Heart, Check, ShieldCheck, Sparkles, AlertCircle, Info, Activity
} from 'lucide-react'
import { buttonHover, buttonTap } from '../motion/variants'
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
      {/* ── Stationary Slim Header Bar with Integrated Stepper ── */}
      <header className="assessment-topbar">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="assessment-exit-btn"
            title="Exit assessment and return home"
          >
            <ArrowLeft size={13} />
            <span>Exit Assessment</span>
          </button>

          <span className="hidden sm:inline-flex assessment-badge-triage">
            <Activity size={12} className="text-accent animate-pulse" />
            Clinical Diagnostic Triage
          </span>
        </div>

        {/* Integrated 4-Step Progress Indicator */}
        <nav className="assessment-stepper" aria-label="Assessment progress">
          {STEPS.map((step) => {
            const isActive = step.num === currentStep
            const isCompleted = step.num < currentStep
            return (
              <div
                key={step.num}
                className={`assessment-stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="assessment-stepper-dot">
                  {isCompleted ? <Check size={11} strokeWidth={3} /> : step.num}
                </div>
                <div className="assessment-stepper-meta">
                  <span className="assessment-stepper-num">STEP 0{step.num}</span>
                  <span className="assessment-stepper-text">{step.title}</span>
                </div>
                {step.num < 4 && <div className="assessment-stepper-line" />}
              </div>
            )
          })}
        </nav>

        {/* Stage Status Tag */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md hidden md:inline-flex items-center gap-1.5">
            <ShieldCheck size={12} />
            <span>Stage 01 / 04</span>
          </span>
        </div>
      </header>

      {/* ── Main Viewport-Contained Assessment Container ── */}
      <main className="assessment-container">
        <div className="assessment-grid-layout">
          {/* ── LEFT COLUMN: Patient Details Form ── */}
          <div className="assessment-main-card">
            {/* Compact Form Header */}
            <div className="assessment-card-header">
              <div>
                <div className="inline-flex items-center gap-1.5 text-accent text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5">
                  <User size={11} />
                  <span>Section 1 · Baseline Calibration</span>
                </div>
                <h1 className="text-lg md:text-xl font-extrabold text-foreground tracking-tight m-0">
                  Patient Details & Physiological Vitals
                </h1>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
                * Required fields
              </span>
            </div>

            <form onSubmit={handleContinue} className="assessment-form-body">
              <div>
                {/* Section A: Personal Information */}
                <div className="assessment-section-group">
                  <div className="assessment-section-label">
                    <User size={13} className="text-accent" />
                    <span>Personal Demographics</span>
                    <span className="assessment-section-pill">Epidemiological Priors</span>
                  </div>

                  <div className="assessment-form-grid">
                    {/* Full Name (Full width) */}
                    <div className="assessment-field col-span-full">
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
                      {errors.name && (
                        <p className="assessment-error">
                          <AlertCircle size={11} /> {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Age (Half width) */}
                    <div className="assessment-field">
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
                      {errors.age && (
                        <p className="assessment-error">
                          <AlertCircle size={11} /> {errors.age}
                        </p>
                      )}
                    </div>

                    {/* Date of Birth (Half width) */}
                    <div className="assessment-field">
                      <label className="assessment-label">
                        <Calendar size={12} className="text-muted-foreground" />
                        <span>Date of Birth</span>
                        <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => set('dob', e.target.value)}
                        className="assessment-input"
                      />
                    </div>

                    {/* Biological Gender (Full width segmented control) */}
                    <div className="assessment-field col-span-full">
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
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Physiological Vitals */}
                <div className="assessment-section-group">
                  <div className="assessment-section-label">
                    <Heart size={13} className="text-emerald-600" />
                    <span>Physiological Vitals</span>
                    <span className="assessment-section-pill">Metabolic Calibration</span>
                  </div>

                  <div className="assessment-form-grid">
                    {/* Height (Half width) */}
                    <div className="assessment-field">
                      <label className="assessment-label">
                        <Ruler size={12} className="text-muted-foreground" />
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

                    {/* Weight (Half width) */}
                    <div className="assessment-field">
                      <label className="assessment-label">
                        <Scale size={12} className="text-muted-foreground" />
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

                    {/* Blood Group (Full width compact pill selector) */}
                    <div className="assessment-field col-span-full">
                      <label className="assessment-label">
                        <Droplets size={12} className="text-rose-500" />
                        <span>Blood Group</span>
                        <span className="text-[10px] text-muted-foreground font-normal">(Clinical serology)</span>
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
                </div>
              </div>

              {/* ── DOCKED BOTTOM ACTIONS (Always in Viewport) ── */}
              <div className="assessment-actions">
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="assessment-btn-cancel"
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
          </div>

          {/* ── RIGHT COLUMN: Supporting Information Panel ── */}
          <aside className="assessment-sidebar">
            {/* Real-Time Physiological Telemetry (Live BMI Gauge) */}
            <div className="assessment-info-card">
              <div className="assessment-info-header">
                <div className="assessment-info-icon assessment-info-icon--health">
                  <Activity size={14} />
                </div>
                <div>
                  <h3 className="assessment-info-title">Real-Time Physiological Telemetry</h3>
                  <span className="assessment-info-sub">Computed live from height & weight</span>
                </div>
              </div>

              {bmiData ? (
                <div className="assessment-telemetry-box">
                  <div className="assessment-telemetry-metric">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">Body Mass Index</span>
                      <div className="assessment-bmi-value">
                        {bmiData.score} <span className="text-[11px] font-normal text-muted-foreground font-sans">kg/m²</span>
                      </div>
                    </div>
                    <span
                      className="assessment-bmi-badge"
                      style={{ background: bmiData.bg, color: bmiData.text, border: `1px solid ${bmiData.color}40` }}
                    >
                      <Check size={10} strokeWidth={3} />
                      {bmiData.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${bmiData.pct}%`, background: bmiData.color }}
                    />
                  </div>
                  <span className="text-[9.5px] text-muted-foreground mt-1.5 block font-mono">
                    Standard WHO adult BMI classification
                  </span>
                </div>
              ) : (
                <div className="assessment-telemetry-empty">
                  <Scale size={15} className="text-muted-foreground/60 mb-1 mx-auto" />
                  <p className="text-[11px] text-muted-foreground m-0">
                    Enter Height and Weight to calibrate real-time BMI & metabolic prior weights.
                  </p>
                </div>
              )}
            </div>

            {/* Why Baseline Vitals Matter */}
            <div className="assessment-info-card assessment-info-card--primary">
              <div className="assessment-info-header">
                <div className="assessment-info-icon assessment-info-icon--primary">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="assessment-info-title">Why Baseline Vitals Matter</h3>
                  <span className="assessment-info-sub">Gaussian Naive Bayes Calibration</span>
                </div>
              </div>
              <p className="assessment-info-desc">
                CareTrackAI calibrates 713 disease priors against your demographics.
                Age and physiological baselines adjust pre-test probabilities and filter out statistically improbable conditions.
              </p>
            </div>

            {/* Clinical Security & Triage Dual Pill Block */}
            <div className="assessment-safety-grid">
              <div className="assessment-safety-pill">
                <ShieldCheck size={13} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[11px] text-foreground block">Encrypted & Private</strong>
                  <span className="text-[10px] text-muted-foreground block leading-tight">Zero-identifier session encryption</span>
                </div>
              </div>

              <div className="assessment-safety-pill assessment-safety-pill--warning">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[11px] text-amber-900 block">Triage Scope</strong>
                  <span className="text-[10px] text-amber-700 block leading-tight">Call 911/112 in acute emergencies</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
