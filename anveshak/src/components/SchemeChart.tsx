'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import api from '@/lib/axios'
import { analytics } from '@/lib/apiClients'
import { adaptSchemesToChartData } from '@/lib/adapters'

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

type Range = 'today' | '7d' | '30d'

interface SchemeData {
  scheme: string
  yesCount: number
  noCount: number
  failureRate: number
}

const rangeLabels: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  const yes = payload.find((p) => p.dataKey === 'yesCount')?.value ?? 0
  const no = payload.find((p) => p.dataKey === 'noCount')?.value ?? 0
  const total = yes + no
  const failureRate = total > 0 ? ((no / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <p className="font-semibold text-gray-900 mb-1 capitalize">{label}</p>
      <p className="text-sm text-green-600">YES: {yes}</p>
      <p className="text-sm text-red-600">NO: {no}</p>
      <p className="text-sm text-gray-600 mt-1">
        Failure Rate: {failureRate}%
      </p>
    </div>
  )
}

export default function SchemeChart() {
  const [range, setRange] = useState<Range>('today')
  const [data, setData] = useState<SchemeData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true)
    try {
      if (IS_MOCK) {
        const res = await api.get('/scheme-performance', { params: { range: r } })
        setData(res.data)
      } else {
        const days = r === 'today' ? 1 : r === '7d' ? 7 : 30
        const res = await analytics.schemes.list({ days })
        setData(adaptSchemesToChartData(res.data ?? []))
      }
    } catch {
      // keep existing data
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData('today')
  }, [fetchData])

  const handleRangeChange = (r: Range) => {
    setRange(r)
    fetchData(r)
  }

  return (
    <div>
      <div className={`transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="scheme"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#6b7280', fontSize: 12 }}
              />
              <Bar
                dataKey="yesCount"
                name="YES"
                fill="#34A853"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Bar
                dataKey="noCount"
                name="NO"
                fill="#EA4335"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
