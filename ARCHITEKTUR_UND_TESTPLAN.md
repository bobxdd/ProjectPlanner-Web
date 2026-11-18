# Project Planner Web – Architektur und Freigabekriterien

**Stand: 19.11.2026. Entwicklungsstand; keine produktive Freigabe.**

## Was sich vor dem ursprünglichen Plan ändern muss

Die Webversion speichert momentan **einen großen JSON-Projektzustand pro Konto**. Für die gewünschte Zusammenarbeit reicht das nicht: Zwei getrennte Konten würden nicht automatisch denselben Projektstand bearbeiten. Eine zentrale Projektstruktur mit Mitgliedern muss zuerst entstehen.

## 1. Anmeldung ohne E-Mail – sichere Grundlage

- Gleiche Benutzeroberfläche mit Benutzername und Passwort, ohne Pflicht-E-Mail.
- Nur eine explizit erlaubte Edge-Function darf die Konto- und Datenbankfunktionen serverseitig aufrufen. Die Datenbankgrants an anonyme Browserkonten bleiben entzogen.
- Keine geheimen Supabase-Keys in GitHub Pages. Secret Keys nur in Supabase.
- Bcrypt: 12 Zeichen Mindestlänge, 72 UTF-8-Bytes Höchstlänge; Server und Browser kontrollieren dieselbe Grenze.
- Recovery-Code und Sessionwiderruf testen.
- Die erste SQL-Anfragebegrenzung ist noch **kein vollständiger Bot-Schutz**. Vor öffentlicher Registrierung zusätzlich CAPTCHA, vertrauenswürdige Netzwerk-Ratelimits und Missbrauchstests einbauen.
- Eigene Domain/Subdomain für private Daten empfehlen: andere Repository-Seiten auf bobxdd.github.io nutzen dieselbe Origin.

## 2. Richtige Projektverwaltung für zwei Nutzer

- Ein autoritativer Datenbestand pro **Top-Level-Projekt** statt ganzer Kopien je Benutzer.
- Projekt-ID, Besitzer, Rollen Besitzer/Bearbeiter/Leser, Einladungen mit Ablauf und Widerruf, Protokoll wichtiger Rechteänderungen.
- Revisionen und idempotente Änderungsoperationen, keine stillen Überschreibungen gleichzeitiger Änderungen.
- Dateianhänge projektbezogen, signierte Links nur nach aktueller Mitgliedschaftsprüfung.
- Textkonflikte ausdrücklich auflösen bzw. geprüften CRDT-Ansatz evaluieren; separate Offline-Änderungen sicher nachholen.

## 3. Originaloberfläche und Sicherheitstests

Die Originalfunktionen müssen im Browser nachweislich funktionieren: Projekte, Bereiche, Phasen, Aufgaben, 3D-Karten, Fahrplan/Drag & Drop, Orbit, Datei-Hub, Skizzen, Suche, Papierkorb, Einstellungen, Status, Import/Export. Die einzige gewünschte Ausnahme sind QR-Codes.

Testen: zwei echte Konten und deren Datentrennung, Live-Kollaboration, offline/online, Session-Ablauf, Rollen- und Einladungswiderruf, fehlgeschlagene Dateiübertragung, ZIP-Manifeste/Prüfsummen, Wiederherstellung eines Backups in einem neuen Konto und Browser auf Windows/Tablet/Handy.

## Noch ausstehend

Die neue Edge-Auth ist als Quellcode vorhanden, aber **nicht live installiert oder Ende-zu-Ende getestet**. Die Supabase-SQL-Struktur enthält noch das alte Konto-JSON-Modell; gemeinsame Projektbearbeitung fehlt. GitHub Pages ist nicht als funktionsfähig bestätigt. Zuerst Sicherheits- und Integrationstests, danach öffentliches Deployment.
