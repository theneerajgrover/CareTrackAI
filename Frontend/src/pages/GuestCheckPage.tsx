import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ArrowLeft, ArrowRight, Activity, Search, X, Check,
  AlertTriangle, Shield, Stethoscope, User, HeartPulse, Lock,
  RefreshCw, CheckCircle2, ChevronRight, Brain
} from 'lucide-react'
import { getAllSymptoms, getGuestStatus, runGuestPrediction } from '../services/api'
import type { Page, PredictionResponse, SelectedSymptom } from '../types'
import { fadeUp, staggerContainer, staggerItem, buttonHover, buttonTap } from '../motion/variants'

interface GuestCheckPageProps {
  onNavigate: (page: Page) => void
  onOpenAuth: (mode: 'login' | 'register') => void
}

const POPULAR_SYMPTOMS = [
  { key: 'fever', label: 'Fever' },
  { key: 'headache', label: 'Headache' },
  { key: 'cough', label: 'Cough' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'chest_pain', label: 'Chest Pain' },
  { key: 'sore_throat', label: 'Sore Throat' },
  { key: 'joint_pain', label: 'Joint Pain' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'shortness_of_breath', label: 'Shortness of Breath' },
  { key: 'skin_rash', label: 'Skin Rash' },
  { key: 'abdominal_pain', label: 'Abdominal Pain' },
]

