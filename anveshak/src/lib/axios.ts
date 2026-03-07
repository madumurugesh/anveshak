import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { getToken } from './auth'
import {
  mockSummary,
  mockHeatmapData,
  mockAlerts,
  mockSchemePerformance,
  mockDistrictDetails,
  mockDistrictSchemes,
  mockTrendData,
  mockActions,
  mockLiveResponses,
  mockBlocks,
  mockPinCodes,
  mockStates,
  mockHotspots,
  mockSchemeAnalytics,
  mockAnomalies,
  mockIncidents,
  mockEscalations,
  mockAlertRules,
  mockCitizenResponses,
  mockParticipation,
  mockGrievances,
  mockFieldOfficers,
  mockAuditEntries,
  mockTasks,
  mockInvestigations,
  mockSchemeInfos,
  mockBeneficiaries,
  mockDeliveryEvents,
  mockSchemeHealth,
  mockIvrStatus,
  mockPipeline,
  mockIngestionLog,
  mockAnomalyEngine,
  mockNotificationSettings,
  mockDistrictMappings,
  mockBlacklist,
  mockScheduledReports,
  mockExports,
  mockSecurityLogs,
  mockSessions,
} from './mockData'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// ─── Mock Router ─────────────────────────────────────────────
// Maps URL patterns to mock data so the app works without a backend.
function resolveMock(url: string, params?: Record<string, string>): unknown {
  // Dashboard endpoints
  if (url === '/district-summary' && !params?.districtId) return mockSummary
  if (url === '/heatmap-data') return mockHeatmapData
  if (url === '/alerts' && !params?.districtId) return mockAlerts

  // Scheme performance chart (range param ignored—demo data keyed by range)
  if (url === '/scheme-performance') {
    const range = params?.range ?? 'today'
    return mockSchemePerformance[range] ?? mockSchemePerformance['today']
  }

  // District-level endpoints
  if (url === '/district-summary' && params?.districtId) {
    return mockDistrictDetails[params.districtId] ?? mockDistrictDetails['d1']
  }
  if (url === '/district-schemes' && params?.districtId) {
    return mockDistrictSchemes[params.districtId] ?? mockDistrictSchemes['d1']
  }
  if (url === '/district-trend') return mockTrendData
  if (url === '/alerts' && params?.districtId) {
    return mockAlerts.filter((a) => a.districtId === params.districtId)
  }
  if (url === '/action-log' && params?.districtId) {
    return mockActions.filter((a) => a.districtId === params.districtId)
  }

  // POST action-log — just return success
  if (url === '/action-log') return { success: true }

  // Live monitor
  if (url === '/live-responses') return mockLiveResponses

  // Geographic Intelligence
  if (url === '/blocks') return mockBlocks
  if (url === '/pincodes') return mockPinCodes
  if (url === '/states') return mockStates
  if (url === '/hotspots') return mockHotspots

  // Analytics
  if (url === '/scheme-analytics') return mockSchemeAnalytics
  if (url === '/anomalies') return mockAnomalies

  // Alerts & Incidents
  if (url === '/incidents') return mockIncidents
  if (url === '/escalations') return mockEscalations
  if (url === '/alert-rules') return mockAlertRules

  // Citizen Intelligence
  if (url === '/citizen-responses') return mockCitizenResponses
  if (url === '/participation') return mockParticipation
  if (url === '/grievances') return mockGrievances

  // Field Operations
  if (url === '/field-officers') return mockFieldOfficers
  if (url === '/audit-entries') return mockAuditEntries
  if (url === '/tasks') return mockTasks
  if (url === '/investigations') return mockInvestigations

  // Scheme Management
  if (url === '/scheme-info') return mockSchemeInfos
  if (url === '/beneficiaries') return mockBeneficiaries
  if (url === '/delivery-events') return mockDeliveryEvents
  if (url === '/scheme-health') return mockSchemeHealth

  // System Monitoring
  if (url === '/ivr-status') return mockIvrStatus
  if (url === '/pipeline') return mockPipeline
  if (url === '/ingestion-log') return mockIngestionLog
  if (url === '/anomaly-engine') return mockAnomalyEngine

  // Configuration
  if (url === '/notification-settings') return mockNotificationSettings
  if (url === '/district-mappings') return mockDistrictMappings
  if (url === '/blacklist') return mockBlacklist

  // Reports & Exports
  if (url === '/scheduled-reports') return mockScheduledReports
  if (url === '/exports') return mockExports

  // Security
  if (url === '/security-logs') return mockSecurityLogs
  if (url === '/sessions') return mockSessions

  return {}
}

// ─── Axios instance (used in production) ─────────────────────
const ANALYTICS_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001'
const ENGINE_SECRET = process.env.NEXT_PUBLIC_ENGINE_SECRET || ''

