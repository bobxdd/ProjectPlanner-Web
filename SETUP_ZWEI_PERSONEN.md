# Project Planner – geschlossene Nutzung durch genau zwei Personen

## Stand 19. November 2026

GitHub: https://github.com/bobxdd/ProjectPlanner-Web
Vorgesehene Website: https://bobxdd.github.io/ProjectPlanner-Web/
Supabase-Projekt: `bbwmefgcqdrzutgyjlmb`

Das Backend ist installiert. Die Tabellen `planner_accounts`, `planner_invites`,
`planner_sessions` und `planner_shared_state` haben RLS aktiviert und keine
Direktberechtigungen für Browserrollen. `planner-files` ist ein privater Bucket.
Die Edge Functions `planner-auth` und `planner-files` sind bereitgestellt.

**Es sind noch keine Benutzerkonten und keine Einladungscodes angelegt.**
Die Website wurde noch nicht erfolgreich veröffentlicht: GitHub Pages muss
einmalig mit Repository-Administratorrechten aktiviert werden. Der Actions-Token
hat hierfür nicht genügend Rechte. JavaScript-, UI- und Asset-Tests sind erfolgreich.

## 1. GitHub Pages einmalig aktivieren

1. Öffne https://github.com/bobxdd/ProjectPlanner-Web/settings/pages
2. Unter **Build and deployment → Source** wähle **GitHub Actions**.
3. Speichere. Falls die Einstellung bereits so gesetzt ist, kontrolliere, ob Pages aktiv ist.
4. Öffne **Actions**, wähle den letzten fehlgeschlagenen Lauf und klicke **Re-run jobs**.
   Alternativ löst ein neuer Commit auf `main` den Workflow erneut aus.
5. Nur wenn der Job `deploy` mit Erfolg endet und die Seite wirklich aufrufbar ist,
   gilt die Veröffentlichung als abgeschlossen.

## 2. Exakt zwei persönliche Einladungscodes erzeugen

Öffne den SQL Editor in Supabase:
https://supabase.com/dashboard/project/bbwmefgcqdrzutgyjlmb/sql/new

**Einmalig** ausführen; nur im leeren Projekt, wenn noch keine Einladungscodes existieren.
Die Datenbank lässt nur die beiden Slot-Nummern 1 und 2 zu.
Codes niemals in GitHub, Skripte, öffentliche Chats oder Screenshots übernehmen.

```sql
with generated as materialized (
 select slot, encode(extensions.gen_random_bytes(24), 'hex') as invite_code
 from (values (1),(2)) as slots(slot)
), inserted as (
 insert into public.planner_invites(slot,code_digest)
 select slot,encode(extensions.digest(invite_code,'sha256'),'hex')
 from generated
 returning slot
)
select g.slot,g.invite_code
from generated g join inserted i using (slot)
order by g.slot;
```

**Wichtig:** Die SQL-Ausgabe zeigt die zwei persönlichen Codes nur beim Erstellen.
Jeden Code separat und sicher an die vorgesehene Person übergeben. In der Datenbank
werden ausschließlich SHA-256-Hashes gespeichert. Ist ein Code verloren, vor einer
Neuausgabe zunächst den betroffenen ungenutzten Slot im SQL Editor entfernen.

## 3. Beide Konten aktivieren

1. Jede Person öffnet die Project-Planner-Website und wählt **Einladung einlösen**.
2. Person A gibt Code 1 ein, Person B Code 2. Jede verwendet einen eigenen Benutzernamen
   und ein eigenes starkes Passwort mit mindestens 12 Zeichen.
3. Den einmaligen Wiederherstellungscode außerhalb des Planners aufbewahren.
4. Anschließend mit Benutzername und Passwort anmelden. Es sind keine E-Mail-Adressen nötig.
5. Nach der zweiten Aktivierung wird jede weitere Kontoerstellung auch auf Datenbankebene blockiert.

## 4. Abnahme

In Supabase SQL Editor prüfen:

```sql
select (select count(*) from public.planner_accounts) as accounts,
       (select count(*) from public.planner_invites) as invites,
       (select count(*) from public.planner_shared_state) as workspaces,
       (select public from storage.buckets where id='planner-files') as bucket_is_public;
```

Erwartung nach beiden Registrierungen und dem ersten Öffnen: genau 2 Konten,
2 Einladungen, 1 gemeinsamer Arbeitsbereich, `bucket_is_public=false`.

Dann in zwei getrennten Browsern prüfen:
- Person A erstellt eine Testaufgabe; Person B sieht diese nach dem automatischen Abgleich.
- Person B bearbeitet dieselbe Aufgabe; Person A sieht die Änderung.
- Bei gleichzeitigen Änderungen verhindert der Revisionsvergleich ein stilles Überschreiben.
- Person A lädt eine harmlose Testdatei hoch, Person B kann sie öffnen und beide können sie sehen.
- Ohne Anmeldung ist kein Lesen von Projekten und Dateien möglich.
- Ein dritter Registrierungsversuch wird abgewiesen.

## 5. GitHub-Sichtbarkeit und Sicherheitsgrenzen

**GitHub Pages ist öffentlich zugänglich.** Das gilt grundsätzlich auch dann, wenn
der GitHub-Code in einem privaten Repository liegt. Eine private GitHub-Pages-Site
mit GitHub-Zugriffskontrolle ist ein spezielles Enterprise-Feature, keine gewöhnliche
Einstellung eines persönlichen Free-Repositories.

Der Code und die Anmeldeseite können von Dritten angesehen werden. **Nicht**
öffentlich sind die Projektinhalte, Kontodaten und Dateianhänge; die Endpunkte
prüfen serverseitig Einladung oder eine gültige private Sitzung.

Das Repository nicht unüberlegt auf privat stellen: GitHub Pages auf privaten
Repositories ist je nach GitHub-Plan nicht verfügbar. Es gibt über die hier
angebundenen GitHub-Aktionen außerdem keine Möglichkeit, die Sichtbarkeit
oder die erstmalige Pages-Konfiguration direkt zu ändern.

**Nicht vor der Abnahme:** Sensible Projekte, vertrauliche Dokumente oder die
originale Desktop-Sicherung importieren. Insbesondere sind echte Zwei-Personen-
Browser-E2E-Tests noch nicht abgeschlossen.

## 6. Technische Struktur

- Nur ein gemeinsamer `planner_shared_state`-Datensatz, abgesichert durch eine
  eindeutige `workspace_id` und atomische Revisionsupdates.
- Beide persönlichen Sessions verwenden denselben privaten Dateiordner.
- Die Konto- und Dateifunktionen nutzen serverseitige Sessionvalidierung.
- Die Weboberfläche prüft alle 2,5 Sekunden auf Änderungen und vermeidet
  automatisches Überschreiben während Eingaben.
- Direkte Rechte auf Tabellen und geschützte SQL-Funktionen für
  `anon` und `authenticated` sind entzogen.
- Keine privaten Schlüssel im GitHub-Pages-Frontend; nur die
  ausdrücklich für Browser vorgesehenen Supabase Publishable Keys.
