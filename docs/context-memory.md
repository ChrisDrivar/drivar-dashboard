# DRIVAR Dashboard – Kontext & Funktionsstand

Stand: 14. Oktober 2025  
Letzte Änderungen: Bundesland-Umstellung, Lead-Workflow, Basic Auth, Radius-Verbesserung

### 2025-?? (Owner & Custom Location Update)
- Vermieter-Tab: Dropdown-Menü im Dashboard (Hinzufügen, Fahrzeug ergänzen, Stammdaten ändern via PATCH /api/partners, Löschen).
- Akquise-Formular entspricht Vermieter-Formular (Kontakt-/Bewertungsfelder, Notizen, International/Provision/Ranking/Erfahrung).
- Pending Leads Modal übernimmt gleiche Felder; API /api/listing-requests speichert Zusatzinformationen und nutzt sie beim automatischen Partner-Anlegen.
- Fahrzeug-Suche zeigt löschen-Icons je Zeile; Inventar-Einträge führen Street/PLZ.
- Neuer Custom-Standort-Flow: Geocode-Endpunkt + Filter-Button (Stadt → „Custom Standort“) mit Radius-Suche auch für Orte außerhalb der Standardlisten.

---

## 1. Überblick

- **Framework**: Next.js 14 (App Router) + TypeScript  
- **UI**: Chakra UI, React Leaflet für Karte  
- **Datenquelle**: Google Sheets (Service Account)  
- **Authentifizierung**: Basic Auth über `middleware.ts`

---

## 2. Google-Sheet-Struktur (verpflichtende Spalten)

| Tab                | Pflichtspalten                                                                                                    | Hinweise                                                                                                      |
|--------------------|--------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| `owners`           | `vermieter_name`, `land`, `region` (=Bundesland), `stadt`, `adresse`, optionale Kontaktdaten                      | `letzte_aenderung` wird beim Anlegen gefüllt                                                                  |
| `inventory`        | `vermieter_name`, `fahrzeug_label`, `fahrzeugtyp`, `land`, `stadt`, `region`, `listed_at`, `status`, `latitude`, `longitude`, `plz`, `strasse`, `letzte_aenderung` | Koordinaten zwingend für Radius-Suche; Street/PLZ werden jetzt gepflegt                                       |
| `inquiries`        | `datum`, `fahrzeugtyp`, `land`, `stadt`, `anfragen`, `mieten`                                                      | unverändert                                                                                                   |
| `missing_inventory`| `stadt`, `region` (=Bundesland), `fahrzeugtyp`, `anzahl_fehlend`, `prio`, `kommentar`, `land`                      | Bundesland-Spalte für Filter/Anzeige                                                                          |
| `listing_requests` | `datum`, `kanal`, `region`, `vermieter_name`, `fahrzeug_label`, `manufacturer`, `fahrzeugtyp`, `stadt`, `land`, `strasse`, `plz`, `status`, `status_updated_at`, `kommentar` | `status` initial „Angefragt“, Status-Buttons aktualisieren Zeile & Zeitstempel                                |

> **Hinweis:** Bei „Vertrag unterschrieben“ erzeugt das Backend automatisch einen Vermieter (owners/inventory). Leads mit Status „Vertrag unterschrieben“ oder „Abgelehnt“ bleiben noch 7 Tage sichtbar (zum Nachfassen) und verschwinden danach aus der Tabelle.

---

## 3. Wichtige Features & Logik

### 3.1 Filter & Anzeige
- Bezeichnungen „Region“ → „Bundesland“ in allen Komponenten.
- Fahrzeugkarte & Tabellen zeigen Bundesland-Spalte; fehlende Fahrzeuge werden summiert (nicht nur Anzahl Zeilen).
- Radiusfilter nutzt Koordinaten aus Inventory oder `resolveCityCoordinates` (funktioniert auch ohne Länderfilter).

