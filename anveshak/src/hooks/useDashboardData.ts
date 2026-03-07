'use client'

import { useEffect, useCallback } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { analytics } from '@/lib/apiClients'
import {
  adaptDashboardOverview,
  adaptDistrictSummaries,
  adaptAnomalies,
} from '@/lib/adapters'
import api from '@/lib/axios'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useDashboardData = () => {
  const {
    setLoading,
    setSummary,
    setHeatmapData,
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
      if (IS_MOCK) {
        // Use mock data path
        const [summary, heatmap, alerts] = await Promise.all([
          api.get('/district-summary'),
          api.get('/heatmap-data'),
          api.get('/alerts'),
        ])
        setSummary(summary.data)
        setHeatmapData(heatmap.data)
        setAlerts(alerts.data)
      } else {
        // Use real analytics API with proper adapters
        const [overviewRes, districtRes, schemesRes, anomaliesRes] = await Promise.all([
          analytics.dashboard.overview({ days: 7 }),
          analytics.dashboard.districtSummary({ days: 7 }),
          analytics.schemes.list({ days: 7 }),
          analytics.anomalies.list({ days: 7, limit: 50 }),
        ])

        const overview = overviewRes.data
        const districts = districtRes.data ?? (districtRes as unknown as { data: typeof districtRes.data }).data ?? []
        const schemes = schemesRes.data ?? []
        const anomalies = anomaliesRes.data ?? []

        // Transform to frontend types
        const summary = adaptDashboardOverview(overview, districts, schemes)
        const heatmapData = adaptDistrictSummaries(districts)
        const alerts = adaptAnomalies(anomalies)

        setSummary(summary)
        setHeatmapData(heatmapData)
        setAlerts(alerts)
      }
      setLastFetched(now)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(`${message}. Please retry.`)
    } finally {
      setLoading(false)
    }
  }, [lastFetched, setLoading, setSummary, setHeatmapData, setAlerts, setError, setLastFetched])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { fetchAll }
}
