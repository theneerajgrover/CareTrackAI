/**
 * api.ts
 * ------
 * Centralized API client for CareTrack AI Frontend.
 * Communicates with the Flask REST backend at http://localhost:5000/api
 */

import type { PatientDetails, PredictionResponse, HistoryItem, User, ClinicalReportItem } from '../types'

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  ((import.meta as any).env?.PROD
    ? 'https://caretrackai.onrender.com/api'
    : 'http://127.0.0.1:5000/api')

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
  const method = (options.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  // Only set Content-Type when sending a body to avoid triggering unnecessary CORS preflight OPTIONS requests on GET
  if (method !== 'GET' && method !== 'HEAD' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
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

let _inMemoryGuestId: string | null = null

export function getGuestId(): string {
  try {
    let gid = localStorage.getItem('caretrack_guest_id')
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('caretrack_guest_id', gid)
    }
    return gid
  } catch {
    if (!_inMemoryGuestId) {
      _inMemoryGuestId = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
    return _inMemoryGuestId
  }
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

export function formatPatientReportFilename(patientName?: string | null): string {
  if (!patientName) return 'patient_caretrack_report.pdf'
  const clean = patientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return clean ? `${clean}_caretrack_report.pdf` : 'patient_caretrack_report.pdf'
}

export async function downloadPredictionPdf(predictionId: string): Promise<Blob> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    headers['X-Guest-ID'] = getGuestId()
  }

  const res = await fetch(`${API_BASE}/predictions/${encodeURIComponent(predictionId)}/pdf`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}))
    throw new Error(errorJson.error || `Failed to download report PDF (HTTP ${res.status})`)
  }

  return res.blob()
}

export async function getUserReports(): Promise<ClinicalReportItem[]> {
  try {
    const res = await request<{ reports: ClinicalReportItem[] }>('/user/reports', {
      method: 'GET',
    })
    return res.reports || []
  } catch {
    // Resilient fallback for local mock / backward compatibility
    const history = await getPredictionHistory()
    return history.map((h) => ({
      id: `rep-${h.id.slice(0, 8)}-cca`,
      prediction_id: h.id,
      title: `Clinical Assessment Dossier — ${(h.top_disease || 'Health Assessment').replace(/_/g, ' ')}`,
      category: 'Complete Clinical Assessment',
      category_code: 'clinical_assessment',
      file_format: 'PDF (Vector Document)',
      file_size: '42 KB',
      status: 'Available',
      created_at: h.created_at,
      assessment_date: h.created_at,
      patient_name: h.patient_name,
      primary_condition: h.top_disease || 'General Assessment',
      confidence: h.top_confidence,
      risk_level: h.risk_level || 'low',
      symptom_count: h.symptom_ids?.length || 0,
      download_url: `/predictions/${h.id}/pdf`,
    }))
  }
}

// ── Metadata APIs ──────────────────────────────────────────────────────────────

let _symptomsCache: { id: number; key: string; label: string; category: string }[] | null = null
let _modelInfoCache: any = null

export async function getModelInfo(): Promise<any> {
  if (_modelInfoCache) return _modelInfoCache
  const res = await request('/model/info', { method: 'GET' })
  _modelInfoCache = res
  return res
}

export async function getBackendHealth(): Promise<{ status: string }> {
  return request<{ status: string }>('/health', { method: 'GET' })
}

export async function getAllSymptoms(): Promise<{ id: number; key: string; label: string; category: string }[]> {
  if (_symptomsCache && _symptomsCache.length > 0) return _symptomsCache
  const res = await request<{ symptoms: { id: number; key: string; label: string; category: string }[] }>('/symptoms', { method: 'GET' })
  if (res.symptoms && res.symptoms.length > 0) {
    _symptomsCache = res.symptoms
  }
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

// ── Patient Medical Assistance Chatbot APIs ───────────────────────────────────

export async function getChatSessions(): Promise<{ sessions: import('../types').ChatSession[] }> {
  return request<{ sessions: import('../types').ChatSession[] }>('/user/chat/sessions', { method: 'GET' })
}

export async function getChatSessionMessages(
  sessionId: string
): Promise<{ session: import('../types').ChatSession; messages: import('../types').ChatMessage[] }> {
  return request<{ session: import('../types').ChatSession; messages: import('../types').ChatMessage[] }>(
    `/user/chat/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'GET' }
  )
}

export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<{ session_id: string; message: import('../types').ChatMessage }> {
  return request<{ session_id: string; message: import('../types').ChatMessage }>('/user/chat/send', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId }),
  })
}

export async function sendChatMessageStream(
  message: string,
  sessionId?: string,
  onChunk?: (delta: string) => void,
  onSession?: (newSessionId: string) => void
): Promise<{ session_id: string; message: import('../types').ChatMessage }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}/user/chat/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, session_id: sessionId, stream: true }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`)
  }

  if (!res.body) {
    throw new Error('Response body is unavailable for streaming.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalSessionId = sessionId || ''
  let accumulatedContent = ''
  let completedMessage: import('../types').ChatMessage | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (!dataStr) continue

      try {
        const parsed = JSON.parse(dataStr)
        if (parsed.type === 'session') {
          finalSessionId = parsed.session_id
          if (onSession && parsed.session_id) {
            onSession(parsed.session_id)
          }
        } else if (parsed.type === 'chunk' && parsed.delta) {
          accumulatedContent += parsed.delta
          if (onChunk) {
            onChunk(parsed.delta)
          }
        } else if (parsed.type === 'done') {
          completedMessage = {
            id: parsed.message_id || 'msg-' + Date.now(),
            sender: 'assistant',
            content: accumulatedContent,
            model: parsed.model || 'gemini-3.5-flash-lite',
            response_time_ms: parsed.response_time_ms || 0,
            status: parsed.status || 'success',
            created_at: new Date().toISOString(),
          }
        } else if (parsed.type === 'error') {
          throw new Error(parsed.error || 'Chat generation failed.')
        }
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('JSON')) {
          throw parseErr
        }
      }
    }
  }

  if (!completedMessage) {
    completedMessage = {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      content: accumulatedContent || "Sorry, I'm unable to respond right now. Please try again shortly.",
      model: 'gemini-3.5-flash-lite',
      response_time_ms: 0,
      status: 'success',
      created_at: new Date().toISOString(),
    }
  }

  return {
    session_id: finalSessionId,
    message: completedMessage,
  }
}

export async function deleteChatSession(sessionId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/user/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  })
}

