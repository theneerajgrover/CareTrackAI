import { useState, useEffect } from 'react'
import { Users, Activity, FileText, MessageSquare, AlertTriangle, TrendingUp, Brain, Server } from 'lucide-react'
import { getDashboardStats, getDashboardCharts, getDashboardActivity } from '../services/adminApi'
import type { DashboardStats, DashboardCharts, ActivityItem, AdminPage } from '../adminTypes'
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
      const [s, c, a] = await Promise.all([
        getDashboardStats(range),
        getDashboardCharts(range),
        getDashboardActivity(15),
      ])
      setStats(s)
      setCharts(c)
      setActivities(a.activities)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return <div className="admin-loading"><div className="admin-loading-spinner" /><span>Loading dashboard…</span></div>
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

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">CareTrack AI operational overview</p>
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

          <div className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label">AI Predictions</span>
              <div className="admin-stat-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}><Brain size={18} color="#7C3AED" /></div>
            </div>
            <div className="admin-stat-card-value">{formatNum(stats.ai.total_prediction_results)}</div>
            <div className="admin-stat-card-sub">prediction results generated</div>
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
              <span className="admin-stat-card-label">System</span>
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

      {/* Charts */}
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
