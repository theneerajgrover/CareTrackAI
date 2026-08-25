import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Activity, FileText, Stethoscope, ShieldCheck,
  Bell, User as UserIcon, MessageSquare, LogOut, Menu, X,
  ChevronDown, Heart, Sparkles
} from 'lucide-react'
import type { PatientPage, User, Page, PredictionResponse, PatientDetails, SelectedSymptom } from '../types'
import PatientDashboard from './pages/PatientDashboard'
import PatientAnalysesPage from './pages/PatientAnalysesPage'
import PatientReportsPage from './pages/PatientReportsPage'
import PatientSymptomsPage from './pages/PatientSymptomsPage'
import PatientRecommendationsPage from './pages/PatientRecommendationsPage'
import PatientNotificationsPage from './pages/PatientNotificationsPage'
import PatientProfilePage from './pages/PatientProfilePage'
import PatientFeedbackPage from './pages/PatientFeedbackPage'
import { getPredictionDetails } from '../services/api'
import CareTrackLogo from '../components/CareTrackLogo'
import './styles/patient.css'

interface PatientAppProps {
  page: PatientPage
  user: User | null
  onNavigate: (page: Page) => void
  onStartHealthCheck: () => void
  onLogout: () => void
  onViewHistoryReport: (
    predictionData: PredictionResponse,
    patientDetails: PatientDetails,
    selectedSymptoms: Record<string, SelectedSymptom>
  ) => void
  onUpdateUser: (user: User) => void
}