### 3.2 Lead-Pipeline (`listing_requests`)
- Lead-Modal („Akquise Vermieter“) sammelt: Datum, Kanal, Land, **Bundesland**, Stadt, Straße, PLZ, Fahrzeuge (Mehrfach).
- Tabelle „Leads in Verhandlung“ zeigt Status-Button (Farben: Gelb/Orange/Grün/Rot).
- `PATCH /api/listing-requests` aktualisiert Status, Straße/PLZ, Kommentar und Zeitstempel.
- Status „Vertrag unterschrieben“ legt automatisch Vermieter + Fahrzeuge an (gleiche Logik wie `/api/partners`).
- Status „Vertrag unterschrieben“ / „Abgelehnt“ → Leads bleiben 7 Tage sichtbar, verschwinden danach automatisch.

### 3.3 Fehlende Fahrzeuge
- Bedarf-Modal (Straße/PLZ optional) schreibt in `missing_inventory`.
- Tabelle & KPI-Karte zeigen Summe `anzahl_fehlend`.

---

## 4. Backend-Routen

| Route                         | Methode | Beschreibung                                                                                                   |
|------------------------------|---------|-----------------------------------------------------------------------------------------------------------------|
| `/api/kpis`                  | GET     | Aggregiert Daten aus allen Tabs → `KpiPayload`. Dynamisch (wegen Query-Params).                                |
| `/api/partners`              | POST    | Legt Vermieter + Fahrzeug(e) an, inkl. Geocodierung & Sheet-Mapping.                                           |
| `/api/missing-inventory`     | POST    | Fügt Bedarfseinträge ein.                                                                                      |
| `/api/listing-requests`      | POST    | Erstellt einen Lead (inkl. Status).                                                                            |
| `/api/listing-requests`      | PATCH   | Aktualisiert Status + Daten, optional `createPartner=true` → Vermieter anlegen.                                |

Hilfsfunktionen:
- `lib/partnerSheet.ts` kapselt Header-Mapping für owner/inventory.
- `lib/leadStatus.ts` hält Statuswerte und Farben.
- `lib/googleSheets.ts` enthält `appendRows`, `updateRow`, `getHeaderRow`, `getSheetMatrix`.

---

## 5. Environment-Variablen

Pflicht (`.env.local`, `.env.production`, Vercel):
```
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
BASIC_AUTH_USER=...
BASIC_AUTH_PASSWORD=...
```

Optionale Settings:
- `GEOCODER_USER_AGENT`, `GEOCODER_CONTACT_EMAIL`
- `GOOGLE_SHEET_RANGE_*` (Inventory/Owners/Missing/Listing) für Limits

---

## 6. Sicherheit & Auth

- Dashboard geschützt via Basic Auth (`middleware.ts`); ohne gesetzte Env-Variablen verweigert die Middleware jeden Request.
- Service Account braucht Bearbeiterrechte für das Google-Sheet.
- Neue Credentials nach jeder GitHub-Secrets-Warnung erzeugen und in `.env`/Vercel aktualisieren.

---

## 7. Build & Deployment

Lokales Testen:
```bash
npm install
npm install --save-dev @types/leaflet
npm run build
npm run dev
```

Deployment:
1. Änderungen committen (`npm run build` vorher lokal ausführen).  
2. `git push` → Vercel baut automatisch.  
3. Bei Problemen alte Deployment-Version in Vercel „Promoten“.  
4. Docker-Alternative (`deployment/docker-compose.yml`) vorhanden.

---

## 8. Nächste Schritte / TODOs

- Koordinaten für alle Städte sauber pflegen (Radius).
- Weitere KPIs oder Filter (z. B. Fahrzeugstatus) evaluieren.
- Monitoring/Logging für API-Fehler (Geocoder, Sheets).
- Eventuell Zero-Trust-Absicherung via Cloudflare Access ergänzen.

---

**Kontakt-Notizen**  
Bekannte Painpoints: Umkreissuche → nur zuverlässig mit Koordinaten; Vercel Basic Auth nicht gratis → eigene Middleware implementiert.  
Merke für zukünftige Sessions: Neue Sheets-Spalten oder Workflows immer hier dokumentieren und README updaten.