export default function GuestCheckPage({ onNavigate, onOpenAuth }: GuestCheckPageProps) {
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [allSymptoms, setAllSymptoms] = useState<{ id: number; key: string; label: string; category: string }[]>([])
  const [search, setSearch] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [age, setAge] = useState('30')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [analyzing, setAnalyzing] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Verify 1-time guest limit on mount
  useEffect(() => {
    async function checkLimit() {
      try {
        const status = await getGuestStatus()
        if (status.used) {
          setAlreadyUsed(true)
        }
      } catch {
        // Continue if network check fails
      } finally {
        setCheckingStatus(false)
      }
    }

    async function loadSymptoms() {
      try {
        const list = await getAllSymptoms()
        setAllSymptoms(list)
      } catch {
        // Fallback to popular if list fails
      }
    }

    checkLimit()
    loadSymptoms()
  }, [])

  function toggleSymptom(key: string) {
    if (selectedSymptoms.includes(key)) {
      setSelectedSymptoms(selectedSymptoms.filter((k) => k !== key))
    } else {
      setSelectedSymptoms([...selectedSymptoms, key])
    }
  }

  async function handleAnalyze() {
    if (selectedSymptoms.length === 0) {
      setErrorMessage('Please select at least one symptom to analyze.')
      return
    }

    setAnalyzing(true)
    setErrorMessage(null)

    try {
      const res = await runGuestPrediction(selectedSymptoms, {
        name: 'Guest Patient',
        age,
        gender,
        dob: '',
        bloodGroup: 'O+',
        height: '',
        weight: '',
      })
      setPrediction(res)
      setAlreadyUsed(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Prediction failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredSymptoms = allSymptoms.filter((s) => {
    if (!search.trim()) return false
    const q = search.toLowerCase().trim()
    return s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
  }).slice(0, 10)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between pt-6 pb-12 px-4 sm:px-6 lg:px-8">
      {/* ── Top Header ── */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 mb-8">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ArrowLeft size={14} />
          Back to Home
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-[11px] font-bold tracking-wide uppercase shadow-xs">
          <Sparkles size={12} className="text-accent" />
          1-Time Free Check • No Login
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center">
        {checkingStatus ? (
          <div className="text-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Checking guest health assessment status...</p>
          </div>
        ) : alreadyUsed && !prediction ? (
          /* ── Free Trial Already Consumed State ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center shadow-xl relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <Lock size={26} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-3">
              1-Time Free Health Check Used
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
              You have already completed your free guest health check. To unlock unlimited symptom analyses, download official clinical reports, and track your health vitals, create a free account.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-accent text-white font-semibold text-xs shadow-md shadow-accent/20 hover:bg-accent-hover transition-all"
              >
                Create Free Account
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold text-xs transition-all"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        ) : prediction ? (
          /* ── Real Prediction Results View ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl"
          >
            {/* Banner */}
            <div className="flex items-center justify-between border-b border-border/80 pb-5 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  <CheckCircle2 size={12} />
                  AI Clinical Prediction Complete
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Diagnostic Findings</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-foreground block">Model Confidence</span>
                <span className="text-lg font-extrabold text-accent">
                  {prediction.predictions[0]?.confidence ? `${prediction.predictions[0].confidence.toFixed(1)}%` : 'Analyzed'}
                </span>
              </div>
            </div>

            {/* Top Predicted Condition Card */}
            {prediction.predictions[0] && (
              <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5 sm:p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Primary Predicted Condition
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      prediction.predictions[0].risk_level === 'critical'
                        ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                        : prediction.predictions[0].risk_level === 'high'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    }`}
                  >
                    {prediction.predictions[0].risk_level || 'Moderate'} Risk
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-foreground mb-3 capitalize">
                  {prediction.predictions[0].disease.replace(/_/g, ' ')}
                </h3>

                {/* Match bar */}
                <div className="w-full bg-border rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(prediction.predictions[0].confidence, 100)}%` }}
                  />
                </div>

                {prediction.predictions[0].doctor && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Stethoscope size={14} className="text-accent" />
                    <span>Recommended Specialist: <strong className="text-foreground">{prediction.predictions[0].doctor}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Differential Diagnostics */}
            {prediction.predictions.length > 1 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Differential Diagnostic Matches
                </h4>
                <div className="space-y-2">
                  {prediction.predictions.slice(1, 4).map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card text-xs font-medium"
                    >
                      <span className="capitalize text-foreground">{p.disease.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-accent font-semibold">{p.confidence.toFixed(1)}% match</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Guidance / Remedies */}
            {prediction.predictions[0]?.remedies && (
              <div className="mb-6 p-4 rounded-xl border border-border/80 bg-secondary/50">
                <h4 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <HeartPulse size={14} className="text-accent" />
                  Clinical Guidance & Next Steps
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {prediction.predictions[0].remedies}
                </p>
              </div>
            )}

            {/* Call to action banner */}
            <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-accent/5 p-5 rounded-2xl border-dashed">
              <div>
                <p className="text-xs font-bold text-foreground">Save your medical assessment report</p>
                <p className="text-[11px] text-muted-foreground">Create a free account to track longitudinal symptoms & download PDF reports.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-sm hover:bg-accent-hover transition-all"
                >
                  Create Free Account
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── Interactive Guest Check Form ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl"
          >
            {/* Top Heading */}
            <div className="mb-6 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold uppercase tracking-wider mb-2">
                <Brain size={12} />
                Gaussian Probabilistic AI Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Quick AI Health Check
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select your symptoms below to get an instant clinical AI evaluation across 713 disease classes.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Quick Demographics */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-secondary/30 border border-border/60">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Step 2: Symptom Search & Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-foreground mb-2">
                Search or Select Symptoms *
              </label>

              <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type to search symptoms (e.g. fever, headache, cough)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent shadow-xs"
                />

                {/* Autocomplete Dropdown */}
                {filteredSymptoms.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {filteredSymptoms.map((s) => {
                      const isSelected = selectedSymptoms.includes(s.key)
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => {
                            toggleSymptom(s.key)
                            setSearch('')
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-accent/10 text-accent font-semibold' : 'text-foreground hover:bg-secondary'
                          }`}
                        >
                          <span>{s.label}</span>
                          {isSelected && <Check size={13} className="text-accent" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Popular Symptom Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {POPULAR_SYMPTOMS.map((s) => {
                  const isSelected = selectedSymptoms.includes(s.key)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSymptom(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-accent text-white font-semibold shadow-xs'
                          : 'bg-secondary text-foreground/80 hover:bg-secondary-hover'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{s.label}
                    </button>
                  )
                })}
              </div>

              {/* Selected Symptoms Counter & Tags */}
              {selectedSymptoms.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-accent/[0.04] border border-accent/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                      Selected Health Signals ({selectedSymptoms.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSymptoms([])}
                      className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSymptoms.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-medium text-foreground capitalize"
                      >
                        {k.replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => toggleSymptom(k)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Run Analysis CTA */}
            <button
              type="button"
              disabled={analyzing || selectedSymptoms.length === 0}
              onClick={handleAnalyze}
              className="w-full h-12 rounded-2xl bg-accent text-white font-bold text-xs shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Running AI Clinical Diagnosis...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Analyze Symptoms (1 Free Check)
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="max-w-3xl w-full mx-auto text-center mt-6 text-[11px] text-muted-foreground flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">
          <Shield size={12} className="text-emerald-500" /> Secure HIPAA-Compliant Architecture
        </span>
        <span>•</span>
        <span>Gaussian Probabilistic Model</span>
      </div>
    </div>
  )
}
