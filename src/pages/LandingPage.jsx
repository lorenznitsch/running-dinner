import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import CreateSurveyModal from '../components/CreateSurveyModal'

const ACCENT = '#1D9E75'
const FORMS_URL = 'https://docs.google.com/forms/d/1R967Yds619dSd6Z6TvLm6QWtjUr_81Db3a9W2-rbAdg/copy'

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <span style={{ color: ACCENT }}>🍽️</span>
          <span>Running Dinner</span>
        </Link>
        <Link
          to="/tool"
          className="px-5 py-2 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          Jetzt starten
        </Link>
      </div>
    </nav>
  )
}

function Hero() {
  const [showModal, setShowModal] = useState(false)

  return (
    <section className="bg-gradient-to-b from-green-50 to-white py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span>✨</span> Kostenlos & ohne Anmeldung
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Dein Running Dinner,<br />
          <span style={{ color: ACCENT }}>perfekt geplant.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Erstelle eine Umfrage, teile den Link mit deinen Gästen und generiere automatisch den Dinner-Plan – alles ohne Login oder Google Forms.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowModal(true)}
            className="px-7 py-3 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90 shadow-md"
            style={{ backgroundColor: ACCENT }}
          >
            ✨ Neue Umfrage erstellen
          </button>
          <Link
            to="/tool"
            className="px-7 py-3 rounded-xl font-semibold text-gray-700 text-base border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            CSV hochladen & starten
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-5">
          Lieber Google Forms?{' '}
          <a href={FORMS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 transition-colors">
            Template herunterladen
          </a>
        </p>
      </div>
      {showModal && <CreateSurveyModal onClose={() => setShowModal(false)} />}
    </section>
  )
}

// ─── Animated explainer ───────────────────────────────────────────────────────

const TEAM_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f',
  '#2ecc71', '#1abc9c', '#3498db',
  '#9b59b6', '#e91e8c', '#607d8b',
]

const ROUNDS = [
  {
    label: '🥗 Vorspeise',
    subtitle: '3 Teams pro Tisch',
    groups: [[0, 1, 2], [3, 4, 5], [6, 7, 8]],
  },
  {
    label: '🍝 Hauptspeise',
    subtitle: 'Neue Mischung!',
    groups: [[0, 3, 6], [1, 4, 7], [2, 5, 8]],
  },
  {
    label: '🍰 Nachspeise',
    subtitle: 'Alle zusammen!',
    groups: [[0, 1, 2, 3, 4, 5, 6, 7, 8]],
  },
]

function TeamCircle({ color, size = 32 }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2px solid rgba(255,255,255,0.8)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        flexShrink: 0,
        transition: 'all 0.5s ease',
      }}
    />
  )
}

