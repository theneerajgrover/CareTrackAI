export type Page =
  | 'home'
  | 'how-it-works'
  | 'health-analysis'
  | 'about'
  | 'contact'
  | 'history'
  | 'auth'
  | 'guest-check'
  | 'patient-details'
  | 'symptom-categories'
  | 'symptom-subcategory'
  | 'review'
  | 'analyzing'
  | 'report'
  | 'patient-dashboard'
  | 'patient-analyses'
  | 'patient-reports'
  | 'patient-symptoms'
  | 'patient-recommendations'
  | 'patient-notifications'
  | 'patient-profile'
  | 'patient-feedback'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-patients'
  | 'admin-patient-detail'
  | 'admin-analyses'
  | 'admin-reports'
  | 'admin-symptoms'
  | 'admin-ai-monitoring'
  | 'admin-models'
  | 'admin-feedback'
  | 'admin-notifications'
  | 'admin-system'
  | 'admin-audit'

export type PatientPage =
  | 'patient-dashboard'
  | 'patient-analyses'
  | 'patient-reports'
  | 'patient-symptoms'
  | 'patient-recommendations'
  | 'patient-notifications'
  | 'patient-profile'
  | 'patient-feedback'

export interface UserStats {
  total_analyses: number
  total_reports: number
  critical_alerts: number
  latest_analysis: {
    id: string
    patient_name: string
    created_at: string | null
    disease: string
    confidence: number | null
    risk_level: string
    remedies?: string
    warning?: string
    symptom_count: number
  } | null
}

export interface PatientNotification {
  id: string
  title: string
  message: string
  type: string
  created_at: string | null
}

export interface PatientFeedback {
  id: string
  subject: string
  message: string
  rating?: number
  priority: string
  status: string
  admin_response?: string
  responded_at?: string | null
  created_at: string | null
}

export interface PatientDetails {
  name: string
  age: string
  gender: string
  dob: string
  bloodGroup: string
  height: string
  weight: string
}

export interface SelectedSymptom {
  key: string
  label: string
  category: string
  categoryLabel: string
}

export interface DiseaseFinding {
  rank: number
  disease: string
  disease_id?: number
  confidence: number
  risk_level: 'low' | 'moderate' | 'high' | 'critical'
  doctor?: string
  remedies?: string
  warning?: string
}

export interface PredictionResponse {
  prediction_id: string
  predictions: DiseaseFinding[]
  symptom_ids: number[]
  symptoms_matched: string[]
  symptoms_unmatched: string[]
  model_info?: {
    name?: string
    accuracy?: number
    f1_score?: number
  }
  timestamp: string
}

export interface HistoryItem {
  id: string
  patient_name: string
  symptom_ids: number[]
  created_at: string
  top_disease: string | null
  top_confidence: number | null
  num_findings: number
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
}

export interface AppState {
  page: Page
  authMode: 'login' | 'register'
  patientDetails: PatientDetails
  selectedSymptoms: Record<string, SelectedSymptom>
  currentCategory: string | null
  isAuthenticated: boolean
  user: User | null
  currentPrediction: PredictionResponse | null
}
