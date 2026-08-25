import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { runPrediction } from '../services/api'
import type { Page, PatientDetails, SelectedSymptom, PredictionResponse } from '../types'

interface AnalyzingPageProps {
  symptomCount: number
  selectedSymptoms: Record<string, SelectedSymptom>
  patientDetails: PatientDetails
  onNavigate: (page: Page) => void
  onPredictionComplete: (data: PredictionResponse) => void
}

const STAGES = [
  { label: 'Reviewing symptoms', sub: 'Encoding your reported symptoms into 377-dimensional vector...' },
  { label: 'Probabilistic Inference', sub: 'Running Gaussian Naive Bayes model across 713 disease classes...' },
  { label: 'Clinical Risk Stratification', sub: 'Analyzing severity, emergency flags, and confidence scores...' },
  { label: 'Synthesizing AI Medical Report', sub: 'Compiling AI clinical remedies and consultation notes...' },
]

const NODE_ANGLES = [0, 60, 120, 180, 240, 300]

// Hard timeout: if no response after 90 seconds, show timeout state
const HARD_TIMEOUT_MS = 90_000

type AnalysisStatus = 'processing' | 'completed' | 'failed' | 'timed_out'

export default function AnalyzingPage({
  symptomCount,
  selectedSymptoms,
  patientDetails,
  onNavigate,
  onPredictionComplete,
}: AnalyzingPageProps) {
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<AnalysisStatus>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Stable refs for callbacks — prevents effect re-triggering on parent re-renders
  const onNavigateRef = useRef(onNavigate)
  const onPredictionCompleteRef = useRef(onPredictionComplete)
  const hasFiredRef = useRef(false)
  const hasNavigatedRef = useRef(false)

  // Keep refs in sync with latest props
  useEffect(() => { onNavigateRef.current = onNavigate }, [onNavigate])
  useEffect(() => { onPredictionCompleteRef.current = onPredictionComplete }, [onPredictionComplete])

  // 1. Kick off real backend API call strictly once
  useEffect(() => {
    if (hasFiredRef.current) return
    hasFiredRef.current = true

    let isMounted = true
    const symptomKeys = Object.keys(selectedSymptoms)
    const startTime = Date.now()

    console.log('[REPORT] REPORT_REQUEST_STARTED', { symptoms: symptomKeys.length })

    // Hard timeout guard
    const hardTimeout = setTimeout(() => {
      if (isMounted && !hasNavigatedRef.current) {
        console.warn('[REPORT] REPORT_TIMEOUT after', HARD_TIMEOUT_MS, 'ms')
        setStatus('timed_out')
        setErrorMessage('Report generation is taking longer than expected. Your report may still be processing in the background.')
      }
    }, HARD_TIMEOUT_MS)

    async function callApi() {
      try {
        const res = await runPrediction(symptomKeys, patientDetails)
        const elapsed = Date.now() - startTime

        console.log('[REPORT] REPORT_REQUEST_RESPONSE', {
          prediction_id: res.prediction_id,
          num_predictions: res.predictions?.length,
          elapsed_ms: elapsed,
        })

        if (!isMounted || hasNavigatedRef.current) {
          console.log('[REPORT] Component unmounted before navigation, report saved in DB')
          return
        }

        // Validate response
        if (!res || !res.predictions || !Array.isArray(res.predictions)) {
          throw new Error('Invalid response from the analysis engine. Please try again.')
        }

        // Success: fast-forward animation and navigate
        setProgress(100)
        setStage(3)
        setStatus('completed')

        console.log('[REPORT] REPORT_COMPLETED', { prediction_id: res.prediction_id })

        // Brief visual completion pause, then transition
        setTimeout(() => {
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true
            console.log('[REPORT] REPORT_NAVIGATING to report page')
            onPredictionCompleteRef.current(res)
            onNavigateRef.current('report')
            console.log('[REPORT] REPORT_DISPLAYED')
          }
        }, 300)

      } catch (err: any) {
        const elapsed = Date.now() - startTime
        console.error('[REPORT] REPORT_ERROR', { error: err.message, elapsed_ms: elapsed })

        if (isMounted && !hasNavigatedRef.current) {
          setStatus('failed')
          setErrorMessage(err.message || 'Failed to analyze symptoms with the backend.')
        }
      }
    }

    callApi()

    return () => {
      isMounted = false
      clearTimeout(hardTimeout)
    }
  }, []) // Stable deps only — refs handle latest values

  // 2. Drive multi-stage visual loader with fast, responsive intervals
  useEffect(() => {
    if (status !== 'processing') return

    const stageTime = 350
    const stageTimers = STAGES.map((_, i) => setTimeout(() => setStage(i), i * stageTime))
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p < 85) return p + 2.2
        if (p < 95) return p + 0.4
        return p
      })
    }, 25)

    return () => {
      stageTimers.forEach(clearTimeout)
      clearInterval(progressTimer)
    }
  }, [status])

  function polar(angleDeg: number, r: number) {
    const a = (angleDeg * Math.PI) / 180
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) }
  }

  // Error state: API failure
  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-critical/20 text-critical flex items-center justify-center mb-4">
          <AlertCircle size={26} />
        </div>
        <h2 className="text-xl font-bold mb-2">Analysis Could Not Complete</h2>
        <p className="text-[13px] text-white/70 max-w-md mb-6 leading-relaxed">{errorMessage}</p>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('review')}
            className="px-5 py-2 rounded-full border border-white/20 text-[12px] font-medium text-white hover:bg-white/10"
          >
            Review Symptoms
          </button>
          <button
            onClick={() => {
              // Reset state and retry
              hasFiredRef.current = false
              hasNavigatedRef.current = false
              setStatus('processing')
              setProgress(0)
              setStage(0)
              setErrorMessage(null)
              // Re-trigger by forcing remount
              window.location.reload()
            }}
            className="px-5 py-2 rounded-full bg-accent text-white text-[12px] font-semibold flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Timeout state: backend may still be processing
  if (status === 'timed_out') {
    return (
      <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Clock size={26} />
        </div>
        <h2 className="text-xl font-bold mb-2">Taking Longer Than Expected</h2>
        <p className="text-[13px] text-white/70 max-w-md mb-6 leading-relaxed">
          {errorMessage || 'Your analysis is still processing. The report may appear in your History once completed.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('history')}
            className="px-5 py-2 rounded-full border border-white/20 text-[12px] font-medium text-white hover:bg-white/10"
          >
            View History
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-full bg-accent text-white text-[12px] font-semibold flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-foreground flex flex-col items-center justify-center px-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background Texture & Glow */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(67,56,202,0.25) 0%, transparent 70%)' }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Header */}
        <motion.div className="flex items-center justify-center gap-2 mb-10" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Activity size={14} className="text-white" />
          </div>
          <span className="font-bold text-white/80 text-[13px]">CareTrack AI · Gaussian NB Engine</span>
        </motion.div>

        {/* Central 3D Network Visualization */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <svg className="absolute inset-0" width="192" height="192" viewBox="0 0 200 200">
            <motion.circle
              cx={100}
              cy={100}
              r={80}
              fill="none"
              stroke="rgba(99,102,241,0.25)"
              strokeWidth={1.2}
              strokeDasharray="4 8"
              animate={{ rotate: 360 }}
              style={{ transformOrigin: '100px 100px' }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            />

            {NODE_ANGLES.map((angle, i) => {
              const p = polar(angle, 78)
              return (
                <motion.line
                  key={i}
                  x1={100}
                  y1={100}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(99,102,241,0.35)"
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  animate={{ opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25 }}
                />
              )
            })}

            {NODE_ANGLES.map((angle, i) => {
              const p = polar(angle, 78)
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={12} fill="rgba(67,56,202,0.18)" stroke="rgba(99,102,241,0.4)" strokeWidth={1} />
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    fill="#818CF8"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
                  />
                </g>
              )
            })}
          </svg>

          {/* Central Core */}
          <div className="absolute inset-[64px]">
            <motion.div
              className="w-full h-full rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(99,102,241,0.7) 0%, rgba(67,56,202,0.5) 70%)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Activity size={18} className="text-white" />
            </motion.div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white tracking-tight mb-2">
          Analyzing {symptomCount} Health Signal{symptomCount !== 1 ? 's' : ''}
        </h1>

        {/* Dynamic stage subtitle */}
        <div className="h-8 flex items-center justify-center mb-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              className="text-[12px] text-white/60 text-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {STAGES[stage].sub}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] text-white/30 font-mono">
          Model: Gaussian NB · 713 Diseases · {status === 'completed' ? 'Analysis complete' : 'Processing...'}
        </p>
      </div>
    </motion.div>
  )
}

