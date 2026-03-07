import type {
  DashboardSummary,
  DistrictMetric,
  Alert,
  OfficerAction,
  Scheme,
  LiveResponse,
  Block,
  PinCodeMetric,
  StateMetric,
  Hotspot,
  SchemeAnalytic,
  Anomaly,
  Incident,
  Escalation,
  AlertRule,
  CitizenResponse,
  ParticipationMetric,
  Grievance,
  FieldOfficer,
  AuditEntry,
  Task,
  Investigation,
  SchemeInfo,
  Beneficiary,
  DeliveryEvent,
  SchemeHealth,
  IvrStatus,
  PipelineService,
  IngestionLog,
  AnomalyEngineStatus,
  NotificationSetting,
  DistrictMapping,
  BlacklistEntry,
  ScheduledReport,
  ExportRecord,
  SecurityAuditLog,
  OfficerSession,
} from '@/types'

// ─── Dashboard Summary ───────────────────────────────────────
export const mockSummary: DashboardSummary = {
  totalResponsesToday: 14832,
  activeAlerts: 23,
  worstScheme: 'ration',
  worstDistrict: 'Bastar',
  changeFromYesterday: {
    responses: 12,
    alerts: -8,
  },
}

// ─── Heatmap District Metrics ────────────────────────────────
export const mockHeatmapData: DistrictMetric[] = [
  { districtId: 'd1', districtName: 'Bastar', scheme: 'ration', yesCount: 320, noCount: 180, failureRate: 0.36, responseVolume: 500, lat: 19.1, lng: 81.95 },
  { districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', yesCount: 890, noCount: 110, failureRate: 0.11, responseVolume: 1000, lat: 26.92, lng: 75.78 },
  { districtId: 'd3', districtName: 'Varanasi', scheme: 'scholarship', yesCount: 450, noCount: 50, failureRate: 0.1, responseVolume: 500, lat: 25.32, lng: 82.99 },
  { districtId: 'd4', districtName: 'Patna', scheme: 'lpg', yesCount: 600, noCount: 400, failureRate: 0.4, responseVolume: 1000, lat: 25.6, lng: 85.1 },
  { districtId: 'd5', districtName: 'Lucknow', scheme: 'farmer', yesCount: 750, noCount: 250, failureRate: 0.25, responseVolume: 1000, lat: 26.85, lng: 80.95 },
  { districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', yesCount: 410, noCount: 590, failureRate: 0.59, responseVolume: 1000, lat: 23.26, lng: 77.41 },
  { districtId: 'd7', districtName: 'Raipur', scheme: 'pension', yesCount: 520, noCount: 180, failureRate: 0.26, responseVolume: 700, lat: 21.25, lng: 81.63 },
  { districtId: 'd8', districtName: 'Ranchi', scheme: 'scholarship', yesCount: 300, noCount: 200, failureRate: 0.4, responseVolume: 500, lat: 23.34, lng: 85.31 },
  { districtId: 'd9', districtName: 'Dehradun', scheme: 'lpg', yesCount: 680, noCount: 120, failureRate: 0.15, responseVolume: 800, lat: 30.32, lng: 78.03 },
  { districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', yesCount: 200, noCount: 300, failureRate: 0.6, responseVolume: 500, lat: 26.14, lng: 91.74 },
  { districtId: 'd11', districtName: 'Thiruvananthapuram', scheme: 'ration', yesCount: 900, noCount: 100, failureRate: 0.1, responseVolume: 1000, lat: 8.52, lng: 76.94 },
  { districtId: 'd12', districtName: 'Chennai', scheme: 'pension', yesCount: 780, noCount: 220, failureRate: 0.22, responseVolume: 1000, lat: 13.08, lng: 80.27 },
]

// ─── Alerts ──────────────────────────────────────────────────
const now = Date.now()
export const mockAlerts: Alert[] = [
  { alertId: 'a1', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', failureRate: 0.59, severity: 'HIGH', status: 'OPEN', createdAt: new Date(now - 30 * 60000).toISOString() },
  { alertId: 'a2', districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', failureRate: 0.6, severity: 'HIGH', status: 'OPEN', createdAt: new Date(now - 45 * 60000).toISOString() },
  { alertId: 'a3', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', failureRate: 0.4, severity: 'HIGH', status: 'OPEN', createdAt: new Date(now - 2 * 3600000).toISOString() },
  { alertId: 'a4', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', failureRate: 0.36, severity: 'MEDIUM', status: 'OPEN', createdAt: new Date(now - 1 * 3600000).toISOString() },
  { alertId: 'a5', districtId: 'd8', districtName: 'Ranchi', scheme: 'scholarship', failureRate: 0.4, severity: 'MEDIUM', status: 'OPEN', createdAt: new Date(now - 3 * 3600000).toISOString() },
  { alertId: 'a6', districtId: 'd7', districtName: 'Raipur', scheme: 'pension', failureRate: 0.26, severity: 'MEDIUM', status: 'OPEN', createdAt: new Date(now - 5 * 3600000).toISOString() },
  { alertId: 'a7', districtId: 'd5', districtName: 'Lucknow', scheme: 'farmer', failureRate: 0.25, severity: 'LOW', status: 'OPEN', createdAt: new Date(now - 6 * 3600000).toISOString() },
  { alertId: 'a8', districtId: 'd12', districtName: 'Chennai', scheme: 'pension', failureRate: 0.22, severity: 'LOW', status: 'OPEN', createdAt: new Date(now - 8 * 3600000).toISOString() },
  { alertId: 'a9', districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', failureRate: 0.11, severity: 'LOW', status: 'RESOLVED', createdAt: new Date(now - 24 * 3600000).toISOString(), resolvedAt: new Date(now - 12 * 3600000).toISOString() },
  { alertId: 'a10', districtId: 'd9', districtName: 'Dehradun', scheme: 'lpg', failureRate: 0.15, severity: 'LOW', status: 'OPEN', createdAt: new Date(now - 10 * 3600000).toISOString() },
  { alertId: 'a11', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', failureRate: 0.52, severity: 'HIGH', status: 'RESOLVED', createdAt: new Date(now - 48 * 3600000).toISOString(), resolvedAt: new Date(now - 36 * 3600000).toISOString() },
  { alertId: 'a12', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', failureRate: 0.42, severity: 'HIGH', status: 'OPEN', createdAt: new Date(now - 15 * 60000).toISOString() },
]

// ─── Officer Actions ─────────────────────────────────────────
export const mockActions: OfficerAction[] = [
  { actionId: 'act1', districtId: 'd6', scheme: 'ration', alertId: 'a1', actionType: 'Send Field Officer', priority: 'HIGH', notes: 'Dispatched officer Ravi Kumar to verify ration distribution at 5 shops in Ward 12.', officerId: 'OFF-201', createdAt: new Date(now - 20 * 60000).toISOString() },
  { actionId: 'act2', districtId: 'd10', scheme: 'farmer', alertId: 'a2', actionType: 'Investigate Supply Chain', priority: 'HIGH', notes: 'Initiated supply chain audit for PM-KISAN disbursals in Guwahati rural blocks.', officerId: 'OFF-305', createdAt: new Date(now - 35 * 60000).toISOString() },
  { actionId: 'act3', districtId: 'd4', scheme: 'lpg', alertId: 'a3', actionType: 'Escalate to State', priority: 'MEDIUM', notes: 'Escalated LPG delivery failure pattern to Bihar state monitoring cell.', officerId: 'OFF-112', createdAt: new Date(now - 90 * 60000).toISOString() },
  { actionId: 'act4', districtId: 'd1', scheme: 'ration', alertId: 'a4', actionType: 'Audit Ration Shop', priority: 'MEDIUM', notes: 'Scheduled audit of 3 PDS shops in Bastar tribal area.', officerId: 'OFF-201', createdAt: new Date(now - 50 * 60000).toISOString() },
  { actionId: 'act5', districtId: 'd2', scheme: 'pension', alertId: 'a9', actionType: 'Mark as Resolved', priority: 'LOW', notes: 'Pension disbursal issue in Jaipur resolved after bank reconciliation.', officerId: 'OFF-410', createdAt: new Date(now - 12 * 3600000).toISOString() },
]

// ─── Scheme Performance (per date-range) ─────────────────────
export const mockSchemePerformance: Record<string, Array<{ scheme: string; yesCount: number; noCount: number; failureRate: number }>> = {
  today: [
    { scheme: 'ration', yesCount: 2100, noCount: 900, failureRate: 0.30 },
    { scheme: 'pension', yesCount: 3200, noCount: 400, failureRate: 0.11 },
    { scheme: 'scholarship', yesCount: 1800, noCount: 200, failureRate: 0.10 },
    { scheme: 'lpg', yesCount: 2500, noCount: 600, failureRate: 0.19 },
    { scheme: 'farmer', yesCount: 1900, noCount: 500, failureRate: 0.21 },
  ],
  '7d': [
    { scheme: 'ration', yesCount: 14000, noCount: 6000, failureRate: 0.30 },
    { scheme: 'pension', yesCount: 21000, noCount: 3500, failureRate: 0.14 },
    { scheme: 'scholarship', yesCount: 12000, noCount: 1500, failureRate: 0.11 },
    { scheme: 'lpg', yesCount: 17000, noCount: 4000, failureRate: 0.19 },
    { scheme: 'farmer', yesCount: 13000, noCount: 4500, failureRate: 0.26 },
  ],
  '30d': [
    { scheme: 'ration', yesCount: 58000, noCount: 22000, failureRate: 0.28 },
    { scheme: 'pension', yesCount: 85000, noCount: 15000, failureRate: 0.15 },
    { scheme: 'scholarship', yesCount: 50000, noCount: 7000, failureRate: 0.12 },
    { scheme: 'lpg', yesCount: 70000, noCount: 18000, failureRate: 0.20 },
    { scheme: 'farmer', yesCount: 55000, noCount: 20000, failureRate: 0.27 },
  ],
}

// ─── District Detail ─────────────────────────────────────────
export interface MockDistrictDetail {
  districtId: string
  districtName: string
  state: string
  totalResponses: number
  activeAlerts: number
  worstScheme: Scheme
  overallFailureRate: number
  changeFromYesterday: { responses: number; alerts: number }
}

export const mockDistrictDetails: Record<string, MockDistrictDetail> = {
  d1:  { districtId: 'd1',  districtName: 'Bastar', state: 'Chhattisgarh', totalResponses: 500, activeAlerts: 2, worstScheme: 'ration', overallFailureRate: 0.36, changeFromYesterday: { responses: 5, alerts: -1 } },
  d2:  { districtId: 'd2',  districtName: 'Jaipur', state: 'Rajasthan', totalResponses: 1000, activeAlerts: 0, worstScheme: 'pension', overallFailureRate: 0.11, changeFromYesterday: { responses: 8, alerts: 0 } },
  d3:  { districtId: 'd3',  districtName: 'Varanasi', state: 'Uttar Pradesh', totalResponses: 500, activeAlerts: 0, worstScheme: 'scholarship', overallFailureRate: 0.10, changeFromYesterday: { responses: -2, alerts: 0 } },
  d4:  { districtId: 'd4',  districtName: 'Patna', state: 'Bihar', totalResponses: 1000, activeAlerts: 1, worstScheme: 'lpg', overallFailureRate: 0.40, changeFromYesterday: { responses: 3, alerts: 1 } },
  d5:  { districtId: 'd5',  districtName: 'Lucknow', state: 'Uttar Pradesh', totalResponses: 1000, activeAlerts: 1, worstScheme: 'farmer', overallFailureRate: 0.25, changeFromYesterday: { responses: 10, alerts: -2 } },
  d6:  { districtId: 'd6',  districtName: 'Bhopal', state: 'Madhya Pradesh', totalResponses: 1000, activeAlerts: 1, worstScheme: 'ration', overallFailureRate: 0.59, changeFromYesterday: { responses: -5, alerts: 2 } },
  d7:  { districtId: 'd7',  districtName: 'Raipur', state: 'Chhattisgarh', totalResponses: 700, activeAlerts: 1, worstScheme: 'pension', overallFailureRate: 0.26, changeFromYesterday: { responses: 4, alerts: 0 } },
  d8:  { districtId: 'd8',  districtName: 'Ranchi', state: 'Jharkhand', totalResponses: 500, activeAlerts: 1, worstScheme: 'scholarship', overallFailureRate: 0.40, changeFromYesterday: { responses: -3, alerts: 1 } },
  d9:  { districtId: 'd9',  districtName: 'Dehradun', state: 'Uttarakhand', totalResponses: 800, activeAlerts: 1, worstScheme: 'lpg', overallFailureRate: 0.15, changeFromYesterday: { responses: 6, alerts: -1 } },
  d10: { districtId: 'd10', districtName: 'Guwahati', state: 'Assam', totalResponses: 500, activeAlerts: 1, worstScheme: 'farmer', overallFailureRate: 0.60, changeFromYesterday: { responses: -8, alerts: 3 } },
  d11: { districtId: 'd11', districtName: 'Thiruvananthapuram', state: 'Kerala', totalResponses: 1000, activeAlerts: 0, worstScheme: 'ration', overallFailureRate: 0.10, changeFromYesterday: { responses: 2, alerts: 0 } },
  d12: { districtId: 'd12', districtName: 'Chennai', state: 'Tamil Nadu', totalResponses: 1000, activeAlerts: 1, worstScheme: 'pension', overallFailureRate: 0.22, changeFromYesterday: { responses: 7, alerts: -1 } },
}

// ─── District Scheme Breakdowns ──────────────────────────────
export interface MockSchemeBreakdown {
  scheme: Scheme
  yesCount: number
  noCount: number
  failureRate: number
  previousFailureRate: number
}

function generateSchemeBreakdown(districtId: string): MockSchemeBreakdown[] {
  const metrics = mockHeatmapData.filter((m) => m.districtId === districtId)
  const schemes: Scheme[] = ['ration', 'pension', 'scholarship', 'lpg', 'farmer']
  return schemes.map((s) => {
    const found = metrics.find((m) => m.scheme === s)
    if (found) {
      return {
        scheme: s,
        yesCount: found.yesCount,
        noCount: found.noCount,
        failureRate: found.failureRate,
        previousFailureRate: found.failureRate + (Math.random() > 0.5 ? 0.05 : -0.03),
      }
    }
    const yes = 300 + Math.floor(Math.random() * 500)
    const no = 50 + Math.floor(Math.random() * 200)
    const rate = no / (yes + no)
    return {
      scheme: s,
      yesCount: yes,
      noCount: no,
      failureRate: parseFloat(rate.toFixed(2)),
      previousFailureRate: parseFloat((rate + (Math.random() > 0.5 ? 0.04 : -0.04)).toFixed(2)),
    }
  })
}

export const mockDistrictSchemes: Record<string, MockSchemeBreakdown[]> = Object.fromEntries(
  Object.keys(mockDistrictDetails).map((id) => [id, generateSchemeBreakdown(id)])
)

// ─── 30-Day Trend Data ───────────────────────────────────────
function generate30DayTrend(): Array<{ date: string; ration: number; pension: number; scholarship: number; lpg: number; farmer: number }> {
  const data = []
  const baseRates: Record<string, number> = { ration: 0.30, pension: 0.14, scholarship: 0.10, lpg: 0.19, farmer: 0.25 }
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const jitter = () => (Math.random() - 0.5) * 0.06
    data.push({
      date: d.toISOString().slice(0, 10),
      ration: parseFloat((baseRates.ration + jitter()).toFixed(3)),
      pension: parseFloat((baseRates.pension + jitter()).toFixed(3)),
      scholarship: parseFloat((baseRates.scholarship + jitter()).toFixed(3)),
      lpg: parseFloat((baseRates.lpg + jitter()).toFixed(3)),
      farmer: parseFloat((baseRates.farmer + jitter()).toFixed(3)),
    })
  }
  return data
}

export const mockTrendData = generate30DayTrend()

// ─── Live Monitor Responses ──────────────────────────────────
const schemes: Scheme[] = ['ration', 'pension', 'scholarship', 'lpg', 'farmer']
const districts = Object.values(mockDistrictDetails)
const blockNames = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E']
const pinCodes = ['462001', '462002', '462003', '781001', '781006', '800001', '226001', '302001', '500001', '600001']

export function generateLiveResponse(index: number): LiveResponse {
  const d = districts[index % districts.length]
  return {
    responseId: `lr-${Date.now()}-${index}`,
    districtId: d.districtId,
    districtName: d.districtName,
    blockName: blockNames[index % blockNames.length],
    pinCode: pinCodes[index % pinCodes.length],
    scheme: schemes[index % schemes.length],
    answer: Math.random() > 0.3 ? 'YES' : 'NO',
    timestamp: new Date(now - index * 3000).toISOString(),
    phoneHash: `XXXX${(1000 + index).toString().slice(-4)}`,
  }
}

export const mockLiveResponses: LiveResponse[] = Array.from({ length: 50 }, (_, i) => generateLiveResponse(i))

// ─── Blocks ──────────────────────────────────────────────────
export const mockBlocks: Block[] = [
  { blockId: 'b1', blockName: 'Jagdalpur', districtId: 'd1', districtName: 'Bastar', failureRate: 0.38, responseVolume: 200, lat: 19.08, lng: 82.02 },
  { blockId: 'b2', blockName: 'Tokapal', districtId: 'd1', districtName: 'Bastar', failureRate: 0.32, responseVolume: 150, lat: 19.2, lng: 81.8 },
  { blockId: 'b3', blockName: 'Sanganer', districtId: 'd2', districtName: 'Jaipur', failureRate: 0.09, responseVolume: 400, lat: 26.82, lng: 75.79 },
  { blockId: 'b4', blockName: 'Amer', districtId: 'd2', districtName: 'Jaipur', failureRate: 0.14, responseVolume: 350, lat: 26.95, lng: 75.85 },
  { blockId: 'b5', blockName: 'Rohania', districtId: 'd3', districtName: 'Varanasi', failureRate: 0.12, responseVolume: 250, lat: 25.35, lng: 83.05 },
  { blockId: 'b6', blockName: 'Danapur', districtId: 'd4', districtName: 'Patna', failureRate: 0.42, responseVolume: 300, lat: 25.63, lng: 85.05 },
  { blockId: 'b7', blockName: 'Phulwari', districtId: 'd4', districtName: 'Patna', failureRate: 0.38, responseVolume: 280, lat: 25.58, lng: 85.12 },
  { blockId: 'b8', blockName: 'Chinhat', districtId: 'd5', districtName: 'Lucknow', failureRate: 0.22, responseVolume: 350, lat: 26.88, lng: 81.02 },
  { blockId: 'b9', blockName: 'Berasia', districtId: 'd6', districtName: 'Bhopal', failureRate: 0.55, responseVolume: 400, lat: 23.63, lng: 77.43 },
  { blockId: 'b10', blockName: 'Huzur', districtId: 'd6', districtName: 'Bhopal', failureRate: 0.62, responseVolume: 350, lat: 23.26, lng: 77.41 },
  { blockId: 'b11', blockName: 'Dharsiwa', districtId: 'd7', districtName: 'Raipur', failureRate: 0.24, responseVolume: 300, lat: 21.3, lng: 81.7 },
  { blockId: 'b12', blockName: 'Kanke', districtId: 'd8', districtName: 'Ranchi', failureRate: 0.44, responseVolume: 250, lat: 23.4, lng: 85.3 },
]

// ─── PIN Code Metrics ────────────────────────────────────────
export const mockPinCodes: PinCodeMetric[] = [
  { pinCode: '494001', blockId: 'b1', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', yesCount: 80, noCount: 45, failureRate: 0.36 },
  { pinCode: '494005', blockId: 'b2', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', yesCount: 60, noCount: 30, failureRate: 0.33 },
  { pinCode: '302001', blockId: 'b3', districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', yesCount: 200, noCount: 20, failureRate: 0.09 },
  { pinCode: '302002', blockId: 'b4', districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', yesCount: 150, noCount: 25, failureRate: 0.14 },
  { pinCode: '221001', blockId: 'b5', districtId: 'd3', districtName: 'Varanasi', scheme: 'scholarship', yesCount: 120, noCount: 15, failureRate: 0.11 },
  { pinCode: '800001', blockId: 'b6', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', yesCount: 100, noCount: 70, failureRate: 0.41 },
  { pinCode: '800002', blockId: 'b7', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', yesCount: 90, noCount: 55, failureRate: 0.38 },
  { pinCode: '226001', blockId: 'b8', districtId: 'd5', districtName: 'Lucknow', scheme: 'farmer', yesCount: 160, noCount: 50, failureRate: 0.24 },
  { pinCode: '462001', blockId: 'b9', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', yesCount: 80, noCount: 100, failureRate: 0.56 },
  { pinCode: '462002', blockId: 'b10', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', yesCount: 70, noCount: 110, failureRate: 0.61 },
]

// ─── State Metrics ───────────────────────────────────────────
export const mockStates: StateMetric[] = [
  { stateId: 's1', stateName: 'Chhattisgarh', totalDistricts: 28, totalResponses: 12000, avgFailureRate: 0.31, activeAlerts: 5, worstScheme: 'ration' },
  { stateId: 's2', stateName: 'Rajasthan', totalDistricts: 33, totalResponses: 25000, avgFailureRate: 0.14, activeAlerts: 2, worstScheme: 'pension' },
  { stateId: 's3', stateName: 'Uttar Pradesh', totalDistricts: 75, totalResponses: 45000, avgFailureRate: 0.22, activeAlerts: 8, worstScheme: 'farmer' },
  { stateId: 's4', stateName: 'Bihar', totalDistricts: 38, totalResponses: 18000, avgFailureRate: 0.35, activeAlerts: 6, worstScheme: 'lpg' },
  { stateId: 's5', stateName: 'Madhya Pradesh', totalDistricts: 52, totalResponses: 22000, avgFailureRate: 0.38, activeAlerts: 7, worstScheme: 'ration' },
  { stateId: 's6', stateName: 'Jharkhand', totalDistricts: 24, totalResponses: 10000, avgFailureRate: 0.33, activeAlerts: 4, worstScheme: 'scholarship' },
  { stateId: 's7', stateName: 'Uttarakhand', totalDistricts: 13, totalResponses: 8000, avgFailureRate: 0.16, activeAlerts: 1, worstScheme: 'lpg' },
  { stateId: 's8', stateName: 'Assam', totalDistricts: 33, totalResponses: 11000, avgFailureRate: 0.42, activeAlerts: 5, worstScheme: 'farmer' },
  { stateId: 's9', stateName: 'Kerala', totalDistricts: 14, totalResponses: 15000, avgFailureRate: 0.08, activeAlerts: 0, worstScheme: 'ration' },
  { stateId: 's10', stateName: 'Tamil Nadu', totalDistricts: 38, totalResponses: 28000, avgFailureRate: 0.18, activeAlerts: 3, worstScheme: 'pension' },
]

// ─── Hotspots ────────────────────────────────────────────────
export const mockHotspots: Hotspot[] = [
  { hotspotId: 'h1', lat: 23.26, lng: 77.41, districtName: 'Bhopal', failureRate: 0.59, occurrences: 12, schemes: ['ration', 'lpg'], firstSeen: '2026-01-15', lastSeen: '2026-03-07' },
  { hotspotId: 'h2', lat: 26.14, lng: 91.74, districtName: 'Guwahati', failureRate: 0.60, occurrences: 8, schemes: ['farmer'], firstSeen: '2026-02-01', lastSeen: '2026-03-06' },
  { hotspotId: 'h3', lat: 25.6, lng: 85.1, districtName: 'Patna', failureRate: 0.40, occurrences: 15, schemes: ['lpg', 'ration'], firstSeen: '2025-12-10', lastSeen: '2026-03-07' },
  { hotspotId: 'h4', lat: 23.34, lng: 85.31, districtName: 'Ranchi', failureRate: 0.40, occurrences: 6, schemes: ['scholarship'], firstSeen: '2026-02-20', lastSeen: '2026-03-05' },
  { hotspotId: 'h5', lat: 19.1, lng: 81.95, districtName: 'Bastar', failureRate: 0.36, occurrences: 10, schemes: ['ration', 'farmer'], firstSeen: '2026-01-01', lastSeen: '2026-03-07' },
]

// ─── Scheme Analytics ────────────────────────────────────────
export const mockSchemeAnalytics: SchemeAnalytic[] = [
  { scheme: 'ration', totalBeneficiaries: 450000, totalResponses: 85000, yesCount: 59500, noCount: 25500, failureRate: 0.30, trend: -2, worstDistrict: 'Bhopal', bestDistrict: 'Thiruvananthapuram' },
  { scheme: 'pension', totalBeneficiaries: 320000, totalResponses: 72000, yesCount: 61200, noCount: 10800, failureRate: 0.15, trend: 1, worstDistrict: 'Raipur', bestDistrict: 'Jaipur' },
  { scheme: 'scholarship', totalBeneficiaries: 180000, totalResponses: 45000, yesCount: 39600, noCount: 5400, failureRate: 0.12, trend: -1, worstDistrict: 'Ranchi', bestDistrict: 'Varanasi' },
  { scheme: 'lpg', totalBeneficiaries: 380000, totalResponses: 68000, yesCount: 54400, noCount: 13600, failureRate: 0.20, trend: 3, worstDistrict: 'Patna', bestDistrict: 'Dehradun' },
  { scheme: 'farmer', totalBeneficiaries: 290000, totalResponses: 55000, yesCount: 40150, noCount: 14850, failureRate: 0.27, trend: -4, worstDistrict: 'Guwahati', bestDistrict: 'Lucknow' },
]

// ─── Anomalies ───────────────────────────────────────────────
export const mockAnomalies: Anomaly[] = [
  { anomalyId: 'an1', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', detectedAt: new Date(now - 2 * 3600000).toISOString(), type: 'SPIKE', description: 'Sudden 40% spike in NO responses for ration in Bhopal Ward 12', severity: 'HIGH', status: 'OPEN', confidence: 0.94 },
  { anomalyId: 'an2', districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', detectedAt: new Date(now - 6 * 3600000).toISOString(), type: 'PATTERN', description: 'Recurring weekly failure pattern in PM-KISAN disbursals', severity: 'HIGH', status: 'INVESTIGATING', confidence: 0.87 },
  { anomalyId: 'an3', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', detectedAt: new Date(now - 24 * 3600000).toISOString(), type: 'SPIKE', description: 'LPG delivery failures doubled in Danapur block', severity: 'MEDIUM', status: 'OPEN', confidence: 0.91 },
  { anomalyId: 'an4', districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', detectedAt: new Date(now - 72 * 3600000).toISOString(), resolvedAt: new Date(now - 48 * 3600000).toISOString(), type: 'DROP', description: 'Unexpected drop in response volume — possible IVR outage', severity: 'LOW', status: 'RESOLVED', confidence: 0.78 },
  { anomalyId: 'an5', districtId: 'd8', districtName: 'Ranchi', scheme: 'scholarship', detectedAt: new Date(now - 12 * 3600000).toISOString(), type: 'PATTERN', description: 'Scholarship non-delivery correlated with school holiday calendar', severity: 'MEDIUM', status: 'INVESTIGATING', confidence: 0.82 },
]

// ─── Incidents ───────────────────────────────────────────────
export const mockIncidents: Incident[] = [
  { incidentId: 'inc1', title: 'Bhopal Ration Distribution Collapse', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', alertIds: ['a1', 'a11'], status: 'INVESTIGATING', priority: 'HIGH', assignedTo: 'OFF-201', createdAt: new Date(now - 4 * 3600000).toISOString(), updatedAt: new Date(now - 30 * 60000).toISOString(), notes: 'Multiple PDS shops reporting stock-outs. Field team dispatched.' },
  { incidentId: 'inc2', title: 'Guwahati PM-KISAN Delay', districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', alertIds: ['a2'], status: 'OPEN', priority: 'HIGH', assignedTo: 'OFF-305', createdAt: new Date(now - 2 * 3600000).toISOString(), updatedAt: new Date(now - 45 * 60000).toISOString(), notes: 'Bank transfer delays reported across 3 blocks.' },
  { incidentId: 'inc3', title: 'Patna LPG Delivery Disruption', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', alertIds: ['a3'], status: 'INVESTIGATING', priority: 'MEDIUM', assignedTo: 'OFF-112', createdAt: new Date(now - 8 * 3600000).toISOString(), updatedAt: new Date(now - 3 * 3600000).toISOString(), notes: 'Supply chain audit in progress.' },
  { incidentId: 'inc4', title: 'Jaipur Pension Resolved', districtId: 'd2', districtName: 'Jaipur', scheme: 'pension', alertIds: ['a9'], status: 'RESOLVED', priority: 'LOW', assignedTo: 'OFF-410', createdAt: new Date(now - 48 * 3600000).toISOString(), updatedAt: new Date(now - 12 * 3600000).toISOString(), notes: 'Root cause: bank reconciliation delay. Resolved.' },
]

// ─── Escalations ─────────────────────────────────────────────
export const mockEscalations: Escalation[] = [
  { escalationId: 'esc1', alertId: 'a1', districtName: 'Bhopal', scheme: 'ration', escalatedTo: 'STATE', escalatedBy: 'OFF-201', reason: 'Failure rate exceeds 50% for 3 consecutive days', status: 'ACKNOWLEDGED', createdAt: new Date(now - 3 * 3600000).toISOString() },
  { escalationId: 'esc2', alertId: 'a2', districtName: 'Guwahati', scheme: 'farmer', escalatedTo: 'NATIONAL', escalatedBy: 'OFF-305', reason: 'PM-KISAN funds not reaching beneficiaries across multiple blocks', status: 'PENDING', createdAt: new Date(now - 1 * 3600000).toISOString() },
  { escalationId: 'esc3', alertId: 'a3', districtName: 'Patna', scheme: 'lpg', escalatedTo: 'STATE', escalatedBy: 'OFF-112', reason: 'LPG delivery disruption affecting 10000+ beneficiaries', status: 'RESOLVED', createdAt: new Date(now - 24 * 3600000).toISOString() },
]

// ─── Alert Rules ─────────────────────────────────────────────
export const mockAlertRules: AlertRule[] = [
  { ruleId: 'r1', scheme: 'ration', districtId: 'd6', districtName: 'Bhopal', thresholdLow: 0.15, thresholdMedium: 0.30, thresholdHigh: 0.45, enabled: true, notifyOfficers: ['OFF-201', 'OFF-112'], lastTriggered: new Date(now - 30 * 60000).toISOString() },
  { ruleId: 'r2', scheme: 'pension', districtId: 'd2', districtName: 'Jaipur', thresholdLow: 0.10, thresholdMedium: 0.20, thresholdHigh: 0.35, enabled: true, notifyOfficers: ['OFF-410'], lastTriggered: new Date(now - 24 * 3600000).toISOString() },
  { ruleId: 'r3', scheme: 'farmer', districtId: 'd10', districtName: 'Guwahati', thresholdLow: 0.20, thresholdMedium: 0.35, thresholdHigh: 0.50, enabled: true, notifyOfficers: ['OFF-305'], lastTriggered: new Date(now - 45 * 60000).toISOString() },
  { ruleId: 'r4', scheme: 'lpg', districtId: 'd4', districtName: 'Patna', thresholdLow: 0.15, thresholdMedium: 0.30, thresholdHigh: 0.40, enabled: true, notifyOfficers: ['OFF-112'], lastTriggered: new Date(now - 2 * 3600000).toISOString() },
  { ruleId: 'r5', scheme: 'scholarship', districtId: 'd8', districtName: 'Ranchi', thresholdLow: 0.10, thresholdMedium: 0.25, thresholdHigh: 0.40, enabled: false, notifyOfficers: ['OFF-201'] },
]

// ─── Citizen Responses (explorer) ────────────────────────────
export const mockCitizenResponses: CitizenResponse[] = Array.from({ length: 40 }, (_, i) => ({
  responseId: `cr-${i}`,
  districtId: districts[i % districts.length].districtId,
  districtName: districts[i % districts.length].districtName,
  blockName: blockNames[i % blockNames.length],
  pinCode: pinCodes[i % pinCodes.length],
  scheme: schemes[i % schemes.length],
  answer: (i % 3 === 0 ? 'NO' : 'YES') as 'YES' | 'NO',
  week: `2026-W${String(8 - (i % 4)).padStart(2, '0')}`,
  phoneHash: `XXXX${(2000 + i).toString().slice(-4)}`,
}))

// ─── Participation Metrics ───────────────────────────────────
export const mockParticipation: ParticipationMetric[] = districts.slice(0, 8).flatMap((d) =>
  schemes.map((s, si) => ({
    districtId: d.districtId,
    districtName: d.districtName,
    scheme: s,
    totalBeneficiaries: 5000 + si * 1000,
    responded: 3000 + si * 500 + (d.districtId === 'd6' ? -1500 : 0),
    participationRate: parseFloat((0.5 + Math.random() * 0.4).toFixed(2)),
  }))
)

// ─── Grievances ──────────────────────────────────────────────
export const mockGrievances: Grievance[] = [
  { grievanceId: 'g1', phoneHash: 'XXXX1234', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', consecutiveNoWeeks: 4, firstFlagged: '2026-02-07', lastResponse: '2026-03-07', status: 'FLAGGED' },
  { grievanceId: 'g2', phoneHash: 'XXXX5678', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', consecutiveNoWeeks: 3, firstFlagged: '2026-02-14', lastResponse: '2026-03-07', status: 'UNDER_REVIEW' },
  { grievanceId: 'g3', phoneHash: 'XXXX9012', districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', consecutiveNoWeeks: 5, firstFlagged: '2026-01-31', lastResponse: '2026-03-07', status: 'FLAGGED' },
  { grievanceId: 'g4', phoneHash: 'XXXX3456', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', consecutiveNoWeeks: 3, firstFlagged: '2026-02-14', lastResponse: '2026-03-07', status: 'RESOLVED' },
  { grievanceId: 'g5', phoneHash: 'XXXX7890', districtId: 'd8', districtName: 'Ranchi', scheme: 'scholarship', consecutiveNoWeeks: 4, firstFlagged: '2026-02-07', lastResponse: '2026-03-06', status: 'FLAGGED' },
]

// ─── Field Officers ──────────────────────────────────────────
export const mockFieldOfficers: FieldOfficer[] = [
  { officerId: 'OFF-201', name: 'Ravi Kumar', districtId: 'd6', districtName: 'Bhopal', phone: '+91-98XXX-XX201', status: 'ON_SITE', currentTask: 'Auditing PDS shops in Ward 12', lastActive: new Date(now - 5 * 60000).toISOString() },
  { officerId: 'OFF-305', name: 'Priya Sharma', districtId: 'd10', districtName: 'Guwahati', phone: '+91-98XXX-XX305', status: 'EN_ROUTE', currentTask: 'Investigating PM-KISAN disbursal', lastActive: new Date(now - 15 * 60000).toISOString() },
  { officerId: 'OFF-112', name: 'Amit Patel', districtId: 'd4', districtName: 'Patna', phone: '+91-98XXX-XX112', status: 'DISPATCHED', currentTask: 'LPG supply chain audit', lastActive: new Date(now - 30 * 60000).toISOString() },
  { officerId: 'OFF-410', name: 'Sunita Rao', districtId: 'd2', districtName: 'Jaipur', phone: '+91-98XXX-XX410', status: 'AVAILABLE', lastActive: new Date(now - 2 * 3600000).toISOString() },
  { officerId: 'OFF-502', name: 'Deepak Singh', districtId: 'd1', districtName: 'Bastar', phone: '+91-98XXX-XX502', status: 'REPORTED', currentTask: 'Ration shop audit complete', lastActive: new Date(now - 1 * 3600000).toISOString() },
  { officerId: 'OFF-603', name: 'Meera Nair', districtId: 'd11', districtName: 'Thiruvananthapuram', phone: '+91-98XXX-XX603', status: 'AVAILABLE', lastActive: new Date(now - 4 * 3600000).toISOString() },
]

// ─── Audit Entries ───────────────────────────────────────────
export const mockAuditEntries: AuditEntry[] = [
  { auditId: 'aud1', officerId: 'OFF-201', officerName: 'Ravi Kumar', action: 'TAKE_ACTION', target: 'Alert a1', details: 'Dispatched field officer to Bhopal Ward 12', timestamp: new Date(now - 20 * 60000).toISOString(), ipAddress: '203.0.113.42' },
  { auditId: 'aud2', officerId: 'OFF-305', officerName: 'Priya Sharma', action: 'ESCALATE', target: 'Alert a2', details: 'Escalated PM-KISAN issue to national level', timestamp: new Date(now - 1 * 3600000).toISOString(), ipAddress: '203.0.113.55' },
  { auditId: 'aud3', officerId: 'OFF-112', officerName: 'Amit Patel', action: 'TAKE_ACTION', target: 'Alert a3', details: 'Initiated LPG supply chain audit in Patna', timestamp: new Date(now - 90 * 60000).toISOString(), ipAddress: '203.0.113.67' },
  { auditId: 'aud4', officerId: 'OFF-410', officerName: 'Sunita Rao', action: 'RESOLVE', target: 'Alert a9', details: 'Marked Jaipur pension alert as resolved', timestamp: new Date(now - 12 * 3600000).toISOString(), ipAddress: '203.0.113.78' },
  { auditId: 'aud5', officerId: 'OFF-201', officerName: 'Ravi Kumar', action: 'EXPORT_DATA', target: 'Dashboard CSV', details: 'Downloaded weekly district summary export', timestamp: new Date(now - 6 * 3600000).toISOString(), ipAddress: '203.0.113.42' },
  { auditId: 'aud6', officerId: 'OFF-502', officerName: 'Deepak Singh', action: 'CONFIG_CHANGE', target: 'Alert Rule r1', details: 'Updated Bhopal ration HIGH threshold from 0.40 to 0.45', timestamp: new Date(now - 24 * 3600000).toISOString(), ipAddress: '203.0.113.90' },
]

// ─── Tasks ───────────────────────────────────────────────────
export const mockTasks: Task[] = [
  { taskId: 't1', title: 'Audit PDS Shops in Bhopal Ward 12', description: 'Visit 5 PDS shops, verify stock and distribution records', assignedTo: 'OFF-201', assignedToName: 'Ravi Kumar', districtId: 'd6', districtName: 'Bhopal', scheme: 'ration', priority: 'HIGH', status: 'IN_PROGRESS', deadline: '2026-03-08', createdAt: new Date(now - 4 * 3600000).toISOString() },
  { taskId: 't2', title: 'Investigate PM-KISAN Delays in Guwahati', description: 'Contact bank branches and verify transfer records', assignedTo: 'OFF-305', assignedToName: 'Priya Sharma', districtId: 'd10', districtName: 'Guwahati', scheme: 'farmer', priority: 'HIGH', status: 'IN_PROGRESS', deadline: '2026-03-09', createdAt: new Date(now - 2 * 3600000).toISOString() },
  { taskId: 't3', title: 'LPG Supply Verification in Patna', description: 'Audit LPG distributor records for Danapur and Phulwari blocks', assignedTo: 'OFF-112', assignedToName: 'Amit Patel', districtId: 'd4', districtName: 'Patna', scheme: 'lpg', priority: 'MEDIUM', status: 'PENDING', deadline: '2026-03-10', createdAt: new Date(now - 8 * 3600000).toISOString() },
  { taskId: 't4', title: 'Follow up Bastar Ration Complaints', description: 'Revisit tribal area PDS shops and collect beneficiary testimonies', assignedTo: 'OFF-502', assignedToName: 'Deepak Singh', districtId: 'd1', districtName: 'Bastar', scheme: 'ration', priority: 'MEDIUM', status: 'COMPLETED', deadline: '2026-03-06', createdAt: new Date(now - 48 * 3600000).toISOString() },
  { taskId: 't5', title: 'Scholarship Disbursement Check Ranchi', description: 'Cross-verify scholarship credits with school records in Kanke block', assignedTo: 'OFF-201', assignedToName: 'Ravi Kumar', districtId: 'd8', districtName: 'Ranchi', scheme: 'scholarship', priority: 'LOW', status: 'OVERDUE', deadline: '2026-03-05', createdAt: new Date(now - 72 * 3600000).toISOString() },
]

// ─── Investigations ──────────────────────────────────────────
export const mockInvestigations: Investigation[] = [
  { investigationId: 'inv1', title: 'Bhopal Ration Supply Chain Breakdown', districtName: 'Bhopal', scheme: 'ration', alertIds: ['a1', 'a11'], assignedTo: 'OFF-201', status: 'IN_PROGRESS', priority: 'HIGH', createdAt: new Date(now - 48 * 3600000).toISOString(), updatedAt: new Date(now - 1 * 3600000).toISOString(), findings: 'Preliminary: 3 out of 5 shops had zero stock for 2 days.' },
  { investigationId: 'inv2', title: 'Guwahati PM-KISAN Bank Transfer Failure', districtName: 'Guwahati', scheme: 'farmer', alertIds: ['a2'], assignedTo: 'OFF-305', status: 'IN_PROGRESS', priority: 'HIGH', createdAt: new Date(now - 24 * 3600000).toISOString(), updatedAt: new Date(now - 3 * 3600000).toISOString() },
  { investigationId: 'inv3', title: 'Patna LPG Delivery Irregularities', districtName: 'Patna', scheme: 'lpg', alertIds: ['a3'], assignedTo: 'OFF-112', status: 'BACKLOG', priority: 'MEDIUM', createdAt: new Date(now - 12 * 3600000).toISOString(), updatedAt: new Date(now - 8 * 3600000).toISOString() },
  { investigationId: 'inv4', title: 'Ranchi Scholarship Non-Delivery', districtName: 'Ranchi', scheme: 'scholarship', alertIds: ['a5'], assignedTo: 'OFF-502', status: 'REVIEW', priority: 'MEDIUM', createdAt: new Date(now - 72 * 3600000).toISOString(), updatedAt: new Date(now - 12 * 3600000).toISOString(), findings: 'School holidays caused delay in distribution — not a systemic issue.' },
  { investigationId: 'inv5', title: 'Jaipur Pension Delay (Closed)', districtName: 'Jaipur', scheme: 'pension', alertIds: ['a9'], assignedTo: 'OFF-410', status: 'RESOLVED', priority: 'LOW', createdAt: new Date(now - 96 * 3600000).toISOString(), updatedAt: new Date(now - 48 * 3600000).toISOString(), findings: 'Bank reconciliation error fixed. All pending pensions disbursed.' },
]

// ─── Scheme Info ─────────────────────────────────────────────
export const mockSchemeInfos: SchemeInfo[] = [
  { schemeId: 'sch1', name: 'Public Distribution System (PDS)', code: 'ration', description: 'Subsidized food grain distribution through Fair Price Shops', eligibility: 'BPL families with valid ration card', deliveryCycle: 'MONTHLY', ministry: 'Ministry of Consumer Affairs', activeSince: '2013-09-01', totalBeneficiaries: 450000 },
  { schemeId: 'sch2', name: 'National Social Assistance Programme', code: 'pension', description: 'Old age, widow, and disability pension under NSAP', eligibility: 'Citizens above 60 (BPL) or widows/disabled', deliveryCycle: 'MONTHLY', ministry: 'Ministry of Rural Development', activeSince: '1995-08-15', totalBeneficiaries: 320000 },
  { schemeId: 'sch3', name: 'National Scholarship Portal', code: 'scholarship', description: 'Pre-matric and post-matric scholarships for SC/ST/OBC/Minority students', eligibility: 'Students from economically weaker sections', deliveryCycle: 'QUARTERLY', ministry: 'Ministry of Education', activeSince: '2015-07-01', totalBeneficiaries: 180000 },
  { schemeId: 'sch4', name: 'Pradhan Mantri Ujjwala Yojana', code: 'lpg', description: 'Free LPG connections and subsidized refills for BPL households', eligibility: 'Women from BPL households', deliveryCycle: 'MONTHLY', ministry: 'Ministry of Petroleum', activeSince: '2016-05-01', totalBeneficiaries: 380000 },
  { schemeId: 'sch5', name: 'PM-KISAN', code: 'farmer', description: 'Direct income support of ₹6000/year to small and marginal farmers', eligibility: 'Farmers with land holding up to 2 hectares', deliveryCycle: 'QUARTERLY', ministry: 'Ministry of Agriculture', activeSince: '2019-02-24', totalBeneficiaries: 290000 },
]

// ─── Beneficiaries ───────────────────────────────────────────
export const mockBeneficiaries: Beneficiary[] = districts.slice(0, 6).flatMap((d) =>
  schemes.map((s) => ({
    beneficiaryId: `ben-${d.districtId}-${s}`,
    districtId: d.districtId,
    districtName: d.districtName,
    scheme: s,
    totalRegistered: 5000 + Math.floor(Math.random() * 10000),
    totalActive: 4000 + Math.floor(Math.random() * 8000),
    lastSynced: new Date(now - Math.floor(Math.random() * 48) * 3600000).toISOString(),
  }))
)

// ─── Delivery Events ─────────────────────────────────────────
export const mockDeliveryEvents: DeliveryEvent[] = [
  { eventId: 'de1', scheme: 'ration', districtId: 'd6', districtName: 'Bhopal', scheduledDate: '2026-03-01', actualDate: '2026-03-03', status: 'DELAYED' },
  { eventId: 'de2', scheme: 'ration', districtId: 'd1', districtName: 'Bastar', scheduledDate: '2026-03-01', actualDate: '2026-03-01', status: 'DELIVERED' },
  { eventId: 'de3', scheme: 'pension', districtId: 'd2', districtName: 'Jaipur', scheduledDate: '2026-03-05', actualDate: '2026-03-05', status: 'DELIVERED' },
  { eventId: 'de4', scheme: 'lpg', districtId: 'd4', districtName: 'Patna', scheduledDate: '2026-03-01', status: 'MISSED' },
  { eventId: 'de5', scheme: 'farmer', districtId: 'd10', districtName: 'Guwahati', scheduledDate: '2026-03-15', status: 'SCHEDULED' },
  { eventId: 'de6', scheme: 'scholarship', districtId: 'd8', districtName: 'Ranchi', scheduledDate: '2026-04-01', status: 'SCHEDULED' },
  { eventId: 'de7', scheme: 'ration', districtId: 'd11', districtName: 'Thiruvananthapuram', scheduledDate: '2026-03-01', actualDate: '2026-03-01', status: 'DELIVERED' },
  { eventId: 'de8', scheme: 'pension', districtId: 'd12', districtName: 'Chennai', scheduledDate: '2026-03-05', actualDate: '2026-03-06', status: 'DELAYED' },
]

// ─── Scheme Health ───────────────────────────────────────────
export const mockSchemeHealth: SchemeHealth[] = [
  { scheme: 'ration', healthScore: 58, failureRate: 0.30, responseRate: 0.72, trendDirection: 'DOWN', activeBeneficiaries: 410000, alertCount: 5 },
  { scheme: 'pension', healthScore: 82, failureRate: 0.15, responseRate: 0.81, trendDirection: 'STABLE', activeBeneficiaries: 295000, alertCount: 2 },
  { scheme: 'scholarship', healthScore: 85, failureRate: 0.12, responseRate: 0.68, trendDirection: 'UP', activeBeneficiaries: 165000, alertCount: 1 },
  { scheme: 'lpg', healthScore: 71, failureRate: 0.20, responseRate: 0.76, trendDirection: 'DOWN', activeBeneficiaries: 350000, alertCount: 3 },
  { scheme: 'farmer', healthScore: 63, failureRate: 0.27, responseRate: 0.65, trendDirection: 'DOWN', activeBeneficiaries: 260000, alertCount: 4 },
]

// ─── IVR Status ──────────────────────────────────────────────
export const mockIvrStatus: IvrStatus[] = [
  { lineId: 'ivr1', region: 'North India', status: 'ACTIVE', callVolume: 12500, dropRate: 0.02, avgResponseTime: 18, uptime: 99.9 },
  { lineId: 'ivr2', region: 'South India', status: 'ACTIVE', callVolume: 15200, dropRate: 0.01, avgResponseTime: 15, uptime: 99.95 },
  { lineId: 'ivr3', region: 'East India', status: 'DEGRADED', callVolume: 8900, dropRate: 0.08, avgResponseTime: 32, uptime: 97.2 },
  { lineId: 'ivr4', region: 'West India', status: 'ACTIVE', callVolume: 11000, dropRate: 0.03, avgResponseTime: 20, uptime: 99.7 },
  { lineId: 'ivr5', region: 'Central India', status: 'ACTIVE', callVolume: 9500, dropRate: 0.04, avgResponseTime: 22, uptime: 99.5 },
  { lineId: 'ivr6', region: 'Northeast India', status: 'DOWN', callVolume: 0, dropRate: 1.0, avgResponseTime: 0, uptime: 82.1 },
]

// ─── Pipeline Services ───────────────────────────────────────
export const mockPipeline: PipelineService[] = [
  { serviceId: 'ps1', name: 'Kinesis Data Stream', type: 'KINESIS', status: 'HEALTHY', latency: 45, throughput: 15000, lastCheck: new Date(now - 60000).toISOString(), errorRate: 0.001 },
  { serviceId: 'ps2', name: 'Response Processor Lambda', type: 'LAMBDA', status: 'HEALTHY', latency: 120, throughput: 14800, lastCheck: new Date(now - 60000).toISOString(), errorRate: 0.002 },
  { serviceId: 'ps3', name: 'Anomaly Detector Lambda', type: 'LAMBDA', status: 'WARNING', latency: 850, throughput: 500, lastCheck: new Date(now - 120000).toISOString(), errorRate: 0.05 },
  { serviceId: 'ps4', name: 'REST API Gateway', type: 'API_GATEWAY', status: 'HEALTHY', latency: 35, throughput: 8000, lastCheck: new Date(now - 60000).toISOString(), errorRate: 0.001 },
  { serviceId: 'ps5', name: 'Response Archive S3', type: 'S3', status: 'HEALTHY', latency: 15, throughput: 20000, lastCheck: new Date(now - 300000).toISOString(), errorRate: 0 },
  { serviceId: 'ps6', name: 'Alert Notifications SNS', type: 'SNS', status: 'HEALTHY', latency: 25, throughput: 200, lastCheck: new Date(now - 60000).toISOString(), errorRate: 0.003 },
  { serviceId: 'ps7', name: 'District Metrics DynamoDB', type: 'DYNAMODB', status: 'HEALTHY', latency: 8, throughput: 12000, lastCheck: new Date(now - 60000).toISOString(), errorRate: 0 },
]

// ─── Ingestion Log ───────────────────────────────────────────
export const mockIngestionLog: IngestionLog[] = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(23 - i).padStart(2, '0')}:00`,
  districtId: districts[i % districts.length].districtId,
  districtName: districts[i % districts.length].districtName,
  volume: 500 + Math.floor(Math.random() * 1500),
  errors: Math.floor(Math.random() * 10),
  avgLatency: 10 + Math.floor(Math.random() * 40),
}))

// ─── Anomaly Engine ──────────────────────────────────────────
export const mockAnomalyEngine: AnomalyEngineStatus = {
  lastRunTime: new Date(now - 15 * 60000).toISOString(),
  alertsGenerated: 3,
  modelConfidence: 0.91,
  dataPointsProcessed: 148320,
  avgProcessingTime: 2.4,
  status: 'RUNNING',
  nextScheduledRun: new Date(now + 15 * 60000).toISOString(),
}

// ─── Notification Settings ───────────────────────────────────
export const mockNotificationSettings: NotificationSetting[] = [
  { settingId: 'ns1', officerId: 'OFF-201', officerName: 'Ravi Kumar', districtId: 'd6', districtName: 'Bhopal', schemes: ['ration', 'lpg'], channels: ['SMS', 'EMAIL'], enabled: true },
  { settingId: 'ns2', officerId: 'OFF-305', officerName: 'Priya Sharma', districtId: 'd10', districtName: 'Guwahati', schemes: ['farmer'], channels: ['SMS', 'PUSH'], enabled: true },
  { settingId: 'ns3', officerId: 'OFF-112', officerName: 'Amit Patel', districtId: 'd4', districtName: 'Patna', schemes: ['lpg', 'ration'], channels: ['EMAIL'], enabled: true },
  { settingId: 'ns4', officerId: 'OFF-410', officerName: 'Sunita Rao', districtId: 'd2', districtName: 'Jaipur', schemes: ['pension'], channels: ['SMS', 'EMAIL', 'PUSH'], enabled: false },
]

// ─── District Mappings ───────────────────────────────────────
export const mockDistrictMappings: DistrictMapping[] = Object.values(mockDistrictDetails).map((d) => ({
  districtId: d.districtId,
  districtName: d.districtName,
  state: d.state,
  blocks: mockBlocks.filter((b) => b.districtId === d.districtId).map((b) => ({ blockId: b.blockId, blockName: b.blockName })),
  pinCodes: mockPinCodes.filter((p) => p.districtId === d.districtId).map((p) => p.pinCode),
  lat: mockHeatmapData.find((h) => h.districtId === d.districtId)?.lat ?? 22,
  lng: mockHeatmapData.find((h) => h.districtId === d.districtId)?.lng ?? 78,
}))

// ─── Blacklist ───────────────────────────────────────────────
export const mockBlacklist: BlacklistEntry[] = [
  { entryId: 'bl1', phoneHash: 'XXXX6789', reason: 'Repeated spam responses detected', flaggedBy: 'SYSTEM', flaggedAt: new Date(now - 7 * 24 * 3600000).toISOString(), status: 'ACTIVE' },
  { entryId: 'bl2', phoneHash: 'XXXX4321', reason: 'Fake identity — mismatched Aadhaar', flaggedBy: 'OFF-201', flaggedAt: new Date(now - 14 * 24 * 3600000).toISOString(), status: 'ACTIVE' },
  { entryId: 'bl3', phoneHash: 'XXXX8765', reason: 'Automated bot pattern detected', flaggedBy: 'SYSTEM', flaggedAt: new Date(now - 3 * 24 * 3600000).toISOString(), status: 'REMOVED' },
]

// ─── Scheduled Reports ───────────────────────────────────────
export const mockScheduledReports: ScheduledReport[] = [
  { reportId: 'sr1', name: 'Weekly District Summary', type: 'PDF', frequency: 'WEEKLY', recipients: ['officer@gov.in', 'dc@mp.gov.in'], filters: { schemes: ['ration', 'pension', 'lpg'], districts: ['d6', 'd4'] }, nextRun: '2026-03-10T06:00:00Z', lastRun: '2026-03-03T06:00:00Z', enabled: true },
  { reportId: 'sr2', name: 'Monthly Scheme Performance', type: 'EXCEL', frequency: 'MONTHLY', recipients: ['ministry@gov.in'], filters: { schemes: ['ration', 'pension', 'scholarship', 'lpg', 'farmer'], districts: [] }, nextRun: '2026-04-01T06:00:00Z', lastRun: '2026-03-01T06:00:00Z', enabled: true },
  { reportId: 'sr3', name: 'Daily Alert Digest', type: 'CSV', frequency: 'DAILY', recipients: ['alerts@gov.in'], filters: { schemes: [], districts: [] }, nextRun: '2026-03-08T06:00:00Z', lastRun: '2026-03-07T06:00:00Z', enabled: false },
]

// ─── Export Records ──────────────────────────────────────────
export const mockExports: ExportRecord[] = [
  { exportId: 'ex1', fileName: 'district_summary_mar2026.csv', type: 'CSV', requestedBy: 'OFF-201', requestedAt: new Date(now - 6 * 3600000).toISOString(), status: 'READY', fileSize: '2.4 MB', downloadUrl: '#' },
  { exportId: 'ex2', fileName: 'alert_history_q1_2026.pdf', type: 'PDF', requestedBy: 'OFF-410', requestedAt: new Date(now - 24 * 3600000).toISOString(), status: 'READY', fileSize: '5.1 MB', downloadUrl: '#' },
  { exportId: 'ex3', fileName: 'scheme_performance_feb2026.xlsx', type: 'EXCEL', requestedBy: 'OFF-305', requestedAt: new Date(now - 48 * 3600000).toISOString(), status: 'EXPIRED', fileSize: '3.8 MB' },
  { exportId: 'ex4', fileName: 'beneficiary_data_bhopal.csv', type: 'CSV', requestedBy: 'OFF-201', requestedAt: new Date(now - 30 * 60000).toISOString(), status: 'PENDING' },
]

// ─── Security Audit Logs ─────────────────────────────────────
export const mockSecurityLogs: SecurityAuditLog[] = [
  { logId: 'sl1', officerId: 'OFF-201', officerName: 'Ravi Kumar', action: 'LOGIN', resource: 'Dashboard', details: 'Successful login from Bhopal office', timestamp: new Date(now - 4 * 3600000).toISOString(), ipAddress: '203.0.113.42', sessionId: 'sess-001' },
  { logId: 'sl2', officerId: 'OFF-201', officerName: 'Ravi Kumar', action: 'DATA_ACCESS', resource: 'District d6 data', details: 'Accessed Bhopal district detail page', timestamp: new Date(now - 3.5 * 3600000).toISOString(), ipAddress: '203.0.113.42', sessionId: 'sess-001' },
  { logId: 'sl3', officerId: 'OFF-201', officerName: 'Ravi Kumar', action: 'EXPORT', resource: 'district_summary_mar2026.csv', details: 'Downloaded CSV export', timestamp: new Date(now - 6 * 3600000).toISOString(), ipAddress: '203.0.113.42', sessionId: 'sess-001' },
  { logId: 'sl4', officerId: 'OFF-305', officerName: 'Priya Sharma', action: 'LOGIN', resource: 'Dashboard', details: 'Successful login from Guwahati office', timestamp: new Date(now - 2 * 3600000).toISOString(), ipAddress: '203.0.113.55', sessionId: 'sess-002' },
  { logId: 'sl5', officerId: 'OFF-112', officerName: 'Amit Patel', action: 'CONFIG_CHANGE', resource: 'Alert Rule r4', details: 'Enabled Patna LPG alert rule', timestamp: new Date(now - 12 * 3600000).toISOString(), ipAddress: '203.0.113.67', sessionId: 'sess-003' },
  { logId: 'sl6', officerId: 'OFF-410', officerName: 'Sunita Rao', action: 'LOGOUT', resource: 'Session', details: 'Manual logout', timestamp: new Date(now - 1 * 3600000).toISOString(), ipAddress: '203.0.113.78', sessionId: 'sess-004' },
]

// ─── Sessions ────────────────────────────────────────────────
export const mockSessions: OfficerSession[] = [
  { sessionId: 'sess-001', officerId: 'OFF-201', officerName: 'Ravi Kumar', loginTime: new Date(now - 4 * 3600000).toISOString(), lastActive: new Date(now - 5 * 60000).toISOString(), ipAddress: '203.0.113.42', device: 'Chrome / Windows 11', status: 'ACTIVE' },
  { sessionId: 'sess-002', officerId: 'OFF-305', officerName: 'Priya Sharma', loginTime: new Date(now - 2 * 3600000).toISOString(), lastActive: new Date(now - 15 * 60000).toISOString(), ipAddress: '203.0.113.55', device: 'Firefox / Ubuntu', status: 'ACTIVE' },
  { sessionId: 'sess-003', officerId: 'OFF-112', officerName: 'Amit Patel', loginTime: new Date(now - 12 * 3600000).toISOString(), lastActive: new Date(now - 6 * 3600000).toISOString(), ipAddress: '203.0.113.67', device: 'Safari / macOS', status: 'EXPIRED' },
  { sessionId: 'sess-004', officerId: 'OFF-410', officerName: 'Sunita Rao', loginTime: new Date(now - 8 * 3600000).toISOString(), lastActive: new Date(now - 1 * 3600000).toISOString(), ipAddress: '203.0.113.78', device: 'Chrome / Android', status: 'EXPIRED' },
  { sessionId: 'sess-005', officerId: 'OFF-502', officerName: 'Meera Nair', loginTime: new Date(now - 3 * 3600000).toISOString(), lastActive: new Date(now - 45 * 60000).toISOString(), ipAddress: '203.0.113.89', device: 'Edge / Windows 10', status: 'IDLE' },
]

// ─── Demo Credentials ────────────────────────────────────────
export const DEMO_EMAIL = 'officer@demo.gov.in'
export const DEMO_PASSWORD = 'demo1234'
