'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsHeatmapCell } from '@/types/api'

const SCHEME_MAP: Record<string, string> = {
  PDS: 'Ration',
  PM_KISAN: 'Farmer',
  OLD_AGE_PENSION: 'Pension',
  LPG: 'LPG',
}

export default function HotspotMapPage() {
  const [cells, setCells] = useState<AnalyticsHeatmapCell[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.anomalies.heatmap({ days: 30 })
        setCells(res.data)
      } catch {
        setError('Failed to load hotspot data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Hotspot Map" subtitle="Recurring failure hotspots across districts">
      {loading && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-40 animate-pulse" />)}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cells.map((h, i) => {
            const anomalyCount = parseInt(h.anomaly_count) || 0
            const criticalCount = parseInt(h.critical) || 0
            const highCount = parseInt(h.high) || 0
            const avgNoPct = parseFloat(h.avg_no_pct) || 0

            return (
              <div key={`${h.district}-${h.scheme_id}-${i}`} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-gray-900 font-semibold">{h.district}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{SCHEME_MAP[h.scheme_id] || h.scheme_id}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    avgNoPct > 30 ? 'bg-red-50 text-red-600' : avgNoPct > 15 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {avgNoPct.toFixed(1)}% failure
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Anomalies</span>
                    <span className="text-gray-900 font-medium">{anomalyCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Critical</span>
                    <span className="text-red-600 font-medium">{criticalCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">High</span>
                    <span className="text-orange-600 font-medium">{highCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Score</span>
                    <span className="text-gray-600">{parseFloat(h.avg_score || '0').toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
