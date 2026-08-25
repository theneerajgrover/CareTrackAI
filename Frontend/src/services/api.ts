/**
 * api.ts
 * ------
 * Centralized API client for CareTrack AI Frontend.
 * Communicates with the Flask REST backend at http://localhost:5000/api
 */

import type { PatientDetails, PredictionResponse, HistoryItem, User } from '../types'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:5000/api'

// Helper for tokens in localStorage
export function getAccessToken(): string | null {
  return localStorage.getItem('caretrack_access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('caretrack_refresh_token')
}

export function getStoredUser(): User | null {
  const u = localStorage.getItem('caretrack_user')
  try {
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function setAuthSession(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem('caretrack_access_token', accessToken)
  localStorage.setItem('caretrack_refresh_token', refreshToken)
  localStorage.setItem('caretrack_user', JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem('caretrack_access_token')
  localStorage.removeItem('caretrack_refresh_token')
  localStorage.removeItem('caretrack_user')
}

// Generic fetch wrapper with automatic JWT header
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle unauthorized (401) by attempting refresh if token is present
  if (res.status === 401 && getRefreshToken() && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry once with new token
      headers['Authorization'] = `Bearer ${getAccessToken()}`
      const retryRes = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      })
      if (!retryRes.ok) {
        const errorData = await retryRes.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${retryRes.status}: ${retryRes.statusText}`)
      }
      return retryRes.json()
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

async function tryRefreshToken(): Promise<boolean> {
  const rf = getRefreshToken()
  if (!rf) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rf }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('caretrack_access_token', data.access_token)
      return true
    }
  } catch (err) {
    console.error('Failed to refresh token', err)
  }
  clearAuthSession()
  return false
}

// ── Auth APIs ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: User; is_admin?: boolean; admin?: any }> {
  const res = await request<{ message: string; access_token: string; refresh_token: string; user: User; is_admin?: boolean; admin?: any }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  )
  if (res.is_admin && res.admin) {
    // Admin user: Store admin session and clear patient session to prevent token mixing
    clearAuthSession()
    localStorage.setItem('caretrack_admin_access_token', res.access_token)
    localStorage.setItem('caretrack_admin_refresh_token', res.refresh_token)
    localStorage.setItem('caretrack_admin_user', JSON.stringify(res.admin))
  } else {
    // Patient user: Store patient session and clear admin session
    localStorage.removeItem('caretrack_admin_access_token')
    localStorage.removeItem('caretrack_admin_refresh_token')
    localStorage.removeItem('caretrack_admin_user')
    setAuthSession(res.access_token, res.refresh_token, res.user)
  }
  return res
}

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<{ access_token: string; refresh_token: string; user: User }> {
  const res = await request<{ message: string; access_token: string; refresh_token: string; user: User }>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }
  )
  localStorage.removeItem('caretrack_admin_access_token')
  localStorage.removeItem('caretrack_admin_refresh_token')
  localStorage.removeItem('caretrack_admin_user')
  setAuthSession(res.access_token, res.refresh_token, res.user)
  return res
}

export async function logout(): Promise<void> {
  const rf = getRefreshToken()
  if (rf) {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: rf }),
      })
    } catch {
      // Ignore network errors on logout
    }
  }
  clearAuthSession()
  localStorage.removeItem('caretrack_admin_access_token')
  localStorage.removeItem('caretrack_admin_refresh_token')
  localStorage.removeItem('caretrack_admin_user')
}

// ── ML Prediction APIs ─────────────────────────────────────────────────────────

export function getGuestId(): string {
  let gid = localStorage.getItem('caretrack_guest_id')
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('caretrack_guest_id', gid)
  }
  return gid
}

export async function getGuestStatus(): Promise<{ used: boolean; remaining: number; message?: string }> {
  const gid = getGuestId()
  return request<{ used: boolean; remaining: number; message?: string }>(`/guest/status?guest_id=${encodeURIComponent(gid)}`, {
    method: 'GET',
  })
}

export async function runGuestPrediction(
  symptoms: string[],
  patientDetails?: Partial<PatientDetails>
): Promise<PredictionResponse> {
  const gid = getGuestId()
  const res = await request<PredictionResponse>('/guest/predict', {
    method: 'POST',
    body: JSON.stringify({
      guest_id: gid,
      symptoms,
      patient_details: {
        name: patientDetails?.name || 'Guest User',
        age: patientDetails?.age || '30',
        gender: patientDetails?.gender || 'other',
        dob: patientDetails?.dob || '',
        bloodGroup: patientDetails?.bloodGroup || 'O+',
        height: patientDetails?.height || '',
        weight: patientDetails?.weight || '',
      },
    }),
  })
  localStorage.setItem('caretrack_guest_completed', 'true')
  return res
}

export async function runPrediction(
  symptoms: string[],
  patientDetails: PatientDetails
): Promise<PredictionResponse> {
  return request<PredictionResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify({
      symptoms,
      patient_details: {
        name: patientDetails.name,
        age: patientDetails.age,
        gender: patientDetails.gender,
        dob: patientDetails.dob,
        bloodGroup: patientDetails.bloodGroup,
        height: patientDetails.height,
        weight: patientDetails.weight,
      },
    }),
  })
}

// ── History & User Records ─────────────────────────────────────────────────────

export async function getPredictionHistory(): Promise<HistoryItem[]> {
  const res = await request<{ predictions: HistoryItem[] }>('/predictions', {
    method: 'GET',
  })
  return res.predictions || []
}

export async function getPredictionDetails(id: string): Promise<any> {
  return request(`/predictions/${id}`, {
    method: 'GET',
  })
}

// ── Metadata APIs ──────────────────────────────────────────────────────────────

export async function getModelInfo(): Promise<any> {
  return request('/model/info', { method: 'GET' })
}

export async function getBackendHealth(): Promise<{ status: string }> {
  return request<{ status: string }>('/health', { method: 'GET' })
}

export async function getAllSymptoms(): Promise<{ id: number; key: string; label: string; category: string }[]> {
  const res = await request<{ symptoms: { id: number; key: string; label: string; category: string }[] }>('/symptoms', { method: 'GET' })
  return res.symptoms || []
}

// ── Patient Portal Specific APIs ──────────────────────────────────────────────

export async function getUserProfile(): Promise<{ user: User }> {
  return request<{ user: User }>('/user/profile', { method: 'GET' })
}

export async function updateUserProfile(name: string, phone: string): Promise<{ message: string; user: User }> {
  const res = await request<{ message: string; user: User }>('/user/profile', {
    method: 'PUT',
    body: JSON.stringify({ name, phone }),
  })
  // Keep stored user in sync
  const stored = getStoredUser()
  if (stored) {
    localStorage.setItem('caretrack_user', JSON.stringify({ ...stored, name, phone }))
  }
  return res
}

export async function getUserStats(): Promise<{ stats: import('../types').UserStats }> {
  return request<{ stats: import('../types').UserStats }>('/user/stats', { method: 'GET' })
}

export async function getUserNotifications(): Promise<{ notifications: import('../types').PatientNotification[] }> {
  return request<{ notifications: import('../types').PatientNotification[] }>('/user/notifications', { method: 'GET' })
}

export async function submitUserFeedback(
  subject: string,
  message: string,
  rating?: number,
  priority: string = 'medium'
): Promise<{ message: string; id: string }> {
  return request<{ message: string; id: string }>('/user/feedback', {
    method: 'POST',
    body: JSON.stringify({ subject, message, rating, priority }),
  })
}

export async function getUserFeedback(): Promise<{ feedback: import('../types').PatientFeedback[] }> {
  return request<{ feedback: import('../types').PatientFeedback[] }>('/user/feedback', { method: 'GET' })
}
