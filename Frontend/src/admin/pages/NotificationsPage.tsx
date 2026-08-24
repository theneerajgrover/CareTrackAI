import { useState, useEffect, useCallback } from 'react'
import { Bell, Send, CheckCircle2, AlertCircle, Info, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { getNotifications, createNotification, getNotificationStats } from '../services/adminApi'
import type { AdminNotification, NotificationStats, Pagination } from '../adminTypes'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state for creating notification
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [targetType, setTargetType] = useState('all_patients')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const [notifRes, statsRes] = await Promise.all([
        getNotifications({ page, per_page: 20 }),
        getNotificationStats(),
      ])
      setNotifications(notifRes.notifications)
      setPagination(notifRes.pagination)
      setStats(statsRes)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      alert('Title and message are required')
      return
    }

    setSubmitting(true)
    try {
      await createNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        target_type: targetType,
      })
      setTitle('')
      setMessage('')
      setShowCreateModal(false)
      loadData(1)
    } catch (e: any) {
      alert('Failed to send notification: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Platform Notifications</h1>
          <p className="admin-page-subtitle">Broadcast health advisories, system updates, and alerts</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowCreateModal(true)}>
          <Send size={14} /> Create Notification
        </button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Total Dispatched</span>
              <Bell size={16} color="#4338CA" />
            </div>
            <div className="admin-stat-card-value">{stats.total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Read Confirmations</span>
              <CheckCircle2 size={16} color="#059669" />
            </div>
            <div className="admin-stat-card-value">{stats.total_reads}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Info Advisories</span>
              <Info size={16} color="#0891B2" />
            </div>
            <div className="admin-stat-card-value">{stats.by_type['info'] || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Urgent Alerts</span>
              <ShieldAlert size={16} color="#DC2626" />
            </div>
            <div className="admin-stat-card-value">
              {(stats.by_type['alert'] || 0) + (stats.by_type['warning'] || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Table */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sent Notification History</span>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="admin-empty">No notifications have been dispatched</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title & Message</th>
                <th>Type</th>
                <th>Audience</th>
                <th>Sent By</th>
                <th>Reads</th>
                <th>Date Sent</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.message}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${n.type}`}>
                      {n.type}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12 }}>
                      {n.target_type === 'all_patients' ? 'All Patients' : n.target_type}
                    </span>
                  </td>
                  <td>{n.created_by_name || 'System Admin'}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{n.read_count}</span>
                  </td>
                  <td>{fmtDate(n.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="admin-table-pagination">
          <span>
            Showing {Math.min(((pagination.page - 1) * pagination.per_page) + 1, pagination.total)}–
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
          </span>
          <div className="admin-pagination-buttons">
            <button
              className="admin-pagination-btn"
              disabled={pagination.page <= 1}
              onClick={() => loadData(pagination.page - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
              const p = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
              if (p > pagination.total_pages || p < 1) return null
              return (
                <button
                  key={p}
                  className={`admin-pagination-btn ${pagination.page === p ? 'active' : ''}`}
                  onClick={() => loadData(p)}
                >
                  {p}
                </button>
              )
            })}
            <button
              className="admin-pagination-btn"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => loadData(pagination.page + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Compose Notification Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 520,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
              Broadcast Notification
            </h3>

            <form onSubmit={handleCreateNotification}>
              <div className="admin-form-group">
                <label className="admin-form-label">Notification Title</label>
                <input
                  className="admin-form-input"
                  placeholder="e.g., Seasonal Flu Health Advisory"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="admin-form-label">Notification Type</label>
                  <select
                    className="admin-form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="info">Info Advisory</option>
                    <option value="warning">Health Warning</option>
                    <option value="alert">Critical Alert</option>
                    <option value="system">System Notice</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">Target Audience</label>
                  <select
                    className="admin-form-select"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                  >
                    <option value="all_patients">All Registered Patients</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Message Body</label>
                <textarea
                  className="admin-form-textarea"
                  rows={4}
                  placeholder="Detailed notification text to deliver to users…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting}
                >
                  <Send size={14} /> Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
