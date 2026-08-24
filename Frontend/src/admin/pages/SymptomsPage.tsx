import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Filter } from 'lucide-react'
import { getSymptoms, getSymptomCategories, updateSymptom } from '../services/adminApi'
import type { AdminSymptom, SymptomCategory, Pagination } from '../adminTypes'

export default function SymptomsPage() {
  const [symptoms, setSymptoms] = useState<AdminSymptom[]>([])
  const [categories, setCategories] = useState<SymptomCategory[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 50, total: 0, total_pages: 1 })
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const loadData = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const [sympRes, catRes] = await Promise.all([
        getSymptoms({ page, per_page: 50, search, category: selectedCategory, status: selectedStatus }),
        getSymptomCategories(),
      ])
      setSymptoms(sympRes.symptoms)
      setPagination(sympRes.pagination)
      setCategories(catRes.categories)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory, selectedStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleStatus = async (symptom: AdminSymptom) => {
    setTogglingId(symptom.id)
    try {
      await updateSymptom(symptom.id, { is_active: !symptom.is_active })
      setSymptoms((prev) =>
        prev.map((s) => (s.id === symptom.id ? { ...s, is_active: !s.is_active } : s))
      )
    } catch (e: any) {
      alert('Failed to update symptom: ' + e.message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Symptom Database</h1>
          <p className="admin-page-subtitle">
            {pagination.total} cataloged symptoms across {categories.length} clinical domains
          </p>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
            <input
              className="admin-table-search"
              style={{ paddingLeft: 32 }}
              placeholder="Search by label or dataset key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-table-filters">
            <select
              className="admin-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="admin-error"><div className="admin-error-message">{error}</div></div>
        ) : loading ? (
          <div className="admin-loading"><div className="admin-loading-spinner" /></div>
        ) : symptoms.length === 0 ? (
          <div className="admin-empty">No symptoms match the current filter</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Symptom Label</th>
                <th>Dataset Key</th>
                <th>Category</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {symptoms.map((s) => (
                <tr key={s.id}>
                  <td style={{ color: '#9ca3af', width: 60 }}>#{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.label}</td>
                  <td>
                    <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                      {s.key}
                    </code>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-info">
                      {s.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${s.is_active ? 'active' : 'inactive'}`}>
                      {s.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`admin-btn admin-btn-sm ${s.is_active ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                      disabled={togglingId === s.id}
                      onClick={() => handleToggleStatus(s)}
                    >
                      {s.is_active ? (
                        <>
                          <XCircle size={13} /> Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} /> Activate
                        </>
                      )}
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
    </div>
  )
}
