import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers,
  Smile, User, MoreHorizontal, ArrowLeft, ArrowRight, Check, Search, X, Sparkles
} from 'lucide-react'
import { SYMPTOM_CATEGORIES } from '../data/symptoms'
import { staggerContainer, staggerItem, buttonHover, buttonTap, fadeUp } from '../motion/variants'
import type { SelectedSymptom, Page } from '../types'
import '../styles/assessment.css'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>> = {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers, Smile, User, MoreHorizontal,
}

const STEPS = [
  { num: 1, title: 'Patient Vitals', desc: 'Baseline priors' },
  { num: 2, title: 'Symptom Mapping', desc: 'Report signals' },
  { num: 3, title: 'Clinical Review', desc: 'Verify assessment' },
  { num: 4, title: 'AI Inference', desc: 'Gaussian NB' },
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
      <div className="assessment-container assessment-container--wide">
        {/* Topbar Navigation */}
        <motion.div className="assessment-topbar" variants={fadeUp} initial="hidden" animate="visible">
          <button type="button" onClick={onSelectMore} className="assessment-exit-btn">
            <ArrowLeft size={14} />
            <span>All Categories</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="assessment-badge-triage">
              <Activity size={12} className="text-accent animate-pulse" />
              {category.label} Symptoms
            </span>
          </div>
        </motion.div>

        {/* 4-Step Stepper Card */}
        <motion.div
          className="assessment-stepper-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="assessment-steps">
            {STEPS.map((step) => {
              const isActive = step.num === currentStep
              const isCompleted = step.num < currentStep
              return (
                <div
                  key={step.num}
                  className={`assessment-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="assessment-step-dot">
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : step.num}
                  </div>
                  <div className="assessment-step-info">
                    <span className="assessment-step-number">STEP 0{step.num}</span>
                    <span className="assessment-step-title">{step.title}</span>
                    <span className="assessment-step-desc">{step.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* 2-Column Split Desktop Layout */}
        <div className="assessment-grid-layout" style={{ gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)' }}>
          {/* Main Symptom Selector */}
          <div>
            {/* Category Header Card */}
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 mb-5 shadow-sm"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: `${category.color}15`, border: `1.5px solid ${category.color}35` }}
                  >
                    <Icon size={24} style={{ color: category.color }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-foreground m-0">
                        {category.label}
                      </h1>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent/20">
                        {category.symptoms.length} symptoms
                      </span>
                    </div>
                    <p className="text-[12.5px] text-muted-foreground mt-1 mb-0 leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className={`px-3 py-1 rounded-full text-[11.5px] font-mono font-bold ${
                    selectedInCategory > 0
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {selectedInCategory} selected in this category
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search symptoms in ${category.label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-10 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent shadow-sm transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Symptom Cards Grid */}
            <motion.div
              className="grid sm:grid-cols-2 gap-3 pb-24 lg:pb-8"
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
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-indigo-50/70 shadow-sm ring-1 ring-accent/30'
                        : 'border-border bg-card hover:border-accent/40 hover:bg-slate-50/80 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-accent text-white shadow-sm' : 'border-1.5 border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>

                    <span className={`text-[13px] leading-snug ${
                      isSelected ? 'text-accent font-bold' : 'text-foreground font-semibold'
                    }`}>
                      {symptom.label}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>

            {filtered.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-border p-6">
                <p className="text-muted-foreground text-[13px] m-0">No symptoms match "{search}" in {category.label}.</p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-2 text-accent text-[12.5px] font-bold hover:underline"
                >
                  Clear search filter
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Workbench Sidebar */}
          <div className="assessment-sidebar sticky top-6">
            <div className="assessment-info-card" style={{ padding: '24px' }}>
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
                    <Activity size={14} />
                  </div>
                  <h3 className="font-extrabold text-[14px] text-foreground m-0">
                    Total Selected Signals
                  </h3>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                  totalSelected > 0 ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
                }`}>
                  {totalSelected} Active
                </span>
              </div>

              {totalSelected > 0 ? (
                <div>
                  <div className="max-h-72 overflow-y-auto pr-1 flex flex-col gap-1.5 mb-4 scrollbar-thin">
                    {Object.values(selectedSymptoms).map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-border text-[12px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check size={12} className="text-accent flex-shrink-0" strokeWidth={3} />
                          <span className="font-semibold text-foreground truncate">{s.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggle(s)}
                          className="p-1 text-muted-foreground hover:text-critical rounded-md hover:bg-red-50 transition-colors"
                          title="Deselect symptom"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <motion.button
                      type="button"
                      onClick={() => onNavigate('review')}
                      className="w-full h-11 rounded-xl bg-accent text-white font-bold text-[13px] shadow-md shadow-accent/25 flex items-center justify-center gap-2 cursor-pointer"
                      whileHover={buttonHover}
                      whileTap={buttonTap}
                    >
                      <span>Review Assessment ({totalSelected})</span>
                      <ArrowRight size={14} />
                    </motion.button>

                    <button
                      type="button"
                      onClick={onSelectMore}
                      className="w-full h-10 rounded-xl border border-border text-foreground hover:bg-secondary font-semibold text-[12.5px] transition-colors"
                    >
                      Browse Other Categories
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[12px] text-muted-foreground m-0 leading-relaxed">
                    Tap any symptom card to report it. You can select multiple symptoms across different categories.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Sticky Action Bar on Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border px-6 py-3.5 z-40 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSelectMore}
            className="flex-1 h-10 rounded-full border border-border text-[12px] font-semibold text-foreground bg-white"
          >
            All Categories
          </button>
          <motion.button
            type="button"
            onClick={() => onNavigate('review')}
            disabled={totalSelected === 0}
            className="flex-1 h-10 rounded-full bg-accent text-white font-bold text-[12px] flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm"
            whileTap={buttonTap}
          >
            <span>Review ({totalSelected})</span>
            <ArrowRight size={13} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
