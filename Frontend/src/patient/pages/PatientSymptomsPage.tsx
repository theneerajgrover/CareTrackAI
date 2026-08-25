import { useState, useEffect } from 'react'
import { Stethoscope, Search, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getAllSymptoms } from '../../services/api'

interface Props {
  onStartHealthCheck: () => void
}

export default function PatientSymptomsPage({ onStartHealthCheck }: Props) {
  const [symptoms, setSymptoms] = useState<{ id: number; key: string; label: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadSymptoms()
  }, [])

  async function loadSymptoms() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllSymptoms()
      setSymptoms(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load symptoms library.')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(symptoms.map((s) => s.category || 'general')))]

  const filtered = symptoms.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory
    const matchesSearch =
      !search ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.key.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Symptom Library & Signals</h1>
          <p className="patient-page-subtitle">
            Explore 377 clinical health indicators recognized by the CareTrack AI inference engine.
          </p>
        </div>
        <button
          onClick={onStartHealthCheck}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 18px', borderRadius: 9999, background: '#4338ca', color: '#fff', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
        >
          <Sparkles size={14} />
          Start Health Check
        </button>
      </div>

      <div className="patient-card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by symptom name or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? '#4338ca' : '#e2e8f0',
                  background: selectedCategory === cat ? '#4338ca' : '#f8fafc',
                  color: selectedCategory === cat ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="patient-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <RefreshCw size={24} className="animate-spin text-indigo-600" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Loading symptom database...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#dc2626' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>{error}</p>
            <button onClick={loadSymptoms} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              <span>Showing {filtered.length} of {symptoms.length} symptoms</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.category || 'General'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
