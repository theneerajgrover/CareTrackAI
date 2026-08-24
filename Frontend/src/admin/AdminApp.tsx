import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Users, Activity, FileText, Stethoscope, Brain, Cpu,
  MessageSquare, Bell, Shield, ClipboardList, LogOut, Menu, X,
  Search, ChevronDown, Heart
} from 'lucide-react'
import type { AdminPage, AdminUser } from './adminTypes'
import { getAdminAccessToken, getStoredAdmin, adminLogout, adminSearch } from './services/adminApi'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import AnalysesPage from './pages/AnalysesPage'
import ReportsPage from './pages/ReportsPage'
import SymptomsPage from './pages/SymptomsPage'
import AIMonitoringPage from './pages/AIMonitoringPage'
import FeedbackPage from './pages/FeedbackPage'
import NotificationsPage from './pages/NotificationsPage'
import SystemHealthPage from './pages/SystemHealthPage'
import AuditLogsPage from './pages/AuditLogsPage'
import type { SearchResults } from './adminTypes'
import './styles/admin.css'

const SIDEBAR_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'admin-dashboard' as AdminPage, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Patients',
    items: [
      { id: 'admin-patients' as AdminPage, label: 'Patients', icon: Users },
      { id: 'admin-analyses' as AdminPage, label: 'Analyses', icon: Activity },
      { id: 'admin-reports' as AdminPage, label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'AI',
    items: [
      { id: 'admin-ai-monitoring' as AdminPage, label: 'AI Monitoring', icon: Brain },
    ],
  },
  {
    label: 'Clinical Data',
    items: [
      { id: 'admin-symptoms' as AdminPage, label: 'Symptoms', icon: Stethoscope },
    ],
  },
  {
    label: 'Communication',
    items: [
      { id: 'admin-notifications' as AdminPage, label: 'Notifications', icon: Bell },
      { id: 'admin-feedback' as AdminPage, label: 'Feedback', icon: MessageSquare },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'admin-system' as AdminPage, label: 'System Health', icon: Shield },
      { id: 'admin-audit' as AdminPage, label: 'Audit Logs', icon: ClipboardList },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  'admin-dashboard': 'Dashboard',
  'admin-patients': 'Patient Management',
  'admin-patient-detail': 'Patient Detail',
  'admin-analyses': 'Analysis Management',
  'admin-analysis-detail': 'Analysis Detail',
  'admin-reports': 'Report Management',
  'admin-report-detail': 'Report Detail',
  'admin-symptoms': 'Symptom Database',
  'admin-ai-monitoring': 'AI Monitoring',
  'admin-models': 'Model Versions',
  'admin-feedback': 'Feedback Management',
  'admin-notifications': 'Notifications',
  'admin-system': 'System Health',
  'admin-audit': 'Audit Logs',
}

interface AdminAppProps {
  page: AdminPage
  onNavigate: (page: AdminPage | 'home') => void
  detailId?: string
}

export default function AdminApp({ page, onNavigate, detailId }: AdminAppProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const token = getAdminAccessToken()
    const stored = getStoredAdmin()
    if (token && stored) {
      setAdminUser(stored)
    } else if (page !== 'admin-login') {
      onNavigate('admin-login')
    }
  }, [page, onNavigate])

  const handleLogin = useCallback((admin: AdminUser) => {
    setAdminUser(admin)
    onNavigate('admin-dashboard')
  }, [onNavigate])

  const handleLogout = useCallback(async () => {
    await adminLogout()
    setAdminUser(null)
    onNavigate('admin-login')
  }, [onNavigate])

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (q.length >= 2) {
      try {
        const res = await adminSearch(q)
        setSearchResults(res.results)
        setSearchOpen(true)
      } catch { setSearchResults(null) }
    } else {
      setSearchResults(null)
      setSearchOpen(false)
    }
  }, [])

  // Login page renders without sidebar
  if (page === 'admin-login' || !adminUser) {
    return <AdminLoginPage onLogin={handleLogin} />
  }

  const nav = (p: AdminPage) => {
    onNavigate(p)
    setSidebarOpen(false)
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Heart size={18} style={{ color: '#a5b4fc' }} />
            <h1>CareTrack AI</h1>
          </div>
          <span>Admin Portal</span>
        </div>

        {SIDEBAR_SECTIONS.map((section) => (
          <div className="admin-sidebar-section" key={section.label}>
            <div className="admin-sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`admin-sidebar-item ${page === item.id || (page.startsWith(item.id.replace('admin-', 'admin-') + '-detail') && item.id !== 'admin-dashboard') ? 'active' : ''}`}
                onClick={() => nav(item.id)}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <div className="admin-sidebar-section" style={{ marginTop: 'auto', paddingBottom: 16 }}>
          <div className="admin-sidebar-section-label">Account</div>
          <button className="admin-sidebar-item" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="admin-mobile-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="admin-header-title">
              {PAGE_TITLES[page] || 'Admin Portal'}
            </span>
          </div>

          <div className="admin-header-actions">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
              <input
                className="admin-search-input"
                placeholder="Search patients, symptoms…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onFocus={() => searchResults && setSearchOpen(true)}
              />
              {searchOpen && searchResults && (
                <div className="admin-profile-dropdown" style={{ left: 0, right: 'auto', top: 40, minWidth: 320 }}>
                  {searchResults.patients.length > 0 && (
                    <div>
                      <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Patients</div>
                      {searchResults.patients.map(p => (
                        <button key={p.id} className="admin-profile-dropdown-item"
                          onMouseDown={() => { onNavigate('admin-patient-detail'); setSearchOpen(false) }}>
                          {p.name} <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{p.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.symptoms.length > 0 && (
                    <div>
                      <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Symptoms</div>
                      {searchResults.symptoms.map(s => (
                        <button key={s.id} className="admin-profile-dropdown-item"
                          onMouseDown={() => { nav('admin-symptoms'); setSearchOpen(false) }}>
                          {s.label} <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{s.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.patients.length === 0 && searchResults.symptoms.length === 0 &&
                    searchResults.analyses.length === 0 && searchResults.feedback.length === 0 && (
                    <div style={{ padding: 16, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>No results found</div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-header-profile" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="admin-header-avatar">
                {adminUser.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{adminUser.name.split(' ')[0]}</span>
              <ChevronDown size={14} style={{ color: '#9ca3af' }} />

              {profileOpen && (
                <div className="admin-profile-dropdown">
                  <div className="admin-profile-dropdown-header">
                    <p>{adminUser.name}</p>
                    <span>{adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1)} • {adminUser.email}</span>
                  </div>
                  <button className="admin-profile-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">
          {page === 'admin-dashboard' && <AdminDashboard onNavigate={nav} />}
          {page === 'admin-patients' && <PatientsPage onNavigate={nav} />}
          {page === 'admin-patient-detail' && <PatientDetailPage patientId={detailId || ''} onNavigate={nav} />}
          {page === 'admin-analyses' && <AnalysesPage onNavigate={nav} />}
          {page === 'admin-reports' && <ReportsPage onNavigate={nav} />}
          {page === 'admin-symptoms' && <SymptomsPage />}
          {page === 'admin-ai-monitoring' && <AIMonitoringPage />}
          {page === 'admin-feedback' && <FeedbackPage />}
          {page === 'admin-notifications' && <NotificationsPage />}
          {page === 'admin-system' && <SystemHealthPage />}
          {page === 'admin-audit' && <AuditLogsPage />}
        </div>
      </main>
    </div>
  )
}
