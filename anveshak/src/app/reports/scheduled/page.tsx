'use client'

import { Fragment, useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsReport } from '@/types/api'

type Days = 7 | 30 | 60 | 90
type DistrictFilter = 'ALL' | string

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<Days>(30)
  const [districtFilter, setDistrictFilter] = useState<DistrictFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    analytics.reports.list({ days, limit: 100 })
      .then(res => { if (alive) setReports(res.data ?? []) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load reports') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const districts = Array.from(new Set(reports.map(r => r.district))).sort()

  const filtered = reports.filter(r => districtFilter === 'ALL' || r.district === districtFilter)

  // Summary stats
  const totalReports = reports.length
  const totalAnomalies = reports.reduce((s, r) => s + (r.total_anomalies ?? 0), 0)
  const totalCritical = reports.reduce((s, r) => s + (r.critical_count ?? 0), 0)
  const withPdf = reports.filter(r => r.pdf_s3_key).length
  const districtsCount = districts.length
  const totalResponses = reports.reduce((s, r) => s + (r.total_responses ?? 0), 0)

  async function handleDownload(id: string) {
    setDownloading(id)
    try {
      const pdf = await analytics.reports.pdf(id)
      if (pdf.data.download_url) window.open(pdf.data.download_url, '_blank')
    } catch { /* silent */ }
    setDownloading(null)
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  function sevColor(c: number, h: number) {
    if (c > 0) return '#DC2626'
    if (h > 0) return '#F97316'
    return '#22A658'
  }

  return (
    <DashboardShell title="Reports" subtitle="District anomaly reports and analysis">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .rp * { box-sizing: border-box; margin: 0; padding: 0; }
        .rp   { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; }

        /* ── toolbar ── */
        .rp-bar {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 9px 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .rp-bar-l { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .rp-bar-r { display: flex; align-items: center; gap: 6px; }
        .rp-sep { width: 1px; height: 16px; background: #E5EDE8; }
        .rp-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }

        .rp-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 5px; font-size: 11px; font-weight: 500;
          border: 1px solid transparent; cursor: pointer; transition: all 0.12s;
          background: #F3F4F6; color: #6B7280; font-family: 'DM Sans', sans-serif; line-height: 1.6;
        }
        .rp-chip:hover:not(.rp-chip-on) { background: #E9EDEA; color: #374151; }
        .rp-chip-on { background: #163D26; color: #fff; }

        .rp-pill {
          display: flex; align-items: center; gap: 4px; padding: 3px 9px;
          background: #F5F7F5; border: 1px solid #E5EDE8; border-radius: 5px; font-size: 11px;
        }
        .rp-pv { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 11.5px; color: #111827; }
        .rp-pk { color: #9CA3AF; }

        .rp-sel {
          padding: 3px 8px; font-size: 11px; font-weight: 500;
          border: 1px solid #E5EDE8; border-radius: 5px;
          color: #374151; background: #F9FAFB; cursor: pointer;
          font-family: 'DM Sans', sans-serif; outline: none;
        }

        /* ── summary strip ── */
        .rp-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .rp-card {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
        }
        .rp-card-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .rp-card-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1; }
        .rp-card-sub { font-size: 10.5px; color: #9CA3AF; }

        /* ── table ── */
        .rp-table-wrap {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
        }
        .rp-table-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          display: flex; align-items: center; justify-content: space-between;
        }
        .rp-table-title { font-size: 11px; font-weight: 600; color: #111827; }
        .rp-table-sub   { font-size: 10px; color: #9CA3AF; font-family: 'DM Mono', monospace; }
        .rp-scroll { flex: 1; min-height: 0; overflow: auto; }

        .rp table { width: 100%; min-width: 860px; border-collapse: collapse; }
        .rp thead tr th {
          padding: 10px 14px; text-align: left; font-size: 9.5px; font-weight: 700;
          color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em;
          background: #FAFCFA; border-bottom: 1px solid #F0F4F1;
        }
        .rp tbody tr { border-bottom: 1px solid #F5F7F5; transition: background 0.1s; cursor: pointer; }
        .rp tbody tr:last-child { border-bottom: none; }
        .rp tbody tr:hover { background: #F9FAF9; }
        .rp tbody tr td { padding: 12px 14px; font-size: 11.5px; vertical-align: middle; line-height: 1.5; }

        .rp-district { font-size: 11.5px; font-weight: 600; color: #111827; }
        .rp-date { font-family: 'DM Mono', monospace; font-size: 10.5px; color: #6B7280; }

        .rp-badge {
          display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
          border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; white-space: nowrap;
        }
        .rp-b-crit { background: #FEF2F2; color: #DC2626; }
        .rp-b-high { background: #FFF7ED; color: #C2410C; }
        .rp-b-med  { background: #FFFBEB; color: #B45309; }
        .rp-b-ok   { background: #F0FAF3; color: #166534; }

        .rp-pdf-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 5px; font-size: 10.5px; font-weight: 600;
          border: 1px solid #E5EDE8; background: #F5F7F5; color: #163D26;
          cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .rp-pdf-btn:hover { background: #163D26; color: #fff; border-color: #163D26; }
        .rp-pdf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rp-no-pdf { font-size: 10px; color: #D1D5DB; }

        .rp-sev-bar { display: flex; gap: 3px; align-items: center; }
        .rp-sev-dot { width: 7px; height: 7px; border-radius: 2px; }
        .rp-sev-val { font-family: 'DM Mono', monospace; font-size: 10.5px; font-weight: 600; color: #111827; margin-left: 2px; }

        .rp-email-badge {
          display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
          border-radius: 4px; font-size: 10px; font-weight: 600;
        }
        .rp-email-sent { background: #F0FAF3; color: #166534; }
        .rp-email-no   { background: #F3F4F6; color: #9CA3AF; }

        /* expand row */
        .rp-expand {
          background: #FAFCFA; border-bottom: 1px solid #F0F4F1;
        }
        .rp-expand td { padding: 0 !important; }
        .rp-expand-inner {
          padding: 12px 14px 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }
        .rp-detail-card {
          background: #fff; border: 1px solid #F0F4F1; border-radius: 8px; padding: 10px 12px;
        }
        .rp-detail-lbl { font-size: 9.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .rp-detail-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #111827; }
        .rp-detail-sub { font-size: 10px; color: #9CA3AF; margin-top: 2px; }

        /* error */
        .rp-err {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
          padding: 10px 14px; font-size: 12px; color: #DC2626;
          display: flex; align-items: center; justify-content: space-between;
        }
        .rp-retry {
          font-size: 10.5px; font-weight: 500; text-decoration: underline; background: none;
          border: none; color: #DC2626; cursor: pointer; font-family: 'DM Sans', sans-serif;
        }

        /* shimmer */
        @keyframes rp-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .rp-sk {
          background: linear-gradient(90deg,#F0F0F0 25%,#E8E8E8 50%,#F0F0F0 75%);
          background-size: 1200px 100%; animation: rp-shimmer 1.4s infinite; border-radius: 6px;
        }

        .rp-empty { padding: 40px; text-align: center; color: #9CA3AF; font-size: 12.5px; background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; }
      `}</style>

      <div className="rp">

        {/* Error */}
        {error && (
          <div className="rp-err">
            <span>{error}</span>
            <button className="rp-retry" onClick={() => setDays(d => d)}>Retry</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="rp-bar">
          <div className="rp-bar-l">
            <span className="rp-lbl">District</span>
            <button className={`rp-chip ${districtFilter === 'ALL' ? 'rp-chip-on' : ''}`} onClick={() => setDistrictFilter('ALL')}>All</button>
            {districts.slice(0, 6).map(d => (
              <button key={d} className={`rp-chip ${districtFilter === d ? 'rp-chip-on' : ''}`} onClick={() => setDistrictFilter(d)}>
                {d}
              </button>
            ))}
            {districts.length > 6 && (
              <select className="rp-sel" value={districtFilter === 'ALL' || districts.slice(0, 6).includes(districtFilter) ? '' : districtFilter} onChange={e => { if (e.target.value) setDistrictFilter(e.target.value) }}>
                <option value="">+{districts.length - 6} more</option>
                {districts.slice(6).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
          <div className="rp-bar-r">
            {!loading && !error && (
              <>
                <div className="rp-pill"><span className="rp-pv">{totalReports}</span><span className="rp-pk">reports</span></div>
                <div className="rp-pill"><span className="rp-pv" style={{ color: '#DC2626' }}>{totalCritical}</span><span className="rp-pk">critical</span></div>
                <div className="rp-sep" />
              </>
            )}
            <select className="rp-sel" value={days} onChange={e => setDays(Number(e.target.value) as Days)}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* ── Summary strip ── */}
        {loading ? (
          <div className="rp-summary">{[1,2,3,4].map(i => <div key={i} className="rp-sk" style={{ height: 72 }} />)}</div>
        ) : !error && (
          <div className="rp-summary">
            {[
              { lbl: 'Total Reports',   val: totalReports,   sub: `${districtsCount} districts`,          color: '#111827' },
              { lbl: 'Anomalies Found', val: totalAnomalies,  sub: `${totalCritical} critical`,            color: '#EF4444' },
              { lbl: 'PDF Available',   val: withPdf,         sub: `of ${totalReports} reports`,           color: '#22A658' },
              { lbl: 'Responses',       val: totalResponses.toLocaleString(), sub: `last ${days} days`,    color: '#4285F4' },
            ].map(({ lbl, val, sub, color }) => (
              <div key={lbl} className="rp-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="rp-card-lbl">{lbl}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                </div>
                <div className="rp-card-val" style={{ color }}>{val}</div>
                <div className="rp-card-sub">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="rp-sk" style={{ height: 320 }} />
        ) : filtered.length === 0 ? (
          <div className="rp-empty">No reports found for the selected filters.</div>
        ) : (
          <div className="rp-table-wrap">
            <div className="rp-table-head">
              <span className="rp-table-title">Report Records</span>
              <span className="rp-table-sub">{filtered.length} of {reports.length} reports</span>
            </div>
            <div className="rp-scroll">
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>District</th>
                    <th>Report Date</th>
                    <th>Responses</th>
                    <th>Anomalies</th>
                    <th>Severity</th>
                    <th>Email</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const anom = r.total_anomalies ?? 0
                    const crit = r.critical_count ?? 0
                    const high = r.high_count ?? 0
                    const med = r.medium_count ?? 0
                    const isExpanded = expandedId === r.id
                    const sevBadgeCls = crit > 0 ? 'rp-b-crit' : high > 0 ? 'rp-b-high' : med > 0 ? 'rp-b-med' : 'rp-b-ok'
                    const sevLabel = crit > 0 ? `${crit} CRIT` : high > 0 ? `${high} HIGH` : med > 0 ? `${med} MED` : 'CLEAR'

                    return (
                      <Fragment key={r.id}>
                        <tr onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                          <td><span className="rp-district">{r.district}</span></td>
                          <td>
                            <div className="rp-date">{fmtDate(r.report_date)}</div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, fontWeight: 500, color: '#111827' }}>
                              {(r.total_responses ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <div className="rp-sev-bar">
                              <div className="rp-sev-dot" style={{ background: sevColor(crit, high) }} />
                              <span className="rp-sev-val">{anom}</span>
                            </div>
                          </td>
                          <td><span className={`rp-badge ${sevBadgeCls}`}>{sevLabel}</span></td>
                          <td>
                            <span className={`rp-email-badge ${r.email_sent ? 'rp-email-sent' : 'rp-email-no'}`}>
                              {r.email_sent ? 'Sent' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            {r.pdf_s3_key ? (
                              <button
                                className="rp-pdf-btn"
                                disabled={downloading === r.id}
                                onClick={e => { e.stopPropagation(); handleDownload(r.id) }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                {downloading === r.id ? 'Loading…' : 'PDF'}
                              </button>
                            ) : (
                              <span className="rp-no-pdf">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${r.id}-exp`} className="rp-expand">
                            <td colSpan={7}>
                              <div className="rp-expand-inner">
                                <div className="rp-detail-card">
                                  <div className="rp-detail-lbl">Best Block</div>
                                  <div className="rp-detail-val">{r.best_performing_block || '—'}</div>
                                  <div className="rp-detail-sub">Best performing area</div>
                                </div>
                                <div className="rp-detail-card">
                                  <div className="rp-detail-lbl">Worst Pincode</div>
                                  <div className="rp-detail-val">{r.worst_performing_pincode || '—'}</div>
                                  <div className="rp-detail-sub">Needs attention</div>
                                </div>
                                <div className="rp-detail-card">
                                  <div className="rp-detail-lbl">Generated</div>
                                  <div className="rp-detail-val">{fmtDate(r.generated_at)}</div>
                                  <div className="rp-detail-sub">{fmtTime(r.generated_at)}</div>
                                </div>
                                <div className="rp-detail-card">
                                  <div className="rp-detail-lbl">Breakdown</div>
                                  <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                    {[
                                      { label: 'Crit', val: crit, bg: '#FEF2F2', color: '#DC2626' },
                                      { label: 'High', val: high, bg: '#FFF7ED', color: '#C2410C' },
                                      { label: 'Med',  val: med,  bg: '#FFFBEB', color: '#B45309' },
                                    ].map(b => (
                                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: b.color }}>{b.val}</span>
                                        <span style={{ fontSize: 9.5, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{b.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
