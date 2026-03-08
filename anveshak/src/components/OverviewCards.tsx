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
    <div className="flex-1 min-w-[140px]">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{displayValue}</p>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
              change >= 0 ? 'text-[#34A853]' : 'text-[#EA4335]'
            }`}
          >
            {change >= 0 ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {Math.abs(change)}
          </span>
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      )}
      {/* Accent bar */}
      <div className={`h-[3px] rounded-full mt-2 w-full ${accentColor}`} />
    </div>
  )
}

export default function OverviewCards() {
  const summary = useDashboardStore((s) => s.summary)

  if (!summary) return null

  const cards: CardProps[] = [
    {
      label: 'Total Responses',
      value: summary.totalResponsesToday,
      numericValue: summary.totalResponsesToday,
      change: summary.changeFromYesterday.responses,
      accentColor: 'bg-[#F9AB00]',
    },
    {
      label: 'Active Alerts',
      value: summary.activeAlerts,
      numericValue: summary.activeAlerts,
      change: summary.changeFromYesterday.alerts,
      accentColor: 'bg-[#4285F4]',
    },
    {
      label: 'Worst Scheme',
      value: summary.worstScheme ? summary.worstScheme.charAt(0).toUpperCase() + summary.worstScheme.slice(1) : 'N/A',
      accentColor: 'bg-[#EA4335]',
    },
    {
      label: 'Worst District',
      value: summary.worstDistrict,
      accentColor: 'bg-[#34A853]',
    },
  ]

  return (
    <div className="flex flex-wrap gap-6">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  )
}
