'use client'

export default function SkeletonLoader() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Row 1: Metrics + Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 min-w-[120px]">
                <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
                <div className="h-7 w-16 bg-gray-100 rounded mb-2" />
                <div className="h-[3px] w-full bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
          <div className="h-8 w-12 bg-gray-100 rounded mb-3" />
          <div className="flex items-end gap-1 h-12 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex-1 bg-gray-100 rounded-t-sm" style={{ height: `${30 + i * 8}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="h-4 w-36 bg-gray-100 rounded mb-4" />
        <div className="h-[300px] bg-gray-50 rounded-xl" />
      </div>

      {/* Row 3: Map + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="h-4 w-40 bg-gray-100 rounded mb-4" />
          <div className="h-[320px] bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="h-4 w-20 bg-gray-100 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3.5 h-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
