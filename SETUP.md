# Setup-Anleitung: Running Dinner Generator

## 1. Supabase-Projekt

Du hast bereits ein Supabase-Projekt. Die Zugangsdaten sind in `.env.local` eingetragen.

---

## 2. Datenbank-Schema ausführen

1. Öffne dein Supabase-Dashboard: https://supabase.com/dashboard
2. Wähle dein Projekt aus
3. Klicke links auf **SQL Editor** → **New Query**
4. Kopiere den gesamten Inhalt aus `supabase-schema.sql` hinein
5. Klicke auf **Run** (▶️)
6. Prüfe, dass die Tabellen `surveys` und `responses` angelegt wurden:
   **Table Editor** → du siehst beide Tabellen

---

## 3. Umgebungsvariablen in Vercel eintragen

Damit das deployete Projekt auf Supabase zugreifen kann:

1. Öffne https://vercel.com/dashboard
2. Klicke auf dein Projekt **running-dinner**
3. Gehe zu **Settings** → **Environment Variables**
4. Füge folgende Variablen hinzu (für alle Environments: Production, Preview, Development):

| Name | Wert |
|------|------|
| `VITE_SUPABASE_URL` | `https://ynhyjwenzfkghuvmznfc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_DX87MftPAbZqD0QwQcPdFg_-Q6g0JPc` |

5. Klicke **Save**
6. Gehe zu **Deployments** → klicke auf das neueste Deployment → **Redeploy**
   (damit die neuen ENV-Variablen wirksam werden)

---

## 4. Supabase – Row Level Security prüfen

Nach dem Schema-Import sollte RLS aktiv sein. Zur Kontrolle:

1. **Table Editor** → Tabelle `responses` anklicken
2. Oben rechts: **RLS enabled** muss grün angezeigt werden
3. Klicke auf **Policies** → du siehst:
   - `Jeder kann Antworten einreichen` (INSERT)
   - `Nur Admin kann Antworten lesen` (SELECT)

Falls RLS nicht aktiv ist:
```sql
alter table surveys   enable row level security;
alter table responses enable row level security;
```

---

## 5. Lokal entwickeln

```bash
cd app
npm install
npm run dev
```

Die App läuft dann auf http://localhost:5173

---

## 6. Flows testen

### Umfrage erstellen (Organisator)
1. Öffne die Landing Page `/`
2. Klicke **„Neue Umfrage erstellen"**
3. Gib einen Event-Namen ein → **Umfrage erstellen**
4. Kopiere den **Teilnehmer-Link** und den **Admin-Link**

### Anmelden (Teilnehmer)
1. Öffne den Teilnehmer-Link `/survey/[surveyId]`
2. Fülle das Formular aus → **Jetzt anmelden**
3. Bestätigung erscheint

### Plan generieren (Organisator)
1. Öffne den Admin-Link `/admin/[surveyId]?token=[adminToken]`
2. Alle Anmeldungen werden angezeigt
3. Klicke **„Dinner-Plan erstellen"** → du landest direkt im Generator mit den Daten
4. Konfiguriere Datum, Uhrzeiten, Nachspeise-Ort → Plan erstellen

---

## 7. Produktions-Domain anpassen (optional)

Im Vercel Dashboard unter **Settings → Domains** kannst du:
- `running-dinner.vercel.app` als Alias setzen (falls noch nicht aktiv)
- Eine eigene Domain wie `running-dinner.de` hinzufügen

---

## Technologie-Stack

| Layer | Technologie |
|-------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| Datenbank | Supabase (PostgreSQL + RLS) |
| Karte | Leaflet.js + OpenStreetMap |
| PDF-Export | jsPDF + html2canvas |
| DOCX-Export | docx + file-saver |
| Hosting | Vercel |
