import { useState, useEffect } from 'react'
import { FileText, Calendar, ArrowRight, RefreshCw, AlertCircle, Sparkles, Printer, User } from 'lucide-react'
import { getPredictionHistory } from '../../services/api'
import type { HistoryItem } from '../../types'

interface Props {
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientReportsPage({ onStartHealthCheck, onOpenReportById }: Props) {
  const [reports, setReports] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    setLoading(true)
    setError(null)
    try {
      const data = await getPredictionHistory()
      setReports(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load medical reports.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Clinical Health Reports</h1>
          <p className="patient-page-subtitle">
            Comprehensive diagnostic reports, differential evaluations, and consultation summaries.
          </p>
        </div>
        <button
          onClick={onStartHealthCheck}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
        >
          <Sparkles size={14} />
          New Assessment
        </button>
      </div>

      <div className="patient-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <RefreshCw size={24} className="animate-spin text-indigo-600" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading reports from database...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>{error}</p>
            <button onClick={loadReports} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No clinical reports on file</h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Your generated clinical reports will appear here once an assessment is completed.
            </p>
            <button
              onClick={onStartHealthCheck}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              <Sparkles size={14} />
              Run Health Assessment
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {reports.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 18,
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#e0e7ff', color: '#3730a3', fontSize: 11, fontWeight: 700 }}>
                      <FileText size={12} />
                      CLINICAL REPORT
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                    {r.top_disease || 'Health Assessment Report'}
                  </h3>

                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#475569', fontWeight: 500 }}>
                    Patient: <strong>{r.patient_name || 'Patient'}</strong> · {r.symptom_ids?.length || 0} symptoms recorded
                  </p>

                  {r.top_confidence && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4338ca' }}>
                      <span>Model Match:</span>
                      <span style={{ fontFamily: 'monospace', padding: '1px 6px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: 4 }}>
                        {r.top_confidence.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onOpenReportById(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 36,
                    borderRadius: 8,
                    background: '#4338ca',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(67,56,202,0.2)',
                  }}
                >
                  <FileText size={13} />
                  Open Full Clinical Report
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
