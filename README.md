# Project Planner Web – private Zwei-Personen-Umgebung

**Stand: 19. November 2026 — Backend bereitgestellt, GitHub Pages noch nicht aktiviert.**
**Noch keine Produktivfreigabe und keine echten Benutzerkonten.**

Diese Webversion verwendet die originale Project-Planner-Oberfläche aus dem
Windows-Projekt (ohne QR-Funktion). Sie ist **keine öffentliche Projektplattform**:
Es gibt genau **einen gemeinsamen Arbeitsbereich** für **maximal zwei Personen**
mit getrennten persönlichen Benutzernamen und Passwörtern — **ohne E-Mail**.

## Was bereits fertiggestellt ist

- Supabase-Datenbank installiert: Konto-, Session- und Einladungsverwaltung.
- Harte PostgreSQL-Grenze von **zwei Konten**, auch bei gleichzeitiger Registrierung.
- Harte PostgreSQL-Grenze von **zwei persönlichen Einladungen** (Slot 1 und 2).
- Geschützter gemeinsamer Projektzustand mit optimistischer Revisionskontrolle
  (Änderungen werden nicht still überschrieben).
- Privater Storage-Bucket und gemeinsame Dateien für beide Benutzer.
- Zwei aktive Supabase Edge Functions: `planner-auth` und `planner-files`.
- GitHub-Weboberfläche mit Einladungscode, Benutzernamen und Passwort;
  Browser enthält nur den offiziellen öffentlichen Supabase Publishable Key.
- Vorhandener automatischer 2,5-Sekunden-Abgleich der Planner-Oberfläche
  mit Konflikterkennung und Vorsicht bei gerade geöffneten Eingaben.
- Automatisierte Account-, Client-, Asset- und Zwei-Personen-Strukturtests.

## Noch nicht abgeschlossen

1. **GitHub Pages muss im Repository manuell einmalig über Settings → Pages →
   GitHub Actions eingeschaltet werden.** Der automatische Versuch scheiterte
   an GitHubs „Resource not accessible by integration“.
2. Die zwei Einmal-Einladungscodes müssen sicher im Supabase SQL Editor ausgegeben
   und von den beiden Personen verwendet werden. Zurzeit: **0 Konten, 0 Codes**.
3. Browser-End-to-End-Test in zwei echten Sitzungen inklusive Uploads,
   Anmeldung, gemeinsamer Bearbeitung und Konflikten.
4. Abschließende Prüfung vor einem Import vertraulicher Desktop-Projekte.

**Vollständige praktische Anleitung:** [SETUP_ZWEI_PERSONEN.md](SETUP_ZWEI_PERSONEN.md).

**Repository:** https://github.com/bobxdd/ProjectPlanner-Web

**Geplante Website:** https://bobxdd.github.io/ProjectPlanner-Web/

## Sicherheit und Sichtbarkeit

GitHub Pages liefert öffentliche HTML/CSS/JavaScript-Dateien aus, auch wenn
ein unterstützter GitHub-Plan privaten Quellcode im Repository erlaubt.
Nur die **Daten** werden serverseitig abgeschottet; die Anmeldeseite selbst ist
keine private URL. Der Schutz erfolgt nicht über versteckte Buttons oder
geheime Frontend-Schlüssel, sondern durch Einladung, Sitzung, RLS und
gesperrte Datenbankfunktionen.

Datenbank-Installationsfolge für ein neues Projekt:
`supabase/001_username_accounts.sql`,
`supabase/003_two_person_workspace.sql`,
`supabase/004_exactly_two_invitations.sql`.
`supabase/002_selfcheck.sql` liefert ergänzende Strukturprüfungen.

**Keine vertraulichen Daten importieren, bevor die echte Zwei-Personen-Abnahme erfolgt ist.**
