import { useState, useEffect } from 'react'
import {
  FileText, Download, Printer, Eye, Search, RefreshCw,
  AlertCircle, Sparkles, ShieldCheck, CheckCircle2,
  Calendar, FileCheck, ArrowRight, X, ExternalLink
} from 'lucide-react'
import { getUserReports, downloadPredictionPdf, formatPatientReportFilename } from '../../services/api'
import type { ClinicalReportItem } from '../../types'

interface Props {
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientReportsPage({ onStartHealthCheck }: Props) {
  const [reports, setReports] = useState<ClinicalReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  // PDF Preview State
  const [previewDoc, setPreviewDoc] = useState<ClinicalReportItem | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  // Cleanup blob URL when modal closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
      }
    }
  }, [previewBlobUrl])

  async function loadReports() {
    setLoading(true)
    setError(null)
    try {
      const data = await getUserReports()
      setReports(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load medical reports.')
    } finally {
      setLoading(false)
    }
  }

  // Handle PDF Preview in modal
  async function handlePreviewPdf(doc: ClinicalReportItem) {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setPreviewDoc(doc)
    setLoadingPreview(true)
    try {
      const blob = await downloadPredictionPdf(doc.prediction_id)
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
    } catch (err: any) {
      setError(err.message || 'Failed to load document preview.')
      setPreviewDoc(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  function handleClosePreview() {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }
    setPreviewDoc(null)
  }

  // Handle Direct PDF Download
  async function handleDownloadPdf(doc: ClinicalReportItem) {
    setActionInProgress(`download-${doc.id}`)
    try {
      const blob = await downloadPredictionPdf(doc.prediction_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = formatPatientReportFilename(doc.patient_name)
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

  // Handle Direct Document Print
  async function handlePrintPdf(doc: ClinicalReportItem) {
    setActionInProgress(`print-${doc.id}`)
    try {
      const blob = await downloadPredictionPdf(doc.prediction_id)
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

  // Filter & Sort Documents
  const filtered = reports
    .filter((r) => {
      if (selectedCategory !== 'all') {
        if (r.category_code !== selectedCategory && r.category !== selectedCategory) return false
      }
      if (!search) return true
      const q = search.toLowerCase()
      return (
        r.title.toLowerCase().includes(q) ||
        r.primary_condition.toLowerCase().includes(q) ||
        r.prediction_id.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const totalDocuments = reports.length

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold tracking-wide uppercase">
              <FileCheck size={12} />
              Clinical Document Repository
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold">
              <ShieldCheck size={11} />
              Encrypted & Authenticated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Clinical Health Reports
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Official doctor-ready medical dossiers, vector A4 PDF downloads, and clinical documentation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={loadReports}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Refresh Reports"
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

      {/* ── Document Metrics Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Clinical Dossiers on File
            </span>
            <span className="text-xl font-extrabold text-foreground tracking-tight">
              {totalDocuments}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <FileCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Document Architecture
            </span>
            <span className="text-sm font-extrabold text-foreground tracking-tight block">
              Vector A4 PDF
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Access & Integrity
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Direct Backend Authorization
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents by condition name, title, or reference ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>

        {/* Category & Sort controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              All Documents
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('clinical_assessment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === 'clinical_assessment'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Complete Assessment
            </button>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block mx-1" />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground font-medium focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="newest">Newest Generated</option>
            <option value="oldest">Oldest Generated</option>
          </select>
        </div>
      </div>

      {/* ── Document Repository Table / Card List ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-16 px-4">
            <RefreshCw size={24} className="animate-spin text-accent mx-auto mb-2.5" />
            <p className="text-xs font-semibold text-muted-foreground">Retrieving clinical documents from database...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 px-4 text-red-600">
            <AlertCircle size={24} className="mx-auto mb-2" />
            <p className="text-xs font-bold mb-3">{error}</p>
            <button
              onClick={loadReports}
              className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-xs hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-foreground mb-1">No Clinical Reports Generated Yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
              {search || selectedCategory !== 'all'
                ? 'No documents matched your active query.'
                : 'Complete a health assessment to generate your first professional clinical report.'}
            </p>
            {(!search && selectedCategory === 'all') && (
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
                  <th className="py-3 px-4">Document Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4">File Format</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((doc) => {
                  const isDownloading = actionInProgress === `download-${doc.id}`
                  const isPrinting = actionInProgress === `print-${doc.id}`
                  return (
                    <tr key={doc.id} className="hover:bg-secondary/25 transition-colors">
                      {/* Document Details */}
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/20">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-xs leading-tight">
                              {doc.title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                              Ref: {doc.prediction_id.slice(0, 8)} · Patient: {doc.patient_name || 'Patient'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/[0.08] text-accent text-[11px] font-semibold">
                          {doc.category}
                        </span>
                      </td>

                      {/* Generated Date */}
                      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-muted-foreground" />
                          <span>
                            {doc.created_at
                              ? new Date(doc.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                        </div>
                      </td>

                      {/* File Format & Size */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="font-mono text-[11px] text-foreground font-medium">
                          {doc.file_format}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">{doc.file_size}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                          <CheckCircle2 size={10} />
                          {doc.status}
                        </span>
                      </td>

                      {/* Document Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview PDF */}
                          <button
                            type="button"
                            onClick={() => handlePreviewPdf(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-[11px] font-semibold transition-all cursor-pointer"
                            title="Preview PDF Document"
                          >
                            <Eye size={12} className="text-accent" />
                            <span>Preview</span>
                          </button>

                          {/* Download PDF */}
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownloadPdf(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            title="Download Official PDF"
                          >
                            <Download size={12} className={isDownloading ? 'animate-bounce' : ''} />
                            <span>{isDownloading ? 'Downloading...' : 'PDF'}</span>
                          </button>

                          {/* Print PDF */}
                          <button
                            type="button"
                            disabled={isPrinting}
                            onClick={() => handlePrintPdf(doc)}
                            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title="Print Document"
                          >
                            <Printer size={13} className={isPrinting ? 'animate-spin' : ''} />
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

      {/* ── Document PDF Preview Modal ── */}
      {previewDoc && (
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
                    {previewDoc.title}
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    {formatPatientReportFilename(previewDoc.patient_name)} · Vector A4 Format
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewDoc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white font-semibold text-xs shadow-xs hover:bg-accent-hover transition-all"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPdf(previewDoc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-secondary transition-all"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
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
