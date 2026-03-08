import { create } from 'zustand'
import type { Alert, DistrictMetric, DashboardSummary } from '@/types'
import type { AnalyticsDashboardOverview, AnalyticsSchemeOverview } from '@/types/api'

interface DashboardState {
  summary: DashboardSummary | null
  overview: AnalyticsDashboardOverview | null
  schemes: AnalyticsSchemeOverview[]
  heatmapData: DistrictMetric[]
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  setSummary: (data: DashboardSummary) => void
  setOverview: (data: AnalyticsDashboardOverview) => void
  setSchemes: (data: AnalyticsSchemeOverview[]) => void
  setHeatmapData: (data: DistrictMetric[]) => void
  setAlerts: (data: Alert[]) => void
  setLoading: (val: boolean) => void
  setError: (msg: string | null) => void
  setLastFetched: (ts: number) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  overview: null,
  schemes: [],
  heatmapData: [],
  alerts: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  setSummary: (data) => set({ summary: data }),
  setOverview: (data) => set({ overview: data }),
  setSchemes: (data) => set({ schemes: data }),
  setHeatmapData: (data) => set({ heatmapData: data }),
  setAlerts: (data) => set({ alerts: data }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),
  setLastFetched: (ts) => set({ lastFetched: ts }),
}))
