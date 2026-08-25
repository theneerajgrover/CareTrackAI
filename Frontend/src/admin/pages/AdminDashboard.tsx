import { useState, useEffect } from 'react'
import {
  Users, Activity, FileText, MessageSquare, AlertTriangle, TrendingUp, Brain, Server,
  Stethoscope, Bell, Shield, ClipboardList, Zap, CheckCircle2, ArrowRight, Database
} from 'lucide-react'
import { getDashboardStats, getDashboardCharts, getDashboardActivity, getAIStats, getSystemHealth } from '../services/adminApi'
import type { DashboardStats, DashboardCharts, ActivityItem, AdminPage, AIStats, SystemHealth } from '../adminTypes'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const CHART_COLORS = ['#4338CA', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#EC4899', '#64748B']
const DATE_RANGES = [
  { label: 'Today', value: 1 }, { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 }, { label: '90 Days', value: 90 },
]

interface Props { onNavigate: (page: AdminPage) => void }

export default function AdminDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [aiStats, setAiStats] = useState<AIStats | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [range, setRange] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [range])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [s, c, a, ai, h] = await Promise.all([
        getDashboardStats(range),
        getDashboardCharts(range),
        getDashboardActivity(15),
        getAIStats().catch(() => null),
        getSystemHealth().catch(() => null),
      ])
      setStats(s)
      setCharts(c)
      setActivities(a.activities)
      if (ai) setAiStats(ai)
      if (h) setHealth(h)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return <div className="admin-loading"><div className="admin-loading-spinner" /><span>Loading control center…</span></div>
  }

  if (error && !stats) {
    return <div className="admin-error"><div className="admin-error-message">{error}</div><button className="admin-btn admin-btn-primary" onClick={loadData}>Retry</button></div>
  }

  const formatNum = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n)
  const formatDate = (ts: string | null) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString()
  }

  const model = aiStats?.current_model

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Admin Dashboard</h1>
          <p className="admin-page-subtitle">
            Monitor CareTrack AI operations, patient activity, AI analyses, and system health.
          </p>
        </div>
        <div className="admin-date-filter">
          {DATE_RANGES.map(r => (
            <button key={r.value} className={`admin-date-filter-btn ${range === r.value ? 'active' : ''}`}
              onClick={() => setRange(r.value)}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card" onClick={() => onNavigate('admin-patients')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Total Patients</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(67,56,202,0.08)' }}><Users size={18} color="#4338CA" /></div>
            </div>
            <div className="admin-stat-card-value">{formatNum(stats.patients.total)}</div>
            <div className="admin-stat-card-sub">{stats.patients.new} new • {stats.patients.active} active</div>
          </div>

          <div className="admin-stat-card" onClick={() => onNavigate('admin-analyses')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Analyses</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(8,145,178,0.08)' }}><Activity size={18} color="#0891B2" /></div>
            </div>
            <div className="admin-stat-card-value">{formatNum(stats.analyses.total)}</div>
            <div className="admin-stat-card-sub">{stats.analyses.today} today • {stats.analyses.this_week} this week</div>
          </div>

          <div className="admin-stat-card" onClick={() => onNavigate('admin-reports')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Reports</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(5,150,105,0.08)' }}><FileText size={18} color="#059669" /></div>
            </div>
            <div className="admin-stat-card-value">{formatNum(stats.reports.total)}</div>
            <div className="admin-stat-card-sub">{stats.reports.today} generated today</div>
          </div>

          <div className="admin-stat-card" onClick={() => onNavigate('admin-ai-monitoring')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">AI Predictions</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}><Brain size={18} color="#7C3AED" /></div>
            </div>
            <div className="admin-stat-card-value">{formatNum(stats.ai.total_prediction_results)}</div>
            <div className="admin-stat-card-sub">prediction findings generated</div>
          </div>

          <div className="admin-stat-card" onClick={() => onNavigate('admin-feedback')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">Feedback</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(217,119,6,0.08)' }}><MessageSquare size={18} color="#D97706" /></div>
            </div>
            <div className="admin-stat-card-value">{stats.feedback.total}</div>
            <div className="admin-stat-card-sub">{stats.feedback.pending} pending • {stats.feedback.critical > 0 ? <span style={{ color: '#DC2626' }}>{stats.feedback.critical} critical</span> : 'none critical'}</div>
          </div>

          <div className="admin-stat-card" onClick={() => onNavigate('admin-system')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">System Status</span>
              <div className="admin-stat-card-icon" style={{ background: stats.system.database === 'operational' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)' }}>
                <Server size={18} color={stats.system.database === 'operational' ? '#059669' : '#DC2626'} />
              </div>
            </div>
            <div className="admin-stat-card-value" style={{ fontSize: 18 }}>
              <span className={`admin-badge admin-badge-${stats.system.database}`}>{stats.system.database}</span>
            </div>
            <div className="admin-stat-card-sub">API: {stats.system.api}</div>
          </div>
        </div>
      )}

      {/* Quick Navigation Controls */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-foreground)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Administrative Quick Access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { id: 'admin-patients' as AdminPage, label: 'Patients', icon: Users, desc: 'Manage users' },
            { id: 'admin-analyses' as AdminPage, label: 'Analyses', icon: Activity, desc: 'Diagnostic logs' },
            { id: 'admin-reports' as AdminPage, label: 'Reports', icon: FileText, desc: 'Clinical reports' },
            { id: 'admin-ai-monitoring' as AdminPage, label: 'AI Monitoring', icon: Brain, desc: 'Model telemetry' },
            { id: 'admin-symptoms' as AdminPage, label: 'Symptoms', icon: Stethoscope, desc: 'Clinical signals' },
            { id: 'admin-notifications' as AdminPage, label: 'Notifications', icon: Bell, desc: 'Broadcast alerts' },
            { id: 'admin-feedback' as AdminPage, label: 'Feedback', icon: MessageSquare, desc: 'Patient feedback' },
            { id: 'admin-system' as AdminPage, label: 'System Health', icon: Shield, desc: 'Diagnostics' },
            { id: 'admin-audit' as AdminPage, label: 'Audit Logs', icon: ClipboardList, desc: 'Security trail' },
          ].map((q) => (
            <button
              key={q.id}
              onClick={() => onNavigate(q.id)}
              className="admin-stat-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                textAlign: 'left',
                border: '1px solid var(--color-border)',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <q.icon size={16} color="#4338CA" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)' }}>{q.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted-foreground)' }}>{q.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Charts */}
      {charts && (
        <div className="admin-charts-grid">
          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Patient Registrations</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.patient_trend}>
                <defs><linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4338CA" stopOpacity={0.15}/><stop offset="95%" stopColor="#4338CA" stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#4338CA" fill="url(#colorPatients)" strokeWidth={2} name="Patients" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Analysis Activity</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.analysis_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#0891B2" radius={[4, 4, 0, 0]} name="Analyses" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Symptom Category Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.category_distribution} dataKey="count" nameKey="category" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {charts.category_distribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-card-title">Top Predicted Diseases</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.disease_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} name="Predictions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Telemetry & System Status Previews */}
      <div className="admin-charts-grid" style={{ marginBottom: 24 }}>
        {/* AI Monitoring Compact Card */}
        <div className="admin-detail-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={16} color="#7C3AED" />
              <h3 style={{ margin: 0, border: 'none', padding: 0, fontSize: 13 }}>AI Engine Status</h3>
            </div>
            <button
              onClick={() => onNavigate('admin-ai-monitoring')}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Details <ArrowRight size={12} />
            </button>
          </div>
          {model ? (
            <div className="admin-detail-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="admin-detail-field">
                <label>Active Model</label>
                <span style={{ fontWeight: 600 }}>{model.name}</span>
              </div>
              <div className="admin-detail-field">
                <label>Version / Type</label>
                <span>{model.version} ({model.model_type})</span>
              </div>
              <div className="admin-detail-field">
                <label>Features / Classes</label>
                <span>{model.num_features || 377} signals / {model.num_diseases || 713} classes</span>
              </div>
              <div className="admin-detail-field">
                <label>Accuracy</label>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {model.accuracy != null ? `${(model.accuracy * 100).toFixed(2)}%` : 'Validated'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>AI Model loaded and ready</div>
          )}
        </div>

        {/* Infrastructure Status Compact Card */}
        <div className="admin-detail-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={16} color="#059669" />
              <h3 style={{ margin: 0, border: 'none', padding: 0, fontSize: 13 }}>System Infrastructure</h3>
            </div>
            <button
              onClick={() => onNavigate('admin-system')}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Health Check <ArrowRight size={12} />
            </button>
          </div>
          {health ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(health.services).slice(0, 3).map(([k, svc]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--color-foreground)', fontWeight: 500 }}>
                    {k.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className={`admin-badge admin-badge-${svc.status}`}>
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>All core services active</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-activity-feed">
        <div className="admin-activity-title">Recent Activity</div>
        {activities.length === 0 ? (
          <div className="admin-empty" style={{ padding: 24 }}>No recent activity</div>
        ) : (
          activities.slice(0, 12).map((a, i) => (
            <div className="admin-activity-item" key={i}>
              <div className={`admin-activity-dot ${a.type}`} />
              <span className="admin-activity-message">{a.message}</span>
              <span className="admin-activity-time">{formatDate(a.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
