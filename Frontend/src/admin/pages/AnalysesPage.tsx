import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { getAnalyses, exportData } from '../services/adminApi'
import type { AdminAnalysis, AdminPage, Pagination } from '../adminTypes'

interface Props { onNavigate: (page: AdminPage, id?: string) => void }

export default function AnalysesPage({ onNavigate }: Props) {
  const [analyses, setAnalyses] = useState<AdminAnalysis[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async (page = 1) => {
    setLoading(true); setError('')
    try {
      const res = await getAnalyses({ page, per_page: 20, search, status })
      setAnalyses(res.analyses); setPagination(res.pagination)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [search, status])

  useEffect(() => { loadData() }, [loadData])

  const handleExport = async () => {
    try {
      const blob = await exportData('analyses')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'analyses.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert('Export failed: ' + e.message) }
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analysis Management</h1>
          <p className="admin-page-subtitle">{pagination.total} total analyses</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
            <input className="admin-table-search" style={{ paddingLeft: 32 }}
              placeholder="Search by patient name…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-table-filters">
            <select className="admin-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : analyses.length === 0 ? (
          <div className="admin-empty">No analyses found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age/Gender</th>
                <th>Symptoms</th>
                <th>Top Prediction</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(a => (
                <tr key={a.id} className="admin-table-clickable">
                  <td style={{ fontWeight: 600 }}>{a.patient_name || '—'}</td>
                  <td>{a.patient_age || '—'} / {a.patient_gender || '—'}</td>
                  <td>{a.symptom_count} symptoms</td>
                  <td style={{ fontWeight: 500 }}>{a.top_disease || '—'}</td>
                  <td>{a.top_confidence != null ? `${a.top_confidence.toFixed(1)}%` : '—'}</td>
                  <td><span className={`admin-badge admin-badge-${a.status}`}>{a.status}</span></td>
                  <td>{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="admin-table-pagination">
          <span>Showing {Math.min(((pagination.page - 1) * pagination.per_page) + 1, pagination.total)}–{Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}</span>
          <div className="admin-pagination-buttons">
            <button className="admin-pagination-btn" disabled={pagination.page <= 1} onClick={() => loadData(pagination.page - 1)}><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
              const p = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
              if (p > pagination.total_pages || p < 1) return null
              return <button key={p} className={`admin-pagination-btn ${pagination.page === p ? 'active' : ''}`} onClick={() => loadData(p)}>{p}</button>
            })}
            <button className="admin-pagination-btn" disabled={pagination.page >= pagination.total_pages} onClick={() => loadData(pagination.page + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
