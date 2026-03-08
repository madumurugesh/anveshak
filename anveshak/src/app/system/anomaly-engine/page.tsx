'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { anomalyEngine, analytics } from '@/lib/apiClients'
import type { AnomalyStats, AnalyticsAiUsageSummary } from '@/types/api'

export default function AnomalyEnginePage() {
  const [stats, setStats] = useState<AnomalyStats | null>(null)
  const [aiUsage, setAiUsage] = useState<AnalyticsAiUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      anomalyEngine.stats(),
      analytics.ai.usage().catch(() => null),
    ])
      .then(([statsRes, aiRes]) => {
        if (!alive) return
        setStats(statsRes)
        if (aiRes?.data) setAiUsage(aiRes.data.summary)
      })
      .catch(() => { if (alive) setError('Failed to load anomaly engine status') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Derived values
  const a = stats?.anomalies
  const o = stats?.openai_usage
  const totalAnom = a ? parseInt(a.total_anomalies) : 0
  const classified = a ? parseInt(a.classified) : 0
  const pending = a ? parseInt(a.pending) : 0
  const avgConf = a?.avg_confidence ? (parseFloat(a.avg_confidence) * 100).toFixed(1) : '—'
  const totalCost = o ? parseFloat(o.total_cost_usd).toFixed(4) : '0'
  const avgLatency = o?.avg_latency_ms ? parseFloat(o.avg_latency_ms).toFixed(0) : '—'
  const totalTokens = o ? parseInt(o.total_tokens) : 0
  const totalCalls = o ? parseInt(o.total_calls) : 0
  const successCalls = o ? parseInt(o.successful_calls) : 0
  const classifiedPct = totalAnom > 0 ? ((classified / totalAnom) * 100).toFixed(1) : '0'

  const breakdown = a ? [
    { label: 'Supply Failure',  val: parseInt(a.supply_failure),  color: '#4285F4', bg: '#EFF6FF' },
    { label: 'Demand Collapse', val: parseInt(a.demand_collapse), color: '#F97316', bg: '#FFF7ED' },
    { label: 'Fraud Pattern',   val: parseInt(a.fraud_pattern),   color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Data Artifact',   val: parseInt(a.data_artifact),   color: '#8B5CF6', bg: '#F5F3FF' },
  ] : []

  const breakdownMax = Math.max(...breakdown.map(b => b.val), 1)

  return (
    <DashboardShell title="Anomaly Engine" subtitle="ML-powered anomaly detection engine health &amp; usage">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .ae * { box-sizing: border-box; margin: 0; padding: 0; }
        .ae   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; }

        /* ── status bar ── */
        .ae-status {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 9px 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .ae-status-l { display: flex; align-items: center; gap: 8px; }
        .ae-status-r { display: flex; align-items: center; gap: 6px; }
        .ae-dot { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; animation: ae-pulse 2s infinite; }
        @keyframes ae-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ae-status-txt { font-size: 12px; font-weight: 600; color: #166534; }
        .ae-window { font-size: 10px; font-family: 'DM Mono', monospace; color: #9CA3AF; padding: 2px 8px; background: #F5F7F5; border: 1px solid #E5EDE8; border-radius: 4px; }

        .ae-pill {
          display: flex; align-items: center; gap: 4px; padding: 3px 9px;
          background: #F5F7F5; border: 1px solid #E5EDE8; border-radius: 5px; font-size: 11px;
        }
        .ae-pv { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 11.5px; color: #111827; }
        .ae-pk { color: #9CA3AF; }
        .ae-sep { width: 1px; height: 16px; background: #E5EDE8; }

        /* ── KPI strip ── */
        .ae-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .ae-kpi {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
        }
        .ae-kpi-head { display: flex; align-items: center; justify-content: space-between; }
        .ae-kpi-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .ae-kpi-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .ae-kpi-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; letter-spacing: -0.02em; line-height: 1; }
        .ae-kpi-sub { font-size: 10.5px; color: #9CA3AF; }

        /* ── panels grid ── */
        .ae-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; min-height: 0; }
        @media (max-width: 860px) { .ae-panels { grid-template-columns: 1fr; } }

        .ae-panel {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .ae-panel-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ae-panel-title { font-size: 11px; font-weight: 600; color: #111827; }
        .ae-panel-sub   { font-size: 10px; color: #9CA3AF; font-family: 'DM Mono', monospace; }
        .ae-panel-body  { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 12px; }

        /* breakdown bars */
        .ae-bk-row {
          display: flex; align-items: center; gap: 10px;
        }
        .ae-bk-label { font-size: 11px; font-weight: 500; color: #374151; width: 110px; flex-shrink: 0; }
        .ae-bk-bar-wrap { flex: 1; height: 6px; background: #F0F0F0; border-radius: 99px; overflow: hidden; }
        .ae-bk-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(.4,0,.2,1); }
        .ae-bk-val { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: #111827; width: 36px; text-align: right; }

        /* usage stats grid */
        .ae-usage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ae-usage-item {
          background: #FAFCFA; border: 1px solid #F0F4F1; border-radius: 8px; padding: 10px 12px;
        }
        .ae-usage-lbl { font-size: 9.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .ae-usage-val { font-family: 'DM Mono', monospace; font-size: 15px; font-weight: 500; color: #111827; }
        .ae-usage-sub { font-size: 10px; color: #9CA3AF; margin-top: 2px; }

        /* progress ring */
        .ae-ring-wrap { display: flex; align-items: center; gap: 14px; padding: 4px 0; }
        .ae-ring-label { display: flex; flex-direction: column; gap: 2px; }
        .ae-ring-main { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 500; color: #111827; }
        .ae-ring-sub  { font-size: 10px; color: #9CA3AF; }

        /* latency bar */
        .ae-lat-row { display: flex; align-items: center; gap: 8px; }
        .ae-lat-label { font-size: 10px; font-weight: 600; color: #9CA3AF; width: 28px; text-transform: uppercase; }
        .ae-lat-bar { flex: 1; height: 4px; background: #F0F0F0; border-radius: 99px; overflow: hidden; }
        .ae-lat-fill { height: 100%; border-radius: 99px; background: #22A658; transition: width 0.5s; }
        .ae-lat-val { font-family: 'DM Mono', monospace; font-size: 10.5px; font-weight: 600; color: #111827; width: 48px; text-align: right; }

        /* error */
        .ae-err {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
          padding: 10px 14px; font-size: 12px; color: #DC2626;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ae-retry {
          font-size: 10.5px; font-weight: 500; text-decoration: underline; background: none;
          border: none; color: #DC2626; cursor: pointer; font-family: 'DM Sans', sans-serif;
        }

        /* shimmer */
        @keyframes ae-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .ae-sk {
          background: linear-gradient(90deg,#F0F0F0 25%,#E8E8E8 50%,#F0F0F0 75%);
          background-size: 1200px 100%; animation: ae-shimmer 1.4s infinite; border-radius: 6px;
        }
      `}</style>

      <div className="ae">

        {/* Error */}
        {error && (
          <div className="ae-err">
            <span>{error}</span>
            <button className="ae-retry" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* ── Status bar ── */}
        {loading ? (
          <div className="ae-sk" style={{ height: 38 }} />
        ) : stats && (
          <div className="ae-status">
            <div className="ae-status-l">
              <div className="ae-dot" />
              <span className="ae-status-txt">Engine Running</span>
              <span className="ae-window">{stats.window}</span>
            </div>
            <div className="ae-status-r">
              <div className="ae-pill"><span className="ae-pv">{totalCalls.toLocaleString()}</span><span className="ae-pk">API calls</span></div>
              <div className="ae-pill"><span className="ae-pv" style={{ color: '#22A658' }}>{successCalls.toLocaleString()}</span><span className="ae-pk">success</span></div>
              <div className="ae-sep" />
              <div className="ae-pill"><span className="ae-pv" style={{ color: '#4285F4' }}>${totalCost}</span><span className="ae-pk">cost</span></div>
            </div>
          </div>
        )}

        {/* ── KPI strip ── */}
        {loading ? (
          <div className="ae-kpis">{[1,2,3,4].map(i => <div key={i} className="ae-sk" style={{ height: 72 }} />)}</div>
        ) : stats && (
          <div className="ae-kpis">
            {[
              { lbl: 'Total Anomalies', val: totalAnom.toLocaleString(),  sub: `${classified} classified`,         color: '#111827' },
              { lbl: 'Classified',       val: `${classifiedPct}%`,         sub: `${pending} pending`,               color: '#22A658' },
              { lbl: 'Avg Confidence',   val: `${avgConf}%`,              sub: 'AI detection score',               color: '#4285F4' },
              { lbl: 'Avg Latency',      val: `${avgLatency}ms`,          sub: `${totalTokens.toLocaleString()} tokens`, color: '#F97316' },
            ].map(({ lbl, val, sub, color }) => (
              <div key={lbl} className="ae-kpi">
                <div className="ae-kpi-head">
                  <span className="ae-kpi-lbl">{lbl}</span>
                  <span className="ae-kpi-dot" style={{ background: color }} />
                </div>
                <div className="ae-kpi-val" style={{ color }}>{val}</div>
                <div className="ae-kpi-sub">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 2-col panels ── */}
        {loading ? (
          <div className="ae-panels">
            <div className="ae-sk" style={{ height: 260 }} />
            <div className="ae-sk" style={{ height: 260 }} />
          </div>
        ) : stats && (
          <div className="ae-panels">

            {/* Left: Classification Breakdown */}
            <div className="ae-panel">
              <div className="ae-panel-head">
                <span className="ae-panel-title">Classification Breakdown</span>
                <span className="ae-panel-sub">{classified} classified</span>
              </div>
              <div className="ae-panel-body">
                {breakdown.map(b => (
                  <div key={b.label} className="ae-bk-row">
                    <span className="ae-bk-label">{b.label}</span>
                    <div className="ae-bk-bar-wrap">
                      <div className="ae-bk-bar-fill" style={{ width: `${(b.val / breakdownMax) * 100}%`, background: b.color }} />
                    </div>
                    <span className="ae-bk-val">{b.val}</span>
                  </div>
                ))}

                {/* Donut-style ring visual */}
                <div className="ae-ring-wrap" style={{ marginTop: 4 }}>
                  <svg width="54" height="54" viewBox="0 0 54 54">
                    {(() => {
                      const total = breakdown.reduce((s, b) => s + b.val, 0) || 1
                      const r = 22; const cx = 27; const cy = 27; const circ = 2 * Math.PI * r
                      let offset = 0
                      return breakdown.map(b => {
                        const pct = b.val / total
                        const dash = circ * pct
                        const gap = circ - dash
                        const el = (
                          <circle key={b.label} cx={cx} cy={cy} r={r}
                            fill="none" stroke={b.color} strokeWidth="5"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{ transition: 'all 0.6s' }} />
                        )
                        offset += dash
                        return el
                      })
                    })()}
                    <circle cx="27" cy="27" r="16" fill="#fff" />
                    <text x="27" y="29" textAnchor="middle" fontSize="11" fontWeight="600" fontFamily="DM Mono, monospace" fill="#111827">
                      {classified}
                    </text>
                  </svg>
                  <div className="ae-ring-label">
                    <span className="ae-ring-main">{classifiedPct}%</span>
                    <span className="ae-ring-sub">classification rate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: OpenAI / AI Usage */}
            <div className="ae-panel">
              <div className="ae-panel-head">
                <span className="ae-panel-title">{aiUsage ? 'AI Usage — Combined' : 'OpenAI Usage'}</span>
                <span className="ae-panel-sub">${totalCost} total</span>
              </div>
              <div className="ae-panel-body">
                <div className="ae-usage-grid">
                  <div className="ae-usage-item">
                    <div className="ae-usage-lbl">Total Cost</div>
                    <div className="ae-usage-val">${totalCost}</div>
                  </div>
                  <div className="ae-usage-item">
                    <div className="ae-usage-lbl">Total Tokens</div>
                    <div className="ae-usage-val">{totalTokens.toLocaleString()}</div>
                  </div>
                  <div className="ae-usage-item">
                    <div className="ae-usage-lbl">API Calls</div>
                    <div className="ae-usage-val">{totalCalls.toLocaleString()}</div>
                    <div className="ae-usage-sub">{successCalls} successful</div>
                  </div>
                  <div className="ae-usage-item">
                    <div className="ae-usage-lbl">Avg Latency</div>
                    <div className="ae-usage-val">{avgLatency}ms</div>
                  </div>
                </div>

                {/* Latency percentiles if AI usage available */}
                {aiUsage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latency Percentiles</div>
                    {[
                      { label: 'p50', val: parseFloat(aiUsage.p50_latency_ms), color: '#22A658' },
                      { label: 'p95', val: parseFloat(aiUsage.p95_latency_ms), color: '#F97316' },
                      { label: 'p99', val: parseFloat(aiUsage.p99_latency_ms), color: '#DC2626' },
                    ].map(p => {
                      const maxLat = parseFloat(aiUsage.p99_latency_ms) || 1
                      return (
                        <div key={p.label} className="ae-lat-row">
                          <span className="ae-lat-label">{p.label}</span>
                          <div className="ae-lat-bar">
                            <div className="ae-lat-fill" style={{ width: `${(p.val / maxLat) * 100}%`, background: p.color }} />
                          </div>
                          <span className="ae-lat-val">{p.val.toFixed(0)}ms</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Extra AI analytics stats */}
                {aiUsage && (
                  <div className="ae-usage-grid" style={{ marginTop: 2 }}>
                    <div className="ae-usage-item">
                      <div className="ae-usage-lbl">Failed Calls</div>
                      <div className="ae-usage-val" style={{ color: parseInt(aiUsage.failed_calls) > 0 ? '#DC2626' : '#111827' }}>
                        {parseInt(aiUsage.failed_calls).toLocaleString()}
                      </div>
                    </div>
                    <div className="ae-usage-item">
                      <div className="ae-usage-lbl">Avg Cost/Call</div>
                      <div className="ae-usage-val">${parseFloat(aiUsage.avg_cost_per_call).toFixed(4)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </DashboardShell>
  )
}
