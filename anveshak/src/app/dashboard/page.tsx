'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useDashboardStore } from '@/store/dashboardStore'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import OverviewCards from '@/components/OverviewCards'
import AlertsPanel from '@/components/AlertsPanel'
import SchemeChart from '@/components/SchemeChart'
import SkeletonLoader from '@/components/SkeletonLoader'

const HeatmapMap = dynamic(() => import('@/components/HeatmapMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl h-[380px] animate-pulse" />
  ),
})

type TimeRange = '7d' | '30d' | '6m' | '12m'

export default function DashboardPage() {
  const { fetchAll } = useDashboardData()
  useWebSocket()

  const isLoading = useDashboardStore((s) => s.isLoading)
  const error = useDashboardStore((s) => s.error)
  const summary = useDashboardStore((s) => s.summary)
  const heatmapData = useDashboardStore((s) => s.heatmapData)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '6m', label: '6 Months' },
    { key: '12m', label: '12 Months' },
  ]

  // Top districts by response volume for sidebar
  const topDistricts = [...heatmapData]
    .sort((a, b) => b.responseVolume - a.responseVolume)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden max-w-[1600px]">

          {/* Greeting Bar */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Hey there — <span className="font-normal text-gray-500">here&apos;s what&apos;s happening with welfare schemes today</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-8 h-[3px] rounded-full bg-[#F9AB00]" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-600 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => {
                  useDashboardStore.getState().setLastFetched(0)
                  fetchAll()
                }}
                className="text-xs font-medium underline hover:text-red-800 shrink-0 ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* ── ROW 1: Metric Cards + Mini Sidebar ── */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 mb-5">
                {/* Metric cards in a bordered panel */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <OverviewCards />
                </div>

                {/* Quick stats sidebar */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Alert Traffic</h3>
                    <span className="text-[10px] text-gray-400 font-medium">Last 7 Days</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-3">
                    {summary?.activeAlerts ?? 0}
                  </p>
                  {/* Mini bar chart representation */}
                  <div className="flex items-end gap-1 h-12 mb-4">
                    {[0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-[#F9AB00] rounded-t-sm transition-all hover:bg-[#E69500]"
                        style={{ height: `${h * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Districts</p>
                    <table className="w-full">
                      <tbody>
                        {topDistricts.slice(0, 3).map((d) => (
                          <tr key={d.districtId} className="text-xs">
                            <td className="py-1 font-medium text-gray-700">{d.districtName}</td>
                            <td className="py-1 text-right text-gray-500">{d.responseVolume.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ── ROW 2: Scheme Performance Chart (Full Width with time selector) ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                  <h2 className="text-sm font-semibold text-gray-900">Scheme Performance</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {ranges.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setTimeRange(r.key)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            timeRange === r.key
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </button>
                  </div>
                </div>
                <SchemeChart />
                <div className="flex justify-end mt-2">
                  <Link
                    href="/analytics/scheme"
                    className="flex items-center gap-1 text-xs font-medium text-[#F9AB00] hover:text-[#E69500] transition"
                  >
                    View real time
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* ── ROW 3: Section label ── */}
              <p className="text-sm text-gray-500 mb-3">Where are the most responses coming from?</p>

              {/* ── ROW 4: Map + Insights (2 columns) ── */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 mb-5">
                {/* Geographic Map Panel */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Responses by District</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-5">
                    <div className="min-h-[320px]">
                      <HeatmapMap />
                    </div>
                    {/* Top districts list beside map */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Districts</p>
                      <div className="space-y-2.5">
                        {topDistricts.map((d, i) => (
                          <div key={d.districtId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{d.districtName}</span>
                              <span className="text-xs text-gray-500">{d.responseVolume.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${topDistricts[0]?.responseVolume
                                    ? (d.responseVolume / topDistricts[0].responseVolume) * 100
                                    : 0}%`,
                                  backgroundColor: ['#F9AB00', '#E37400', '#34A853', '#4285F4', '#EA4335'][i] ?? '#9AA0A6',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Link
                          href="/geo/hotspot-map"
                          className="flex items-center gap-1 text-xs font-medium text-[#F9AB00] hover:text-[#E69500] transition"
                        >
                          View Districts
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights / Alerts Panel */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Insights</h2>
                  </div>
                  <AlertsPanel />
                  <div className="mt-3">
                    <Link
                      href="/analytics/anomalies"
                      className="flex items-center gap-1 text-xs font-medium text-[#F9AB00] hover:text-[#E69500] transition"
                    >
                      View all insights
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Refresh FAB ── */}
              <button
                onClick={() => {
                  useDashboardStore.getState().setLastFetched(0)
                  fetchAll()
                }}
                className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#F9AB00] hover:bg-[#E69500] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
                title="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
