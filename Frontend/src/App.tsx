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
import { getAccessToken, getStoredUser, clearAuthSession, logout as apiLogout } from './services/api'
import type { Page, PatientDetails, SelectedSymptom, PredictionResponse, User } from './types'
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

// Hide navbar during clinical health assessment flow or in admin portal
const NO_NAVBAR_PAGES: Page[] = [
  'patient-details',
  'symptom-categories',
  'symptom-subcategory',
  'review',
  'analyzing',
  'report',
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

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [adminDetailId, setAdminDetailId] = useState<string | undefined>(undefined)
  const [returnToPage, setReturnToPage] = useState<Page>('home')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [patientDetails, setPatientDetails] = useState<PatientDetails>(INITIAL_PATIENT)
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, SelectedSymptom>>({})
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResponse | null>(null)

  // Initialize session on mount + handle /admin URL routing
  useEffect(() => {
    const token = getAccessToken()
    const storedUser = getStoredUser()
    if (token) {
      setIsAuthenticated(true)
      setUser(storedUser)
    }

    // Check if initial URL or hash points to admin
    const path = window.location.pathname.toLowerCase()
    const hash = window.location.hash.toLowerCase()
    if (path.includes('/admin') || hash.includes('/admin') || hash === '#admin') {
      setPage('admin-dashboard')
    }

    const handleHashChange = () => {
      const h = window.location.hash.toLowerCase()
      if (h.startsWith('#/admin') || h === '#admin') {
        setPage('admin-dashboard')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function navigate(to: Page) {
    if (to === page) return
    setPage(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Fresh patient form initialized every time Start Health Check is clicked
  function handleStartHealthCheck() {
    setPatientDetails(INITIAL_PATIENT)
    setSelectedSymptoms({})
    setCurrentCategory(null)
    setCurrentPrediction(null)
    setReturnToPage('home')
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
    setReturnToPage('history')
    navigate('report')
  }

  function handleAuthenticate(authenticatedUser: User) {
    setIsAuthenticated(true)
    setUser(authenticatedUser)
  }

  async function handleLogout() {
    await apiLogout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('home')
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

          {page.startsWith('admin-') && (
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
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
