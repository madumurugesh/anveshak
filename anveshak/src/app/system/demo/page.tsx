'use client'

import { useState, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { anomalyEngine } from '@/lib/apiClients'
import type { DemoRunWeekResponse, ClassifyResponse } from '@/types/api'

/* ── helpers ─────────────────────────────────────────────── */
function dateStr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

interface DayRow {
  date: string
  yes_count: number
  no_count: number
  active_beneficiaries: number
}

function makeDays(pattern: number[]): DayRow[] {
  return pattern.map((noPct, i) => {
    const total = 200 + Math.round(Math.random() * 100)
    const noCount = Math.round(total * (noPct / 100))
    return {
      date: dateStr(pattern.length - 1 - i),
      yes_count: total - noCount,
      no_count: noCount,
      active_beneficiaries: 500,
    }
  })
}

const PRESETS: Record<string, { label: string; desc: string; pattern: number[]; district: string; scheme: string }> = {
  normal: {
    label: 'Normal Week',
    desc: 'Steady ~10% "No" rate — no anomalies expected',
    pattern: [9, 11, 10, 12, 9, 10, 11],
    district: 'Villupuram',
    scheme: 'PDS',
  },
  spike: {
    label: 'NO Spike (Supply Failure)',
    desc: 'Sudden jump to 60-70% "No" on days 5-6 — should trigger CRITICAL NO_SPIKE',
    pattern: [10, 11, 12, 10, 62, 68, 14],
    district: 'Chengalpattu',
    scheme: 'PDS',
  },
  fraud: {
    label: 'Fraud Pattern',
    desc: 'Response counts exceed enrolled beneficiaries — ghost/duplicate entries suspected',
    pattern: [18, 20, 19, 22, 20, 21, 19],
    district: 'Villupuram',
    scheme: 'PM_KISAN',
  },
  silence: {
    label: 'Response Silence',
    desc: 'Very few responses vs enrolled beneficiaries — SILENCE detector should fire',
    pattern: [10, 10, 10, 10, 10, 10, 10],
    district: 'Chengalpattu',
    scheme: 'OLD_AGE_PENSION',
  },
}

// For special presets, override specifics
function applyPreset(key: string): { days: DayRow[]; district: string; scheme: string } {
  const p = PRESETS[key]
  let days = makeDays(p.pattern)
  if (key === 'silence') {
    // Very few responses vs enrolled → triggers SILENCE detector
    days = days.map((d) => ({
      ...d,
      yes_count: 8,
      no_count: 2,
      active_beneficiaries: 500,
    }))
  }
  if (key === 'fraud') {
    // Total responses far exceed enrolled beneficiaries every day
    // → DUPLICATE_BENEFICIARY detector fires (response_rate 1.5-1.8x)
    days = days.map((d) => {
      const enrolled = 200
      const total = 310 + Math.round(Math.random() * 40) // ~310-350 for 200 enrolled
      const noPct = (15 + Math.round(Math.random() * 10)) / 100
      const noCount = Math.round(total * noPct)
      return {
        ...d,
        yes_count: total - noCount,
        no_count: noCount,
        active_beneficiaries: enrolled,
      }
    })
  }
  return { days, district: p.district, scheme: p.scheme }
}

const SCHEMES = ['PDS', 'PM_KISAN', 'OLD_AGE_PENSION', 'LPG'] as const
const DISTRICTS = ['Villupuram', 'Chengalpattu', 'Chennai', 'Madurai', 'Coimbatore'] as const

/* ── component ───────────────────────────────────────────── */
export default function DemoPage() {
  const [days, setDays] = useState<DayRow[]>(() => applyPreset('normal').days)
  const [district, setDistrict] = useState('Villupuram')
  const [scheme, setScheme] = useState('PDS')
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState<DemoRunWeekResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePreset = useCallback((key: string) => {
    const p = applyPreset(key)
    setDays(p.days)
    setDistrict(p.district)
    setScheme(p.scheme)
    setResult(null)
    setError(null)
  }, [])

  const updateDay = useCallback((idx: number, field: keyof DayRow, val: number) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: val } : d)))
  }, [])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    setStep('Inserting daily responses into database...')
    try {
      const res = await anomalyEngine.demo.runWeek({ days, district, scheme_id: scheme })
      setStep('')
      setResult(res)
    } catch (err: unknown) {
      setStep('')
      setError(err instanceof Error ? err.message : 'Demo run failed')
    } finally {
      setRunning(false)
    }
  }, [days, district, scheme])

  const totalResp = days.reduce((s, d) => s + d.yes_count + d.no_count, 0)
  const avgNoPct = days.length
    ? (days.reduce((s, d) => s + (d.no_count / Math.max(1, d.yes_count + d.no_count)), 0) / days.length * 100).toFixed(1)
    : '0'

  return (
    <DashboardShell title="Live Demo" subtitle="Run the full anomaly detection pipeline with configurable mock data">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .dm *{box-sizing:border-box;margin:0;padding:0}
        .dm{font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;gap:10px;flex:1;min-height:0;overflow-y:auto}

        /* ── presets ── */
        .dm-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        @media(max-width:900px){.dm-presets{grid-template-columns:repeat(2,1fr)}}
        .dm-preset{
          background:#fff;border:1.5px solid #E5EDE8;border-radius:10px;padding:10px 12px;
          cursor:pointer;transition:all .15s;text-align:left;font-family:inherit;
        }
        .dm-preset:hover{border-color:#22A658;background:#F5FFF8}
        .dm-preset.active{border-color:#22A658;background:#EDFFF3;box-shadow:0 0 0 2px rgba(34,166,88,.15)}
        .dm-preset-name{font-size:11.5px;font-weight:600;color:#111827;margin-bottom:2px}
        .dm-preset-desc{font-size:10px;color:#6B7280;line-height:1.4}

        /* ── config bar ── */
        .dm-config{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
        .dm-field{display:flex;flex-direction:column;gap:3px}
        .dm-field label{font-size:9.5px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em}
        .dm-field select{
          font-family:'DM Sans',sans-serif;font-size:12px;padding:5px 8px;
          border:1px solid #E5EDE8;border-radius:6px;background:#fff;color:#111827;
          cursor:pointer;min-width:130px;
        }

        /* ── data table ── */
        .dm-table-wrap{
          background:#fff;border:1px solid #E5EDE8;border-radius:10px;overflow:hidden;
        }
        .dm-table-head{
          padding:8px 14px;border-bottom:1px solid #F0F4F1;background:#FAFCFA;
          display:flex;align-items:center;justify-content:space-between;
        }
        .dm-table-title{font-size:11.5px;font-weight:600;color:#111827}
        .dm-table-sub{font-size:10px;color:#9CA3AF;font-family:'DM Mono',monospace}
        table.dm-tbl{width:100%;border-collapse:collapse;font-size:11.5px}
        .dm-tbl th{
          padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;color:#9CA3AF;
          text-transform:uppercase;letter-spacing:.04em;background:#FAFCFA;border-bottom:1px solid #F0F4F1;
        }
        .dm-tbl td{padding:5px 10px;border-bottom:1px solid #F5F7F5;vertical-align:middle}
        .dm-tbl tr:last-child td{border-bottom:none}
        .dm-tbl input[type=number]{
          width:70px;font-family:'DM Mono',monospace;font-size:12px;
          padding:3px 6px;border:1px solid #E5EDE8;border-radius:4px;text-align:right;
          background:#FAFCFA;
        }
        .dm-tbl input[type=number]:focus{outline:none;border-color:#22A658;background:#fff}
        .dm-nopct{font-family:'DM Mono',monospace;font-weight:600}
        .dm-bar-cell{width:120px}
        .dm-bar-wrap{height:6px;background:#F0F0F0;border-radius:99px;overflow:hidden}
        .dm-bar-fill{height:100%;border-radius:99px;transition:width .3s}

        /* ── run button ── */
        .dm-run-row{display:flex;align-items:center;gap:12px}
        .dm-run-btn{
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
          padding:9px 28px;border:none;border-radius:8px;cursor:pointer;
          background:#163D26;color:#fff;transition:all .15s;
          display:flex;align-items:center;gap:8px;
        }
        .dm-run-btn:hover{background:#1E5432}
        .dm-run-btn:disabled{opacity:.5;cursor:not-allowed}
        .dm-step{font-size:11.5px;color:#22A658;font-weight:500;display:flex;align-items:center;gap:6px}
        @keyframes dm-spin{to{transform:rotate(360deg)}}
        .dm-spinner{width:14px;height:14px;border:2px solid #E5EDE8;border-top:2px solid #22A658;border-radius:50%;animation:dm-spin .7s linear infinite}

        /* ── error ── */
        .dm-err{
          background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;
          padding:8px 14px;font-size:12px;color:#DC2626;
        }

        /* ── results ── */
        .dm-results{display:flex;flex-direction:column;gap:10px}

        .dm-summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        @media(max-width:900px){.dm-summary-grid{grid-template-columns:repeat(3,1fr)}}
        .dm-stat{
          background:#fff;border:1px solid #E5EDE8;border-radius:10px;padding:10px 12px;
        }
        .dm-stat-lbl{font-size:9.5px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em}
        .dm-stat-val{font-family:'DM Mono',monospace;font-size:20px;font-weight:500;color:#111827;margin-top:2px}
        .dm-stat-sub{font-size:10px;color:#9CA3AF;margin-top:1px}

        .dm-panel{background:#fff;border:1px solid #E5EDE8;border-radius:10px;overflow:hidden}
        .dm-panel-head{
          padding:9px 14px;border-bottom:1px solid #F0F4F1;background:#FAFCFA;
          display:flex;align-items:center;justify-content:space-between;
        }
        .dm-panel-title{font-size:11.5px;font-weight:600;color:#111827}
        .dm-panel-sub{font-size:10px;color:#9CA3AF;font-family:'DM Mono',monospace}
        .dm-panel-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px}

        /* anomaly cards */
        .dm-anom-card{
          display:flex;gap:10px;padding:10px 12px;
          border:1px solid #F0F4F1;border-radius:8px;background:#FAFCFA;
          align-items:flex-start;
        }
        .dm-sev{
          font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
          padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;margin-top:1px;
        }
        .dm-sev-CRITICAL{background:#FEE2E2;color:#DC2626}
        .dm-sev-HIGH{background:#FFEDD5;color:#EA580C}
        .dm-sev-MEDIUM{background:#FEF9C3;color:#A16207}
        .dm-sev-LOW{background:#E0F2FE;color:#0284C7}
        .dm-anom-body{flex:1;min-width:0}
        .dm-anom-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
        .dm-anom-type{font-size:11px;font-weight:600;color:#111827}
        .dm-anom-date{font-size:10px;color:#9CA3AF;font-family:'DM Mono',monospace}
        .dm-anom-score{font-size:10px;color:#6B7280;font-family:'DM Mono',monospace}

        /* classification cards */
        .dm-cls-card{
          padding:10px 12px;border:1px solid #F0F4F1;border-radius:8px;background:#FAFCFA;
        }
        .dm-cls-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:5px}
        .dm-cls-type{
          font-size:10px;font-weight:700;letter-spacing:.04em;padding:2px 8px;
          border-radius:4px;text-transform:uppercase;
        }
        .dm-cls-SUPPLY_FAILURE{background:#DBEAFE;color:#1D4ED8}
        .dm-cls-DEMAND_COLLAPSE{background:#FFEDD5;color:#C2410C}
        .dm-cls-FRAUD_PATTERN{background:#FEE2E2;color:#DC2626}
        .dm-cls-DATA_ARTIFACT{background:#EDE9FE;color:#7C3AED}
        .dm-cls-PENDING{background:#F3F4F6;color:#6B7280}
        .dm-cls-conf{font-family:'DM Mono',monospace;font-size:11px;font-weight:600;color:#111827}
        .dm-cls-urgency{font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:4px}
        .dm-cls-TODAY{background:#FEE2E2;color:#DC2626}
        .dm-cls-THIS_WEEK{background:#FEF3C7;color:#92400E}
        .dm-cls-MONITOR{background:#E0F2FE;color:#0369A1}
        .dm-cls-reason{font-size:11px;color:#374151;line-height:1.5;margin-top:4px}
        .dm-cls-action{
          font-size:10.5px;color:#166534;background:#F0FFF4;padding:6px 10px;
          border-radius:6px;border:1px solid #BBF7D0;margin-top:6px;line-height:1.4;
        }
        .dm-cls-action-ta{
          font-size:10.5px;color:#1E3A5F;background:#EFF6FF;padding:6px 10px;
          border-radius:6px;border:1px solid #BFDBFE;margin-top:4px;line-height:1.4;
        }
        .dm-cls-meta{
          display:flex;gap:12px;margin-top:6px;font-size:10px;font-family:'DM Mono',monospace;color:#9CA3AF;
        }

        /* narrative */
        .dm-narrative{
          font-size:12px;color:#374151;line-height:1.7;white-space:pre-wrap;
        }

        /* no-anomalies state */
        .dm-empty{
          text-align:center;padding:20px;color:#9CA3AF;font-size:12px;
        }
        .dm-empty-icon{font-size:28px;margin-bottom:6px}
      `}</style>

      <div className="dm">

        {/* ── Scenario Presets ── */}
        <div className="dm-presets">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              className={`dm-preset ${days.length > 0 && district === p.district && scheme === p.scheme ? '' : ''}`}
              onClick={() => handlePreset(key)}
            >
              <div className="dm-preset-name">{p.label}</div>
              <div className="dm-preset-desc">{p.desc}</div>
            </button>
          ))}
        </div>

        {/* ── Config bar ── */}
        <div className="dm-config">
          <div className="dm-field">
            <label>District</label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)}>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="dm-field">
            <label>Scheme</label>
            <select value={scheme} onChange={(e) => setScheme(e.target.value)}>
              {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
              {days.length} days &middot; {totalResp} responses &middot; avg {avgNoPct}% No
            </span>
          </div>
        </div>

        {/* ── Day-by-Day Data Table ── */}
        <div className="dm-table-wrap">
          <div className="dm-table-head">
            <span className="dm-table-title">Daily Response Data</span>
            <span className="dm-table-sub">Edit values to simulate different scenarios</span>
          </div>
          <table className="dm-tbl">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Yes</th>
                <th style={{ textAlign: 'right' }}>No</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>No %</th>
                <th>No % Visual</th>
                <th style={{ textAlign: 'right' }}>Beneficiaries</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const total = d.yes_count + d.no_count
                const noPct = total > 0 ? (d.no_count / total) * 100 : 0
                const barColor = noPct > 40 ? '#DC2626' : noPct > 20 ? '#F97316' : '#22A658'
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#6B7280', fontSize: 10 }}>Day {i + 1}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6B7280' }}>{d.date}</td>
                    <td><input type="number" min={0} value={d.yes_count} onChange={(e) => updateDay(i, 'yes_count', Math.max(0, parseInt(e.target.value) || 0))} /></td>
                    <td><input type="number" min={0} value={d.no_count} onChange={(e) => updateDay(i, 'no_count', Math.max(0, parseInt(e.target.value) || 0))} /></td>
                    <td style={{ fontFamily: "'DM Mono', monospace", textAlign: 'right', fontWeight: 600 }}>{total}</td>
                    <td><span className="dm-nopct" style={{ color: barColor }}>{noPct.toFixed(1)}%</span></td>
                    <td className="dm-bar-cell">
                      <div className="dm-bar-wrap">
                        <div className="dm-bar-fill" style={{ width: `${Math.min(100, noPct)}%`, background: barColor }} />
                      </div>
                    </td>
                    <td><input type="number" min={1} value={d.active_beneficiaries} onChange={(e) => updateDay(i, 'active_beneficiaries', Math.max(1, parseInt(e.target.value) || 1))} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Run Button ── */}
        <div className="dm-run-row">
          <button className="dm-run-btn" onClick={handleRun} disabled={running || days.length === 0}>
            {running ? (
              <>
                <div className="dm-spinner" />
                Processing Pipeline...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Run Full Pipeline
              </>
            )}
          </button>
          {step && <span className="dm-step"><div className="dm-spinner" />{step}</span>}
        </div>

        {error && <div className="dm-err">{error}</div>}

        {/* ── Results ── */}
        {result && (
          <div className="dm-results">

            {/* Summary strip */}
            <div className="dm-summary-grid">
              {[
                { lbl: 'Days Processed', val: result.summary.days_processed, color: '#111827' },
                { lbl: 'Total Responses', val: result.summary.total_responses.toLocaleString(), color: '#4285F4' },
                { lbl: 'Anomalies Found', val: result.summary.anomalies_detected, color: result.summary.anomalies_detected > 0 ? '#DC2626' : '#22A658' },
                { lbl: 'AI Classified', val: result.summary.anomalies_classified, color: '#8B5CF6' },
                { lbl: 'Critical', val: result.summary.critical, color: result.summary.critical > 0 ? '#DC2626' : '#9CA3AF' },
              ].map((s) => (
                <div key={s.lbl} className="dm-stat">
                  <div className="dm-stat-lbl">{s.lbl}</div>
                  <div className="dm-stat-val" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Anomalies Detected */}
            <div className="dm-panel">
              <div className="dm-panel-head">
                <span className="dm-panel-title">Anomalies Detected</span>
                <span className="dm-panel-sub">{result.anomalies.length} found</span>
              </div>
              <div className="dm-panel-body">
                {result.anomalies.length === 0 ? (
                  <div className="dm-empty">
                    <div className="dm-empty-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22A658" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    All clear — no anomalies detected in this data. All metrics within normal bounds.
                  </div>
                ) : (
                  result.anomalies.map((a) => (
                    <div key={a.id} className="dm-anom-card">
                      <span className={`dm-sev dm-sev-${a.severity}`}>{a.severity}</span>
                      <div className="dm-anom-body">
                        <div className="dm-anom-top">
                          <span className="dm-anom-type">{a.detector_type}</span>
                          <span className="dm-anom-date">{a.date}</span>
                          <span className="dm-anom-score">score: {a.score}</span>
                          <span className="dm-anom-score">no_pct: {(a.no_pct * 100).toFixed(1)}%</span>
                          <span className="dm-anom-score">baseline: {(a.baseline_no_pct * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Classifications */}
            {result.classifications.length > 0 && (
              <div className="dm-panel">
                <div className="dm-panel-head">
                  <span className="dm-panel-title">AI Classifications (OpenAI GPT-4o-mini)</span>
                  <span className="dm-panel-sub">{result.classifications.filter((c) => c.success).length} classified</span>
                </div>
                <div className="dm-panel-body">
                  {result.classifications.map((c, i) => {
                    if (!c.success) {
                      return (
                        <div key={i} className="dm-err" style={{ fontSize: 11 }}>
                          Failed to classify {c.anomaly_id}: {c.error}
                        </div>
                      )
                    }
                    const cr = c as ClassifyResponse
                    return (
                      <div key={i} className="dm-cls-card">
                        <div className="dm-cls-top">
                          <span className={`dm-cls-type dm-cls-${cr.result.ai_classification}`}>
                            {cr.result.ai_classification.replace(/_/g, ' ')}
                          </span>
                          <span className="dm-cls-conf">{(cr.result.ai_confidence * 100).toFixed(0)}% confidence</span>
                          <span className={`dm-cls-urgency dm-cls-${cr.result.ai_urgency}`}>
                            {cr.result.ai_urgency.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="dm-cls-reason">{cr.result.ai_reasoning}</div>
                        <div className="dm-cls-action">
                          <strong style={{ fontSize: 9.5, color: '#166534' }}>ACTION (EN):</strong> {cr.result.ai_action}
                        </div>
                        <div className="dm-cls-action-ta">
                          <strong style={{ fontSize: 9.5, color: '#1E3A5F' }}>ACTION (TA):</strong> {cr.result.ai_action_ta}
                        </div>
                        <div className="dm-cls-meta">
                          <span>model: {cr.meta.model}</span>
                          <span>tokens: {cr.meta.total_tokens}</span>
                          <span>latency: {cr.meta.latency_ms}ms</span>
                          <span>cost: ${cr.meta.cost_usd.toFixed(5)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Generated Report */}
            <div className="dm-panel">
              <div className="dm-panel-head">
                <span className="dm-panel-title">Generated Report</span>
                <span className="dm-panel-sub">{result.report.district} &middot; {result.report.report_date}</span>
              </div>
              <div className="dm-panel-body">
                <div className="dm-narrative">{result.report.narrative}</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </DashboardShell>
  )
}
