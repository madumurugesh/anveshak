import { create } from 'zustand'
import type { Alert, DistrictMetric, DashboardSummary } from '@/types'

interface DashboardState {
  summary: DashboardSummary | null
  heatmapData: DistrictMetric[]
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  setSummary: (data: DashboardSummary) => void
  setHeatmapData: (data: DistrictMetric[]) => void
  setAlerts: (data: Alert[]) => void
  setLoading: (val: boolean) => void
  setError: (msg: string | null) => void
  setLastFetched: (ts: number) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  heatmapData: [],
  alerts: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  setSummary: (data) => set({ summary: data }),
  setHeatmapData: (data) => set({ heatmapData: data }),
  setAlerts: (data) => set({ alerts: data }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),
  setLastFetched: (ts) => set({ lastFetched: ts }),
}))
