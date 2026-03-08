'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, AreaChart, ComposedChart, Bar,
} from 'recharts'

interface TrendRow {
  date: string
  responses: number
  no_pct: number
  anomalies: number
}

type Days = 7 | 14 | 30 | 60 | 90
type ActiveSeries = { responses: boolean; no_pct: boolean; anomalies: boolean }
type ChartMode = 'line' | 'area' | 'bar'

const SERIES = [
  { key: 'responses', label: 'Responses',   color: '#22A658', yAxis: 'left'  },
  { key: 'no_pct',    label: 'Failure %',   color: '#EF4444', yAxis: 'right' },
  { key: 'anomalies', label: 'Anomalies',   color: '#F97316', yAxis: 'left'  },
] as const

// ── Custom tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5EDE8', borderRadius: 9,
      padding: '10px 13px', boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
      fontFamily: "'DM Sans', sans-serif", minWidth: 170,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#6B7280' }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, fontWeight: 600, color: '#111827' }}>
            {p.dataKey === 'no_pct' ? `${(p.value * 100).toFixed(1)}%` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Sparkline for summary cards ───────────────────────────────
function MiniSpark({ data, color, dataKey }: { data: TrendRow[]; color: string; dataKey: keyof TrendRow }) {
  const vals = data.slice(-14).map(d => ({ v: d[dataKey] as number }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={vals} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${dataKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function TrendsPage() {
  const [data, setData]       = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [days, setDays]       = useState<Days>(30)
  const [mode, setMode]       = useState<ChartMode>('line')
  const [active, setActive]   = useState<ActiveSeries>({ responses: true, no_pct: true, anomalies: true })
  const [hovered, setHovered] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analytics.dashboard.trends({ days })
      const rows: TrendRow[] = (res.data.response_trend || []).map(r => {
        const anomalyDay = (res.data.anomaly_trend || []).find(a => a.date === r.date)
        return {
          date: r.date.slice(5), // MM-DD
          responses: parseInt(r.total_responses) || 0,
          no_pct: parseFloat(r.avg_no_pct) || 0,
          anomalies: anomalyDay ? parseInt(anomalyDay.total_anomalies) || 0 : 0,
        }
      })
      setData(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trend data')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  // ── Summary stats ──────────────────────────────────────────
  const totalResponses  = data.reduce((a, d) => a + d.responses, 0)
  const totalAnomalies  = data.reduce((a, d) => a + d.anomalies, 0)
  const avgFailure      = data.length ? data.reduce((a, d) => a + d.no_pct, 0) / data.length : 0
  const peakResponses   = Math.max(...data.map(d => d.responses), 0)
  const peakDate        = data.find(d => d.responses === peakResponses)?.date ?? '-'

  // Trend delta (last 7 vs prior 7)
  const last7   = data.slice(-7)
  const prior7  = data.slice(-14, -7)
  const last7r  = last7.reduce((a, d) => a + d.responses, 0)
  const prior7r = prior7.reduce((a, d) => a + d.responses, 0)
  const delta   = prior7r > 0 ? ((last7r - prior7r) / prior7r) * 100 : 0

  // ── Chart gradient defs ────────────────────────────────────
  const gradientDefs = (
    <defs>
      {SERIES.map(s => (
        <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={s.color} stopOpacity={0.15} />
          <stop offset="95%" stopColor={s.color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  )

  const avgFailureLine = avgFailure

  return (
    <DashboardShell title="Trend Analysis" subtitle="Response and anomaly trends over time">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .tr * { box-sizing: border-box; margin: 0; padding: 0; }
        .tr   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; }

        /* toolbar */
        .tr-bar {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 9px 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .bar-l { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .bar-r { display: flex; align-items: center; gap: 6px; }
        .bar-sep { width: 1px; height: 16px; background: #E5EDE8; }
        .bar-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }

        .chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 5px; font-size: 11px; font-weight: 500;
          border: 1px solid transparent; cursor: pointer; transition: all 0.12s;
          background: #F3F4F6; color: #6B7280; font-family: 'DM Sans', sans-serif; line-height: 1.6;
        }
        .chip:hover:not(.chip-on) { background: #E9EDEA; color: #374151; }
        .chip-on { background: #163D26; color: #fff; }

        .mode-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 500;
          border: 1px solid #E5EDE8; cursor: pointer; transition: all 0.12s;
          background: #F9FAFB; color: #6B7280; font-family: 'DM Sans', sans-serif;
        }
        .mode-chip:hover:not(.mode-on) { background: #E9EDEA; }
        .mode-chip.mode-on { background: #163D26; color: #fff; border-color: #163D26; }

        .days-sel {
          padding: 3px 8px; font-size: 11px; font-weight: 500;
          border: 1px solid #E5EDE8; border-radius: 5px;
          color: #374151; background: #F9FAFB; cursor: pointer;
          font-family: 'DM Sans', sans-serif; outline: none;
        }

        /* series toggles */
        .series-toggle {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 500;
          border: 1px solid; cursor: pointer; transition: all 0.12s;
          font-family: 'DM Sans', sans-serif; user-select: none;
        }
        .series-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* summary strip */
        .tr-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

        .sum-card {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 11px 13px 8px; display: flex; flex-direction: column; gap: 2px;
        }
        .sum-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
        .sum-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .sum-val { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1; }
        .sum-sub { font-size: 10.5px; color: #9CA3AF; margin-top: 1px; }
        .delta-up   { color: #22A658; font-size: 10.5px; font-weight: 600; }
        .delta-down { color: #EF4444; font-size: 10.5px; font-weight: 600; }

        /* chart panel */
        .chart-panel {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          overflow: hidden;
        }
        .chart-head {
          padding: 10px 16px; border-bottom: 1px solid #F0F4F1;
          background: #FAFCFA; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .chart-title { font-size: 11.5px; font-weight: 600; color: #111827; }
        .chart-body  { padding: 12px 8px 8px; }

        /* table */
        .tr-table-wrap {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; overflow: hidden;
        }
        .tr-table-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          display: flex; align-items: center; justify-content: space-between;
        }
        .tr-table-title { font-size: 11px; font-weight: 600; color: #111827; }
        .tr-table-sub   { font-size: 10px; color: #9CA3AF; font-family: 'DM Mono', monospace; }

        table { width: 100%; border-collapse: collapse; }
        thead tr th {
          padding: 7px 14px; text-align: left; font-size: 9.5px; font-weight: 700;
          color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em;
          background: #FAFCFA; border-bottom: 1px solid #F0F4F1;
        }
        thead tr th:not(:first-child) { text-align: right; }
        tbody tr { border-bottom: 1px solid #F5F7F5; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #F9FAF9; }
        tbody tr td { padding: 7px 14px; font-size: 11.5px; }
        tbody tr td:not(:first-child) { text-align: right; font-family: 'DM Mono', monospace; font-size: 11px; }

        .td-date  { color: #6B7280; font-size: 11px; }
        .td-resp  { color: #111827; font-weight: 600; }
        .td-fail  { font-weight: 600; }
        .td-anom  { font-weight: 600; }

        /* inline bar (in table) */
        .inline-bar-wrap { display: flex; align-items: center; gap: 7px; justify-content: flex-end; }
        .inline-bar { height: 3px; background: #F0F0F0; border-radius: 99px; overflow: hidden; width: 48px; }
        .inline-bar-fill { height: 100%; border-radius: 99px; }

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
          background-size: 1200px 100%; animation: shimmer 1.4s infinite; border-radius: 8px;
        }
      `}</style>

      <div className="tr">

        {/* Error */}
        {error && (
          <div className="err-bar">
            <span>{error}</span>
            <button onClick={load} style={{ fontSize: 10.5, fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="tr-bar">
          <div className="bar-l">
            <span className="bar-lbl">Series</span>
            {SERIES.map(s => {
              const on = active[s.key]
              return (
                <button
                  key={s.key}
                  className="series-toggle"
                  style={{
                    borderColor: on ? s.color : '#E5E7EB',
                    background: on ? `${s.color}14` : '#F9FAFB',
                    color: on ? s.color : '#9CA3AF',
                  }}
                  onClick={() => setActive(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                >
                  <span className="series-dot" style={{ background: on ? s.color : '#D1D5DB' }} />
                  {s.label}
                </button>
              )
            })}

            <div className="bar-sep" />
            <span className="bar-lbl">View</span>
            {([['line','Line'],['area','Area'],['bar','Bar']] as [ChartMode,string][]).map(([m, l]) => (
              <button key={m} className={`mode-chip ${mode === m ? 'mode-on' : ''}`} onClick={() => setMode(m)}>
                {m === 'line' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                {m === 'area' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 17l4-8 4 4 4-6 4 4"/><path d="M3 17h18" opacity=".4"/></svg>}
                {m === 'bar'  && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="4" width="4" height="17"/></svg>}
                {l}
              </button>
            ))}
          </div>
          <div className="bar-r">
            <select className="days-sel" value={days} onChange={e => setDays(Number(e.target.value) as Days)}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* ── Summary strip ── */}
        {loading ? (
          <div className="tr-summary">{[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 80 }} />)}</div>
        ) : !error && (
          <div className="tr-summary">
            <div className="sum-card">
              <div className="sum-top">
                <span className="sum-lbl">Total Responses</span>
                <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%</span>
              </div>
              <div className="sum-val">{totalResponses.toLocaleString()}</div>
              <div className="sum-sub">vs prior period</div>
              <MiniSpark data={data} color="#22A658" dataKey="responses" />
            </div>
            <div className="sum-card">
              <div className="sum-top">
                <span className="sum-lbl">Avg Failure Rate</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: avgFailure * 100 > 20 ? '#EF4444' : '#22A658', display: 'inline-block', marginTop: 3 }} />
              </div>
              <div className="sum-val" style={{ color: avgFailure * 100 > 20 ? '#EF4444' : '#111827' }}>
                {(avgFailure * 100).toFixed(1)}%
              </div>
              <div className="sum-sub">over {days} days</div>
              <MiniSpark data={data} color="#EF4444" dataKey="no_pct" />
            </div>
            <div className="sum-card">
              <div className="sum-top">
                <span className="sum-lbl">Total Anomalies</span>
              </div>
              <div className="sum-val" style={{ color: totalAnomalies > 50 ? '#F97316' : '#111827' }}>{totalAnomalies.toLocaleString()}</div>
              <div className="sum-sub">flagged this period</div>
              <MiniSpark data={data} color="#F97316" dataKey="anomalies" />
            </div>
            <div className="sum-card">
              <div className="sum-top">
                <span className="sum-lbl">Peak Day</span>
              </div>
              <div className="sum-val" style={{ fontSize: 15, letterSpacing: 0 }}>{peakResponses.toLocaleString()}</div>
              <div className="sum-sub">{peakDate}</div>
              <div style={{ height: 32, display: 'flex', alignItems: 'flex-end', gap: 2, marginTop: 4 }}>
                {data.slice(-7).map((d, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: '2px 2px 0 0', minHeight: 2,
                    background: d.responses === peakResponses ? '#22A658' : '#E2F5EA',
                    height: `${(d.responses / (peakResponses || 1)) * 100}%`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Chart panel ── */}
        {loading ? (
          <div className="sk" style={{ height: 360 }} />
        ) : !error && (
          <div className="chart-panel">
            <div className="chart-head">
              <span className="chart-title">
                Response &amp; Anomaly Trends
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#9CA3AF', marginLeft: 8 }}>{data.length} data points</span>
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {SERIES.map(s => (
                  <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: active[s.key] ? s.color : '#D1D5DB', fontWeight: 500 }}>
                    <span style={{ width: 20, height: 2, borderRadius: 99, background: active[s.key] ? s.color : '#E5E7EB', display: 'inline-block' }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={310}>
                {mode === 'bar' ? (
                  <ComposedChart data={data} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 8)} />
                    <YAxis yAxisId="left"  tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    {active.responses && <Bar yAxisId="left"  dataKey="responses" fill="#22A658" opacity={0.8} radius={[3,3,0,0]} name="Responses" maxBarSize={20} />}
                    {active.anomalies && <Bar yAxisId="left"  dataKey="anomalies" fill="#F97316" opacity={0.8} radius={[3,3,0,0]} name="Anomalies" maxBarSize={20} />}
                    {active.no_pct   && <Line yAxisId="right" type="monotone" dataKey="no_pct" stroke="#EF4444" strokeWidth={2} dot={false} name="Failure %" />}
                    <ReferenceLine yAxisId="right" y={avgFailureLine} stroke="#EF4444" strokeDasharray="4 3" strokeOpacity={0.4} />
                  </ComposedChart>
                ) : mode === 'area' ? (
                  <ComposedChart data={data} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    {gradientDefs}
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 8)} />
                    <YAxis yAxisId="left"  tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    {active.responses && <Area yAxisId="left"  type="monotone" dataKey="responses" stroke="#22A658" strokeWidth={2} fill="url(#grad-responses)" dot={false} name="Responses" />}
                    {active.anomalies && <Area yAxisId="left"  type="monotone" dataKey="anomalies" stroke="#F97316" strokeWidth={2} fill="url(#grad-anomalies)" dot={false} name="Anomalies" />}
                    {active.no_pct   && <Area yAxisId="right" type="monotone" dataKey="no_pct"    stroke="#EF4444" strokeWidth={2} fill="url(#grad-no_pct)"   dot={false} name="Failure %" />}
                    <ReferenceLine yAxisId="right" y={avgFailureLine} stroke="#EF4444" strokeDasharray="4 3" strokeOpacity={0.4} />
                  </ComposedChart>
                ) : (
                  /* Line (default) */
                  <ComposedChart data={data} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'DM Mono,monospace' }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 8)} />
                    <YAxis yAxisId="left"  tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5EDE8', strokeWidth: 1 }} />
                    {active.responses && <Line yAxisId="left"  type="monotone" dataKey="responses" stroke="#22A658" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: '#22A658' }} name="Responses" />}
                    {active.anomalies && <Line yAxisId="left"  type="monotone" dataKey="anomalies" stroke="#F97316" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: '#F97316' }} name="Anomalies" />}
                    {active.no_pct   && <Line yAxisId="right" type="monotone" dataKey="no_pct"    stroke="#EF4444" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#EF4444' }} strokeDasharray="5 3" name="Failure %" />}
                    <ReferenceLine yAxisId="right" y={avgFailureLine} stroke="#EF4444" strokeDasharray="4 3" strokeOpacity={0.35} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Data table ── */}
        {loading ? (
          <div className="sk" style={{ height: 200 }} />
        ) : !error && data.length > 0 && (
          <div className="tr-table-wrap">
            <div className="tr-table-head">
              <span className="tr-table-title">Recent Data</span>
              <span className="tr-table-sub">last {Math.min(10, data.length)} entries</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Responses</th>
                  <th>Failure %</th>
                  <th>Anomalies</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).reverse().map((d, i, arr) => {
                  const failPct     = d.no_pct * 100
                  const failColor   = failPct > 25 ? '#EF4444' : failPct > 15 ? '#F97316' : '#22A658'
                  const anomColor   = d.anomalies > 10 ? '#F97316' : d.anomalies > 0 ? '#F59E0B' : '#22A658'
                  const maxResp     = Math.max(...data.map(x => x.responses), 1)
                  const respBarPct  = (d.responses / maxResp) * 100
                  const prevResp    = arr[i + 1]?.responses ?? d.responses
                  const respDelta   = prevResp > 0 ? ((d.responses - prevResp) / prevResp) * 100 : 0

                  return (
                    <tr key={d.date}>
                      <td className="td-date">{d.date}</td>
                      <td>
                        <div className="inline-bar-wrap">
                          <span className="td-resp">{d.responses.toLocaleString()}</span>
                          <div className="inline-bar">
                            <div className="inline-bar-fill" style={{ width: `${respBarPct}%`, background: '#22A658' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="td-fail" style={{ color: failColor }}>{failPct.toFixed(1)}%</span>
                      </td>
                      <td>
                        <span className="td-anom" style={{ color: anomColor }}>{d.anomalies}</span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: respDelta >= 0 ? '#22A658' : '#EF4444',
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                        }}>
                          {respDelta >= 0 ? '↑' : '↓'} {Math.abs(respDelta).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}