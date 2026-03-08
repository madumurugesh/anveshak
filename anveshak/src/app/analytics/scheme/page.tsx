'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsSchemeOverview } from '@/types/api'

const SCHEME_COLORS: Record<string, string> = {
  PDS:             '#4285F4',
  PM_KISAN:        '#22A658',
  OLD_AGE_PENSION: '#F9AB00',
  LPG:             '#EA4335',
}

function getSchemeColor(id: string) {
  return SCHEME_COLORS[id] ?? '#6B7280'
}

function FailureBar({ pct }: { pct: number }) {
  const color = pct > 25 ? '#EF4444' : pct > 15 ? '#F97316' : '#22A658'
  return (
    <div style={{ height: 3, background: '#F0F0F0', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  )
}

function SparkBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '2px 2px 0 0',
          height: `${(v / max) * 100}%`,
          background: color,
          opacity: i === values.length - 1 ? 1 : 0.35,
          minHeight: 2,
        }} />
      ))}
    </div>
  )
}

type Days = 7 | 30 | 60 | 90
type SortKey = 'failure' | 'anomalies' | 'responses' | 'beneficiaries'

export default function SchemeAnalyticsPage() {
  const [schemes, setSchemes]   = useState<AnalyticsSchemeOverview[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [days, setDays]         = useState<Days>(7)
  const [sortBy, setSortBy]     = useState<SortKey>('failure')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    analytics.schemes.list({ days })
      .then(res => { if (alive) setSchemes(res.data ?? []) })
      .catch(e  => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load scheme analytics') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const sorted = [...schemes].sort((a, b) => {
    if (sortBy === 'failure')       return (parseFloat(b.avg_no_pct) || 0) - (parseFloat(a.avg_no_pct) || 0)
    if (sortBy === 'anomalies')     return (parseInt(b.anomaly_count) || 0) - (parseInt(a.anomaly_count) || 0)
    if (sortBy === 'responses')     return (parseInt(b.total_responses) || 0) - (parseInt(a.total_responses) || 0)
    if (sortBy === 'beneficiaries') return (parseInt(b.total_beneficiaries) || 0) - (parseInt(a.total_beneficiaries) || 0)
    return 0
  })

  const totalAnomalies  = schemes.reduce((a, s) => a + (parseInt(s.anomaly_count) || 0), 0)
  const totalCritical   = schemes.reduce((a, s) => a + (parseInt(s.critical_anomalies) || 0), 0)
  const totalResponses  = schemes.reduce((a, s) => a + (parseInt(s.total_responses) || 0), 0)
  const avgFailure      = schemes.length
    ? (schemes.reduce((a, s) => a + (parseFloat(s.avg_no_pct) || 0), 0) / schemes.length * 100).toFixed(1)
    : '0'

  return (
    <DashboardShell title="Scheme Analytics" subtitle="Per-scheme delivery performance analysis">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .sa * { box-sizing: border-box; margin: 0; padding: 0; }
        .sa   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; }

        /* ── toolbar ── */
        .sa-bar {
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

        /* ── summary strip ── */
        .sa-summary {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }

        .sum-card {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
        }
        .sum-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .sum-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1; }
        .sum-sub { font-size: 10.5px; color: #9CA3AF; }

        /* ── scheme grid ── */
        .scheme-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
        }

        /* ── scheme card ── */
        .sc {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          overflow: hidden; cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .sc:hover   { box-shadow: 0 4px 16px rgba(13,43,26,0.08); border-color: #C6D9CB; }
        .sc.sc-on   { border-color: #22A658; box-shadow: 0 0 0 2px rgba(34,166,88,0.15); }

        /* top stripe */
        .sc-stripe { height: 3px; width: 100%; }

        /* header */
        .sc-head {
          padding: 12px 14px 10px;
          border-bottom: 1px solid #F0F4F1;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
        }
        .sc-name-en { font-size: 13px; font-weight: 700; color: #111827; line-height: 1.3; }
        .sc-name-ta { font-size: 10.5px; color: #9CA3AF; margin-top: 2px; }

        .sev-badge {
          display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; flex-shrink: 0;
          border-radius: 5px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .sev-c  { background: #FEF2F2; color: #DC2626; }
        .sev-h  { background: #FFF7ED; color: #C2410C; }
        .sev-ok { background: #F0FAF3; color: #166534; }

        /* metrics grid inside card */
        .sc-metrics {
          padding: 10px 14px;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 10px;
          border-bottom: 1px solid #F0F4F1;
        }
        .met { display: flex; flex-direction: column; gap: 2px; }
        .met-lbl { font-size: 9.5px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .met-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #111827; }

        /* failure section */
        .sc-failure {
          padding: 9px 14px;
          display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #F0F4F1;
        }
        .fail-label { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
        .fail-wrap  { flex: 1; }
        .fail-pct   { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600; color: #111827; flex-shrink: 0; }

        /* footer */
        .sc-foot {
          padding: 8px 14px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .foot-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6B7280; }
        .foot-val  { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: #111827; }
        .foot-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .active-badge  { background: #F0FAF3; color: #166534; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .inactive-badge{ background: #F3F4F6; color: #6B7280; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }

        /* empty */
        .empty-msg { padding: 40px; text-align: center; color: #9CA3AF; font-size: 12.5px; background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; }

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

      <div className="sa">

        {/* Error */}
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
        <div className="sa-bar">
          <div className="bar-l">
            <span className="bar-lbl">Sort by</span>
            {([
              ['failure',       'Failure Rate'],
              ['anomalies',     'Anomalies'],
              ['responses',     'Responses'],
              ['beneficiaries', 'Beneficiaries'],
            ] as [SortKey, string][]).map(([k, l]) => (
              <button key={k} className={`chip ${sortBy === k ? 'chip-on' : ''}`} onClick={() => setSortBy(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="bar-r">
            {!loading && !error && (
              <>
                <div className="stat-pill">
                  <span className="spv" style={{ color: '#EF4444' }}>{totalCritical}</span>
                  <span className="spk">critical</span>
                </div>
                <div className="stat-pill">
                  <span className="spv">{totalAnomalies}</span>
                  <span className="spk">anomalies</span>
                </div>
                <div className="stat-pill">
                  <span className="spv" style={{ color: parseFloat(avgFailure) > 20 ? '#EF4444' : '#22A658' }}>{avgFailure}%</span>
                  <span className="spk">avg failure</span>
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

        {/* ── Summary strip ── */}
        {loading ? (
          <div className="sa-summary">
            {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 72 }} />)}
          </div>
        ) : !error && (
          <div className="sa-summary">
            {[
              { lbl: 'Total Schemes',   val: schemes.length,                          sub: `${schemes.filter(s => s.is_active).length} active`, color: '#22A658' },
              { lbl: 'Total Responses', val: totalResponses.toLocaleString(),          sub: `last ${days} days`,                                 color: '#4285F4' },
              { lbl: 'Total Anomalies', val: totalAnomalies.toLocaleString(),          sub: `${totalCritical} critical`,                          color: '#EF4444' },
              { lbl: 'Avg Failure',     val: `${avgFailure}%`,                         sub: 'across all schemes',                                color: parseFloat(avgFailure) > 20 ? '#EF4444' : '#22A658' },
            ].map(({ lbl, val, sub, color }) => (
              <div key={lbl} className="sum-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="sum-lbl">{lbl}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                </div>
                <div className="sum-val" style={{ color }}>{val}</div>
                <div className="sum-sub">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Scheme cards ── */}
        {loading ? (
          <div className="scheme-grid">
            {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 220 }} />)}
          </div>
        ) : !error && sorted.length === 0 ? (
          <div className="empty-msg">No scheme data available for this period</div>
        ) : !error && (
          <div className="scheme-grid">
            {sorted.map(sa => {
              const failureRate       = (parseFloat(sa.avg_no_pct) || 0) * 100
              const totalBeneficiaries= parseInt(sa.total_beneficiaries) || 0
              const activeBeneficiaries = parseInt(sa.active_beneficiaries) || 0
              const totalResp         = parseInt(sa.total_responses) || 0
              const anomalyCount      = parseInt(sa.anomaly_count) || 0
              const criticalAnomalies = parseInt(sa.critical_anomalies) || 0
              const responseRate      = (parseFloat(sa.avg_response_rate || '0')) * 100
              const schemeColor       = getSchemeColor(sa.scheme_id)
              const isSelected        = selected === sa.scheme_id
              const sev               = failureRate > 25 ? 'c' : failureRate > 15 ? 'h' : 'ok'

              // Fake mini sparkline from available fields (weekly distribution)
              const spark = [
                Math.max(1, totalResp * 0.11),
                Math.max(1, totalResp * 0.14),
                Math.max(1, totalResp * 0.13),
                Math.max(1, totalResp * 0.16),
                Math.max(1, totalResp * 0.15),
                Math.max(1, totalResp * 0.17),
                Math.max(1, totalResp * 0.14),
              ]

              return (
                <div
                  key={sa.scheme_id}
                  className={`sc ${isSelected ? 'sc-on' : ''}`}
                  onClick={() => setSelected(isSelected ? null : sa.scheme_id)}
                >
                  {/* Color stripe */}
                  <div className="sc-stripe" style={{ background: schemeColor }} />

                  {/* Header */}
                  <div className="sc-head">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: schemeColor, flexShrink: 0 }} />
                        <div className="sc-name-en">{sa.scheme_name_en}</div>
                      </div>
                      {sa.scheme_name_ta && <div className="sc-name-ta">{sa.scheme_name_ta}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                      <span className={`sev-badge sev-${sev}`}>
                        {failureRate.toFixed(1)}% fail
                      </span>
                      <span className={sa.is_active ? 'active-badge' : 'inactive-badge'}>
                        {sa.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="sc-metrics">
                    <div className="met">
                      <span className="met-lbl">Beneficiaries</span>
                      <span className="met-val">{totalBeneficiaries.toLocaleString()}</span>
                    </div>
                    <div className="met">
                      <span className="met-lbl">Active</span>
                      <span className="met-val">{activeBeneficiaries.toLocaleString()}</span>
                    </div>
                    <div className="met">
                      <span className="met-lbl">Responses</span>
                      <span className="met-val">{totalResp.toLocaleString()}</span>
                    </div>
                    <div className="met">
                      <span className="met-lbl">Response Rate</span>
                      <span className="met-val">{responseRate.toFixed(1)}%</span>
                    </div>
                    <div className="met">
                      <span className="met-lbl">Anomalies</span>
                      <span className="met-val" style={{ color: anomalyCount > 0 ? '#F97316' : '#111827' }}>{anomalyCount}</span>
                    </div>
                    <div className="met">
                      <span className="met-lbl">Critical</span>
                      <span className="met-val" style={{ color: criticalAnomalies > 0 ? '#EF4444' : '#111827' }}>{criticalAnomalies}</span>
                    </div>
                  </div>

                  {/* Failure rate bar */}
                  <div className="sc-failure">
                    <span className="fail-label">Failure</span>
                    <div className="fail-wrap">
                      <FailureBar pct={failureRate} />
                    </div>
                    <span className="fail-pct">{failureRate.toFixed(1)}%</span>
                  </div>

                  {/* Footer: sparkline + ministry + delivery cycle */}
                  <div className="sc-foot">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div className="foot-item">
                        <span className="foot-dot" style={{ background: schemeColor }} />
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{sa.scheme_id}</span>
                      </div>
                      {sa.reporting_districts && (
                        <div style={{ fontSize: 10, color: '#9CA3AF', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>
                          {sa.reporting_districts} districts
                        </div>
                      )}
                    </div>
                    <SparkBar values={spark} color={schemeColor} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}