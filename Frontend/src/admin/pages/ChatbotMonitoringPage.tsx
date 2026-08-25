import { useState, useEffect } from 'react'
import {
  Bot, Activity, Clock, CheckCircle2, AlertTriangle, MessageSquare,
  RefreshCw, ChevronRight, Eye, ShieldAlert, Cpu, Sparkles, User as UserIcon,
  X, Layers, Zap
} from 'lucide-react'
import {
  getAdminChatbotStats,
  getAdminChatbotSessions,
  getAdminChatSessionMessages,
  getAdminChatbotActivity
} from '../services/adminApi'
import type { AdminChatbotStats, AdminChatSession } from '../adminTypes'
import type { ChatMessage } from '../../types'

export default function ChatbotMonitoringPage() {
  const [stats, setStats] = useState<AdminChatbotStats | null>(null)
  const [sessions, setSessions] = useState<AdminChatSession[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transcript Audit Drawer
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<AdminChatSession | null>(null)
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, sessRes, actRes] = await Promise.all([
        getAdminChatbotStats().catch(() => null),
        getAdminChatbotSessions({ page: 1, per_page: 20 }).catch(() => ({ sessions: [], total: 0, page: 1, per_page: 20 })),
        getAdminChatbotActivity(15).catch(() => ({ activity: [] })),
      ])

      if (statsRes?.stats) setStats(statsRes.stats)
      setSessions(sessRes?.sessions || [])
      setActivity(actRes?.activity || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load chatbot monitoring telemetry.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  async function openTranscript(session: AdminChatSession) {
    setSelectedSession(session)
    setSelectedSessionId(session.id)
    setLoadingTranscript(true)
    try {
      const res = await getAdminChatSessionMessages(session.id)
      setSessionMessages(res.messages || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load session transcript.')
    } finally {
      setLoadingTranscript(false)
    }
  }

  function closeTranscript() {
    setSelectedSessionId(null)
    setSelectedSession(null)
    setSessionMessages([])
  }

  return (
    <div className="admin-page">
      {/* Top Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'rgba(67,56,202,0.08)', color: '#4338ca', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
            <Bot size={13} />
            OpenAI Clinical Telemetry
          </div>
          <h1 className="admin-page-title">AI Chatbot Monitoring</h1>
          <p className="admin-page-subtitle">
            Monitor real-time patient medical inquiries, OpenAI response latency, model distributions, and service uptime.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={refreshing ? 'admin-spin' : ''} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', padding: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid (Real database data only) */}
      <div className="admin-grid-4" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Total Sessions</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(67,56,202,0.08)' }}>
              <Bot size={18} color="#4338CA" />
            </div>
          </div>
          <div className="admin-stat-value">{loading ? '—' : stats?.total_sessions ?? 0}</div>
          <div className="admin-stat-desc">Patient conversation sessions</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Messages Processed</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(5,150,105,0.08)' }}>
              <MessageSquare size={18} color="#059669" />
            </div>
          </div>
          <div className="admin-stat-value">{loading ? '—' : stats?.total_messages ?? 0}</div>
          <div className="admin-stat-desc">Patient questions asked</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">AI Responses</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>
              <Sparkles size={18} color="#7C3AED" />
            </div>
          </div>
          <div className="admin-stat-value">{loading ? '—' : stats?.ai_responses ?? 0}</div>
          <div className="admin-stat-desc">Clinical answers generated</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Avg AI Latency</span>
            <div className="admin-stat-icon" style={{ background: 'rgba(217,119,6,0.08)' }}>
              <Clock size={18} color="#D97706" />
            </div>
          </div>
          <div className="admin-stat-value">{loading ? '—' : `${stats?.avg_response_time_ms ?? 0}ms`}</div>
          <div className="admin-stat-desc">Average OpenAI roundtrip</div>
        </div>
      </div>

      {/* Engine Status & Architecture Overview */}
      <div className="admin-grid-2" style={{ marginBottom: 24 }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Cpu size={16} color="#4338ca" />
              <span>AI Engine & Service Health</span>
            </div>
            <span
              className={`admin-badge ${
                stats?.service_status?.status === 'operational' ? 'admin-badge-success' : 'admin-badge-warning'
              }`}
            >
              {stats?.service_status?.status === 'operational' ? 'OPERATIONAL' : 'FALLBACK ACTIVE'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Engine</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{stats?.service_status?.engine || 'OpenAI gpt-4o-mini'}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Success Rate</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{stats?.success_rate_pct ?? 100}%</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Active in 24h</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{stats?.active_sessions_24h ?? 0} sessions</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Failed / Fallback</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: (stats?.failed_requests || 0) > 0 ? '#dc2626' : '#64748b' }}>
                {stats?.failed_requests ?? 0} requests
              </span>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Privacy & Security:</span> Patient medical questions are processed strictly via server-side isolated endpoints with patient authentication, response latency logging, and zero frontend API key exposure.
          </div>
        </div>

        {/* Model Distribution */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Layers size={16} color="#4338ca" />
              <span>Model Utilization Breakdown</span>
            </div>
          </div>

          {!stats?.model_breakdown || stats.model_breakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: 12 }}>
              <Bot size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No Chatbot Activity Yet</p>
              <p style={{ margin: 0 }}>Model usage will appear once patients initiate chat consultations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.model_breakdown.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#4338ca' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{m.model}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', padding: '2px 8px', borderRadius: 9999, background: 'rgba(67,56,202,0.1)' }}>
                    {m.count} responses
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Chatbot Sessions Table */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">
            <Bot size={16} color="#4338ca" />
            <span>Recent Patient Chatbot Sessions</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            {sessions.length} Recorded Session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: 13 }}>
            <RefreshCw size={18} className="admin-spin" style={{ margin: '0 auto 8px', color: '#4338ca' }} />
            Loading chatbot sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 10px', color: '#64748b' }}>
            <Bot size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 4px', fontSize: 14 }}>No Chatbot Activity Yet</p>
            <p style={{ fontSize: 12, margin: 0 }}>Conversations initiated by authenticated patients will be monitored here.</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session ID / Topic</th>
                  <th>Patient</th>
                  <th>Messages</th>
                  <th>Avg Latency</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Last Activity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{s.title || 'Medical Consultation'}</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>{s.id.slice(0, 8)}...</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{s.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.patient_email}</div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info" style={{ fontWeight: 700 }}>
                        {s.message_count} msgs
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>
                        {s.avg_latency_ms ? `${s.avg_latency_ms}ms` : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${s.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openTranscript(s)}
                        className="admin-btn admin-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Eye size={12} /> Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Event Stream Feed */}
      {activity.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Zap size={16} color="#4338ca" />
              <span>Live Chat Telemetry Stream</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: act.sender === 'user' ? '#e0e7ff' : '#ecfdf5',
                      color: act.sender === 'user' ? '#4338ca' : '#059669',
                      textTransform: 'uppercase',
                    }}
                  >
                    {act.sender}
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{act.patient_name}:</span>
                  <span style={{ color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {act.content}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {act.response_time_ms > 0 && (
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>{act.response_time_ms}ms</span>
                  )}
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript Audit Modal / Drawer */}
      {selectedSessionId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={closeTranscript}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 700,
              maxHeight: '85vh',
              background: '#fff',
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {selectedSession?.title || 'Medical Consultation Transcript'}
                  </h3>
                  <span className="admin-badge admin-badge-info">
                    {sessionMessages.length} Messages
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                  Patient: {selectedSession?.patient_name} ({selectedSession?.patient_email})
                </p>
              </div>
              <button
                onClick={closeTranscript}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingTranscript ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 12 }}>
                  <RefreshCw size={16} className="admin-spin" style={{ margin: '0 auto 8px', color: '#4338ca' }} />
                  Loading session transcript...
                </div>
              ) : sessionMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 12 }}>
                  No messages found for this session.
                </div>
              ) : (
                sessionMessages.map((m) => {
                  const isUser = m.sender === 'user'
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: 14,
                          fontSize: 12,
                          lineHeight: 1.5,
                          background: isUser ? '#4338ca' : '#f1f5f9',
                          color: isUser ? '#fff' : '#0f172a',
                          border: isUser ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 2, opacity: 0.8 }}>
                          {isUser ? 'Patient' : `CareTrack AI (${m.model || 'gpt-4o-mini'})`}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 9, opacity: 0.7 }}>
                          <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</span>
                          {!isUser && m.response_time_ms ? <span>{m.response_time_ms}ms</span> : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeTranscript}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '6px 16px', fontSize: 12 }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
