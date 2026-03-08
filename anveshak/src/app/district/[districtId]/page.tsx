'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { analytics } from '@/lib/apiClients'
import { adaptAnomalies } from '@/lib/adapters'
import DashboardShell from '@/components/DashboardShell'
import type { Alert, Severity } from '@/types'
import type { AnalyticsDistrictSummary, AnalyticsSchemeOverview, AnalyticsTrendPoint } from '@/types/api'

const severityColor: Record<Severity, string> = {
  HIGH: 'bg-red-50 text-red-600',
  MEDIUM: 'bg-yellow-50 text-yellow-600',
  LOW: 'bg-green-50 text-green-600',
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

export default function DistrictDetailPage() {
  const params = useParams()
  const districtId = params.districtId as string
  // Convert slug back to district name (e.g., "villupuram" → "Villupuram")
  const districtName = districtId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const [summary, setSummary] = useState<AnalyticsDistrictSummary | null>(null)
  const [schemes, setSchemes] = useState<AnalyticsSchemeOverview[]>([])
  const [trendData, setTrendData] = useState<{ date: string; responses: number; no_pct: number }[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [districtRes, schemeRes, trendRes, anomalyRes] = await Promise.all([
        analytics.dashboard.districtSummary({ scheme_id: undefined }),
        analytics.schemes.list({ days: 30 }),
        analytics.dashboard.trends({ days: 30, district: districtName }),
        analytics.anomalies.list({ district: districtName, limit: 20 }),
      ])

      // Find this district from district summaries
      const districtData = districtRes.data.find(
        (d) => d.district.toLowerCase() === districtName.toLowerCase()
      )
      setSummary(districtData || null)
      setSchemes(schemeRes.data)

      // Transform trend data
      const rows = (trendRes.data.response_trend || []).map((r: AnalyticsTrendPoint) => ({
        date: r.date,
        responses: parseInt(r.total_responses) || 0,
        no_pct: parseFloat(r.avg_no_pct) || 0,
      }))
      setTrendData(rows)

      // Transform anomalies to alerts
      setAlerts(adaptAnomalies(anomalyRes.data))
    } catch {
      setError('Failed to load district data. Please retry.')
    } finally {
      setLoading(false)
    }
  }, [districtName])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <DashboardShell title={districtName} subtitle="Tamil Nadu">
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-10 w-64 bg-white rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-5 h-28" />
                ))}
              </div>
              <div className="bg-white rounded-xl h-96" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-500/30 rounded-lg p-4 text-red-600 text-sm">
              {error}
              <button onClick={fetchData} className="ml-3 underline hover:text-red-600">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Overview Cards */}
              {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <p className="text-3xl font-bold text-gray-900">{parseInt(summary.total_responses).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Responses</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <p className="text-3xl font-bold text-gray-900">{parseInt(summary.anomaly_count).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Anomalies</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <p className="text-3xl font-bold text-red-600">{parseInt(summary.critical_count).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Critical</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <p className="text-3xl font-bold text-gray-900">
                      {(parseFloat(summary.avg_no_pct) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">Avg Failure Rate</p>
                  </div>
                </div>
              )}

              {/* 30-day Line Chart */}
              {trendData.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h2>
                  <div className="overflow-x-auto">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          tickFormatter={(v: string) => {
                            const d = new Date(v)
                            return `${d.getDate()}/${d.getMonth() + 1}`
                          }}
                        />
                        <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="responses" name="Responses" stroke="#3E7228" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="no_pct" name="Failure %" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Alert History */}
              <div className="bg-white rounded-xl p-5 shadow-sm overflow-x-auto">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert History</h2>
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No alerts for this district.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-gray-500 font-medium">Scheme</th>
                        <th className="text-right py-3 px-2 text-gray-500 font-medium">Failure Rate</th>
                        <th className="text-center py-3 px-2 text-gray-500 font-medium">Severity</th>
                        <th className="text-center py-3 px-2 text-gray-500 font-medium">Status</th>
                        <th className="text-right py-3 px-2 text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((a) => (
                        <tr key={a.alertId} className="border-b border-gray-200 last:border-0">
                          <td className="py-3 px-2 text-gray-900 capitalize">{a.scheme}</td>
                          <td className="py-3 px-2 text-right text-gray-900">
                            {(a.failureRate * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor[a.severity]}`}>
                              {a.severity}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                a.status === 'OPEN'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-green-50 text-green-600'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-500">
                            {getRelativeTime(a.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
    </DashboardShell>
  )
}
