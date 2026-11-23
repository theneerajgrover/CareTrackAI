import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers,
  Smile, User, MoreHorizontal, ChevronRight, Search, ArrowLeft, ArrowRight,
  Check, X, Sparkles, AlertCircle, Shield, Trash2
} from 'lucide-react'
import { SYMPTOM_CATEGORIES } from '../data/symptoms'
import { staggerContainer, staggerItem, buttonHover, buttonTap, fadeUp } from '../motion/variants'
import type { SelectedSymptom, Page } from '../types'
import '../styles/assessment.css'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Activity, Brain, Wind, Heart, Eye, Ear, Zap, Droplets, Bone, Layers, Smile, User, MoreHorizontal,
}

const STEPS = [
  { num: 1, title: 'Patient Vitals', desc: 'Baseline priors' },
  { num: 2, title: 'Symptom Mapping', desc: 'Report signals' },
  { num: 3, title: 'Clinical Review', desc: 'Verify assessment' },
  { num: 4, title: 'AI Inference', desc: 'Gaussian NB' },
]

interface SymptomCategoriesPageProps {
  selectedSymptoms: Record<string, SelectedSymptom>
  onSelectCategory: (categoryId: string) => void
  onNavigate: (page: Page) => void
  onRemoveSymptom?: (key: string) => void
  onClearSymptoms?: () => void
}

