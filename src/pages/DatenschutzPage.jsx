import { Link } from 'react-router-dom'

const ACCENT = '#1D9E75'

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <span style={{ color: ACCENT }}>🍽️</span>
            <span>Running Dinner</span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Zurück zur Startseite</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Datenschutzerklärung</h1>
        <p className="text-gray-400 text-sm mb-12">Stand: Juni 2025</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-xl text-sm">
              <p className="font-semibold text-gray-900">Lorenz Nitsch</p>
              <p>E-Mail: <a href="mailto:lorenz_nitsch@hotmail.de" className="underline" style={{ color: ACCENT }}>lorenz_nitsch@hotmail.de</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Grundsatz: Clientseitige Verarbeitung</h2>
            <p>
              Diese Webanwendung verarbeitet alle von Ihnen eingegebenen oder hochgeladenen Daten
              <strong> ausschließlich lokal in Ihrem Browser</strong>. Es findet keinerlei Übertragung
              personenbezogener Daten (z.&nbsp;B. Namen, Adressen, Ernährungsangaben aus der CSV-Datei)
              an externe Server statt. Sobald Sie den Browser-Tab schließen oder die Seite neu laden,
              werden alle Daten unwiderruflich gelöscht. Es gibt keine Datenbank, kein Backend und
              keine serverseitige Speicherung.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Hosting (Vercel)</h2>
            <p>
              Diese Website wird über die Infrastruktur von <strong>Vercel Inc.</strong> (340 Pine Street,
              Suite 1201, San Francisco, CA 94104, USA) gehostet. Beim Aufruf der Website werden
              technisch bedingt folgende Daten durch Vercel verarbeitet:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
              <li>IP-Adresse des anfragenden Geräts</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Aufgerufene URL, HTTP-Methode und Statuscode</li>
              <li>Übertragene Datenmenge</li>
              <li>Browser-Typ und Betriebssystem (User-Agent)</li>
            </ul>
            <p className="mt-3">
              Diese Daten werden von Vercel zur Bereitstellung und Absicherung des Dienstes verarbeitet.
              Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse an
              einem sicheren Betrieb). Weitere Informationen finden Sie in der
              {' '}<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ACCENT }}>Datenschutzrichtlinie von Vercel</a>.
              Da Vercel in den USA ansässig ist, erfolgt eine Datenübermittlung in ein Drittland.
              Vercel setzt hierbei Standardvertragsklauseln (SCCs) gemäß Art.&nbsp;46 DSGVO ein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Keine Cookies, kein Tracking, keine Analytics</h2>
            <p>
              Diese Website verwendet <strong>keine Cookies</strong>, kein Tracking, keine
              Analysetools (wie Google Analytics o.&nbsp;Ä.) und keine Remarketing-Pixel. Es werden
              keine persistenten Sitzungsdaten gespeichert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Externer Dienst: OpenStreetMap / Nominatim</h2>
            <p>
              Wenn Sie im Generator-Tool den Tab „Karte" öffnen, werden die Gastgeber-Adressen aus
              Ihrem Dinner-Plan zur Umwandlung in geografische Koordinaten (Geocoding) an den
              Nominatim-Dienst der <strong>OpenStreetMap Foundation</strong> (St John's Innovation
              Centre, Cowley Road, Cambridge, CB4 0WS, UK) übermittelt.
            </p>
            <p className="mt-2">
              Dabei wird jede Adresse als einzelne HTTPS-Anfrage an
              {' '}<code className="bg-gray-100 px-1 rounded text-sm">nominatim.openstreetmap.org</code> gesendet.
              Nominatim speichert Anfragen gemäß seiner eigenen
              {' '}<a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ACCENT }}>Datenschutzrichtlinie</a> ggf.
              temporär in Logfiles. <strong>Bitte laden Sie die Karte nur, wenn Sie damit einverstanden
              sind, dass die enthaltenen Adressen an Nominatim übertragen werden.</strong>
            </p>
            <p className="mt-2">
              Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (Einwilligung durch
              bewusste Nutzung der Karten-Funktion).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Ihre Rechte gemäß DSGVO</h2>
            <p>Sie haben gegenüber dem Verantwortlichen folgende Rechte:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
              <li><strong>Auskunftsrecht</strong> (Art.&nbsp;15 DSGVO): Sie können Auskunft über die zu Ihrer Person gespeicherten Daten verlangen.</li>
              <li><strong>Recht auf Berichtigung</strong> (Art.&nbsp;16 DSGVO): Sie können die Berichtigung unrichtiger Daten verlangen.</li>
              <li><strong>Recht auf Löschung</strong> (Art.&nbsp;17 DSGVO): Sie können die Löschung Ihrer personenbezogenen Daten verlangen.</li>
              <li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art.&nbsp;18 DSGVO)</li>
              <li><strong>Recht auf Datenübertragbarkeit</strong> (Art.&nbsp;20 DSGVO)</li>
              <li><strong>Widerspruchsrecht</strong> (Art.&nbsp;21 DSGVO)</li>
              <li><strong>Recht auf Beschwerde</strong> bei einer Aufsichtsbehörde (Art.&nbsp;77 DSGVO)</li>
            </ul>
            <p className="mt-3 text-sm">
              Da diese Anwendung keine personenbezogenen Daten auf Servern speichert, liegt für die
              meisten Rechte kein Anwendungsfall vor. Für Anfragen wenden Sie sich bitte per E-Mail an
              {' '}<a href="mailto:lorenz_nitsch@hotmail.de" className="underline" style={{ color: ACCENT }}>lorenz_nitsch@hotmail.de</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Beschwerderecht bei der Aufsichtsbehörde</h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung
              Ihrer personenbezogenen Daten zu beschweren. Die zuständige Aufsichtsbehörde in Berlin ist:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-xl text-sm">
              <p className="font-semibold text-gray-900">Berliner Beauftragte für Datenschutz und Informationsfreiheit</p>
              <p>Friedrichstr. 219, 10969 Berlin</p>
              <p>Website: <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ACCENT }}>www.datenschutz-berlin.de</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Aktualität und Änderungen</h2>
            <p>
              Diese Datenschutzerklärung ist aktuell gültig. Durch die Weiterentwicklung der Website
              oder aufgrund geänderter gesetzlicher bzw. behördlicher Vorgaben kann es notwendig werden,
              diese Datenschutzerklärung anzupassen. Die jeweils aktuelle Fassung ist stets unter
              {' '}<code className="bg-gray-100 px-1 rounded text-sm">/datenschutz</code> abrufbar.
            </p>
          </section>

        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-10 px-4 mt-16">
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
        </div>
      </footer>
    </div>
  )
}
