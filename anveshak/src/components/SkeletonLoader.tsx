'use client'

export default function SkeletonLoader() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-[110px]">
            <div className="space-y-3">
              <div className="h-3 w-28 bg-gray-100 rounded" />
              <div className="h-7 w-20 bg-gray-100 rounded" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Map Skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 h-[300px] md:h-[500px]" />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="h-4 w-36 bg-gray-100 rounded mb-4" />
          <div className="h-[350px] bg-gray-50 rounded" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="h-4 w-28 bg-gray-100 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 h-20">
                <div className="space-y-2">
                  <div className="h-3 w-3/4 bg-gray-100 rounded" />
                  <div className="h-5 w-14 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
