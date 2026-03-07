'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavSection {
  label: string
  icon: React.ReactNode
  items: { label: string; href: string }[]
}

const sections: NavSection[] = [
  {
    label: 'Core',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />,
    items: [
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    label: 'Analytics',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    items: [
      { label: 'Scheme Analytics', href: '/analytics/scheme' },
      { label: 'Trend Analysis', href: '/analytics/trends' },
      { label: 'Anomalies', href: '/analytics/anomalies' },
    ],
  },
  {
    label: 'Geographic',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
    items: [
      { label: 'Hotspot Map', href: '/geo/hotspot-map' },
    ],
  },
  {
    label: 'Schemes',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    items: [
      { label: 'Registry', href: '/schemes/registry' },
      { label: 'Beneficiaries', href: '/schemes/beneficiaries' },
      { label: 'Upload Scheme', href: '/schemes/upload' },
    ],
  },
  {
    label: 'Field Ops',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    items: [
      { label: 'Field Officers', href: '/operations/field-officers' },
    ],
  },
  {
    label: 'Reports',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    items: [
      { label: 'Reports', href: '/reports/scheduled' },
    ],
  },
  {
    label: 'System',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />,
    items: [
      { label: 'Anomaly Engine', href: '/system/anomaly-engine' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  // Find which section is active based on current route
  const activeSection = sections.find((s) =>
    s.items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
  )

  const [selectedSection, setSelectedSection] = useState<string | null>(
    activeSection?.label ?? null
  )

  const handleSectionClick = (label: string) => {
    setSelectedSection((prev) => (prev === label ? null : label))
  }

  const currentSection = sections.find((s) => s.label === selectedSection)

  return (
    <aside className="hidden lg:flex sticky top-14 h-[calc(100vh-3.5rem)]">
      {/* Panel 1 — Nav Rail */}
      <div className="flex flex-col w-[160px] min-w-[160px] bg-white border-r border-gray-200/80 py-3 overflow-y-auto">
        <div className="flex-1 flex flex-col gap-0.5 w-full px-2 overflow-y-auto">
          {sections.map((sec) => {
            const isSelected = selectedSection === sec.label
            const hasActive = sec.items.some(
              (i) => pathname === i.href || pathname.startsWith(i.href + '/')
            )
            return (
              <button
                key={sec.label}
                onClick={() => handleSectionClick(sec.label)}
                title={sec.label}
                className={`
                  group relative flex items-center gap-2.5 w-full px-3 py-2 rounded-xl
                  text-[12px] font-medium transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'bg-[#EBF5E3] text-[#3E7228] shadow-sm shadow-[#DFF0D6]'
                    : hasActive
                      ? 'text-[#3E7228] bg-[#EBF5E3]/50'
                      : 'text-gray-400 hover:text-[#3E7228] hover:bg-[#F4F9F0]'
                  }
                `}
              >
                {isSelected && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#3E7228] rounded-r-full" />
                )}
                <svg
                  className="w-[18px] h-[18px] shrink-0 transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {sec.icon}
                </svg>
                <span className="truncate">{sec.label}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom version badge */}
        <div className="mt-auto pt-3 border-t border-gray-100 w-full flex justify-center">
          <span className="text-[9px] text-gray-300 font-medium tracking-wider uppercase">v1.0</span>
        </div>
      </div>

      {/* Panel 2 — Detail Items (slides in on section click) */}
      <div
        className={`
          bg-gray-50/70 border-r border-gray-200/80 overflow-hidden overflow-y-auto
          transition-all duration-300 ease-in-out
          ${currentSection ? 'w-[200px] min-w-[200px] opacity-100' : 'w-0 min-w-0 opacity-0'}
        `}
      >
        {currentSection && (
          <div className="w-[200px] py-4 px-3 flex flex-col h-full">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {currentSection.label}
              </h3>
              <button
                onClick={() => setSelectedSection(null)}
                className="p-0.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-200/50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 space-y-0.5">
              {currentSection.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150
                      ${active
                        ? 'bg-white text-[#3E7228] font-medium shadow-sm shadow-[#DFF0D6]/60 ring-1 ring-[#DFF0D6]/50'
                        : 'text-gray-500 hover:bg-white/80 hover:text-[#3E7228] hover:shadow-sm hover:shadow-[#DFF0D6]'
                      }
                    `}
                  >
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3E7228] shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Item count */}
            <div className="mt-auto pt-3 border-t border-gray-200/50">
              <span className="text-[10px] text-gray-300 px-1">
                {currentSection.items.length} items
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
