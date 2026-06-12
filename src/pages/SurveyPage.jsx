import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACCENT = '#1D9E75'

export default function SurveyPage() {
  const { surveyId } = useParams()
  const [survey, setSurvey] = useState(null)
  const [checking, setChecking] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    names: '',
    diet: 'omnivor',
    allergies: '',
    address: '',
    doorbell: '',
    phone: '',
    notes: '',
  })
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    async function checkSurvey() {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, event_name')
        .eq('id', surveyId)
        .maybeSingle()

      if (error || !data) setNotFound(true)
      else setSurvey(data)
      setChecking(false)
    }
    checkSurvey()
  }, [surveyId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.names.trim() || !form.address.trim()) {
      setError('Bitte fülle alle Pflichtfelder aus.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: dbError } = await supabase.from('responses').insert({
        survey_id: surveyId,
        names: form.names.trim(),
        diet: form.diet,
        allergies: form.allergies.trim() || null,
        address: form.address.trim(),
        doorbell: form.doorbell.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      })
      if (dbError) throw new Error(dbError.message)
      setSubmitted(true)
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🍽️</div>
          <p>Lade Umfrage…</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Umfrage nicht gefunden</h1>
          <p className="text-gray-500 mb-6">Diese Umfrage existiert nicht oder wurde gelöscht.</p>
          <Link to="/" className="text-sm font-semibold" style={{ color: ACCENT }}>← Zur Startseite</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-5">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Danke!</h1>
          <p className="text-lg text-gray-600 mb-2">Eure Anmeldung ist eingegangen.</p>
          <p className="text-gray-400 text-sm">
            {survey?.event_name ? `Wir freuen uns auf euch beim „${survey.event_name}"!` : 'Wir freuen uns auf euch!'}
          </p>
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            ✅ Ihr werdet rechtzeitig euren persönlichen Dinner-Plan erhalten.
          </div>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: ACCENT }} className="py-10 px-4 text-center text-white">
        <div className="text-3xl mb-3">🍽️</div>
        <h1 className="text-2xl font-bold mb-1">Running Dinner – Anmeldung</h1>
        {survey?.event_name && (
          <p className="text-green-100 text-sm">{survey.event_name}</p>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Fülle das Formular aus, um euch für das Running Dinner anzumelden.
            Alle Felder mit <span className="text-red-400">*</span> sind Pflichtfelder.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Namen */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Eure Namen <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="z.B. Tim & Anna"
                value={form.names}
                onChange={e => set('names', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Ernährung */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Ernährung</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: 'omnivor', label: '🥩 Omnivor', desc: 'Alles' },
                  { val: 'vegetarisch', label: '🥦 Vegetarisch', desc: 'Kein Fleisch' },
                  { val: 'vegan', label: '🌱 Vegan', desc: 'Pflanzlich' },
                ].map(opt => (
                  <label
                    key={opt.val}
                    className="cursor-pointer rounded-xl border-2 p-3 text-center transition-all"
                    style={{
                      borderColor: form.diet === opt.val ? ACCENT : '#e5e7eb',
                      backgroundColor: form.diet === opt.val ? '#f0fdf6' : 'white',
                    }}
                  >
                    <input
                      type="radio"
                      name="diet"
                      value={opt.val}
                      checked={form.diet === opt.val}
                      onChange={() => set('diet', opt.val)}
                      className="sr-only"
                    />
                    <div className="text-xl mb-1">{opt.label.split(' ')[0]}</div>
                    <div className="text-xs font-semibold text-gray-800">{opt.label.split(' ')[1]}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Allergien */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Allergien oder Unverträglichkeiten
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="z.B. Laktose, Nüsse, Gluten"
                value={form.allergies}
                onChange={e => set('allergies', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse in Berlin <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Musterstraße 42, 10115 Berlin"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Klingelschild */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Klingelschild
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="z.B. Müller / 3. OG links"
                value={form.doorbell}
                onChange={e => set('doorbell', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Handynummer(n)
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="z.B. 0151 12345678"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Hinweis */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Noch etwas mitteilen?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Sonstige Hinweise für die Organisatoren…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? '⏳ Wird gespeichert…' : '✅ Jetzt anmelden'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            Deine Daten werden nur zur Organisation dieses Running Dinners verwendet
            und nicht an Dritte weitergegeben.{' '}
            <Link to="/datenschutz" className="underline">Datenschutz</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
