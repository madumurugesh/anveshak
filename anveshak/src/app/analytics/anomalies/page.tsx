'use client'

import { useState, useEffect } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import { adaptAnomalyRecords } from '@/lib/adapters'
import type { Anomaly } from '@/types'

const statusColors: Record<Anomaly['status'], string> = {
  OPEN: 'bg-red-50 text-red-600',
  INVESTIGATING: 'bg-yellow-50 text-yellow-600',
  RESOLVED: 'bg-green-50 text-green-600',
}

export default function AnomaliesPage() {
  const [filter, setFilter] = useState<'ALL' | Anomaly['status']>('ALL')
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await analytics.anomalies.list({ days: 30, limit: 200 })
        if (!cancelled) {
          setAnomalies(adaptAnomalyRecords(res.data ?? []))
        }
      } catch {
        // keep empty list on error
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = filter === 'ALL' ? anomalies : anomalies.filter((a) => a.status === filter)

  return (
    <DashboardShell title="Anomaly History" subtitle="AI-detected anomalies in welfare delivery data">
      <div className="flex gap-2">
        {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === s ? 'bg-[#2A4E1A] text-white' : 'bg-white text-gray-500 hover:text-[#3E7228] border border-[#DFF0D6]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading anomalies…</div>
      ) : (
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.anomalyId} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[a.status]}`}>{a.status}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${a.severity === 'HIGH' ? 'bg-red-50 text-red-600' : a.severity === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600' : 'bg-[#EBF5E3] text-[#3E7228]'}`}>
                    {a.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-600/20 text-purple-600">{a.type}</span>
                </div>
                <p className="text-gray-900 mt-2">{a.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{a.districtName}</span>
                  <span className="capitalize">{a.scheme}</span>
                  <span>Confidence: {(a.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-right">
                <p>{new Date(a.detectedAt).toLocaleDateString()}</p>
                <p>{new Date(a.detectedAt).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </DashboardShell>
  )
}