const realApi = axios.create({
  baseURL: ANALYTICS_BASE,
  timeout: 15000,
})

realApi.interceptors.request.use(async (config) => {
  // Add engine secret for analytics/anomaly APIs
  config.headers['X-Engine-Secret'] = ENGINE_SECRET
  // Also add Bearer token if available (for Cognito-based auth)
  try {
    const token = await getToken()
    if (token && token !== 'mock-jwt-token') {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Auth token not available — engine secret auth covers it
  }
  return config
})

realApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── URL Mapper: maps internal app URLs to real backend paths ─
// This lets existing components keep their URL conventions while
// routing to the correct backend endpoints.
const URL_MAP: Record<string, string> = {
  '/district-summary': '/api/analytics/dashboard/overview',
  '/heatmap-data': '/api/analytics/dashboard/district-summary',
  '/alerts': '/api/analytics/anomalies',
  '/scheme-performance': '/api/analytics/schemes',
  '/district-trend': '/api/analytics/dashboard/trends',
  '/live-responses': '/api/analytics/responses/daily',
  '/blocks': '/api/analytics/dashboard/district-summary',
  '/pincodes': '/api/analytics/responses/baselines',
  '/states': '/api/analytics/dashboard/district-summary',
  '/hotspots': '/api/analytics/anomalies/heatmap',
  '/scheme-analytics': '/api/analytics/schemes',
  '/anomalies': '/api/analytics/anomalies',
  '/incidents': '/api/analytics/anomalies',
  '/escalations': '/api/analytics/anomalies',
  '/alert-rules': '/api/analytics/anomalies/summary',
  '/citizen-responses': '/api/analytics/responses/daily',
  '/participation': '/api/analytics/beneficiaries/coverage',
  '/grievances': '/api/analytics/responses/rejections',
  '/field-officers': '/api/analytics/officers',
  '/audit-entries': '/api/analytics/reports',
  '/tasks': '/api/analytics/reports',
  '/investigations': '/api/analytics/anomalies',
  '/scheme-info': '/api/analytics/schemes',
  '/beneficiaries': '/api/analytics/beneficiaries/stats',
  '/delivery-events': '/api/analytics/responses/trends',
  '/scheme-health': '/api/analytics/schemes',
  '/ivr-status': '/api/analytics/ai/performance',
  '/pipeline': '/api/analytics/ai/usage',
  '/ingestion-log': '/api/analytics/responses/trends',
  '/anomaly-engine': '/api/analytics/ai/usage',
  '/notification-settings': '/api/analytics/officers',
  '/district-mappings': '/api/analytics/dashboard/district-summary',
  '/blacklist': '/api/analytics/responses/rejections',
  '/scheduled-reports': '/api/analytics/reports',
  '/exports': '/api/analytics/reports',
  '/security-logs': '/api/analytics/reports',
  '/sessions': '/api/analytics/officers',
}

function mapUrl(url: string): string {
  const [path] = url.split('?')
  return URL_MAP[path] || path
}

// ─── Mock-aware wrapper ──────────────────────────────────────
const mockApi = {
  get: async (url: string, config?: AxiosRequestConfig) => {
    // Simulate slight network delay
    await new Promise((r) => setTimeout(r, 400))
    const params = (config?.params ?? {}) as Record<string, string>
    // Also extract query params from URL like /district-summary?districtId=d1
    const [path, query] = url.split('?')
    if (query) {
      const sp = new URLSearchParams(query)
      sp.forEach((v, k) => { params[k] = v })
    }
    return { data: resolveMock(path, params), status: 200, statusText: 'OK', headers: {}, config: {} as AxiosRequestConfig }
  },
  post: async (url: string) => {
    await new Promise((r) => setTimeout(r, 300))
    return { data: resolveMock(url), status: 200, statusText: 'OK', headers: {}, config: {} as AxiosRequestConfig }
  },
}

// ─── Real API wrapper that maps URLs and extracts response data ─
const realApiWrapper = {
  get: async (url: string, config?: AxiosRequestConfig) => {
    const mappedUrl = mapUrl(url)
    const res = await realApi.get(mappedUrl, config)
    // Backend wraps data in { success, data, ... } — unwrap if needed
    const body = res.data
    if (body && typeof body === 'object' && 'success' in body && body.success && 'data' in body) {
      return { ...res, data: body.data }
    }
    return res
  },
  post: async (url: string, data?: unknown, config?: AxiosRequestConfig) => {
    const mappedUrl = mapUrl(url)
    const res = await realApi.post(mappedUrl, data, config)
    const body = res.data
    if (body && typeof body === 'object' && 'success' in body && body.success && 'data' in body) {
      return { ...res, data: body.data }
    }
    return res
  },
}

const api = IS_MOCK ? mockApi : realApiWrapper

export default api
