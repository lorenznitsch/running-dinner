import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACCENT = '#1D9E75'

// ── Reusable input ────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{' '}
        {required
          ? <span className="text-red-400">*</span>
          : <span className="text-gray-400 font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-300'

// ── Address block (reused for addr1 + addr2) ──────────────────────────────────
function AddressBlock({ prefix, form, set, required }) {
  return (
    <div className="space-y-3">
      {/* Straße + Hausnummer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Straße{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="Musterstraße"
            value={form[`${prefix}street`]}
            onChange={e => set(`${prefix}street`, e.target.value)}
            required={required}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Nr.{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="12"
            value={form[`${prefix}housenumber`]}
            onChange={e => set(`${prefix}housenumber`, e.target.value)}
            required={required}
            className={inputCls}
          />
        </div>
      </div>
      {/* PLZ + Ort */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            PLZ{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="10115"
            value={form[`${prefix}zip`]}
            onChange={e => set(`${prefix}zip`, e.target.value)}
            required={required}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Ort{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            placeholder="Berlin"
            value={form[`${prefix}city`]}
            onChange={e => set(`${prefix}city`, e.target.value)}
            required={required}
            className={inputCls}
          />
        </div>
      </div>
      {/* Klingelschild */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Klingelschild{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <input
          type="text"
          placeholder="z.B. Müller / Schmidt"
          value={form[`${prefix}doorbell`]}
          onChange={e => set(`${prefix}doorbell`, e.target.value)}
          required={required}
          className={inputCls}
        />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
    email: '',
    phone1: '',
    phone2: '',
    diet: 'omnivor',
    allergies: '',
    // Address 1 (required)
    a1street: '',
    a1housenumber: '',
    a1zip: '',
    a1city: 'Berlin',
    a1doorbell: '',
    // Address 2 (optional)
    a2street: '',
    a2housenumber: '',
    a2zip: '',
    a2city: 'Berlin',
    a2doorbell: '',
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
    // Manual required check for fields not covered by HTML (radio etc.)
    if (!form.names.trim() || !form.email.trim() || !form.phone1.trim()
      || !form.a1street.trim() || !form.a1housenumber.trim()
      || !form.a1zip.trim() || !form.a1city.trim() || !form.a1doorbell.trim()) {
      setError('Bitte fülle alle Pflichtfelder aus.')
      return
    }
    setLoading(true)
    setError('')

    // Compose address strings for existing plan/map logic
    const address1 = `${form.a1street.trim()} ${form.a1housenumber.trim()}, ${form.a1zip.trim()} ${form.a1city.trim()}`
    const hasAddr2 = form.a2street.trim() && form.a2housenumber.trim()
    const address2 = hasAddr2
      ? `${form.a2street.trim()} ${form.a2housenumber.trim()}, ${form.a2zip.trim()} ${form.a2city.trim()}`
      : null

    try {
      const { error: dbError } = await supabase.from('responses').insert({
        survey_id: surveyId,
        names: form.names.trim(),
        email: form.email.trim(),
        phone: form.phone1.trim(),       // keep legacy column for algorithm compat
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || null,
        diet: form.diet,
        allergies: form.allergies.trim() || null,
        // Legacy single address field (used by plan/map algorithms)
        address: address1,
        doorbell: form.a1doorbell.trim(),
        // Structured address 1
        street1: form.a1street.trim(),
        housenumber1: form.a1housenumber.trim(),
        zip1: form.a1zip.trim(),
        city1: form.a1city.trim(),
        doorbell1: form.a1doorbell.trim(),
        // Structured address 2
        street2: form.a2street.trim() || null,
        housenumber2: form.a2housenumber.trim() || null,
        zip2: form.a2zip.trim() || null,
        city2: form.a2city.trim() || null,
        doorbell2: form.a2doorbell.trim() || null,
        // Composed address 2 string
        ...(address2 ? { address2 } : {}),
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

  // ── Loading / Not found / Success states ──────────────────────────────────

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
            {survey?.event_name
              ? `Wir freuen uns auf euch beim „${survey.event_name}"!`
              : 'Wir freuen uns auf euch!'}
          </p>
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            ✅ Ihr werdet rechtzeitig euren persönlichen Dinner-Plan erhalten.
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: ACCENT }} className="py-10 px-4 text-center text-white">
        <div className="text-3xl mb-3">🍽️</div>
        <h1 className="text-2xl font-bold mb-1">Running Dinner – Anmeldung</h1>
        {survey?.event_name && (
          <p className="text-green-100 text-sm mt-1">{survey.event_name}</p>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── Info box ──────────────────────────────────────────────────── */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              Fülle das Formular aus, um euch für das Running Dinner anzumelden.
              Alle Felder mit <span className="text-red-500 font-semibold">*</span> sind Pflichtfelder.
            </p>
            <p className="text-sm font-semibold text-gray-800">So funktioniert das Running Dinner:</p>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <li>🍽️ Ihr nehmt als Zweiergruppe teil und bereitet entweder eine Vorspeise, Hauptspeise oder Nachspeise für 6 Personen zu (der Gang wird ausgelost).</li>
              <li>👥 Pro Gang essen jeweils 3 Gruppen (6 Personen) gemeinsam.</li>
              <li>🔄 Die Gruppen werden nach jedem Gang neu gemischt – jeder Gang findet also an einem anderen Ort und mit anderen Personen statt.</li>
              <li>🍰 Zum Dessert kommen alle Teilnehmenden an einem gemeinsamen Ort zusammen.</li>
              <li className="font-medium text-gray-800">⚠️ Mit dem Ausfüllen des Formulars gebt ihr eine verbindliche Zusage zur Teilnahme ab.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Namen */}
            <Field label="Eure Namen" required>
              <input
                type="text"
                placeholder="z.B. Tim & Anna"
                value={form.names}
                onChange={e => set('names', e.target.value)}
                required
                className={inputCls}
              />
            </Field>

            {/* E-Mail */}
            <Field label="E-Mail-Adresse" required>
              <input
                type="email"
                placeholder="beispiel@email.de"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                className={inputCls}
              />
            </Field>

            {/* Handynummern */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Handynummer Gast 1" required>
                <input
                  type="tel"
                  placeholder="0151 12345678"
                  value={form.phone1}
                  onChange={e => set('phone1', e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Handynummer Gast 2" required={false}>
                <input
                  type="tel"
                  placeholder="0172 87654321"
                  value={form.phone2}
                  onChange={e => set('phone2', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Ernährung */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Ernährung</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: 'omnivor',      emoji: '🥩', label: 'Omnivor',      desc: 'Alles' },
                  { val: 'vegetarisch',  emoji: '🥦', label: 'Vegetarisch',  desc: 'Kein Fleisch' },
                  { val: 'vegan',        emoji: '🌱', label: 'Vegan',        desc: 'Pflanzlich' },
                ].map(opt => (
                  <label
                    key={opt.val}
                    className="cursor-pointer rounded-xl border-2 p-3 text-center transition-all"
                    style={{
                      borderColor: form.diet === opt.val ? ACCENT : '#e5e7eb',
                      backgroundColor: form.diet === opt.val ? '#f0fdf6' : 'white',
                    }}
                  >
                    <input type="radio" name="diet" value={opt.val}
                      checked={form.diet === opt.val} onChange={() => set('diet', opt.val)}
                      className="sr-only" />
                    <div className="text-xl mb-1">{opt.emoji}</div>
                    <div className="text-xs font-semibold text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Allergien */}
            <Field label="Allergien oder Unverträglichkeiten" required={false}>
              <input
                type="text"
                placeholder="z.B. Laktose, Nüsse, Gluten"
                value={form.allergies}
                onChange={e => set('allergies', e.target.value)}
                className={inputCls}
              />
            </Field>

            {/* Host-Adresse 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-700">Host-Adresse 1</span>
                <span className="text-red-400 text-sm">*</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <AddressBlock prefix="a1" form={form} set={set} required={true} />
              </div>
            </div>

            {/* Host-Adresse 2 */}
            <div>
              <div className="mb-3">
                <span className="text-sm font-semibold text-gray-700">Host-Adresse 2 </span>
                <span className="text-gray-400 text-sm font-normal">
                  (optional) – falls ihr zwei mögliche Locations habt
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <AddressBlock prefix="a2" form={form} set={set} required={false} />
              </div>
            </div>

            {/* Hinweis */}
            <Field label="Noch etwas mitteilen?" required={false}>
              <textarea
                rows={3}
                placeholder="Sonstige Hinweise für die Organisatoren…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>

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
              {loading ? '⏳ Wird gespeichert…' : '✅ Jetzt verbindlich anmelden'}
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
