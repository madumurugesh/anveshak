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

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`${ANALYTICS_BASE}/api/analytics/schemes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Engine-Secret': ENGINE_SECRET,
        },
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
      setMessage({ type: 'success', text: `CSV uploaded successfully. ${data.count ?? ''} records processed.` })
      setCsvFile(null)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'CSV upload failed.' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#7BBF4E]/40 focus:border-[#7BBF4E] transition bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <DashboardShell title="Upload Scheme Details" subtitle="Add or bulk-upload welfare scheme information">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('form')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'form'
              ? 'bg-[#2A4E1A] text-white shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'
          }`}
        >
          Single Scheme
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'csv'
              ? 'bg-[#2A4E1A] text-white shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'
          }`}
        >
          CSV Bulk Upload
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {mode === 'form' ? (
        <form onSubmit={handleFormSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Scheme ID</label>
              <select name="scheme_id" value={form.scheme_id} onChange={handleChange} required className={inputClass}>
                <option value="">Select scheme</option>
                {SCHEME_IDS.map((id) => (
                  <option key={id} value={id}>{id.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Delivery Cycle</label>
              <select name="delivery_cycle" value={form.delivery_cycle} onChange={handleChange} className={inputClass}>
                {DELIVERY_CYCLES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Scheme Name (English)</label>
              <input
                type="text"
                name="scheme_name_en"
                value={form.scheme_name_en}
                onChange={handleChange}
                required
                placeholder="e.g. Public Distribution System"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Scheme Name (Tamil)</label>
              <input
                type="text"
                name="scheme_name_ta"
                value={form.scheme_name_ta}
                onChange={handleChange}
                placeholder="e.g. பொது விநியோக முறை"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Ministry</label>
              <input
                type="text"
                name="ministry"
                value={form.ministry}
                onChange={handleChange}
                required
                placeholder="e.g. Ministry of Consumer Affairs"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the scheme..."
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Eligibility Criteria</label>
              <textarea
                name="eligibility"
                value={form.eligibility}
                onChange={handleChange}
                rows={2}
                placeholder="Who is eligible for this scheme?"
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-[#7BBF4E] focus:ring-[#7BBF4E]"
              />
              <label className="text-sm text-gray-700">Active scheme</label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 px-6 py-2.5 rounded-lg bg-[#3E7228] hover:bg-[#2A4E1A] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Upload Scheme
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">
            Upload a CSV file with columns: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">scheme_id, scheme_name_en, scheme_name_ta, ministry, description, eligibility, delivery_cycle, is_active</code>
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#7BBF4E]/50 transition">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>

            <label className="cursor-pointer">
              <span className="text-sm text-[#3E7228] font-medium hover:underline">Choose CSV file</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {csvFile && (
              <p className="mt-3 text-sm text-gray-600">
                Selected: <span className="font-medium">{csvFile.name}</span> ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleCsvUpload}
            disabled={!csvFile || loading}
            className="mt-4 px-6 py-2.5 rounded-lg bg-[#3E7228] hover:bg-[#2A4E1A] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Upload CSV
          </button>
        </div>
      )}
    </DashboardShell>
  )
}
