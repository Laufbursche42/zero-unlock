# Anleitung

> **Wichtig für Fehler-Reports:** Schalte unten auf der Seite den **Diagnose-Log** ein, *bevor* du dich mit dem Scooter verbindest. Nur dann wird der komplette Verbindungsaufbau mitgeschnitten - und genau diese Zeilen brauchen wir in einem [Ticket](https://github.com/Laufbursche42/Laufbursche42/issues), um ein Problem nachzuvollziehen.

## Was du brauchst
- Einen E-Scooter mit einem MQCON-Motorcontroller (der Dienst `0F557B00` muss gefunden werden).
- Ein Handy oder einen Rechner mit **Chrome**, **Edge** oder auf iOS **Bluefy**. Safari und Firefox können kein Web Bluetooth.

## Verbinden
1. Bluetooth am Gerät einschalten, den Scooter einschalten (wecken).
2. Auf **Verbinden** tippen und den Scooter in der Liste auswählen.
3. Taucht er nicht auf, setze den Haken bei **Alle Geräte zeigen** und verbinde erneut. Der echte Test ist der gefundene Bluetooth-Dienst `0F557B00`, nicht der angezeigte Name.
4. Nach dem Verbinden erscheinen die Karten für Live-Werte, Motor-Sperre, Geschwindigkeits-Limit und Einstellungen. Die Seite startet zugleich den Telemetrie-Stream (Refresh-Periode 10).

## Live-Werte lesen
Der Controller sendet laufend seinen Zustand über die State-Charakteristik. Jede Kachel erscheint, sobald ihr Wert angekommen ist; ein Strich heißt nur, dass dieser Wert noch nicht kam. Die Werte sind roh: Spannungen, Temperaturen und das Tempo werden ohne Einheit oder Skalierung angezeigt. Unter den Kacheln kannst du mit **Alle empfangenen Frames** die Rohdaten pro Charakteristik mitlesen.

## Motor-Sperre
In der Karte **Motor-Sperre** sperrst oder entsperrst du den Motor (Immobilizer, Register-Schlüssel 17). Beachte: Einen gesperrten Motor kannst du nur über Bluetooth wieder entsperren.

## Geschwindigkeits-Limit
- Der große Knopf schaltet den Limit-Modus (Register 33) an oder aus. Er beschriftet sich aus dem gemeldeten Modus.
- Das Feld **Internes Limit** setzt das Limit-Verhältnis (Register 34) als rohen Wert von 0 bis 100.
- Wichtig: Ein Report im Log heißt nur, dass ein Frame ankam. Erst wenn sich die Live-Werte ändern, wirkt der Wert wirklich. Probiere alles an deinem eigenen Gerät aus.

## Weitere Einstellungen
Rekuperation, Feldschwächung und Motor-Drehrichtung als Register-Schalter. Es erscheinen nur Zeilen, deren Wert der Controller auch meldet. Mit **In EEPROM speichern** (State-Befehl 0x01) machst du Änderungen dauerhaft, denn Register-Schreibvorgänge sind bis dahin flüchtig. **Controller-Reset** (0x02) startet den Controller neu.

## Erweiterte Einstellungen (Engine-Ebene)
**Rohe Bytes** sendet deine Hex-Bytes unverändert an die gewählte Charakteristik (Setting, State oder Debug). **Register schreiben** baut aus Start-Index und Hex-Werten ein Setting-Frame `[00 Index Werte]` und sendet es an die Setting-Charakteristik.

## Shortcuts
Kopiere den Link auf den Startbildschirm, dann löst oder setzt ein Tipp direkt die Motor-Sperre. Auf iOS über Bluefy, und der Scooter muss vorher einmal normal verbunden gewesen sein.

## Wenn etwas nicht geht
- Kein Verbinden? Prüfe, dass der Browser Web Bluetooth kann, Bluetooth an ist und der Scooter wach ist. Mit **Alle Geräte zeigen** erneut versuchen.
- Nichts passiert nach einem Befehl? Schau ins Log: steht dort "gesendet" aber kein Report, hat der Controller nichts zurückgemeldet.
- **Diagnose: alle Geräte auflisten** im Log-Bereich zeigt alle Bluetooth-Dienste eines Geräts, ohne etwas zu schreiben - hilfreich für Support.

## Mithelfen
Willst du herausfinden, ob und wie Tuning bei deinem Scooter geht? Teste dieses Tool an deinem eigenen Fahrzeug und öffne ein Ticket auf [GitHub](https://github.com/Laufbursche42/Laufbursche42/issues) - mit deinem Modell und was funktioniert hat (oder nicht). So finden wir gemeinsam heraus, was bei welchem Modell möglich ist.
