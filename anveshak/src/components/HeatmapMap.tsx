'use client'

import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import Link from 'next/link'
import { useDashboardStore } from '@/store/dashboardStore'
import 'leaflet/dist/leaflet.css'

const getColor = (rate: number): string => {
  if (rate <= 0.10) return '#22C55E'
  if (rate <= 0.25) return '#EAB308'
  if (rate <= 0.40) return '#F97316'
  return '#EF4444'
}

function Legend() {
  const items = [
    { color: '#22C55E', label: '≤ 10% failure' },
    { color: '#EAB308', label: '11–25% failure' },
    { color: '#F97316', label: '26–40% failure' },
    { color: '#EF4444', label: '> 40% failure' },
  ]

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur rounded-lg p-3 shadow-sm">
      <p className="text-xs font-semibold text-gray-900 mb-2">Failure Rate</p>
      {items.map((item) => (
        <div key={item.color} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function HeatmapMap() {
  const heatmapData = useDashboardStore((s) => s.heatmapData)

  // Center on India
  const center: [number, number] = [22.5, 82.0]

  return (
    <div className="relative w-full min-h-[300px] md:min-h-[500px] rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ minHeight: '300px', height: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {heatmapData.map((d) => (
          <Circle
            key={`${d.districtId}-${d.scheme}`}
            center={[d.lat, d.lng]}
            radius={Math.sqrt(d.responseVolume) * 300}
            pathOptions={{
              color: getColor(d.failureRate),
              fillColor: getColor(d.failureRate),
              fillOpacity: 0.5,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm text-gray-800 min-w-[180px]">
                <p className="font-bold text-base mb-1">{d.districtName}</p>
                <p>
                  <span className="font-medium">Scheme:</span>{' '}
                  {d.scheme.charAt(0).toUpperCase() + d.scheme.slice(1)}
                </p>
                <p>
                  <span className="font-medium">Failure Rate:</span>{' '}
                  <span style={{ color: getColor(d.failureRate) }}>
                    {(d.failureRate * 100).toFixed(1)}%
                  </span>
                </p>
                <p>
                  <span className="font-medium">YES:</span> {d.yesCount} |{' '}
                  <span className="font-medium">NO:</span> {d.noCount}
                </p>
                <Link
                  href={`/district/${d.districtId}`}
                  className="inline-block mt-2 text-[#3E7228] font-medium hover:underline"
                >
                  View Details →
                </Link>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
      <Legend />
    </div>
  )
}
