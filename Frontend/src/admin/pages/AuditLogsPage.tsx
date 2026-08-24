import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { getAuditLogs } from '../services/adminApi'
import type { AuditLog, Pagination } from '../adminTypes'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 30, total: 0, total_pages: 1 })
  const [selectedAction, setSelectedAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await getAuditLogs({ page, per_page: 30, action: selectedAction })
      setLogs(res.logs)
      setActionTypes(res.action_types)
      setPagination(res.pagination)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedAction])

  useEffect(() => {
    loadData()
  }, [loadData])

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Security & Audit Logs</h1>
          <p className="admin-page-subtitle">Immutable compliance and administrative action tracking</p>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div className="admin-table-filters">
            <select
              className="admin-filter-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">All Action Types ({actionTypes.length})</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="admin-empty">No audit records found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin User</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Details / Payload</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ color: '#4b5563', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{l.admin_email || 'System'}</td>
                  <td>
                    <span className="admin-badge admin-badge-info">
                      {l.action}
                    </span>
                  </td>
                  <td>
                    {l.resource_type ? (
                      <span style={{ fontSize: 12 }}>
                        {l.resource_type} {l.resource_id ? `#${l.resource_id.slice(0, 8)}…` : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                    {l.details || '—'}
                  </td>
                  <td>
                    <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                      {l.ip_address || '127.0.0.1'}
                    </code>
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
    </div>
  )
}
