'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsSchemeOverview } from '@/types/api'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const SCHEME_ID_MAP: Record<string, string> = {
  'pm-kisan': 'PM_KISAN',
  'mgnrega': 'OLD_AGE_PENSION',
  'nsap': 'OLD_AGE_PENSION',
  'pds': 'PDS',
  'ujjwala': 'LPG',
}

const SCHEME_COLORS: Record<string, string> = {
  'pm-kisan': '#22A658',
  'mgnrega': '#1E7A45',
  'nsap': '#F9AB00',
  'pds': '#4285F4',
  'ujjwala': '#EA4335',
}

export default function SchemeDetailPage() {
  const params = useParams()
  const schemeId = params.schemeId as string
  const apiSchemeId = SCHEME_ID_MAP[schemeId] || schemeId.toUpperCase()
  const color = SCHEME_COLORS[schemeId] || '#22A658'

  const [scheme, setScheme] = useState<AnalyticsSchemeOverview | null>(null)
  const [trends, setTrends] = useState<{ date: string; responses: number; noCount: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [schemesRes, trendsRes] = await Promise.all([
          analytics.schemes.list({ days: 30 }),
          analytics.dashboard.trends({ days: 30, scheme_id: apiSchemeId }),
        ])
        if (cancelled) return

        const match = (schemesRes.data ?? []).find(
          (s) => s.scheme_id === apiSchemeId
        )
        if (match) setScheme(match)

        const trendData = (trendsRes.data?.response_trend ?? []).map((t) => ({
          date: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          responses: parseInt(t.total_responses) || 0,
          noCount: parseInt(t.no_count) || 0,
        }))
        setTrends(trendData)
      } catch {
        // keep empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [apiSchemeId])

  const schemeName = scheme?.scheme_name_en || schemeId.replace(/-/g, ' ').toUpperCase()
  const totalResponses = parseInt(scheme?.total_responses || '0')
  const totalYes = parseInt(scheme?.total_yes || '0')
  const totalNo = parseInt(scheme?.total_no || '0')
  const avgNoPct = parseFloat(scheme?.avg_no_pct || '0')
  const totalBeneficiaries = parseInt(scheme?.total_beneficiaries || '0')
  const activeBeneficiaries = parseInt(scheme?.active_beneficiaries || '0')
  const anomalyCount = parseInt(scheme?.anomaly_count || '0')
  const criticalAnomalies = parseInt(scheme?.critical_anomalies || '0')

  const pieData = [
    { name: 'YES', value: totalYes },
    { name: 'NO', value: totalNo },
  ]
  const PIE_COLORS = [color, '#EA4335']

  return (
    <DashboardShell title={schemeName} subtitle="Scheme Performance · Last 30 Days">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)', fontSize: 13 }}>
          Loading scheme data…
        </div>
      ) : !scheme ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)', fontSize: 13 }}>
          No data found for this scheme.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total Responses', value: totalResponses.toLocaleString() },
              { label: 'Active Beneficiaries', value: activeBeneficiaries.toLocaleString() },
              { label: 'Failure Rate', value: `${avgNoPct.toFixed(1)}%` },
              { label: 'Open Anomalies', value: anomalyCount.toString() },
            ].map((kpi) => (
              <div key={kpi.label} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div className="stat-number">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10, marginBottom: 16 }}>
            {/* Trend Area Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Response Trend</span>
                <span className="badge badge-gray">30 Days</span>
              </div>
              <div style={{ padding: '0 16px 14px' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="responses" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} name="Responses" />
                    <Area type="monotone" dataKey="noCount" stroke="#EA4335" fill="#EA4335" fillOpacity={0.1} strokeWidth={1.5} name="NO Responses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Response Distribution Pie */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Response Split</span>
              </div>
              <div style={{ padding: '0 16px 14px' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Scheme Details</span>
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {[
                    ['Total Beneficiaries', totalBeneficiaries.toLocaleString()],
                    ['Active Beneficiaries', activeBeneficiaries.toLocaleString()],
                    ['Reporting Districts', scheme.reporting_districts],
                    ['Reporting Pincodes', scheme.reporting_pincodes],
                    ['Average Response Rate', `${parseFloat(scheme.avg_response_rate || '0').toFixed(1)}%`],
                    ['Critical Anomalies', criticalAnomalies.toString()],
                    ['Resolved Anomalies', scheme.resolved_anomalies],
                    ['Status', scheme.is_active ? 'Active' : 'Inactive'],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '8px 8px', color: 'var(--gray-500)', fontWeight: 500 }}>{label}</td>
                      <td style={{ padding: '8px 8px', fontFamily: "'DM Mono', monospace", color: 'var(--gray-900)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
