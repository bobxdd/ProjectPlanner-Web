# Project Planner Web V3 – Benutzername und Passwort, keine E-Mail

**Stand:** Entwicklungs-/Testpaket vom 18. November 2026. Nur die automatische Prüfung der Browser-Login-Logik und der Original-Assets wurde in dieser Umgebung ausgeführt. **Kein produktiver Release, keine End-to-End-Prüfung gegen dein Supabase-Projekt und keine nachgewiesene 1:1-Funktionsparität.**

## Ziel

Ein separates GitHub-Pages-Frontend unter `https://bobxdd.github.io/ProjectPlanner-Web/`, mit derselben übernommenen Project-Planner-Oberfläche wie Desktop, **ohne QR-Code**. Eine E-Mail-Adresse ist für ein Konto nicht erforderlich. Anmelden und Registrieren finden in der Weboberfläche statt; sichere Passwortprüfung und Projekt-Datenspeicherung erfolgen auf dem Supabase-Server.

## Sicherheit und Konten

- Benutzername: 3–24 Zeichen, beginnt mit Buchstabe, danach a-z, 0-9, Unterstrich; Groß-/Kleinschreibung wird vereinheitlicht.
- Passwort: 12–256 Zeichen; `pgcrypto` bcrypt mit Kostenfaktor 12 wird **serverseitig** verwendet. Kein Passwort oder Passwort-Hash in GitHub Pages.
- 256-Bit-zufälliger Session-Token, nur dessen SHA-256-Hash in der Datenbank, 7 Tage Gültigkeit; Browser speichert den Token nur für die laufende Browser-Sitzung in `sessionStorage`.
- 192-Bit-einmaliger Wiederherstellungscode bei Registrierung. Der Klartext wird **nur einmal** angezeigt; in Supabase wird nur sein SHA-256-Hash gespeichert. Bei Verwendung wird der alte Code ungültig, ein neuer erscheint, und alle alten Anmeldesitzungen werden widerrufen.
- Fünf falsche Passwort- oder Recovery-Versuche sperren das jeweilige Konto vorübergehend für 15 Minuten. **Nicht** ausreichend gegen systematischen Bot-Missbrauch; zusätzlich Rate Limiting und CAPTCHA vor öffentlicher Freigabe ergänzen.
- Die Projektdatenbank ist nicht öffentlich: Postgres-RLS aktiviert; **keine** direkten Lese-/Schreibrechte für `anon` oder `authenticated`. Zugriffe nur über `SECURITY DEFINER`-RPC, die Session-Token validieren, und optimistische Revisionen gegen Überschreiben.
- Datei-Uploads und private Download-Links benötigen die über den Session-Token autorisierte Supabase Edge Function `planner-files`. Der `SUPABASE_SERVICE_ROLE_KEY` steht ausschließlich serverseitig in Supabase – **niemals** in GitHub oder Client-Konfiguration.
- Die Anmeldung benötigt **keine erfundenen E-Mail-Adressen**. Stattdessen ist dies ein bewusst eigener Username-Auth-Dienst. Er muss besonders gründlich auditiert werden, bevor echte sensible Projekte importiert werden.

## GitHub-Website bereitstellen

1. Repository: `https://github.com/bobxdd/ProjectPlanner-Web` (separat vom Quiz).
2. Den **Inhalt dieses Paket-Ordners** ins Repository-Root übernehmen: `docs/`, `supabase/`, `.github/`, `scripts/`, `tests/`, diese Anleitung. Die `.github/workflows/pages.yml` nimmt nur `docs/` in die öffentlich sichtbare Website auf.
3. In Repository **Settings → Secrets and variables → Actions → Variables** zwei Variablen für den Website-Build anlegen: `SUPABASE_URL` (`https://...supabase.co`) und `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). Der Workflow verweigert absichtlich die Veröffentlichung, wenn sie fehlen oder wie ein Secret aussehen.
4. In **Settings → Pages → Build and deployment** GitHub Actions auswählen. Push auf `main` löst statische Tests und dann das Pages-Deployment aus.
5. Für die Öffentlichkeit: Die vollständigen Quelldateien und Styles sind weiterhin einsehbar, private Projekte **nicht**. Gib in GitHub **keine Zugangsdaten, Passwort-Hashes oder Secret Keys** ein.

## Supabase einrichten (manuell, erforderlich)

1. Ein **eigenes leeres Supabase-Projekt** verwenden. Eine bloße GitHub-Verknüpfung erzeugt nicht automatisch Datenbankfunktionen, Tabellen oder Edge Functions.
2. Im Supabase **SQL Editor** `supabase/001_username_accounts.sql` ausführen. Danach `supabase/002_selfcheck.sql` ausführen; der Berechtigungsteil muss für `anon`/`authenticated` **null Zeilen** anzeigen. Diese Migration ist für einen **frischen** Datenbestand gedacht. Bei bereits mit V2 angelegten Tabellen zunächst eine echte Migration ausarbeiten; nicht blind überschreiben.
3. `supabase/functions/planner-files/index.ts` als Supabase Edge Function deployen, gemäß `supabase/config.toml` mit `verify_jwt=false`; hier erfolgt die eigene Prüfung per 256-Bit-Session-Token. Auf der lokalen CLI z. B. `supabase functions deploy planner-files --no-verify-jwt --project-ref <DEIN_PROJECT_REF>`.
4. Für den Edge Function-Dienst `PLANNER_ALLOWED_ORIGIN=https://bobxdd.github.io` einstellen. Supabase stellt `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` serverseitig bereit. Letzteren NIEMALS im Browser verwenden.
5. In Supabase Storage kontrollieren: Bucket `planner-files`, **nicht öffentlich**, 50 MB je Datei auf Free-Projekten.
6. **Mit zwei getrennten Testkonten** testen, ob die jeweiligen Projekte und Dateien strikt getrennt bleiben. Auch direkt über PostgREST auf die privaten Tabellen zugreifen und das erwartete Verbot kontrollieren.

## Was nicht fertig ist

- Automatische Deployment-Verknüpfung zur konkreten Supabase-Datenbank; keine Supabase-Projektkennung und kein SQL-/Edge-Function-Adminzugriff verfügbar.
- Funktionstest mit echtem Browser, Live-Datenbank und 2 Geräten. Dieser Stand enthält nur Unit-Tests und statische Codeprüfungen.
- **Gemeinsame Bearbeitung zwischen unterschiedlichen Accounts**, Einladungen, Rollen, Live-Cursor, zuverlässige Offline-Synchronisierung, vollständige 1:1-Browserabnahme und größere Dateien über das Free-Limit. Originalmodule sind übernommen, aber nicht alle End-to-End getestet.
- Auth-Rate-Limiting nach IP, CAPTCHA, Wiederherstellung bei Verlust sowohl des Passworts als auch des Codes. Deshalb noch keine öffentliche Produktivfreigabe.
- Die bestehende Windows-EXE ist nicht automatisch mit diesen Webkonten synchronisiert.

## Prüfen

```
node --test tests/*.test.mjs
find docs -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
python3 tests/check_assets.py
```
