'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsBeneficiaryStat } from '@/types/api'

export default function BeneficiariesPage() {
  const [stats, setStats] = useState<AnalyticsBeneficiaryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.beneficiaries.stats({ group_by: 'district' })
        setStats(res.data)
      } catch {
        setError('Failed to load beneficiary data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Beneficiary Database" subtitle="Registered and active beneficiaries per district">
      {loading && <div className="bg-white rounded-xl h-64 animate-pulse" />}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-500 text-xs uppercase">
                <th className="px-4 py-2.5 text-left">District</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">Active</th>
                <th className="px-4 py-2.5 text-right">Inactive</th>
                <th className="px-4 py-2.5 text-right">Active %</th>
                <th className="px-4 py-2.5 text-right">Avg Age</th>
                <th className="px-4 py-2.5 text-right">Male / Female</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((b, i) => {
                const total = parseInt(b.total) || 0
                const active = parseInt(b.active) || 0
                const inactive = parseInt(b.inactive) || 0
                const avgAge = parseFloat(b.avg_age) || 0
                const male = parseInt(b.male) || 0
                const female = parseInt(b.female) || 0
                const pct = total > 0 ? active / total : 0

                return (
                  <tr key={i} className="border-t border-gray-200 hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-2 text-gray-900">{b.district || `Group ${i + 1}`}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{total.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{active.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{inactive.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-bold ${pct > 0.8 ? 'text-green-600' : pct > 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">{avgAge.toFixed(1)}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">{male.toLocaleString()} / {female.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
