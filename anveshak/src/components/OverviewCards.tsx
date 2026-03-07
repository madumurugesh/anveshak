'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'

const useCountUp = (target: number, duration = 1200): number => {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

interface CardProps {
  label: string
  value: number | string
  numericValue?: number
  change?: number
  accentColor: string
}

function MetricCard({ label, value, numericValue, change, accentColor }: CardProps) {
  const animatedValue = useCountUp(numericValue ?? 0)
  const displayValue = numericValue !== undefined ? animatedValue.toLocaleString() : value

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`w-1.5 h-1.5 rounded-full ${accentColor} opacity-80 group-hover:opacity-100 transition-opacity`} />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{displayValue}</p>
        {change !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full mb-0.5 ${
              change >= 0
                ? 'text-red-600 bg-red-50'
                : 'text-green-600 bg-green-50'
            }`}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {change >= 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              )}
            </svg>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      {change !== undefined && (
        <p className="text-[10px] text-gray-400 mt-1">vs. yesterday</p>
      )}
    </div>
  )
}

export default function OverviewCards() {
  const summary = useDashboardStore((s) => s.summary)

  if (!summary) return null

  const cards: CardProps[] = [
    {
      label: 'Total Responses Today',
      value: summary.totalResponsesToday,
      numericValue: summary.totalResponsesToday,
      change: summary.changeFromYesterday.responses,
      accentColor: 'bg-[#7BBF4E]',
    },
    {
      label: 'Active Alerts',
      value: summary.activeAlerts,
      numericValue: summary.activeAlerts,
      change: summary.changeFromYesterday.alerts,
      accentColor: 'bg-red-500',
    },
    {
      label: 'Worst Scheme',
      value: summary.worstScheme.charAt(0).toUpperCase() + summary.worstScheme.slice(1),
      accentColor: 'bg-orange-500',
    },
    {
      label: 'Worst District',
      value: summary.worstDistrict,
      accentColor: 'bg-yellow-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
