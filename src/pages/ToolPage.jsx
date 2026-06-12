import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { parseCSV, buildMessage } from '../utils/algorithm'
import { geocodeAddresses, buildDistanceMatrix, assignTeams, validatePlan, calculateTotalDistance } from '../lib/dinnerAlgorithm'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

// ─── ICS Calendar helper ──────────────────────────────────────────────────────
function toIcsDate(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-')
  const [hh, mm] = timeStr.split(':')
  return `${y}${m}${d}T${hh}${mm}00`
}
function addIcsMinutes(icsDate, minutes) {
  if (!icsDate) return null
  const dt = new Date(
    parseInt(icsDate.slice(0,4)), parseInt(icsDate.slice(4,6))-1, parseInt(icsDate.slice(6,8)),
    parseInt(icsDate.slice(9,11)), parseInt(icsDate.slice(11,13))
  )
  dt.setMinutes(dt.getMinutes() + minutes)
  const pad = n => String(n).padStart(2,'0')
  return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
}
function buildIcs(team, config, messageText) {
  const { date, timeStarter, timeMain, timeDessert, dessertAddress } = config
  const starterAddr = team.groups?.starter?.host?.address || ''
  const mainAddr    = team.groups?.main?.host?.address    || ''
  const uid = () => Math.random().toString(36).slice(2) + '@running-dinner'
  const esc = s => String(s || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

  const events = [
    {
      summary: `Running Dinner – Vorspeise bei ${team.groups?.starter?.host?.names || 'Host'}`,
      start: toIcsDate(date, timeStarter),
      end:   addIcsMinutes(toIcsDate(date, timeStarter), 90),
      location: starterAddr,
    },
    {
      summary: `Running Dinner – Hauptspeise bei ${team.groups?.main?.host?.names || 'Host'}`,
      start: toIcsDate(date, timeMain),
      end:   addIcsMinutes(toIcsDate(date, timeMain), 90),
      location: mainAddr,
    },
    {
      summary: 'Running Dinner – Nachspeise (gemeinsam)',
      start: toIcsDate(date, timeDessert),
      end:   addIcsMinutes(toIcsDate(date, timeDessert), 120),
      location: dessertAddress || '',
    },
  ]

  const vevents = events.map(ev => [
    'BEGIN:VEVENT',
    `UID:${uid()}`,
    `DTSTART:${ev.start || '19700101T000000'}`,
    `DTEND:${ev.end   || '19700101T000000'}`,
    `SUMMARY:${esc(ev.summary)}`,
    `LOCATION:${esc(ev.location)}`,
    `DESCRIPTION:${esc(messageText)}`,
    'END:VEVENT',
  ].join('\r\n')).join('\r\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Running Dinner Generator//DE',
    'CALSCALE:GREGORIAN',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Phone cleaner ────────────────────────────────────────────────────────────
function cleanPhone(raw) {
  return String(raw || '').replace(/[^\d+]/g, '').trim()
}

const ACCENT = '#1D9E75'

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ['CSV Upload', 'Konfiguration', 'Plan erstellen', 'Plan anpassen', 'Ergebnis']
  return (
    <div className="flex items-center justify-center gap-0 mb-10 flex-wrap">
      {steps.map((label, i) => {
        const num = i + 1
        const active = current === num
        const done = current > num
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{ backgroundColor: done ? ACCENT : active ? ACCENT : '#e5e7eb', color: done || active ? 'white' : '#6b7280' }}
              >
                {done ? '✓' : num}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-green-700' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-12 h-0.5 mb-5 mx-1" style={{ backgroundColor: done ? ACCENT : '#e5e7eb' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: CSV Upload ───────────────────────────────────────────────────────
function Step1({ onNext }) {
  const [dragging, setDragging] = useState(false)
  const [teams, setTeams] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result)
        setTeams(parsed)
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
    else setError('Bitte eine CSV-Datei hochladen.')
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">CSV hochladen</h2>
      <p className="text-gray-500 mb-8">Exportiere deine Google Forms Antworten als CSV und lade sie hier hoch.</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors mb-6"
        style={{ borderColor: dragging ? ACCENT : '#d1d5db', backgroundColor: dragging ? '#f0fdf6' : '#fafafa' }}
      >
        <div className="text-5xl mb-4">📂</div>
        <p className="text-lg font-semibold text-gray-700 mb-1">CSV-Datei hierher ziehen</p>
        <p className="text-gray-400 text-sm">oder klicken zum Auswählen</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {teams && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="font-semibold text-green-800 mb-3">✅ {teams.length} Teams erkannt</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {teams.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600 bg-white rounded-lg px-3 py-2">
                <span className="font-medium text-gray-800 flex-1">{t.names}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.diet === 'vegan' ? 'bg-green-100 text-green-700' : t.diet === 'vegetarisch' ? 'bg-lime-100 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>{t.diet}</span>
                {t.allergies && <span className="text-xs text-orange-500 truncate max-w-24" title={t.allergies}>⚠️ {t.allergies}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <button disabled={!teams} onClick={() => onNext(teams)} className="w-full py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
        Weiter zur Konfiguration →
      </button>
    </div>
  )
}

// ─── Step 2: Config ───────────────────────────────────────────────────────────
function Step2({ teams, onNext, onBack }) {
  const [config, setConfig] = useState({ date: '', timeStarter: '18:00', timeMain: '19:30', timeDessert: '21:00', dessertAddress: '', dessertDoorbell: '', contacts: '', whatsappLink: '' })
  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }))
  const valid = config.date && config.dessertAddress

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Event konfigurieren</h2>
      <p className="text-gray-500 mb-8">{teams.length} Teams geladen. Füge jetzt die Event-Details hinzu.</p>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Event-Datum *</label>
          <input type="date" value={config.date} onChange={e => set('date', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[{ key: 'timeStarter', label: '🥗 Vorspeise' }, { key: 'timeMain', label: '🍝 Hauptspeise' }, { key: 'timeDessert', label: '🍰 Nachspeise' }].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
              <input type="time" value={config[key]} onChange={e => set(key, e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse Nachspeise-Ort (gemeinsam) *</label>
          <input type="text" placeholder="Musterstraße 42, 10115 Berlin" value={config.dessertAddress} onChange={e => set('dessertAddress', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Klingelschild Nachspeise-Ort</label>
          <input type="text" placeholder="z.B. Müller" value={config.dessertDoorbell} onChange={e => set('dessertDoorbell', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Kontaktpersonen (Name + Nummer)</label>
          <textarea rows={3} placeholder={"Lisa Müller: 0151 12345678\nMax Schmidt: 0172 87654321"} value={config.contacts} onChange={e => set('contacts', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp-Broadcast-Link (optional)</label>
          <input type="url" placeholder="https://chat.whatsapp.com/..." value={config.whatsappLink} onChange={e => set('whatsappLink', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2" />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">← Zurück</button>
        <button disabled={!valid} onClick={() => onNext(config)} className="flex-1 py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-40" style={{ backgroundColor: ACCENT }}>Weiter →</button>
      </div>
    </div>
  )
}

// ─── Step 3: Generate ─────────────────────────────────────────────────────────
function Step3({ teams, config, onNext, onBack }) {
  const [phase, setPhase] = useState('idle') // idle | geocoding | assigning | done
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setError('')
    setPhase('geocoding')
    const total = teams.length + 1
    setGeoProgress({ done: 0, total })

    try {
      // 1. Geocode all addresses
      const { teamCoords, dessertCoord } = await geocodeAddresses(
        teams,
        config.dessertAddress,
        (done, tot) => setGeoProgress({ done, total: tot })
      )

      // 2. Build distance matrix
      setPhase('assigning')
      const distMatrix = buildDistanceMatrix(teams, teamCoords)

      // 3. Run backtracking assignment
      const result = assignTeams(teams, distMatrix)

      // 4. Attach coordinates + distMatrix to result for later use
      result.teamCoords = teamCoords
      result.dessertCoord = dessertCoord
      result.distMatrix = distMatrix

      setPhase('done')
      onNext(result)
    } catch (err) {
      setPhase('idle')
      setError(err.message)
    }
  }

  const dateStr = config.date ? new Date(config.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const loading = phase === 'geocoding' || phase === 'assigning'

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan erstellen</h2>
      <p className="text-gray-500 mb-8">Alles bereit – der Algorithmus verteilt jetzt die Teams optimal.</p>
      <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-3">
        {[
          { icon: '📅', label: 'Datum', val: dateStr || '—' },
          { icon: '👥', label: 'Teams', val: `${teams.length} Teams (${teams.length * 2}–${teams.length * 3} Personen)` },
          { icon: '⏰', label: 'Uhrzeiten', val: `${config.timeStarter} / ${config.timeMain} / ${config.timeDessert} Uhr` },
          { icon: '🍰', label: 'Nachspeise-Ort', val: config.dessertAddress },
        ].map(({ icon, label, val }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-gray-900">{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Geocoding progress */}
      {phase === 'geocoding' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            📍 Adressen werden ermittelt… {geoProgress.done} von {geoProgress.total}
          </p>
          <div className="w-full bg-blue-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ width: `${geoProgress.total > 0 ? (geoProgress.done / geoProgress.total) * 100 : 0}%`, backgroundColor: ACCENT }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-1.5">Geocoding mit OpenStreetMap (ca. 1 Sek. pro Adresse)</p>
        </div>
      )}

      {phase === 'assigning' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-900">🔀 Optimale Zuweisung wird berechnet…</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">← Zurück</button>
        <button onClick={handleGenerate} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
          {loading ? '⏳ Läuft…' : '🎲 Dinner-Plan erstellen'}
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Manual Adjustment ────────────────────────────────────────────────
function Step4ManualAdjustment({ plan, config, onNext, onBack }) {
  const courses = ['starter', 'main', 'dessert']
  const courseLabels = { starter: 'Vorspeise', main: 'Hauptspeise', dessert: 'Nachspeise' }
  const courseEmojis = { starter: '🥗', main: '🍝', dessert: '🍰' }

  // hostCourseMap: mutable state for drag & drop
  const [hostCourseMap, setHostCourseMap] = useState(() => {
    const map = {}
    for (const t of plan.teams) map[t.id] = t.hostCourse
    return map
  })
  const [draggedId, setDraggedId] = useState(null)
  const [regenerating, setRegenerating] = useState(false)

  // Rebuild the plan whenever hostCourseMap changes
  const rebuildPlan = (newMap) => {
    return assignTeams(plan.teams.map(t => ({ ...t })), plan.distMatrix || null, newMap)
  }

  const [previewPlan, setPreviewPlan] = useState(plan)

  const handleDragStart = (e, teamId) => {
    setDraggedId(teamId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const handleDrop = (e, targetCourse) => {
    e.preventDefault()
    if (!draggedId) return
    const newMap = { ...hostCourseMap, [draggedId]: targetCourse }
    setHostCourseMap(newMap)
    setDraggedId(null)

    // Rebuild plan with new overrides
    setRegenerating(true)
    try {
      const rebuilt = rebuildPlan(newMap)
      rebuilt.teamCoords = plan.teamCoords
      rebuilt.dessertCoord = plan.dessertCoord
      setPreviewPlan(rebuilt)
    } catch { /* ignore */ }
    setRegenerating(false)
  }
  const handleDragEnd = () => setDraggedId(null)

  const validation = validatePlan(previewPlan)

  // Group teams by course for column display
  const byHostCourse = { starter: [], main: [], dessert: [] }
  for (const t of previewPlan.teams) {
    byHostCourse[t.hostCourse]?.push(t)
  }

  const dietColors = {
    vegan: 'bg-green-100 text-green-700',
    vegetarisch: 'bg-lime-100 text-lime-700',
    omnivor: 'bg-gray-100 text-gray-500',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan überprüfen & anpassen</h2>
      <p className="text-gray-500 mb-2">Verschiebe Teams per Drag & Drop zwischen den Gängen. Der Plan wird sofort angepasst.</p>

      {/* Validation badge */}
      <div className="flex flex-wrap gap-3 mb-6">
        {validation.duplicates === 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">
            ✅ Keine doppelten Begegnungen
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700">
            ⚠️ {validation.duplicates} doppelte Begegnung{validation.duplicates !== 1 ? 'en' : ''} – bitte anpassen
          </span>
        )}
        {plan.warning && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-700">
            ℹ️ {plan.warning}
          </span>
        )}
      </div>

      {/* Three-column drag & drop board */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {courses.map(course => (
          <div
            key={course}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, course)}
            className="min-h-40 rounded-2xl border-2 border-dashed p-3 transition-colors"
            style={{ borderColor: draggedId ? ACCENT : '#d1d5db', backgroundColor: '#f9fafb' }}
          >
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
              <span>{courseEmojis[course]}</span>
              <span>{courseLabels[course]}</span>
              <span className="ml-auto font-normal text-gray-300">{byHostCourse[course].length} Teams</span>
            </div>
            <div className="space-y-2">
              {byHostCourse[course].map(team => (
                <div
                  key={team.id}
                  draggable
                  onDragStart={e => handleDragStart(e, team.id)}
                  onDragEnd={handleDragEnd}
                  className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-md"
                  style={{ opacity: draggedId === team.id ? 0.4 : 1 }}
                >
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{team.names}</p>
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 ${dietColors[team.diet] || dietColors.omnivor}`}>
                    {team.diet}
                  </span>
                  {team.allergies && <span className="ml-1 text-xs text-orange-500">⚠️</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">← Zurück</button>
        <button
          onClick={() => onNext(previewPlan)}
          className="flex-1 py-3 rounded-xl font-semibold text-white text-base transition-opacity"
          style={{ backgroundColor: ACCENT }}
        >
          Plan bestätigen & Nachrichten erstellen →
        </button>
      </div>
    </div>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={handleCopy} className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors" style={{ borderColor: copied ? ACCENT : '#d1d5db', color: copied ? ACCENT : '#6b7280', backgroundColor: copied ? '#f0fdf6' : 'white' }}>
      {copied ? '✅ Kopiert' : '📋 Kopieren'}
    </button>
  )
}

// ─── Map Tab ──────────────────────────────────────────────────────────────────
const MARKER_COLORS = {
  starter: '#3b82f6',   // blue
  main: '#8b5cf6',      // purple
  dessert: '#f97316',   // orange
  shared: '#1D9E75',    // green
}

async function geocode(address) {
  if (!address) return null
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'de' } })
    const data = await res.json()
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* ignore */ }
  return null
}

function createSvgIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 24 14 24s14-14.667 14-24C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}

function MapTab({ plan, config }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)

  useEffect(() => {
    if (!window.L || !mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }

    const L = window.L
    const map = L.map(mapRef.current, { zoomControl: true }).setView([52.52, 13.405], 12)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const points = []
    const addMarker = (address, name, course, color) => {
      if (!address) return Promise.resolve()
      return geocode(address).then(coords => {
        if (!coords) return
        points.push(coords)
        const icon = L.icon({ iconUrl: createSvgIcon(color), iconSize: [28, 38], iconAnchor: [14, 38], popupAnchor: [0, -38] })
        const courseLabel = { starter: 'Vorspeise', main: 'Hauptspeise', dessert: 'Nachspeise', shared: 'Gemeinsamer Nachspeise-Ort' }
        L.marker([coords.lat, coords.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${name}</strong><br/>${courseLabel[course]}<br/><small>${address}</small>`)
      })
    }

    // Geocode all hosts + shared dessert location
    const tasks = []
    const hostsAdded = new Set()

    for (const course of ['starter', 'main', 'dessert']) {
      for (const group of (plan.groups[course] || [])) {
        const host = group.host
        if (!hostsAdded.has(host.id)) {
          hostsAdded.add(host.id)
          tasks.push(addMarker(host.address, host.names, course, MARKER_COLORS[course]))
        }
      }
    }
    tasks.push(addMarker(config.dessertAddress, 'Gemeinsamer Nachspeise-Ort', 'shared', MARKER_COLORS.shared))

    Promise.all(tasks).then(() => {
      setLoading(false)
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }

      // Build share URL
      const encoded = btoa(JSON.stringify({ points, config: { dessertAddress: config.dessertAddress } }))
      setShareUrl(window.location.origin + '/map?data=' + encodeURIComponent(encoded))
    })

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [plan, config])

  const handleSavePdf = async () => {
    setSavingPdf(true)
    try {
      const el = mapRef.current
      const canvas = await html2canvas(el, { useCORS: true, scale: 1.5 })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height / canvas.width) * w
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      pdf.save('running-dinner-karte.pdf')
    } finally { setSavingPdf(false) }
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {[['starter', 'Vorspeise-Hosts', MARKER_COLORS.starter], ['main', 'Hauptspeise-Hosts', MARKER_COLORS.main], ['dessert', 'Nachspeise-Hosts', MARKER_COLORS.dessert], ['shared', 'Gemeinsamer Ort', MARKER_COLORS.shared]].map(([, label, color]) => (
          <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-sm text-gray-500">Adressen werden geocodiert…</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={handleSavePdf}
          disabled={savingPdf || loading}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {savingPdf ? '⏳ Speichern…' : '📥 Karte als PDF speichern'}
        </button>
        <button
          onClick={handleShare}
          disabled={loading || !shareUrl}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border transition-colors disabled:opacity-40"
          style={{ borderColor: copied ? ACCENT : '#d1d5db', color: copied ? ACCENT : '#374151', backgroundColor: copied ? '#f0fdf6' : 'white' }}
        >
          {copied ? '✅ Link kopiert!' : '🔗 Kartenlink teilen'}
        </button>
      </div>
    </div>
  )
}

// ─── MessagesTab ──────────────────────────────────────────────────────────────
function MessagesTab({ messages, config, handleMessageDocx }) {
  // ── mailto helpers ──
  const buildMailto = (team, text) => {
    const email = team.email || ''
    const email2 = team.email2 || ''
    const subject = encodeURIComponent('Dein persönlicher Running Dinner Plan 🍽️')
    const body = encodeURIComponent(text)
    let href = `mailto:${email}?subject=${subject}&body=${body}`
    if (email2) href += `&cc=${encodeURIComponent(email2)}`
    return href
  }

  const [openAllHint, setOpenAllHint] = useState(false)
  const handleOpenAll = async () => {
    setOpenAllHint(true)
    for (let i = 0; i < messages.length; i++) {
      const { team, text } = messages[i]
      if (!team.email) continue
      const a = document.createElement('a')
      a.href = buildMailto(team, text)
      a.click()
      await new Promise(r => setTimeout(r, 800))
    }
  }

  // ── WhatsApp Broadcast ──
  const allPhones = messages.flatMap(({ team }) =>
    [team.phone, team.phone1, team.phone2].filter(Boolean).map(cleanPhone).filter(p => p.length >= 6)
  ).filter((p, i, arr) => arr.indexOf(p) === i)
  const phonesText = allPhones.join('\n')
  const [phonesCopied, setPhonesCopied] = useState(false)
  const copyPhones = async () => {
    await navigator.clipboard.writeText(phonesText)
    setPhonesCopied(true); setTimeout(() => setPhonesCopied(false), 2500)
  }

  // ── ICS / ZIP ──
  const downloadIcs = (team, text) => {
    const ics = buildIcs(team, config, text)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const name = `running-dinner-${team.names.replace(/[^a-zA-Z0-9äöüÄÖÜ]/g, '_').slice(0,30)}.ics`
    saveAs(blob, name)
  }
  const downloadAllIcs = async () => {
    const zip = new JSZip()
    messages.forEach(({ team, text }) => {
      const ics = buildIcs(team, config, text)
      const name = `${team.names.replace(/[^a-zA-Z0-9äöüÄÖÜ]/g, '_').slice(0,30)}.ics`
      zip.file(name, ics)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'running-dinner-kalender.zip')
  }

  const noDate = !config.date
  const teamsWithEmail = messages.filter(m => m.team.email)

  return (
    <div className="space-y-6">

      {/* ── Mail Section ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✉️</span>
            <span className="font-semibold text-gray-900 text-sm">Mails öffnen</span>
            <span className="text-xs text-gray-400">({teamsWithEmail.length} von {messages.length} mit E-Mail)</span>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {openAllHint && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              ℹ️ Dein Browser öffnet für jedes Team ein Mail-Fenster. Bitte erlaube Pop-ups falls nötig.
            </div>
          )}
          <button
            onClick={handleOpenAll}
            disabled={teamsWithEmail.length === 0}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            📨 Alle {teamsWithEmail.length} Mails öffnen (nacheinander)
          </button>
          {messages.some(m => !m.team.email) && (
            <p className="text-xs text-orange-600">⚠️ {messages.filter(m => !m.team.email).length} Teams ohne E-Mail – diese werden übersprungen.</p>
          )}
        </div>
      </div>

      {/* ── WhatsApp Broadcast Section ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <span className="font-semibold text-gray-900 text-sm">WhatsApp-Broadcast</span>
            <span className="text-xs text-gray-400">({allPhones.length} Nummern)</span>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Ein WhatsApp-Broadcast erlaubt dir, allen Teilnehmern gleichzeitig eine Nachricht zu schicken, ohne dass sie sich gegenseitig sehen.
          </p>
          <textarea
            readOnly value={phonesText}
            rows={Math.min(allPhones.length, 8)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 bg-gray-50 resize-none focus:outline-none"
          />
          <button onClick={copyPhones}
            className="w-full py-2.5 rounded-lg text-sm font-semibold border transition-colors"
            style={{ borderColor: phonesCopied ? ACCENT : '#d1d5db', color: phonesCopied ? ACCENT : '#374151', backgroundColor: phonesCopied ? '#f0fdf6' : 'white' }}>
            {phonesCopied ? '✅ Nummern kopiert!' : '📋 Alle Nummern kopieren'}
          </button>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
            💡 Öffne WhatsApp → Neue Broadcast-Liste → füge die kopierten Nummern hinzu. Alle Teilnehmer erhalten die Nachricht einzeln – sie sehen sich nicht gegenseitig.
          </div>
        </div>
      </div>

      {/* ── ZIP all ICS ── */}
      <div className="flex gap-2">
        <button onClick={downloadAllIcs}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
          📅 Alle Kalender-Einladungen als ZIP
          {noDate && <span className="ml-1 text-orange-500 text-xs">(kein Datum)</span>}
        </button>
      </div>

      {/* ── Per-team cards ── */}
      <div className="space-y-4">
        {messages.map(({ team, text }, i) => {
          const hasEmail = !!team.email
          return (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{team.names}</span>
                <div className="flex gap-1.5 flex-wrap">
                  <CopyButton text={text} />
                  <button onClick={() => downloadIcs(team, text)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                    📅 .ics
                  </button>
                  {hasEmail ? (
                    <a
                      href={buildMailto(team, text)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border text-white transition-colors"
                      style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
                      title={`Mail an ${team.email}${team.email2 ? ` + CC: ${team.email2}` : ''}`}
                    >
                      ✉️ Mail öffnen
                    </a>
                  ) : (
                    <span
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-300 cursor-not-allowed"
                      title="Keine E-Mail-Adresse in den Anmeldedaten"
                    >
                      ✉️ keine E-Mail
                    </span>
                  )}
                </div>
              </div>
              <pre className="px-4 py-4 text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
            </div>
          )
        })}
      </div>

      {/* ── DOCX Export ── */}
      <button onClick={handleMessageDocx} className="w-full py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
        📄 Alle Nachrichten als Word-Datei (.docx)
      </button>
    </div>
  )
}

// ─── Step 5: Results ──────────────────────────────────────────────────────────
function Step5({ plan, teams, config, onBack }) {
  const [tab, setTab] = useState('plan')
  const planTableRef = useRef(null)

  const courseLabels = { starter: 'Vorspeise', main: 'Hauptspeise', dessert: 'Nachspeise' }
  const dateStr = config.date ? new Date(config.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : config.date

  const messages = plan.teams.map(team => ({ team, text: buildMessage(team, plan, { ...config, date: dateStr }) }))
  const validation = validatePlan(plan)
  const distStats = plan.teamCoords ? calculateTotalDistance(plan, plan.teamCoords, plan.dessertCoord) : null
  const teamsWithAllergies = plan.teams.filter(t => t.allergies && t.allergies.trim())

  // PDF: plan table
  const handlePlanPdf = async () => {
    const el = planTableRef.current
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const w = pdf.internal.pageSize.getWidth() - 20
    const h = (canvas.height / canvas.width) * w
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, w, h)
    pdf.save('running-dinner-plan.pdf')
  }

  // CSV: plan table
  const handlePlanCsv = () => {
    const header = ['Team', 'Kocht Gang', 'Vorspeise bei (Adresse)', 'Hauptspeise bei (Adresse)', 'Ernährung', 'Allergien']
    const rows = plan.teams.map(team => [
      team.names,
      courseLabels[team.hostCourse] || team.hostCourse || '',
      team.groups?.starter?.host?.address || team.groups?.starter?.host?.names || '—',
      team.groups?.main?.host?.address || team.groups?.main?.host?.names || '—',
      team.diet || '',
      team.allergies || '',
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'running-dinner-plan.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // DOCX: messages
  const handleMessageDocx = async () => {
    const children = []
    messages.forEach(({ team, text }, i) => {
      children.push(new Paragraph({ text: team.names, heading: HeadingLevel.HEADING_1 }))
      text.split('\n').forEach(line => {
        children.push(new Paragraph({ children: [new TextRun({ text: line })] }))
      })
      if (i < messages.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }))
      }
    })
    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, 'running-dinner-nachrichten.docx')
  }

  const tabs = [
    { id: 'plan', label: '📊 Plan-Übersicht' },
    { id: 'messages', label: '💬 Nachrichten' },
    { id: 'map', label: '🗺️ Karte' },
    { id: 'notes', label: '⚠️ Hinweise' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Euer Dinner-Plan 🎉</h2>
      <p className="text-gray-500 mb-6">Plan erfolgreich erstellt für {plan.teams.length} Teams.</p>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 min-w-0 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
            style={tab === t.id ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6b7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <div ref={planTableRef} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="pb-3 pr-4 font-semibold">Team</th>
                  <th className="pb-3 pr-4 font-semibold">Kocht</th>
                  <th className="pb-3 pr-4 font-semibold">🥗 Vorspeise bei</th>
                  <th className="pb-3 pr-4 font-semibold">🍝 Hauptspeise bei</th>
                  <th className="pb-3 font-semibold">Ernährung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plan.teams.map((team, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="py-3 pr-4 font-medium text-gray-900">{team.names}</td>
                    <td className="py-3 pr-4 text-gray-500">{courseLabels[team.hostCourse]}</td>
                    <td className="py-3 pr-4">{team.groups.starter?.host?.names || '—'}</td>
                    <td className="py-3 pr-4">{team.groups.main?.host?.names || '—'}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${team.diet === 'vegan' ? 'bg-green-100 text-green-700' : team.diet === 'vegetarisch' ? 'bg-lime-100 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>{team.diet}</span>
                      {team.allergies && <span className="ml-1 text-xs text-orange-500">⚠️</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handlePlanPdf} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
              📥 Als PDF speichern
            </button>
            <button onClick={handlePlanCsv} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
              📊 Als CSV exportieren
            </button>
          </div>

          {/* Validation summary */}
          <div className="mt-5 flex flex-wrap gap-3">
            {validation.duplicates === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                ✅ Keine doppelten Begegnungen
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                ⚠️ {validation.duplicates} doppelte Begegnung{validation.duplicates !== 1 ? 'en' : ''} – zurück und anpassen
              </span>
            )}
            {distStats && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                🗺️ Geschätzte Gesamtdistanz: {distStats.totalKm} km · Ø {distStats.avgKmPerTeam} km/Team
              </span>
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <MessagesTab
          messages={messages}
          config={config}
          handleMessageDocx={handleMessageDocx}
        />
      )}

      {tab === 'map' && (
        <MapTab plan={plan} config={config} />
      )}

      {tab === 'notes' && (
        <div>
          {teamsWithAllergies.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">Keine Allergien oder Unverträglichkeiten gemeldet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">{teamsWithAllergies.length} Team(s) mit Allergien oder Unverträglichkeiten:</p>
              {teamsWithAllergies.map((team, i) => (
                <div key={i} className="flex gap-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-gray-900">{team.names}</p>
                    <p className="text-sm text-orange-700 mt-0.5">{team.allergies}</p>
                    <p className="text-xs text-gray-400 mt-1">Kocht: {courseLabels[team.hostCourse]} | Ernährung: {team.diet}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={onBack} className="mt-8 w-full py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
        ← Neu generieren
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ToolPage() {
  const location = useLocation()
  // Accept teams injected via React Router state (from AdminPage)
  const injectedTeams = location.state?.teams ?? null

  const [step, setStep] = useState(injectedTeams ? 2 : 1)
  const [teams, setTeams] = useState(injectedTeams)
  const [config, setConfig] = useState(null)
  const [plan, setPlan] = useState(null)
  const [finalPlan, setFinalPlan] = useState(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:opacity-80 transition-opacity">
            <span style={{ color: ACCENT }}>🍽️</span>
            <span>Running Dinner</span>
          </Link>
          <span className="text-sm text-gray-400">Generator</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <StepIndicator current={step} />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 1 && <Step1 onNext={(t) => { setTeams(t); setStep(2) }} />}
          {step === 2 && <Step2 teams={teams} onNext={(c) => { setConfig(c); setStep(3) }} onBack={() => setStep(1)} />}
          {step === 3 && <Step3 teams={teams} config={config} onNext={(p) => { setPlan(p); setStep(4) }} onBack={() => setStep(2)} />}
          {step === 4 && plan && <Step4ManualAdjustment plan={plan} config={config} onNext={(p) => { setFinalPlan(p); setStep(5) }} onBack={() => setStep(3)} />}
          {step === 5 && finalPlan && <Step5 plan={finalPlan} teams={teams} config={config} onBack={() => setStep(4)} />}
        </div>
      </div>
    </div>
  )
}
