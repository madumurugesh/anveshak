'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsSchemeOverview } from '@/types/api'

export default function SchemeRegistryPage() {
  const [schemes, setSchemes] = useState<AnalyticsSchemeOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.schemes.list()
        setSchemes(res.data)
      } catch {
        setError('Failed to load scheme registry')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Scheme Registry" subtitle="All government welfare schemes under monitoring">
      {loading && <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-40 animate-pulse" />)}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          {schemes.map((s) => {
            const totalBeneficiaries = parseInt(s.total_beneficiaries) || 0
            const activeBeneficiaries = parseInt(s.active_beneficiaries) || 0
            const totalResponses = parseInt(s.total_responses) || 0
            const avgNoPct = (parseFloat(s.avg_no_pct) || 0) * 100

            return (
              <div key={s.scheme_id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-gray-900 font-semibold text-lg">{s.scheme_name_en}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Code: <span className="text-[#3E7228] capitalize">{s.scheme_id}</span> · {s.scheme_name_ta}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Total Beneficiaries</span>
                    <p className="text-gray-900 font-medium mt-0.5">{totalBeneficiaries.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Active Beneficiaries</span>
                    <p className="text-gray-900 font-medium mt-0.5">{activeBeneficiaries.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Responses</span>
                    <p className="text-gray-900 font-medium mt-0.5">{totalResponses.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Avg Failure %</span>
                    <p className={`font-medium mt-0.5 ${avgNoPct > 25 ? 'text-red-600' : avgNoPct > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {avgNoPct.toFixed(1)}%
                    </p>
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
