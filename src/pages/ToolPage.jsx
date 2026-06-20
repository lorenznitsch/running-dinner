import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { parseCSV, buildMessage } from '../utils/algorithm'
import { geocodeAddresses, buildDistanceMatrix, assignTeams, validatePlan, calculateTotalDistance, haversineDistance } from '../lib/dinnerAlgorithm'
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
  const [phase, setPhase] = useState('idle') // idle | validating | geocoding | assigning | done
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [validationResult, setValidationResult] = useState(null)

  const computeValidation = () => {
    const n = teams.length
    const targetHosts = Math.floor(n / 3)
    const balanced = targetHosts === Math.floor(n / 3) // always true, but show the numbers
    const remainder = n - 2 * targetHosts // dessert-prep teams
    const teamsPerTable = 3  // 1 host + 2 guests
    const peoplePerTable = teamsPerTable * 2 // assuming 2 people per team
    const totalTables = 2 * targetHosts // starter + main tables
    const tablesWithIdealSize = remainder === 0 ? totalTables : Math.max(0, totalTables - remainder)

    return {
      n, targetHosts, remainder, balanced, totalTables,
      tablesWithIdealSize, peoplePerTable,
      hostsOk: true, // always balanced by algorithm
    }
  }

  const handleValidate = () => {
    setError('')
    setValidationResult(computeValidation())
    setPhase('validating')
  }

  const startGeocoding = async () => {
    setPhase('geocoding')
    const total = teams.length + 1
    setGeoProgress({ done: 0, total })

    try {
      const { teamCoords, dessertCoord } = await geocodeAddresses(
        teams,
        config.dessertAddress,
        (done, tot) => setGeoProgress({ done, total: tot })
      )

      setPhase('assigning')
      const distMatrix = buildDistanceMatrix(teams, teamCoords)

      const dessertDistances = {}
      if (dessertCoord) {
        for (const team of teams) {
          if (teamCoords[team.id]) {
            dessertDistances[team.id] = haversineDistance(teamCoords[team.id], dessertCoord)
          }
        }
      }

      const result = assignTeams(teams, distMatrix, {}, 1000, dessertDistances)
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

      {/* Validation result */}
      {phase === 'validating' && validationResult && (() => {
        const v = validationResult
        const allOk = v.remainder === 0
        return (
          <div className={`mb-6 p-5 rounded-xl border ${allOk ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`font-bold text-sm mb-3 ${allOk ? 'text-green-900' : 'text-amber-900'}`}>
              {allOk ? '✅ Plan-Check erfolgreich' : '⚠️ Plan-Check mit Hinweisen'}
            </p>
            <div className="space-y-2 mb-4 text-sm">
              {/* Check 1: Host-Anzahl */}
              <div className="flex items-start gap-2">
                <span>✅</span>
                <span className={allOk ? 'text-green-800' : 'text-amber-800'}>
                  <strong>Host-Anzahl ausgeglichen:</strong> je {v.targetHosts} Vorspeise- und Hauptspeise-Hosts
                </span>
              </div>
              {/* Check 2: Tischgrößen */}
              <div className="flex items-start gap-2">
                <span>{v.remainder === 0 ? '✅' : '⚠️'}</span>
                <span className={allOk ? 'text-green-800' : 'text-amber-800'}>
                  <strong>Tischgröße:</strong>{' '}
                  {v.remainder === 0
                    ? `Alle ${v.totalTables} Tische haben je 3 Teams (ca. 6 Personen) – optimal`
                    : `${v.n} Teams sind nicht exakt durch 3 teilbar (Rest: ${v.remainder}). Einige Tische werden mehr oder weniger Personen haben.`}
                </span>
              </div>
              {/* Check 3: summary */}
              <div className="flex items-start gap-2">
                <span>ℹ️</span>
                <span className={allOk ? 'text-green-800' : 'text-amber-800'}>
                  {v.totalTables} Tische insgesamt · {v.targetHosts} Vorspeise-Tische · {v.targetHosts} Hauptspeise-Tische
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onBack}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-white transition-colors">
                ← Zurück zur Konfiguration
              </button>
              <button onClick={startGeocoding}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                style={{ backgroundColor: ACCENT }}>
                Trotzdem fortfahren →
              </button>
            </div>
          </div>
        )
      })()}

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
      {phase !== 'validating' && (
        <div className="flex gap-3">
          <button onClick={onBack} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">← Zurück</button>
          <button onClick={handleValidate} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
            {loading ? '⏳ Läuft…' : '🎲 Dinner-Plan erstellen'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Step 4 Map (uses pre-computed coords, filterable) ────────────────────────
const S4_CAT = [
  { key: 'starter',    label: 'Vorspeise-Hosts',  color: '#3b82f6' },
  { key: 'main',       label: 'Hauptspeise-Hosts', color: '#8b5cf6' },
  { key: 'shared',     label: 'Nachspeise-Ort',   color: '#1D9E75' },
  { key: 'unselected', label: 'Nicht ausgewählt',  color: '#9ca3af' },
]

function Step4MapView({ plan, config }) {
  const mapRef  = useRef(null)
  const mapInst = useRef(null)
  const markRef = useRef({ starter: [], main: [], shared: [], unselected: [] })
  const [vis, setVis] = useState({ starter: true, main: true, shared: true, unselected: true })

  useEffect(() => {
    if (!window.L || !mapRef.current || !plan.teamCoords) return
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
    markRef.current = { starter: [], main: [], shared: [], unselected: [] }

    const L = window.L
    const map = L.map(mapRef.current).setView([52.52, 13.405], 12)
    mapInst.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map)

    const points = []
    const catColors = Object.fromEntries(S4_CAT.map(c => [c.key, c.color]))
    const mkIcon = (color, small) => {
      const [w, h] = small ? [20, 28] : [26, 36]
      return L.icon({ iconUrl: createSvgIcon(color), iconSize: [w, h], iconAnchor: [w/2, h], popupAnchor: [0, -h] })
    }
    const addM = (cat, lat, lng, popup) => {
      const m = L.marker([lat, lng], { icon: mkIcon(catColors[cat], cat === 'unselected') }).bindPopup(popup)
      m.addTo(map) // always add; filter will hide if vis[cat]=false below
      markRef.current[cat].push(m)
      points.push([lat, lng])
    }

    const hostIds = new Set()
    for (const course of ['starter', 'main']) {
      for (const g of (plan.groups[course] || [])) {
        if (hostIds.has(g.host.id)) continue
        hostIds.add(g.host.id)
        const c = plan.teamCoords[g.host.id]
        if (c) addM(course, c.lat, c.lng, `<strong>${g.host.names}</strong><br/>${course === 'starter' ? 'Vorspeise' : 'Hauptspeise'}<br/><small>${g.host.address || ''}</small>`)
      }
    }
    if (plan.dessertCoord) {
      addM('shared', plan.dessertCoord.lat, plan.dessertCoord.lng, `<strong>Nachspeise-Ort</strong><br/><small>${config.dessertAddress || ''}</small>`)
    }
    for (const team of plan.teams) {
      if (hostIds.has(team.id)) continue
      const c = plan.teamCoords[team.id]
      if (c) addM('unselected', c.lat, c.lng, `<strong>${team.names}</strong><br/>Gast (nicht ausgewählt)<br/><small>${team.address || ''}</small>`)
    }

    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null } }
  }, [plan, config])

  const toggleCat = (cat) => {
    const nv = { ...vis, [cat]: !vis[cat] }
    setVis(nv)
    ;(markRef.current[cat] || []).forEach(m => { if (nv[cat]) m.addTo(mapInst.current); else m.remove() })
  }

  if (!plan.teamCoords) return <p className="text-sm text-gray-400 py-4 text-center">Keine Koordinaten – Plan neu generieren.</p>

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {S4_CAT.map(({ key, label, color }) => (
          <button key={key} onClick={() => toggleCat(key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor: vis[key] ? color : '#d1d5db', backgroundColor: vis[key] ? color + '18' : 'white', color: vis[key] ? color : '#9ca3af' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: vis[key] ? color : '#d1d5db' }} />{label}
          </button>
        ))}
      </div>
      <div ref={mapRef} style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }} />
    </div>
  )
}

// ─── Step 4: Manual Adjustment ────────────────────────────────────────────────
function Step4ManualAdjustment({ plan, config, onNext, onBack }) {
  const [localPlan,    setLocalPlan]    = useState(plan)
  const [hostCourseMap, setHostCourseMap] = useState(() => {
    const map = {}
    for (const t of plan.teams) map[t.id] = t.hostCourse
    return map
  })
  const [swapPopup,   setSwapPopup]   = useState(null) // { teamId, newCourse, oldCourse, candidates }
  const [tischSwap,   setTischSwap]   = useState(null) // { teamId, course, currentHostId }
  const [innerTab,    setInnerTab]    = useState('tisch') // 'tisch' | 'team'
  const [mapOpen,     setMapOpen]     = useState(false)
  const [routesOpen,  setRoutesOpen]  = useState(false)

  const DIET_COLOR   = { vegan: 'bg-green-100 text-green-700', vegetarisch: 'bg-lime-100 text-lime-700', omnivor: 'bg-gray-100 text-gray-500' }
  const DIET_EMOJI   = { vegan: '🌱', vegetarisch: '🥗', omnivor: '🥩' }
  const COURSE_LABEL = { starter: '🥗 Vorspeise', main: '🍝 Hauptspeise', dessert: '🍰 Nachspeise' }
  const COURSE_COLOR = { starter: '#3b82f6', main: '#8b5cf6' }

  const dietBadge = (diet) => (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${DIET_COLOR[diet] || DIET_COLOR.omnivor}`}>
      {DIET_EMOJI[diet] || ''} {diet}
    </span>
  )

  const rebuildFromMap = (newMap) => {
    try {
      const r = assignTeams(plan.teams.map(t => ({ ...t })), plan.distMatrix || null, newMap)
      r.teamCoords = plan.teamCoords; r.dessertCoord = plan.dessertCoord; r.distMatrix = plan.distMatrix
      return r
    } catch { return localPlan }
  }

  const handleKochtChange = (teamId, newCourse) => {
    const oldCourse = localPlan.teams.find(t => t.id === teamId)?.hostCourse
    if (oldCourse === newCourse) return
    const candidates = localPlan.teams.filter(t => t.id !== teamId)
    setSwapPopup({ teamId, newCourse, oldCourse, candidates })
  }

  const confirmSwap = (swapWithId) => {
    const { teamId, newCourse, oldCourse } = swapPopup
    const newMap = { ...hostCourseMap, [teamId]: newCourse, [swapWithId]: oldCourse }
    setHostCourseMap(newMap)
    setSwapPopup(null)
    setLocalPlan(rebuildFromMap(newMap))
  }

  const swapInCourse = (course, movingTeamId, newHostId) => {
    const groups = localPlan.groups[course]
    if (!groups) return
    const srcGroup = groups.find(g => g.guests.some(gu => gu.id === movingTeamId))
    const dstGroup = groups.find(g => g.host.id === newHostId)
    if (!srcGroup || !dstGroup || srcGroup === dstGroup) return
    const movingTeam = srcGroup.guests.find(gu => gu.id === movingTeamId)
    const swapTarget = dstGroup.guests[0]
    if (!swapTarget || !movingTeam) return

    const newGroups = {
      ...localPlan.groups,
      [course]: groups.map(g => {
        if (g === srcGroup) return { ...g, guests: g.guests.map(gu => gu.id === movingTeamId ? swapTarget : gu) }
        if (g === dstGroup) return { ...g, guests: g.guests.map(gu => gu.id === swapTarget.id ? movingTeam : gu) }
        return g
      }),
    }
    const coursGs = newGroups[course]
    const newTeams = localPlan.teams.map(t => {
      if (t.id === movingTeamId || t.id === swapTarget.id) {
        const grp = coursGs.find(g => g.host.id === t.id || g.guests.some(gu => gu.id === t.id))
        return { ...t, groups: { ...t.groups, [course]: grp || null } }
      }
      return t
    })
    setLocalPlan({ ...localPlan, groups: newGroups, teams: newTeams })
  }

  // Live stats
  const validation  = validatePlan(localPlan)
  const distStats   = localPlan.teamCoords ? calculateTotalDistance(localPlan, localPlan.teamCoords, localPlan.dessertCoord) : null
  const allGroups   = [...(localPlan.groups.starter || []), ...(localPlan.groups.main || [])]
  const dietOk      = allGroups.filter(g => [g.host, ...g.guests].every(m => m.diet === g.host.diet)).length
  const groupSizes  = allGroups.map(g => 1 + g.guests.length)
  const sizesUnique = [...new Set(groupSizes)]

  const starterGroups = localPlan.groups.starter || []
  const mainGroups    = localPlan.groups.main    || []
  const starterHosts  = starterGroups.map(g => g.host)
  const mainHosts     = mainGroups.map(g => g.host)

  // Status bar per table
  const tableStatuses = [
    ...starterGroups.map(g => ({ name: g.host.names, count: 1 + g.guests.length, course: 'starter' })),
    ...mainGroups.map(g => ({ name: g.host.names, count: 1 + g.guests.length, course: 'main' })),
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan überprüfen & anpassen</h2>
      <p className="text-gray-500 mb-4 text-sm">Überprüfe die Tischzuordnungen und passe sie bei Bedarf an.</p>

      {/* ── Inner tab switcher ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[{ id: 'tisch', label: '🪑 Tischansicht' }, { id: 'team', label: '📋 Teamansicht' }].map(t => (
          <button key={t.id} onClick={() => setInnerTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
            style={innerTab === t.id ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TISCHANSICHT ══ */}
      {innerTab === 'tisch' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4" style={{ minWidth: 0 }}>

            {/* Gang 1: Vorspeise */}
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                Gang 1 – Vorspeise
              </div>
              {starterGroups.map((group, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden mb-2">
                  <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#3b82f615', borderBottom: '1px solid #3b82f630' }}>
                    <span className="font-bold text-sm text-gray-900 flex-1 min-w-0 truncate" title={group.host.names}>{group.host.names}</span>
                    {dietBadge(group.host.diet)}
                  </div>
                  {group.guests.map(g => (
                    <div key={g.id} className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/40">
                      <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{g.names}</span>
                      {dietBadge(g.diet)}
                      <button onClick={() => setTischSwap({ teamId: g.id, course: 'starter', currentHostId: group.host.id })}
                        className="text-gray-300 hover:text-blue-500 text-base leading-none px-0.5 flex-shrink-0" title="Verschieben">⇄</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Gang 2: Hauptspeise */}
            <div>
              <div className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                Gang 2 – Hauptspeise
              </div>
              {mainGroups.map((group, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden mb-2">
                  <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#8b5cf615', borderBottom: '1px solid #8b5cf630' }}>
                    <span className="font-bold text-sm text-gray-900 flex-1 min-w-0 truncate" title={group.host.names}>{group.host.names}</span>
                    {dietBadge(group.host.diet)}
                  </div>
                  {group.guests.map(g => (
                    <div key={g.id} className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-100 last:border-b-0 hover:bg-purple-50/40">
                      <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{g.names}</span>
                      {dietBadge(g.diet)}
                      <button onClick={() => setTischSwap({ teamId: g.id, course: 'main', currentHostId: group.host.id })}
                        className="text-gray-300 hover:text-purple-500 text-base leading-none px-0.5 flex-shrink-0" title="Verschieben">⇄</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Gang 3: Nachspeise (gemeinsam) */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#1D9E75' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1D9E75' }} />
                Gang 3 – Nachspeise
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2" style={{ backgroundColor: '#1D9E7512', borderBottom: '1px solid #1D9E7530' }}>
                  <span className="font-bold text-xs text-gray-900 leading-tight block">{config.dessertAddress || 'Gemeinsamer Ort'}</span>
                  <span className="text-xs text-gray-400">Alle Teams</span>
                </div>
                {localPlan.teams.map(t => (
                  <div key={t.id} className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{t.names}</span>
                    {dietBadge(t.diet)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status bar per table */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-2">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {validation.duplicates === 0
                ? <span className="text-xs text-green-700 font-semibold bg-green-50 border border-green-200 px-2 py-1 rounded-lg">✅ Keine Doppelbegegnungen</span>
                : <span className="text-xs text-red-700 font-semibold bg-red-50 border border-red-200 px-2 py-1 rounded-lg">⚠️ {validation.duplicates} Doppelbegegnung{validation.duplicates !== 1 ? 'en' : ''}</span>}
              {distStats && <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">🗺️ Ø {distStats.avgKmPerTeam} km/Team</span>}
              <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-lg">🥗 {dietOk}/{allGroups.length} dietär kompatibel</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tableStatuses.map(({ name, count, course }, i) => {
                const ok = count === 3
                return (
                  <span key={i} className="text-xs px-2 py-1 rounded-lg border"
                    style={{ backgroundColor: ok ? '#f0fdf4' : '#fffbeb', borderColor: ok ? '#bbf7d0' : '#fde68a', color: ok ? '#15803d' : '#92400e' }}>
                    <span style={{ color: COURSE_COLOR[course] }}>■</span> {name.split('&')[0].trim()}: {count} Teams {ok ? '✅' : '⚠️'}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ TEAMANSICHT ══ */}
      {innerTab === 'team' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
            {validation.duplicates === 0
              ? <span className="text-green-700 font-semibold">✅ Keine Doppelbegegnungen</span>
              : <span className="text-red-700 font-semibold">⚠️ {validation.duplicates} Doppelbegegnung{validation.duplicates !== 1 ? 'en' : ''}</span>}
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">Tischgröße: {sizesUnique.length === 1 ? `${sizesUnique[0]} Teams` : `${Math.min(...groupSizes)}–${Math.max(...groupSizes)} Teams`}</span>
            {distStats && <><span className="text-gray-400">·</span><span className="text-blue-700">🗺️ Ø {distStats.avgKmPerTeam} km/Team</span></>}
            <span className="text-gray-400">·</span>
            <span className="text-purple-700">🥗 {dietOk}/{allGroups.length} Gruppen dietär kompatibel</span>
            {localPlan.warning && <><span className="text-gray-400">·</span><span className="text-orange-600">ℹ️ {localPlan.warning}</span></>}
          </div>

          <div className="overflow-x-auto mb-5 rounded-xl border border-gray-200">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2.5 font-semibold sticky left-0 bg-gray-50" style={{ minWidth: 150 }}>Team</th>
                  <th className="px-3 py-2.5 font-semibold">Ernährung</th>
                  <th className="px-3 py-2.5 font-semibold">Kocht</th>
                  <th className="px-3 py-2.5 font-semibold">🥗 Vorspeise bei</th>
                  <th className="px-3 py-2.5 font-semibold">🍝 Hauptspeise bei</th>
                </tr>
              </thead>
              <tbody>
                {localPlan.teams.map(team => {
                  const isStarterHost = team.groups?.starter?.host?.id === team.id
                  const isMainHost    = team.groups?.main?.host?.id    === team.id
                  const starterHostId = team.groups?.starter?.host?.id ?? ''
                  const mainHostId    = team.groups?.main?.host?.id    ?? ''
                  return (
                    <tr key={team.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-900 sticky left-0 bg-white whitespace-nowrap" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.04)' }}>
                        {team.names}
                        {team.allergies && <span className="ml-1 text-xs text-orange-500" title={team.allergies}>⚠️</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${DIET_COLOR[team.diet] || DIET_COLOR.omnivor}`}>
                          {DIET_EMOJI[team.diet] || ''} {team.diet}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select value={team.hostCourse} onChange={e => handleKochtChange(team.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1">
                          <option value="starter">🥗 Vorspeise</option>
                          <option value="main">🍝 Hauptspeise</option>
                          <option value="dessert">🍰 Nachspeise</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        {isStarterHost
                          ? <span className="text-xs font-semibold text-blue-600">Eigene Adresse</span>
                          : <select value={starterHostId} onChange={e => swapInCourse('starter', team.id, Number(e.target.value))}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1"
                              disabled={starterHosts.length === 0}>
                              {starterHosts.map(h => <option key={h.id} value={h.id}>{h.names}</option>)}
                            </select>}
                      </td>
                      <td className="px-3 py-2.5">
                        {isMainHost
                          ? <span className="text-xs font-semibold text-purple-600">Eigene Adresse</span>
                          : <select value={mainHostId} onChange={e => swapInCourse('main', team.id, Number(e.target.value))}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1"
                              disabled={mainHosts.length === 0}>
                              {mainHosts.map(h => <option key={h.id} value={h.id}>{h.names}</option>)}
                            </select>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Accordion: Karte ── */}
      <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
        <button onClick={() => setMapOpen(o => !o)}
          className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span>🗺️ Karte einblenden</span>
          <span className="text-gray-400 text-xs">{mapOpen ? '▲ Einklappen' : '▼ Einblenden'}</span>
        </button>
        {mapOpen && <div className="border-t border-gray-200 p-4"><Step4MapView plan={localPlan} config={config} /></div>}
      </div>

      {/* ── Accordion: Routen ── */}
      <div className="border border-gray-200 rounded-xl mb-6 overflow-hidden">
        <button onClick={() => setRoutesOpen(o => !o)}
          className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span>🚲 Routen einblenden</span>
          <span className="text-gray-400 text-xs">{routesOpen ? '▲ Einklappen' : '▼ Einblenden'}</span>
        </button>
        {routesOpen && <div className="border-t border-gray-200 p-4"><RoutesTab plan={localPlan} config={config} compact /></div>}
      </div>

      {/* ── Tisch Swap Modal ── */}
      {tischSwap && (() => {
        const groups = tischSwap.course === 'starter' ? starterGroups : mainGroups
        const team   = localPlan.teams.find(t => t.id === tischSwap.teamId)
        const color  = COURSE_COLOR[tischSwap.course]
        const otherGroups = groups.filter(g => g.host.id !== tischSwap.currentHostId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-gray-900 text-lg mb-1">⇄ {team?.names} verschieben</h3>
              <p className="text-gray-500 text-sm mb-4">
                Wähle einen anderen Tisch ({tischSwap.course === 'starter' ? 'Vorspeise' : 'Hauptspeise'}) für einen 1:1-Tausch:
              </p>
              <div className="space-y-2 mb-4">
                {otherGroups.map(g => (
                  <button key={g.host.id}
                    onClick={() => { swapInCourse(tischSwap.course, tischSwap.teamId, g.host.id); setTischSwap(null) }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                    <div className="font-semibold text-gray-900 text-sm">{g.host.names}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Tauscht mit: {g.guests[0]?.names || '?'}</div>
                  </button>
                ))}
                {otherGroups.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Keine anderen Tische verfügbar</p>}
              </div>
              <div className="border-t border-gray-100 pt-3 mb-3">
                <p className="text-xs text-gray-400 mb-2">Koch-Rolle ändern (öffnet Tausch-Dialog):</p>
                <div className="flex gap-2">
                  {['starter', 'main', 'dessert'].filter(c => c !== (localPlan.teams.find(t => t.id === tischSwap.teamId)?.hostCourse)).map(c => (
                    <button key={c} onClick={() => { setTischSwap(null); handleKochtChange(tischSwap.teamId, c) }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                      {COURSE_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setTischSwap(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Swap popup (Koch-Rolle) ── */}
      {swapPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Gang wechseln</h3>
            <p className="text-gray-500 text-sm mb-4">
              <strong>{localPlan.teams.find(t => t.id === swapPopup.teamId)?.names}</strong> wird zu{' '}
              <strong>{COURSE_LABEL[swapPopup.newCourse]}</strong>.
              Wer übernimmt stattdessen <strong>{COURSE_LABEL[swapPopup.oldCourse]}</strong>?
            </p>
            <div className="space-y-2">
              {swapPopup.candidates.map(t => (
                <button key={t.id} onClick={() => confirmSwap(t.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{t.names}</span>
                    <span className="text-xs text-gray-400">{COURSE_LABEL[t.hostCourse]}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setSwapPopup(null)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">← Zurück</button>
        <button onClick={() => onNext(localPlan)} className="flex-1 py-3 rounded-xl font-semibold text-white text-base" style={{ backgroundColor: ACCENT }}>
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

const MAP_CATS = [
  { key: 'starter',    label: 'Vorspeise-Hosts',   color: MARKER_COLORS.starter },
  { key: 'main',       label: 'Hauptspeise-Hosts',  color: MARKER_COLORS.main },
  { key: 'shared',     label: 'Nachspeise-Ort',     color: MARKER_COLORS.shared },
  { key: 'unselected', label: 'Nicht ausgewählt',   color: '#9ca3af' },
]

function MapTab({ plan, config }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({ starter: [], main: [], shared: [], unselected: [] })
  const [loading, setLoading] = useState(true)
  const [visibleCats, setVisibleCats] = useState({ starter: true, main: true, shared: true, unselected: true })
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)

  useEffect(() => {
    if (!window.L || !mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    markersRef.current = { starter: [], main: [], shared: [], unselected: [] }

    const L = window.L
    const map = L.map(mapRef.current, { zoomControl: true }).setView([52.52, 13.405], 12)
    mapInstanceRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    const points = []
    const visState = { starter: true, main: true, shared: true, unselected: true }

    const mkIcon = (color, small) => {
      const [w, h] = small ? [20, 28] : [28, 38]
      return L.icon({ iconUrl: createSvgIcon(color), iconSize: [w, h], iconAnchor: [w/2, h], popupAnchor: [0, -h] })
    }
    const addM = (cat, lat, lng, popup) => {
      const color = MAP_CATS.find(c => c.key === cat)?.color || '#9ca3af'
      const m = L.marker([lat, lng], { icon: mkIcon(color, cat === 'unselected') }).bindPopup(popup)
      m.addTo(map)
      markersRef.current[cat].push(m)
      points.push([lat, lng])
    }

    if (plan.teamCoords) {
      // Fast path: use pre-computed coords
      const hostIds = new Set()
      for (const course of ['starter', 'main']) {
        for (const g of (plan.groups[course] || [])) {
          if (hostIds.has(g.host.id)) continue
          hostIds.add(g.host.id)
          const c = plan.teamCoords[g.host.id]
          if (c) addM(course, c.lat, c.lng, `<strong>${g.host.names}</strong><br/>${course === 'starter' ? 'Vorspeise' : 'Hauptspeise'}<br/><small>${g.host.address || ''}</small>`)
        }
      }
      if (plan.dessertCoord) {
        addM('shared', plan.dessertCoord.lat, plan.dessertCoord.lng, `<strong>Gemeinsamer Nachspeise-Ort</strong><br/><small>${config.dessertAddress || ''}</small>`)
      }
      for (const team of plan.teams) {
        if (hostIds.has(team.id)) continue
        const c = plan.teamCoords[team.id]
        if (c) addM('unselected', c.lat, c.lng, `<strong>${team.names}</strong><br/>Gast (nicht ausgewählt)<br/><small>${team.address || ''}</small>`)
      }
      if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
      const encoded = btoa(JSON.stringify({ points, config: { dessertAddress: config.dessertAddress } }))
      setShareUrl(window.location.origin + '/map?data=' + encodeURIComponent(encoded))
      setLoading(false)
    } else {
      // Fallback: geocode host addresses on-the-fly
      const tasks = []
      const hostsAdded = new Set()
      for (const course of ['starter', 'main']) {
        for (const g of (plan.groups[course] || [])) {
          if (hostsAdded.has(g.host.id)) continue
          hostsAdded.add(g.host.id)
          const h = g.host
          tasks.push(geocode(h.address).then(c => { if (c) addM(course, c.lat, c.lng, `<strong>${h.names}</strong><br/><small>${h.address}</small>`) }))
        }
      }
      tasks.push(geocode(config.dessertAddress).then(c => { if (c) addM('shared', c.lat, c.lng, `<strong>Nachspeise-Ort</strong><br/><small>${config.dessertAddress}</small>`) }))
      Promise.all(tasks).then(() => {
        if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
        const encoded = btoa(JSON.stringify({ points, config: { dessertAddress: config.dessertAddress } }))
        setShareUrl(window.location.origin + '/map?data=' + encodeURIComponent(encoded))
        setLoading(false)
      })
    }

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [plan, config])

  const toggleCat = (cat) => {
    const nv = { ...visibleCats, [cat]: !visibleCats[cat] }
    setVisibleCats(nv)
    ;(markersRef.current[cat] || []).forEach(m => { if (nv[cat]) m.addTo(mapInstanceRef.current); else m.remove() })
  }

  const handleSavePdf = async () => {
    setSavingPdf(true)
    try {
      const canvas = await html2canvas(mapRef.current, { useCORS: true, scale: 1.5 })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height / canvas.width) * w
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      pdf.save('running-dinner-karte.pdf')
    } finally { setSavingPdf(false) }
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MAP_CATS.map(({ key, label, color }) => (
          <button key={key} onClick={() => toggleCat(key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor: visibleCats[key] ? color : '#d1d5db', backgroundColor: visibleCats[key] ? color + '18' : 'white', color: visibleCats[key] ? color : '#9ca3af' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: visibleCats[key] ? color : '#d1d5db' }} />
            {label}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <div className="text-center"><div className="text-3xl mb-2">🗺️</div><p className="text-sm text-gray-500">Adressen werden geocodiert…</p></div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button onClick={handleSavePdf} disabled={savingPdf || loading}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
          {savingPdf ? '⏳ Speichern…' : '📥 Karte als PDF speichern'}
        </button>
        <button onClick={handleShare} disabled={loading || !shareUrl}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm border transition-colors disabled:opacity-40"
          style={{ borderColor: copied ? ACCENT : '#d1d5db', color: copied ? ACCENT : '#374151', backgroundColor: copied ? '#f0fdf6' : 'white' }}>
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

      {/* ── ZIP all ICS + ICS hint ── */}
      <div className="space-y-2">
        <button onClick={downloadAllIcs}
          className="w-full py-2.5 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
          📅 Alle Kalender-Einladungen als ZIP herunterladen
          {noDate && <span className="ml-1 text-orange-500 text-xs">(kein Datum)</span>}
        </button>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
          💡 <strong>Kalender-Einladung als Anhang:</strong> Lade zuerst die .ics-Datei für das jeweilige Team herunter, öffne dann die Mail und füge die Datei manuell als Anhang ein.
        </div>
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
                  {/* ICS + Mail side by side */}
                  <button onClick={() => downloadIcs(team, text)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                    title="Kalender-Einladung herunterladen">
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

// ─── Routes Tab ───────────────────────────────────────────────────────────────
const ROUTE_COLORS = [
  '#e74c3c','#e67e22','#2ecc71','#3498db','#9b59b6',
  '#1abc9c','#f39c12','#e91e8c','#607d8b','#00bcd4',
  '#ff5722','#8bc34a','#673ab7',
]

async function fetchOSRMRoute(waypoints) {
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/bicycle/${coords}?overview=full&geometries=geojson&steps=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM ${res.status}`)
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error('OSRM: ' + data.code)
  const route = data.routes[0]
  const totalKm = Math.round(route.distance / 100) / 10
  return {
    legs: route.legs.map(l => {
      const distanceKm = Math.round(l.distance / 100) / 10
      return { distanceKm, durationMin: Math.round((distanceKm / 13) * 60) }
    }),
    totalKm,
    totalMin: Math.round((totalKm / 13) * 60),
    geometry: route.geometry,
  }
}

function RoutesTab({ plan, config, compact = false }) {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const routeLayersRef = useRef({}) // teamId → L.polyline
  const [routeData,    setRouteData]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [progress,     setProgress]     = useState({ done: 0, total: 0 })
  const [visibleTeams, setVisibleTeams] = useState({})

  useEffect(() => {
    loadRoutes()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [])

  const loadRoutes = async () => {
    if (!plan.teamCoords) { setLoading(false); return }
    const teamsWithHome = plan.teams.filter(t => plan.teamCoords[t.id])
    setProgress({ done: 0, total: teamsWithHome.length })

    const results = []
    for (const team of plan.teams) {
      const homeCoord    = plan.teamCoords[team.id]
      if (!homeCoord) { results.push({ team, legs: null, totalKm: null, totalMin: null, fallback: false, error: 'Keine Koordinaten' }); continue }

      const starterCoord = plan.teamCoords[team.groups?.starter?.host?.id]
      const mainCoord    = plan.teamCoords[team.groups?.main?.host?.id]
      const dessertCoord = plan.dessertCoord
      const waypoints    = [homeCoord, starterCoord, mainCoord, dessertCoord].filter(Boolean)

      if (waypoints.length >= 2) {
        try {
          const { legs, totalKm, totalMin, geometry } = await fetchOSRMRoute(waypoints)
          results.push({ team, legs, totalKm, totalMin, geometry, waypoints, fallback: false })
          await new Promise(r => setTimeout(r, 1000))
        } catch {
          const legs = []
          for (let i = 0; i < waypoints.length - 1; i++) {
            const distanceKm = Math.round(haversineDistance(waypoints[i], waypoints[i+1]) * 10) / 10
            legs.push({ distanceKm, durationMin: Math.round((distanceKm / 13) * 60) })
          }
          const totalKm = Math.round(legs.reduce((s,l) => s + l.distanceKm, 0) * 10) / 10
          results.push({ team, legs, totalKm, totalMin: Math.round((totalKm / 13) * 60), waypoints, fallback: true })
        }
      } else {
        results.push({ team, legs: null, totalKm: null, totalMin: null, fallback: false, error: 'Unvollständige Koordinaten' })
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    // Init all teams visible
    const vis = {}
    for (const { team } of results) vis[team.id] = true
    setVisibleTeams(vis)

    setRouteData(results)
    setLoading(false)
    drawMap(results, vis)
  }

  const drawMap = (results, vis) => {
    if (!window.L || !mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    routeLayersRef.current = {}
    const L = window.L
    const map = L.map(mapRef.current).setView([52.52, 13.405], 12)
    mapInstanceRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    const allPoints = []
    results.forEach(({ team, geometry, waypoints }, idx) => {
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]
      let layer
      if (geometry) {
        const latlngs = geometry.coordinates.map(c => [c[1], c[0]])
        layer = L.polyline(latlngs, { color, weight: 3, opacity: 0.75 }).bindPopup(team.names)
        allPoints.push(...latlngs)
      } else if (waypoints) {
        const latlngs = waypoints.map(p => [p.lat, p.lng])
        layer = L.polyline(latlngs, { color, weight: 2, opacity: 0.5, dashArray: '6 4' }).bindPopup(team.names)
        allPoints.push(...latlngs)
      }
      if (layer) {
        routeLayersRef.current[team.id] = layer
        if (vis[team.id] !== false) layer.addTo(map)
      }
    })
    if (allPoints.length > 0) map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] })
  }

  const toggleTeam = (teamId) => {
    setVisibleTeams(v => {
      const nv = { ...v, [teamId]: !v[teamId] }
      const layer = routeLayersRef.current[teamId]
      if (layer && mapInstanceRef.current) {
        if (nv[teamId]) layer.addTo(mapInstanceRef.current)
        else layer.remove()
      }
      return nv
    })
  }
  const setAllVisible = (val) => {
    setVisibleTeams(v => {
      const nv = Object.fromEntries(Object.keys(v).map(k => [k, val]))
      Object.entries(routeLayersRef.current).forEach(([id, layer]) => {
        if (mapInstanceRef.current) { if (val) layer.addTo(mapInstanceRef.current); else layer.remove() }
      })
      return nv
    })
  }

  const wpLabels = (team) => [
    { emoji: '🏠', label: `Start: ${team.address || team.names}` },
    { emoji: '🥗', label: `Vorspeise: ${team.groups?.starter?.host?.address || team.groups?.starter?.host?.names || '?'}` },
    { emoji: '🍝', label: `Hauptspeise: ${team.groups?.main?.host?.address || team.groups?.main?.host?.names || '?'}` },
    { emoji: '🍰', label: `Nachspeise: ${config.dessertAddress || 'Gemeinsamer Ort'}` },
  ]

  if (!plan.teamCoords) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🚲</div>
        <p className="text-sm">Keine Koordinaten. Plan neu generieren.</p>
      </div>
    )
  }

  const validRoutes = (routeData || []).filter(r => r.totalKm !== null)
  const avgKm  = validRoutes.length > 0 ? Math.round(validRoutes.reduce((s,r) => s + r.totalKm,  0) / validRoutes.length * 10) / 10 : null
  const avgMin = validRoutes.filter(r => r.totalMin !== null).length > 0
    ? Math.round(validRoutes.filter(r => r.totalMin !== null).reduce((s,r) => s + r.totalMin, 0) / validRoutes.filter(r => r.totalMin !== null).length)
    : null
  const maxR = validRoutes.length > 0 ? validRoutes.reduce((a,b) => a.totalKm > b.totalKm ? a : b) : null
  const minR = validRoutes.length > 0 ? validRoutes.reduce((a,b) => a.totalKm < b.totalKm ? a : b) : null

  return (
    <div>
      {loading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-900 mb-2">🚲 Fahrrad-Routen werden berechnet… ({progress.done}/{progress.total} Teams)</p>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress.total > 0 ? progress.done / progress.total * 100 : 0}%`, backgroundColor: ACCENT }} />
          </div>
          <p className="text-xs text-blue-500 mt-1">OSRM Bicycle Routing · ca. 1 Sek. pro Team</p>
        </div>
      )}

      {/* Map with team filter */}
      {routeData && !loading && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold">Teams einblenden:</span>
            <button onClick={() => setAllVisible(true)}  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">Alle</button>
            <button onClick={() => setAllVisible(false)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">Keine</button>
            {routeData.map(({ team }, idx) => {
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]
              return (
                <button key={team.id} onClick={() => toggleTeam(team.id)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-all"
                  style={{ borderColor: visibleTeams[team.id] ? color : '#d1d5db', backgroundColor: visibleTeams[team.id] ? color + '18' : 'white', color: visibleTeams[team.id] ? color : '#9ca3af' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: visibleTeams[team.id] ? color : '#d1d5db' }} />
                  {team.names.split('&')[0].trim()}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-gray-200 mb-5" style={{ height: compact ? 260 : 360 }}>
        {loading && !routeData && (
          <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center">
            <p className="text-sm text-gray-400">Karte wird geladen…</p>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Stats */}
      {routeData && validRoutes.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Ø Strecke', val: `${avgKm} km${avgMin !== null ? ` · ca. ${avgMin} min` : ''}` },
            { label: 'Längste', val: maxR ? `${maxR.team.names.split('&')[0].trim()}: ${maxR.totalKm} km${maxR.totalMin !== null ? ` · ${maxR.totalMin} min` : ''}` : '—' },
            { label: 'Kürzeste', val: minR ? `${minR.team.names.split('&')[0].trim()}: ${minR.totalKm} km${minR.totalMin !== null ? ` · ${minR.totalMin} min` : ''}` : '—' },
          ].map(({ label, val }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-xs font-bold text-gray-800 leading-snug">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Speed hint */}
      {routeData && <p className="text-xs text-gray-400 text-center mb-4">🚲 Fahrtzeiten basieren auf ca. 13 km/h Durchschnittsgeschwindigkeit (Stadtfahrrad)</p>}

      {/* Per-team cards */}
      {routeData && (
        <div className="space-y-3">
          {routeData.map(({ team, legs, totalKm, totalMin, fallback, error }, idx) => {
            const labels = wpLabels(team)
            const color  = ROUTE_COLORS[idx % ROUTE_COLORS.length]
            return (
              <div key={team.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <span className="font-semibold text-gray-900 flex-1">{team.names}</span>
                  {totalKm !== null && (
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>
                      {totalKm} km{totalMin !== null ? ` · 🚲 ca. ${totalMin} min` : ''}
                    </span>
                  )}
                  {fallback && <span className="text-xs text-orange-500">(Luftlinie)</span>}
                </div>
                {error ? (
                  <p className="text-xs text-gray-400">{error}</p>
                ) : legs ? (
                  <div className="space-y-0.5">
                    {labels.map((wp, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 mt-0.5">{wp.emoji}</span>
                          <span className="text-gray-700 leading-relaxed">{wp.label}</span>
                        </div>
                        {i < labels.length - 1 && legs[i] && (
                          <div className="flex items-center gap-1 ml-5 my-0.5">
                            <div className="w-px h-3 bg-gray-200 ml-0.5" />
                            <span className="text-xs text-gray-400 ml-1">
                              ↓ {legs[i].distanceKm} km{legs[i].durationMin !== null ? ` · 🚲 ca. ${legs[i].durationMin} min` : fallback ? ' (Luftlinie)' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Koordinaten nicht verfügbar</p>
                )}
              </div>
            )
          })}
        </div>
      )}
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
    { id: 'plan',     label: '📊 Plan-Übersicht' },
    { id: 'messages', label: '💬 Nachrichten' },
    { id: 'map',      label: '🗺️ Karte' },
    { id: 'routes',   label: '🚗 Routen' },
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

      {tab === 'routes' && (
        <RoutesTab plan={plan} config={config} />
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
