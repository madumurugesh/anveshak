'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DashboardShell from '@/components/DashboardShell'
import { analytics } from '@/lib/apiClients'
import type { AnalyticsHeatmapCell } from '@/types/api'

// ── Leaflet is client-side only ──────────────────────────────
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
})

// ── Scheme metadata ──────────────────────────────────────────
export const SCHEME_META: Record<string, { label: string; color: string }> = {
  PDS:             { label: 'Ration / PDS',   color: '#4285F4' },
  PM_KISAN:        { label: 'PM-KISAN',        color: '#22A658' },
  OLD_AGE_PENSION: { label: 'Old Age Pension', color: '#F9AB00' },
  LPG:             { label: 'Ujjwala / LPG',  color: '#EA4335' },
}

// ── Severity helpers (exported so LeafletMap can import) ─────
export function getSeverity(cell: AnalyticsHeatmapCell): 'critical' | 'high' | 'normal' {
  const raw = parseFloat(cell.avg_no_pct) || 0
  // avg_no_pct is stored as a fraction (0.0–1.0); convert to percentage
  const pct = raw <= 1 ? raw * 100 : raw
  if (pct > 30) return 'critical'
  if (pct > 15) return 'high'
  return 'normal'
}

export function severityColor(cell: AnalyticsHeatmapCell) {
  const s = getSeverity(cell)
  return s === 'critical' ? '#EF4444' : s === 'high' ? '#F97316' : '#22A658'
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'normal'

// ── Page ─────────────────────────────────────────────────────
export default function HotspotMapPage() {
  const [cells, setCells]       = useState<AnalyticsHeatmapCell[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<AnalyticsHeatmapCell | null>(null)
  const [sevFilter, setSevFilter]     = useState<SeverityFilter>('all')
  const [schemeFilter, setSchemeFilter] = useState('all')
  const [days, setDays]         = useState(30)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    analytics.anomalies.heatmap({ days })
      .then(res => { if (alive) setCells(res.data ?? []) })
      .catch(e  => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const schemeKeys = Array.from(new Set(cells.map(c => c.scheme_id)))

  const filtered = cells.filter(c => {
    if (sevFilter !== 'all' && getSeverity(c) !== sevFilter) return false
    if (schemeFilter !== 'all' && c.scheme_id !== schemeFilter) return false
    return true
  })

  const totalAnomalies = filtered.reduce((a, c) => a + (parseInt(c.anomaly_count) || 0), 0)
  const totalCritical  = filtered.reduce((a, c) => a + (parseInt(c.critical) || 0), 0)
  const avgFailure     = filtered.length
    ? (filtered.reduce((a, c) => a + (parseFloat(c.avg_no_pct) || 0), 0) / filtered.length * 100).toFixed(1)
    : '0'

  const maxCount = Math.max(...filtered.map(c => parseInt(c.anomaly_count) || 0), 1)

  return (
    <DashboardShell title="Hotspot Map" subtitle="Recurring failure hotspots across districts">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

        /* ── reset & base ── */
        .hs * { box-sizing: border-box; margin: 0; padding: 0; }
        .hs { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; gap: 10px; height: 100%; }

        /* ── toolbar ── */
        .hs-bar {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          padding: 9px 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px; flex-shrink: 0;
        }
        .bar-l { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .bar-r { display: flex; align-items: center; gap: 6px; }

        .bar-sep { width: 1px; height: 16px; background: #E5EDE8; }
        .bar-lbl { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }

        .chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 5px; font-size: 11px; font-weight: 500;
          border: 1px solid transparent; cursor: pointer; transition: all 0.12s;
          background: #F3F4F6; color: #6B7280; font-family: 'DM Sans', sans-serif;
          line-height: 1.6;
        }
        .chip:hover:not(.chip-active) { background: #E9EDEA; color: #374151; }
        .chip-active-all      { background: #163D26 !important; color: #fff !important; }
        .chip-active-critical { background: #FEF2F2 !important; color: #DC2626 !important; border-color: #FCA5A5 !important; }
        .chip-active-high     { background: #FFF7ED !important; color: #C2410C !important; border-color: #FED7AA !important; }
        .chip-active-normal   { background: #F0FAF3 !important; color: #166534 !important; border-color: #A7F3C4 !important; }

        .cdot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .cnt  { font-family: 'DM Mono', monospace; font-size: 9px; opacity: 0.65; }

        .stat-pill {
          display: flex; align-items: center; gap: 4px;
          padding: 3px 9px; background: #F5F7F5;
          border: 1px solid #E5EDE8; border-radius: 5px; font-size: 11px;
        }
        .spv { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 11.5px; color: #111827; }
        .spk { color: #9CA3AF; }

        .days-sel {
          padding: 3px 8px; font-size: 11px; font-weight: 500;
          border: 1px solid #E5EDE8; border-radius: 5px;
          color: #374151; background: #F9FAFB; cursor: pointer;
          font-family: 'DM Sans', sans-serif; outline: none;
        }

        /* ── body ── */
        .hs-body {
          display: grid; grid-template-columns: 1fr 296px; gap: 10px;
          flex: 1; min-height: 0; height: calc(100vh - 188px);
        }

        /* ── map panel ── */
        .map-panel {
          background: #fff; border: 1px solid #E5EDE8; border-radius: 10px;
          overflow: hidden; display: flex; flex-direction: column;
        }
        .map-head {
          padding: 9px 14px; border-bottom: 1px solid #F0F4F1;
          background: #FAFCFA; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .map-title { font-size: 11.5px; font-weight: 600; color: #111827; }
        .map-pts { font-family: 'DM Mono', monospace; font-size: 10px; color: #9CA3AF; margin-left: 8px; }
        .map-legend { display: flex; gap: 10px; align-items: center; }
        .leg { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #6B7280; }
        .leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .map-inner { flex: 1; min-height: 0; position: relative; }
        .map-loading {
          flex: 1; display: flex; align-items: center; justify-content: center;
          color: #9CA3AF; font-size: 12px; font-family: 'DM Sans', sans-serif;
          background: #F5F7F5;
        }

        /* ── right column ── */
        .rcol { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 0; }

        .rcard { background: #fff; border: 1px solid #E5EDE8; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
        .rcard-head {
          padding: 8px 13px; border-bottom: 1px solid #F0F4F1; background: #FAFCFA;
          font-size: 10px; font-weight: 700; color: #374151;
          text-transform: uppercase; letter-spacing: 0.06em;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* detail rows */
        .drow {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 13px; border-bottom: 1px solid #F5F7F5; font-size: 11.5px;
        }
        .drow:last-child { border-bottom: none; }
        .dk  { color: #6B7280; }
        .dv  { font-weight: 600; color: #111827; font-family: 'DM Mono', monospace; font-size: 11px; }

        .sev-badge {
          display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
          border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .sev-critical { background: #FEF2F2; color: #DC2626; }
        .sev-high     { background: #FFF7ED; color: #C2410C; }
        .sev-normal   { background: #F0FAF3; color: #166534; }

        /* list rows */
        .dr {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 13px; border-bottom: 1px solid #F5F7F5;
          cursor: pointer; transition: background 0.1s;
        }
        .dr:last-child { border-bottom: none; }
        .dr:hover   { background: #F9FAF9; }
        .dr.dr-on   { background: #F0FAF3; }
        .dr-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .dr-name { flex: 1; font-size: 11.5px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dr-sub  { font-size: 10px; color: #9CA3AF; }
        .dr-bar-wrap { width: 44px; height: 3px; background: #F0F0F0; border-radius: 99px; overflow: hidden; flex-shrink: 0; }
        .dr-bar  { height: 100%; border-radius: 99px; }
        .dr-cnt  { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: #111827; flex-shrink: 0; }

        .empty-msg { padding: 28px 16px; text-align: center; color: #9CA3AF; font-size: 12px; }

        /* error */
        .err-bar {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;
          padding: 10px 14px; font-size: 12px; color: #DC2626;
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }

        /* skeleton */
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .sk {
          background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
          background-size: 1200px 100%; animation: shimmer 1.4s infinite; border-radius: 6px;
        }
      `}</style>

      <div className="hs">

        {error && (
          <div className="err-bar">
            <span>{error}</span>
            <button style={{ fontSize: 10.5, fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
              onClick={() => setDays(d => d)}>Retry</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="hs-bar">
          <div className="bar-l">
            <span className="bar-lbl">Severity</span>
            {(['all','critical','high','normal'] as SeverityFilter[]).map(f => {
              const n = f === 'all' ? filtered.length : cells.filter(c => getSeverity(c) === f).length
              const active = sevFilter === f
              return (
                <button key={f} className={`chip ${active ? `chip-active-${f}` : ''}`} onClick={() => setSevFilter(f)}>
                  {f !== 'all' && <span className="cdot" style={{ background: f === 'critical' ? '#EF4444' : f === 'high' ? '#F97316' : '#22A658' }} />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="cnt">{n}</span>
                </button>
              )
            })}

            {schemeKeys.length > 0 && (
              <>
                <div className="bar-sep" />
                <span className="bar-lbl">Scheme</span>
                <button className={`chip ${schemeFilter === 'all' ? 'chip-active-all' : ''}`} onClick={() => setSchemeFilter('all')}>All</button>
                {schemeKeys.map(sk => (
                  <button
                    key={sk}
                    className={`chip ${schemeFilter === sk ? 'chip-active-all' : ''}`}
                    onClick={() => setSchemeFilter(sk)}
                    style={schemeFilter === sk ? { background: SCHEME_META[sk]?.color || '#163D26', borderColor: SCHEME_META[sk]?.color || '#163D26', color: '#fff' } : {}}
                  >
                    <span className="cdot" style={{ background: SCHEME_META[sk]?.color || '#999' }} />
                    {SCHEME_META[sk]?.label || sk}
                  </button>
                ))}
              </>
            )}
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
            <select className="days-sel" value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="hs-body">

          {/* Leaflet map */}
          <div className="map-panel">
            <div className="map-head">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="map-title">India - District Anomaly Hotspots</span>
                {!loading && <span className="map-pts">{filtered.length} hotspots</span>}
              </div>
              <div className="map-legend">
                {[['#EF4444','Critical >30%'],['#F97316','High >15%'],['#22A658','Normal']].map(([c,l]) => (
                  <span key={l} className="leg"><span className="leg-dot" style={{ background: c }} />{l}</span>
                ))}
              </div>
            </div>
            <div className="map-inner">
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F5F7F5', color: '#9CA3AF', fontSize: 12, fontFamily: 'DM Sans,sans-serif' }}>
                  Loading map data…
                </div>
              ) : (
                <LeafletMap
                  cells={filtered}
                  selected={selected}
                  onSelect={setSelected}
                  schemeMap={SCHEME_META}
                />
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="rcol">

            {/* Detail card for selected */}
            {selected && (
              <div className="rcard">
                <div className="rcard-head">
                  <span>District Detail</span>
                  <button onClick={() => setSelected(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 13, lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: '10px 13px', borderBottom: '1px solid #F0F4F1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: severityColor(selected) }} />
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827' }}>{selected.district}</div>
                    <span className={`sev-badge sev-${getSeverity(selected)}`}>{getSeverity(selected)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SCHEME_META[selected.scheme_id]?.color || '#999', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{SCHEME_META[selected.scheme_id]?.label || selected.scheme_id}</span>
                  </div>
                </div>
                {[
                  { k: 'Total Anomalies', v: selected.anomaly_count },
                  { k: 'Critical',        v: selected.critical },
                  { k: 'High',            v: selected.high },
                  { k: 'Avg Failure Rate',v: `${(parseFloat(selected.avg_no_pct) * 100).toFixed(1)}%` },
                  { k: 'Avg Score',       v: parseFloat(selected.avg_score || '0').toFixed(3) },
                ].map(row => (
                  <div key={row.k} className="drow">
                    <span className="dk">{row.k}</span>
                    <span className="dv">{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hotspot list */}
            <div className="rcard" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div className="rcard-head">
                <span>Hotspot List</span>
                {!loading && <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>{filtered.length} results</span>}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4,5,6].map(i => <div key={i} className="sk" style={{ height: 38 }} />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="empty-msg">
                    {error ? 'No data - check API connection' : 'No hotspots match the current filters'}
                  </div>
                ) : (
                  [...filtered]
                    .sort((a, b) => (parseInt(b.anomaly_count) || 0) - (parseInt(a.anomaly_count) || 0))
                    .map(cell => {
                      const color  = severityColor(cell)
                      const isOn   = selected?.district === cell.district && selected?.scheme_id === cell.scheme_id
                      const barPct = ((parseInt(cell.anomaly_count) || 0) / maxCount) * 100

                      return (
                        <div key={`${cell.district}-${cell.scheme_id}`} className={`dr ${isOn ? 'dr-on' : ''}`}
                          onClick={() => setSelected(isOn ? null : cell)}>
                          <div className="dr-dot" style={{ background: color }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="dr-name">{cell.district}</div>
                            <div className="dr-sub">{SCHEME_META[cell.scheme_id]?.label || cell.scheme_id}</div>
                          </div>
                          <div className="dr-bar-wrap">
                            <div className="dr-bar" style={{ width: `${barPct}%`, background: color }} />
                          </div>
                          <div className="dr-cnt">{cell.anomaly_count}</div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}