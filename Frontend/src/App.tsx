import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import HowItWorksPage from './pages/HowItWorksPage'
import HealthAnalysisPage from './pages/HealthAnalysisPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import HistoryPage from './pages/HistoryPage'
import AuthPage from './pages/AuthPage'
import GuestCheckPage from './pages/GuestCheckPage'
import PatientDetailsPage from './pages/PatientDetailsPage'
import SymptomCategoriesPage from './pages/SymptomCategoriesPage'
import SymptomSubcategoryPage from './pages/SymptomSubcategoryPage'
import ReviewPage from './pages/ReviewPage'
import AnalyzingPage from './pages/AnalyzingPage'
import ReportPage from './pages/ReportPage'
import AdminApp from './admin/AdminApp'
import type { AdminPage } from './admin/adminTypes'
import PatientApp from './patient/PatientApp'
import { getAccessToken, getStoredUser, clearAuthSession, logout as apiLogout } from './services/api'
import type { Page, PatientPage, PatientDetails, SelectedSymptom, PredictionResponse, User } from './types'
import { pageVariants } from './motion/variants'

const INITIAL_PATIENT: PatientDetails = {
  name: '',
  age: '',
  gender: 'male',
  dob: '',
  bloodGroup: 'O+',
  height: '',
  weight: '',
}

// Hide navbar during clinical health assessment flow, auth pages, or in dedicated portals
const NO_NAVBAR_PAGES: Page[] = [
  'auth',
  'guest-check',
  'patient-details',
  'symptom-categories',
  'symptom-subcategory',
  'review',
  'analyzing',
  'report',
  'patient-dashboard',
  'patient-analyses',
  'patient-reports',
  'patient-symptoms',
  'patient-recommendations',
  'patient-notifications',
  'patient-profile',
  'patient-feedback',
  'patient-chatbot',
  'admin-login',
  'admin-dashboard',
  'admin-patients',
  'admin-patient-detail',
  'admin-analyses',
  'admin-reports',
  'admin-symptoms',
  'admin-ai-monitoring',
  'admin-chatbot',
  'admin-models',
  'admin-feedback',
  'admin-notifications',
  'admin-system',
  'admin-audit',
]

function getAuthState() {
  const adminToken = localStorage.getItem('caretrack_admin_access_token')
  const adminUserStr = localStorage.getItem('caretrack_admin_user')
  const isAdmin = Boolean(adminToken && adminUserStr)

  const patientToken = getAccessToken()
  const patientUser = getStoredUser()
  const isPatient = Boolean(patientToken && patientUser)

  return {
    isAdmin,
    isPatient,
    patientUser,
  }
}

