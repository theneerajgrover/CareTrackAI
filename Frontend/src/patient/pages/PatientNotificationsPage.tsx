import { useState, useEffect } from 'react'
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Info, Calendar } from 'lucide-react'
import { getUserNotifications } from '../../services/api'
import type { PatientNotification } from '../../types'

export default function PatientNotificationsPage() {
  const [notifications, setNotifications] = useState<PatientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    setError(null)
    try {
      const res = await getUserNotifications()
      setNotifications(res.notifications || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Patient Notifications & Alerts</h1>
          <p className="patient-page-subtitle">
            Health updates, clinical checkup reminders, and platform communications.
          </p>
        </div>
        <button
          onClick={loadNotifications}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="patient-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <RefreshCw size={24} className="animate-spin text-indigo-600" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading notifications...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>{error}</p>
            <button onClick={loadNotifications} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle2 size={24} color="#3b82f6" />
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>You're all caught up</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              No new health alerts or notifications at this time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bell size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{n.title}</h4>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
