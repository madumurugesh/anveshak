'use client'

import { useState, useCallback } from 'react'
import { useAlerts } from '@/hooks/useAlerts'
import ActionModal from './ActionModal'
import type { Alert } from '@/types'

const ITEMS_PER_PAGE = 20

const severityColor: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-600 border-red-500/30',
  MEDIUM: 'bg-yellow-50 text-yellow-600 border-yellow-500/30',
  LOW: 'bg-green-50 text-green-600 border-green-500/30',
}

const schemeColor: Record<string, string> = {
  ration: 'bg-[#EBF5E3] text-[#3E7228]',
  pension: 'bg-purple-50 text-purple-600',
  scholarship: 'bg-teal-50 text-teal-600',
  lpg: 'bg-orange-50 text-orange-600',
  farmer: 'bg-green-50 text-green-600',
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getFailureRateColor(rate: number): string {
  if (rate <= 0.1) return 'text-green-600'
  if (rate <= 0.25) return 'text-yellow-600'
  if (rate <= 0.4) return 'text-orange-600'
  return 'text-red-600'
}

export default function AlertsPanel() {
  const { sortedAlerts, isNewAlert } = useAlerts()
  const [page, setPage] = useState(0)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const totalPages = Math.ceil(sortedAlerts.length / ITEMS_PER_PAGE)
  const pageAlerts = sortedAlerts.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  )

  const handleTakeAction = useCallback((alert: Alert) => {
    setSelectedAlert(alert)
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Active Alerts</h2>
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          Auto-refresh · 30s
        </span>
      </div>

      <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1">
        {pageAlerts.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No alerts found.</p>
        )}
        {pageAlerts.map((alert) => (
          <div
            key={alert.alertId}
            className={`bg-[#F4F9F0] rounded-lg p-3 border border-[#DFF0D6] transition-all hover:border-[#7BBF4E]/40 ${
              isNewAlert(alert.alertId) ? 'animate-pulse-border' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {alert.districtName}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      schemeColor[alert.scheme] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {alert.scheme.charAt(0).toUpperCase() + alert.scheme.slice(1)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      severityColor[alert.severity]
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xl font-bold ${getFailureRateColor(alert.failureRate)}`}
                  >
                    {(alert.failureRate * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {getRelativeTime(alert.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleTakeAction(alert)}
                className="shrink-0 px-3 py-1.5 bg-[#2A4E1A] hover:bg-[#3E7228] text-white text-xs font-medium rounded-lg transition"
              >
                Take Action
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition"
          >
            Next
          </button>
        </div>
      )}

      {selectedAlert && (
        <ActionModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  )
}