function resolveRoute(isAdmin: boolean, isPatient: boolean): Page {
  const hash = window.location.hash.toLowerCase()
  const path = window.location.pathname.toLowerCase()

  // 1. Authenticated Admin: ALWAYS stays within the Admin Portal
  if (isAdmin) {
    if (hash.includes('/admin/patients')) return 'admin-patients'
    if (hash.includes('/admin/analyses')) return 'admin-analyses'
    if (hash.includes('/admin/reports')) return 'admin-reports'
    if (hash.includes('/admin/chatbot')) return 'admin-chatbot'
    if (hash.includes('/admin/ai') || hash.includes('/admin/models')) return 'admin-ai-monitoring'
    if (hash.includes('/admin/symptoms')) return 'admin-symptoms'
    if (hash.includes('/admin/notifications')) return 'admin-notifications'
    if (hash.includes('/admin/feedback')) return 'admin-feedback'
    if (hash.includes('/admin/system')) return 'admin-system'
    if (hash.includes('/admin/audit')) return 'admin-audit'
    // Default admin view is ALWAYS admin-dashboard
    return 'admin-dashboard'
  }

  // 2. Authenticated Patient: Default is Patient Dashboard; allow clinical assessment flow & info pages
  if (isPatient) {
    if (hash.includes('/patient/chatbot')) return 'patient-chatbot'
    if (hash.includes('/patient/analyses') || hash.includes('/patient/reports')) return 'patient-analyses'
    if (hash.includes('/patient/symptoms')) return 'patient-symptoms'
    if (hash.includes('/patient/recommendations')) return 'patient-recommendations'
    if (hash.includes('/patient/notifications')) return 'patient-notifications'
    if (hash.includes('/patient/profile')) return 'patient-profile'
    if (hash.includes('/patient/feedback')) return 'patient-feedback'
    if (hash.includes('history')) return 'history'
    if (hash.includes('how-it-works')) return 'how-it-works'
    if (hash.includes('health-analysis')) return 'health-analysis'
    if (hash.includes('about')) return 'about'
    if (hash.includes('contact')) return 'contact'
    if (hash.includes('patient-details') || hash.includes('/patient/details')) return 'patient-details'
    if (hash.includes('symptom-categories')) return 'symptom-categories'
    if (hash.includes('symptom-subcategory')) return 'symptom-subcategory'
    if (hash.includes('review')) return 'review'
    if (hash.includes('analyzing')) return 'analyzing'
    if (hash.includes('report')) return 'report'
    // Default patient destination is ALWAYS patient-dashboard
    return 'patient-dashboard'
  }

  // 3. Unauthenticated / Public Visitor
  if (hash.includes('/admin/login') || hash.startsWith('#/admin') || path.includes('/admin')) {
    return 'admin-login'
  }
  // Allow public and guest clinical health assessment wizard
  if (hash.includes('patient-details') || hash.includes('/patient/details')) return 'patient-details'
  if (hash.includes('symptom-categories')) return 'symptom-categories'
  if (hash.includes('symptom-subcategory')) return 'symptom-subcategory'
  if (hash.includes('review')) return 'review'
  if (hash.includes('analyzing')) return 'analyzing'
  if (hash.includes('report')) return 'report'
  if (hash.includes('guest-check')) return 'guest-check'

  // Dedicated patient portal workspaces require authentication
  if (hash.startsWith('#/patient/') || hash === '#/patient') {
    return 'auth'
  }
  if (hash.includes('auth') || hash.includes('login') || hash.includes('signin')) {
    return 'auth'
  }
  if (hash.includes('history')) {
    return 'auth'
  }
  if (hash.includes('how-it-works')) return 'how-it-works'
  if (hash.includes('health-analysis')) return 'health-analysis'
  if (hash.includes('about')) return 'about'
  if (hash.includes('contact')) return 'contact'

  // Default public view is ALWAYS public home
  return 'home'
}

