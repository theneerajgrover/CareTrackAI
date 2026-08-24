import { useState, useEffect } from 'react'
import { Brain, CheckCircle, AlertCircle, Cpu, Zap, Activity, Database, Clock } from 'lucide-react'
import { getAIStats, getAIModels } from '../services/adminApi'
import type { AIStats, AIModel } from '../adminTypes'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const RISK_COLORS: Record<string, string> = {
  low: '#059669',
  medium: '#D97706',
  high: '#DC2626',
  critical: '#991B1B',
}

export default function AIMonitoringPage() {
  const [stats, setStats] = useState<AIStats | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [s, m] = await Promise.all([getAIStats(), getAIModels()])
      setStats(s)
      setModels(m.models)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <span>Loading AI telemetry…</span>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="admin-error">
        <div className="admin-error-message">{error}</div>
        <button className="admin-btn admin-btn-primary" onClick={loadData}>
          Retry
        </button>
      </div>
    )
  }

  const model = stats?.current_model

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">AI & Model Monitoring</h1>
          <p className="admin-page-subtitle">
            Diagnostics, model versioning, and inference performance
          </p>
        </div>
        {model && (
          <span className="admin-badge admin-badge-production">
            Active: {model.version} ({model.model_type})
          </span>
        )}
      </div>

      {/* Production Model Details Card */}
      {model && (
        <div className="admin-detail-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={20} color="#4338CA" />
              <h3 style={{ margin: 0, border: 'none', padding: 0 }}>
                {model.name} — <span style={{ color: '#4338CA' }}>{model.version}</span>
              </h3>
            </div>
            <span className="admin-badge admin-badge-operational">In Production</span>
          </div>

          <div className="admin-detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <div className="admin-detail-field">
              <label>Architecture</label>
              <span style={{ fontWeight: 600 }}>{model.model_type}</span>
            </div>
            <div className="admin-detail-field">
              <label>Accuracy (Test Set)</label>
              <span style={{ fontWeight: 700, color: '#059669', fontSize: 16 }}>
                {model.accuracy != null ? `${(model.accuracy * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="admin-detail-field">
              <label>F1-Score</label>
              <span style={{ fontWeight: 600 }}>
                {model.f1_score != null ? model.f1_score.toFixed(4) : '—'}
              </span>
            </div>
            <div className="admin-detail-field">
              <label>Input Features (Symptoms)</label>
              <span style={{ fontWeight: 600 }}>{model.num_features || 377}</span>
            </div>
            <div className="admin-detail-field">
              <label>Classified Diseases</label>
              <span style={{ fontWeight: 600 }}>{model.num_diseases || 713}</span>
            </div>
            <div className="admin-detail-field">
              <label>Training Samples</label>
              <span style={{ fontWeight: 600 }}>{model.num_train_samples?.toLocaleString() || '197,556'}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Total Inferences</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(67,56,202,0.08)' }}>
                <Zap size={18} color="#4338CA" />
              </div>
            </div>
            <div className="admin-stat-card-value">{stats.predictions.total}</div>
            <div className="admin-stat-card-sub">
              {stats.predictions.completed} completed • {stats.predictions.failed} failed
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Avg Top Confidence</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(5,150,105,0.08)' }}>
                <CheckCircle size={18} color="#059669" />
              </div>
            </div>
            <div className="admin-stat-card-value">
              {stats.avg_top_confidence != null ? `${stats.avg_top_confidence}%` : '—'}
            </div>
            <div className="admin-stat-card-sub">Across primary diagnoses</div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Results Generated</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>
                <Database size={18} color="#7C3AED" />
              </div>
            </div>
            <div className="admin-stat-card-value">{stats.predictions.total_results}</div>
            <div className="admin-stat-card-sub">Top 5 differential items</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="admin-charts-grid">
          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Inference Volume (Last 30 Days)</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.volume}>
                <defs>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#7C3AED"
                  fill="url(#colorAI)"
                  strokeWidth={2}
                  name="Inferences"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Diagnostic Risk Stratification</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.risk_distribution}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {stats.risk_distribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.level.toLowerCase()] || '#6B7280'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model Versions Catalog */}
      <div className="admin-detail-card" style={{ marginTop: 24 }}>
        <h3>Registered Models in Database ({models.length})</h3>
        {models.length === 0 ? (
          <div className="admin-empty" style={{ padding: 20 }}>No registered models</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Version</th>
                <th>Architecture</th>
                <th>Accuracy</th>
                <th>F1 Score</th>
                <th>Features</th>
                <th>Diseases</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td><code>{m.version}</code></td>
                  <td>{m.model_type}</td>
                  <td style={{ fontWeight: 600, color: '#059669' }}>
                    {m.accuracy != null ? `${(m.accuracy * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td>{m.f1_score != null ? m.f1_score.toFixed(4) : '—'}</td>
                  <td>{m.num_features || '—'}</td>
                  <td>{m.num_diseases || '—'}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${m.status.toLowerCase()}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
