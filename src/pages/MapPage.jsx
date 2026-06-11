import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const ACCENT = '#1D9E75'
const MARKER_COLORS = { starter: '#3b82f6', main: '#8b5cf6', dessert: '#f97316', shared: '#1D9E75' }

function createSvgIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 24 14 24s14-14.667 14-24C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}

export default function MapPage() {
  const [searchParams] = useSearchParams()
  const mapRef = useRef(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!window.L || !mapRef.current) return
    const raw = searchParams.get('data')
    if (!raw) { setError('Kein Karten-Datensatz in der URL gefunden.'); return }

    let parsed
    try {
      parsed = JSON.parse(atob(decodeURIComponent(raw)))
    } catch {
      setError('Ungültige Kartendaten in der URL.')
      return
    }

    const L = window.L
    const map = L.map(mapRef.current).setView([52.52, 13.405], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const points = parsed.points || []
    if (points.length > 0) {
      points.forEach((p, i) => {
        const color = i === points.length - 1 ? MARKER_COLORS.shared : Object.values(MARKER_COLORS)[i % 3]
        const icon = L.icon({ iconUrl: createSvgIcon(color), iconSize: [28, 38], iconAnchor: [14, 38], popupAnchor: [0, -38] })
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`Punkt ${i + 1}`)
      })
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }

    setLoaded(true)
    return () => map.remove()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <span style={{ color: ACCENT }}>🍽️</span>
            <span>Running Dinner</span>
          </Link>
          <Link to="/tool" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Zum Generator →</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Karte der Locations</h1>
        <p className="text-gray-500 mb-6 text-sm">Geteilte Karte eines Running Dinners.</p>

        <div className="flex flex-wrap gap-4 mb-4">
          {[['Vorspeise-Hosts', MARKER_COLORS.starter], ['Hauptspeise-Hosts', MARKER_COLORS.main], ['Nachspeise-Hosts', MARKER_COLORS.dessert], ['Gemeinsamer Ort', MARKER_COLORS.shared]].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>

        {error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: 500 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    </div>
  )
}
