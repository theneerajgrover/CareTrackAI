import { useState, useEffect } from 'react'
import {
  Activity, FileText, Stethoscope, AlertTriangle, ArrowRight,
  Sparkles, CheckCircle2, ShieldCheck, HeartPulse, User as UserIcon, Clock,
  Calendar, RefreshCw, Bell, MessageSquare, ExternalLink
} from 'lucide-react'
import { getUserStats, getPredictionHistory } from '../../services/api'
import type { PatientPage, UserStats, HistoryItem, User, PredictionResponse, PatientDetails, SelectedSymptom } from '../../types'

interface Props {
  user: User | null
  onNavigate: (page: PatientPage) => void
  onStartHealthCheck: () => void
  onOpenReportById: (predictionId: string) => void
}

export default function PatientDashboard({
  user,
  onNavigate,
  onStartHealthCheck,
  onOpenReportById,
}: Props) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    setError(null)
    try {
      const [sRes, hRes] = await Promise.all([
        getUserStats().catch(() => ({ stats: { total_analyses: 0, total_reports: 0, critical_alerts: 0, latest_analysis: null } })),
        getPredictionHistory().catch(() => []),
      ])
      setStats(sRes.stats)
      setRecentAnalyses(hRes)
    } catch (err: any) {
      setError(err.message || 'Failed to load health records.')
    } finally {
      setLoading(false)
    }
  }

  const patientName = user?.name || 'Patient'
  const latest = stats?.latest_analysis

  return (
    <div>
      {/* Welcome Banner */}
      <div className="patient-welcome-banner">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            <HeartPulse size={13} />
            CareTrack AI Patient Workspace
          </div>
          <h2 className="patient-welcome-title">Welcome back, {patientName}</h2>
          <p className="patient-welcome-desc">
            {stats && stats.total_analyses > 0
              ? `You have ${stats.total_analyses} completed health assessment${stats.total_analyses !== 1 ? 's' : ''} on record. Review your clinical findings, generated reports, or start a new checkup below.`
              : 'Begin your personal health tracking journey by running an intelligent AI symptom analysis across 713 clinical conditions.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onStartHealthCheck}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, padding: '0 22px', borderRadius: 9999, background: '#fff', color: '#4338ca', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <Sparkles size={15} />
            Start Health Check
          </button>
          {latest && (
            <button
              onClick={() => onOpenReportById(latest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9999, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >
              Latest Report <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="patient-stats-grid">
        <div className="patient-stat-card" onClick={() => onNavigate('patient-analyses')} style={{ cursor: 'pointer' }}>
          <div className="patient-stat-card-header">
            <span className="patient-stat-card-label">Total Analyses</span>
            <div className="patient-stat-card-icon" style={{ background: 'rgba(67,56,202,0.08)' }}>
              <Activity size={18} color="#4338CA" />
            </div>
          </div>
          <div className="patient-stat-card-value">{loading ? '—' : stats?.total_analyses || 0}</div>
          <div className="patient-stat-card-sub">Completed health assessments</div>
        </div>

        <div className="patient-stat-card" onClick={() => onNavigate('patient-reports')} style={{ cursor: 'pointer' }}>
          <div className="patient-stat-card-header">
            <span className="patient-stat-card-label">Available Reports</span>
            <div className="patient-stat-card-icon" style={{ background: 'rgba(5,150,105,0.08)' }}>
              <FileText size={18} color="#059669" />
            </div>
          </div>
          <div className="patient-stat-card-value">{loading ? '—' : stats?.total_reports || 0}</div>
          <div className="patient-stat-card-sub">Clinical reports on file</div>
        </div>

        <div className="patient-stat-card" onClick={() => onNavigate('patient-analyses')} style={{ cursor: 'pointer' }}>
          <div className="patient-stat-card-header">
            <span className="patient-stat-card-label">Critical Findings</span>
            <div className="patient-stat-card-icon" style={{ background: (stats?.critical_alerts || 0) > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)' }}>
              {(stats?.critical_alerts || 0) > 0 ? <AlertTriangle size={18} color="#DC2626" /> : <ShieldCheck size={18} color="#059669" />}
            </div>
          </div>
          <div className="patient-stat-card-value" style={{ color: (stats?.critical_alerts || 0) > 0 ? '#DC2626' : '#059669' }}>
            {loading ? '—' : stats?.critical_alerts || 0}
          </div>
          <div className="patient-stat-card-sub">
            {(stats?.critical_alerts || 0) > 0 ? 'Requires clinical review' : 'No urgent alerts'}
          </div>
        </div>

        <div className="patient-stat-card">
          <div className="patient-stat-card-header">
            <span className="patient-stat-card-label">Latest Checkup</span>
            <div className="patient-stat-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>
              <Clock size={18} color="#7C3AED" />
            </div>
          </div>
          <div className="patient-stat-card-value" style={{ fontSize: 16, textTransform: 'capitalize' }}>
            {loading ? '—' : latest ? latest.disease : 'None'}
          </div>
          <div className="patient-stat-card-sub">
            {latest?.confidence ? `${latest.confidence.toFixed(1)}% match` : 'Ready for assessment'}
          </div>
        </div>
      </div>

      {/* Quick Navigation Controls */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Health Workspace Shortcuts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { id: 'patient-analyses' as PatientPage, label: 'My Analyses', icon: Activity, desc: 'View past evaluations' },
            { id: 'patient-reports' as PatientPage, label: 'Medical Reports', icon: FileText, desc: 'Clinical documentation' },
            { id: 'patient-symptoms' as PatientPage, label: 'Symptom Library', icon: Stethoscope, desc: '377 health signals' },
            { id: 'patient-recommendations' as PatientPage, label: 'Clinical Guidance', icon: ShieldCheck, desc: 'Doctor & home remedies' },
            { id: 'patient-notifications' as PatientPage, label: 'Notifications', icon: Bell, desc: 'Health updates' },
            { id: 'patient-feedback' as PatientPage, label: 'Feedback', icon: MessageSquare, desc: 'Contact care team' },
            { id: 'patient-profile' as PatientPage, label: 'My Profile', icon: UserIcon, desc: 'Manage account' },
          ].map((q) => (
            <button
              key={q.id}
              onClick={() => onNavigate(q.id)}
              className="patient-stat-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                textAlign: 'left',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <q.icon size={16} color="#4338CA" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-foreground, #0f172a)' }}>{q.label}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{q.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Latest Analysis Detailed Card */}
      {latest && (
        <div className="patient-card" style={{ borderLeft: '4px solid #4338ca' }}>
          <div className="patient-card-header">
            <div className="patient-card-title">
              <Activity size={16} color="#4338ca" />
              <span>Latest Health Assessment Findings</span>
            </div>
            <span className={`patient-badge patient-badge-${latest.risk_level}`}>
              {latest.risk_level.toUpperCase()} RISK
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16, background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Identified Condition</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{latest.disease}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Match Confidence</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#4338ca' }}>{latest.confidence ? `${latest.confidence.toFixed(1)}%` : 'Validated'}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Symptoms Evaluated</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{latest.symptom_count} signals</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Date Recorded</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                {latest.created_at ? new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
              </span>
            </div>
          </div>

          {latest.warning && (
            <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: 12.5, lineHeight: 1.5, marginBottom: 14 }}>
              <strong>Clinical Advisory:</strong> {latest.warning}
            </div>
          )}

          {latest.remedies && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Clinical Remedies & Guidance:</span>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, fontSize: 12.5, color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {latest.remedies.length > 250 ? `${latest.remedies.slice(0, 250)}…` : latest.remedies}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => onOpenReportById(latest.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
            >
              <FileText size={14} />
              Open Full Clinical Report
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Recent Analyses List */}
      <div className="patient-card">
        <div className="patient-card-header">
          <div className="patient-card-title">
            <Calendar size={16} color="#4338ca" />
            <span>Recent Health Assessments</span>
          </div>
          <button
            onClick={() => onNavigate('patient-analyses')}
            style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            View All ({recentAnalyses.length}) <ArrowRight size={12} />
          </button>
        </div>

        {recentAnalyses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>No health analyses on record yet</h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Start your first checkup to record symptoms and receive AI diagnostic reports.</p>
            <button
              onClick={onStartHealthCheck}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 20px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              <Sparkles size={14} />
              Start First Health Check
            </button>
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Primary Condition</th>
                  <th>Match Confidence</th>
                  <th>Signals</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </td>
                    <td style={{ fontWeight: 700, textTransform: 'capitalize', color: '#0f172a' }}>
                      {item.top_disease || 'Health Assessment'}
                    </td>
                    <td>
                      {item.top_confidence ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338ca' }}>
                          {item.top_confidence.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>{item.symptom_ids?.length || 0} symptoms</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenReportById(item.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px', borderRadius: 9999, background: '#f1f5f9', color: '#334155', fontSize: 11.5, fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      >
                        <FileText size={12} />
                        View Report
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
