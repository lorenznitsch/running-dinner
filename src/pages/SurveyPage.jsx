import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACCENT = '#1D9E75'

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  de: {
    loading: 'Lade Umfrage…',
    notFound: 'Umfrage nicht gefunden',
    notFoundSub: 'Diese Umfrage existiert nicht oder wurde gelöscht.',
    backHome: '← Zur Startseite',
    thankYou: 'Danke!',
    submitted: 'Eure Anmeldung ist eingegangen.',
    submittedSub: 'Wir freuen uns auf euch!',
    submittedEvent: name => `Wir freuen uns auf euch beim „${name}"!`,
    planNote: '✅ Ihr werdet rechtzeitig euren persönlichen Dinner-Plan erhalten.',
    title: 'Running Dinner – Anmeldung',
    introText: 'Fülle das Formular aus, um euch für das Running Dinner anzumelden. Alle Felder mit * sind Pflichtfelder.',
    howTitle: 'So funktioniert das Running Dinner:',
    howItems: [
      '🍽️ Ihr nehmt als Zweiergruppe teil und bereitet entweder eine Vorspeise, Hauptspeise oder Nachspeise für 6 Personen zu (der Gang wird ausgelost).',
      '👥 Pro Gang essen jeweils 3 Gruppen (6 Personen) gemeinsam.',
      '🔄 Die Gruppen werden nach jedem Gang neu gemischt – jeder Gang findet also an einem anderen Ort und mit anderen Personen statt.',
      '🍰 Zum Dessert kommen alle Teilnehmenden an einem gemeinsamen Ort zusammen.',
      '⚠️ Mit dem Ausfüllen des Formulars gebt ihr eine verbindliche Zusage zur Teilnahme ab.',
    ],
    names: 'Eure Namen',
    namesPlaceholder: 'z.B. Tim & Anna',
    groupSizeLabel: 'Wie viele Personen nehmt ihr teil?',
    groupSize2: '2 Personen',
    groupSize3: '3 Personen',
    name3: 'Name Gast 3',
    name3Placeholder: 'z.B. Sophie',
    phone3: 'Handynummer Gast 3',
    phone3Placeholder: '0176 99887766',
    email3: 'E-Mail Gast 3',
    email3Placeholder: 'dritte@email.de',
    email1: 'E-Mail-Adresse Gast 1',
    email1Placeholder: 'beispiel@email.de',
    email2: 'E-Mail-Adresse Gast 2',
    email2Placeholder: 'partner@email.de',
    phone1: 'Handynummer Gast 1',
    phone1Placeholder: '0151 12345678',
    phone2: 'Handynummer Gast 2',
    phone2Placeholder: '0172 87654321',
    diet: 'Ernährung',
    dietOptions: [
      { val: 'omnivor',     emoji: '🥩', label: 'Omnivor',     desc: 'Alles' },
      { val: 'vegetarisch', emoji: '🥦', label: 'Vegetarisch', desc: 'Kein Fleisch' },
      { val: 'vegan',       emoji: '🌱', label: 'Vegan',       desc: 'Pflanzlich' },
    ],
    allergies: 'Allergien oder Unverträglichkeiten',
    allergiesPlaceholder: 'z.B. Laktose, Nüsse, Gluten',
    addr1Title: 'Host-Adresse 1',
    addr2Title: 'Host-Adresse 2',
    addr2Sub: 'optional – falls ihr zwei mögliche Locations habt',
    street: 'Straße',
    streetPlaceholder: 'Musterstraße',
    nr: 'Nr.',
    nrPlaceholder: '12',
    plz: 'PLZ',
    plzPlaceholder: '10115',
    city: 'Ort',
    cityPlaceholder: 'Berlin',
    doorbell: 'Klingelschild',
    doorbellPlaceholder: 'z.B. Müller / Schmidt',
    notes: 'Noch etwas mitteilen?',
    notesPlaceholder: 'Sonstige Hinweise für die Organisatoren…',
    required: '',
    optional: '(optional)',
    errorRequired: 'Bitte fülle alle Pflichtfelder aus.',
    errorSave: 'Fehler beim Speichern: ',
    submitBtn: '✅ Jetzt verbindlich anmelden',
    submitting: '⏳ Wird gespeichert…',
    privacyNote: 'Deine Daten werden nur zur Organisation dieses Running Dinners verwendet und nicht an Dritte weitergegeben.',
    privacy: 'Datenschutz',
  },
  en: {
    loading: 'Loading survey…',
    notFound: 'Survey not found',
    notFoundSub: 'This survey does not exist or has been deleted.',
    backHome: '← Back to home',
    thankYou: 'Thank you!',
    submitted: 'Your registration has been received.',
    submittedSub: 'We look forward to seeing you!',
    submittedEvent: name => `We look forward to seeing you at "${name}"!`,
    planNote: '✅ You will receive your personal dinner plan in due time.',
    title: 'Running Dinner – Registration',
    introText: 'Fill in the form to register for the Running Dinner. All fields marked with * are required.',
    howTitle: 'How the Running Dinner works:',
    howItems: [
      '🍽️ You participate as a group of two and prepare either a starter, main course or dessert for 6 people (the course will be drawn by lot).',
      '👥 Per course, 3 groups (6 people) eat together.',
      '🔄 Groups are reshuffled after each course – so each course takes place at a different location with different people.',
      '🍰 For dessert, all participants come together at one shared location.',
      '⚠️ By submitting this form, you make a binding commitment to participate.',
    ],
    names: 'Your names',
    namesPlaceholder: 'e.g. Tim & Anna',
    groupSizeLabel: 'How many people are participating?',
    groupSize2: '2 people',
    groupSize3: '3 people',
    name3: 'Name guest 3',
    name3Placeholder: 'e.g. Sophie',
    phone3: 'Mobile number guest 3',
    phone3Placeholder: '+49 176 99887766',
    email3: 'Email guest 3',
    email3Placeholder: 'third@email.com',
    email1: 'Email address guest 1',
    email1Placeholder: 'example@email.com',
    email2: 'Email address guest 2',
    email2Placeholder: 'partner@email.com',
    phone1: 'Mobile number guest 1',
    phone1Placeholder: '+49 151 12345678',
    phone2: 'Mobile number guest 2',
    phone2Placeholder: '+49 172 87654321',
    diet: 'Diet',
    dietOptions: [
      { val: 'omnivor',     emoji: '🥩', label: 'Omnivore',    desc: 'Everything' },
      { val: 'vegetarisch', emoji: '🥦', label: 'Vegetarian',  desc: 'No meat' },
      { val: 'vegan',       emoji: '🌱', label: 'Vegan',       desc: 'Plant-based' },
    ],
    allergies: 'Allergies or intolerances',
    allergiesPlaceholder: 'e.g. lactose, nuts, gluten',
    addr1Title: 'Host address 1',
    addr2Title: 'Host address 2',
    addr2Sub: 'optional – if you have two possible locations',
    street: 'Street',
    streetPlaceholder: 'Example Street',
    nr: 'No.',
    nrPlaceholder: '12',
    plz: 'Postcode',
    plzPlaceholder: '10115',
    city: 'City',
    cityPlaceholder: 'Berlin',
    doorbell: 'Doorbell name',
    doorbellPlaceholder: 'e.g. Smith / Jones',
    notes: 'Anything else to add?',
    notesPlaceholder: 'Other notes for the organisers…',
    required: '',
    optional: '(optional)',
    errorRequired: 'Please fill in all required fields.',
    errorSave: 'Error saving: ',
    submitBtn: '✅ Register now (binding)',
    submitting: '⏳ Saving…',
    privacyNote: 'Your data will only be used to organise this Running Dinner and will not be passed on to third parties.',
    privacy: 'Privacy policy',
  },
}

