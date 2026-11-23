import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Edit2, User, Activity, Sparkles, Check,
  ShieldCheck, AlertTriangle, Cpu, Brain, Heart, FileCheck
} from 'lucide-react'
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
  { num: 1, title: 'Patient Vitals', desc: 'Baseline priors' },
  { num: 2, title: 'Symptom Mapping', desc: 'Report signals' },
  { num: 3, title: 'Clinical Review', desc: 'Verify assessment' },
  { num: 4, title: 'AI Inference', desc: 'Gaussian NB' },
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
      <div className="assessment-container assessment-container--wide">
        {/* Topbar Navigation */}
        <motion.div className="assessment-topbar" variants={fadeUp} initial="hidden" animate="visible">
          <button type="button" onClick={() => onNavigate('symptom-categories')} className="assessment-exit-btn">
            <ArrowLeft size={14} />
            <span>Back to Symptoms</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="assessment-badge-triage">
              <Activity size={12} className="text-accent animate-pulse" />
              Step 3 · Pre-Inference Verification
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

        {/* 2-Column Split Desktop Layout */}
        <div className="assessment-grid-layout" style={{ gridTemplateColumns: 'minmax(0, 1.65fr) minmax(320px, 1fr)' }}>
          {/* Left Column: Verification Cards */}
          <div>
            {/* Step Heading */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-[10.5px] font-mono font-bold uppercase tracking-wider mb-2">
                <FileCheck size={12} />
                STEP 03 / 04 · PROFILE VERIFICATION
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight m-0">
                Review Your Clinical Assessment Profile
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1.5 mb-0 leading-relaxed">
                Confirm your reported vitals and symptoms before executing real-time Gaussian Naive Bayes probabilistic inference.
              </p>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-4">
              {/* Patient Vitals Card */}
              <motion.div variants={staggerItem} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-[15px] text-foreground m-0">
                        Patient Vitals & Demographics
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-mono">Calibrated Baseline Profile</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('patient-details')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 bg-accent-subtle text-accent text-[11.5px] font-bold hover:bg-accent hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 size={11} />
                    <span>Edit Vitals</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-6 text-[13px]">
                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Full Name</span>
                    <span className="font-bold text-foreground text-[14px]">{patientDetails.name || 'Anonymous Patient'}</span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Age & Gender</span>
                    <span className="font-bold text-foreground capitalize">
                      {patientDetails.age ? `${patientDetails.age} Years` : 'Not specified'} · {patientDetails.gender || 'Not specified'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Blood Group</span>
                    <span className="font-bold text-accent font-mono bg-accent-subtle px-2 py-0.5 rounded border border-accent/20 inline-block mt-0.5">
                      {patientDetails.bloodGroup || 'O+'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Height & Weight</span>
                    <span className="font-semibold text-foreground">
                      {patientDetails.height ? `${patientDetails.height} cm` : '—'} · {patientDetails.weight ? `${patientDetails.weight} kg` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Date of Birth</span>
                    <span className="font-semibold text-foreground">{patientDetails.dob || '—'}</span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-mono text-muted-foreground uppercase block font-semibold">Assessment Protocol</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                      Adult Comprehensive
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Selected Symptoms Card */}
              <motion.div variants={staggerItem} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                      <Activity size={16} />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-[15px] text-foreground m-0">
                        Reported Symptoms ({total})
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-mono">Mapped Feature Signals</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onEditSymptoms}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 bg-accent-subtle text-accent text-[11.5px] font-bold hover:bg-accent hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 size={11} />
                    <span>Modify Symptoms</span>
                  </button>
                </div>

                {byCategory.length > 0 ? (
                  <div className="flex flex-col gap-3.5">
                    {byCategory.map(({ category, symptoms }) => (
                      <div key={category.id} className="p-3 rounded-xl bg-slate-50/70 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono font-bold text-accent uppercase tracking-wider">
                            {category.label}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {symptoms.map((s) => (
                            <span
                              key={s.key}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-border text-foreground text-[11.5px] font-semibold shadow-2xs"
                            >
                              <Check size={10} className="text-accent" strokeWidth={3} />
                              {s.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground italic text-[13px]">
                    No symptoms selected yet. Please return to step 2 to report symptoms.
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>

          {/* Right Column: AI Inference Engine Calibration Sidebar */}
          <div className="assessment-sidebar sticky top-6">
            <div className="assessment-info-card assessment-info-card--primary" style={{ padding: '26px' }}>
              <div className="flex items-center gap-2 mb-3">
                <Brain size={18} className="text-accent" />
                <h3 className="font-extrabold text-[15px] text-foreground m-0">
                  ML Inference Pre-Flight
                </h3>
              </div>

              <p className="text-[12px] text-muted-foreground leading-relaxed m-0 mb-4">
                The Gaussian Naive Bayes engine is calibrated and ready to process your clinical feature vector.
              </p>

              {/* Telemetry checklist */}
              <div className="flex flex-col gap-2.5 pb-4 mb-5 border-b border-border/80 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Model Engine:</span>
                  <span className="font-bold text-foreground font-mono">Gaussian NB (Multivariate)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Disease Classes:</span>
                  <span className="font-bold text-foreground font-mono">713 Class Profiles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Active Signals:</span>
                  <span className="font-bold text-accent font-mono">{total} Signals / 377 Features</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Prior Risk Tuning:</span>
                  <span className="font-bold text-emerald-700 font-mono">Active (Age & Gender)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Safety Triage Flag:</span>
                  <span className="font-bold text-emerald-700 font-mono">Emergency Alerting ON</span>
                </div>
              </div>

              {/* Main Submit Action */}
              <motion.button
                type="button"
                onClick={() => onNavigate('analyzing')}
                disabled={total === 0}
                className="w-full h-12 rounded-xl bg-accent text-white font-extrabold text-[13.5px] shadow-lg shadow-accent/30 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                whileHover={total > 0 ? buttonHover : {}}
                whileTap={total > 0 ? buttonTap : {}}
              >
                <Sparkles size={16} />
                <span>Run Health AI Analysis</span>
                <ArrowRight size={14} />
              </motion.button>

              <button
                type="button"
                onClick={() => onNavigate('symptom-categories')}
                className="w-full mt-2.5 h-10 rounded-xl border border-border bg-white text-muted-foreground hover:text-foreground font-semibold text-[12px] transition-colors"
              >
                Add More Symptoms
              </button>
            </div>

            {/* Privacy & Safety Note */}
            <div className="assessment-info-card">
              <div className="assessment-info-title">
                <ShieldCheck size={16} className="text-accent" />
                <span>Clinical Integrity</span>
              </div>
              <p className="assessment-info-desc">
                Predictions are ranked by probabilistic likelihood. High severity matches are automatically cross-checked with doctor specialty routing and verified clinical remedial guidance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
