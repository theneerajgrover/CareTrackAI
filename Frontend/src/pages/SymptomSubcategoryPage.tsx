import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers,
  Smile, User, MoreHorizontal, ArrowLeft, ArrowRight, Check, Search,
} from 'lucide-react'
import { SYMPTOM_CATEGORIES } from '../data/symptoms'
import { staggerContainer, staggerItem, buttonHover, buttonTap, fadeUp } from '../motion/variants'
import type { SelectedSymptom, Page } from '../types'
import '../styles/assessment.css'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>> = {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers, Smile, User, MoreHorizontal,
}

const STEPS = [
  { num: 1, label: 'Vitals' },
  { num: 2, label: 'Symptoms' },
  { num: 3, label: 'Review' },
  { num: 4, label: 'Analysis' },
]

interface SymptomSubcategoryPageProps {
  categoryId: string
  selectedSymptoms: Record<string, SelectedSymptom>
  onToggle: (symptom: SelectedSymptom) => void
  onNavigate: (page: Page) => void
  onSelectMore: () => void
}

export default function SymptomSubcategoryPage({
  categoryId,
  selectedSymptoms,
  onToggle,
  onNavigate,
  onSelectMore,
}: SymptomSubcategoryPageProps) {
  const [search, setSearch] = useState('')
  const category = SYMPTOM_CATEGORIES.find((c) => c.id === categoryId)
  if (!category) return null

  const Icon = ICON_MAP[category.iconName] || Activity
  const filtered = useMemo(() => {
    if (!search.trim()) return category.symptoms
    const q = search.toLowerCase()
    return category.symptoms.filter((s) => s.label.toLowerCase().includes(q))
  }, [category, search])

  const selectedInCategory = category.symptoms.filter((s) => selectedSymptoms[s.key]).length
  const totalSelected = Object.keys(selectedSymptoms).length
  const currentStep = 2

  return (
    <div className="assessment-bg">
      <div className="assessment-container assessment-container--review">
        {/* Progress Header */}
        <motion.div className="assessment-progress-header" variants={fadeUp} initial="hidden" animate="visible">
          <button onClick={onSelectMore} className="assessment-exit-btn">
            <ArrowLeft size={13} />
            All Categories
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

        {/* Category Header Card */}
        <motion.div
          className="assessment-cat-header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${category.color}15`,
                  border: `1px solid ${category.color}30`,
                }}
              >
                <Icon size={20} style={{ color: category.color }} strokeWidth={1.8} />
              </div>
              <div>
                <h1 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.025em', color: 'var(--color-foreground)', margin: 0 }}>
                  {category.label}
                </h1>
                <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', margin: 0 }}>{category.description}</p>
              </div>
            </div>

            <span className="assessment-count-badge" style={{ fontSize: 11 }}>
              <span className={`assessment-count-dot ${selectedInCategory > 0 ? 'active' : ''}`} />
              {selectedInCategory} selected
            </span>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div className="assessment-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <Search size={14} className="assessment-search-icon" />
          <input
            type="text"
            placeholder={`Search ${category.label.toLowerCase()} symptoms...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="assessment-search-input"
          />
        </motion.div>

        {/* Symptom Grid */}
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, paddingBottom: 160 }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((symptom) => {
            const isSelected = !!selectedSymptoms[symptom.key]
            return (
              <motion.button
                key={symptom.key}
                variants={staggerItem}
                type="button"
                onClick={() => onToggle({ key: symptom.key, label: symptom.label, category: category.id, categoryLabel: category.label })}
                className={`assessment-symptom-btn ${isSelected ? 'selected' : ''}`}
              >
                <div className={`assessment-checkbox ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </div>
                <span className="assessment-symptom-label">{symptom.label}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>No symptoms match "{search}"</p>
            <button
              onClick={() => setSearch('')}
              style={{
                marginTop: 8,
                color: 'var(--color-accent)',
                fontSize: 12,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear search filter
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="assessment-bottom-bar">
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Selected chips strip */}
          <AnimatePresence>
            {totalSelected > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)', textTransform: 'uppercase', marginRight: 4, flexShrink: 0 }}>
                  Selected:
                </span>
                {Object.values(selectedSymptoms).map((s) => (
                  <span key={s.key} className="assessment-chip">
                    <Check size={8} strokeWidth={3} />
                    {s.label}
                  </span>
                ))}
              </div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              onClick={onSelectMore}
              className="assessment-btn-secondary"
              style={{ flex: 1, justifyContent: 'center', height: 40, borderRadius: 9999 }}
              whileTap={buttonTap}
            >
              Browse Other Categories
            </motion.button>
            <motion.button
              onClick={() => onNavigate('review')}
              disabled={totalSelected === 0}
              className="assessment-btn-primary"
              style={{ flex: 1, justifyContent: 'center', height: 40, borderRadius: 9999 }}
              whileHover={totalSelected > 0 ? buttonHover : {}}
              whileTap={totalSelected > 0 ? buttonTap : {}}
            >
              Review & Analyze ({totalSelected})
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
