import { useState, useEffect } from 'react'
import {
  Activity, Calendar, ArrowRight, Search, RefreshCw, AlertCircle,
  Sparkles, ShieldCheck, Stethoscope, Clock, CheckCircle2, ChevronRight,
  SlidersHorizontal, X, ArrowUpDown, GitCompare, HeartPulse, User,
  AlertTriangle, Info, Download, Printer, FileText, Eye
} from 'lucide-react'
import { getPredictionHistory, getPredictionDetails, downloadPredictionPdf, formatPatientReportFilename } from '../../services/api'
import type { HistoryItem, PredictionResponse, PatientDetails, SelectedSymptom } from '../../types'

interface Props {
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientAnalysesPage({ onStartHealthCheck, onOpenReportById }: Props) {
  const [analyses, setAnalyses] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedRisk, setSelectedRisk] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'confidence'>('newest')

  // Selected assessment IDs for side-by-side comparison (max 2)
  const [selectedToCompare, setSelectedToCompare] = useState<string[]>([])
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
  const [comparisonData, setComparisonData] = useState<{ a: any; b: any } | null>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)

  // Inspection Drawer/Modal for a single analysis
  const [activeAnalysisDetail, setActiveAnalysisDetail] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // PDF Preview and Direct Action State
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  // Cleanup blob URL when preview modal closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
      }
    }
  }, [previewBlobUrl])

  async function loadAnalyses() {
    setLoading(true)
    setError(null)
    try {
      const data = await getPredictionHistory()
      setAnalyses(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load analyses.')
    } finally {
      setLoading(false)
    }
  }

  // Handle PDF Preview in Modal
  async function handlePreviewPdf(item: HistoryItem) {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setPreviewItem(item)
    setLoadingPreview(true)
    try {
      const blob = await downloadPredictionPdf(item.id)
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
    } catch (err: any) {
      setError(err.message || 'Failed to load document preview.')
      setPreviewItem(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  function handleClosePreview() {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setPreviewItem(null)
  }

  // Handle Direct Authenticated PDF Download
  async function handleDownloadPdf(item: HistoryItem) {
    setActionInProgress(`download-${item.id}`)
    try {
      const blob = await downloadPredictionPdf(item.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = formatPatientReportFilename(item.patient_name || 'patient')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Failed to download report PDF.')
    } finally {
      setActionInProgress(null)
    }
  }

  // Handle Direct Document Print via Hidden Iframe
  async function handlePrintPdf(item: HistoryItem) {
    setActionInProgress(`print-${item.id}`)
    try {
      const blob = await downloadPredictionPdf(item.id)
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to prepare document for printing.')
    } finally {
      setActionInProgress(null)
    }
  }

  // Open single analysis inspection drawer
  async function handleInspectAnalysis(id: string) {
    setLoadingDetail(true)
    try {
      const detail = await getPredictionDetails(id)
      setActiveAnalysisDetail(detail)
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve assessment details.')
    } finally {
      setLoadingDetail(false)
    }
  }

  // Toggle selection for comparison (max 2)
  function handleToggleCompare(id: string) {
    setSelectedToCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      if (prev.length >= 2) {
        return [prev[1], id] // shift window to latest 2
      }
      return [...prev, id]
    })
  }

  // Launch comparison modal
  async function handleOpenComparison() {
    if (selectedToCompare.length !== 2) return
    setLoadingComparison(true)
    setComparisonModalOpen(true)
    try {
      const [resA, resB] = await Promise.all([
        getPredictionDetails(selectedToCompare[0]),
        getPredictionDetails(selectedToCompare[1]),
      ])
      setComparisonData({ a: resA, b: resB })
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments for comparison.')
      setComparisonModalOpen(false)
    } finally {
      setLoadingComparison(false)
    }
  }

  // Filter and sort analyses
  const filtered = analyses
    .filter((a) => {
      if (selectedRisk !== 'all') {
        const itemRisk = (a.risk_level || 'low').toLowerCase()
        if (itemRisk !== selectedRisk.toLowerCase()) return false
      }
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (a.top_disease && a.top_disease.toLowerCase().includes(q)) ||
        (a.patient_name && a.patient_name.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'confidence') {
        return (b.top_confidence || 0) - (a.top_confidence || 0)
      }
      return 0
    })

  // Summary Metrics
  const totalCount = analyses.length
  const latestAnalysis = analyses[0]
  const avgSymptoms = totalCount > 0
    ? Math.round(analyses.reduce((acc, curr) => acc + (curr.symptom_ids?.length || 0), 0) / totalCount)
    : 0

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold tracking-wide uppercase">
              <Activity size={12} />
              Analytical Workspace
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold">
              <ShieldCheck size={11} />
              Longitudinal Health History
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            My Health Analyses
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Longitudinal record of AI clinical assessments, probabilistic findings, and symptom progression.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadAnalyses}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Refresh Analyses"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-accent' : ''} />
          </button>
          <button
            type="button"
            onClick={onStartHealthCheck}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-md shadow-accent/20 hover:bg-accent-hover transition-all"
          >
            <Sparkles size={14} />
            New Assessment
          </button>
        </div>
      </div>

      {/* ── Analytical Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Total Assessments
            </span>
            <span className="text-xl font-extrabold text-foreground tracking-tight">
              {totalCount}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <HeartPulse size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Latest Condition
            </span>
            <span className="text-sm font-extrabold text-foreground truncate block capitalize">
              {latestAnalysis?.top_disease ? latestAnalysis.top_disease.replace(/_/g, ' ') : 'None yet'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Avg Symptoms Recorded
            </span>
            <span className="text-xl font-extrabold text-foreground tracking-tight">
              {avgSymptoms} <span className="text-xs font-normal text-muted-foreground">symptoms</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Monitoring Status
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Surveillance
            </span>
          </div>
        </div>
      </div>

      {/* ── Search, Risk Filter & Sort Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search analyses by condition name or symptom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground font-medium hidden sm:inline mr-1 text-[11px]">Risk:</span>
            {['all', 'low', 'moderate', 'high'].map((risk) => (
              <button
                key={risk}
                type="button"
                onClick={() => setSelectedRisk(risk)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedRisk === risk
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block mx-1" />

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown size={13} className="text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground font-medium focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="confidence">Highest Match</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Comparison Floating Bar (When 1 or 2 items selected) ── */}
      {selectedToCompare.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-accent/[0.07] border border-accent/25 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <GitCompare size={16} className="text-accent flex-shrink-0" />
            <span className="text-xs text-foreground font-semibold">
              {selectedToCompare.length === 1 ? (
                <>1 assessment selected. <span className="text-muted-foreground font-normal">Select 1 more assessment to compare side-by-side.</span></>
              ) : (
                <>2 assessments selected for clinical comparison.</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedToCompare([])}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedToCompare.length !== 2 || loadingComparison}
              onClick={handleOpenComparison}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <GitCompare size={13} />
              Compare Now (2)
            </button>
          </div>
        </div>
      )}

      {/* ── Analyses Table / Workspace ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-16 px-4">
            <RefreshCw size={24} className="animate-spin text-accent mx-auto mb-2.5" />
            <p className="text-xs font-semibold text-muted-foreground">Loading longitudinal health analyses...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 px-4 text-red-600">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p className="text-xs font-bold mb-3">{error}</p>
            <button
              onClick={loadAnalyses}
              className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-xs hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Activity size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-foreground mb-1">No Health Analyses Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
              {search || selectedRisk !== 'all'
                ? 'No assessments matched your active search and filter criteria.'
                : 'Complete an initial AI health check to establish your diagnostic history.'}
            </p>
            {(!search && selectedRisk === 'all') && (
              <button
                type="button"
                onClick={onStartHealthCheck}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-accent text-white font-semibold text-xs shadow-md shadow-accent/20 hover:bg-accent-hover transition-all"
              >
                <Sparkles size={14} />
                Start Health Check
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4 w-10 text-center">Compare</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Primary Condition Identified</th>
                  <th className="py-3 px-4">Match Confidence</th>
                  <th className="py-3 px-4">Symptoms Evaluated</th>
                  <th className="py-3 px-4">Differential Findings</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => {
                  const isChecked = selectedToCompare.includes(item.id)
                  const risk = (item.risk_level || 'low').toLowerCase()
                  return (
                    <tr key={item.id} className="hover:bg-secondary/25 transition-colors">
                      {/* Checkbox for compare */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCompare(item.id)}
                          className="w-4 h-4 rounded text-accent focus:ring-accent border-border cursor-pointer"
                          title="Select to compare side-by-side"
                        />
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground" />
                          <span>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                      </td>

                      {/* Primary Condition */}
                      <td className="py-3 px-4 font-bold text-foreground capitalize">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {item.top_disease ? item.top_disease.replace(/_/g, ' ') : 'General Assessment'}
                          </span>
                        </div>
                      </td>

                      {/* Confidence Meter */}
                      <td className="py-3 px-4">
                        {item.top_confidence ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-accent text-xs">
                              {item.top_confidence.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${Math.min(item.top_confidence, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Symptoms Evaluated */}
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] font-semibold">
                          <Stethoscope size={11} className="text-muted-foreground" />
                          {item.symptom_ids?.length || 0} signals
                        </span>
                      </td>

                      {/* Differential Findings */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.num_findings || 1} ranked findings
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            risk === 'critical'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : risk === 'high'
                              ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                              : risk === 'moderate'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          {risk}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Inspect analysis modal */}
                          <button
                            type="button"
                            onClick={() => handleInspectAnalysis(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-white font-semibold text-[11px] transition-all cursor-pointer"
                            title="Inspect Analytical Findings"
                          >
                            <span>Analysis</span>
                            <ChevronRight size={12} />
                          </button>

                          {/* Preview PDF */}
                          <button
                            type="button"
                            onClick={() => handlePreviewPdf(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border hover:bg-secondary text-foreground text-[11px] font-semibold transition-all cursor-pointer"
                            title="Preview Vector PDF Report"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Preview</span>
                          </button>

                          {/* Download PDF */}
                          <button
                            type="button"
                            disabled={actionInProgress === `download-${item.id}`}
                            onClick={() => handleDownloadPdf(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="Download Vector PDF Report"
                          >
                            <Download size={12} className={actionInProgress === `download-${item.id}` ? 'animate-bounce' : ''} />
                            <span>PDF</span>
                          </button>

                          {/* Print PDF */}
                          <button
                            type="button"
                            disabled={actionInProgress === `print-${item.id}`}
                            onClick={() => handlePrintPdf(item)}
                            className="p-1 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title="Print Official Medical Report"
                          >
                            <Printer size={13} className={actionInProgress === `print-${item.id}` ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Single Analysis Inspection Modal/Drawer ── */}
      {activeAnalysisDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveAnalysisDetail(null)}
          />

          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-accent px-2 py-0.5 rounded bg-accent/10">
                    Assessment ID: {activeAnalysisDetail.id?.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeAnalysisDetail.created_at ? new Date(activeAnalysisDetail.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-foreground capitalize">
                  {activeAnalysisDetail.results?.[0]?.disease?.replace(/_/g, ' ') || 'Clinical Evaluation'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveAnalysisDetail(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Patient Demographics & Vitals */}
            {activeAnalysisDetail.patient && (
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/80">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Patient Clinical Profile
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Name</span>
                    <strong className="text-foreground">{activeAnalysisDetail.patient.name || 'Patient'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Age / Gender</span>
                    <strong className="text-foreground">
                      {activeAnalysisDetail.patient.age || '—'} yrs · {activeAnalysisDetail.patient.gender || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Blood Group</span>
                    <strong className="text-foreground">{activeAnalysisDetail.patient.blood_group || 'O+'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Height / Weight</span>
                    <strong className="text-foreground">
                      {activeAnalysisDetail.patient.height || '—'} cm · {activeAnalysisDetail.patient.weight || '—'} kg
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Evaluated Symptoms */}
            <div>
              <span className="text-xs font-bold text-foreground block mb-2">
                Evaluated Symptoms ({activeAnalysisDetail.symptoms?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeAnalysisDetail.symptoms || []).map((s: any) => (
                  <span
                    key={s.key || s.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/[0.08] text-accent text-xs font-medium border border-accent/15"
                  >
                    <CheckCircle2 size={11} />
                    {s.label || s.key?.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Differential Diagnoses */}
            <div>
              <span className="text-xs font-bold text-foreground block mb-2">
                Differential Diagnostic Findings (Bayesian Distribution)
              </span>
              <div className="space-y-2">
                {(activeAnalysisDetail.results || []).map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-secondary/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground font-bold">#{r.rank}</span>
                        <strong className="text-foreground capitalize">{r.disease?.replace(/_/g, ' ')}</strong>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Recommended: {r.doctor || 'General Physician'}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-extrabold text-accent text-sm">
                        {r.confidence?.toFixed(1)}%
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground">
                        {r.risk_level || 'Low'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Warning */}
            {activeAnalysisDetail.results?.[0]?.warning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-foreground text-xs flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Clinical Advisory:</strong> {activeAnalysisDetail.results[0].warning}
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  const id = activeAnalysisDetail.id
                  setActiveAnalysisDetail(null)
                  onOpenReportById(id)
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all cursor-pointer"
              >
                <span>View Full Diagnostic Report</span>
                <ChevronRight size={13} />
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fakeItem: HistoryItem = {
                      id: activeAnalysisDetail.id,
                      patient_name: activeAnalysisDetail.patient?.name || 'patient',
                      top_disease: activeAnalysisDetail.results?.[0]?.disease || '',
                      top_confidence: activeAnalysisDetail.results?.[0]?.confidence || 0,
                      num_findings: activeAnalysisDetail.results?.length || 1,
                      risk_level: activeAnalysisDetail.results?.[0]?.risk_level || 'low',
                      created_at: activeAnalysisDetail.created_at || '',
                      symptom_ids: activeAnalysisDetail.symptoms?.map((s: any) => s.key || s.id) || [],
                    }
                    handlePreviewPdf(fakeItem)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all cursor-pointer"
                  title="Preview Vector PDF"
                >
                  <Eye size={13} />
                  <span>Preview PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fakeItem: HistoryItem = {
                      id: activeAnalysisDetail.id,
                      patient_name: activeAnalysisDetail.patient?.name || 'patient',
                      top_disease: activeAnalysisDetail.results?.[0]?.disease || '',
                      top_confidence: activeAnalysisDetail.results?.[0]?.confidence || 0,
                      num_findings: activeAnalysisDetail.results?.length || 1,
                      risk_level: activeAnalysisDetail.results?.[0]?.risk_level || 'low',
                      created_at: activeAnalysisDetail.created_at || '',
                      symptom_ids: activeAnalysisDetail.symptoms?.map((s: any) => s.key || s.id) || [],
                    }
                    handleDownloadPdf(fakeItem)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all cursor-pointer"
                  title="Download Vector PDF Report"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAnalysisDetail(null)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Side-by-Side Assessment Comparison Modal ── */}
      {comparisonModalOpen && comparisonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setComparisonModalOpen(false)}
          />

          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl p-6 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold uppercase">
                    <GitCompare size={12} />
                    Longitudinal Comparison
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Side-by-Side Health Assessment Comparison
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Prominent Clinical Disclaimer */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-foreground text-xs flex items-start gap-2.5">
              <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11.5px] leading-relaxed">
                <strong className="text-indigo-700 block mb-0.5">Informational Comparison Advisory</strong>
                AI assessment comparisons are informational and track differences in self-reported symptoms and algorithmic probability outputs at different points in time. These metrics do not reflect confirmed disease progression, remission, or healing. Always consult a physician for clinical assessment.
              </div>
            </div>

            {/* 2-Column Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assessment A */}
              <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-3">
                <div className="pb-2 border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Assessment 01</span>
                  <span className="text-xs text-muted-foreground">
                    {comparisonData.a.created_at ? new Date(comparisonData.a.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Primary Finding</span>
                  <h4 className="text-base font-extrabold text-foreground capitalize">
                    {comparisonData.a.results?.[0]?.disease?.replace(/_/g, ' ') || 'General Assessment'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-accent">
                      {comparisonData.a.results?.[0]?.confidence?.toFixed(1)}% Match
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {comparisonData.a.results?.[0]?.risk_level || 'Low'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-1">
                    Symptoms Evaluated ({comparisonData.a.symptoms?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(comparisonData.a.symptoms || []).map((s: any) => (
                      <span key={s.key || s.id} className="px-2 py-0.5 rounded bg-card text-[11px] font-medium border border-border">
                        {s.label || s.key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assessment B */}
              <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-3">
                <div className="pb-2 border-b border-border flex items-center justify-between">
                  <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Assessment 02</span>
                  <span className="text-xs text-muted-foreground">
                    {comparisonData.b.created_at ? new Date(comparisonData.b.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Primary Finding</span>
                  <h4 className="text-base font-extrabold text-foreground capitalize">
                    {comparisonData.b.results?.[0]?.disease?.replace(/_/g, ' ') || 'General Assessment'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-accent">
                      {comparisonData.b.results?.[0]?.confidence?.toFixed(1)}% Match
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {comparisonData.b.results?.[0]?.risk_level || 'Low'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold mb-1">
                    Symptoms Evaluated ({comparisonData.b.symptoms?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(comparisonData.b.symptoms || []).map((s: any) => (
                      <span key={s.key || s.id} className="px-2 py-0.5 rounded bg-card text-[11px] font-medium border border-border">
                        {s.label || s.key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setComparisonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document PDF Preview Modal ── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={handleClosePreview}
          />

          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl p-5 z-10 flex flex-col h-[88vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-500/20">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-foreground text-sm truncate">
                    {previewItem.top_disease ? previewItem.top_disease.replace(/_/g, ' ') : 'Health Assessment Clinical Report'}
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    {formatPatientReportFilename(previewItem.patient_name || 'patient')} · Vector A4 Format
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPdf(previewItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Preview Canvas */}
            <div className="flex-1 min-h-0 bg-secondary/30 rounded-xl mt-3 p-1 flex items-center justify-center overflow-hidden border border-border/70">
              {loadingPreview ? (
                <div className="text-center py-20">
                  <RefreshCw size={28} className="animate-spin text-accent mx-auto mb-3" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Generating high-resolution vector PDF preview...
                  </p>
                </div>
              ) : previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title="PDF Report Preview"
                  className="w-full h-full rounded-lg border-0 bg-white shadow-inner"
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  Unable to load PDF preview. Use the Download button above to view the file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
