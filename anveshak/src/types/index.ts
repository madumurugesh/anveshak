export type Scheme = 'ration' | 'pension' | 'scholarship' | 'lpg' | 'farmer'

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

export type ActionType =
  | 'Send Field Officer'
  | 'Audit Ration Shop'
  | 'Investigate Supply Chain'
  | 'Escalate to State'
  | 'Mark as Resolved'

export interface DistrictMetric {
  districtId: string
  districtName: string
  scheme: Scheme
  yesCount: number
  noCount: number
  failureRate: number
  responseVolume: number
  lat: number
  lng: number
}

export interface Alert {
  alertId: string
  districtId: string
  districtName: string
  scheme: Scheme
  failureRate: number
  severity: Severity
  status: 'OPEN' | 'RESOLVED'
  createdAt: string
  resolvedAt?: string
}

export interface OfficerAction {
  actionId: string
  districtId: string
  scheme: Scheme
  alertId: string
  actionType: ActionType
  priority: Severity
  notes: string
  officerId: string
  createdAt: string
}

export interface DashboardSummary {
  totalResponsesToday: number
  activeAlerts: number
  worstScheme: Scheme
  worstDistrict: string
  changeFromYesterday: {
    responses: number
    alerts: number
  }
}

// ─── Live Monitor ────────────────────────────────────────────
export interface LiveResponse {
  responseId: string
  districtId: string
  districtName: string
  blockName: string
  pinCode: string
  scheme: Scheme
  answer: 'YES' | 'NO'
  timestamp: string
  phoneHash: string
}

// ─── Geographic ──────────────────────────────────────────────
export interface Block {
  blockId: string
  blockName: string
  districtId: string
  districtName: string
  failureRate: number
  responseVolume: number
  lat: number
  lng: number
}

export interface PinCodeMetric {
  pinCode: string
  blockId: string
  districtId: string
  districtName: string
  scheme: Scheme
  yesCount: number
  noCount: number
  failureRate: number
}

export interface StateMetric {
  stateId: string
  stateName: string
  totalDistricts: number
  totalResponses: number
  avgFailureRate: number
  activeAlerts: number
  worstScheme: Scheme
}

export interface Hotspot {
  hotspotId: string
  lat: number
  lng: number
  districtName: string
  failureRate: number
  occurrences: number
  schemes: Scheme[]
  firstSeen: string
  lastSeen: string
}

// ─── Analytics ───────────────────────────────────────────────
export interface SchemeAnalytic {
  scheme: Scheme
  totalBeneficiaries: number
  totalResponses: number
  yesCount: number
  noCount: number
  failureRate: number
  trend: number
  worstDistrict: string
  bestDistrict: string
}

export interface TrendDataPoint {
  date: string
  ration: number
  pension: number
  scholarship: number
  lpg: number
  farmer: number
}

export interface Anomaly {
  anomalyId: string
  districtId: string
  districtName: string
  scheme: Scheme
  detectedAt: string
  resolvedAt?: string
  type: 'SPIKE' | 'DROP' | 'PATTERN'
  description: string
  severity: Severity
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
  confidence: number
}

// ─── Incidents ───────────────────────────────────────────────
export interface Incident {
  incidentId: string
  title: string
  districtId: string
  districtName: string
  scheme: Scheme
  alertIds: string[]
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
  priority: Severity
  assignedTo: string
  createdAt: string
  updatedAt: string
  notes: string
}

export interface Escalation {
  escalationId: string
  alertId: string
  districtName: string
  scheme: Scheme
  escalatedTo: 'STATE' | 'NATIONAL'
  escalatedBy: string
  reason: string
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'
  createdAt: string
}

export interface AlertRule {
  ruleId: string
  scheme: Scheme
  districtId: string
  districtName: string
  thresholdLow: number
  thresholdMedium: number
  thresholdHigh: number
  enabled: boolean
  notifyOfficers: string[]
  lastTriggered?: string
}

// ─── Citizen Intelligence ────────────────────────────────────
export interface CitizenResponse {
  responseId: string
  districtId: string
  districtName: string
  blockName: string
  pinCode: string
  scheme: Scheme
  answer: 'YES' | 'NO'
  week: string
  phoneHash: string
}

export interface ParticipationMetric {
  districtId: string
  districtName: string
  scheme: Scheme
  totalBeneficiaries: number
  responded: number
  participationRate: number
}

export interface Grievance {
  grievanceId: string
  phoneHash: string
  districtId: string
  districtName: string
  scheme: Scheme
  consecutiveNoWeeks: number
  firstFlagged: string
  lastResponse: string
  status: 'FLAGGED' | 'UNDER_REVIEW' | 'RESOLVED'
}

