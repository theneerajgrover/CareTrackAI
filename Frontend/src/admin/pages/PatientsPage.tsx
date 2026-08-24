import { useState, useEffect, useCallback } from 'react'
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPatients, exportData } from '../services/adminApi'
import type { AdminPatient, AdminPage, Pagination } from '../adminTypes'

interface Props { onNavigate: (page: AdminPage, id?: string) => void }

export default function PatientsPage({ onNavigate }: Props) {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 20, total: 0, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created_at')
  const [dir, setDir] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPatients = useCallback(async (page = 1) => {
    setLoading(true); setError('')
    try {
      const res = await getPatients({ page, per_page: 20, search, status, sort, dir })
      setPatients(res.patients); setPagination(res.pagination)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [search, status, sort, dir])

  useEffect(() => { loadPatients() }, [loadPatients])

  const handleSort = (col: string) => {
    if (sort === col) { setDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSort(col); setDir('desc') }
  }

  const handleExport = async () => {
    try {
      const blob = await exportData('patients')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'patients.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert('Export failed: ' + e.message) }
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Patient Management</h1>
          <p className="admin-page-subtitle">{pagination.total} registered patients</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
            <input className="admin-table-search" style={{ paddingLeft: 32 }}
              placeholder="Search by name or email…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-table-filters">
            <select className="admin-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : patients.length === 0 ? (
          <div className="admin-empty">No patients found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>Name {sort === 'name' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => handleSort('email')}>Email {sort === 'email' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Analyses</th>
                <th onClick={() => handleSort('created_at')}>Registered {sort === 'created_at' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Last Analysis</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="admin-table-clickable"
                  onClick={() => onNavigate('admin-patient-detail', p.id)}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.phone || '—'}</td>
                  <td><span className={`admin-badge admin-badge-${p.status}`}>{p.status}</span></td>
                  <td>{p.analysis_count}</td>
                  <td>{fmtDate(p.created_at)}</td>
                  <td>{fmtDate(p.last_analysis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="admin-table-pagination">
          <span>Showing {((pagination.page - 1) * pagination.per_page) + 1}–{Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}</span>
          <div className="admin-pagination-buttons">
            <button className="admin-pagination-btn" disabled={pagination.page <= 1} onClick={() => loadPatients(pagination.page - 1)}><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
              const p = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
              if (p > pagination.total_pages || p < 1) return null
              return <button key={p} className={`admin-pagination-btn ${pagination.page === p ? 'active' : ''}`} onClick={() => loadPatients(p)}>{p}</button>
            })}
            <button className="admin-pagination-btn" disabled={pagination.page >= pagination.total_pages} onClick={() => loadPatients(pagination.page + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
