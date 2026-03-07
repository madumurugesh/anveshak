'use client'

import { useState, type FormEvent } from 'react'
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

const priorityOptions: Severity[] = ['HIGH', 'MEDIUM', 'LOW']

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
        officerId: 'current-officer', // resolved from auth context in real use
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Take Action</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {alert.districtName} — {alert.scheme.charAt(0).toUpperCase() + alert.scheme.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="w-full px-4 py-3 rounded-lg bg-[#F4F9F0] border border-[#DFF0D6] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E7228] focus:border-transparent transition appearance-none"
            >
              {actionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Severity)}
              className="w-full px-4 py-3 rounded-lg bg-[#F4F9F0] border border-[#DFF0D6] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E7228] focus:border-transparent transition appearance-none"
            >
              {priorityOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0) + opt.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe the action to be taken..."
              className="w-full px-4 py-3 rounded-lg bg-[#F4F9F0] border border-[#DFF0D6] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3E7228] focus:border-transparent transition resize-y min-h-[80px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-[#2A4E1A] hover:bg-[#3E7228] text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? 'Submitting...' : 'Submit Action'}
            </button>
          </div>
        </form>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-lg shadow-sm text-sm font-medium toast-enter ${
              toast.type === 'success'
                ? 'bg-[#2A4E1A] text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
