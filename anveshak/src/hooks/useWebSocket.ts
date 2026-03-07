'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import type { Alert } from '@/types'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export const useWebSocket = () => {
  const { setAlerts } = useDashboardStore()
  const alertsRef = useRef<Alert[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Keep alertsRef in sync
  const alerts = useDashboardStore((s) => s.alerts)
  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      try {
        const { default: api } = await import('@/lib/axios')
        const res = await api.get('/alerts')
        useDashboardStore.getState().setAlerts(res.data)
      } catch {
        // silent
      }
    }, 30000)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    // In mock mode, skip WebSocket entirely — data is already loaded via useDashboardData
    if (IS_MOCK) return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (!wsUrl) {
      startPolling()
      return
    }

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const newAlert: Alert = JSON.parse(event.data)
        setAlerts([newAlert, ...alertsRef.current])
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      console.error('WebSocket error — falling back to polling')
      ws.close()
      startPolling()
    }

    ws.onclose = () => {
      startPolling()
    }

    return () => {
      ws.close()
      stopPolling()
    }
  }, [setAlerts, startPolling, stopPolling])
}
