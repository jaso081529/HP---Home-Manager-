# Home Manager

Eine neutrale, lokale Web-App/PWA zur Dokumentation von Haushaltsarbeit, Aufgaben und wiederkehrenden Tätigkeiten.

## Funktionen

- Tätigkeiten mit Datum, Kategorie, Ampelstatus (grün/orange/rot), Aufwand und optionaler Person dokumentieren
- Keine Stoppuhr nötig: Aufwandspunkte klein/normal/groß, zusätzlich optionale Minutenangabe
- Aufgaben & Checklisten mit Fälligkeit, Priorität und Wiederholung
- 7-Tage-Ampel sowie Berichte für 7/30/90 Tage oder Gesamtzeitraum
- Druckansicht für nachvollziehbare Berichte und Tabellen
- JSON-Backup sowie CSV-Export für Protokoll und Aufgaben
- JSON-Import zur lokalen Wiederherstellung
- Optionale Spracheingabe über die Web Speech API, sofern der Browser sie unterstützt
- PWA/Offline-Unterstützung über Service Worker
- Hell/Dunkel/System-Darstellung

## Datenschutz

Die App enthält **keine personenbezogenen Beispieldaten** und verwendet **keine externen Tracker, Analyse-Dienste, Konten oder Cloud-Datenbank**. Nutzerdaten werden in IndexedDB des Browsers gespeichert (Fallback: localStorage). Private Daten gelangen nur dann in eine Datei, wenn der Nutzer selbst einen Export auslöst.

Die optionale Spracheingabe ist browserabhängig. Einige Browser können die Audioverarbeitung über einen externen Spracherkennungsdienst durchführen. Die App speichert selbst keine Audioaufnahme.

## Hosting

Die App ist statisch und benötigt keinen Servercode. Ein GitHub-Actions-Workflow für GitHub Pages liegt unter `.github/workflows/pages.yml`. Für öffentliche Repositories ist GitHub Pages im GitHub-Free-Plan verfügbar. Es werden keine kostenpflichtigen APIs benötigt.

## Lokal testen

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080` öffnen.

## Dateien

- `index.html` – Oberfläche
- `styles.css` – responsive Darstellung und Drucklayout
- `app.js` – App-Einstieg und Ereignissteuerung
- `js/model.js` – lokale Datenhaltung und Datenmodell
- `js/render.js` – Ansichten, Tabellen und Auswertungen
- `js/actions.js` – Formulare, Import/Export und Spracheingabe
- `manifest.webmanifest` – PWA-Metadaten
- `sw.js` – Offline-Cache
- `icon.svg` – App-Icon

## Lizenz

MIT
