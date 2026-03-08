'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useDashboardStore } from '@/store/dashboardStore'
import DashboardShell from '@/components/DashboardShell'
import AlertsPanel from '@/components/AlertsPanel'
import SchemeChart from '@/components/SchemeChart'
import SkeletonLoader from '@/components/SkeletonLoader'
import { SCHEME_META } from '@/app/geo/hotspot-map/page'
import type { AnalyticsHeatmapCell } from '@/types/api'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-50 rounded-lg h-[300px] animate-pulse border border-gray-100" />
  ),
})

type TimeRange = '7d' | '30d' | '6m' | '12m'

const SCHEME_COLORS: Record<string, string> = {
  PM_KISAN: '#22A658',
  OLD_AGE_PENSION: '#F9AB00',
  PDS: '#4285F4',
  LPG: '#EA4335',
}

function formatCount(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function DashboardPage() {
  const { fetchAll } = useDashboardData()
  useWebSocket()

  const isLoading = useDashboardStore((s) => s.isLoading)
  const error = useDashboardStore((s) => s.error)
  const summary = useDashboardStore((s) => s.summary)
  const overview = useDashboardStore((s) => s.overview)
  const schemes = useDashboardStore((s) => s.schemes)
  const heatmapData = useDashboardStore((s) => s.heatmapData)
  const heatmapCells = useDashboardStore((s) => s.heatmapCells)
  const alerts = useDashboardStore((s) => s.alerts)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [selectedCell, setSelectedCell] = useState<AnalyticsHeatmapCell | null>(null)

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '6m', label: '6M' },
    { key: '12m', label: '1Y' },
  ]

  const topDistricts = [...heatmapData]
    .sort((a, b) => b.responseVolume - a.responseVolume)
    .slice(0, 5)

  // Compute alert severity breakdown from real data
  const severityBreakdown = alerts.reduce(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const severityPieData = [
    { name: 'HIGH', value: severityBreakdown['HIGH'] || 0, color: '#EF4444' },
    { name: 'MEDIUM', value: severityBreakdown['MEDIUM'] || 0, color: '#F9AB00' },
    { name: 'LOW', value: severityBreakdown['LOW'] || 0, color: '#22A658' },
  ].filter((d) => d.value > 0)

  // Live date
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // KPI values from API overview
  const totalBeneficiaries = parseInt(overview?.beneficiaries?.total_beneficiaries || '0')
  const totalResponses = parseInt(overview?.responses?.total_responses || '0')
  const totalAnomalies = parseInt(overview?.anomalies?.total_anomalies || '0')
  const avgNoPct = parseFloat(overview?.responses?.avg_no_pct || '0')
  const districtsReporting = parseInt(overview?.responses?.districts_reporting || '0')

  return (
    <DashboardShell>
      <style>{`
        .divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }
        .refresh-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 50;
          width: 40px;
          height: 40px;
          background: var(--green-700);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(13,43,26,0.25);
          transition: all 0.2s;
        }
        .refresh-fab:hover {
          background: var(--green-800);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(13,43,26,0.3);
        }
        .error-bar {
          margin-bottom: 12px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          color: #DC2626;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>

          {/* Page Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', letterSpacing: '-0.01em' }}>
                  Welfare Scheme Monitor
                </h1>
                <span className="badge badge-green">
                  <span className="status-dot dot-green" style={{ width: 5, height: 5, marginRight: 3, display: 'inline-block', verticalAlign: 'middle', borderRadius: '50%', background: 'var(--green-600)' }} />
                  Live
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                {dateStr} · {schemes.length} Active Schemes · {districtsReporting} Districts Reporting
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="icon-btn" style={{ background: 'var(--green-700)', color: 'white' }}
                onClick={() => { useDashboardStore.getState().setLastFetched(0); fetchAll(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="error-bar">
              <span>{error}</span>
              <button
                onClick={() => { useDashboardStore.getState().setLastFetched(0); fetchAll(); }}
                style={{ fontSize: 10.5, fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
              >Retry</button>
            </div>
          )}

          {isLoading ? <SkeletonLoader /> : (
            <>
              {/* ── ROW 1: KPI STRIP ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
                {[
                  { label: 'Total Beneficiaries', value: formatCount(totalBeneficiaries), dot: 'dot-green', sub: 'All Schemes' },
                  { label: 'Active Alerts', value: totalAnomalies, dot: 'dot-accent', sub: 'Last 7 days' },
                  { label: 'Total Responses', value: formatCount(totalResponses), dot: 'dot-green', sub: 'This Period' },
                  { label: 'Avg Failure Rate', value: `${avgNoPct.toFixed(1)}%`, dot: avgNoPct > 10 ? 'dot-accent' : 'dot-green', sub: 'Across Schemes' },
                  { label: 'Districts Reporting', value: districtsReporting, dot: 'dot-green', sub: 'Active Coverage' },
                ].map((kpi) => (
                  <div key={kpi.label} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
                      <span className={`status-dot ${kpi.dot}`} />
                    </div>
                    <div className="stat-number">{kpi.value}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span className="stat-label">{kpi.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── ROW 2: Geographic Distribution (MAP) ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500 }}>Geographic Distribution</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span className="badge badge-gray">District-Level</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10, marginBottom: 16 }}>
                {/* Map */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Responses by District</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[{ color: '#22A658', label: 'High' }, { color: '#7DDEA0', label: 'Med' }, { color: '#E2F5EA', label: 'Low' }].map(l => (
                          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: 'var(--gray-500)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                            {l.label}
                          </span>
                        ))}
                      </div>
                      <Link href="/geo/hotspot-map" className="link-arrow">
                        Full Map
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </Link>
                    </div>
                  </div>
                  <div style={{ padding: '0 16px 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16 }}>
                      <div style={{ minHeight: 280 }}>
                        <LeafletMap
                          cells={heatmapCells}
                          selected={selectedCell}
                          onSelect={setSelectedCell}
                          schemeMap={SCHEME_META}
                        />
                      </div>
                      <div>
                        <p className="section-label">Top 5 Districts</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {topDistricts.map((d, i) => (
                            <div key={d.districtId}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-700)' }}>{d.districtName}</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: 'var(--gray-500)' }}>{d.responseVolume.toLocaleString()}</span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${topDistricts[0]?.responseVolume ? (d.responseVolume / topDistricts[0].responseVolume) * 100 : 0}%`,
                                    background: ['#22A658','#1E7A45','#34A853','#4CC97A','#7DDEA0'][i],
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights / Alerts Panel */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header">
                    <span className="card-title">Insights</span>
                    <span className="badge badge-accent">
                      {summary?.activeAlerts ?? 0} New
                    </span>
                  </div>
                  <div style={{ padding: '0 16px', flex: 1 }}>
                    <AlertsPanel />
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <Link href="/analytics/anomalies" className="link-arrow">
                        View all insights
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ROW 3: Chart + Alert Severity Donut ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 10, marginBottom: 12 }}>
                {/* Scheme Performance Chart */}
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="card-title">Scheme Performance</span>
                      <div style={{ display: 'flex', gap: 12, marginLeft: 4 }}>
                        {schemes.map((s) => (
                          <span key={s.scheme_id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--gray-500)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: SCHEME_COLORS[s.scheme_id] || '#888', display: 'inline-block', flexShrink: 0 }} />
                            {s.scheme_name_en || s.scheme_id}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div className="pill-tabs">
                        {ranges.map((r) => (
                          <button
                            key={r.key}
                            onClick={() => setTimeRange(r.key)}
                            className={`pill-tab ${timeRange === r.key ? 'active' : ''}`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 16px 14px' }}>
                    <SchemeChart />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Link href="/analytics/scheme" className="link-arrow">
                        View real-time
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Alert Severity Donut */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header">
                    <span className="card-title">Alert Severity</span>
                    <span className="badge badge-gray">7 Days</span>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                      <div className="stat-number">{totalAnomalies}</div>
                    </div>
                    <div className="stat-label" style={{ marginBottom: 8 }}>Total alerts this week</div>

                    {/* Donut Chart */}
                    {severityPieData.length > 0 ? (
                      <div style={{ marginBottom: 12 }}>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie
                              data={severityPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={58}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {severityPieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 11 }}>
                        No alerts
                      </div>
                    )}

                    <div className="divider" style={{ marginBottom: 10 }} />

                    {/* Severity breakdown from real data */}
                    {[
                      { label: 'Critical / High', count: (parseInt(overview?.anomalies?.critical || '0') + parseInt(overview?.anomalies?.high || '0')), color: '#EF4444' },
                      { label: 'Medium', count: parseInt(overview?.anomalies?.medium || '0'), color: '#F9AB00' },
                      { label: 'Low', count: parseInt(overview?.anomalies?.low || '0'), color: '#22A658' },
                    ].map((a) => (
                      <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="status-dot" style={{ background: a.color }} />
                          <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>{a.label}</span>
                        </div>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: 'var(--gray-900)' }}>{a.count}</span>
                      </div>
                    ))}

                    <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <p className="section-label" style={{ marginBottom: 6 }}>Top Districts</p>
                      {topDistricts.slice(0, 3).map((d) => (
                        <div key={d.districtId} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10.5 }}>
                          <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{d.districtName}</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gray-500)' }}>{d.responseVolume.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ROW 4: Scheme Status Table (from API data) ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <span className="card-title">Scheme Status Overview</span>
                  <span className="badge badge-gray">As of today</span>
                </div>
                <div style={{ padding: '0 16px 14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Scheme', 'Beneficiaries', 'Responses', 'Failure Rate', 'Open Anomalies', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schemes.map((s, i) => {
                        const color = SCHEME_COLORS[s.scheme_id] || '#888'
                        const anomalies = parseInt(s.anomaly_count || '0')
                        const failRate = parseFloat(s.avg_no_pct || '0')
                        return (
                          <tr key={s.scheme_id} style={{ borderBottom: i < schemes.length - 1 ? '1px solid var(--gray-100)' : 'none', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-50)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '8px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ width: 8, height: 24, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                                <Link href={`/schemes/${s.scheme_id.toLowerCase().replace(/_/g, '-')}`} style={{ fontWeight: 600, color: 'var(--gray-900)', textDecoration: 'none' }}>
                                  {s.scheme_name_en || s.scheme_id}
                                </Link>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', fontFamily: "'DM Mono', monospace", color: 'var(--gray-700)' }}>
                              {formatCount(parseInt(s.total_beneficiaries || '0'))}
                            </td>
                            <td style={{ padding: '8px 8px', fontFamily: "'DM Mono', monospace", color: 'var(--gray-700)' }}>
                              {formatCount(parseInt(s.total_responses || '0'))}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div className="progress-bar" style={{ width: 60 }}>
                                  <div className="progress-fill" style={{ width: `${Math.min(failRate, 100)}%`, background: failRate > 15 ? '#EF4444' : color }} />
                                </div>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{failRate.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              {anomalies > 0 ? (
                                <span className="badge badge-accent">{anomalies}</span>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--green-600)', fontWeight: 500 }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: s.is_active ? 'var(--green-100)' : '#FEF3C7',
                                  color: s.is_active ? 'var(--green-700)' : '#92400E',
                                }}
                              >
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {schemes.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', fontSize: 12 }}>
                            No scheme data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

      {/* ── Refresh FAB ── */}
      <button
        onClick={() => { useDashboardStore.getState().setLastFetched(0); fetchAll(); }}
        className="refresh-fab"
        title="Refresh data"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
      </button>
    </DashboardShell>
  )
}