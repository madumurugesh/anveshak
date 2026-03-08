'use client'

import { useEffect, useCallback } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { analytics } from '@/lib/apiClients'
import {
  adaptDashboardOverview,
  adaptDistrictSummaries,
  adaptAnomalies,
} from '@/lib/adapters'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useDashboardData = () => {
  const {
    setLoading,
    setSummary,
    setOverview,
    setSchemes,
    setHeatmapData,
    setHeatmapCells,
    setAlerts,
    setError,
    setLastFetched,
    lastFetched,
  } = useDashboardStore()

  const fetchAll = useCallback(async () => {
    const now = Date.now()
    if (lastFetched && now - lastFetched < CACHE_TTL) return

    setLoading(true)
    setError(null)

    try {
      const [overviewRes, districtRes, schemesRes, anomaliesRes, heatmapRes] = await Promise.all([
        analytics.dashboard.overview({ days: 7 }),
        analytics.dashboard.districtSummary({ days: 7 }),
        analytics.schemes.list({ days: 7 }),
        analytics.anomalies.list({ days: 7, limit: 50 }),
        analytics.anomalies.heatmap({ days: 7 }),
      ])

      const overview = overviewRes.data
      const districts = districtRes.data ?? []
      const schemes = schemesRes.data ?? []
      const anomalies = anomaliesRes.data ?? []
      const heatmapCells = heatmapRes.data ?? []

      // Transform to frontend types
      const summary = adaptDashboardOverview(overview, districts, schemes)
      const heatmapData = adaptDistrictSummaries(districts)
      const alerts = adaptAnomalies(anomalies)

      setSummary(summary)
      setOverview(overview)
      setSchemes(schemes)
      setHeatmapData(heatmapData)
      setHeatmapCells(heatmapCells)
      setAlerts(alerts)
      setLastFetched(now)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(`${message}. Please retry.`)
    } finally {
      setLoading(false)
    }
  }, [lastFetched, setLoading, setSummary, setOverview, setSchemes, setHeatmapData, setHeatmapCells, setAlerts, setError, setLastFetched])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { fetchAll }
}
