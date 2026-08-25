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
  'admin-login',
  'admin-dashboard',
  'admin-patients',
  'admin-patient-detail',
  'admin-analyses',
  'admin-reports',
  'admin-symptoms',
  'admin-ai-monitoring',
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
    if (hash.includes('/patient/analyses')) return 'patient-analyses'
    if (hash.includes('/patient/reports')) return 'patient-reports'
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
    if (hash.includes('patient-details')) return 'patient-details'
    if (hash.includes('symptom-categories')) return 'symptom-categories'
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
  if (hash.startsWith('#/patient') || path.includes('/patient')) {
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
  if (hash.includes('patient-details')) return 'patient-details'
  if (hash.includes('symptom-categories')) return 'symptom-categories'
  if (hash.includes('review')) return 'review'
  if (hash.includes('analyzing')) return 'analyzing'
  if (hash.includes('report')) return 'report'

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
  const [patientDetails, setPatientDetails] = useState<PatientDetails>(INITIAL_PATIENT)
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, SelectedSymptom>>({})
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResponse | null>(null)

  // Initialize session on mount + handle URL hash routing with role enforcement
  useEffect(() => {
    const syncRouteAndAuth = () => {
      const auth = getAuthState()
      setIsAuthenticated(auth.isPatient)
      setUser(auth.patientUser)
      const targetPage = resolveRoute(auth.isAdmin, auth.isPatient)
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
    } else if (to.startsWith('patient-')) {
      const sub = to.replace('patient-', '')
      window.location.hash = `/patient/${sub}`
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
    navigate('symptom-subcategory')
  }

  const showNavbar = !NO_NAVBAR_PAGES.includes(page)

  return (
    <div className="min-h-screen bg-background text-foreground">
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
      ) : page.startsWith('patient-') ? (
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

            {page === 'patient-details' && (
              <PatientDetailsPage
                details={patientDetails}
                onSave={setPatientDetails}
                onNavigate={navigate}
              />
            )}

            {page === 'symptom-categories' && (
              <SymptomCategoriesPage
                selectedSymptoms={selectedSymptoms}
                onSelectCategory={handleSelectCategory}
                onNavigate={navigate}
              />
            )}

            {page === 'symptom-subcategory' && currentCategory && (
              <SymptomSubcategoryPage
                categoryId={currentCategory}
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
                  setReturnToPage('home')
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