export default function App() {
  const initialAuth = getAuthState()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAuth.isPatient)
  const [user, setUser] = useState<User | null>(initialAuth.patientUser)
  const [page, setPage] = useState<Page>(() => resolveRoute(initialAuth.isAdmin, initialAuth.isPatient))
  const [adminDetailId, setAdminDetailId] = useState<string | undefined>(undefined)
  const [returnToPage, setReturnToPage] = useState<Page>('home')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [patientDetails, setPatientDetails] = useState<PatientDetails>(() => {
    try {
      const cached = localStorage.getItem('caretrack_patient_details')
      return cached ? JSON.parse(cached) : INITIAL_PATIENT
    } catch {
      return INITIAL_PATIENT
    }
  })
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, SelectedSymptom>>(() => {
    try {
      const cached = localStorage.getItem('caretrack_selected_symptoms')
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResponse | null>(() => {
    try {
      const cached = localStorage.getItem('caretrack_latest_prediction')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  // Initialize session on mount + handle URL hash routing with role enforcement
  useEffect(() => {
    const syncRouteAndAuth = () => {
      const auth = getAuthState()
      setIsAuthenticated(auth.isPatient)
      setUser(auth.patientUser)
      const targetPage = resolveRoute(auth.isAdmin, auth.isPatient)

      // Hydrate state from localStorage if available
      try {
        const pStr = localStorage.getItem('caretrack_latest_prediction')
        if (pStr) setCurrentPrediction(JSON.parse(pStr))
      } catch {}
      try {
        const dStr = localStorage.getItem('caretrack_patient_details')
        if (dStr) setPatientDetails(JSON.parse(dStr))
      } catch {}
      try {
        const sStr = localStorage.getItem('caretrack_selected_symptoms')
        if (sStr) setSelectedSymptoms(JSON.parse(sStr))
      } catch {}

      const hash = window.location.hash.toLowerCase()
      if (hash.includes('category=')) {
        const match = hash.match(/category=([a-z0-9_-]+)/)
        if (match && match[1]) {
          setCurrentCategory(match[1])
        }
      }

      setPage(targetPage)
    }

    syncRouteAndAuth()
    window.addEventListener('hashchange', syncRouteAndAuth)
    return () => window.removeEventListener('hashchange', syncRouteAndAuth)
  }, [])

  function navigate(to: Page) {
    if (to === page) return
    if (to.startsWith('admin-')) {
      const sub = to.replace('admin-', '')
      window.location.hash = `/admin/${sub}`
    } else if (to === 'patient-details') {
      window.location.hash = '/patient-details'
    } else if (to === 'symptom-categories') {
      window.location.hash = '/symptom-categories'
    } else if (to === 'symptom-subcategory') {
      window.location.hash = '/symptom-subcategory'
    } else if (to === 'review') {
      window.location.hash = '/review'
    } else if (to === 'analyzing') {
      window.location.hash = '/analyzing'
    } else if (to === 'report') {
      window.location.hash = '/report'
    } else if (to.startsWith('patient-')) {
      const sub = to.replace('patient-', '')
      window.location.hash = `/patient/${sub}`
    } else if (to === 'guest-check') {
      window.location.hash = '/guest-check'
    } else if (to === 'history') {
      window.location.hash = '/history'
    } else if (to === 'how-it-works') {
      window.location.hash = '/how-it-works'
    } else if (to === 'health-analysis') {
      window.location.hash = '/health-analysis'
    } else if (to === 'about') {
      window.location.hash = '/about'
    } else if (to === 'contact') {
      window.location.hash = '/contact'
    } else if (to === 'auth') {
      window.location.hash = '/auth'
    } else if (to === 'home') {
      window.location.hash = ''
    }
    setPage(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Fresh patient form initialized every time Start Health Check is clicked
  function handleStartHealthCheck() {
    setPatientDetails(INITIAL_PATIENT)
    setSelectedSymptoms({})
    setCurrentCategory(null)
    setCurrentPrediction(null)
    setReturnToPage(page.startsWith('patient-') ? 'patient-dashboard' : 'home')
    navigate('patient-details')
  }

  // Load and display full medical health report for past assessment from History / Dashboard
  function handleViewHistoryReport(
    prediction: PredictionResponse,
    patient: PatientDetails,
    symptoms: Record<string, SelectedSymptom>
  ) {
    setCurrentPrediction(prediction)
    setPatientDetails(patient)
    setSelectedSymptoms(symptoms)
    setReturnToPage(page.startsWith('patient-') ? 'patient-dashboard' : 'history')
    navigate('report')
  }

  function handleAuthenticate(authenticatedUser: User) {
    const auth = getAuthState()
    if (auth.isAdmin) {
      setIsAuthenticated(false)
      setUser(null)
      navigate('admin-dashboard')
    } else {
      setIsAuthenticated(true)
      setUser(authenticatedUser)
      navigate('patient-dashboard')
    }
  }

  async function handleLogout() {
    await apiLogout()
    localStorage.removeItem('caretrack_admin_access_token')
    localStorage.removeItem('caretrack_admin_refresh_token')
    localStorage.removeItem('caretrack_admin_user')
    localStorage.removeItem('caretrack_access_token')
    localStorage.removeItem('caretrack_refresh_token')
    localStorage.removeItem('caretrack_user')
    setIsAuthenticated(false)
    setUser(null)
    window.location.hash = ''
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function toggleSymptom(symptom: SelectedSymptom) {
    setSelectedSymptoms((prev) => {
      const next = { ...prev }
      if (next[symptom.key]) delete next[symptom.key]
      else next[symptom.key] = symptom
      return next
    })
  }

  function handleSelectCategory(categoryId: string) {
    setCurrentCategory(categoryId)
    window.location.hash = `/symptom-subcategory?category=${categoryId}`
    setPage('symptom-subcategory')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const showNavbar = !NO_NAVBAR_PAGES.includes(page)
  const isAssessmentPage = ['patient-details', 'symptom-categories', 'symptom-subcategory', 'review', 'analyzing'].includes(page)
  const isViewportLocked = page === 'patient-chatbot' || isAssessmentPage

  return (
    <div className={`${isViewportLocked ? 'h-screen h-[100dvh] overflow-hidden' : 'min-h-screen'} bg-background text-foreground`}>
      {showNavbar && (
        <Navbar
          currentPage={page}
          isAuthenticated={isAuthenticated}
          user={user}
          onNavigate={navigate}
          onStartHealthCheck={handleStartHealthCheck}
          onLogout={handleLogout}
        />
      )}

      {page.startsWith('admin-') ? (
        <AdminApp
          page={page as AdminPage}
          detailId={adminDetailId}
          onNavigate={(target) => {
            if (target === 'home') {
              navigate('home')
            } else {
              navigate(target as Page)
            }
          }}
        />
      ) : page.startsWith('patient-') && page !== 'patient-details' ? (
        <PatientApp
          page={page as PatientPage}
          user={user}
          onNavigate={navigate}
          onStartHealthCheck={handleStartHealthCheck}
          onLogout={handleLogout}
          onViewHistoryReport={handleViewHistoryReport}
          onUpdateUser={(updated) => setUser(updated)}
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={isAssessmentPage ? 'h-full flex flex-col min-h-0 overflow-hidden' : ''}
            style={{ willChange: 'opacity, transform, filter' }}
          >
            {page === 'home' && (
              <HomePage
                onNavigate={navigate}
                onStartHealthCheck={handleStartHealthCheck}
              />
            )}

            {page === 'how-it-works' && (
              <HowItWorksPage
                onNavigate={navigate}
                onStartHealthCheck={handleStartHealthCheck}
              />
            )}

            {page === 'health-analysis' && (
              <HealthAnalysisPage
                onNavigate={navigate}
                onStartHealthCheck={handleStartHealthCheck}
              />
            )}

            {page === 'about' && (
              <AboutPage
                onNavigate={navigate}
                onStartHealthCheck={handleStartHealthCheck}
              />
            )}

            {page === 'contact' && <ContactPage onNavigate={navigate} />}

            {page === 'history' && (
              <HistoryPage
                onNavigate={navigate}
                onStartHealthCheck={handleStartHealthCheck}
                onViewFullReport={handleViewHistoryReport}
                isAuthenticated={isAuthenticated}
              />
            )}

            {page === 'auth' && (
              <AuthPage
                mode={authMode}
                onModeChange={setAuthMode}
                onNavigate={navigate}
                onAuthenticate={handleAuthenticate}
              />
            )}

            {page === 'guest-check' && (
              <GuestCheckPage
                onNavigate={navigate}
                onOpenAuth={(mode) => {
                  setAuthMode(mode)
                  navigate('auth')
                }}
              />
            )}

            {page === 'patient-details' && (
              <PatientDetailsPage
                details={patientDetails}
                onSave={setPatientDetails}
                onNavigate={(dest) => {
                  if (dest === 'home' && returnToPage) {
                    navigate(returnToPage)
                  } else {
                    navigate(dest)
                  }
                }}
              />
            )}

            {page === 'symptom-categories' && (
              <SymptomCategoriesPage
                selectedSymptoms={selectedSymptoms}
                onSelectCategory={handleSelectCategory}
                onNavigate={navigate}
                onRemoveSymptom={(key) => {
                  setSelectedSymptoms((prev) => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })
                }}
              />
            )}

            {page === 'symptom-subcategory' && (
              <SymptomSubcategoryPage
                categoryId={currentCategory || 'general'}
                selectedSymptoms={selectedSymptoms}
                onToggle={toggleSymptom}
                onNavigate={navigate}
                onSelectMore={() => navigate('symptom-categories')}
              />
            )}

            {page === 'review' && (
              <ReviewPage
                patientDetails={patientDetails}
                selectedSymptoms={selectedSymptoms}
                onNavigate={navigate}
                onEditSymptoms={() => navigate('symptom-categories')}
              />
            )}

            {page === 'analyzing' && (
              <AnalyzingPage
                symptomCount={Object.keys(selectedSymptoms).length}
                selectedSymptoms={selectedSymptoms}
                patientDetails={patientDetails}
                onNavigate={navigate}
                onPredictionComplete={(data) => {
                  setCurrentPrediction(data)
                  try {
                    localStorage.setItem('caretrack_latest_prediction', JSON.stringify(data))
                  } catch {}
                  setReturnToPage(isAuthenticated ? 'patient-dashboard' : 'home')
                }}
              />
            )}

            {page === 'report' && (
              <ReportPage
                patientDetails={patientDetails}
                selectedSymptoms={selectedSymptoms}
                predictionData={currentPrediction}
                returnPage={returnToPage}
                onNavigate={navigate}
                onStartNew={handleStartHealthCheck}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
