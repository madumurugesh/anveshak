/**
 * Adapters transform backend API responses into the existing frontend types
 * so components don't need to change their data consumption patterns.
 */
import type {
  AnalyticsDashboardOverview,
  AnalyticsDistrictSummary,
  AnalyticsAnomalyRecord,
  AnalyticsSchemeOverview,
  AnalyticsOfficer,
  AnalyticsHeatmapCell,
} from '@/types/api'
import type {
  DashboardSummary,
  DistrictMetric,
  Alert,
  Anomaly,
  Severity,
  Scheme,
  SchemeAnalytic,
  FieldOfficer,
} from '@/types'

// ─── Scheme ID mapping ──────────────────────────────────────
const SCHEME_MAP: Record<string, Scheme> = {
  PDS: 'ration',
  PM_KISAN: 'farmer',
  OLD_AGE_PENSION: 'pension',
  LPG: 'lpg',
}

function mapSchemeId(schemeId: string): Scheme {
  return SCHEME_MAP[schemeId] || 'ration'
}

// ─── Severity mapping (backend uses CRITICAL too, frontend only HIGH/MEDIUM/LOW) ─
function mapSeverity(sev: string): Severity {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'HIGH'
  if (sev === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

// ─── Dashboard Overview → DashboardSummary ──────────────────
export function adaptDashboardOverview(
  overview: AnalyticsDashboardOverview,
  districtSummaries: AnalyticsDistrictSummary[],
  schemes: AnalyticsSchemeOverview[]
): DashboardSummary {
  // Find worst scheme (highest avg_no_pct)
  let worstScheme: Scheme = 'ration'
  if (schemes.length > 0) {
    const worst = schemes.reduce((a, b) =>
      parseFloat(a.avg_no_pct || '0') > parseFloat(b.avg_no_pct || '0') ? a : b
    )
    worstScheme = mapSchemeId(worst.scheme_id)
  }

  // Find worst district (highest avg_no_pct)
  let worstDistrict = 'N/A'
  if (districtSummaries.length > 0) {
    const worst = districtSummaries.reduce((a, b) =>
      parseFloat(a.avg_no_pct || '0') > parseFloat(b.avg_no_pct || '0') ? a : b
    )
    worstDistrict = worst.district
  }

  return {
    totalResponsesToday: parseInt(overview.responses.total_responses) || 0,
    activeAlerts: parseInt(overview.anomalies.total_anomalies) || 0,
    worstScheme,
    worstDistrict,
    changeFromYesterday: {
      responses: 0, // Backend doesn't provide day-over-day delta directly
      alerts: 0,
    },
  }
}

// ─── District Summary → DistrictMetric[] ────────────────────
// Approximate lat/lng for known Tamil Nadu districts
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Villupuram: { lat: 11.94, lng: 79.49 },
  Chengalpattu: { lat: 12.69, lng: 79.98 },
  Chennai: { lat: 13.08, lng: 80.27 },
  Coimbatore: { lat: 11.01, lng: 76.96 },
  Madurai: { lat: 9.92, lng: 78.12 },
  Salem: { lat: 11.65, lng: 78.16 },
  Tiruchirappalli: { lat: 10.79, lng: 78.69 },
  Erode: { lat: 11.34, lng: 77.73 },
  Tirunelveli: { lat: 8.73, lng: 77.70 },
  Vellore: { lat: 12.92, lng: 79.13 },
  Thanjavur: { lat: 10.79, lng: 79.14 },
  Kanyakumari: { lat: 8.08, lng: 77.55 },
}

export function adaptDistrictSummaries(
  summaries: AnalyticsDistrictSummary[]
): DistrictMetric[] {
  return summaries.map((d, i) => {
    const yesCount = parseInt(d.yes_count) || 0
    const noCount = parseInt(d.no_count) || 0
    const coords = DISTRICT_COORDS[d.district] || {
      lat: 11.0 + i * 0.5,
      lng: 78.0 + i * 0.3,
    }

    return {
      districtId: d.district.toLowerCase().replace(/\s+/g, '-'),
      districtName: d.district,
      scheme: 'ration' as Scheme, // Aggregated across schemes
      yesCount,
      noCount,
      failureRate: parseFloat(d.avg_no_pct) || 0,
      responseVolume: parseInt(d.total_responses) || 0,
      lat: coords.lat,
      lng: coords.lng,
    }
  })
}

// ─── Analytics Anomaly → Frontend Alert ─────────────────────
export function adaptAnomalyToAlert(a: AnalyticsAnomalyRecord): Alert {
  return {
    alertId: a.id,
    districtId: a.district.toLowerCase().replace(/\s+/g, '-'),
    districtName: a.district,
    scheme: mapSchemeId(a.scheme_id),
    failureRate: parseFloat(a.no_pct || '0'),
    severity: mapSeverity(a.severity),
    status: a.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
    createdAt: a.created_at,
    resolvedAt: a.resolved_at ?? undefined,
  }
}

export function adaptAnomalies(records: AnalyticsAnomalyRecord[]): Alert[] {
  return records.map(adaptAnomalyToAlert)
}

// ─── Analytics Anomaly → Frontend Anomaly type ──────────────
export function adaptToFrontendAnomaly(a: AnalyticsAnomalyRecord): Anomaly {
  // Map detector_type to display type
  const typeMap: Record<string, 'SPIKE' | 'DROP' | 'PATTERN'> = {
    NO_SPIKE: 'SPIKE',
    SILENCE: 'DROP',
    DUPLICATE_BENEFICIARY: 'PATTERN',
    DISTRICT_ROLLUP: 'PATTERN',
  }

  // Map status
  const statusMap: Record<string, 'OPEN' | 'INVESTIGATING' | 'RESOLVED'> = {
    NEW: 'OPEN',
    ASSIGNED: 'OPEN',
    INVESTIGATING: 'INVESTIGATING',
    FIELD_VISIT: 'INVESTIGATING',
    RESOLVED: 'RESOLVED',
    ESCALATED: 'OPEN',
  }

  return {
    anomalyId: a.id,
    districtId: a.district.toLowerCase().replace(/\s+/g, '-'),
    districtName: a.district,
    scheme: mapSchemeId(a.scheme_id),
    detectedAt: a.created_at,
    resolvedAt: a.resolved_at ?? undefined,
    type: typeMap[a.detector_type] || 'SPIKE',
    description: a.ai_reasoning || `${a.detector_type} detected in ${a.district} for ${a.scheme_id}`,
    severity: mapSeverity(a.severity),
    status: statusMap[a.status] || 'OPEN',
    confidence: parseFloat(a.ai_confidence || '0'),
  }
}

export function adaptAnomalyRecords(records: AnalyticsAnomalyRecord[]): Anomaly[] {
  return records.map(adaptToFrontendAnomaly)
}

// ─── Heatmap cells → DistrictMetric[] ───────────────────────
export function adaptHeatmapCells(cells: AnalyticsHeatmapCell[]): DistrictMetric[] {
  return cells.map((c, i) => {
    const coords = DISTRICT_COORDS[c.district] || {
      lat: 11.0 + i * 0.5,
      lng: 78.0 + i * 0.3,
    }

    return {
      districtId: c.district.toLowerCase().replace(/\s+/g, '-'),
      districtName: c.district,
      scheme: mapSchemeId(c.scheme_id),
      yesCount: 0,
      noCount: parseInt(c.anomaly_count) || 0,
      failureRate: parseFloat(c.avg_no_pct) || 0,
      responseVolume: parseInt(c.anomaly_count) || 0,
      lat: coords.lat,
      lng: coords.lng,
    }
  })
}

// ─── Scheme Overview → SchemeAnalytic[] ─────────────────────
export function adaptSchemeOverviews(schemes: AnalyticsSchemeOverview[]): SchemeAnalytic[] {
  return schemes.map((s) => ({
    scheme: mapSchemeId(s.scheme_id),
    totalBeneficiaries: parseInt(s.total_beneficiaries) || 0,
    totalResponses: parseInt(s.total_responses) || 0,
    yesCount: parseInt(s.total_responses) - Math.round(parseInt(s.total_responses) * parseFloat(s.avg_no_pct || '0')),
    noCount: Math.round(parseInt(s.total_responses) * parseFloat(s.avg_no_pct || '0')),
    failureRate: parseFloat(s.avg_no_pct) || 0,
    trend: 0,
    worstDistrict: 'N/A',
    bestDistrict: 'N/A',
  }))
}

// ─── Scheme Overview → SchemeChart data ─────────────────────
export function adaptSchemesToChartData(
  schemes: AnalyticsSchemeOverview[]
): { scheme: string; yesCount: number; noCount: number; failureRate: number }[] {
  return schemes.map((s) => {
    const total = parseInt(s.total_responses) || 0
    const noPct = parseFloat(s.avg_no_pct) || 0
    const noCount = Math.round(total * noPct)
    const yesCount = total - noCount

    return {
      scheme: mapSchemeId(s.scheme_id),
      yesCount,
      noCount,
      failureRate: noPct,
    }
  })
}

// ─── Officers ───────────────────────────────────────────────
export function adaptOfficers(officers: AnalyticsOfficer[]): FieldOfficer[] {
  return officers.map((o) => ({
    officerId: o.id,
    name: o.name,
    districtId: (o.district || '').toLowerCase().replace(/\s+/g, '-'),
    districtName: o.district || 'Unassigned',
    phone: o.email, // API gives email, not phone
    status: 'AVAILABLE' as const,
    lastActive: '',
  }))
}
