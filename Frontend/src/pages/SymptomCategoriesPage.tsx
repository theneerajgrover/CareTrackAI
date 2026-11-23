import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers,
  Smile, User, MoreHorizontal, ChevronRight, Search, ArrowLeft, ArrowRight, Check
} from 'lucide-react'
import { SYMPTOM_CATEGORIES } from '../data/symptoms'
import { staggerContainer, staggerItem, buttonHover, buttonTap, fadeUp } from '../motion/variants'
import type { SelectedSymptom, Page } from '../types'
import '../styles/assessment.css'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers, Smile, User, MoreHorizontal,
}

const STEPS = [
  { num: 1, label: 'Vitals' },
  { num: 2, label: 'Symptoms' },
  { num: 3, label: 'Review' },
  { num: 4, label: 'Analysis' },
]

interface SymptomCategoriesPageProps {
  selectedSymptoms: Record<string, SelectedSymptom>
  onSelectCategory: (categoryId: string) => void
  onNavigate: (page: Page) => void
}

export default function SymptomCategoriesPage({
  selectedSymptoms,
  onSelectCategory,
  onNavigate,
}: SymptomCategoriesPageProps) {
  const [search, setSearch] = useState('')

  const totalSelected = Object.keys(selectedSymptoms).length

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(selectedSymptoms).forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return counts
  }, [selectedSymptoms])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return SYMPTOM_CATEGORIES
    const q = search.toLowerCase()
    return SYMPTOM_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.symptoms.some((s) => s.label.toLowerCase().includes(q))
    )
  }, [search])

  const currentStep = 2

  return (
    <div className="assessment-bg">
      <div className="assessment-container assessment-container--wide">
        {/* Progress Header */}
        <motion.div className="assessment-progress-header" variants={fadeUp} initial="hidden" animate="visible">
          <button onClick={() => onNavigate('patient-details')} className="assessment-exit-btn">
            <ArrowLeft size={13} />
            Back to Vitals
          </button>

          <div className="assessment-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`assessment-step ${i + 1 === currentStep ? 'active' : ''} ${i + 1 < currentStep ? 'completed' : ''}`}
              >
                <div className="assessment-step-dot">
                  {i + 1 < currentStep ? <Check size={13} strokeWidth={3} /> : step.num}
                </div>
                <span className="assessment-step-label">{step.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Title with Count Badge */}
        <motion.div
          className="assessment-step-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div className="assessment-step-badge">
                <Activity size={10} />
                STEP 02 / 04
              </div>
              <h1 className="assessment-step-heading">What symptoms are you experiencing?</h1>
              <p className="assessment-step-desc">
                Select any affected body system or category below to specify your exact symptoms.
              </p>
            </div>
            <div className="assessment-count-badge">
              <span className={`assessment-count-dot ${totalSelected > 0 ? 'active' : ''}`} />
              {totalSelected} symptom{totalSelected !== 1 ? 's' : ''} reported
            </div>
          </div>
        </motion.div>

        {/* Search Input */}
        <motion.div
          className="assessment-search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Search size={14} className="assessment-search-icon" />
          <input
            type="text"
            placeholder="Search symptoms (e.g. fever, cough, chest tightness, fatigue)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="assessment-search-input"
          />
        </motion.div>

        {/* Categories Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {filteredCategories.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || Activity
            const count = categoryCounts[cat.id] || 0
            return (
              <motion.button
                key={cat.id}
                variants={staggerItem}
                onClick={() => onSelectCategory(cat.id)}
                className={`assessment-category-card ${count > 0 ? 'has-selected' : ''}`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${cat.color}15`,
                        border: `1px solid ${cat.color}30`,
                      }}
                    >
                      <Icon size={18} style={{ color: cat.color }} strokeWidth={1.8} />
                    </div>
                    {count > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: 'var(--color-accent)',
                          color: 'white',
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                        }}
                      >
                        <Check size={9} strokeWidth={3} />
                        {count} active
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-foreground)', marginBottom: 4 }}>{cat.label}</h3>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--color-muted-foreground)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cat.description}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 10,
                    borderTop: '1px solid rgba(228,228,231,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--color-muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>{cat.symptoms.length} symptom options</span>
                  <ChevronRight size={14} style={{ color: 'var(--color-accent)' }} />
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Floating Bottom Sticky Bar */}
      <AnimatePresence>
        {totalSelected > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="assessment-bottom-bar"
          >
            <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-foreground)' }}>
                  {totalSelected} symptom{totalSelected !== 1 ? 's' : ''} selected across categories
                </span>
              </div>
              <motion.button
                onClick={() => onNavigate('review')}
                className="assessment-btn-primary"
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Continue to Review ({totalSelected})
                <ArrowRight size={13} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
