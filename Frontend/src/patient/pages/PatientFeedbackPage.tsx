import { useState, useEffect } from 'react'
import { MessageSquare, Star, Send, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { submitUserFeedback, getUserFeedback } from '../../services/api'
import type { PatientFeedback } from '../../types'

export default function PatientFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<PatientFeedback[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number>(5)
  const [priority, setPriority] = useState<string>('medium')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadFeedback()
  }, [])

  async function loadFeedback() {
    setLoading(true)
    try {
      const res = await getUserFeedback()
      setFeedbackList(res.feedback || [])
    } catch {
      // empty list
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await submitUserFeedback(subject, message, rating, priority)
      setSuccess('Your feedback has been submitted successfully to the CareTrack clinical team!')
      setSubject('')
      setMessage('')
      loadFeedback()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Patient Support & Feedback</h1>
          <p className="patient-page-subtitle">
            Share your assessment experience, report diagnostic observations, or contact our medical support team.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Feedback Submission Form */}
        <div className="patient-card" style={{ margin: 0 }}>
          <div className="patient-card-header">
            <div className="patient-card-title">
              <MessageSquare size={16} color="#4338ca" />
              <span>Submit New Feedback or Inquiry</span>
            </div>
          </div>

          {success && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Subject / Topic
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Health assessment clarity, feature inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Experience Rating
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: s <= rating ? '#f59e0b' : '#cbd5e1',
                    }}
                  >
                    <Star size={22} fill={s <= rating ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff' }}
              >
                <option value="low">Low (General Feedback)</option>
                <option value="medium">Medium (Standard Inquiry)</option>
                <option value="high">High (Assessment Assistance)</option>
                <option value="critical">Critical (Urgent Platform Issue)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe your feedback, question, or diagnostic observation in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 22px', borderRadius: 8, background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {submitting ? 'Submitting...' : 'Send Feedback'}
              </button>
            </div>
          </form>
        </div>

        {/* Previous Feedback Records */}
        <div className="patient-card" style={{ margin: 0 }}>
          <div className="patient-card-header">
            <div className="patient-card-title">
              <Clock size={16} color="#4338ca" />
              <span>Feedback History ({feedbackList.length})</span>
            </div>
            <button onClick={loadFeedback} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>Loading history...</div>
          ) : feedbackList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
              No feedback submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
              {feedbackList.map((fb) => (
                <div key={fb.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fb.subject}</span>
                    <span className={`patient-badge patient-badge-${fb.status === 'resolved' ? 'low' : 'info'}`}>
                      {fb.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>{fb.message}</p>
                  {fb.admin_response && (
                    <div style={{ padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af', marginTop: 6 }}>
                      <strong>Response from Care Team:</strong> {fb.admin_response}
                    </div>
                  )}
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4 }}>
                    Submitted on {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
