'use client'

import { useState, useEffect } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import { adaptAnomalyRecords } from '@/lib/adapters'
import type { Anomaly } from '@/types'

type StatusFilter = 'ALL' | Anomaly['status']
type SeverityFilter = 'ALL' | Anomaly['severity']
type Days = 7 | 30 | 60 | 90

export default function AnomaliesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sevFilter, setSevFilter] = useState<SeverityFilter>('ALL')
  const [days, setDays] = useState<Days>(30)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    analytics.anomalies.list({ days, limit: 200 })
      .then(res => { if (alive) setAnomalies(adaptAnomalyRecords(res.data ?? [])) })
      .catch(e  => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load anomalies') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const filtered = anomalies
    .filter(a => statusFilter === 'ALL' || a.status === statusFilter)
    .filter(a => sevFilter === 'ALL' || a.severity === sevFilter)

  // Summary stats
  const totalOpen = anomalies.filter(a => a.status === 'OPEN').length
  const totalInvestigating = anomalies.filter(a => a.status === 'INVESTIGATING').length
  const totalResolved = anomalies.filter(a => a.status === 'RESOLVED').length
  const highSev = anomalies.filter(a => a.severity === 'HIGH').length
  const medSev = anomalies.filter(a => a.severity === 'MEDIUM').length
  const avgConf = anomalies.length
    ? (anomalies.reduce((a, d) => a + d.confidence, 0) / anomalies.length * 100).toFixed(0)
    : '0'

  return (
    <DashboardShell title="Anomaly History" subtitle="AI-detected anomalies in welfare delivery data">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .an * { box-sizing: border-box; margin: 0; padding: 0; }
        .an   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; }

        /* ── toolbar ── */
        .an-bar {
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
        .an-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

        .sum-card {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
        }
        .sum-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .sum-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1; }
        .sum-sub { font-size: 10.5px; color: #9CA3AF; }

        /* ── anomaly table ── */
        .an-table-wrap {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; overflow: hidden;
        }
        .an-table-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          display: flex; align-items: center; justify-content: space-between;
        }
        .an-table-title { font-size: 11px; font-weight: 600; color: #111827; }
        .an-table-sub   { font-size: 10px; color: #9CA3AF; font-family: 'DM Mono', monospace; }

        table { width: 100%; border-collapse: collapse; }
        thead tr th {
          padding: 7px 14px; text-align: left; font-size: 9.5px; font-weight: 700;
          color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em;
          background: #FAFCFA; border-bottom: 1px solid #F0F4F1;
        }
        tbody tr { border-bottom: 1px solid #F5F7F5; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #F9FAF9; }
        tbody tr td { padding: 8px 14px; font-size: 11.5px; vertical-align: top; }

        .td-desc {
          font-size: 11px; color: #374151; line-height: 1.45;
          max-width: 340px; overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        /* badges */
        .badge-s {
          display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
          border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; white-space: nowrap;
        }
        .badge-open   { background: #FEF2F2; color: #DC2626; }
        .badge-invest { background: #FFF7ED; color: #C2410C; }
        .badge-resolved { background: #F0FAF3; color: #166534; }

        .badge-high   { background: #FEF2F2; color: #DC2626; }
        .badge-medium { background: #FFF7ED; color: #C2410C; }
        .badge-low    { background: #F0FAF3; color: #166534; }

        .badge-type {
          display: inline-flex; align-items: center; padding: 2px 7px;
          border-radius: 4px; font-size: 10px; font-weight: 600;
          background: #F3F0FF; color: #7C3AED; white-space: nowrap;
        }

        .conf-bar-wrap { display: flex; align-items: center; gap: 6px; }
        .conf-bar { height: 3px; width: 48px; background: #F0F0F0; border-radius: 99px; overflow: hidden; }
        .conf-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
        .conf-val { font-family: 'DM Mono', monospace; font-size: 10.5px; font-weight: 600; color: #111827; }

        .td-meta { font-size: 10.5px; color: #9CA3AF; }
        .td-district { font-size: 11px; font-weight: 500; color: #111827; }
        .td-scheme   { font-size: 10px; color: #6B7280; }
        .td-date     { font-family: 'DM Mono', monospace; font-size: 10.5px; color: #6B7280; }

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

        /* empty */
        .empty-msg { padding: 40px; text-align: center; color: #9CA3AF; font-size: 12.5px; background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; }
      `}</style>

      <div className="an">

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
        <div className="an-bar">
          <div className="bar-l">
            <span className="bar-lbl">Status</span>
            {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as StatusFilter[]).map(s => (
              <button key={s} className={`chip ${statusFilter === s ? 'chip-on' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'All' : s === 'INVESTIGATING' ? 'Investigating' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <div className="bar-sep" />
            <span className="bar-lbl">Severity</span>
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityFilter[]).map(s => (
              <button key={s} className={`chip ${sevFilter === s ? 'chip-on' : ''}`} onClick={() => setSevFilter(s)}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="bar-r">
            {!loading && !error && (
              <>
                <div className="stat-pill">
                  <span className="spv" style={{ color: '#DC2626' }}>{totalOpen}</span>
                  <span className="spk">open</span>
                </div>
                <div className="stat-pill">
                  <span className="spv" style={{ color: '#C2410C' }}>{totalInvestigating}</span>
                  <span className="spk">investigating</span>
                </div>
                <div className="stat-pill">
                  <span className="spv" style={{ color: '#22A658' }}>{totalResolved}</span>
                  <span className="spk">resolved</span>
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
          <div className="an-summary">
            {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 72 }} />)}
          </div>
        ) : !error && (
          <div className="an-summary">
            {[
              { lbl: 'Total Anomalies', val: anomalies.length,              sub: `last ${days} days`,        color: '#111827' },
              { lbl: 'High Severity',    val: highSev,                       sub: `${medSev} medium`,         color: '#EF4444' },
              { lbl: 'Open Cases',       val: totalOpen,                     sub: `${totalInvestigating} investigating`, color: '#C2410C' },
              { lbl: 'Avg Confidence',   val: `${avgConf}%`,                sub: 'AI detection',             color: '#22A658' },
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

        {/* ── Anomaly Table ── */}
        {loading ? (
          <div className="sk" style={{ height: 320 }} />
        ) : filtered.length === 0 ? (
          <div className="empty-msg">No anomalies found for the selected filters.</div>
        ) : (
          <div className="an-table-wrap">
            <div className="an-table-head">
              <span className="an-table-title">Anomaly Records</span>
              <span className="an-table-sub">{filtered.length} of {anomalies.length} records</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Confidence</th>
                  <th>Detected</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const confPct = Math.round(a.confidence * 100)
                  const confColor = confPct >= 80 ? '#22A658' : confPct >= 50 ? '#F97316' : '#EF4444'
                  const statusCls = a.status === 'OPEN' ? 'badge-open' : a.status === 'INVESTIGATING' ? 'badge-invest' : 'badge-resolved'
                  const sevCls = a.severity === 'HIGH' ? 'badge-high' : a.severity === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                  return (
                    <tr key={a.anomalyId}>
                      <td><span className={`badge-s ${statusCls}`}>{a.status === 'INVESTIGATING' ? 'INVEST.' : a.status}</span></td>
                      <td><span className={`badge-s ${sevCls}`}>{a.severity}</span></td>
                      <td><span className="badge-type">{a.type}</span></td>
                      <td><div className="td-desc">{a.description}</div></td>
                      <td>
                        <div className="td-district">{a.districtName}</div>
                        <div className="td-scheme">{a.scheme}</div>
                      </td>
                      <td>
                        <div className="conf-bar-wrap">
                          <div className="conf-bar">
                            <div className="conf-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
                          </div>
                          <span className="conf-val">{confPct}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="td-date">{new Date(a.detectedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        <div className="td-meta">{new Date(a.detectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
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
