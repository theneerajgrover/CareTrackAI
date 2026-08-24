/**
 * adminApi.ts
 * -----------
 * Admin API client for CareTrack AI Admin Portal.
 * Uses separate token storage from the patient API to prevent conflicts.
 */

import type {
  AdminUser, DashboardStats, ActivityItem, DashboardCharts,
  AdminPatient, PatientDetail, AdminAnalysis, AnalysisDetail,
  AdminReport, AdminSymptom, SymptomCategory,
  AIStats, AIModel, AdminFeedback, FeedbackStats,
  AdminNotification, NotificationStats,
  SystemHealth, AuditLog, Pagination, SearchResults,
} from '../adminTypes'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:5000/api'

// ── Admin Token Storage ─────────────────────────────────────────────────────

export function getAdminAccessToken(): string | null {
  return localStorage.getItem('caretrack_admin_access_token')
}

export function getAdminRefreshToken(): string | null {
  return localStorage.getItem('caretrack_admin_refresh_token')
}

export function getStoredAdmin(): AdminUser | null {
  const a = localStorage.getItem('caretrack_admin_user')
  try { return a ? JSON.parse(a) : null } catch { return null }
}

export function setAdminSession(accessToken: string, refreshToken: string, admin: AdminUser) {
  localStorage.setItem('caretrack_admin_access_token', accessToken)
  localStorage.setItem('caretrack_admin_refresh_token', refreshToken)
  localStorage.setItem('caretrack_admin_user', JSON.stringify(admin))
}

export function clearAdminSession() {
  localStorage.removeItem('caretrack_admin_access_token')
  localStorage.removeItem('caretrack_admin_refresh_token')
  localStorage.removeItem('caretrack_admin_user')
}

// ── Request Helper ──────────────────────────────────────────────────────────

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const token = getAdminAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/admin${endpoint}`, { ...options, headers })

  // Handle 401 by attempting refresh
  if (res.status === 401 && getAdminRefreshToken() && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    const refreshed = await tryAdminRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAdminAccessToken()}`
      const retryRes = await fetch(`${API_BASE}/admin${endpoint}`, { ...options, headers })
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${retryRes.status}`)
      }
      return retryRes.json()
    } else {
      clearAdminSession()
      throw new Error('Session expired')
    }
  }

  if (res.status === 403) {
    throw new Error('Access denied — admin privileges required')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

async function tryAdminRefresh(): Promise<boolean> {
  const rf = getAdminRefreshToken()
  if (!rf) return false
  try {
    const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rf }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('caretrack_admin_access_token', data.access_token)
      return true
    }
  } catch { /* ignore */ }
  clearAdminSession()
  return false
}

// ── Auth APIs ───────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string) {
  const res = await adminRequest<{
    message: string
    access_token: string
    refresh_token: string
    admin: AdminUser
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAdminSession(res.access_token, res.refresh_token, res.admin)
  return res
}

export async function adminLogout(): Promise<void> {
  const rf = getAdminRefreshToken()
  if (rf) {
    try {
      await adminRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: rf }),
      })
    } catch { /* ignore */ }
  }
  clearAdminSession()
}

export async function getAdminMe(): Promise<AdminUser> {
  return adminRequest<AdminUser>('/auth/me')
}

// ── Dashboard APIs ──────────────────────────────────────────────────────────

export async function getDashboardStats(range = 30): Promise<DashboardStats> {
  return adminRequest<DashboardStats>(`/dashboard/stats?range=${range}`)
}

export async function getDashboardActivity(limit = 20): Promise<{ activities: ActivityItem[] }> {
  return adminRequest(`/dashboard/activity?limit=${limit}`)
}

export async function getDashboardCharts(range = 30): Promise<DashboardCharts> {
  return adminRequest<DashboardCharts>(`/dashboard/charts?range=${range}`)
}

// ── Patient APIs ────────────────────────────────────────────────────────────

export async function getPatients(params: {
  page?: number; per_page?: number; search?: string; status?: string; sort?: string; dir?: string
} = {}): Promise<{ patients: AdminPatient[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.sort) qs.set('sort', params.sort)
  if (params.dir) qs.set('dir', params.dir)
  return adminRequest(`/patients?${qs.toString()}`)
}

export async function getPatientDetail(id: string): Promise<PatientDetail> {
  return adminRequest(`/patients/${id}`)
}

// ── Analysis APIs ───────────────────────────────────────────────────────────

export async function getAnalyses(params: {
  page?: number; per_page?: number; search?: string; status?: string;
  date_from?: string; date_to?: string
} = {}): Promise<{ analyses: AdminAnalysis[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  return adminRequest(`/analyses?${qs.toString()}`)
}

export async function getAnalysisDetail(id: string): Promise<AnalysisDetail> {
  return adminRequest(`/analyses/${id}`)
}

// ── Report APIs ─────────────────────────────────────────────────────────────

export async function getReports(params: {
  page?: number; per_page?: number; search?: string;
  date_from?: string; date_to?: string
} = {}): Promise<{ reports: AdminReport[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.search) qs.set('search', params.search)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  return adminRequest(`/reports?${qs.toString()}`)
}

export async function getReportDetail(id: string): Promise<AnalysisDetail> {
  return adminRequest(`/reports/${id}`)
}

// ── Symptom APIs ────────────────────────────────────────────────────────────

export async function getSymptoms(params: {
  page?: number; per_page?: number; search?: string; category?: string; status?: string
} = {}): Promise<{ symptoms: AdminSymptom[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.search) qs.set('search', params.search)
  if (params.category) qs.set('category', params.category)
  if (params.status) qs.set('status', params.status)
  return adminRequest(`/symptoms?${qs.toString()}`)
}

export async function getSymptomCategories(): Promise<{ categories: SymptomCategory[] }> {
  return adminRequest('/symptoms/categories')
}

export async function updateSymptom(id: number, data: Partial<AdminSymptom>): Promise<void> {
  await adminRequest(`/symptoms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── AI / Model APIs ─────────────────────────────────────────────────────────

