/**
 * adminTypes.ts
 * -------------
 * TypeScript types for the CareTrack AI Admin Portal.
 */

// Admin page routing
export type AdminPage =
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-patients'
  | 'admin-patient-detail'
  | 'admin-analyses'
  | 'admin-analysis-detail'
  | 'admin-reports'
  | 'admin-report-detail'
  | 'admin-symptoms'
  | 'admin-ai-monitoring'
  | 'admin-models'
  | 'admin-feedback'
  | 'admin-notifications'
  | 'admin-system'
  | 'admin-audit'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status?: string
  last_login?: string
  created_at?: string
}

// Dashboard
export interface DashboardStats {
  patients: { total: number; new: number; active: number }
  analyses: { total: number; today: number; this_week: number; this_month: number }
  reports: { total: number; today: number }
  ai: { total_prediction_results: number }
  feedback: { total: number; pending: number; resolved: number; critical: number }
  system: { api: string; database: string }
  date_range_days: number
}

export interface ActivityItem {
  type: string
  message: string
  resource_type: string
  resource_id: string
  timestamp: string | null
}

export interface ChartDataPoint {
  date?: string
  name?: string
  label?: string
  category?: string
  count: number
}

export interface DashboardCharts {
  patient_trend: ChartDataPoint[]
  analysis_trend: ChartDataPoint[]
  category_distribution: ChartDataPoint[]
  top_symptoms: ChartDataPoint[]
  disease_distribution: ChartDataPoint[]
}

// Patients
export interface AdminPatient {
  id: string
  name: string
  email: string
  phone?: string
  status: string
  created_at: string | null
  last_login: string | null
  analysis_count: number
  last_analysis: string | null
}

export interface PatientDetail {
  patient: {
    id: string
    name: string
    email: string
    phone?: string
    status: string
    created_at: string | null
    last_login: string | null
  }
  analyses: AnalysisSummary[]
  total_analyses: number
}

export interface AnalysisSummary {
  id: string
  patient_name: string
  symptom_count: number
  symptoms: { label: string; category: string }[]
  status: string
  result_count: number
  top_disease: string | null
  top_confidence: number | null
  created_at: string | null
}

// Analyses
export interface AdminAnalysis {
  id: string
  patient_name: string
  patient_age: string
  patient_gender: string
  user_name: string | null
  user_email: string | null
  symptom_count: number
  categories: string[]
  status: string
  result_count: number
  top_disease: string | null
  top_confidence: number | null
  processing_time_ms: number | null
  model_version: string | null
  created_at: string | null
}

export interface AnalysisDetail {
  id: string
  patient: {
    name: string
    age: string
    gender: string
    dob?: string
    blood_group?: string
    email?: string
    phone?: string
  }
  symptoms: { key: string; label: string; category: string }[]
  symptom_ids: number[]
  status: string
  processing_time_ms: number | null
  model_version: string | null
  created_at: string | null
  results: {
    rank: number
    disease: string
    confidence: number
    risk_level: string
    remedies: string | null
    warning: string | null
  }[]
}

// Reports
export interface AdminReport {
  id: string
  patient_name: string
  patient_age: string
  patient_gender: string
  result_count: number
  top_disease: string | null
  risk_level: string | null
  status: string
  model_version: string | null
  created_at: string | null
}

// Symptoms
export interface AdminSymptom {
  id: number
  key: string
  label: string
  category: string
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface SymptomCategory {
  id: string
  label: string
  count: number
  active_count: number
}

// AI / Models
export interface AIStats {
  predictions: {
    total: number
    completed: number
    failed: number
    total_results: number
  }
  avg_top_confidence: number | null
  risk_distribution: { level: string; count: number }[]
  volume: ChartDataPoint[]
  current_model: AIModel | null
}

export interface AIModel {
  id: number
  name: string
  version: string
  model_type: string
  status: string
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1_score: number | null
  num_features: number | null
  num_diseases: number | null
  num_train_samples?: number | null
  num_test_samples?: number | null
  train_time_seconds: number | null
  training_date: string | null
  metadata?: Record<string, any>
  created_at: string | null
}

// Feedback
export interface AdminFeedback {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  subject: string | null
  message: string
  rating: number | null
  priority: string
  status: string
  admin_response: string | null
  responded_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface FeedbackStats {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  avg_rating: number | null
}

// Notifications
export interface AdminNotification {
  id: string
  title: string
  message: string
  type: string
  target_type: string
  target_user_id: string | null
  status: string
  created_by_name: string | null
  read_count: number
  created_at: string | null
}

export interface NotificationStats {
  total: number
  total_reads: number
  by_type: Record<string, number>
  by_target: Record<string, number>
  by_status: Record<string, number>
  volume: ChartDataPoint[]
}

// System
export interface ServiceHealth {
  status: 'operational' | 'degraded' | 'unavailable'
  details: string
  checked_at: string
}

export interface SystemHealth {
  overall: string
  services: Record<string, ServiceHealth>
  checked_at: string
}

// Audit
export interface AuditLog {
  id: number
  admin_id: string | null
  admin_email: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: string | null
  ip_address: string | null
  created_at: string | null
}

// Pagination
export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

// Search
export interface SearchResults {
  patients: { id: string; name: string; email: string }[]
  symptoms: { id: number; key: string; label: string; category: string }[]
  analyses: { id: string; patient_name: string; created_at: string | null }[]
  feedback: { id: string; subject: string | null; user_name: string | null }[]
}
