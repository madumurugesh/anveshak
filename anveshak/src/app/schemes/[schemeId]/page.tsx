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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
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

type Days = 7 | 30 | 60 | 90

// ── Custom chart tooltip ─────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5EDE8', borderRadius: 9,
      padding: '10px 13px', boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
      fontFamily: "'DM Sans', sans-serif", minWidth: 150,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#6B7280' }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, fontWeight: 600, color: '#111827' }}>
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SchemeDetailPage() {
  const params = useParams()
  const schemeId = params.schemeId as string
  const apiSchemeId = SCHEME_ID_MAP[schemeId] || schemeId.toUpperCase()
  const color = SCHEME_COLORS[schemeId] || '#22A658'

  const [scheme, setScheme] = useState<AnalyticsSchemeOverview | null>(null)
  const [trends, setTrends] = useState<{ date: string; responses: number; noCount: number; yesCount: number; noPct: number }[]>([])
  const [days, setDays] = useState<Days>(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [schemesRes, trendsRes] = await Promise.all([
          analytics.schemes.list({ days }),
          analytics.dashboard.trends({ days, scheme_id: apiSchemeId }),
        ])
        if (!alive) return

        const match = (schemesRes.data ?? []).find(s => s.scheme_id === apiSchemeId)
        if (match) setScheme(match)

        const trendData = (trendsRes.data?.response_trend ?? []).map(t => ({
          date: t.date.slice(5),
          responses: parseInt(t.total_responses) || 0,
          yesCount: parseInt(t.yes_count) || 0,
          noCount: parseInt(t.no_count) || 0,
          noPct: (parseFloat(t.avg_no_pct) || 0) * 100,
        }))
        setTrends(trendData)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load scheme data')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [apiSchemeId, days])

  const schemeName = scheme?.scheme_name_en || schemeId.replace(/-/g, ' ').toUpperCase()
  const totalResponses = parseInt(scheme?.total_responses || '0')
  const totalYes = parseInt(scheme?.total_yes || '0')
  const totalNo = parseInt(scheme?.total_no || '0')
  const avgNoPct = parseFloat(scheme?.avg_no_pct || '0') * 100
  const avgRespRate = parseFloat(scheme?.avg_response_rate || '0') * 100
  const totalBeneficiaries = parseInt(scheme?.total_beneficiaries || '0')
  const activeBeneficiaries = parseInt(scheme?.active_beneficiaries || '0')
  const anomalyCount = parseInt(scheme?.anomaly_count || '0')
  const criticalAnomalies = parseInt(scheme?.critical_anomalies || '0')
  const resolvedAnomalies = parseInt(scheme?.resolved_anomalies || '0')
  const reportingDistricts = parseInt(scheme?.reporting_districts || '0')

  const pieData = [
    { name: 'YES', value: totalYes, color },
    { name: 'NO', value: totalNo, color: '#EF4444' },
  ]

  // Radial gauge for response rate
  const gaugeData = [{ name: 'Rate', value: avgRespRate, fill: color }]

  // Anomaly breakdown for horizontal bar
  const anomalyBarData = [
    { name: 'Critical', value: criticalAnomalies, fill: '#EF4444' },
    { name: 'Open', value: Math.max(anomalyCount - criticalAnomalies - resolvedAnomalies, 0), fill: '#F97316' },
    { name: 'Resolved', value: resolvedAnomalies, fill: '#22A658' },
  ]

  // Beneficiary breakdown
  const inactiveBen = totalBeneficiaries - activeBeneficiaries
  const benData = [
    { name: 'Active', value: activeBeneficiaries, color: '#22A658' },
    { name: 'Inactive', value: inactiveBen > 0 ? inactiveBen : 0, color: '#D1D5DB' },
  ]

  function fmt(n: number) {
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <DashboardShell title={schemeName} subtitle={`Scheme Performance · Last ${days} Days`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .sd * { box-sizing: border-box; margin: 0; padding: 0; }
        .sd   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; }

        /* toolbar */
        .sd-bar {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 9px 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .bar-l { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .bar-r { display: flex; align-items: center; gap: 6px; }
        .bar-sep { width: 1px; height: 16px; background: #E5EDE8; }

        .stat-pill {
          display: flex; align-items: center; gap: 4px; padding: 3px 9px;
          background: #F5F7F5; border: 1px solid #E5EDE8; border-radius: 5px; font-size: 11px;
        }
        .spv { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 11.5px; color: #111827; }
        .spk { color: #9CA3AF; }

        .days-sel {
          padding: 3px 8px; font-size: 11px; font-weight: 500;
          border: 1px solid #E5EDE8; border-radius: 5px;
          color: #374151; background: #F9FAFB; cursor: pointer;
          font-family: 'DM Sans', sans-serif; outline: none;
        }

        .status-tag {
          display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
          border-radius: 5px; font-size: 10.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .st-active   { background: #F0FAF3; color: #166534; }
        .st-inactive { background: #FEF2F2; color: #DC2626; }

        /* summary strip */
        .sd-summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }

        .sum-card {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
        }
        .sum-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .sum-val { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1; }
        .sum-sub { font-size: 10.5px; color: #9CA3AF; }

        /* chart panels */
        .panel {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; overflow: hidden;
        }
        .panel-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-title { font-size: 11px; font-weight: 600; color: #111827; }
        .panel-sub   { font-size: 10px; color: #9CA3AF; font-family: 'DM Mono', monospace; }
        .panel-body  { padding: 12px 14px; }

        /* details grid */
        .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .detail-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: #FAFCFA; border-radius: 7px; }
        .det-lbl { font-size: 9.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .det-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #111827; }

        /* donut center label */
        .donut-center {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center; pointer-events: none;
        }
        .donut-center-val { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 600; color: #111827; }
        .donut-center-lbl { font-size: 9.5px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em; }

        /* anomaly bars */
        .anom-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
        .anom-label { font-size: 11px; color: #6B7280; width: 64px; flex-shrink: 0; }
        .anom-bar { flex: 1; height: 6px; background: #F0F0F0; border-radius: 99px; overflow: hidden; }
        .anom-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
        .anom-val { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: #111827; width: 32px; text-align: right; }

        /* error */
        .err-bar {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
          padding: 10px 14px; font-size: 12px; color: #DC2626;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* skeleton */
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .sk {
          background: linear-gradient(90deg,#F0F0F0 25%,#E8E8E8 50%,#F0F0F0 75%);
          background-size: 1200px 100%; animation: shimmer 1.4s infinite; border-radius: 6px;
        }
      `}</style>

      <div className="sd">

        {error && (
          <div className="err-bar">
            <span>{error}</span>
            <button
              style={{ fontSize: 10.5, fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              onClick={() => setDays(d => d)}
            >Retry</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="sd-bar">
          <div className="bar-l">
            <span className={`status-tag ${scheme?.is_active ? 'st-active' : 'st-inactive'}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: scheme?.is_active ? '#22A658' : '#EF4444', display: 'inline-block' }} />
              {scheme?.is_active ? 'Active' : 'Inactive'}
            </span>
            {scheme?.scheme_name_ta && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{scheme.scheme_name_ta}</span>
            )}
          </div>
          <div className="bar-r">
            {!loading && !error && scheme && (
              <>
                <div className="stat-pill">
                  <span className="spv">{reportingDistricts}</span>
                  <span className="spk">districts</span>
                </div>
                <div className="stat-pill">
                  <span className="spv">{scheme.reporting_pincodes ?? 0}</span>
                  <span className="spk">pincodes</span>
                </div>
                <div className="stat-pill">
                  <span className="spv" style={{ color: criticalAnomalies > 0 ? '#EF4444' : '#22A658' }}>{criticalAnomalies}</span>
                  <span className="spk">critical</span>
                </div>
                <div className="bar-sep" />
              </>
            )}
            <select className="days-sel" value={days} onChange={e => setDays(Number(e.target.value) as Days)}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        {loading ? (
          <div className="sd-summary">
            {[1,2,3,4,5,6].map(i => <div key={i} className="sk" style={{ height: 72 }} />)}
          </div>
        ) : !error && scheme && (
          <div className="sd-summary">
            {[
              { lbl: 'Total Responses', val: fmt(totalResponses), sub: `${fmt(totalYes)} yes · ${fmt(totalNo)} no`, color: '#111827' },
              { lbl: 'Beneficiaries',    val: fmt(totalBeneficiaries), sub: `${fmt(activeBeneficiaries)} active`, color: '#4285F4' },
              { lbl: 'Failure Rate',     val: `${avgNoPct.toFixed(1)}%`, sub: 'avg rejection', color: avgNoPct > 20 ? '#EF4444' : avgNoPct > 10 ? '#F97316' : '#22A658' },
              { lbl: 'Response Rate',    val: `${avgRespRate.toFixed(1)}%`, sub: 'avg across districts', color: avgRespRate > 60 ? '#22A658' : '#F97316' },
              { lbl: 'Open Anomalies',   val: anomalyCount.toString(), sub: `${criticalAnomalies} critical`, color: anomalyCount > 0 ? '#EF4444' : '#22A658' },
              { lbl: 'Resolved',         val: resolvedAnomalies.toString(), sub: anomalyCount > 0 ? `${((resolvedAnomalies / (anomalyCount + resolvedAnomalies)) * 100).toFixed(0)}% rate` : '—', color: '#22A658' },
            ].map(({ lbl, val, sub, color: c }) => (
              <div key={lbl} className="sum-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="sum-lbl">{lbl}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                </div>
                <div className="sum-val" style={{ color: c }}>{val}</div>
                <div className="sum-sub">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── ROW 1: Response Trend (Area) + Failure % (Bar) ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="sk" style={{ height: 260 }} />
            <div className="sk" style={{ height: 260 }} />
          </div>
        ) : !error && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Area chart — response volume */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Response Volume</span>
                <span className="panel-sub">{trends.length} days</span>
              </div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trends} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gResp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="responses" stroke={color} strokeWidth={2} fill="url(#gResp)" name="Responses" />
                    <Area type="monotone" dataKey="noCount" stroke="#EF4444" strokeWidth={1.5} fill="#EF4444" fillOpacity={0.06} name="Rejections" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar chart — daily failure % */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Daily Failure Rate</span>
                <span className="panel-sub">% NO responses</span>
              </div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="noPct" name="Failure %" radius={[3, 3, 0, 0]} maxBarSize={14}>
                      {trends.map((t, i) => (
                        <Cell key={i} fill={t.noPct > 25 ? '#EF4444' : t.noPct > 15 ? '#F97316' : '#22A658'} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── ROW 2: Response Donut + Response Rate Gauge + Anomaly Breakdown ── */}
        {!loading && !error && scheme && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* Donut — YES/NO split */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Response Split</span>
              </div>
              <div className="panel-body" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" strokeWidth={2} stroke="#fff">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <div className="donut-center-val">{totalResponses > 0 ? `${((totalYes / totalResponses) * 100).toFixed(0)}%` : '—'}</div>
                  <div className="donut-center-lbl">Success</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                  {pieData.map(d => (
                    <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#6B7280' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#111827' }}>{fmt(d.value)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Radial gauge — response rate */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Response Rate</span>
              </div>
              <div className="panel-body" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={170}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={gaugeData} barSize={12}>
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F0F4F1' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 600, color: '#111827' }}>
                    {avgRespRate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 9.5, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Rate</div>
                </div>
              </div>
            </div>

            {/* Anomaly breakdown bars */}
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Anomaly Breakdown</span>
                <span className="panel-sub">{anomalyCount + resolvedAnomalies} total</span>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 170 }}>
                {anomalyBarData.map(d => {
                  const total = anomalyCount + resolvedAnomalies
                  const pct = total > 0 ? (d.value / total) * 100 : 0
                  return (
                    <div key={d.name} className="anom-row">
                      <span className="anom-label">{d.name}</span>
                      <div className="anom-bar">
                        <div className="anom-fill" style={{ width: `${pct}%`, background: d.fill }} />
                      </div>
                      <span className="anom-val">{d.value}</span>
                    </div>
                  )
                })}
                {/* Beneficiary mini donut */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F0F4F1', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 48, height: 48 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={benData} cx="50%" cy="50%" innerRadius={14} outerRadius={22} dataKey="value" strokeWidth={1.5} stroke="#fff">
                          {benData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Beneficiaries</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {fmt(activeBeneficiaries)} <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}>/ {fmt(totalBeneficiaries)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ROW 3: Scheme Details Grid ── */}
        {!loading && !error && scheme && (
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Scheme Metadata</span>
            </div>
            <div className="panel-body">
              <div className="detail-grid">
                {[
                  { lbl: 'Total Beneficiaries', val: fmt(totalBeneficiaries) },
                  { lbl: 'Active Beneficiaries', val: fmt(activeBeneficiaries) },
                  { lbl: 'Reporting Districts', val: scheme.reporting_districts ?? '0' },
                  { lbl: 'Reporting Pincodes', val: scheme.reporting_pincodes ?? '0' },
                  { lbl: 'Avg Response Rate', val: `${avgRespRate.toFixed(1)}%` },
                  { lbl: 'Avg Failure Rate', val: `${avgNoPct.toFixed(1)}%` },
                  { lbl: 'Critical Anomalies', val: criticalAnomalies.toString() },
                  { lbl: 'Resolved Anomalies', val: resolvedAnomalies.toString() },
                ].map(d => (
                  <div key={d.lbl} className="detail-item">
                    <span className="det-lbl">{d.lbl}</span>
                    <span className="det-val">{d.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
