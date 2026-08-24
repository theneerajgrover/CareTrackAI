import { useState } from 'react'
import { Heart, Eye, EyeOff, Loader2 } from 'lucide-react'
import { adminLogin } from '../services/adminApi'
import type { AdminUser } from '../adminTypes'

interface Props {
  onLogin: (admin: AdminUser) => void
}

export default function AdminLoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Email is required'); return }
    if (!password) { setError('Password is required'); return }

    setLoading(true)
    try {
      const res = await adminLogin(email.trim(), password)
      onLogin(res.admin)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card animate-scale-in">
        <div className="admin-login-brand">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #4338CA, #7C3AED)', marginBottom: 12 }}>
            <Heart size={24} color="#fff" />
          </div>
          <h1>CareTrack AI</h1>
          <p>Admin Portal — Secure Access</p>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label">Email Address</label>
            <input
              className="admin-form-input"
              type="email"
              placeholder="admin@caretrack.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="admin-form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember session
            </label>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Forgot password?</span>
          </div>

          <button className="admin-login-btn" type="submit" disabled={loading}>
            {loading ? <Loader2 size={18} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> : 'Sign In to Admin Portal'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 20 }}>
          This is a restricted area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
