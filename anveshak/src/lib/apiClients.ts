import type {
  ApiResponse,
  AnalyticsDashboardOverview,
  AnalyticsTrends,
  AnalyticsDistrictSummary,
  AnalyticsAnomalyRecord,
  AnalyticsAnomalyDetail,
  AnalyticsAnomalySummary,
  AnalyticsHeatmapCell,
  AnalyticsOfficer,
  AnalyticsBeneficiaryStat,
  AnalyticsBeneficiaryDistribution,
  AnalyticsSchemeOverview,
  AnalyticsResponseTrend,
  AnalyticsRejectionData,
  AnalyticsAiUsageSummary,
  AnalyticsReport,
  AnomalyInput,
  ClassifyResponse,
  BatchResponse,
  AnomalyResultData,
  AnomalyStats,
  HealthResponse,
  ApiError,
  DemoRunWeekResponse,
} from '@/types/api'

// ─── Configuration ───────────────────────────────────────────
const ANALYTICS_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001'
const ANOMALY_BASE = process.env.NEXT_PUBLIC_ANOMALY_API_URL || 'http://localhost:3002'
const ENGINE_SECRET = process.env.NEXT_PUBLIC_ENGINE_SECRET || ''

// ─── Generic fetch helpers ───────────────────────────────────
async function apiGet<T>(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${baseUrl}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Engine-Secret': ENGINE_SECRET,
    },
  })

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      success: false as const,
      error: res.statusText,
    }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

async function apiPost<T>(
  baseUrl: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${baseUrl}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Engine-Secret': ENGINE_SECRET,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      success: false as const,
      error: res.statusText,
    }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ─── Type helpers for common query params ────────────────────
interface DateRangeParams {
  days?: number
  start_date?: string
  end_date?: string
}

interface PaginationParams {
  page?: number
  limit?: number
}

interface FilterParams {
  district?: string
  block?: string
  state?: string
  scheme_id?: string
  severity?: string
  status?: string
  ai_classification?: string
  detector_type?: string
  level?: string
}

type QueryParams = DateRangeParams & PaginationParams & FilterParams

function toRecord(params?: QueryParams): Record<string, string | number> | undefined {
  if (!params) return undefined
  const record: Record<string, string | number> = {}
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) record[k] = v
  })
  return Object.keys(record).length > 0 ? record : undefined
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ENGINE (port 3001)
// ═══════════════════════════════════════════════════════════════

