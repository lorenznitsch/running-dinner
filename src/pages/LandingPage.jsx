import { Link } from 'react-router-dom'
import { useState } from 'react'

const ACCENT = '#1D9E75'

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
          Importiere die Anmeldungen aus Google Forms, generiere automatisch den Dinner-Plan und verschicke fertige WhatsApp-Nachrichten – alles im Browser, keine Daten verlassen deinen Rechner.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/tool"
            className="px-7 py-3 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90 shadow-md"
            style={{ backgroundColor: ACCENT }}
          >
            CSV hochladen & starten
          </Link>
          <a
            href="#"
            className="px-7 py-3 rounded-xl font-semibold text-gray-700 text-base border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Google Forms Template herunterladen
          </a>
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
    <section className="py-24 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">So funktioniert's</h2>
          <p className="text-gray-500 text-lg">In drei Schritten zum fertigen Dinner-Plan.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center p-8 rounded-2xl border border-gray-100 bg-gray-50">
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
          <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
          <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
          <a href="mailto:hallo@example.com" className="hover:text-white transition-colors">Kontakt</a>
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
        <HowItWorks />
        <Features />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
