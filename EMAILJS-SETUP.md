# EmailJS Setup – Running Dinner Generator

Mit EmailJS kannst du Dinner-Plan-Nachrichten direkt aus dem Browser versenden,
ohne eigenen Server. Kostenlos bis 200 Mails/Monat.

---

## Schritt 1: Account erstellen

1. Gehe zu https://www.emailjs.com und klicke **Sign Up**
2. Registriere dich (kostenloser Account reicht)
3. Bestätige deine E-Mail

---

## Schritt 2: Email Service verbinden

1. Im Dashboard: **Email Services** → **Add New Service**
2. Wähle deinen Anbieter:
   - **Gmail** → mit Google-Account autorisieren
   - **Outlook / Hotmail** → mit Microsoft-Account autorisieren
3. Gib dem Service einen Namen (z.B. `running_dinner`)
4. Klicke **Connect Account** → Seite autorisieren
5. Klicke **Create Service**
6. Notiere die **Service ID** (z.B. `service_abc123`)

---

## Schritt 3: E-Mail-Template erstellen

1. Im Dashboard: **Email Templates** → **Create New Template**
2. Fülle das Template aus:

**To Email:** `{{to_email}}`

**To Name:** `{{to_name}}`

**Subject:** `Dein persönlicher Running Dinner Plan 🍽️`

**Body (Text):**
```
Hallo {{to_name}},

{{message}}
```

3. Klicke **Save**
4. Notiere die **Template ID** (z.B. `template_xyz789`)

> ⚠️ Wichtig: Die Variablennamen müssen exakt so lauten:
> `{{to_email}}`, `{{to_name}}`, `{{message}}`

---

## Schritt 4: Public Key finden

1. Im Dashboard oben rechts: dein **Account → API Keys**
2. Kopiere den **Public Key** (z.B. `aBcDeFgHiJkLmNoPq`)

---

## Schritt 5: Im Tool eintragen

1. Öffne den Running Dinner Generator → Tool → Schritt 4 → Tab „Nachrichten"
2. Scrolle zum Bereich **„Mails verschicken"**
3. Trage ein:
   - **Service ID** → z.B. `service_abc123`
   - **Template ID** → z.B. `template_xyz789`
   - **Public Key** → z.B. `aBcDeFgHiJkLmNoPq`
4. Gib eine Test-E-Mail-Adresse ein und klicke **„Verbindung testen"**
5. Prüfe dein Postfach – du solltest eine Test-Mail erhalten haben
6. Klicke **„Speichern"** – die Zugangsdaten werden im Browser gespeichert

---

## Wichtige Hinweise

- **Free Plan:** 200 E-Mails/Monat, max. 2 Email Services
- **Rate Limit:** Das Tool wartet 250ms zwischen jeder Mail, um Limits einzuhalten
- **Kein Server:** Alle Mails werden direkt aus deinem Browser gesendet
- **Datenschutz:** Die E-Mail-Adressen deiner Teilnehmer werden direkt an EmailJS
  übermittelt. Informiere deine Teilnehmer darüber in deiner Datenschutzerklärung.
- **Absender:** Die Mails kommen von deiner eigenen Gmail/Outlook-Adresse

---

## Fehlerbehebung

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Invalid service ID` | Falsche Service ID | Im EmailJS Dashboard nachschauen |
| `Invalid template ID` | Falsche Template ID | Im EmailJS Dashboard nachschauen |
| `Invalid public key` | Falscher Public Key | Unter Account → API Keys nachschauen |
| Mail kommt nicht an | Spam-Filter | Spam-Ordner prüfen |
| `The user's email is not verified` | Gmail nicht autorisiert | Service erneut verbinden |