const SIDEBAR_ITEMS = [
  { id: 'patient-dashboard' as PatientPage, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patient-analyses' as PatientPage, label: 'My Analyses', icon: Activity },
  { id: 'patient-reports' as PatientPage, label: 'Reports', icon: FileText },
  { id: 'patient-symptoms' as PatientPage, label: 'Symptoms', icon: Stethoscope },
  { id: 'patient-recommendations' as PatientPage, label: 'Recommendations', icon: ShieldCheck },
  { id: 'patient-notifications' as PatientPage, label: 'Notifications', icon: Bell },
  { id: 'patient-profile' as PatientPage, label: 'Profile', icon: UserIcon },
  { id: 'patient-feedback' as PatientPage, label: 'Feedback', icon: MessageSquare },
]

const PAGE_TITLES: Record<string, string> = {
  'patient-dashboard': 'Personal Health Dashboard',
  'patient-analyses': 'My Health Analyses',
  'patient-reports': 'Clinical Health Reports',
  'patient-symptoms': 'Symptom Library',
  'patient-recommendations': 'Clinical Recommendations',
  'patient-notifications': 'Notifications & Health Alerts',
  'patient-profile': 'Patient Profile',
  'patient-feedback': 'Support & Feedback',
}

export default function PatientApp({
  page,
  user,
  onNavigate,
  onStartHealthCheck,
  onLogout,
  onViewHistoryReport,
  onUpdateUser,
}: PatientAppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  // Reset sidebar scroll position on navigation
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0
    }
  }, [page])

  const nav = (p: PatientPage) => {
    onNavigate(p)
    setSidebarOpen(false)
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0
    }
  }

  // Load and open full report by prediction ID
  async function handleOpenReportById(id: string) {
    try {
      const raw = await getPredictionDetails(id)
      if (!raw) return

      const patient: PatientDetails = {
        name: raw.patient?.name || '',
        age: String(raw.patient?.age || ''),
        gender: raw.patient?.gender || 'male',
        dob: raw.patient?.dob || '',
        bloodGroup: raw.patient?.blood_group || 'O+',
        height: String(raw.patient?.height || ''),
        weight: String(raw.patient?.weight || ''),
      }

      const symptomsMap: Record<string, SelectedSymptom> = {}
      if (raw.symptoms && Array.isArray(raw.symptoms)) {
        raw.symptoms.forEach((s: any) => {
          symptomsMap[s.key] = {
            key: s.key,
            label: s.label || s.key.replace(/_/g, ' '),
            category: 'general',
            categoryLabel: 'General',
          }
        })
      }

      const prediction: PredictionResponse = {
        prediction_id: raw.id,
        predictions: (raw.results || []).map((r: any) => ({
          rank: r.rank,
          disease: r.disease,
          disease_id: r.disease_id,
          confidence: Number(r.confidence || 0),
          risk_level: r.risk_level || 'low',
          doctor: r.doctor || 'General Physician',
          remedies: r.remedies,
          warning: r.warning,
        })),
        symptom_ids: raw.symptom_ids || [],
        symptoms_matched: (raw.symptoms || []).map((s: any) => s.key),
        symptoms_unmatched: [],
        timestamp: raw.created_at || new Date().toISOString(),
      }

      onViewHistoryReport(prediction, patient, symptomsMap)
    } catch (err) {
      console.error('Failed to open report', err)
    }
  }

  const patientInitial = (user?.name || 'P').charAt(0).toUpperCase()

  return (
    <div className="patient-layout">
      {/* Mobile Drawer Overlay */}
      <div
        className={`patient-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Fixed Sidebar */}
      <aside
        ref={sidebarRef}
        className={`patient-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Patient Portal Navigation"
      >
        <div className="patient-sidebar-brand">
          <CareTrackLogo
            variant="dark"
            subtitle="Patient Portal"
            onClick={() => {
              setSidebarOpen(false)
              onNavigate('patient-dashboard')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>

        <nav aria-label="Patient Navigation Links" style={{ padding: '12px 12px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => {
                setSidebarOpen(false)
                onStartHealthCheck()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                height: 38,
                borderRadius: 8,
                background: '#4338ca',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(67, 56, 202, 0.3)',
              }}
            >
              <Sparkles size={14} />
              Start Health Check
            </button>
          </div>

          <div className="patient-sidebar-section-label">Navigation</div>

          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`patient-sidebar-item ${page === item.id ? 'active' : ''}`}
              onClick={() => nav(item.id)}
            >
              <item.icon />
              {item.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button className="patient-sidebar-item" onClick={onLogout}>
              <LogOut />
              Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="patient-main">
        {/* Sticky Top Header */}
        <header className="patient-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="patient-mobile-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="patient-header-title">
              {PAGE_TITLES[page] || 'Patient Workspace'}
            </span>
          </div>

          <div className="patient-header-actions">
            <div className="patient-header-profile" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="patient-header-avatar">{patientInitial}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.name || 'Patient'}</span>
              <ChevronDown size={14} style={{ color: '#64748b' }} />

              {profileOpen && (
                <div className="patient-profile-dropdown">
                  <div className="patient-profile-dropdown-header">
                    <p>{user?.name || 'Patient'}</p>
                    <span>{user?.email || 'Authenticated User'}</span>
                  </div>
                  <button
                    className="patient-profile-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false)
                      nav('patient-profile')
                    }}
                  >
                    <UserIcon size={14} /> My Profile
                  </button>
                  <button
                    className="patient-profile-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false)
                      onStartHealthCheck()
                    }}
                  >
                    <Sparkles size={14} /> Start Health Check
                  </button>
                  <button
                    className="patient-profile-dropdown-item danger"
                    onClick={() => {
                      setProfileOpen(false)
                      onLogout()
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="patient-content">
          {page === 'patient-dashboard' && (
            <PatientDashboard
              user={user}
              onNavigate={nav}
              onStartHealthCheck={onStartHealthCheck}
              onOpenReportById={handleOpenReportById}
            />
          )}
          {page === 'patient-analyses' && (
            <PatientAnalysesPage
              onStartHealthCheck={onStartHealthCheck}
              onOpenReportById={handleOpenReportById}
            />
          )}
          {page === 'patient-reports' && (
            <PatientReportsPage
              onStartHealthCheck={onStartHealthCheck}
              onOpenReportById={handleOpenReportById}
            />
          )}
          {page === 'patient-symptoms' && (
            <PatientSymptomsPage
              onStartHealthCheck={onStartHealthCheck}
            />
          )}
          {page === 'patient-recommendations' && (
            <PatientRecommendationsPage
              onStartHealthCheck={onStartHealthCheck}
              onOpenReportById={handleOpenReportById}
            />
          )}
          {page === 'patient-notifications' && (
            <PatientNotificationsPage />
          )}
          {page === 'patient-profile' && (
            <PatientProfilePage
              user={user}
              onUpdateUser={onUpdateUser}
            />
          )}
          {page === 'patient-feedback' && (
            <PatientFeedbackPage />
          )}
        </div>
      </main>
    </div>
  )
}
