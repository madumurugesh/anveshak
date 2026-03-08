// ─── Common ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  window?: string
  count?: number
  pagination?: Pagination
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface ApiError {
  success: false
  error: string
  details?: string[]
}

// ─── Analytics: Dashboard ────────────────────────────────────
export interface AnalyticsDashboardOverview {
  responses: {
    total_responses: string
    total_yes: string
    total_no: string
    districts_reporting: string
    pincodes_reporting: string
    avg_no_pct: string
    avg_response_rate: string
  }
  anomalies: {
    total_anomalies: string
    critical: string
    high: string
    medium: string
    low: string
    resolved: string
    open: string
    ai_classified: string
    avg_ai_confidence: string
  }
  beneficiaries: {
    total_beneficiaries: string
    active_beneficiaries: string
    schemes_count: string
    districts_count: string
  }
  alerts: {
    total_actions: string
    field_visits: string
    resolved_actions: string
    escalations: string
  }
}

export interface AnalyticsTrendPoint {
  date: string
  total_responses: string
  yes_count: string
  no_count: string
  avg_no_pct: string
}

export interface AnalyticsAnomalyTrendPoint {
  date: string
  total_anomalies: string
  critical: string
  high: string
  medium: string
  low: string
}

export interface AnalyticsTrends {
  response_trend: AnalyticsTrendPoint[]
  anomaly_trend: AnalyticsAnomalyTrendPoint[]
}

export interface AnalyticsDistrictSummary {
  district: string
  total_responses: string
  yes_count: string
  no_count: string
  avg_no_pct: string
  avg_response_rate: string
  pincodes: string
  anomaly_count: string
  critical_count: string
}

// ─── Analytics: Anomalies ────────────────────────────────────
export type ApiSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ApiAnomalyStatus = 'NEW' | 'ASSIGNED' | 'INVESTIGATING' | 'FIELD_VISIT' | 'RESOLVED' | 'ESCALATED'
export type ApiClassification = 'SUPPLY_FAILURE' | 'DEMAND_COLLAPSE' | 'FRAUD_PATTERN' | 'DATA_ARTIFACT' | 'PENDING'
export type ApiDetectorType = 'NO_SPIKE' | 'SILENCE' | 'DUPLICATE_BENEFICIARY' | 'DISTRICT_ROLLUP'
export type ApiLevel = 'PINCODE' | 'BLOCK' | 'DISTRICT'
export type ApiSchemeId = 'PDS' | 'PM_KISAN' | 'OLD_AGE_PENSION' | 'LPG'
export type ApiUrgency = 'TODAY' | 'THIS_WEEK' | 'MONITOR'

