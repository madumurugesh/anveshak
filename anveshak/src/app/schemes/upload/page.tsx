'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import DashboardShell from '@/components/DashboardShell'

interface SchemeFormData {
  scheme_id: string
  scheme_name_en: string
  scheme_name_ta: string
  ministry: string
  description: string
  eligibility: string
  delivery_cycle: string
  is_active: boolean
}

const EMPTY_FORM: SchemeFormData = {
  scheme_id: '',
  scheme_name_en: '',
  scheme_name_ta: '',
  ministry: '',
  description: '',
  eligibility: '',
  delivery_cycle: 'MONTHLY',
  is_active: true,
}

const SCHEME_IDS = ['PDS', 'PM_KISAN', 'OLD_AGE_PENSION', 'LPG'] as const
const DELIVERY_CYCLES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'] as const

const ANALYTICS_BASE = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001'
const ENGINE_SECRET = process.env.NEXT_PUBLIC_ENGINE_SECRET || ''

export default function SchemeUploadPage() {
  const [form, setForm] = useState<SchemeFormData>(EMPTY_FORM)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mode, setMode] = useState<'form' | 'csv'>('form')
  const [dragOver, setDragOver] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file)
      setMessage(null)
    } else {
      setMessage({ type: 'error', text: 'Please select a valid CSV file.' })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file)
      setMessage(null)
    } else {
      setMessage({ type: 'error', text: 'Please drop a valid CSV file.' })
    }
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${ANALYTICS_BASE}/api/analytics/schemes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Engine-Secret': ENGINE_SECRET },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setMessage({ type: 'success', text: 'Scheme details uploaded successfully.' })
      setForm(EMPTY_FORM)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return
    setLoading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      const res = await fetch(`${ANALYTICS_BASE}/api/analytics/schemes/upload`, {
        method: 'POST',
        headers: { 'X-Engine-Secret': ENGINE_SECRET },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMessage({ type: 'success', text: `CSV uploaded. ${data.count ?? ''} records processed.` })
      setCsvFile(null)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'CSV upload failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell title="Upload Scheme Details" subtitle="Add or bulk-upload welfare scheme information">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .upload-root {
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 0;
          min-height: 0;
          background: #F5F7F5;
        }

        /* ── Top action bar ── */
        .upload-actionbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #fff;
          border-bottom: 1px solid #E5EDE8;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .upload-tabs {
          display: flex;
          background: #F3F4F6;
          border-radius: 8px;
          padding: 3px;
          gap: 2px;
        }

        .upload-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          color: #6B7280;
          background: transparent;
          letter-spacing: 0.01em;
        }

        .upload-tab.active {
          background: #163D26;
          color: #fff;
          box-shadow: 0 1px 4px rgba(13,43,26,0.18);
        }

        .upload-tab:hover:not(.active) { color: #374151; background: #E9EDEA; }

        .actionbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 500;
          color: #6B7280;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
          font-family: inherit;
        }

        .btn-ghost:hover { background: #E5E7EB; color: #374151; }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 18px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: #1A5C35;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-family: inherit;
          letter-spacing: 0.01em;
        }

        .btn-primary:hover:not(:disabled) { background: #163D26; }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Content area ── */
        .upload-content {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 0;
          flex: 1;
          min-height: 0;
        }

        /* ── Main form panel ── */
        .form-panel {
          padding: 20px 24px;
          overflow-y: auto;
        }

        /* ── Section card ── */
        .form-section {
          background: #fff;
          border: 1px solid #E5EDE8;
          border-radius: 10px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .section-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #F0F4F1;
          background: #FAFCFA;
        }

        .section-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
          letter-spacing: 0.01em;
        }

        .section-sub {
          font-size: 10.5px;
          color: #9CA3AF;
          margin-left: auto;
        }

        .section-body {
          padding: 14px 16px;
        }

        /* ── Form grid ── */
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .col-span-2 { grid-column: span 2; }
        .col-span-3 { grid-column: span 3; }

        /* ── Field ── */
        .field { display: flex; flex-direction: column; gap: 4px; }

        .field-label {
          font-size: 10.5px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .field-label .required { color: #EF4444; margin-left: 2px; }

        .field-input,
        .field-select,
        .field-textarea {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid #D1D5DB;
          border-radius: 7px;
          font-size: 12.5px;
          font-family: 'DM Sans', sans-serif;
          color: #111827;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }

        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
          border-color: #22A658;
          box-shadow: 0 0 0 3px rgba(34,166,88,0.12);
        }

        .field-input::placeholder,
        .field-textarea::placeholder { color: #C4C9CE; }

        .field-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px;
          cursor: pointer;
        }

        .field-textarea { resize: vertical; min-height: 70px; line-height: 1.5; }

        /* ── Toggle switch ── */
        .toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #F9FAF9;
          border: 1px solid #E5EDE8;
          border-radius: 8px;
        }

        .toggle-wrap {
          position: relative;
          width: 36px;
          height: 20px;
          flex-shrink: 0;
        }

        .toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: #D1D5DB;
          border-radius: 99px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          left: 3px;
          top: 3px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .toggle-input:checked + .toggle-slider { background: #22A658; }
        .toggle-input:checked + .toggle-slider::before { transform: translateX(16px); }

        .toggle-label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        .toggle-hint {
          font-size: 10.5px;
          color: #9CA3AF;
          margin-left: auto;
        }

        /* ── Status message ── */
        .msg {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .msg-success { background: #F0FAF3; border: 1px solid #A7F3C4; color: #166534; }
        .msg-error   { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; }

        /* ── Right info panel ── */
        .info-panel {
          border-left: 1px solid #E5EDE8;
          background: #fff;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .info-card {
          background: #F5F7F5;
          border: 1px solid #E5EDE8;
          border-radius: 9px;
          padding: 13px 14px;
        }

        .info-card-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #1A5C35;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid #EBF0EC;
          font-size: 11px;
        }

        .info-row:last-child { border-bottom: none; }
        .info-row-key { color: #6B7280; font-weight: 400; }
        .info-row-val { color: #111827; font-weight: 600; font-family: 'DM Mono', monospace; font-size: 10.5px; }

        .scheme-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 600;
          background: #E2F5EA;
          color: #1A5C35;
          margin: 2px;
        }

        .csv-col-chip {
          display: inline-flex;
          padding: 2px 7px;
          background: #F0F4F1;
          border: 1px solid #D1D9D4;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 9.5px;
          color: #374151;
          margin: 2px;
        }

        .progress-mini {
          height: 3px;
          background: #E5EDE8;
          border-radius: 99px;
          overflow: hidden;
          margin-top: 4px;
        }

        .progress-mini-fill {
          height: 100%;
          background: #22A658;
          border-radius: 99px;
        }

        /* ── CSV Drop Zone ── */
        .drop-zone {
          border: 2px dashed #C6D9CB;
          border-radius: 10px;
          padding: 32px 20px;
          text-align: center;
          transition: border-color 0.2s, background 0.2s;
          cursor: pointer;
          position: relative;
        }

        .drop-zone:hover, .drop-zone.over {
          border-color: #22A658;
          background: #F0FAF3;
        }

        .drop-zone.has-file {
          border-color: #22A658;
          background: #F0FAF3;
        }

        .drop-zone-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #E2F5EA;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      <div className="upload-root">

        {/* ── Action Bar ── */}
        <div className="upload-actionbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="upload-tabs">
              <button className={`upload-tab ${mode === 'form' ? 'active' : ''}`} onClick={() => setMode('form')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Single Entry
              </button>
              <button className={`upload-tab ${mode === 'csv' ? 'active' : ''}`} onClick={() => setMode('csv')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                CSV Bulk Upload
              </button>
            </div>
            {message && (
              <div className={`msg ${message.type === 'success' ? 'msg-success' : 'msg-error'}`} style={{ margin: 0, padding: '6px 12px' }}>
                {message.type === 'success'
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                {message.text}
              </div>
            )}
          </div>

          <div className="actionbar-right">
            <button className="btn-ghost" onClick={() => { setForm(EMPTY_FORM); setMessage(null); setCsvFile(null) }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Reset
            </button>
            {mode === 'form' ? (
              <button className="btn-primary" onClick={(e) => handleFormSubmit(e as any)} disabled={loading}>
                {loading
                  ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                Upload Scheme
              </button>
            ) : (
              <button className="btn-primary" onClick={handleCsvUpload} disabled={!csvFile || loading}>
                {loading
                  ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                Upload CSV
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="upload-content">

          {/* ── LEFT: Form/CSV ── */}
          <div className="form-panel">
            {mode === 'form' ? (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Section 1: Identity */}
                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#E2F5EA' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A5C35" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <span className="section-title">Scheme Identity</span>
                    <span className="section-sub">Core identifiers</span>
                  </div>
                  <div className="section-body">
                    <div className="form-grid-3">
                      <div className="field">
                        <label className="field-label">Scheme ID <span className="required">*</span></label>
                        <select name="scheme_id" value={form.scheme_id} onChange={handleChange} required className="field-select">
                          <option value="">Select scheme</option>
                          {SCHEME_IDS.map((id) => (
                            <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label">Delivery Cycle</label>
                        <select name="delivery_cycle" value={form.delivery_cycle} onChange={handleChange} className="field-select">
                          {DELIVERY_CYCLES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label className="field-label">Ministry <span className="required">*</span></label>
                        <input type="text" name="ministry" value={form.ministry} onChange={handleChange} required placeholder="e.g. Ministry of Consumer Affairs" className="field-input" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Names */}
                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#EDE9FE' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </div>
                    <span className="section-title">Scheme Names</span>
                    <span className="section-sub">Multilingual</span>
                  </div>
                  <div className="section-body">
                    <div className="form-grid-2">
                      <div className="field">
                        <label className="field-label">Name (English) <span className="required">*</span></label>
                        <input type="text" name="scheme_name_en" value={form.scheme_name_en} onChange={handleChange} required placeholder="e.g. Public Distribution System" className="field-input" />
                      </div>
                      <div className="field">
                        <label className="field-label">Name (Tamil)</label>
                        <input type="text" name="scheme_name_ta" value={form.scheme_name_ta} onChange={handleChange} placeholder="e.g. பொது விநியோக முறை" className="field-input" style={{ fontFamily: 'inherit' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Details */}
                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#FEF3C7' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <span className="section-title">Scheme Details</span>
                    <span className="section-sub">Description & eligibility</span>
                  </div>
                  <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                      <label className="field-label">Description</label>
                      <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description of the scheme purpose and benefits..." className="field-textarea" />
                    </div>
                    <div className="field">
                      <label className="field-label">Eligibility Criteria</label>
                      <textarea name="eligibility" value={form.eligibility} onChange={handleChange} rows={2} placeholder="Who is eligible? Mention BPL status, age, income criteria..." className="field-textarea" />
                    </div>
                  </div>
                </div>

                {/* Section 4: Status */}
                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#DCFCE7' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <span className="section-title">Scheme Status</span>
                    <span className="section-sub">Activation state</span>
                  </div>
                  <div className="section-body">
                    <div className="toggle-row">
                      <label className="toggle-wrap">
                        <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="toggle-input" />
                        <span className="toggle-slider" />
                      </label>
                      <span className="toggle-label">{form.is_active ? 'Scheme is Active' : 'Scheme is Inactive'}</span>
                      <span className="toggle-hint">
                        {form.is_active ? 'Visible to beneficiary queries' : 'Hidden from public queries'}
                      </span>
                    </div>
                  </div>
                </div>

              </form>
            ) : (
              /* ── CSV MODE ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#DBEAFE' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <span className="section-title">Upload CSV File</span>
                    <span className="section-sub">Bulk import</span>
                  </div>
                  <div className="section-body">
                    <div
                      className={`drop-zone ${dragOver ? 'over' : ''} ${csvFile ? 'has-file' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('csv-input')?.click()}
                    >
                      <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                      {csvFile ? (
                        <>
                          <div className="drop-zone-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A5C35" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A5C35', marginBottom: 2 }}>{csvFile.name}</div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>{(csvFile.size / 1024).toFixed(1)} KB · CSV</div>
                          <div className="progress-mini" style={{ maxWidth: 200, margin: '10px auto 0' }}>
                            <div className="progress-mini-fill" style={{ width: '100%' }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: '#22A658', marginTop: 6, fontWeight: 500 }}>Ready to upload · Click to change</div>
                        </>
                      ) : (
                        <>
                          <div className="drop-zone-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A5C35" strokeWidth="1.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Drop CSV here or click to browse</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Supports .csv files only</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-head">
                    <div className="section-icon" style={{ background: '#F3F4F6' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <span className="section-title">Required CSV Columns</span>
                  </div>
                  <div className="section-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {['scheme_id','scheme_name_en','scheme_name_ta','ministry','description','eligibility','delivery_cycle','is_active'].map(col => (
                        <span key={col} className="csv-col-chip">{col}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
                      The <code style={{ background: '#F0F4F1', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>is_active</code> column should be <code style={{ background: '#F0F4F1', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>true</code> or <code style={{ background: '#F0F4F1', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>false</code>.
                      Delivery cycle values: {DELIVERY_CYCLES.map(c => <span key={c} className="csv-col-chip" style={{ marginLeft: 2 }}>{c}</span>)}.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Info Panel ── */}
          <div className="info-panel">

            {/* Live preview */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Live Preview
              </div>
              <div className="info-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: form.is_active ? '#22A658' : '#9CA3AF' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                    {form.scheme_name_en || 'Scheme Name'}
                  </span>
                </div>
                {form.scheme_name_ta && (
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{form.scheme_name_ta}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {form.scheme_id && <span className="scheme-chip">{form.scheme_id}</span>}
                  {form.delivery_cycle && <span className="scheme-chip" style={{ background: '#FEF3C7', color: '#92400E' }}>{form.delivery_cycle}</span>}
                  <span className="scheme-chip" style={form.is_active ? { background: '#DCFCE7', color: '#166534' } : { background: '#F3F4F6', color: '#6B7280' }}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {form.ministry && (
                  <div style={{ fontSize: 10.5, color: '#6B7280', borderTop: '1px solid #E5EDE8', paddingTop: 6 }}>
                    <span style={{ fontWeight: 500 }}>Ministry: </span>{form.ministry}
                  </div>
                )}
              </div>
            </div>

            {/* Field completeness */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Completeness
              </div>
              <div className="info-card">
                {[
                  { key: 'Scheme ID', val: form.scheme_id, req: true },
                  { key: 'Name (EN)', val: form.scheme_name_en, req: true },
                  { key: 'Name (TA)', val: form.scheme_name_ta, req: false },
                  { key: 'Ministry', val: form.ministry, req: true },
                  { key: 'Description', val: form.description, req: false },
                  { key: 'Eligibility', val: form.eligibility, req: false },
                ].map((f) => (
                  <div key={f.key} className="info-row">
                    <span className="info-row-key">{f.key} {f.req && <span style={{ color: '#EF4444', fontSize: 9 }}>●</span>}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {f.val ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22A658" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={f.req ? '#EF4444' : '#D1D5DB'} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      )}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#6B7280', marginBottom: 4 }}>
                    <span>Overall</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>
                      {[form.scheme_id, form.scheme_name_en, form.scheme_name_ta, form.ministry, form.description, form.eligibility].filter(Boolean).length}/6
                    </span>
                  </div>
                  <div className="progress-mini">
                    <div className="progress-mini-fill" style={{
                      width: `${([form.scheme_id, form.scheme_name_en, form.scheme_name_ta, form.ministry, form.description, form.eligibility].filter(Boolean).length / 6) * 100}%`
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Available schemes */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Available Schemes
              </div>
              <div className="info-card" style={{ padding: '10px 12px' }}>
                {[
                  { id: 'PDS', name: 'Public Distribution', color: '#4285F4' },
                  { id: 'PM_KISAN', name: 'PM-KISAN', color: '#22A658' },
                  { id: 'OLD_AGE_PENSION', name: 'Old Age Pension', color: '#F9AB00' },
                  { id: 'LPG', name: 'PM Ujjwala (LPG)', color: '#EA4335' },
                ].map((s) => (
                  <div
                    key={s.id}
                    className="info-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setForm(prev => ({ ...prev, scheme_id: s.id }))}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      <span className="info-row-key">{s.name}</span>
                    </span>
                    <span className="info-row-val">{s.id}</span>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' }}>Click to auto-fill Scheme ID</div>
              </div>
            </div>

            {/* Delivery cycles ref */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Delivery Cycles
              </div>
              <div className="info-card" style={{ padding: '10px 12px' }}>
                {[
                  { cycle: 'WEEKLY', desc: 'Every 7 days' },
                  { cycle: 'MONTHLY', desc: 'Once per month' },
                  { cycle: 'QUARTERLY', desc: 'Every 3 months' },
                  { cycle: 'ANNUAL', desc: 'Once per year' },
                ].map((c) => (
                  <div key={c.cycle} className="info-row">
                    <span className="info-row-val" style={{ color: '#1A5C35' }}>{c.cycle}</span>
                    <span className="info-row-key">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}