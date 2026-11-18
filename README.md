# Project Planner Web

**Stand: 18. November 2026 — Entwickler-Beta, nicht produktiv freigegeben**

Das neue separate Repository enthält die auf HTML/CSS/JavaScript basierende Original-Oberfläche des Windows-Project-Planners und einen Web-Datenadapter. **QR-Codes sind bewusst ausgenommen.** Die Desktop-App und die beiden Quiz-Repositories bleiben unangetastet.

## Benutzerkonto ohne E-Mail

- Konto erstellen: Benutzername (3–24 Zeichen), Passwort (mind. 12 Zeichen) und Wiederholung.
- Login im Project Planner mit Benutzername + Passwort; keine E-Mail-Adresse und keine externe Login-Seite.
- Einmalig angezeigter Wiederherstellungscode ersetzt einen E-Mail-Reset. Code unbedingt sicher aufbewahren.
- Passwörter und Sitzungen werden serverseitig durch die SQL-RPCs in `supabase/001_username_accounts.sql` verwaltet (bcrypt / SHA-256-Sessiontokenhashes).
- Supabase Edge Function `planner-files` ist für private Upload- und Download-Freigaben vorgesehen.

**Wichtig:** Nur GitHub Pages kann weder Benutzerkonten noch eine sichere Datenbank betreiben. Eine GitHub-/Supabase-Verknüpfung ist keine automatische Installation der SQL-Funktionen.

## Verzeichnis

- `docs/`: originale Planner-Frontend-Dateien samt neuem Benutzername-Login.
- `supabase/`: SQL-Migration, RLS-/Berechtigungsprüfung und private Datei-Edge-Function.
- `tests/`: automatisierte Konten- und Asset-Tests.
- `.github/workflows/pages.yml`: testet die Dateien und publiziert `docs/`, sobald die öffentliche Supabase-Projektkonfiguration bereitsteht.
- `00_START_HIER.md`: vollständige Einrichtungs- und Sicherheitsanleitung.
- `TESTBERICHT.md`: getestete und noch offene Funktionen.

## Was vor einer echten Veröffentlichung noch fehlt

1. Eigene Supabase-Verbindung autorisieren und SQL-Migration **in einem frischen Projekt** ausführen.
2. Edge Function `planner-files` installieren, Zugriffsrechte und private Storage-Bucket testen.
3. GitHub-Actions-Variablen `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` konfigurieren (nur **öffentliche** Werte). Der Workflow verweigert absichtlich ein Deployment ohne diese Angaben.
4. In GitHub Settings → Pages **GitHub Actions** auswählen.
5. Den vollständigen Browserablauf mit zwei echten Testkonten und echten Dateien prüfen, bevor private Daten importiert werden.

Die erwartete Adresse ist `https://bobxdd.github.io/ProjectPlanner-Web/`, **eine funktionierende Live-Seite ist noch nicht bestätigt**.

## Qualität und Einschränkungen

15 JavaScript-Kontotests, Asset-Checks und Syntaxprüfungen bestanden. **Keine** Live-Supabase-Tests, kein vollständiger Browser-E2E-Test, keine echte Zwei-Konten-Abnahme oder nachgewiesene 1:1-Funktionsparität. Gemeinsame Bearbeitung über verschiedene Konten und zuverlässige Offline-Synchronisierung sind noch nicht fertig. Die öffentliche Registrierung benötigt vor Produktivbetrieb weiteres Missbrauchs-/Rate-Limiting.

**Keine privaten Projekte importieren, bevor Backend und Zugriffsregeln live geprüft wurden.**

## Sicherheitsvorbereitung (19.11.2026)

Die Benutzername-Konto-RPCs werden auf **serverseitige Aufrufe** beschränkt. Die Client-Passwortprüfung berücksichtigt nun bcrypts 72-UTF-8-Byte-Grenze. Die nächste Änderung ergänzt eine vorgeschaltete Edge-Function; **vor ihrer Installation funktionieren diese neuen RPC-Berechtigungen nicht als Live-Anmeldung**. Die Website ist derzeit ohnehin nicht betriebsbereit. Bis zum geprüften Backend keine privaten Projektdaten importieren.
