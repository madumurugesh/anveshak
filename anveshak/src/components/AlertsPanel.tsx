'use client'

import { useState, useCallback } from 'react'
import { useAlerts } from '@/hooks/useAlerts'
import ActionModal from './ActionModal'
import type { Alert } from '@/types'

const severityColor: Record<string, string> = {
  HIGH: 'text-[#EA4335]',
  MEDIUM: 'text-[#F9AB00]',
  LOW: 'text-[#34A853]',
}

const severityBg: Record<string, string> = {
  HIGH: 'bg-red-50 border-red-100',
  MEDIUM: 'bg-amber-50 border-amber-100',
  LOW: 'bg-green-50 border-green-100',
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

export default function AlertsPanel() {
  const { sortedAlerts, isNewAlert } = useAlerts()
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const handleTakeAction = useCallback((alert: Alert) => {
    setSelectedAlert(alert)
  }, [])

  // Show max 5 in the insights view
  const visibleAlerts = sortedAlerts.slice(0, 5)

  return (
    <div>
      <div className="space-y-3 max-h-[420px] overflow-y-auto">
        {visibleAlerts.length === 0 && (
          <p className="text-gray-400 text-xs text-center py-6">No insights available.</p>
        )}
        {visibleAlerts.map((alert, idx) => (
          <div
            key={alert.alertId ?? idx}
            className={`rounded-xl p-3.5 border transition-all cursor-pointer hover:shadow-sm ${
              severityBg[alert.severity] ?? 'bg-gray-50 border-gray-100'
            } ${isNewAlert(alert.alertId) ? 'ring-2 ring-[#F9AB00]/30' : ''}`}
            onClick={() => handleTakeAction(alert)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {alert.severity} ALERT
              </span>
              <span className="text-[10px] text-gray-400">{getRelativeTime(alert.createdAt)}</span>
            </div>
            <p className="text-xs font-semibold text-gray-800 leading-snug mb-1">
              {alert.districtName} - {alert.scheme ? alert.scheme.charAt(0).toUpperCase() + alert.scheme.slice(1) : 'Unknown'}
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Failure rate at{' '}
              <span className={`font-bold ${severityColor[alert.severity]}`}>
                {(alert.failureRate * 100).toFixed(1)}%
              </span>
              {' '}- requires investigation
            </p>
          </div>
        ))}
      </div>

      {selectedAlert && (
        <ActionModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  )
}
