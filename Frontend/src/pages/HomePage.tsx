import { motion } from 'framer-motion'
import {
  ArrowRight, Shield, Activity, Brain, Sparkles, CheckCircle2,
  Zap, Lock, Stethoscope, ChevronRight
} from 'lucide-react'
import AnimatedVisual3D from '../components/AnimatedVisual3D'
import { fadeUp, staggerContainer, staggerItem, buttonHover, buttonTap } from '../motion/variants'
import type { Page } from '../types'

interface HomePageProps {
  onNavigate: (page: Page) => void
  onStartHealthCheck: () => void
}

const HEADING_LINES = ['Understand Your', 'Symptoms with', 'Intelligent Health Analysis']

const FEATURES = [
  {
    icon: Brain,
    title: 'Gaussian Probabilistic AI',
    desc: 'Trained on 246,945 clinical case vectors with 86.58% accuracy across 713 disease classes.',
  },
  {
    icon: Shield,
    title: 'Zero-Leak Privacy Vault',
    desc: 'Encrypted storage with bcrypt authentication. Your patient vitals are never sold or shared.',
  },
  {
    icon: Zap,
    title: 'Instant Risk Stratification',
    desc: 'Immediate triage categorization into Low, Moderate, High, or Critical emergency alerts.',
  },
]

export default function HomePage({ onNavigate, onStartHealthCheck }: HomePageProps) {
  return (
    <div className="bg-background overflow-x-hidden pt-12">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden px-6">
        {/* Ambient Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(67,56,202,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(67,56,202,0.035) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Subtle Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 65% 50%, rgba(67,56,202,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-7xl mx-auto w-full pt-14 pb-12">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* ── Left Column: Headline & Action CTAs ── */}
            <div className="lg:col-span-7 relative z-10">
              {/* Eyebrow */}
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent-subtle text-[11px] font-semibold text-accent mb-6 font-mono"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                CLINICAL MACHINE LEARNING · 2026 EDITION
              </motion.div>

              {/* Headline */}
              <h1
                className="font-extrabold leading-[1.08] tracking-tight text-foreground"
                style={{ fontSize: 'clamp(2.1rem, 4.5vw, 3.8rem)' }}
              >
                {HEADING_LINES.map((line, i) => (
                  <motion.span
                    key={i}
                    className="block"
                    style={{ color: i === 2 ? 'var(--color-accent)' : 'var(--color-foreground)' }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.65 }}
                  >
                    {line}
                  </motion.span>
                ))}
              </h1>

              {/* Description */}
              <motion.p
                className="mt-5 text-[0.95rem] leading-relaxed text-muted-foreground max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                CareTrack AI classifies 377 symptom signals against 713 condition profiles.
                Get real-time probabilistic match scores, clinical triage ratings, and AI doctor advisories in seconds.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                className="mt-8 flex flex-wrap items-center gap-3.5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                {/* Main Health Check Button */}
                <motion.button
                  onClick={onStartHealthCheck}
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-accent text-white font-semibold text-[13px] shadow-lg shadow-accent/30 group"
                  whileHover={{ ...buttonHover, boxShadow: '0 8px 24px rgba(67,56,202,0.4)' }}
                  whileTap={buttonTap}
                >
                  Start Full Health Check
                  <motion.span
                    initial={{ x: 0 }}
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="inline-flex"
                  >
                    <ArrowRight size={14} />
                  </motion.span>
                </motion.button>

                {/* One-Time Free Trial Button */}
                <motion.button
                  onClick={onStartHealthCheck}
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border-2 border-accent/40 bg-card hover:bg-accent-subtle text-accent font-bold text-[13px] transition-colors shadow-sm"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(67,56,202,0.8)' }}
                  whileTap={buttonTap}
                >
                  <Sparkles size={14} className="text-accent" />
                  Instant Free Check (No Login)
                </motion.button>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                className="mt-8 flex items-center gap-6 text-[11px] text-muted-foreground font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-emerald-500" />
                  No Data Reselling
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain size={13} className="text-accent" />
                  86.6% Model Accuracy
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-indigo-500" />
                  Sub-Second Analysis
                </div>
              </motion.div>
            </div>

            {/* ── Right Column: 3D Visual Figure ── */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <AnimatedVisual3D type="scanner" size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Highlights Grid ── */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <h3 className="font-bold text-[15px] text-foreground mb-1.5">{f.title}</h3>
                <p className="text-[12px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── Compact Quick Links Strip ── */}
      <section className="py-8 px-6 max-w-7xl mx-auto border-t border-border/70">
        <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('how-it-works')} className="hover:text-foreground transition-colors font-medium">
              How It Works →
            </button>
            <button onClick={() => onNavigate('health-analysis')} className="hover:text-foreground transition-colors font-medium">
              Health Analysis Catalog →
            </button>
            <button onClick={() => onNavigate('about')} className="hover:text-foreground transition-colors font-medium">
              About AI Architecture →
            </button>
            <button onClick={() => onNavigate('contact')} className="hover:text-foreground transition-colors font-medium">
              Support & Contact →
            </button>
            <button onClick={() => onNavigate('admin-dashboard')} className="hover:text-accent transition-colors font-semibold text-accent/90">
              Admin Portal →
            </button>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground/80">
            CareTrack AI Engine v1.0.0 · Local & Secure
          </span>
        </div>
      </section>
    </div>
  )
}
