import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server, Database, Brain, Lock, Sparkles } from 'lucide-react'
import { getSystemHealth } from '../services/adminApi'
import type { SystemHealth } from '../adminTypes'

const SERVICE_ICONS: Record<string, any> = {
  database: Database,
  backend_api: Server,
  ai_service: Brain,
  authentication: Lock,
  gemini_service: Sparkles,
}

const SERVICE_NAMES: Record<string, string> = {
  database: 'PostgreSQL Database Engine',
  backend_api: 'Flask REST API Gateway',
  ai_service: 'Machine Learning Diagnostic Engine',
  authentication: 'JWT Authorization & RBAC',
  gemini_service: 'Gemini AI Enrichment API',
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getSystemHealth()
      setHealth(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">System Infrastructure & Health</h1>
          <p className="admin-page-subtitle">Real-time status of CareTrack AI backend services and dependencies</p>
        </div>
        <button
          className="admin-btn admin-btn-secondary"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={14}
            style={{ animation: refreshing ? 'spinSlow 0.8s linear infinite' : 'none' }}
          />{' '}
          Run Health Diagnostic
        </button>
      </div>

      {/* Overall Health Banner */}
      {health && (
        <div
          style={{
            background: health.overall === 'operational' ? 'rgba(5,150,105,0.06)' : 'rgba(217,119,6,0.06)',
            border: `1px solid ${health.overall === 'operational' ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}`,
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {health.overall === 'operational' ? (
              <CheckCircle2 size={24} color="#059669" />
            ) : (
              <AlertTriangle size={24} color="#D97706" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {health.overall === 'operational'
                  ? 'All Systems Fully Operational'
                  : 'System Operating in Degraded State'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Last diagnostic run at {fmtDate(health.checked_at)}
              </div>
            </div>
          </div>
          <span className={`admin-badge admin-badge-${health.overall}`}>
            {health.overall.toUpperCase()}
          </span>
        </div>
      )}

      {/* Health Cards Grid */}
      {error ? (
        <div className="admin-error"><div className="admin-error-message">{error}</div></div>
      ) : loading && !health ? (
        <div className="admin-loading"><div className="admin-loading-spinner" /></div>
      ) : health ? (
        <div className="admin-health-grid">
          {Object.entries(health.services).map(([key, svc]) => {
            const Icon = SERVICE_ICONS[key] || Shield
            return (
              <div className="admin-health-card" key={key}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background:
                      svc.status === 'operational'
                        ? 'rgba(5,150,105,0.08)'
                        : svc.status === 'degraded'
                        ? 'rgba(217,119,6,0.08)'
                        : 'rgba(220,38,38,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    size={20}
                    color={
                      svc.status === 'operational'
                        ? '#059669'
                        : svc.status === 'degraded'
                        ? '#D97706'
                        : '#DC2626'
                    }
                  />
                </div>

                <div className="admin-health-info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <h3>{SERVICE_NAMES[key] || key}</h3>
                    <div className={`admin-health-indicator ${svc.status}`} />
                  </div>
                  <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>{svc.details}</p>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Checked: {fmtDate(svc.checked_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Server & Environment Information */}
      <div className="admin-detail-card" style={{ marginTop: 24 }}>
        <h3>Environment & Security Specifications</h3>
        <div className="admin-detail-grid">
          <div className="admin-detail-field">
            <label>Backend Framework</label>
            <span>Flask 3.1.1 (WSGI)</span>
          </div>
          <div className="admin-detail-field">
            <label>Database Engine</label>
            <span>PostgreSQL (ThreadedConnectionPool)</span>
          </div>
          <div className="admin-detail-field">
            <label>Machine Learning Core</label>
            <span>scikit-learn 1.6.1 + Naive Bayes</span>
          </div>
          <div className="admin-detail-field">
            <label>Token Lifecycle</label>
            <span>15m Access Token / 7d Refresh Token</span>
          </div>
          <div className="admin-detail-field">
            <label>Frontend Runtime</label>
            <span>React 19 + Vite 8</span>
          </div>
          <div className="admin-detail-field">
            <label>Security Protocol</label>
            <span>Role-Based Access Control (RBAC)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
