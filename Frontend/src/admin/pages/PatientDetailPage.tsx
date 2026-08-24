import { useState, useEffect } from 'react'
import { ArrowLeft, User, Mail, Phone, Calendar, Activity } from 'lucide-react'
import { getPatientDetail } from '../services/adminApi'
import type { PatientDetail, AdminPage } from '../adminTypes'

interface Props {
  patientId: string
  onNavigate: (page: AdminPage) => void
}

export default function PatientDetailPage({ patientId, onNavigate }: Props) {
  const [data, setData] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientId) { setError('No patient ID provided'); setLoading(false); return }
    loadData()
  }, [patientId])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await getPatientDetail(patientId)
      setData(res)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="admin-loading"><div className="admin-loading-spinner" /></div>
  if (error) return <div className="admin-error"><div className="admin-error-message">{error}</div><button className="admin-btn admin-btn-secondary" onClick={() => onNavigate('admin-patients')}>Back to Patients</button></div>

  if (!data) return null
  const { patient, analyses, total_analyses } = data

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => onNavigate('admin-patients')}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="admin-page-title">{patient.name}</h1>
            <p className="admin-page-subtitle">Patient profile & analysis history</p>
          </div>
        </div>
        <span className={`admin-badge admin-badge-${patient.status}`}>{patient.status}</span>
      </div>

      {/* Patient Info Card */}
      <div className="admin-detail-card">
        <h3>Patient Information</h3>
        <div className="admin-detail-grid">
          <div className="admin-detail-field">
            <label><User size={12} style={{ display: 'inline', marginRight: 4 }} />Name</label>
            <span>{patient.name}</span>
          </div>
          <div className="admin-detail-field">
            <label><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />Email</label>
            <span>{patient.email}</span>
          </div>
          <div className="admin-detail-field">
            <label><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />Phone</label>
            <span>{patient.phone || '—'}</span>
          </div>
          <div className="admin-detail-field">
            <label><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Registered</label>
            <span>{fmtDate(patient.created_at)}</span>
          </div>
          <div className="admin-detail-field">
            <label>Last Login</label>
            <span>{fmtDate(patient.last_login)}</span>
          </div>
          <div className="admin-detail-field">
            <label><Activity size={12} style={{ display: 'inline', marginRight: 4 }} />Total Analyses</label>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{total_analyses}</span>
          </div>
        </div>
      </div>

      {/* Analysis History */}
      <div className="admin-detail-card">
        <h3>Analysis History ({total_analyses})</h3>
        {analyses.length === 0 ? (
          <div className="admin-empty" style={{ padding: 24 }}>No analyses found for this patient</div>
        ) : (
          <table className="admin-table" style={{ borderRadius: 0 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Symptoms</th>
                <th>Top Prediction</th>
                <th>Confidence</th>
                <th>Results</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(a => (
                <tr key={a.id}>
                  <td>{fmtDate(a.created_at)}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{a.symptom_count} symptoms</span>
                    {a.symptoms.slice(0, 3).map((s, i) => (
                      <span key={i} style={{ fontSize: 11, color: '#6b7280', display: 'block' }}>{s.label}</span>
                    ))}
                    {a.symptoms.length > 3 && <span style={{ fontSize: 11, color: '#9ca3af' }}>+{a.symptoms.length - 3} more</span>}
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.top_disease || '—'}</td>
                  <td>{a.top_confidence != null ? `${a.top_confidence.toFixed(1)}%` : '—'}</td>
                  <td>{a.result_count} diseases</td>
                  <td><span className={`admin-badge admin-badge-${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
