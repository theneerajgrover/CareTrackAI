import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Activity, ArrowLeft, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import { login, register } from '../services/api'
import AnimatedVisual3D from '../components/AnimatedVisual3D'
import { fadeUp, staggerContainer, staggerItem, buttonHover, buttonTap, shakeX } from '../motion/variants'
import type { Page, User } from '../types'

interface AuthPageProps {
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
  onNavigate: (page: Page) => void
  onAuthenticate: (user: User) => void
}

export default function AuthPage({ mode, onModeChange, onNavigate, onAuthenticate }: AuthPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [shakeField, setShakeField] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)

    if (!form.email) { setShakeField('email'); setTimeout(() => setShakeField(null), 400); return }
    if (!form.password) { setShakeField('password'); setTimeout(() => setShakeField(null), 400); return }

    if (mode === 'register' && form.password !== form.confirm) {
      setApiError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await login(form.email, form.password)
        onAuthenticate(res.user)
        if (res.is_admin) {
          onNavigate('admin-dashboard')
        } else {
          onNavigate('home')
        }
      } else {
        const res = await register(form.name, form.email, form.password, form.phone)
        onAuthenticate(res.user)
        onNavigate('home')
      }
    } catch (err: any) {
      setApiError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function set(key: keyof typeof form, value: string) {
    setForm({ ...form, [key]: value })
    if (apiError) setApiError(null)
  }

  const inputBase = 'w-full h-11 px-4 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all'

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel (dark) ── */}
      <motion.div
        className="hidden lg:flex lg:w-[50%] relative bg-foreground flex-col justify-between p-12 overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(67,56,202,0.25) 0%, transparent 70%)' }} />

        {/* Logo */}
        <motion.div className="relative z-10 flex items-center gap-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Activity size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white text-[14px]">
            CareTrack <span style={{ color: '#818CF8' }}>AI</span>
          </span>
        </motion.div>

        {/* 3D Visual Center */}
        <div className="relative z-10 flex items-center justify-center py-6">
          <AnimatedVisual3D type="shield" size="md" />
        </div>

        {/* Bottom quote */}
        <motion.div className="relative z-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-2 text-accent font-mono text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles size={11} />
            Secure Patient Portal
          </div>
          <p className="text-white/70 text-[13px] leading-relaxed max-w-sm">
            Access your longitudinal symptom history, review AI disease probability reports, and track health vitals securely.
          </p>
        </motion.div>
      </motion.div>

      {/* ── Right panel (form) ── */}
      <motion.div
        className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top back link */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>

        {/* Form container */}
        <div className="max-w-sm w-full mx-auto my-auto py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.55 }}>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
              </h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {mode === 'login'
                  ? 'Sign in to access your saved health records and history.'
                  : 'Start tracking your clinical assessments with a free account.'}
              </p>
            </div>

            {/* Error Banner */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl border border-critical/30 bg-critical/10 text-critical text-[12px] flex items-center gap-2"
              >
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{apiError}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-3.5">
                {mode === 'register' && (
                  <motion.div variants={staggerItem}>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className={inputBase}
                      required
                    />
                  </motion.div>
                )}

                <motion.div
                  variants={shakeX}
                  animate={shakeField === 'email' ? 'shake' : 'idle'}
                >
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputBase}
                    required
                  />
                </motion.div>

                <motion.div
                  variants={shakeX}
                  animate={shakeField === 'password' ? 'shake' : 'idle'}
                >
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className={`${inputBase} pr-10`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </motion.div>

                {mode === 'register' && (
                  <motion.div variants={staggerItem}>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.confirm}
                        onChange={(e) => set('confirm', e.target.value)}
                        className={`${inputBase} pr-10`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-[13px] mt-2 flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-accent/20"
                  whileHover={loading ? {} : buttonHover}
                  whileTap={loading ? {} : buttonTap}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Free Account'}
                      <ArrowRight size={14} />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            <p className="mt-5 text-[11px] text-center text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setApiError(null)
                  onModeChange(mode === 'login' ? 'register' : 'login')
                }}
                className="text-accent hover:underline font-semibold"
              >
                {mode === 'login' ? 'Create one now' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>

        <div className="text-[11px] text-center text-muted-foreground/60">
          Protected with JWT & PostgreSQL encryption.
        </div>
      </motion.div>
    </div>
  )
}
