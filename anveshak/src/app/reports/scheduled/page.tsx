'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsReport } from '@/types/api'

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.reports.list({ limit: 20 })
        setReports(res.data)
      } catch {
        setError('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Reports" subtitle="District anomaly reports and analysis">
      {loading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />)}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {reports.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No reports found.</p>
          )}
          {reports.map((r) => {
            const anomaliesCount = r.total_anomalies || 0
            const criticalCount = r.critical_count || 0

            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EBF5E3] text-[#3E7228]">
                        {r.district}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {new Date(r.report_date).toLocaleDateString()}
                      </span>
                      {criticalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 font-bold">
                          {criticalCount} critical
                        </span>
                      )}
                    </div>
                    <h3 className="text-gray-900 font-semibold mt-2">
                      {r.district} Report - {r.report_date}
                    </h3>
                  </div>
                  {r.pdf_s3_key && (
                    <button
                      onClick={async () => {
                        try {
                          const pdf = await analytics.reports.pdf(r.id)
                          if (pdf.data.download_url) window.open(pdf.data.download_url, '_blank')
                        } catch { /* ignore */ }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#EBF5E3] text-[#3E7228] hover:bg-[#DFF0D6] transition"
                    >
                      Download PDF
                    </button>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Anomalies</span>
                    <p className="text-gray-900 mt-0.5 font-medium">{anomaliesCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Critical</span>
                    <p className={`mt-0.5 font-medium ${criticalCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{criticalCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created</span>
                    <p className="text-gray-700 mt-0.5">{new Date(r.generated_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Has PDF</span>
                    <p className="text-gray-700 mt-0.5">{r.pdf_s3_key ? 'Yes' : 'No'}</p>
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
