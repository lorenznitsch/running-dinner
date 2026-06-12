import { useState } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'

const ACCENT = '#1D9E75'

function CopyLine({ label, value, hint }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {hint && <span className="text-xs text-orange-600 font-medium">{hint}</span>}
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 font-mono truncate"
        />
        <button
          onClick={handleCopy}
          className="px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0"
          style={{
            borderColor: copied ? ACCENT : '#d1d5db',
            color: copied ? ACCENT : '#374151',
            backgroundColor: copied ? '#f0fdf6' : 'white',
          }}
        >
          {copied ? '✅' : '📋 Kopieren'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2'

export default function CreateSurveyModal({ onClose }) {
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [timeStarter, setTimeStarter] = useState('18:00 Uhr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const origin = window.location.origin

  const handleCreate = async () => {
    if (!eventDate || !timeStarter.trim()) {
      setError('Bitte Datum und Uhrzeit der Vorspeise angeben.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const surveyId = nanoid(8)
      const adminToken = nanoid(32)

      const { error: dbError } = await supabase
        .from('surveys')
        .insert({
          id: surveyId,
          admin_token: adminToken,
          event_name: eventName || null,
          event_date: eventDate || null,
          time_starter: timeStarter.trim() || null,
        })

      if (dbError) throw new Error(dbError.message)

      setResult({
        surveyId,
        adminToken,
        eventName,
        participantUrl: `${origin}/survey/${surveyId}`,
        adminUrl: `${origin}/admin/${surveyId}?token=${adminToken}`,
      })
    } catch (err) {
      setError('Fehler beim Erstellen: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Neue Umfrage erstellen</h2>
            <p className="text-sm text-gray-400 mt-0.5">Deine Gäste füllen direkt online aus</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none font-light">✕</button>
        </div>

        <div className="px-6 py-6">
          {!result ? (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name deines Events <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Running Dinner Prenzlauer Berg"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event-Datum <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Uhrzeit Vorspeise <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. 18:00 Uhr"
                    value={timeStarter}
                    onChange={e => setTimeStarter(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
                  Abbrechen
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {loading ? '⏳ Erstelle…' : '✨ Umfrage erstellen'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 p-4 rounded-xl border border-green-200 bg-green-50">
                <p className="text-sm font-semibold text-green-800 mb-0.5">🎉 Umfrage erstellt!</p>
                <p className="text-xs text-green-700">
                  {result.eventName ? `„${result.eventName}"` : 'Deine Umfrage'} ist bereit. Teile den Teilnehmer-Link mit deinen Gästen.
                </p>
              </div>

              <CopyLine
                label="Teilnehmer-Link (für deine Gäste)"
                value={result.participantUrl}
              />
              <CopyLine
                label="Admin-Link (nur für dich!)"
                value={result.adminUrl}
                hint="⚠️ Nicht weitergeben"
              />

              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Wichtig:</strong> Speichere den Admin-Link jetzt – er wird nur einmal angezeigt! Über diesen Link kannst du alle Anmeldungen sehen und den Dinner-Plan erstellen.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-5 w-full py-3 rounded-xl font-semibold text-white text-sm"
                style={{ backgroundColor: ACCENT }}
              >
                Fertig
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
