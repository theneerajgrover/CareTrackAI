import { useState, useEffect } from 'react'
import { ShieldCheck, HeartPulse, Stethoscope, AlertTriangle, ArrowRight, RefreshCw, Sparkles, FileText } from 'lucide-react'
import { getPredictionHistory, getPredictionDetails } from '../../services/api'
import type { HistoryItem } from '../../types'

interface Props {
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientRecommendationsPage({ onStartHealthCheck, onOpenReportById }: Props) {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  async function loadRecommendations() {
    setLoading(true)
    setError(null)
    try {
      const history: HistoryItem[] = await getPredictionHistory()
      if (history.length === 0) {
        setRecommendations([])
        return
      }

      // Fetch top 3 latest prediction details to extract real clinical remedies and warnings
      const topItems = history.slice(0, 4)
      const detailsList = await Promise.all(
        topItems.map((h) => getPredictionDetails(h.id).catch(() => null))
      )

      const recs: any[] = []
      detailsList.forEach((d) => {
        if (d && d.results) {
          d.results.forEach((r: any) => {
            if (r.remedies || r.warning) {
              recs.push({
                prediction_id: d.id,
                date: d.created_at,
                disease: r.disease,
                confidence: r.confidence,
                risk_level: r.risk_level,
                doctor: r.doctor || 'General Physician',
                warning: r.warning,
                remedies: r.remedies,
              })
            }
          })
        }
      })

      setRecommendations(recs)
    } catch (err: any) {
      setError(err.message || 'Failed to load health recommendations.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Clinical Guidance & Remedies</h1>
          <p className="patient-page-subtitle">
            Curated lifestyle measures, clinical advisories, and doctor specialty referrals from your assessments.
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
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Synthesizing personalized clinical guidance...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>{error}</p>
            <button onClick={loadRecommendations} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <ShieldCheck size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No recommendations on record yet</h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Run your first symptom analysis to receive tailored remedies, specialist routing, and health advisories.
            </p>
            <button
              onClick={onStartHealthCheck}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              <Sparkles size={14} />
              Start Health Check
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 18,
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                      {rec.disease}
                    </h3>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      Assessed on {rec.date ? new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'} · Match: {rec.confidence ? `${rec.confidence.toFixed(1)}%` : 'Validated'}
                    </span>
                  </div>
                  <span className={`patient-badge patient-badge-${rec.risk_level || 'low'}`}>
                    {(rec.risk_level || 'low').toUpperCase()}
                  </span>
                </div>

                {rec.warning && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 12.5, lineHeight: 1.5 }}>
                    <strong>Clinical Notice:</strong> {rec.warning}
                  </div>
                )}

                {rec.remedies && (
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                      Self-Care & Home Remedies:
                    </span>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12.5, color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {rec.remedies}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => onOpenReportById(rec.prediction_id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 6, background: '#4338ca', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  >
                    <FileText size={13} />
                    View Associated Report
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