function RunningDinnerExplainer() {
  const [activeRound, setActiveRound] = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActiveRound(r => (r + 1) % ROUNDS.length)
        setAnimating(false)
      }, 300)
    }, 2800)
    return () => clearInterval(timerRef.current)
  }, [])

  const round = ROUNDS[activeRound]
  const isFinal = activeRound === 2

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Was ist ein Running Dinner?
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Beim Running Dinner melden sich Gruppen von je 2–3 Personen an. Das Abendessen wird in drei Gänge aufgeteilt (Vorspeise, Hauptspeise, Nachspeise). Pro Gang essen jeweils 3 Teams zusammen – die Teams werden nach jedem Gang neu gemischt, sodass jeder Gang an einem anderen Ort mit anderen Personen stattfindet. Zur Nachspeise kommen alle gemeinsam an einem Ort zusammen.
          </p>
        </div>

        {/* Round selector */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {ROUNDS.map((r, i) => (
            <button
              key={i}
              onClick={() => { setActiveRound(i); clearInterval(timerRef.current) }}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={
                activeRound === i
                  ? { backgroundColor: ACCENT, color: 'white', boxShadow: '0 2px 8px rgba(29,158,117,0.4)' }
                  : { backgroundColor: '#f3f4f6', color: '#6b7280' }
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Visual */}
        <div
          className="transition-opacity duration-300"
          style={{ opacity: animating ? 0 : 1 }}
        >
          <p className="text-center text-sm font-semibold mb-6" style={{ color: ACCENT }}>
            {round.subtitle}
          </p>

          {isFinal ? (
            /* Final round: one big table */
            <div className="flex justify-center">
              <div
                className="rounded-2xl border-2 p-6 flex flex-col items-center gap-4"
                style={{ borderColor: ACCENT, backgroundColor: '#f0fdf6', minWidth: 260 }}
              >
                <span className="text-sm font-bold text-gray-600 mb-1">Gemeinsamer Ort</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {[0,1,2,3,4,5,6,7,8].map(idx => (
                    <TeamCircle key={idx} color={TEAM_COLORS[idx]} size={36} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 mt-1">Alle 9 Teams 🎉</span>
              </div>
            </div>
          ) : (
            /* Normal rounds: 3 tables */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {round.groups.map((group, gi) => (
                <div
                  key={gi}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col items-center gap-3"
                >
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Tisch {gi + 1}
                  </span>
                  <div className="flex gap-2">
                    {group.map(idx => (
                      <TeamCircle key={idx} color={TEAM_COLORS[idx]} size={36} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{group.length} Teams · {group.length * 2} Personen</span>
                </div>
              ))}
            </div>
          )}

          {/* Flow arrows */}
          {!isFinal && (
            <div className="flex justify-center mt-8 gap-3 items-center">
              {ROUNDS.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{ backgroundColor: activeRound === i ? ACCENT : '#d1d5db', transform: activeRound === i ? 'scale(1.4)' : 'scale(1)' }}
                  />
                  {i < ROUNDS.length - 1 && <div className="w-8 h-px bg-gray-200" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          {TEAM_COLORS.slice(0, 9).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: c }} />
              Team {i + 1}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: '📋',
      title: 'Anmeldungen sammeln',
      desc: 'Teile das Google Forms Template mit deinen Gästen. Alle Daten – Namen, Adresse, Ernährung, Allergien – landen automatisch in einer CSV-Datei.',
    },
    {
      icon: '⬆️',
      title: 'CSV importieren',
      desc: 'Lade die exportierte CSV-Datei in den Generator. Die Spalten werden automatisch erkannt, der Plan wird sofort erstellt.',
    },
    {
      icon: '💬',
      title: 'Nachrichten versenden',
      desc: 'Jedes Team bekommt eine fertige WhatsApp-Nachricht mit Adressen, Uhrzeiten und allen Infos – einfach kopieren und senden.',
    },
  ]

  return (
    <section className="py-24 px-4" style={{ backgroundColor: '#f8fafb' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">So funktioniert's</h2>
          <p className="text-gray-500 text-lg">In drei Schritten zum fertigen Dinner-Plan.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center p-8 rounded-2xl border border-gray-100 bg-white">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-4"
                style={{ backgroundColor: ACCENT }}
              >
                {i + 1}
              </div>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      icon: '📊',
      title: 'Übersichtlicher Dinner-Plan',
      desc: 'Alle Teams auf einen Blick – wer kocht was, wer geht wohin. Als Tabelle übersichtlich dargestellt.',
    },
    {
      icon: '🗺️',
      title: 'Karte der Locations',
      desc: 'Alle Adressen werden auf einer interaktiven Karte angezeigt – perfekt zum Überblick behalten.',
    },
    {
      icon: '💌',
      title: 'Versandfertige Nachrichten',
      desc: 'Pro Team eine komplett fertige WhatsApp-Nachricht mit allem drin – einfach kopieren und senden.',
    },
    {
      icon: '🥗',
      title: 'Diäten & Allergien',
      desc: 'Vegane und vegetarische Teams kochen automatisch passend. Allergien werden im Plan hervorgehoben.',
    },
  ]

  return (
    <section className="py-24 px-4" style={{ backgroundColor: '#f0fdf6' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Was du bekommst</h2>
          <p className="text-gray-500 text-lg">Alles, was du für ein reibungsloses Running Dinner brauchst.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="flex gap-5 p-6 bg-white rounded-2xl border border-green-100 shadow-sm">
              <div className="text-3xl flex-shrink-0">{f.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const faqs = [
    {
      q: 'Was ist ein Running Dinner?',
      a: 'Beim Running Dinner melden sich Gruppen von je 2–3 Personen an. Das Abendessen wird in drei Gänge aufgeteilt (Vorspeise, Hauptspeise, Nachspeise). Pro Gang essen jeweils 3 Teams zusammen – die Teams werden nach jedem Gang neu gemischt, sodass jeder Gang an einem anderen Ort mit anderen Personen stattfindet. Zur Nachspeise kommen alle gemeinsam an einem Ort zusammen.',
    },
    {
      q: 'Welches Template nutze ich für Google Forms?',
      a: 'Lade das Template über den Button auf dieser Seite herunter. Es enthält alle nötigen Felder: Namen, Adresse, Klingelschild, Ernährung (vegan/vegetarisch/omnivor) und Allergien. Kopiere das Template in deinen Google Drive und teile den Link mit deinen Gästen.',
    },
    {
      q: 'Werden meine Daten gespeichert?',
      a: 'Nein. Alle Daten werden ausschließlich lokal in deinem Browser verarbeitet. Es findet kein Upload auf externe Server statt. Wenn du den Tab schließt, sind alle Daten weg.',
    },
    {
      q: 'Wie viele Teams sind möglich?',
      a: 'Der Algorithmus funktioniert am besten mit mindestens 9 Teams (damit 3×3 Gruppen gebildet werden können). Es gibt keine obere Grenze – wir haben es mit bis zu 60 Teams getestet.',
    },
  ]

  const [open, setOpen] = useState(null)

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Häufige Fragen</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>{faq.q}</span>
                <span
                  className="text-xl transition-transform duration-200 flex-shrink-0 ml-4"
                  style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', color: ACCENT }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-bold text-white">
          <span>🍽️</span>
          <span>Running Dinner Generator</span>
        </div>
        <div className="flex gap-6 text-sm">
          <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
          <a href="https://github.com/lorenznitsch/running-dinner" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <a href="mailto:lorenz_nitsch@hotmail.de" className="hover:text-white transition-colors">Kontakt</a>
        </div>
        <p className="text-xs text-gray-600">Alle Daten bleiben in deinem Browser.</p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <RunningDinnerExplainer />
        <HowItWorks />
        <Features />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
