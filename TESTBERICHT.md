# Project Planner Web V3 – Prüfung 18.11.2026

- Auf V2-Webprojekt aufgebaut; originaler Planner-`app.js`, Original-CSS, 3D-/Orbit-Module, Annotationsmodule, File-Hub-Module übernommen, nur Web-Anmeldung und Datenadapter geändert.
- Anmeldung: Benutzername/Passwort ohne Pflicht-E-Mail, Zufalls-Session-Token, Recovery-Code. SQL-Schema mit bcrypt, Tokenhash, RLS ohne direkte Tabellengrants, optimistischem CAS-Speichern. Edge-Function zur Autorisierung von private Storage Upload/Download/Remove Signaturen.
- JavaScript-Kontotests, Browserform-Simulation, Asset-Checks und Syntaxprüfungen: siehe `QA_RUN.txt`.
- Wichtig: Postgres-SQL **nicht gegen einen echten Supabase-Server ausgeführt**, keine Security-Pentest-Abnahme. Edge-Funktion **nicht deployed**. Keine reellen Login-Erfolge belegt; weder GitHub Pages noch Supabase miteinander live verifiziert.
- Kein vollständiges End-to-End für 1:1-Funktionalität, besonders keine echten Zwei-Konten-Tests, keine Einladung/Live-Zusammenarbeit und kein reales Datei- oder Backup-Recovery. Browser-E2E hier nicht zugänglich.
- Restliche Risiken: Rate-Limiting/CAPTCHA für öffentliche Registrierung, Benutzername-Enumeration per Timing, Account-Lockout-DoS, Secrets in Browser-Sitzung und Shared-Origin-Risiko anderer Anwendungen unter `bobxdd.github.io`, Dateiupload-Orphans, Größe des Storage-Free-Limits, fehlende Live-Validierung aller RPC-SQL-Funktionen.
