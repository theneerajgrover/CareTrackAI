import { useState, useEffect } from 'react'
import { User as UserIcon, Mail, Phone, Shield, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { getUserProfile, updateUserProfile } from '../../services/api'
import type { User } from '../../types'

interface Props {
  user: User | null
  onUpdateUser: (user: User) => void
}

export default function PatientProfilePage({ user, onUpdateUser }: Props) {
  const [profile, setProfile] = useState<User | null>(user)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await getUserProfile()
      setProfile(res.user)
      setName(res.user.name || '')
      setPhone(res.user.phone || '')
    } catch {
      // Keep props user if endpoint returns cached
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const res = await updateUserProfile(name, phone)
      setProfile(res.user)
      onUpdateUser(res.user)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="patient-page-header">
        <div>
          <h1 className="patient-page-title">Patient Account & Profile</h1>
          <p className="patient-page-subtitle">
            Manage your personal contact information and health account credentials.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Profile Edit Form */}
        <div className="patient-card" style={{ margin: 0 }}>
          <div className="patient-card-header">
            <div className="patient-card-title">
              <UserIcon size={16} color="#4338ca" />
              <span>Personal Information</span>
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

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Email Address (Primary Account ID)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || user?.email || ''}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', background: '#f8fafc', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'block' }}>Email cannot be altered for security authentication.</span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none' }}
              />
            </div>

            <div style={{ paddingTop: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 22px', borderRadius: 8, background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(67,56,202,0.25)' }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Health Account Metadata */}
        <div className="patient-card" style={{ margin: 0 }}>
          <div className="patient-card-header">
            <div className="patient-card-title">
              <Shield size={16} color="#059669" />
              <span>Account Security & Status</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle2 size={16} color="#166534" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Account Active & Verified</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
                Your health data is encrypted and partitioned strictly to your authenticated session.
              </p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                Patient Identifier
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155', wordBreak: 'break-all' }}>
                {profile?.id || user?.id || '—'}
              </span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                Role & Access Level
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
                Patient (Clinical Diagnostic Access)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
