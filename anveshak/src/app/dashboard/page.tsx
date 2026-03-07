'use client'

import dynamic from 'next/dynamic'
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
    <div className="bg-white rounded-xl h-[300px] md:h-[500px] animate-pulse" />
  ),
})

export default function DashboardPage() {
  const { fetchAll } = useDashboardData()
  useWebSocket()

  const isLoading = useDashboardStore((s) => s.isLoading)
  const error = useDashboardStore((s) => s.error)

  return (
    <div className="min-h-screen bg-[#F4F9F0]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-5 lg:p-7 overflow-x-hidden">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-5 border-b border-[#DFF0D6]/70">
            <div>
              <h1 className="text-lg font-semibold text-[#1E3312] tracking-tight">Dashboard</h1>
              <p className="text-xs text-[#7A9E6A] mt-0.5">
                Real-time welfare monitoring overview
              </p>
            </div>
            <button
              onClick={() => {
                useDashboardStore.getState().setLastFetched(0)
                fetchAll()
              }}
              className="px-3.5 py-2 text-xs font-medium bg-[#2A4E1A] text-white hover:bg-[#3E7228] rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Content */}
          <div className="space-y-5">
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex items-center justify-between">
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
                <OverviewCards />

                <section>
                  <h2 className="text-sm font-semibold text-[#1E3312] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#7BBF4E] rounded-full" />
                    Geographic Overview
                  </h2>
                  <HeatmapMap />
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <SchemeChart />
                  <AlertsPanel />
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
