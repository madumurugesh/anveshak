'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const schemeColors: Record<string, string> = {
  responses: '#3E7228',
  no_pct: '#ef4444',
  anomalies: '#f59e0b',
}

interface TrendRow {
  date: string
  responses: number
  no_pct: number
  anomalies: number
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await analytics.dashboard.trends({ days: 30 })
        const rows: TrendRow[] = (res.data.response_trend || []).map((r) => {
          const anomalyDay = (res.data.anomaly_trend || []).find((a) => a.date === r.date)
          return {
            date: r.date,
            responses: parseInt(r.total_responses) || 0,
            no_pct: parseFloat(r.avg_no_pct) || 0,
            anomalies: anomalyDay ? parseInt(anomalyDay.total_anomalies) || 0 : 0,
          }
        })
        setData(rows)
      } catch {
        setError('Failed to load trend data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardShell title="Trend Analysis" subtitle="30-day response and anomaly trends">
      {loading && <div className="bg-white rounded-xl h-[400px] animate-pulse" />}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="responses" stroke={schemeColors.responses} strokeWidth={2} dot={false} name="Responses" />
                <Line yAxisId="right" type="monotone" dataKey="no_pct" stroke={schemeColors.no_pct} strokeWidth={2} dot={false} name="Failure %" />
                <Line yAxisId="left" type="monotone" dataKey="anomalies" stroke={schemeColors.anomalies} strokeWidth={2} dot={false} name="Anomalies" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-right">Responses</th>
                  <th className="px-4 py-2.5 text-right">Failure %</th>
                  <th className="px-4 py-2.5 text-right">Anomalies</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-7).map((d) => (
                  <tr key={d.date} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-gray-600 text-xs">{d.date}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-900">{d.responses.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-xs text-red-600">{(d.no_pct * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right text-xs text-yellow-600">{d.anomalies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
