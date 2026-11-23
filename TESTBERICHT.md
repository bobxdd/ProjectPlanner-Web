# Project Planner Web – Auditstand 19.11.2026

## Tatsächlich durchgeführt

- Supabase PostgreSQL Basisschema, Einladungs- und gemeinsame Workspace-Migrationen installiert.
- SQL-Prüfung: keine Konten und keine Einladungen, exakt ein mögliches Shared Workspace ID,
  RLS aktiviert, `anon` und `authenticated` haben keine direkten Leserechte
  auf den gemeinsamen Projektstand und keine Ausführungsrechte auf `planner_register`.
- Die Datenbank besitzt einen Trigger mit Transaktions-Lock gegen ein drittes Konto.
- Einladungen werden auf genau die beiden nummerierten Plätze 1 und 2 begrenzt.
- Der Storage-Bucket `planner-files` ist privat; keine Storage-Objekt-RLS-Policies
  erlauben einen direkten öffentlichen Dateizugriff.
- Supabase Edge Functions `planner-auth` und `planner-files` sind aktiv; der
  installierte Funktionscode wurde erneut abgefragt und mit GitHub abgeglichen.
- Webclient verwendet URL + Publishable Key (keine Secrets), Einladungscode bei der Registrierung,
  gemeinsamen Projektzustand und gemeinsamen Dateipfad.
- GitHub Actions: **31 Tests bestanden, 0 fehlgeschlagen**; JavaScript-Syntax, Frontend-Assets
  und Publishable-Key-Konfiguration bestanden.
- Der GitHub-Actions-Gesamtjob scheitert **nur** bei der erstmaligen Pages-Aktivierung:
  `Create Pages site failed: Resource not accessible by integration`. Die einmalige
  manuelle Aktion unter GitHub Settings → Pages ist noch erforderlich.

## Vor der Produktionsfreigabe offen

1. GitHub Pages über GitHub-Repository-Einstellungen aktivieren und tatsächlich veröffentlichen.
2. Exakt zwei Einladungscodes im SQL Editor ausstellen. Noch keine echten Konten vorhanden.
3. Echte Browser-E2E-Tests mit zwei Personen: Login/Logout, Recovery, Upload/Download/Delete,
   Aufgabenänderungen, Polling, Konflikt bei parallelen Änderungen, Datenimport/Export.
4. Laufzeitprüfung der Edge-Function-Umgebungsvariablen und HTTP-Antworten;
   `ACTIVE` allein beweist noch keinen erfolgreich abgeschlossenen Login.
5. Sicherheitsprüfung des individuellen Authentifizierungsdienstes (Rate-Limiting,
   Account-Lockout-Denial-of-Service, Schlüsselrotation, Session-Storage).
6. Getrennten Origin für diesen privaten Planner bevorzugen: Unter `bobxdd.github.io`
   teilen andere Projektseiten denselben Browser-Origin. Ein Skriptfehler oder XSS
   in einer anderen GitHub-Pages-App könnte dieselbe `sessionStorage`-Origin erreichen.
   Für sensible Daten ist ein **eigener Hostname** deutlich besser.
7. Automatischer Polling-Abgleich existiert, aber zuverlässige Offline-Konfliktzusammenführung
   und nachgewiesene vollständige 1:1-Funktionsparität zur Desktop-App fehlen.

## Sicherheitseinordnung

Kein öffentlich zugänglicher Datenbank-Lesezugriff gefunden. Die Supabase Security Advisors
melden `RLS Enabled No Policy` als INFO; das ist hier **beabsichtigt**, weil Browserrollen
keine direkten Tabellenrechte erhalten. Der Admin-Client innerhalb der Edge Function
validiert private Sessiontokens per eingeschränkter Server-RPC.

Keine Produktivfreigabe, kein Penetrationstest, noch keine echten Two-User-E2E-Belege.
**Vorher keine privaten Projektdateien importieren.**

Anleitung: [SETUP_ZWEI_PERSONEN.md](SETUP_ZWEI_PERSONEN.md)

## Update 23.11.2026 – Vollbild-Dateiansicht

**Live veröffentlicht über GitHub Pages**, Job/Run:
https://github.com/bobxdd/ProjectPlanner-Web/actions/runs/45234452286
Commit: `2f72462f78e66ab8f49a5a2330db9f3eac2e11d5`.

- Dateien öffnen standardmäßig in einer bildschirmfüllenden Ansicht im Planner.
  Dateiübersicht, Bereichsdateien, Aufgabenanhänge, Startseiten-Dateiwidgets,
  Suchergebnisse und Rechtsklick-Menü auf die neue Ansicht umgestellt.