export interface AnalyticsAnomalyRecord {
  id: string
  date: string
  detector_type: ApiDetectorType
  level: ApiLevel
  pincode: string | null
  block: string | null
  district: string
  state: string
  scheme_id: ApiSchemeId
  severity: ApiSeverity
  score: string
  no_pct: string | null
  baseline_no_pct: string | null
  total_responses: number
  affected_beneficiaries: number
  ai_classification: ApiClassification | null
  ai_confidence: string | null
  ai_reasoning: string | null
  ai_action: string | null
  ai_action_ta: string | null
  ai_urgency: ApiUrgency | null
  ai_processed_at: string | null
  status: ApiAnomalyStatus
  assigned_officer_id: string | null
  assigned_officer_name: string | null
  assigned_officer_role: string | null
  assigned_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface AnalyticsAnomalyDetail extends AnalyticsAnomalyRecord {
  raw_data: Record<string, unknown>
  assigned_officer_email: string | null
  actions: AnalyticsAlertAction[]
  ai_prompts: AnalyticsAiPromptSummary[]
}

export interface AnalyticsAlertAction {
  id: string
  action_type: string
  notes: string | null
  resolution_details: string | null
  field_visit_location: string | null
  photos_s3_keys: string[] | null
  officer_name: string
  officer_role: string
  created_at: string
}

export interface AnalyticsAiPromptSummary {
  id: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: string
  latency_ms: number
  success: boolean
  called_at: string
}

export interface AnalyticsAnomalySummary {
  by_severity: { severity: string; count: string }[]
  by_classification: { classification: string; count: string }[]
  by_status: { status: string; count: string }[]
  by_detector: { detector_type: string; count: string }[]
}

export interface AnalyticsHeatmapCell {
  district: string
  scheme_id: ApiSchemeId
  anomaly_count: string
  critical: string
  high: string
  avg_score: string
  avg_no_pct: string
}

// ─── Analytics: Officers ─────────────────────────────────────
export interface AnalyticsOfficer {
  id: string
  name: string
  email: string
  role: string
  district: string | null
  block: string | null
  state: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  total_actions: string
  field_visits: string
  resolved_count: string
  escalated_count: string
  assigned_anomalies: string
  open_anomalies: string
}

// ─── Analytics: Beneficiaries ────────────────────────────────
export interface AnalyticsBeneficiaryStat {
  [groupKey: string]: string
  total: string
  active: string
  inactive: string
  avg_age: string
  male: string
  female: string
  other_gender: string
}

export interface AnalyticsBeneficiaryDistribution {
  by_age: { age_range: string; count: string }[]
  by_gender: { gender: string; count: string }[]
  by_scheme: { scheme_id: ApiSchemeId; count: string }[]
  by_language: { language: string; count: string }[]
}

// ─── Analytics: Schemes ──────────────────────────────────────
export interface AnalyticsSchemeOverview {
  scheme_id: ApiSchemeId
  scheme_name_en: string
  scheme_name_ta: string
  is_active: boolean
  distribution_day_start: number | null
  distribution_day_end: number | null
  min_expected_response_rate: string | null
  total_responses: string
  total_yes: string
  total_no: string
  avg_no_pct: string
  avg_response_rate: string
  reporting_districts: string
  reporting_pincodes: string
  anomaly_count: string
  critical_anomalies: string
  resolved_anomalies: string
  total_beneficiaries: string
  active_beneficiaries: string
}

// ─── Analytics: Responses ────────────────────────────────────
export interface AnalyticsResponseTrend {
  date: string
  total_responses: string
  yes_count: string
  no_count: string
  avg_no_pct: string
  avg_response_rate: string
  pincodes_reporting: string
  districts_reporting: string
}

export interface AnalyticsRejectionData {
  total_rejections: number
  by_reason: { rejection_reason: string; scheme_id: string; count: string }[]
  daily_trend: { date: string; rejections: string; duplicates: string; unregistered: string; invalid_input: string }[]
}

// ─── Analytics: AI Usage ─────────────────────────────────────
export interface AnalyticsAiUsageSummary {
  total_calls: string
  successful_calls: string
  failed_calls: string
  total_tokens: string
  total_cost_usd: string
  avg_cost_per_call: string
  avg_latency_ms: string
  p50_latency_ms: string
  p95_latency_ms: string
  p99_latency_ms: string
}

// ─── Analytics: Reports ──────────────────────────────────────
export interface AnalyticsReport {
  id: string
  district: string
  report_date: string
  total_responses: number | null
  total_anomalies: number | null
  critical_count: number | null
  high_count: number | null
  medium_count: number | null
  schemes_summary: Record<string, unknown> | null
  best_performing_block: string | null
  worst_performing_pincode: string | null
  pdf_s3_key: string | null
  email_sent: boolean
  email_sent_at: string | null
  generated_at: string
}

// ─── Anomaly Detection Engine ────────────────────────────────
export interface AnomalyInput {
  id: string
  date: string
  detector_type: ApiDetectorType
  level: ApiLevel
  pincode: string | null
  block: string | null
  district: string
  state?: string | null
  scheme_id: ApiSchemeId
  severity: ApiSeverity
  score: number
  no_pct: number | null
  baseline_no_pct: number | null
  total_responses: number
  affected_beneficiaries: number
  raw_data: Record<string, unknown>
}

export interface AIResult {
  ai_classification: ApiClassification
  ai_confidence: number
  ai_reasoning: string
  ai_action: string
  ai_action_ta: string
  ai_urgency: ApiUrgency
  signals_used: string[]
  confidence_adjustments: { factor: string; delta: number }[]
}

export interface ClassifyMeta {
  model: string
  total_tokens: number
  latency_ms: number
  cost_usd: number
}

export interface ClassifyResponse {
  success: true
  anomaly_id: string
  result: AIResult
  meta: ClassifyMeta
}

export interface BatchSummary {
  total: number
  succeeded: number
  failed: number
}

export interface BatchResponse {
  success: true
  summary: BatchSummary
  results: (ClassifyResponse | { success: false; anomaly_id: string; error: string })[]
}

export interface AnomalyResultData {
  id: string
  date: string
  detector_type: ApiDetectorType
  scheme_id: ApiSchemeId
  severity: ApiSeverity
  ai_classification: ApiClassification | null
  ai_confidence: string
  ai_reasoning: string | null
  ai_action: string | null
  ai_action_ta: string | null
  ai_urgency: ApiUrgency | null
  ai_processed_at: string | null
  status: ApiAnomalyStatus
}

export interface AnomalyStats {
  success: true
  window: string
  anomalies: {
    total_anomalies: string
    classified: string
    pending: string
    supply_failure: string
    demand_collapse: string
    fraud_pattern: string
    data_artifact: string
    avg_confidence: string | null
  }
  openai_usage: {
    total_cost_usd: string
    total_tokens: string
    total_calls: string
    successful_calls: string
    avg_latency_ms: string | null
  }
}

export interface HealthResponse {
  status: 'healthy' | 'degraded'
  timestamp: string
  services: {
    database: 'ok' | 'error'
    openai?: 'configured' | 'missing'
  }
}
