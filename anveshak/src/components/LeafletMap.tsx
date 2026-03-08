'use client'

// ── This file must be imported via dynamic() with ssr:false ──
import { useEffect, useRef, useCallback } from 'react'
import type { AnalyticsHeatmapCell } from '@/types/api'
import { getSeverity, severityColor } from '@/app/geo/hotspot-map/page'

interface Props {
  cells: AnalyticsHeatmapCell[]
  selected: AnalyticsHeatmapCell | null
  onSelect: (cell: AnalyticsHeatmapCell | null) => void
  schemeMap: Record<string, { label: string; color: string }>
}

// ── Geocoding table for Indian districts ─────────────────────
// Covers common districts that welfare data will contain.
// Keys are lowercase-trimmed for robust matching.
const DISTRICT_LATLNG: Record<string, [number, number]> = {
  'varanasi':        [25.3176, 82.9739],
  'lucknow':         [26.8467, 80.9462],
  'patna':           [25.5941, 85.1376],
  'pune':            [18.5204, 73.8567],
  'mumbai':          [19.0760, 72.8777],
  'chennai':         [13.0827, 80.2707],
  'hyderabad':       [17.3850, 78.4867],
  'bengaluru':       [12.9716, 77.5946],
  'bangalore':       [12.9716, 77.5946],
  'kolkata':         [22.5726, 88.3639],
  'jaipur':          [26.9124, 75.7873],
  'bhopal':          [23.2599, 77.4126],
  'nagpur':          [21.1458, 79.0882],
  'indore':          [22.7196, 75.8577],
  'agra':            [27.1767, 78.0081],
  'kanpur':          [26.4499, 80.3319],
  'surat':           [21.1702, 72.8311],
  'ahmedabad':       [23.0225, 72.5714],
  'ranchi':          [23.3441, 85.3096],
  'guwahati':        [26.1445, 91.7362],
  'coimbatore':      [11.0168, 76.9558],
  'visakhapatnam':   [17.6868, 83.2185],
  'vizag':           [17.6868, 83.2185],
  'madurai':         [9.9252,  78.1198],
  'mysuru':          [12.2958, 76.6394],
  'mysore':          [12.2958, 76.6394],
  'jodhpur':         [26.2389, 73.0243],
  'amritsar':        [31.6340, 74.8723],
  'ludhiana':        [30.9010, 75.8573],
  'chandigarh':      [30.7333, 76.7794],
  'delhi':           [28.6139, 77.2090],
  'new delhi':       [28.6139, 77.2090],
  'gurgaon':         [28.4595, 77.0266],
  'gurugram':        [28.4595, 77.0266],
  'noida':           [28.5355, 77.3910],
  'faridabad':       [28.4089, 77.3178],
  'ghaziabad':       [28.6692, 77.4538],
  'meerut':          [28.9845, 77.7064],
  'allahabad':       [25.4358, 81.8463],
  'prayagraj':       [25.4358, 81.8463],
  'gorakhpur':       [26.7606, 83.3732],
  'bareilly':        [28.3670, 79.4304],
  'aligarh':         [27.8974, 78.0880],
  'moradabad':       [28.8386, 78.7733],
  'saharanpur':      [29.9680, 77.5510],
  'gaya':            [24.7955, 85.0002],
  'muzaffarpur':     [26.1209, 85.3647],
  'bhagalpur':       [25.2425, 86.9842],
  'darbhanga':       [26.1542, 85.8918],
  'purnia':          [25.7771, 87.4753],
  'dhanbad':         [23.7957, 86.4304],
  'jamshedpur':      [22.8046, 86.2029],
  'bokaro':          [23.6693, 86.1511],
  'raipur':          [21.2514, 81.6296],
  'bilaspur':        [22.0797, 82.1391],
  'durg':            [21.1904, 81.2849],
  'jabalpur':        [23.1815, 79.9864],
  'gwalior':         [26.2183, 78.1828],
  'ujjain':          [23.1765, 75.7885],
  'sagar':           [23.8388, 78.7378],
  'rewa':            [24.5362, 81.3037],
  'satna':           [24.5853, 80.8322],
  'vadodara':        [22.3072, 73.1812],
  'rajkot':          [22.3039, 70.8022],
  'bhavnagar':       [21.7645, 72.1519],
  'jamnagar':        [22.4707, 70.0577],
  'gandhinagar':     [23.2156, 72.6369],
  'nashik':          [19.9975, 73.7898],
  'aurangabad':      [19.8762, 75.3433],
  'solapur':         [17.6599, 75.9064],
  'kolhapur':        [16.7050, 74.2433],
  'amravati':        [20.9374, 77.7796],
  'nanded':          [19.1383, 77.3210],
  'latur':           [18.4088, 76.5604],
  'akola':           [20.7002, 77.0082],
  'thiruvananthapuram': [8.5241, 76.9366],
  'trivandrum':      [8.5241, 76.9366],
  'kochi':           [9.9312, 76.2673],
  'ernakulam':       [9.9816, 76.2999],
  'kozhikode':       [11.2588, 75.7804],
  'calicut':         [11.2588, 75.7804],
  'thrissur':        [10.5276, 76.2144],
  'malappuram':      [11.0730, 76.0740],
  'palakkad':        [10.7867, 76.6548],
  'kollam':          [8.8932,  76.6141],
  'kannur':          [11.8745, 75.3704],
  'kottayam':        [9.5916,  76.5222],
  'idukki':          [9.9189,  77.1025],
  'wayanad':         [11.6854, 76.1320],
  'kasaragod':       [12.4996, 74.9869],
  'salem':           [11.6643, 78.1460],
  'tiruchirappalli': [10.7905, 78.7047],
  'tirupur':         [11.1085, 77.3411],
  'vellore':         [12.9165, 79.1325],
  'erode':           [11.3410, 77.7172],
  'tirunelveli':     [8.7139,  77.7567],
  'thoothukudi':     [8.7642,  78.1348],
  'thanjavur':       [10.7870, 79.1378],
  'kanchipuram':     [12.8185, 79.6947],
  'villupuram':      [11.9401, 79.4861],
  'cuddalore':       [11.7480, 79.7714],
  'dindigul':        [10.3673, 77.9803],
  'vijayawada':      [16.5062, 80.6480],
  'guntur':          [16.3067, 80.4365],
  'nellore':         [14.4426, 79.9865],
  'tirupati':        [13.6288, 79.4192],
  'kurnool':         [15.8281, 78.0373],
  'kadapa':          [14.4674, 78.8241],
  'anantapur':       [14.6819, 77.6006],
  'chittoor':        [13.2172, 79.0999],
  'srikakulam':      [18.2949, 83.8938],
  'warangal':        [17.9784, 79.5941],
  'nizamabad':       [18.6725, 78.0941],
  'karimnagar':      [18.4386, 79.1288],
  'khammam':         [17.2473, 80.1514],
  'nalgonda':        [17.0575, 79.2671],
  'adilabad':        [19.6641, 78.5320],
  'mahabubnagar':    [16.7376, 77.9870],
  'medak':           [18.0442, 78.2622],
  'belgaum':         [15.8497, 74.4977],
  'belagavi':        [15.8497, 74.4977],
  'hubli':           [15.3647, 75.1240],
  'mangalore':       [12.9141, 74.8560],
  'davangere':       [14.4644, 75.9218],
  'bellary':         [15.1394, 76.9214],
  'shimoga':         [13.9299, 75.5681],
  'tumkur':          [13.3379, 77.1173],
  'gulbarga':        [17.3297, 76.8343],
  'bidar':           [17.9104, 77.5199],
  'bijapur':         [16.8302, 75.7100],
  'vijayapura':      [16.8302, 75.7100],
  'raichur':         [16.2120, 77.3439],
  'hassan':          [13.0068, 76.0996],
  'kolar':           [13.1357, 78.1297],
  'bhubaneswar':     [20.2961, 85.8245],
  'cuttack':         [20.4625, 85.8830],
  'rourkela':        [22.2604, 84.8536],
  'berhampur':       [19.3150, 84.7941],
  'sambalpur':       [21.4669, 83.9756],
  'balasore':        [21.4942, 86.9327],
  'puri':            [19.8135, 85.8312],
  'shimla':          [31.1048, 77.1734],
  'solan':           [30.9045, 77.0967],
  'mandi':           [31.7090, 76.9320],
  'kangra':          [32.0998, 76.2691],
  'dehradun':        [30.3165, 78.0322],
  'haridwar':        [29.9457, 78.1642],
  'rishikesh':       [30.0869, 78.2676],
  'nainital':        [29.3919, 79.4542],
  'haldwani':        [29.2183, 79.5130],
  'roorkee':         [29.8543, 77.8880],
  'jammu':           [32.7266, 74.8570],
  'srinagar':        [34.0837, 74.7973],
  'leh':             [34.1526, 77.5771],
  'imphal':          [24.8170, 93.9368],
  'shillong':        [25.5788, 91.8933],
  'aizawl':          [23.7307, 92.7173],
  'agartala':        [23.8315, 91.2868],
  'itanagar':        [27.0844, 93.6053],
  'kohima':          [25.6701, 94.1077],
  'gangtok':         [27.3389, 88.6065],
  'dispur':          [26.1433, 91.7898],
  'panaji':          [15.4909, 73.8278],
  'goa':             [15.2993, 74.1240],
  'pondicherry':     [11.9416, 79.8083],
  'puducherry':      [11.9416, 79.8083],
}