// ─── Field Operations ────────────────────────────────────────
export interface FieldOfficer {
  officerId: string
  name: string
  districtId: string
  districtName: string
  phone: string
  status: 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SITE' | 'REPORTED'
  currentTask?: string
  lastActive: string
}

export interface AuditEntry {
  auditId: string
  officerId: string
  officerName: string
  action: string
  target: string
  details: string
  timestamp: string
  ipAddress: string
}

export interface Task {
  taskId: string
  title: string
  description: string
  assignedTo: string
  assignedToName: string
  districtId: string
  districtName: string
  scheme: Scheme
  priority: Severity
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  deadline: string
  createdAt: string
}

export interface Investigation {
  investigationId: string
  title: string
  districtName: string
  scheme: Scheme
  alertIds: string[]
  assignedTo: string
  status: 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'RESOLVED'
  priority: Severity
  createdAt: string
  updatedAt: string
  findings?: string
}

// ─── Scheme Management ───────────────────────────────────────
export interface SchemeInfo {
  schemeId: string
  name: string
  code: Scheme
  description: string
  eligibility: string
  deliveryCycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
  ministry: string
  activeSince: string
  totalBeneficiaries: number
}

export interface Beneficiary {
  beneficiaryId: string
  districtId: string
  districtName: string
  scheme: Scheme
  totalRegistered: number
  totalActive: number
  lastSynced: string
}

export interface DeliveryEvent {
  eventId: string
  scheme: Scheme
  districtId: string
  districtName: string
  scheduledDate: string
  actualDate?: string
  status: 'SCHEDULED' | 'DELIVERED' | 'DELAYED' | 'MISSED'
}

export interface SchemeHealth {
  scheme: Scheme
  healthScore: number
  failureRate: number
  responseRate: number
  trendDirection: 'UP' | 'DOWN' | 'STABLE'
  activeBeneficiaries: number
  alertCount: number
}

// ─── System Monitoring ───────────────────────────────────────
export interface IvrStatus {
  lineId: string
  region: string
  status: 'ACTIVE' | 'DEGRADED' | 'DOWN'
  callVolume: number
  dropRate: number
  avgResponseTime: number
  uptime: number
}

export interface PipelineService {
  serviceId: string
  name: string
  type: 'KINESIS' | 'LAMBDA' | 'API_GATEWAY' | 'S3' | 'DYNAMODB' | 'SNS'
  status: 'HEALTHY' | 'WARNING' | 'ERROR'
  latency: number
  throughput: number
  lastCheck: string
  errorRate: number
}

export interface IngestionLog {
  hour: string
  districtId: string
  districtName: string
  volume: number
  errors: number
  avgLatency: number
}

export interface AnomalyEngineStatus {
  lastRunTime: string
  alertsGenerated: number
  modelConfidence: number
  dataPointsProcessed: number
  avgProcessingTime: number
  status: 'RUNNING' | 'IDLE' | 'ERROR'
  nextScheduledRun: string
}

// ─── Configuration ───────────────────────────────────────────
export interface NotificationSetting {
  settingId: string
  officerId: string
  officerName: string
  districtId: string
  districtName: string
  schemes: Scheme[]
  channels: ('SMS' | 'EMAIL' | 'PUSH')[]
  enabled: boolean
}

export interface DistrictMapping {
  districtId: string
  districtName: string
  state: string
  blocks: { blockId: string; blockName: string }[]
  pinCodes: string[]
  lat: number
  lng: number
}

export interface BlacklistEntry {
  entryId: string
  phoneHash: string
  reason: string
  flaggedBy: string
  flaggedAt: string
  status: 'ACTIVE' | 'REMOVED'
}

// ─── Reports ─────────────────────────────────────────────────
export interface ScheduledReport {
  reportId: string
  name: string
  type: 'PDF' | 'CSV' | 'EXCEL'
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  recipients: string[]
  filters: { schemes: Scheme[]; districts: string[] }
  nextRun: string
  lastRun?: string
  enabled: boolean
}

export interface ExportRecord {
  exportId: string
  fileName: string
  type: 'CSV' | 'EXCEL' | 'PDF'
  requestedBy: string
  requestedAt: string
  status: 'PENDING' | 'READY' | 'EXPIRED'
  fileSize?: string
  downloadUrl?: string
}

// ─── Security ────────────────────────────────────────────────
export interface SecurityAuditLog {
  logId: string
  officerId: string
  officerName: string
  action: 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'CONFIG_CHANGE' | 'DATA_ACCESS' | 'VIEW'
  resource: string
  details: string
  timestamp: string
  ipAddress: string
  sessionId: string
}

export interface OfficerSession {
  sessionId: string
  officerId: string
  officerName: string
  loginTime: string
  lastActive: string
  ipAddress: string
  device: string
  status: 'ACTIVE' | 'IDLE' | 'EXPIRED'
}
