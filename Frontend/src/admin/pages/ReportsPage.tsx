import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { getReports, exportData } from '../services/adminApi'
import type { AdminReport, AdminPage, Pagination } from '../adminTypes'

interface Props {
  onNavigate: (page: AdminPage, id?: string) => void
}

export default function ReportsPage({ onNavigate }: Props) {
  const [reports, setReports] = useState<AdminReport[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await getReports({ page, per_page: 20, search })
      setReports(res.reports)
      setPagination(res.pagination)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async () => {
    try {
      const blob = await exportData('analyses')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clinical_reports.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Export failed: ' + e.message)
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Report Management</h1>
          <p className="admin-page-subtitle">{pagination.total} finalized clinical reports</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
            <input
              className="admin-table-search"
              style={{ paddingLeft: 32 }}
              placeholder="Search by patient name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : reports.length === 0 ? (
          <div className="admin-empty">No reports found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age/Gender</th>
                <th>Top Predicted Disease</th>
                <th>Risk Level</th>
                <th>Results Stored</th>
                <th>Model Version</th>
                <th>Date Generated</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="admin-table-clickable"
                  onClick={() => onNavigate('admin-analyses')}
                >
                  <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} style={{ color: '#4338CA' }} />
                    {r.patient_name || '—'}
                  </td>
                  <td>{r.patient_age || '—'} / {r.patient_gender || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{r.top_disease || '—'}</td>
                  <td>
                    {r.risk_level ? (
                      <span className={`admin-badge admin-badge-${r.risk_level.toLowerCase()}`}>
                        {r.risk_level}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{r.result_count} findings</td>
                  <td>{r.model_version || 'v1.0'}</td>
                  <td>{fmtDate(r.created_at)}</td>
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
