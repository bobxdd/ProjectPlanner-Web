# Project Planner Web

Dieses Repository ist für die eigenständige Browser-Version des Project Planners vorgesehen. Die bestehenden Quiz-Repositories bleiben unangetastet.

## Verbindliches Ziel

- Dieselbe Oberfläche und dieselben Planner-Funktionen wie in der Windows-App (Projektübersicht, Bereiche, Phasen, Aufgaben, Fahrplan, Notizen, Dateien und Orbit-Ansicht, Suche, Papierkorb, Import/Export usw.).
- **Einzige geplante Funktionsausnahme:** die QR-Code-Funktion entfällt.
- Kontoerstellung und Login **nur mit Benutzername + Passwort**, ohne Pflicht-E-Mail.
- Benutzerbezogene private Projektdaten und Dateianhänge; gemeinsames Arbeiten später mit expliziten Freigaben.
- GitHub Pages als statisches Frontend; Supabase für Daten und eine geschützte serverseitige Konto-API.

## Wichtiger Implementierungsstand

Das Repository enthält zunächst nur diese Projektbeschreibung. Eine entwicklungsfähige Version mit Originaloberfläche und dem neuen Username-Login ist als Testpaket im Chat vorhanden, aber **hier noch nicht hochgeladen**. Eine betriebsbereite Website ist damit nicht veröffentlicht.

Die vorgeschlagene Auth-Implementierung verwendet keine erfundenen E-Mail-Adressen, sondern eigene serverseitige Postgres-RPCs mit bcrypt-Passwort-Hashes, Session-Token, einmaligen Recovery-Codes und geschützter Datei-API. Die SQL-Skripte und Edge Function müssen vor einer echten Registrierung in Supabase installiert und live getestet werden. Eine GitHub-Supabase-Verknüpfung allein übernimmt diese Einrichtung nicht.

Kein produktiver Einsatz mit vertraulichen Projektdaten, bis die echte Konto-/Datei-/RLS-Prüfung, Browser-Abnahme und die 1:1-Funktionsprüfung bestanden sind.

Stand: 18. November 2026.
