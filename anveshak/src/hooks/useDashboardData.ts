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

const TIME_RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '6m': 180,
  '12m': 365,
}

export const useDashboardData = (timeRange: string = '7d') => {
  const days = TIME_RANGE_DAYS[timeRange] || 7
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

  const fetchAll = useCallback(async (force?: boolean) => {
    const now = Date.now()
    if (!force && lastFetched && now - lastFetched < CACHE_TTL) return

    setLoading(true)
    setError(null)

    try {
      const [overviewRes, districtRes, schemesRes, anomaliesRes, heatmapRes] = await Promise.all([
        analytics.dashboard.overview({ days }),
        analytics.dashboard.districtSummary({ days }),
        analytics.schemes.list({ days }),
        analytics.anomalies.list({ days, limit: 50 }),
        analytics.anomalies.heatmap({ days }),
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
  }, [days, lastFetched, setLoading, setSummary, setOverview, setSchemes, setHeatmapData, setHeatmapCells, setAlerts, setError, setLastFetched])

  useEffect(() => {
    fetchAll(true)
  }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  return { fetchAll }
}
