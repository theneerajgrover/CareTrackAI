import { useState, useEffect, useCallback } from 'react'
import { Search, MessageSquare, Star, Send, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { getFeedback, updateFeedback } from '../services/adminApi'
import type { AdminFeedback, FeedbackStats, Pagination } from '../adminTypes'

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<AdminFeedback[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Selected feedback for response
  const [selectedItem, setSelectedItem] = useState<AdminFeedback | null>(null)
  const [adminResponseText, setAdminResponseText] = useState('')
  const [savingResponse, setSavingResponse] = useState(false)

  const loadData = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await getFeedback({ page, per_page: 20, search, status, priority })
      setFeedbackList(res.feedback)
      setStats(res.stats)
      setPagination(res.pagination)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, status, priority])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenDetail = (item: AdminFeedback) => {
    setSelectedItem(item)
    setAdminResponseText(item.admin_response || '')
  }

  const handleSaveResponse = async () => {
    if (!selectedItem) return
    setSavingResponse(true)
    try {
      await updateFeedback(selectedItem.id, {
        admin_response: adminResponseText,
        status: 'resolved',
      })
      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === selectedItem.id
            ? { ...f, admin_response: adminResponseText, status: 'resolved' }
            : f
        )
      )
      setSelectedItem(null)
    } catch (e: any) {
      alert('Failed to save response: ' + e.message)
    } finally {
      setSavingResponse(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateFeedback(id, { status: newStatus })
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      )
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (e: any) {
      alert('Failed to update status: ' + e.message)
    }
  }

  const handleUpdatePriority = async (id: string, newPriority: string) => {
    try {
      await updateFeedback(id, { priority: newPriority })
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, priority: newPriority } : f))
      )
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, priority: newPriority } : null))
      }
    } catch (e: any) {
      alert('Failed to update priority: ' + e.message)
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Feedback Management</h1>
          <p className="admin-page-subtitle">Patient feedback, satisfaction ratings, and resolutions</p>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Total Submissions</span>
              <MessageSquare size={16} color="#4338CA" />
            </div>
            <div className="admin-stat-card-value">{stats.total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Pending Review</span>
              <span className="admin-badge admin-badge-pending">
                {stats.by_status['new'] || 0}
              </span>
            </div>
            <div className="admin-stat-card-value">{stats.by_status['new'] || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Critical Priority</span>
              <span className="admin-badge admin-badge-critical">
                {stats.by_priority['critical'] || 0}
              </span>
            </div>
            <div className="admin-stat-card-value">{stats.by_priority['critical'] || 0}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Avg Rating</span>
              <Star size={16} color="#D97706" fill="#D97706" />
            </div>
            <div className="admin-stat-card-value">
              {stats.avg_rating != null ? `${stats.avg_rating} / 5` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
            <input
              className="admin-table-search"
              style={{ paddingLeft: 32 }}
              placeholder="Search feedback or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-table-filters">
            <select className="admin-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select className="admin-filter-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : feedbackList.length === 0 ? (
          <div className="admin-empty">No feedback found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject & User</th>
                <th>Message Snippet</th>
                <th>Rating</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feedbackList.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.subject || 'No Subject'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {f.user_name || 'Anonymous'} ({f.user_email || 'No email'})
                    </div>
                  </td>
                  <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.message}
                  </td>
                  <td>
                    {f.rating ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 600, color: '#D97706' }}>
                        <Star size={12} fill="#D97706" /> {f.rating}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <select
                      className="admin-filter-select"
                      style={{ height: 26, fontSize: 11, padding: '0 20px 0 6px' }}
                      value={f.priority}
                      onChange={(e) => handleUpdatePriority(f.id, e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${f.status}`}>{f.status}</span>
                  </td>
                  <td>{fmtDate(f.created_at)}</td>
                  <td>
                    <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => handleOpenDetail(f)}>
                      Respond
                    </button>
                  </td>
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

      {/* Response Modal / Detail Drawer */}
      {selectedItem && (
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
              maxWidth: 540,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {selectedItem.subject || 'Feedback Review'}
                </h3>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  From {selectedItem.user_name || 'Anonymous'} ({selectedItem.user_email || 'No email'})
                </span>
              </div>
              <span className={`admin-badge admin-badge-${selectedItem.priority}`}>
                {selectedItem.priority}
              </span>
            </div>

            <div
              style={{
                background: '#f9fafb',
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: '#1f2937',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              {selectedItem.message}
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Admin Response & Resolution Notes</label>
              <textarea
                className="admin-form-textarea"
                rows={4}
                placeholder="Type response or internal resolution notes…"
                value={adminResponseText}
                onChange={(e) => setAdminResponseText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setSelectedItem(null)}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                disabled={savingResponse}
                onClick={handleSaveResponse}
              >
                <Check size={14} /> Save & Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