export default function SymptomCategoriesPage({
  selectedSymptoms,
  onSelectCategory,
  onNavigate,
  onRemoveSymptom,
  onClearSymptoms,
}: SymptomCategoriesPageProps) {
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  const totalSelected = Object.keys(selectedSymptoms).length

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(selectedSymptoms).forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return counts
  }, [selectedSymptoms])

  const filteredCategories = useMemo(() => {
    let list = SYMPTOM_CATEGORIES
    if (selectedFilter !== 'all') {
      list = list.filter((c) => c.id === selectedFilter)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (cat) =>
        cat.label.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.symptoms.some((s) => s.label.toLowerCase().includes(q))
    )
  }, [search, selectedFilter])

  const selectedList = Object.values(selectedSymptoms)
  const currentStep = 2

  return (
    <div className="assessment-bg">
      <div className="assessment-container assessment-container--wide">
        {/* Topbar Navigation */}
        <motion.div className="assessment-topbar" variants={fadeUp} initial="hidden" animate="visible">
          <button type="button" onClick={() => onNavigate('patient-details')} className="assessment-exit-btn">
            <ArrowLeft size={14} />
            <span>Back to Vitals</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="assessment-badge-triage">
              <Activity size={12} className="text-accent animate-pulse" />
              Step 2 · Symptom Signal Mapping
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

        {/* 2-Column Split Desktop Grid */}
        <div className="assessment-grid-layout" style={{ gridTemplateColumns: 'minmax(0, 1.65fr) minmax(320px, 1fr)' }}>
          {/* Left Column: Category Browser */}
          <div>
            {/* Step Heading */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-subtle text-accent text-[10.5px] font-mono font-bold uppercase tracking-wider mb-2">
                <Activity size={12} />
                STEP 02 / 04 · SYMPTOM ONTOLOGY
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight m-0">
                Identify Affected Body Systems & Symptoms
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1.5 mb-0 leading-relaxed">
                Select any physiological category below to report specific symptoms for clinical Bayesian feature vectorization.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search across all categories (e.g. fever, headache, palpitations, nausea)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-11 pr-10 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent shadow-sm transition-all"
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

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All Systems ({SYMPTOM_CATEGORIES.length})
              </button>
              {SYMPTOM_CATEGORIES.map((c) => {
                const count = categoryCounts[c.id] || 0
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedFilter(c.id)}
                    className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      selectedFilter === c.id
                        ? 'bg-accent text-white font-bold shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{c.label}</span>
                    {count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-white text-accent text-[9.5px] font-bold flex items-center justify-center font-mono">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Categories Grid */}
            <motion.div
              className="grid sm:grid-cols-2 gap-3.5"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredCategories.map((cat) => {
                const Icon = ICON_MAP[cat.iconName] || Activity
                const count = categoryCounts[cat.id] || 0
                const isSelected = count > 0

                return (
                  <motion.button
                    key={cat.id}
                    variants={staggerItem}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`relative text-left rounded-2xl p-4.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer group ${
                      isSelected
                        ? 'border-accent bg-indigo-50/50 shadow-md shadow-accent/5 ring-1 ring-accent/30'
                        : 'border-border bg-card hover:border-accent/40 hover:bg-slate-50/80 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                          style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                        >
                          <Icon size={20} style={{ color: cat.color }} strokeWidth={1.8} />
                        </div>

                        {count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-white text-[10.5px] font-mono font-bold shadow-sm">
                            <Check size={10} strokeWidth={3} />
                            {count} reported
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            {cat.symptoms.length} symptoms
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-[15px] text-foreground tracking-tight m-0 mb-1 group-hover:text-accent transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed m-0">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-accent">
                      <span>Explore {cat.label} symptoms</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>

          {/* Right Column: Live Selected Symptoms & Triage Workbench */}
          <div className="assessment-sidebar sticky top-6">
            <div className="assessment-info-card" style={{ padding: '24px' }}>
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
                    <Activity size={14} />
                  </div>
                  <h3 className="font-extrabold text-[14px] text-foreground m-0">
                    Reported Health Signals
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
                    {selectedList.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-border text-[12px] group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check size={12} className="text-accent flex-shrink-0" strokeWidth={3} />
                          <span className="font-semibold text-foreground truncate">{s.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase bg-white px-1.5 py-0.5 rounded border border-border/80 flex-shrink-0">
                            {s.categoryLabel || s.category}
                          </span>
                        </div>
                        {onRemoveSymptom && (
                          <button
                            type="button"
                            onClick={() => onRemoveSymptom(s.key)}
                            className="p-1 text-muted-foreground hover:text-critical rounded-md hover:bg-red-50 transition-colors"
                            title="Remove symptom"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Readiness Banner */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-4 flex items-start gap-2.5">
                    <Sparkles size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11.5px] font-bold text-emerald-950 m-0">
                        Ready for AI Diagnostic Inference
                      </p>
                      <p className="text-[11px] text-emerald-800 m-0 mt-0.5 leading-snug">
                        {totalSelected} symptom feature{totalSelected !== 1 ? 's' : ''} mapped into the 377-dimensional clinical feature vector.
                      </p>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <motion.button
                    type="button"
                    onClick={() => onNavigate('review')}
                    className="w-full h-11 rounded-xl bg-accent text-white font-bold text-[13px] shadow-md shadow-accent/25 flex items-center justify-center gap-2 cursor-pointer"
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                  >
                    <span>Continue to Review ({totalSelected})</span>
                    <ArrowRight size={14} />
                  </motion.button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="font-bold text-[13.5px] text-foreground m-0 mb-1">
                    No symptoms reported yet
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground m-0 max-w-xs mx-auto leading-relaxed">
                    Select any body system on the left to report symptoms. You can add symptoms across multiple categories.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Helper Card */}
            <div className="assessment-info-card">
              <div className="assessment-info-title">
                <Shield size={15} className="text-accent" />
                <span>Multi-Category Triage</span>
              </div>
              <p className="assessment-info-desc">
                Many systemic disorders manifest across multiple body systems (e.g., fatigue + joint pain + rash).
                You can select symptoms from multiple categories for holistic diagnostic evaluation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Sticky Bar on Mobile */}
      <AnimatePresence>
        {totalSelected > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border px-6 py-3.5 z-40 shadow-lg"
          >
            <div className="max-w-md mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12.5px] font-bold text-foreground">
                  {totalSelected} symptom{totalSelected !== 1 ? 's' : ''} reported
                </span>
              </div>
              <motion.button
                onClick={() => onNavigate('review')}
                className="h-10 px-5 rounded-full bg-accent text-white font-bold text-[12px] shadow-md shadow-accent/25 flex items-center gap-1.5"
                whileTap={buttonTap}
              >
                <span>Review</span>
                <ArrowRight size={13} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