// ── Reusable input ────────────────────────────────────────────────────────────
function Field({ label, required, optional, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{' '}
        {required
          ? <span className="text-red-400">*</span>
          : <span className="text-gray-400 font-normal">{optional}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-300'

// ── Address block ─────────────────────────────────────────────────────────────
function AddressBlock({ prefix, form, set, required, t }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t.street}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input type="text" placeholder={t.streetPlaceholder}
            value={form[`${prefix}street`]} onChange={e => set(`${prefix}street`, e.target.value)}
            required={required} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t.nr}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input type="text" placeholder={t.nrPlaceholder}
            value={form[`${prefix}housenumber`]} onChange={e => set(`${prefix}housenumber`, e.target.value)}
            required={required} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t.plz}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input type="text" placeholder={t.plzPlaceholder}
            value={form[`${prefix}zip`]} onChange={e => set(`${prefix}zip`, e.target.value)}
            required={required} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t.city}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <input type="text" placeholder={t.cityPlaceholder}
            value={form[`${prefix}city`]} onChange={e => set(`${prefix}city`, e.target.value)}
            required={required} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          {t.doorbell}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <input type="text" placeholder={t.doorbellPlaceholder}
          value={form[`${prefix}doorbell`]} onChange={e => set(`${prefix}doorbell`, e.target.value)}
          required={required} className={inputCls} />
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
  const [lang, setLang] = useState('de')
  const t = T[lang]

  const [form, setForm] = useState({
    names: '',
    groupSize: 2,
    name3: '',
    phone3: '',
    email3: '',
    email1: '',
    email2: '',
    phone1: '',
    phone2: '',
    diet: 'omnivor',
    allergies: '',
    a1street: '', a1housenumber: '', a1zip: '', a1city: 'Berlin', a1doorbell: '',
    a2street: '', a2housenumber: '', a2zip: '', a2city: 'Berlin', a2doorbell: '',
    notes: '',
  })
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    async function checkSurvey() {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, event_name, event_date, time_starter')
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
    if (!form.names.trim() || !form.email1.trim() || !form.phone1.trim()
      || !form.a1street.trim() || !form.a1housenumber.trim()
      || !form.a1zip.trim() || !form.a1city.trim() || !form.a1doorbell.trim()) {
      setError(t.errorRequired)
      return
    }
    setLoading(true)
    setError('')

    const address1 = `${form.a1street.trim()} ${form.a1housenumber.trim()}, ${form.a1zip.trim()} ${form.a1city.trim()}`
    const hasAddr2 = form.a2street.trim() && form.a2housenumber.trim()
    const address2 = hasAddr2
      ? `${form.a2street.trim()} ${form.a2housenumber.trim()}, ${form.a2zip.trim()} ${form.a2city.trim()}`
      : null

    try {
      const { error: dbError } = await supabase.from('responses').insert({
        survey_id: surveyId,
        names: form.names.trim(),
        group_size: Number(form.groupSize),
        name3:  form.groupSize === 3 ? (form.name3.trim()  || null) : null,
        phone3: form.groupSize === 3 ? (form.phone3.trim() || null) : null,
        email3: form.groupSize === 3 ? (form.email3.trim() || null) : null,
        email: form.email1.trim(),       // legacy column
        email2: form.email2.trim() || null,
        phone: form.phone1.trim(),       // legacy column
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || null,
        diet: form.diet,
        allergies: form.allergies.trim() || null,
        address: address1,
        doorbell: form.a1doorbell.trim(),
        street1: form.a1street.trim(), housenumber1: form.a1housenumber.trim(),
        zip1: form.a1zip.trim(), city1: form.a1city.trim(), doorbell1: form.a1doorbell.trim(),
        street2: form.a2street.trim() || null, housenumber2: form.a2housenumber.trim() || null,
        zip2: form.a2zip.trim() || null, city2: form.a2city.trim() || null,
        doorbell2: form.a2doorbell.trim() || null,
        ...(address2 ? { address2 } : {}),
        notes: form.notes.trim() || null,
      })
      if (dbError) throw new Error(dbError.message)
      setSubmitted(true)
    } catch (err) {
      setError(t.errorSave + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Event date display helper ─────────────────────────────────────────────
  const eventDateLine = (() => {
    if (!survey?.event_date && !survey?.time_starter) return null
    const parts = []
    if (survey.event_date) {
      const d = new Date(survey.event_date + 'T12:00:00')
      parts.push(lang === 'de'
        ? `am ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : `on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    }
    if (survey.time_starter) {
      parts.push(lang === 'de'
        ? `Start um ${survey.time_starter}`
        : `starting at ${survey.time_starter}`)
    }
    return parts.join(' – ')
  })()

  // ── States ────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🍽️</div>
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.notFound}</h1>
          <p className="text-gray-500 mb-6">{t.notFoundSub}</p>
          <Link to="/" className="text-sm font-semibold" style={{ color: ACCENT }}>{t.backHome}</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-5">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{t.thankYou}</h1>
          <p className="text-lg text-gray-600 mb-2">{t.submitted}</p>
          <p className="text-gray-400 text-sm">
            {survey?.event_name ? t.submittedEvent(survey.event_name) : t.submittedSub}
          </p>
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            {t.planNote}
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
        <h1 className="text-2xl font-bold mb-1">{t.title}</h1>
        {survey?.event_name && (
          <p className="text-green-100 text-sm mt-1">{survey.event_name}</p>
        )}
        {eventDateLine && (
          <p className="text-green-200 text-xs mt-1">{eventDateLine}</p>
        )}
      </div>

      {/* Language toggle */}
      <div className="max-w-lg mx-auto px-4 pt-6 flex justify-end gap-2">
        {['de', 'en'].map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all"
            style={lang === l
              ? { backgroundColor: ACCENT, color: 'white', borderColor: ACCENT }
              : { backgroundColor: 'white', color: '#374151', borderColor: '#d1d5db' }}
          >
            {l === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── Info box ── */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {t.introText}
            </p>
            <p className="text-sm font-semibold text-gray-800">{t.howTitle}</p>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              {t.howItems.map((item, i) => (
                <li key={i} className={i === 4 ? 'font-medium text-gray-800' : ''}>{item}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Namen */}
            <Field label={t.names} required optional={t.optional}>
              <input type="text" placeholder={t.namesPlaceholder}
                value={form.names} onChange={e => set('names', e.target.value)}
                required className={inputCls} />
            </Field>

            {/* Gruppengröße */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t.groupSizeLabel} <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                {[2, 3].map(n => (
                  <label key={n}
                    className="flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-all"
                    style={{
                      borderColor: form.groupSize === n ? ACCENT : '#e5e7eb',
                      backgroundColor: form.groupSize === n ? '#f0fdf6' : 'white',
                    }}>
                    <input type="radio" name="groupSize" value={n}
                      checked={form.groupSize === n} onChange={() => set('groupSize', n)}
                      className="sr-only" />
                    <div className="text-2xl mb-1">{n === 2 ? '👫' : '👨‍👩‍👧'}</div>
                    <div className="text-sm font-semibold text-gray-800">{n === 2 ? t.groupSize2 : t.groupSize3}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Person (nur wenn 3 Personen) */}
            {form.groupSize === 3 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-green-800">Angaben zur 3. Person</p>
                <Field label={t.name3} required optional={t.optional}>
                  <input type="text" placeholder={t.name3Placeholder}
                    value={form.name3} onChange={e => set('name3', e.target.value)}
                    className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.phone3} required={false} optional={t.optional}>
                    <input type="tel" placeholder={t.phone3Placeholder}
                      value={form.phone3} onChange={e => set('phone3', e.target.value)}
                      className={inputCls} />
                  </Field>
                  <Field label={t.email3} required={false} optional={t.optional}>
                    <input type="email" placeholder={t.email3Placeholder}
                      value={form.email3} onChange={e => set('email3', e.target.value)}
                      className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* E-Mails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t.email1} required optional={t.optional}>
                <input type="email" placeholder={t.email1Placeholder}
                  value={form.email1} onChange={e => set('email1', e.target.value)}
                  required className={inputCls} />
              </Field>
              <Field label={t.email2} required={false} optional={t.optional}>
                <input type="email" placeholder={t.email2Placeholder}
                  value={form.email2} onChange={e => set('email2', e.target.value)}
                  className={inputCls} />
              </Field>
            </div>

            {/* Handynummern */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.phone1} required optional={t.optional}>
                <input type="tel" placeholder={t.phone1Placeholder}
                  value={form.phone1} onChange={e => set('phone1', e.target.value)}
                  required className={inputCls} />
              </Field>
              <Field label={t.phone2} required={false} optional={t.optional}>
                <input type="tel" placeholder={t.phone2Placeholder}
                  value={form.phone2} onChange={e => set('phone2', e.target.value)}
                  className={inputCls} />
              </Field>
            </div>

            {/* Ernährung */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{t.diet}</label>
              <div className="grid grid-cols-3 gap-3">
                {t.dietOptions.map(opt => (
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
            <Field label={t.allergies} required={false} optional={t.optional}>
              <input type="text" placeholder={t.allergiesPlaceholder}
                value={form.allergies} onChange={e => set('allergies', e.target.value)}
                className={inputCls} />
            </Field>

            {/* Host-Adresse 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-700">{t.addr1Title}</span>
                <span className="text-red-400 text-sm">*</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <AddressBlock prefix="a1" form={form} set={set} required={true} t={t} />
              </div>
            </div>

            {/* Host-Adresse 2 */}
            <div>
              <div className="mb-3">
                <span className="text-sm font-semibold text-gray-700">{t.addr2Title} </span>
                <span className="text-gray-400 text-sm font-normal">({t.addr2Sub})</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <AddressBlock prefix="a2" form={form} set={set} required={false} t={t} />
              </div>
            </div>

            {/* Hinweis */}
            <Field label={t.notes} required={false} optional={t.optional}>
              <textarea rows={3} placeholder={t.notesPlaceholder}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                className={`${inputCls} resize-none`} />
            </Field>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? t.submitting : t.submitBtn}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
            {t.privacyNote}{' '}
            <Link to="/datenschutz" className="underline">{t.privacy}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
