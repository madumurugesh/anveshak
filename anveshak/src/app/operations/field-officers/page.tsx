'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsOfficer } from '@/types/api'

export default function FieldOfficersPage() {
  const [officers, setOfficers] = useState<AnalyticsOfficer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.officers.list()
        setOfficers(res.data)
      } catch {
        setError('Failed to load officers')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Field Officers" subtitle="Track officer status and assignments">
      {loading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />)}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officers.map((off) => {
            const totalActions = parseInt(off.total_actions) || 0
            const fieldVisits = parseInt(off.field_visits) || 0
            const resolvedCount = parseInt(off.resolved_count) || 0
            const openAnomalies = parseInt(off.open_anomalies) || 0

            return (
              <div key={off.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-gray-900 font-semibold">{off.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{off.role} · {off.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${off.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {off.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">District</span>
                    <span className="text-gray-700">{off.district || off.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Actions</span>
                    <span className="text-gray-700">{totalActions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Field Visits</span>
                    <span className="text-gray-700">{fieldVisits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resolved</span>
                    <span className="text-green-600 font-medium">{resolvedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Open Anomalies</span>
                    <span className={`font-medium ${openAnomalies > 0 ? 'text-red-600' : 'text-gray-700'}`}>{openAnomalies}</span>
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
