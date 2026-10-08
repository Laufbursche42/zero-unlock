// ZERO (MQCON controller) unlock page - SHELL strings only. window.I18N = { de, en }; de is default. Tile,
// setting and advanced LABELS + warnings + the disclaimer live in lb-unlock-driver-zero.js (the driver), so
// this file carries only the canonical-shell chrome + card hints + help text the generic runtime reads. A
// missing key renders an empty element on purpose (fail-visible). Log lines stay English/ASCII by design.
window.I18N = {
  de: {
    pageTitle: 'Laufbursche Zero Tool',
    brandSub: 'Zero Tool',
    infoBannerHtml: 'Test-User gesucht - bitte hier via Ticket melden: <a href="https://github.com/Laufbursche42/Laufbursche42/issues" target="_blank" rel="noopener">GitHub Issues</a>.',
    langGroup: 'Sprache',
    themeToLight: 'Zu hellem Design wechseln',
    themeToDark: 'Zu dunklem Design wechseln',
    buildLabel: 'Build',
    docClose: 'Schließen',

    stDisconnected: 'getrennt',
    stConnecting: 'verbinde',
    stLinking: 'koppeln',
    stConnected: 'verbunden',
    stNoService: 'kein Dienst',
    btnConnect: 'Verbinden',
    btnDisconnect: 'Trennen',
    devPrefix: 'Gerät:',

    s1Title: 'So fängst du an',
    sub: 'Live über Web Bluetooth mit dem MQCON-Motorcontroller deines E-Scooters reden. Läuft in Bluefy (iOS) oder Chrome bzw. Edge (Android/Desktop). Der Bluetooth-Teil verlässt dein Gerät nicht, es gibt kein Konto und keinen Server.',
    startHintGuide: 'Neu hier? In der <a href="GUIDE.de.md" data-doc="GUIDE" data-t="footGuide">Anleitung</a> steht jeder Schritt.',
    expWarn: 'Machbarkeitsstudie: Diese Seite zeigt, was das Bluetooth-Protokoll der MQCON-Controller-App technisch möglich macht. Sie ist kein fertiges Produkt. Es gibt keine Gewährleistung. Alles was du hier tust, tust du auf eigenes Risiko. <a href="#" data-open-disclaimer>Haftungsausschluss lesen</a>.',
    ownDevice: 'Nur am eigenen Fahrzeug auf privatem Gelände. Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf, die ABE erlischt und der Betrieb auf öffentlichen Wegen ist dann nicht erlaubt.',

    s2Title: 'Verbindung',
    showallLabel: 'Alle Geräte zeigen (wenn deins nicht auftaucht)',
    controlsHint: 'Nach dem Verbinden erscheinen die Karten für Live-Werte, Akku, Einstellungen und die erweiterten Funktionen.',

    liveTitle: 'Live-Werte',
    liveHint: 'Es wird nur angezeigt, was der Controller meldet, inklusive der Engineer-Rohwerte aus der Debug-Charakteristik (dort sind Einheit und Skalierung unbekannt). Ein Strich heißt: dieser Wert kam noch nicht.',
    battTitle: 'Akku-Telemetrie',
    battHint: 'Nur was der Controller meldet. Ein Strich bedeutet: dieser Wert kam noch nicht.',

    moreTitle: 'Weitere Einstellungen',
    moreHint: 'Register-Schreibvorgänge sind flüchtig, bis "In EEPROM speichern" sie dauerhaft sichert.',

    rawTitle: 'Erweiterte Einstellungen (Engine-Ebene)',
    rawHint: 'Schreibzugriff auf Engine-Ebene: beliebiges Register per Index oder rohe Bytes direkt an eine Charakteristik. Dieselben Schreib-Rahmen wie oben, nur roh und ohne Wertebereichsprüfung.',

    s6Title: 'Protokoll-Log',
    publicLogLabel: 'Öffentliches Log (Gerätename/ID anonymisieren)',
    diagLogLabel: 'Diagnose-Log',
    btnCopyLog: 'Kopieren',
    btnClearLog: 'Leeren',
    btnSaveLog: 'Speichern',
    logTxLegend: 'gesendet',
    logRxLegend: 'empfangen',

    footGuide: 'Anleitung',
    footSource: 'Quellcode',
    footReadme: 'Readme',
    footDisclaimer: 'Haftungsausschluss',
    footLicense: 'Lizenz',
    footPrivacy: 'Datenschutz',
    footTrademarks: 'Marken',

    confirmTitle: 'Bist du sicher?',
    confirmCancel: 'Abbrechen',
    confirmOk: 'Trotzdem senden',

    btnSet: 'Setzen',
    ackOk: 'Report nach dem Senden empfangen', ackNone: 'kein Report innerhalb 3 s',
    txSent: 'gesendet', txFailed: 'senden fehlgeschlagen',

    errNoWebBt: 'Dieser Browser hat kein Web Bluetooth. Nutze Chrome, Edge oder Bluefy (iOS).',
    errNotConnected: 'nicht verbunden',
    errNoBytes: 'keine gültigen Hex-Bytes',
    errBadIdx: 'Start-Index muss 0 bis 255 sein',
    errRatioRange: 'Wert zwischen 0 und 100 eingeben',
    errSpeedRange: 'Wert außerhalb des gültigen Bereichs',

    help_live_t: 'Live-Werte', help_live_b: 'Der Controller sendet laufend Status-Frames über die State-Charakteristik. Jede Kachel erscheint, sobald ihr Wert kam. Die rohen Meldungen stehen zusätzlich als Hex im Log.',
    help_batt_t: 'Akku-Telemetrie', help_batt_b: 'Die vom Controller gemeldete Akku-Spannung - soweit er sie meldet. Ein Strich bedeutet: dieser Wert kam noch nicht.',
    help_more_t: 'Einstellungen', help_more_b: 'Rekuperation, Feldschwächung, Motor-Drehrichtung und die Motor-Sperre als Register-Schalter. "In EEPROM speichern" macht Änderungen dauerhaft, "Controller-Reset" startet ihn neu.',
    help_raw_t: 'Erweiterte Einstellungen', help_raw_b: '"Register schreiben" baut aus Start-Index und Hex-Werten den Setting-Rahmen [00 Index Werte] und sendet ihn an die Setting-Charakteristik. "Rohe Bytes senden" schickt deine Hex-Bytes unverändert an die gewählte Charakteristik. Nur für Leute, die das Protokoll verstehen.',
    help_publiclog_t: 'Öffentliches Log', help_publiclog_b: 'Wenn an, werden Gerätename und ID im Log durch XX ersetzt, bevor etwas angezeigt, kopiert oder gespeichert wird. Lass es an, wenn du das Log teilst.',
    help_diaglog_t: 'Diagnose-Log', help_diaglog_b: 'Schaltet zusätzliche, ausführliche Zeilen ein (Verbindungsschritte, verworfene Frames). Für die Fehlersuche, sonst aus.'
  },
  en: {
    pageTitle: 'Laufbursche Zero Tool',
    brandSub: 'Zero Tool',
    infoBannerHtml: 'Test users wanted - please report here via a ticket: <a href="https://github.com/Laufbursche42/Laufbursche42/issues" target="_blank" rel="noopener">GitHub Issues</a>.',
    langGroup: 'Language',
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    buildLabel: 'Build',
    docClose: 'Close',

    stDisconnected: 'disconnected',
    stConnecting: 'connecting',
    stLinking: 'linking',
    stConnected: 'connected',
    stNoService: 'no service',
    btnConnect: 'Connect',
    btnDisconnect: 'Disconnect',
    devPrefix: 'Device:',

    s1Title: 'Getting started',
    sub: 'Talk live over Web Bluetooth to the MQCON motor controller in your e-scooter. Runs in Bluefy (iOS) or Chrome/Edge (Android/desktop). The Bluetooth part never leaves your device, and there is no account and no server.',
    startHintGuide: 'New here? Every step is in the <a href="GUIDE.en.md" data-doc="GUIDE" data-t="footGuide">guide</a>.',
    expWarn: 'Feasibility study: this page shows what the Bluetooth protocol of the MQCON controller app makes possible. It is not a finished product. There is no warranty. Whatever you do here, you do at your own risk. <a href="#" data-open-disclaimer>Read the disclaimer</a>.',
    ownDevice: 'Only on your own vehicle on private land. Raising the top speed removes the throttle, the type approval becomes void and riding on public roads is then not allowed.',

    s2Title: 'Connection',
    showallLabel: 'Show all devices (if yours is not listed)',
    controlsHint: 'After connecting, the live-values, battery, settings and advanced cards appear.',

    liveTitle: 'Live values',
    liveHint: 'Only what the controller reports is shown, including the engineer raw values from the Debug characteristic (where unit and scaling are unknown). A dash means that value has not arrived yet.',
    battTitle: 'Battery telemetry',
    battHint: 'Only what the controller reports. A dash means that value has not arrived yet.',

    moreTitle: 'More settings',
    moreHint: 'Register writes are volatile until "Store to EEPROM" persists them.',

    rawTitle: 'Advanced settings (engine level)',
    rawHint: 'Write access at the engine level: any register by index, or raw bytes straight to a characteristic. The same write frames as above, just raw and without range checking.',

    s6Title: 'Protocol log',
    publicLogLabel: 'Public log (anonymize device name/id)',
    diagLogLabel: 'Diagnostic log',
    btnCopyLog: 'Copy',
    btnClearLog: 'Clear',
    btnSaveLog: 'Save',
    logTxLegend: 'sent',
    logRxLegend: 'received',

    footGuide: 'Guide',
    footSource: 'Source',
    footReadme: 'Readme',
    footDisclaimer: 'Disclaimer',
    footLicense: 'License',
    footPrivacy: 'Privacy',
    footTrademarks: 'Trademarks',

    confirmTitle: 'Are you sure?',
    confirmCancel: 'Cancel',
    confirmOk: 'Send anyway',

    btnSet: 'Set',
    ackOk: 'report received after sending', ackNone: 'no report within 3 s',
    txSent: 'sent', txFailed: 'send failed',

    errNoWebBt: 'This browser has no Web Bluetooth. Use Chrome, Edge or Bluefy (iOS).',
    errNotConnected: 'not connected',
    errNoBytes: 'no valid hex bytes',
    errBadIdx: 'start index must be 0 to 255',
    errRatioRange: 'enter a value from 0 to 100',
    errSpeedRange: 'value out of range',

    help_live_t: 'Live values', help_live_b: 'The controller streams status frames on the State characteristic. Each tile appears once its value arrives. The raw messages are also logged as hex.',
    help_batt_t: 'Battery telemetry', help_batt_b: 'The battery voltage reported by the controller - as far as it reports it. A dash means that value has not arrived yet.',
    help_more_t: 'Settings', help_more_b: 'Regeneration, flux weakening, motor rotation and the motor lock as register switches. "Store to EEPROM" makes changes permanent, "Controller reset" reboots it.',
    help_raw_t: 'Advanced settings', help_raw_b: '"Write register" builds the setting frame [00 index values] from a start index and hex values and sends it to the Setting characteristic. "Send raw bytes" sends your hex bytes unchanged to the chosen characteristic. For people who understand the protocol only.',
    help_publiclog_t: 'Public log', help_publiclog_b: 'When on, the device name and id are replaced with XX in the log before anything is shown, copied or saved. Leave it on if you share the log.',
    help_diaglog_t: 'Diagnostic log', help_diaglog_b: 'Adds extra verbose lines (connect steps, dropped frames). For troubleshooting, otherwise off.'
  }
};