export async function getAIStats(): Promise<AIStats> {
  return adminRequest('/ai/stats')
}

export async function getAIModels(): Promise<{ models: AIModel[] }> {
  return adminRequest('/ai/models')
}

export async function getAIModelDetail(id: number): Promise<AIModel> {
  return adminRequest(`/ai/models/${id}`)
}

// ── Feedback APIs ───────────────────────────────────────────────────────────

export async function getFeedback(params: {
  page?: number; per_page?: number; search?: string; status?: string; priority?: string
} = {}): Promise<{ feedback: AdminFeedback[]; stats: FeedbackStats; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.priority) qs.set('priority', params.priority)
  return adminRequest(`/feedback?${qs.toString()}`)
}

export async function updateFeedback(id: string, data: {
  status?: string; priority?: string; admin_response?: string
}): Promise<void> {
  await adminRequest(`/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Notification APIs ───────────────────────────────────────────────────────

export async function getNotifications(params: {
  page?: number; per_page?: number
} = {}): Promise<{ notifications: AdminNotification[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  return adminRequest(`/notifications?${qs.toString()}`)
}

export async function createNotification(data: {
  title: string; message: string; type?: string; target_type?: string; target_user_id?: string
}): Promise<{ message: string; id: string }> {
  return adminRequest('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getNotificationStats(): Promise<NotificationStats> {
  return adminRequest('/notifications/stats')
}

// ── System APIs ─────────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
  return adminRequest('/system/health')
}

export async function getAuditLogs(params: {
  page?: number; per_page?: number; action?: string;
  date_from?: string; date_to?: string
} = {}): Promise<{ logs: AuditLog[]; action_types: string[]; pagination: Pagination }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.per_page) qs.set('per_page', String(params.per_page))
  if (params.action) qs.set('action', params.action)
  if (params.date_from) qs.set('date_from', params.date_from)
  if (params.date_to) qs.set('date_to', params.date_to)
  return adminRequest(`/audit?${qs.toString()}`)
}

// ── Search API ──────────────────────────────────────────────────────────────

export async function adminSearch(q: string): Promise<{ results: SearchResults; query: string }> {
  return adminRequest(`/search?q=${encodeURIComponent(q)}`)
}

// ── Export API ───────────────────────────────────────────────────────────────

export function getExportUrl(resource: string): string {
  return `${API_BASE}/admin/export/${resource}`
}

export async function exportData(resource: string): Promise<Blob> {
  const token = getAdminAccessToken()
  const res = await fetch(`${API_BASE}/admin/export/${resource}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}