function resolveLatLng(district: string): [number, number] | null {
  const key = district.toLowerCase().trim()
  if (DISTRICT_LATLNG[key]) return DISTRICT_LATLNG[key]
  // fuzzy: check if any known district is a prefix/suffix
  for (const [k, v] of Object.entries(DISTRICT_LATLNG)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}

function dotRadius(cell: AnalyticsHeatmapCell): number {
  const n = parseInt(cell.anomaly_count) || 0
  if (n > 50) return 18
  if (n > 30) return 14
  if (n > 15) return 11
  if (n > 5)  return 8
  return 6
}

export default function LeafletMap({ cells, selected, onSelect, schemeMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<any[]>([])

  // Build popup HTML
  const makePopupHtml = useCallback((cell: AnalyticsHeatmapCell) => {
    const sev    = getSeverity(cell)
    const color  = severityColor(cell)
    const scheme = schemeMap[cell.scheme_id]?.label || cell.scheme_id
    const pct    = parseFloat(cell.avg_no_pct).toFixed(1)
    const score  = parseFloat(cell.avg_score || '0').toFixed(3)
    const sevBg  = sev === 'critical' ? '#FEF2F2' : sev === 'high' ? '#FFF7ED' : '#F0FAF3'
    const sevFg  = sev === 'critical' ? '#DC2626' : sev === 'high' ? '#C2410C' : '#166534'

    return `
      <div style="font-family:'DM Sans',sans-serif;min-width:180px;padding:2px 0;">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;">
          <div style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;"></div>
          <div style="font-weight:700;font-size:13px;color:#111827;">${cell.district}</div>
          <span style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:${sevBg};color:${sevFg};">${sev}</span>
        </div>
        <div style="font-size:11px;color:#6B7280;margin-bottom:10px;display:flex;align-items:center;gap:5px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${schemeMap[cell.scheme_id]?.color || '#999'};display:inline-block;"></span>
          ${scheme}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          ${[
            ['Total Anomalies', cell.anomaly_count],
            ['Critical', cell.critical],
            ['High', cell.high],
            ['Failure Rate', `${pct}%`],
            ['Avg Score', score],
          ].map(([k, v]) => `
            <tr style="border-bottom:1px solid #F0F4F1;">
              <td style="padding:4px 0;color:#6B7280;">${k}</td>
              <td style="padding:4px 0;text-align:right;font-family:'DM Mono',monospace;font-weight:600;color:#111827;">${v}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
  }, [schemeMap])

  // Init map once
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return

    // Dynamic Leaflet import
    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return

      // Fix default icon path in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [20.5937, 78.9629], // India center
        zoom: 5,
        minZoom: 4,
        maxZoom: 12,
        zoomControl: true,
        attributionControl: true,
      })

      // CartoDB Positron - clean, minimal, light tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      // Bound India
      map.setMaxBounds([[4, 62], [40, 100]])

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Re-render markers whenever cells/selected changes
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then(L => {
      const map = mapRef.current
      if (!map) return

      // Remove old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      cells.forEach(cell => {
        const coords = resolveLatLng(cell.district)
        if (!coords) return  // skip if no coordinates found - real data only

        const color    = severityColor(cell)
        const radius   = dotRadius(cell)
        const sev      = getSeverity(cell)
        const isSelected = selected?.district === cell.district && selected?.scheme_id === cell.scheme_id

        const marker = L.circleMarker(coords, {
          radius,
          fillColor: color,
          color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
          weight: isSelected ? 2.5 : 1.5,
          opacity: 1,
          fillOpacity: isSelected ? 1 : 0.82,
          // pulsing is handled via CSS on a custom div icon for critical
        })

        marker.bindPopup(makePopupHtml(cell), {
          maxWidth: 240,
          className: 'hs-popup',
        })

        marker.on('click', () => {
          onSelect(isSelected ? null : cell)
        })

        marker.on('mouseover', () => {
          marker.openPopup()
          marker.setStyle({ fillOpacity: 1, weight: 2 })
        })

        marker.on('mouseout', () => {
          if (!isSelected) {
            marker.setStyle({ fillOpacity: 0.82, weight: 1.5, color: 'rgba(255,255,255,0.6)' })
          }
          marker.closePopup()
        })

        marker.addTo(map)
        markersRef.current.push(marker)
      })
    })
  }, [cells, selected, onSelect, makePopupHtml])

  // Pan to selected marker
  useEffect(() => {
    if (!selected || !mapRef.current) return
    const coords = resolveLatLng(selected.district)
    if (coords) {
      mapRef.current.flyTo(coords, Math.max(mapRef.current.getZoom(), 7), { duration: 0.8 })
    }
  }, [selected])

  return (
    <>
      <style>{`
        /* Leaflet popup custom style */
        .hs-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.14);
          padding: 0;
          overflow: hidden;
          border: 1px solid #E5EDE8;
        }
        .hs-popup .leaflet-popup-content {
          margin: 12px 14px;
        }
        .hs-popup .leaflet-popup-tip-container { display: none; }

        /* Override Leaflet zoom control style */
        .leaflet-control-zoom a {
          font-family: 'DM Sans', sans-serif !important;
          font-weight: 600;
          color: #374151 !important;
          border-color: #E5EDE8 !important;
        }
        .leaflet-control-zoom a:hover { background: #F0FAF3 !important; }
        .leaflet-bar { border: 1px solid #E5EDE8 !important; border-radius: 7px !important; overflow: hidden; }
        .leaflet-bar a { border-bottom-color: #E5EDE8 !important; }
        .leaflet-control-attribution { font-size: 9px !important; }
      `}</style>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative', zIndex: 0 }}
      />
    </>
  )
}