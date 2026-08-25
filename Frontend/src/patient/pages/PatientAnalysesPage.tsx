import { useState, useEffect } from 'react'
import { Activity, FileText, Calendar, ArrowRight, Search, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
import { getPredictionHistory } from '../../services/api'
import type { HistoryItem } from '../../types'

interface Props {
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientAnalysesPage({ onStartHealthCheck, onOpenReportById }: Props) {
  const [analyses, setAnalyses] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadAnalyses()
  }, [])

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

  const filtered = analyses.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (a.top_disease && a.top_disease.toLowerCase().includes(q)) ||
      (a.patient_name && a.patient_name.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">My Health Analyses</h1>
          <p className="patient-page-subtitle">
            Longitudinal record of all AI symptom evaluations and diagnostic findings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadAnalyses}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onStartHealthCheck}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
          >
            <Sparkles size={14} />
            New Assessment
          </button>
        </div>
      </div>

      <div className="patient-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search analyses by condition name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, color: '#0f172a' }}
          />
        </div>
      </div>

      <div className="patient-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <RefreshCw size={24} className="animate-spin text-indigo-600" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading analyses from database...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>{error}</p>
            <button onClick={loadAnalyses} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <Activity size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No health analyses found</h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              {search ? 'No results matched your search query.' : 'Run your first checkup to receive an AI analysis.'}
            </p>
            {!search && (
              <button
                onClick={onStartHealthCheck}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                <Sparkles size={14} />
                Start Health Check
              </button>
            )}
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Primary Condition Identified</th>
                  <th>Confidence Score</th>
                  <th>Signals Evaluated</th>
                  <th>Findings</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </td>
                    <td style={{ fontWeight: 700, textTransform: 'capitalize', color: '#0f172a' }}>
                      {item.top_disease || 'Health Assessment'}
                    </td>
                    <td>
                      {item.top_confidence ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4338ca' }}>
                          {item.top_confidence.toFixed(1)}% Match
                        </span>
                      ) : '—'}
                    </td>
                    <td>{item.symptom_ids?.length || 0} symptoms</td>
                    <td>{item.num_findings || 1} conditions</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenReportById(item.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 14px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 11.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      >
                        <FileText size={12} />
                        View Report
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
