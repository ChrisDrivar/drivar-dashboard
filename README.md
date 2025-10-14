# DRIVAR KPI Dashboard

Performance Dashboard für Vermieter- und Fahrzeug-KPIs, gebaut mit Next.js 14, Chakra UI und Google Sheets als Datenquelle.

## Setup

1. **Abhängigkeiten installieren**
   ```bash
   npm install
   # oder
   pnpm install
   ```

2. **Google Sheet freigeben**
   - In Google Sheets das Dashboard-Dokument öffnen.
   - Über „Datei → Im Web veröffentlichen“ oder „Teilen → Link abrufbar für alle mit dem Link (Lesen)“ zugänglich machen.
   - Die Sheet-ID (zwischen `/d/` und `/edit` in der URL) in `.env.local` eintragen:
     ```bash
     GOOGLE_SHEET_ID="1AbC123..."
     ```

3. **Google Sheet Struktur**
   - Tab `owners` (Vermieter-Stammdaten): `vermieter_id` (optional, kann ausgeblendet werden), `vermieter_name`, `land`, `telefon`, `email`, `domain`, `partner_since`, `status`.
   - Tab `inventory` (Fahrzeuge): `fahrzeug_id` (optional), `vermieter_id` oder `vermieter_name`, `land`, `region`, `stadt`, `fahrzeugtyp`, `listed_at`, `offboarded_at`, `status`, optional `fahrzeug_label`. Für die Kartenansicht können zusätzlich `latitude` und `longitude` gepflegt werden (falls leer, greift eine hinterlegte City-Liste für DE/AT/CH/UK/USA/UAE/AU).
   - Tab `inquiries`: `datum`, `fahrzeug_id` (optional), `fahrzeugtyp`, `land`, `stadt`, `anfragen`, `mieten`.
  - Tab `listing_requests`: `datum`, `kanal`, `region`, `vermieter_name`, optional `fahrzeug_label`, `manufacturer`, `fahrzeugtyp`, `stadt`, `land`, `kommentar`.
   - Tab `missing_inventory`: `region`, `fahrzeugtyp`, `anzahl_fehlend`, `prio`, `kommentar`, optional `land`.

4. **Entwicklung starten**
   ```bash
   npm run dev
   ```
   Dashboard läuft anschließend auf [http://localhost:3000](http://localhost:3000).

## Architektur

- **Next.js App Router** für API-Routen (`/api/kpis`) und Dashboard-Seite.
- **Chakra UI** sorgt für CI-konforme Komponenten, Dark Mode und schnelles Styling.
- **Google Sheets GViz Endpoint** liefert Daten für die KPIs. Aggregationen passieren serverseitig in `lib/transform.ts`.
- **Owners-Tab** dient als Quelle für Kontaktinformationen; für Filter genügt der `vermieter_name`. IDs können im Sheet versteckt werden, bleiben aber für saubere Auswertungen sinnvoll.
- **SWR** sorgt für automatische Revalidierung der KPIs im Client.

## Nächste Schritte

- Weitere KPIs ergänzen (z. B. Zuwachs/Verlust im Wochenvergleich).
- Authentifizierung für sensible Dashboards.
- Automatisierte Datenpflege via n8n-Flows.

## Deployment

### Schnell mit Vercel
1. Repository auf GitHub pushen.
2. Bei [Vercel](https://vercel.com) anmelden, GitHub-Repo importieren.
3. Environment-Variablen in den Project Settings setzen:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (mit `\n` Zeilenumbrüchen)
   - optional: `GEOCODER_USER_AGENT`, `GEOCODER_CONTACT_EMAIL`, Sheet-Ranges.
4. Deploy auslösen – Vercel liefert HTTPS und Autoscaling gratis.
5. Eigene Domain über Cloudflare als CNAME auf Vercel legen (SSL-Modus "Full").

### Docker auf eigenem Server
```bash
docker compose up --build -d
```
> Beispiel `docker-compose.yml` und `Dockerfile` liegen in diesem Repo (siehe `/deployment`).