export const analytics = {
  // ─── Health ────────────────────────────────────────────────
  health: () =>
    fetch(`${ANALYTICS_BASE}/health`).then((r) => r.json()) as Promise<HealthResponse>,

  // ─── Dashboard ─────────────────────────────────────────────
  dashboard: {
    overview: (params?: DateRangeParams) =>
      apiGet<ApiResponse<AnalyticsDashboardOverview>>(
        ANALYTICS_BASE,
        '/api/analytics/dashboard/overview',
        toRecord(params)
      ),

    trends: (params?: DateRangeParams & { scheme_id?: string; district?: string }) =>
      apiGet<ApiResponse<AnalyticsTrends>>(
        ANALYTICS_BASE,
        '/api/analytics/dashboard/trends',
        toRecord(params)
      ),

    districtSummary: (params?: DateRangeParams & { scheme_id?: string }) =>
      apiGet<ApiResponse<AnalyticsDistrictSummary[]> & { count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/dashboard/district-summary',
        toRecord(params)
      ),
  },

  // ─── Anomalies ─────────────────────────────────────────────
  anomalies: {
    list: (params?: QueryParams) =>
      apiGet<ApiResponse<AnalyticsAnomalyRecord[]>>(
        ANALYTICS_BASE,
        '/api/analytics/anomalies',
        toRecord(params)
      ),

    detail: (id: string) =>
      apiGet<ApiResponse<AnalyticsAnomalyDetail>>(
        ANALYTICS_BASE,
        `/api/analytics/anomalies/${encodeURIComponent(id)}`
      ),

    summary: (params?: DateRangeParams & { district?: string; scheme_id?: string }) =>
      apiGet<ApiResponse<AnalyticsAnomalySummary>>(
        ANALYTICS_BASE,
        '/api/analytics/anomalies/summary',
        toRecord(params)
      ),

    heatmap: (params?: DateRangeParams) =>
      apiGet<ApiResponse<AnalyticsHeatmapCell[]> & { count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/anomalies/heatmap',
        toRecord(params)
      ),
  },

  // ─── Reports ───────────────────────────────────────────────
  reports: {
    list: (params?: QueryParams) =>
      apiGet<ApiResponse<AnalyticsReport[]>>(
        ANALYTICS_BASE,
        '/api/analytics/reports',
        toRecord(params)
      ),

    detail: (id: string) =>
      apiGet<ApiResponse<AnalyticsReport>>(
        ANALYTICS_BASE,
        `/api/analytics/reports/${encodeURIComponent(id)}`
      ),

    pdf: (id: string) =>
      apiGet<ApiResponse<{ report_id: string; download_url: string; district: string; report_date: string; expires_in: number }>>(
        ANALYTICS_BASE,
        `/api/analytics/reports/${encodeURIComponent(id)}/pdf`
      ),

    byDistrict: (district: string, params?: DateRangeParams & PaginationParams) =>
      apiGet<ApiResponse<AnalyticsReport[]>>(
        ANALYTICS_BASE,
        `/api/analytics/reports/district/${encodeURIComponent(district)}`,
        toRecord(params)
      ),
  },

  // ─── Officers ──────────────────────────────────────────────
  officers: {
    list: (params?: { district?: string; state?: string }) =>
      apiGet<ApiResponse<AnalyticsOfficer[]> & { count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/officers',
        toRecord(params)
      ),

    detail: (id: string) =>
      apiGet<ApiResponse<AnalyticsOfficer>>(
        ANALYTICS_BASE,
        `/api/analytics/officers/${encodeURIComponent(id)}`
      ),

    actions: (id: string, params?: DateRangeParams & PaginationParams) =>
      apiGet<ApiResponse<AnalyticsAlertAction[]>>(
        ANALYTICS_BASE,
        `/api/analytics/officers/${encodeURIComponent(id)}/actions`,
        toRecord(params)
      ),
  },

  // ─── Beneficiaries ─────────────────────────────────────────
  beneficiaries: {
    stats: (params?: { group_by?: string; district?: string; scheme_id?: string; state?: string }) =>
      apiGet<ApiResponse<AnalyticsBeneficiaryStat[]> & { group_by: string; count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/beneficiaries/stats',
        toRecord(params)
      ),

    distribution: (params?: { district?: string; scheme_id?: string }) =>
      apiGet<ApiResponse<AnalyticsBeneficiaryDistribution>>(
        ANALYTICS_BASE,
        '/api/analytics/beneficiaries/distribution',
        toRecord(params)
      ),

    coverage: (params?: DateRangeParams & { district?: string; scheme_id?: string }) =>
      apiGet<ApiResponse<unknown>>(
        ANALYTICS_BASE,
        '/api/analytics/beneficiaries/coverage',
        toRecord(params)
      ),
  },

  // ─── Schemes ───────────────────────────────────────────────
  schemes: {
    list: (params?: DateRangeParams) =>
      apiGet<ApiResponse<AnalyticsSchemeOverview[]> & { count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/schemes',
        toRecord(params)
      ),

    detail: (schemeId: string, params?: DateRangeParams) =>
      apiGet<ApiResponse<unknown>>(
        ANALYTICS_BASE,
        `/api/analytics/schemes/${encodeURIComponent(schemeId)}`,
        toRecord(params)
      ),
  },

  // ─── Responses ─────────────────────────────────────────────
  responses: {
    daily: (params?: QueryParams) =>
      apiGet<ApiResponse<unknown[]>>(
        ANALYTICS_BASE,
        '/api/analytics/responses/daily',
        toRecord(params)
      ),

    trends: (params?: DateRangeParams & { district?: string; scheme_id?: string }) =>
      apiGet<ApiResponse<AnalyticsResponseTrend[]> & { count: number }>(
        ANALYTICS_BASE,
        '/api/analytics/responses/trends',
        toRecord(params)
      ),

    rejections: (params?: DateRangeParams & { scheme_id?: string }) =>
      apiGet<ApiResponse<AnalyticsRejectionData>>(
        ANALYTICS_BASE,
        '/api/analytics/responses/rejections',
        toRecord(params)
      ),

    baselines: (params?: { district?: string; scheme_id?: string }) =>
      apiGet<ApiResponse<unknown>>(
        ANALYTICS_BASE,
        '/api/analytics/responses/baselines',
        toRecord(params)
      ),
  },

  // ─── AI Usage ──────────────────────────────────────────────
  ai: {
    usage: (params?: DateRangeParams) =>
      apiGet<ApiResponse<{ summary: AnalyticsAiUsageSummary }>>(
        ANALYTICS_BASE,
        '/api/analytics/ai/usage',
        toRecord(params)
      ),

    performance: (params?: DateRangeParams) =>
      apiGet<ApiResponse<unknown>>(
        ANALYTICS_BASE,
        '/api/analytics/ai/performance',
        toRecord(params)
      ),

    classificationAccuracy: (params?: DateRangeParams & { scheme_id?: string }) =>
      apiGet<ApiResponse<unknown>>(
        ANALYTICS_BASE,
        '/api/analytics/ai/classification-accuracy',
        toRecord(params)
      ),
  },
}

// Import AnalyticsAlertAction for officer actions
import type { AnalyticsAlertAction } from '@/types/api'

// ═══════════════════════════════════════════════════════════════
// AI ANOMALY DETECTION ENGINE (port 3000)
// ═══════════════════════════════════════════════════════════════

export const anomalyEngine = {
  health: () =>
    fetch(`${ANOMALY_BASE}/health`).then((r) => r.json()) as Promise<HealthResponse>,

  classify: (anomaly: AnomalyInput) =>
    apiPost<ClassifyResponse>(ANOMALY_BASE, '/api/anomaly/classify', anomaly),

  classifyBatch: (anomalies: AnomalyInput[]) =>
    apiPost<BatchResponse>(ANOMALY_BASE, '/api/anomaly/classify/batch', { anomalies }),

  classifyPending: (limit = 5) =>
    apiPost<BatchResponse>(ANOMALY_BASE, '/api/anomaly/classify/pending', undefined, { limit }),

  getResult: (id: string) =>
    apiGet<ApiResponse<AnomalyResultData>>(
      ANOMALY_BASE,
      `/api/anomaly/${encodeURIComponent(id)}/result`
    ),

  stats: () => apiGet<AnomalyStats>(ANOMALY_BASE, '/api/anomaly/stats'),

  demo: {
    runWeek: (body: {
      days: { date: string; yes_count: number; no_count: number; active_beneficiaries: number }[]
      district: string
      scheme_id: string
      pincode?: string
      block?: string
      state?: string
    }) => apiPost<DemoRunWeekResponse>(ANOMALY_BASE, '/api/demo/run-week', body),
  },
}
