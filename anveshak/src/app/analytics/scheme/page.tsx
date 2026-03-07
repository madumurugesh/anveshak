'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsSchemeOverview } from '@/types/api'

export default function SchemeAnalyticsPage() {
  const [schemes, setSchemes] = useState<AnalyticsSchemeOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.schemes.list({ days: 7 })
        setSchemes(res.data)
      } catch {
        setError('Failed to load scheme analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Scheme Analytics" subtitle="Per-scheme delivery performance analysis">
      {loading && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />)}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {schemes.map((sa) => {
            const failureRate = parseFloat(sa.avg_no_pct) || 0
            const totalResponses = parseInt(sa.total_responses) || 0
            const totalBeneficiaries = parseInt(sa.total_beneficiaries) || 0
            const activeBeneficiaries = parseInt(sa.active_beneficiaries) || 0
            const anomalyCount = parseInt(sa.anomaly_count) || 0
            const criticalAnomalies = parseInt(sa.critical_anomalies) || 0

            return (
              <div key={sa.scheme_id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-gray-900 font-semibold text-lg">{sa.scheme_name_en}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{sa.scheme_name_ta}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    failureRate > 25 ? 'bg-red-50 text-red-600' : failureRate > 15 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {failureRate.toFixed(1)}% failure
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Beneficiaries</p>
                    <p className="text-gray-900 font-medium">{totalBeneficiaries.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active Beneficiaries</p>
                    <p className="text-gray-900 font-medium">{activeBeneficiaries.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Responses</p>
                    <p className="text-gray-900 font-medium">{totalResponses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Response Rate</p>
                    <p className="text-gray-900 font-medium">{parseFloat(sa.avg_response_rate || '0').toFixed(1)}%</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs">
                  <span className="text-gray-500">Anomalies: <span className="text-yellow-600">{anomalyCount}</span></span>
                  <span className="text-gray-500">Critical: <span className="text-red-600">{criticalAnomalies}</span></span>
                  <span className={`px-1.5 py-0.5 rounded-full ${sa.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {sa.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
