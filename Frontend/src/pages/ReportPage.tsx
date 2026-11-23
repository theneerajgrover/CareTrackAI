import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Shield, AlertTriangle, AlertCircle, RotateCcw,
  Sparkles, ArrowLeft, User, HeartPulse, Stethoscope,
  CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, Printer, Check, Download, RefreshCw
} from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem, buttonHover, buttonTap } from '../motion/variants'
import { downloadPredictionPdf } from '../services/api'
import type { PatientDetails, SelectedSymptom, Page, PredictionResponse } from '../types'

interface ReportPageProps {
  patientDetails: PatientDetails
  selectedSymptoms: Record<string, SelectedSymptom>
  predictionData: PredictionResponse | null
  returnPage?: Page
  onNavigate: (page: Page) => void
  onStartNew: () => void
}

export default function ReportPage({
  patientDetails,
  selectedSymptoms,
  predictionData,
  returnPage = 'home',
  onNavigate,
  onStartNew,
}: ReportPageProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const predictions = predictionData?.predictions || []
  const symptomsList = Object.values(selectedSymptoms)

  async function handleDownloadPdf() {
    if (isDownloading) return
    const predictionId = predictionData?.prediction_id
    if (!predictionId) {
      setDownloadError('Assessment reference not found. Please try re-running the assessment.')
      return
    }
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const blob = await downloadPredictionPdf(predictionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CareTrack_Report_${predictionId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      console.error('[PDF_DOWNLOAD_ERROR]', err)
      setDownloadError(err.message || 'Failed to download medical report PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const timestamp = new Date().toLocaleString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Risk styling with high-contrast text and clean borders
  function getRiskBadge(risk: string = 'low') {
    switch (risk.toLowerCase()) {
      case 'critical':
        return {
          label: 'Critical',
          badgeClass: 'bg-red-100 border border-red-400 text-red-950 font-extrabold',
          dotClass: 'bg-red-600',
        }
      case 'high':
        return {
          label: 'High',
          badgeClass: 'bg-rose-100 border border-rose-400 text-rose-950 font-extrabold',
          dotClass: 'bg-rose-600',
        }
      case 'moderate':
      case 'medium':
        return {
          label: 'Medium',
          badgeClass: 'bg-amber-100 border border-amber-400 text-amber-950 font-extrabold',
          dotClass: 'bg-amber-600',
        }
      default:
        return {
          label: 'Low',
          badgeClass: 'bg-emerald-100 border border-emerald-400 text-emerald-950 font-extrabold',
          dotClass: 'bg-emerald-600',
        }
    }
  }

  const hasHighRisk = predictions.some(
    (p) => p.risk_level === 'critical' || p.risk_level === 'high'
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-8 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Action Bar (Hidden on print) */}
        <motion.div
          className="print:hidden flex items-center justify-between gap-4 mb-6"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <button
            onClick={() => onNavigate(returnPage)}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-950 text-[13px] font-bold transition-colors"
          >
            <ArrowLeft size={16} />
            {returnPage === 'history' ? 'Back to History' : 'Back to Home'}
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <motion.button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[12px] shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-60 cursor-pointer"
              whileHover={!isDownloading ? buttonHover : {}}
              whileTap={!isDownloading ? buttonTap : {}}
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download Medical Report (PDF)
                </>
              )}
            </motion.button>

            <motion.button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-300 bg-white text-slate-800 font-bold text-[12px] hover:bg-slate-50 transition-colors shadow-sm"
              whileTap={buttonTap}
            >
              <Printer size={14} className="text-slate-600" />
              Print View
            </motion.button>

            <motion.button
              onClick={onStartNew}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-300 bg-white text-slate-800 font-bold text-[12px] hover:bg-slate-50 transition-colors shadow-sm"
              whileHover={buttonHover}
              whileTap={buttonTap}
            >
              <RotateCcw size={13} />
              New Check
            </motion.button>
          </div>
        </motion.div>

        {downloadError && (
          <div className="print:hidden mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="text-red-500 hover:text-red-700 font-bold text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Main Printable Medical Report Document ── */}
        <motion.div
          className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-10 shadow-md print:shadow-none print:border-none print:p-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* 1. Medical Document Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-200">
            <div className="flex items-center gap-3.5">
              {/* Brand Activity Pulse Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/25 p-2.5 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4338CA, #6366F1)' }}
              >
                <Activity size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                  CareTrack <span className="text-indigo-600">AI</span>
                </h1>
                <p className="text-[12px] font-bold text-indigo-700 tracking-wider uppercase font-mono mt-0.5">
                  Medical Health Report
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-[11.5px] text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
              <span className="block font-semibold">Generated: {timestamp}</span>
              <span className="block text-indigo-700 font-bold mt-0.5">CareTrack Clinical AI Engine</span>
            </div>
          </div>

          {/* 2. Patient Information Section */}
          <div className="mt-8">
            <h2 className="text-[14px] font-mono font-bold uppercase tracking-wider text-indigo-700 mb-3.5 flex items-center gap-2">
              <User size={16} />
              Patient Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-[13.5px]">
              <div className="flex items-center justify-between sm:justify-start gap-3 border-b sm:border-none border-slate-200 pb-2 sm:pb-0">
                <span className="text-slate-600 font-semibold w-28">Name:</span>
                <span className="font-extrabold text-slate-950">{patientDetails.name || 'Anonymous Patient'}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 border-b sm:border-none border-slate-200 pb-2 sm:pb-0">
                <span className="text-slate-600 font-semibold w-28">Age:</span>
                <span className="font-extrabold text-slate-950">{patientDetails.age ? `${patientDetails.age} Years` : 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 border-b sm:border-none border-slate-200 pb-2 sm:pb-0">
                <span className="text-slate-600 font-semibold w-28">Gender:</span>
                <span className="font-extrabold text-slate-950 capitalize">{patientDetails.gender || 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 border-b sm:border-none border-slate-200 pb-2 sm:pb-0">
                <span className="text-slate-600 font-semibold w-28">Blood Group:</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">{patientDetails.bloodGroup || 'O+'}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 border-b sm:border-none border-slate-200 pb-2 sm:pb-0">
                <span className="text-slate-600 font-semibold w-28">Height:</span>
                <span className="font-extrabold text-slate-950">{patientDetails.height ? `${patientDetails.height} cm` : 'Not specified'}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="text-slate-600 font-semibold w-28">Weight:</span>
                <span className="font-extrabold text-slate-950">{patientDetails.weight ? `${patientDetails.weight} kg` : 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* 3. Reported Symptoms Section */}
          <div className="mt-8">
            <h2 className="text-[14px] font-mono font-bold uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-2">
              <Activity size={16} />
              Reported Symptoms
            </h2>

            {symptomsList.length > 0 ? (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {symptomsList.map((s) => (
                    <span
                      key={s.key}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold text-[12.5px]"
                    >
                      <CheckCircle2 size={13} className="text-indigo-600" />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-500 italic">No symptoms reported.</p>
            )}
          </div>

          {/* 4. High-Risk Doctor Consultation Alert Banner */}
          {hasHighRisk && (
            <div className="mt-8 rounded-2xl border-2 border-red-500 bg-red-50 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-black text-[15px] text-red-950 tracking-tight">
                  Doctor Consultation Recommended
                </h4>
                <p className="text-[13px] font-semibold leading-relaxed text-red-900 mt-1">
                  One or more detected conditions has high clinical severity. Please share this report with your healthcare provider or visit an urgent care facility for formal in-person examination.
                </p>
              </div>
            </div>
          )}

          {/* 5. Possible Conditions Section */}
          <div className="mt-8">
            <h2 className="text-[14px] font-mono font-bold uppercase tracking-wider text-indigo-700 mb-4 flex items-center gap-2">
              <Stethoscope size={16} />
              Possible Conditions & Probabilistic Matches
            </h2>

            {predictions.length > 0 ? (
              <div className="flex flex-col gap-4">
                {predictions.map((p, idx) => {
                  const badge = getRiskBadge(p.risk_level)
                  const isExpanded = expandedIndex === idx

                  return (
                    <div
                      key={idx}
                      className="border-2 border-slate-200 bg-white rounded-2xl hover:border-indigo-400 transition-all overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                        className="w-full p-4 sm:p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[12px] font-black font-mono shadow-sm">
                              {p.rank}
                            </span>
                            <h3 className="font-black text-[16px] sm:text-[17px] text-slate-950 capitalize tracking-tight">
                              {p.disease}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-[12.5px]">
                            <span className="font-mono text-slate-700 bg-white border border-slate-300 px-3 py-0.5 rounded-full font-bold">
                              Match: <strong className="text-slate-950 font-black">{p.confidence.toFixed(1)}%</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full ${badge.badgeClass}`}>
                              <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
                              Risk: {badge.label}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="bg-indigo-50 border border-indigo-300 text-indigo-950 font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5">
                              <Stethoscope size={13} className="text-indigo-600" />
                              Doctor: {p.doctor || 'General Physician'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center text-indigo-700 font-bold text-[12.5px] hover:underline">
                          <span>{isExpanded ? 'Hide Details' : 'View Clinical Guidance'}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Expandable Care Guidance & Advisory */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-5 border-t-2 border-slate-200 bg-white flex flex-col gap-4"
                          >
                            {/* Clinical Safety Warning Card */}
                            {p.warning && (
                              <div className="p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-950 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5 text-red-950 font-black text-[13.5px]">
                                  <AlertCircle size={18} className="text-red-600" />
                                  Clinical Safety Advisory:
                                </div>
                                <p className="text-red-950 font-semibold text-[13px] leading-relaxed">
                                  {p.warning}
                                </p>
                              </div>
                            )}

                            {/* Home Remedies / Care Guidance Card */}
                            {p.remedies && (
                              <div className="p-4 sm:p-5 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 shadow-sm">
                                <h4 className="font-black text-indigo-950 text-[14px] mb-2 flex items-center gap-2">
                                  <Sparkles size={16} className="text-indigo-600" />
                                  AI Supportive Care & Home Guidance:
                                </h4>
                                <div className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line text-[13px] bg-white p-4 rounded-xl border border-indigo-200/80 shadow-inner">
                                  {p.remedies}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500 italic">No conditions matched.</p>
            )}
          </div>

          {/* 6. Confidential Medical Footer */}
          <div className="mt-12 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11.5px] font-mono text-slate-600">
            <div>
              <p className="font-extrabold text-slate-950">© CareTrackAI · Confidential Medical Report</p>
              <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                <a
                  href="https://theneerajgrover.github.io/CareTrackAI/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  https://theneerajgrover.github.io/CareTrackAI/
                </a>
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">This report is generated for health triage assistance and should be verified with a certified clinician.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-300">
              Page 1 of 1
            </span>
          </div>
        </motion.div>

        {/* Bottom CTA bar (print:hidden) */}
        <div className="print:hidden mt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <motion.button
            onClick={onStartNew}
            className="w-full sm:w-auto h-11 px-8 rounded-full border-2 border-slate-300 bg-white text-slate-900 font-bold text-[13px] hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
            whileHover={buttonHover}
            whileTap={buttonTap}
          >
            <RotateCcw size={15} />
            Start New Health Check
          </motion.button>
          <motion.button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto h-11 px-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            whileHover={!isDownloading ? buttonHover : {}}
            whileTap={!isDownloading ? buttonTap : {}}
          >
            {isDownloading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={15} />
                Download Medical Report (PDF)
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
