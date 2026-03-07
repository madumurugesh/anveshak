'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import api from '@/lib/axios'
import { analytics } from '@/lib/apiClients'
import { adaptAnomalies } from '@/lib/adapters'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export const useAlerts = () => {
  const { alerts, setAlerts } = useDashboardStore()
  const prevAlertIdsRef = useRef<Set<string>>(new Set())
  const newAlertIdsRef = useRef<Set<string>>(new Set())

  // Track new alert IDs for pulse animation
  useEffect(() => {
    const currentIds = new Set(alerts.map((a) => a.alertId))
    const prevIds = prevAlertIdsRef.current
    const freshIds = new Set<string>()

    currentIds.forEach((id) => {
      if (!prevIds.has(id)) {
        freshIds.add(id)
      }
    })

    newAlertIdsRef.current = freshIds
    prevAlertIdsRef.current = currentIds

    // Clear pulse after 5 seconds
    if (freshIds.size > 0) {
      const timeout = setTimeout(() => {
        newAlertIdsRef.current = new Set()
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [alerts])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (IS_MOCK) {
          const res = await api.get('/alerts')
          setAlerts(res.data)
        } else {
          const res = await analytics.anomalies.list({ days: 1, limit: 50 })
          const anomalies = res.data ?? []
          setAlerts(adaptAnomalies(anomalies))
        }
      } catch {
        // silent
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [setAlerts])

  const isNewAlert = useCallback(
    (alertId: string) => newAlertIdsRef.current.has(alertId),
    []
  )

  // Sort: HIGH > MEDIUM > LOW, then recent first
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return { sortedAlerts, isNewAlert }
}