- Escape (nativer modaler HTML-Dialog) und X schließen die Ansicht; Fokus kehrt
  zum Auslöser zurück. Separater Button **In neuem Tab öffnen** und **Herunterladen**
  bleiben erhalten.
- Bildzoom, Browser-PDF-Anzeige nach `%PDF-`-Header-Prüfung, sichere reine
  Textanzeige (auch CSV/JSON/Markdown/HTML/SVG als NICHT ausgeführter Text),
  native Audio-/Videoplayer mit Browserformat-Unterstützung.
- Nicht nativ anzeigbare Dateien (DOCX, XLSX, PPTX, ZIP usw.) werden bewusst
  nicht an unbekannte Cloud-Konverter weitergeleitet; Download/neuer Tab.
- Datei-Bytes werden über bestehende private `PlannerCloud.fileBlob`-Abfragen
  geladen. Temporäre Blob-URLs werden beim Schließen widerrufen.
- Kein Schema- oder Edge-Function-Upgrade notwendig. Unverändert: zwei Konten,
  genau ein gemeinsamer Projektstand, optimistischer Revisionsvergleich,
  gesicherter Supabase-Speicher.
- Abschluss-SQL-Audit: **2 Konten, 2 Einladungen, 1 Workspace, 8 gespeicherte
  Dateien, privater Bucket, kein direkter Anon-Tabellen-Lesezugriff**.
- **37/37** automatische Tests bestanden. JS-Syntax, statische Assets und
  GitHub-Pages-Deployment erfolgreich.

**Abnahmegrenze:** Noch kein realer Browser-Interaktionstest mit angemeldeter
Sitzung und euren privaten Bildern/PDFs/Textdateien. Bitte im Browser prüfen,
dass die Darstellung, Escape/X, Zoom sowie „In neuem Tab öffnen“ bei euren
tatsächlichen Dateien und im mobilen Layout funktionieren. Manche Browser
unterstützen bestimmte Audio-/Videocodecs und PDF-Einbettung nicht; dann
steht weiterhin der Originaldownload zur Verfügung.

Technische Referenzen:
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- https://supabase.com/docs/guides/storage/buckets/fundamentals

## Nachbesserung 23.11.2026 – tatsächlicher Linksklick-Fehler im 3D-Datei-Hub

**Ursache:** Der vorherige Fix hatte `docs/orbit.js` übersehen.
Dort stoppte ein früher `document.addEventListener('click', ..., true)`-Handler
die Event-Weitergabe und öffnete die ausgewählte Datei weiterhin mit
`window.open(fileURL(doc), '_blank', 'noopener')`. Zusätzlich zeigte der
Button „Datei vollständig öffnen“ auf einen `<a target="_blank">`-Link.
Deshalb waren die vorherigen grünen Tests unzureichend und die Anwenderfehler
reproduzierbar.

**Fix:**
- Die aktive und jede andere Dateikarte im 3D-Stapel öffnen jetzt per
  primärem Linksklick immer `window.PPFileViewer.open(doc.id)`; Galerieauswahl
  wird bei Bedarf vorher aktualisiert.
- Der bisherige externe Öffnen-Link ist jetzt ein expliziter
  `data-file-viewer`-Vollbild-Button. Kein `window.open` und keine
  `target="_blank"`-Dateiöffnung mehr in `docs/orbit.js`.
- Die PDF-Kachel nutzt ein rein dekoratives Vorschausymbol anstelle eines
  eingebetteten PDF-Iframes, um Ereignisverschlucken zu vermeiden.
- Rechte Maustaste öffnet das Datei-Kontextmenü; **„In neuem Tab öffnen“**
  steht dort jetzt an erster Stelle.
- Escape schließt den Vollbild-Dateibetrachter vor der 3D-Galerie-Navigation
  (`quality-v28.js`).
- Versionsparameter an den geänderten JavaScript- und CSS-Assets im
  `planner.html` erzwingen das Laden der neuen Handler nach dem Reload.

**Regressionstests:** Zusätzlich zu den bestehenden Dateibetrachter-Tests
werden die realen Capture-Event-Handler von `docs/orbit.js` und
`docs/file-context.js` in Dokument-Reihenfolge ausgeführt. Geprüft werden
Linksklick auf die ausgewählte und nicht ausgewählte Datei, Rechtsklick mit
Menüoption „In neuem Tab öffnen“, rechte Maustaste ohne Dateiaufruf,
CTA-Element, Escape-Vorrang und Cache-Versionierung.

Der Dateibetrachter verändert keine gemeinsamen Projektdaten. **Kein
Supabase-Schema-, Auth- oder Storage-Deployment notwendig**. Der reale
2-Personen-Browser-Test mit privaten Dateien bleibt als Abnahmeaufgabe offen.
