'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react'
import api from '@/lib/axios'
import type { Alert, ActionType, Severity } from '@/types'

interface ActionModalProps {
  alert: Alert
  onClose: () => void
}

const actionOptions: ActionType[] = [
  'Send Field Officer',
  'Audit Ration Shop',
  'Investigate Supply Chain',
  'Escalate to State',
  'Mark as Resolved',
]

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  'Send Field Officer': (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  'Audit Ration Shop': (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  'Investigate Supply Chain': (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  ),
  'Escalate to State': (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
  ),
  'Mark as Resolved': (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
}

const priorityOptions: Severity[] = ['HIGH', 'MEDIUM', 'LOW']

const PRIORITY_META: Record<Severity, { color: string; bg: string; dot: string }> = {
  HIGH:   { color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  MEDIUM: { color: '#C2410C', bg: '#FFF7ED', dot: '#F97316' },
  LOW:    { color: '#166534', bg: '#F0FAF3', dot: '#22A658' },
}

/* ── Custom Dropdown ── */
function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderOption,
}: {
  value: T
  options: T[]
  onChange: (v: T) => void
  renderOption: (v: T, active: boolean) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  return (
    <div ref={ref} className="am-dd">
      <button type="button" className="am-dd-trigger" onClick={() => setOpen(!open)}>
        <span className="am-dd-val">{renderOption(value, false)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="am-dd-list">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`am-dd-item ${opt === value ? 'am-dd-item-on' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {renderOption(opt, opt === value)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ActionModal({ alert, onClose }: ActionModalProps) {
  const [actionType, setActionType] = useState<ActionType>(actionOptions[0])
  const [priority, setPriority] = useState<Severity>('MEDIUM')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/action-log', {
        districtId: alert.districtId,
        scheme: alert.scheme,
        alertId: alert.alertId,
        actionType,
        priority,
        notes,
        officerId: 'current-officer',
        timestamp: new Date().toISOString(),
      })
      showToast('success', 'Action logged successfully')
      setTimeout(() => onClose(), 1500)
    } catch {
      showToast('error', 'Failed to log action. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  const sevMeta = PRIORITY_META[alert.severity] || PRIORITY_META.MEDIUM

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .am * { box-sizing: border-box; margin: 0; padding: 0; }
        .am   { font-family: 'DM Sans', sans-serif; }

        .am-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
        .am-title { font-size: 15px; font-weight: 700; color: #111827; }
        .am-subtitle { font-size: 11.5px; color: #6B7280; margin-top: 3px; display: flex; align-items: center; gap: 6px; }
        .am-sev-tag {
          display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px;
          border-radius: 4px; font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .am-close {
          width: 28px; height: 28px; border-radius: 6px; border: 1px solid #E5EDE8;
          background: #FAFCFA; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; color: #9CA3AF;
        }
        .am-close:hover { background: #F0F0F0; color: #374151; }

        .am-field { margin-bottom: 14px; }
        .am-label { font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }

        /* ── dropdown ── */
        .am-dd { position: relative; }
        .am-dd-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; border-radius: 8px; border: 1px solid #E5EDE8; background: #FAFCFA;
          cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; font-size: 12.5px;
        }
        .am-dd-trigger:hover { border-color: #C7D4CB; }
        .am-dd-val { display: flex; align-items: center; gap: 8px; }
        .am-dd-list {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
          background: #fff; border: 1px solid #E5EDE8; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1); overflow: hidden;
          animation: am-dd-in 0.15s ease;
        }
        @keyframes am-dd-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .am-dd-item {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; border: none; background: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 12.5px; color: #374151;
          transition: background 0.1s; text-align: left;
        }
        .am-dd-item:hover { background: #F5F7F5; }
        .am-dd-item-on { background: #F0FAF3; font-weight: 600; color: #163D26; }
        .am-dd-item + .am-dd-item { border-top: 1px solid #F5F7F5; }

        /* action option */
        .am-act-icon {
          width: 24px; height: 24px; border-radius: 5px; display: flex; align-items: center;
          justify-content: center; font-size: 12px; background: #F3F4F6; flex-shrink: 0;
        }
        .am-act-label { font-size: 12.5px; }

        /* priority dot */
        .am-pri-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .am-pri-label { font-size: 12.5px; }

        /* textarea */
        .am-textarea {
          width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #E5EDE8;
          background: #FAFCFA; font-family: 'DM Sans', sans-serif; font-size: 12.5px;
          color: #111827; resize: vertical; min-height: 72px; outline: none;
          transition: border-color 0.15s;
        }
        .am-textarea::placeholder { color: #C7D4CB; }
        .am-textarea:focus { border-color: #163D26; }

        /* buttons */
        .am-actions { display: flex; gap: 8px; margin-top: 18px; }
        .am-btn-cancel {
          flex: 1; padding: 9px 0; border-radius: 8px; border: 1px solid #E5EDE8;
          background: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px;
          font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s;
        }
        .am-btn-cancel:hover { background: #F5F7F5; color: #374151; }
        .am-btn-submit {
          flex: 1; padding: 9px 0; border-radius: 8px; border: none;
          background: #163D26; font-family: 'DM Sans', sans-serif; font-size: 12px;
          font-weight: 600; color: #fff; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .am-btn-submit:hover { background: #1E5132; }
        .am-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* toast */
        .am-toast {
          position: fixed; top: 20px; right: 20px; z-index: 200;
          padding: 9px 16px; border-radius: 8px; font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600; box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          animation: am-toast-in 0.25s ease;
        }
        @keyframes am-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .am-toast-ok  { background: #163D26; color: #fff; }
        .am-toast-err { background: #DC2626; color: #fff; }

        /* info strip */
        .am-info { display: flex; gap: 8px; margin-bottom: 16px; }
        .am-info-card {
          flex: 1; background: #FAFCFA; border: 1px solid #F0F4F1; border-radius: 8px;
          padding: 8px 10px; display: flex; flex-direction: column; gap: 2px;
        }
        .am-info-lbl { font-size: 9px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; }
        .am-info-val { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600; color: #111827; }
      `}</style>

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl w-full max-w-md shadow-2xl z-10 am" style={{ padding: '20px 22px' }}>

        {/* Header */}
        <div className="am-header">
          <div>
            <div className="am-title">Take Action</div>
            <div className="am-subtitle">
              {alert.districtName}
              <span style={{ color: '#D1D5DB' }}>·</span>
              {alert.scheme ? alert.scheme.charAt(0).toUpperCase() + alert.scheme.slice(1) : 'Unknown'}
              <span className="am-sev-tag" style={{ background: sevMeta.bg, color: sevMeta.color }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sevMeta.dot, display: 'inline-block' }} />
                {alert.severity}
              </span>
            </div>
          </div>
          <button className="am-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Info strip */}
        <div className="am-info">
          <div className="am-info-card">
            <span className="am-info-lbl">Failure Rate</span>
            <span className="am-info-val" style={{ color: sevMeta.color }}>{(alert.failureRate * 100).toFixed(1)}%</span>
          </div>
          <div className="am-info-card">
            <span className="am-info-lbl">District ID</span>
            <span className="am-info-val">{alert.districtId}</span>
          </div>
          <div className="am-info-card">
            <span className="am-info-lbl">Alert ID</span>
            <span className="am-info-val" style={{ fontSize: 10 }}>{alert.alertId?.slice(0, 8) || '—'}…</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Action Type */}
          <div className="am-field">
            <div className="am-label">Action Type</div>
            <Dropdown
              value={actionType}
              options={actionOptions}
              onChange={setActionType}
              renderOption={(v) => (
                <>
                  <span className="am-act-icon">{ACTION_ICONS[v]}</span>
                  <span className="am-act-label">{v}</span>
                </>
              )}
            />
          </div>

          {/* Priority */}
          <div className="am-field">
            <div className="am-label">Priority</div>
            <Dropdown
              value={priority}
              options={priorityOptions}
              onChange={setPriority}
              renderOption={(v) => {
                const m = PRIORITY_META[v]
                return (
                  <>
                    <span className="am-pri-dot" style={{ background: m.dot }} />
                    <span className="am-pri-label">{v.charAt(0) + v.slice(1).toLowerCase()}</span>
                  </>
                )
              }}
            />
          </div>

          {/* Notes */}
          <div className="am-field">
            <div className="am-label">Notes</div>
            <textarea
              className="am-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe the action to be taken…"
            />
          </div>

          {/* Buttons */}
          <div className="am-actions">
            <button type="button" className="am-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="am-btn-submit" disabled={loading}>
              {loading && (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75" />
                </svg>
              )}
              {loading ? 'Submitting…' : 'Submit Action'}
            </button>
          </div>
        </form>

        {/* Toast */}
        {toast && (
          <div className={`am-toast ${toast.type === 'success' ? 'am-toast-ok' : 'am-toast-err'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
