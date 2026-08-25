import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Menu, X, Activity, ArrowRight, History, LogOut, User as UserIcon,
  ChevronDown, Sparkles, FileText, LayoutDashboard
} from 'lucide-react'
import { mobileMenu, mobileMenuBackdrop, mobileNavItem, buttonTap, buttonHover } from '../motion/variants'
import type { Page, User } from '../types'

interface NavbarProps {
  currentPage: Page
  isAuthenticated: boolean
  user: User | null
  onNavigate: (page: Page) => void
  onStartHealthCheck: () => void
  onLogout: () => void
}

const NAV_LINKS: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'How It Works', page: 'how-it-works' },
  { label: 'Health Analysis', page: 'health-analysis' },
  { label: 'About', page: 'about' },
  { label: 'Contact', page: 'contact' },
]

export default function Navbar({
  currentPage,
  isAuthenticated,
  user,
  onNavigate,
  onStartHealthCheck,
  onLogout,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 60], [0, 1])
  const paddingY = useTransform(scrollY, [0, 60], [20, 12])

  const isHome = currentPage === 'home'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function go(page: Page) {
    setMenuOpen(false)
    setUserDropdownOpen(false)
    onNavigate(page)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ paddingTop: isHome ? paddingY : 12, paddingBottom: isHome ? paddingY : 12 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Background layer */}
        <motion.div
          className="absolute inset-0 backdrop-blur-md border-b border-border/80"
          style={{
            opacity: isHome ? bgOpacity : 1,
            backgroundColor: 'rgba(247,247,245,0.92)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between gap-4">
          {/* 1. Left: Logo */}
          <motion.button
            onClick={() => go('home')}
            className="flex items-center gap-2.5 flex-shrink-0 z-10"
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-md shadow-accent/20">
              <Activity size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[14px] tracking-tight text-foreground whitespace-nowrap">
              CareTrack <span className="text-accent">AI</span>
            </span>
          </motion.button>

          {/* 2. Middle: Desktop Navigation Links (No absolute positioning to prevent overlap) */}
          <div className="hidden lg:flex items-center gap-1 z-10">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                label={link.label}
                isActive={currentPage === link.page}
                onClick={() => go(link.page)}
              />
            ))}
          </div>

          {/* 3. Right: User Controls & CTAs */}
          <div className="hidden md:flex items-center gap-3 z-10 flex-shrink-0">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                {/* User Profile Pill Button */}
                <motion.button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2 h-9 px-3.5 rounded-full border text-[12px] font-medium transition-all ${
                    userDropdownOpen
                      ? 'border-accent bg-accent/10 text-accent shadow-sm'
                      : 'border-border bg-card text-foreground hover:bg-secondary'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[120px] truncate font-semibold">
                    {user?.name || 'My Account'}
                  </span>
                  <motion.div
                    animate={{ rotate: userDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={13} className="text-muted-foreground" />
                  </motion.div>
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card shadow-xl p-2 z-50 backdrop-blur-xl"
                    >
                      {/* User Info Header */}
                      <div className="px-3 py-2 border-b border-border/60 mb-1">
                        <p className="text-[12px] font-bold text-foreground truncate">{user?.name || 'User'}</p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{user?.email || 'Authenticated'}</p>
                      </div>

                      {/* Admin Dashboard Option for Admins */}
                      {(user?.email === 'admin@caretrack.ai' || Boolean(localStorage.getItem('caretrack_admin_access_token'))) && (
                        <button
                          onClick={() => go('admin-dashboard')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-left transition-colors bg-accent/10 text-accent hover:bg-accent/20 mb-1"
                        >
                          <Activity size={14} className="text-accent" />
                          <span>Admin Control Center</span>
                        </button>
                      )}

                      {/* Patient Health Dashboard Option */}
                      <button
                        onClick={() => go('patient-dashboard')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-left transition-colors ${
                          currentPage === 'patient-dashboard'
                            ? 'bg-accent text-white'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <LayoutDashboard size={14} className={currentPage === 'patient-dashboard' ? 'text-white' : 'text-accent'} />
                        <span>My Health Dashboard</span>
                      </button>

                      {/* History Option */}
                      <button
                        onClick={() => go('history')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-left transition-colors ${
                          currentPage === 'history'
                            ? 'bg-accent text-white'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <History size={14} className={currentPage === 'history' ? 'text-white' : 'text-accent'} />
                        <span>Assessment History</span>
                      </button>

                      {/* Sign Out Option */}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          onLogout()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-left text-critical hover:bg-critical/10 transition-colors mt-1"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => go('auth')}
                className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 h-8"
                whileHover={{ opacity: 1 }}
              >
                Sign In
              </motion.button>
            )}

            {/* Primary Health Check Button */}
            <motion.button
              onClick={() => onStartHealthCheck()}
              className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent text-white text-[12px] font-semibold group shadow-sm shadow-accent/25"
              whileHover={{ ...buttonHover, boxShadow: '0 4px 16px rgba(67,56,202,0.35)' }}
              whileTap={buttonTap}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <span>Start Health Check</span>
              <motion.span
                className="inline-flex"
                initial={{ x: 0 }}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <ArrowRight size={12} />
              </motion.span>
            </motion.button>
          </div>

          {/* Mobile menu button */}
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden relative z-10 w-8 h-8 flex items-center justify-center text-foreground"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {menuOpen ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={18} />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.nav>

      {/* Mobile menu sheet */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(12,12,14,0.35)' }}
              variants={mobileMenuBackdrop}
              initial="closed"
              animate="open"
              exit="exit"
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              className="fixed top-0 right-0 bottom-0 w-72 z-50 bg-card border-l border-border flex flex-col pt-20 px-6 pb-8"
              variants={mobileMenu}
              initial="closed"
              animate="open"
              exit="exit"
            >
              <div className="flex flex-col gap-1 flex-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.button
                    key={link.label}
                    onClick={() => go(link.page)}
                    className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      currentPage === link.page
                        ? 'bg-accent/10 text-accent font-semibold'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                    custom={i}
                    variants={mobileNavItem}
                    initial="closed"
                    animate="open"
                    exit="exit"
                  >
                    {link.label}
                  </motion.button>
                ))}

                {isAuthenticated && (
                  <>
                    {(user?.email === 'admin@caretrack.ai' || Boolean(localStorage.getItem('caretrack_admin_access_token'))) && (
                      <motion.button
                        onClick={() => go('admin-dashboard')}
                        className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 bg-accent/10 text-accent"
                        custom={NAV_LINKS.length}
                        variants={mobileNavItem}
                        initial="closed"
                        animate="open"
                        exit="exit"
                      >
                        <Activity size={14} />
                        Admin Control Center
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => go('history')}
                      className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
                        currentPage === 'history'
                          ? 'bg-accent/10 text-accent font-semibold'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                      custom={NAV_LINKS.length + 1}
                      variants={mobileNavItem}
                      initial="closed"
                      animate="open"
                      exit="exit"
                    >
                      <History size={14} />
                      Assessment History
                    </motion.button>
                  </>
                )}
              </div>

              <motion.div
                className="flex flex-col gap-2 pt-6 border-t border-border"
                custom={NAV_LINKS.length + 1}
                variants={mobileNavItem}
                initial="closed"
                animate="open"
                exit="exit"
              >
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="h-10 rounded-full border border-border text-sm font-medium text-critical hover:bg-critical/10 flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={14} />
                    Sign Out ({user?.name || 'User'})
                  </button>
                ) : (
                  <button
                    onClick={() => go('auth')}
                    className="h-10 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    Sign In
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onStartHealthCheck()
                  }}
                  className="h-10 rounded-full bg-accent text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  Start Health Check
                  <ArrowRight size={13} />
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function NavLink({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative px-3.5 py-1.5 rounded-lg text-[12.5px] transition-all duration-200 flex items-center justify-center select-none border ${
        isActive
          ? 'font-semibold text-accent bg-accent/[0.08] border-accent/15 shadow-xs'
          : isHovered
          ? 'font-medium text-foreground bg-foreground/[0.04] border-transparent'
          : 'font-medium text-foreground/70 border-transparent hover:text-foreground'
      }`}
    >
      <span className="relative z-10 tracking-tight">
        {label}
      </span>

      {/* Active bottom indicator bar */}
      {isActive && (
        <motion.span
          layoutId="navbar-active-indicator"
          className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-accent rounded-full shadow-xs shadow-accent/40"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      {/* Subtle hover bottom line indicator for inactive items */}
      {!isActive && isHovered && (
        <motion.span
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.5 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-accent/40 rounded-full"
        />
      )}
    </button>
  )
}
