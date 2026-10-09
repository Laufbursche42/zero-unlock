'use strict';
/*
 * ZERO (MQCON controller) unlock driver (M3). Declarative manifest + pure protocol core for the generic
 * runtime. Protocol proven from com.mqcon.app.android.settingtool (code-verified): one GATT service
 * 0F557B00 with three characteristics - State 0F557B01 (20-byte telemetry notify + command write), Setting
 * 0F557B02 (chunked register-dump notify + tuning-register write), Debug 0F557B04 (14-byte notify + factory
 * write). No magic header, no CRC/checksum, no length-TLV: values are raw big-endian int16 arrays. Writes are
 * plain register sets. No auth (gating is purely "advertises service 0F557B00"). A single DEFAULT profile
 * (W511-class controller); fw<1.6 vs >=1.6 only shifts setting-register indices (this assumes modern >=1.6).
 * The pure functions below are relocated byte-identical from the original zero app.js - same logic, only the
 * module-global S became an explicit parameter so the driver stays pure (no DOM, no globals).
 */
(function () {

  // --------------------------- UUIDs (DeviceService.java:8, Characteristic map :19-23; lowercase for Web BT) ---------------------------
  const U = {
    SERVICE: '0f557b00-a37d-e411-bedb-50ed7800a5a5',   // DeviceService (also the scan filter)
    STATE:   '0f557b01-a37d-e411-bedb-50ed7800a5a5',   // telemetry notify + command write (store/reset/refresh)
    SETTING: '0f557b02-a37d-e411-bedb-50ed7800a5a5',   // tuning registers: chunked dump notify + write
    DEBUG:   '0f557b04-a37d-e411-bedb-50ed7800a5a5'     // factory/debug 7x int16 notify + 5x int16 write
  };

  // Setting register keys (SettingCharacteristic.java:9-46). Index == key for fw >= 1.6 (identity remap).
  const KEY = {
    LOCK_MOTOR: 17, E_BRAKE: 15, FLUX_WEAKEN_ENABLE: 19, REGEN_ENABLE: 22, MOTOR_ROTATION: 31,
    SPEED_LIMIT_MODE: 33, INTERNAL_SPEED_LIMIT_RATIO: 34, L3_LOW_RATIO: 35, L3_MED_RATIO: 36, REVERSING_SPEED_LIMIT: 18
  };

  // =========================================================================================
  //  VERIFIED PROTOCOL CORE (code-proven from com.mqcon...settingtool; self-test vectors below)
  // =========================================================================================
  // Transport has NO framing: no header byte, no length field, no checksum. Values are raw big-endian int16.
  // Util.toInt(b,b2)=(b<<8)|(b2&0xFF) => signed int16 (MSB,LSB); Util.toUInt=((b&0xFF)<<8)|(b2&0xFF) => unsigned.
  const u16 = (b, i) => ((b[i] & 0xff) << 8) | (b[i + 1] & 0xff);
  const s16 = (b, i) => { const v = u16(b, i); return v >= 0x8000 ? v - 0x10000 : v; };
  const enc16 = (v) => [(v >> 8) & 0xff, v & 0xff];   // big-endian int16 encode

  // STATE write builders (StateCharacteristic.java:75-85, WriteStateCharacteristicTask.java:39-48).
  function stateStore() { return [0x01]; }                                  // persist settings to EEPROM
  function stateReset() { return [0x02]; }                                  // reset/reboot the controller
  function stateRefresh(tTest, tNorm, tSet) { return [0x00, tTest & 0xff, tNorm & 0xff, tSet & 0xff]; }  // telemetry period

  // SETTING write (WriteSettingCharacteristicTask: [writeMethod=0x00][startIndex][int16 BE per key]).
  // startIndex is the setting INDEX; == key for fw >= 1.6 (identity). We write the key directly.
  function buildSettingWrite(key, vals) {
    const out = [0x00, key & 0xff];
    for (const v of (vals || [])) { const e = enc16(v & 0xffff); out.push(e[0], e[1]); }
    return out;
  }
  // DEBUG write (DebugCharacteristic.setValue net wire order [scaleFactor][hallTest][workMode][givenCurrent][hallDeviationAngle]).
  function buildDebugWrite(scaleFactor, hallTest, workMode, givenCurrent, hallDev) {
    return [].concat(enc16(scaleFactor & 0xffff), enc16(hallTest & 0xffff), enc16(workMode & 0xffff), enc16(givenCurrent & 0xffff), enc16(hallDev & 0xffff));
  }

  // STATE notify/read = 20 bytes = 10x int16 BE (StateCharacteristic.java:36-78; Device INDEX_SENSOR_* :24-33).
  function parseState(b, S) {
    if (b.length < 20) return;
    S.state = u16(b, 0); S.battV = s16(b, 2); S.ctrlTemp = s16(b, 4); S.motorTemp = s16(b, 6);
    S.speed = s16(b, 8); S.hall = s16(b, 10); S.handleV = s16(b, 12);
    S.fault1 = u16(b, 14); S.fault2 = u16(b, 16); S.fault3 = u16(b, 18);
  }
  // DEBUG notify/read = 14 bytes = 7x int16 BE (DebugCharacteristic.java:32-58).
  function parseDebug(b, S) {
    if (b.length < 14) return;
    S.scaleFactor = s16(b, 0); S.hallTest = s16(b, 2); S.workMode = s16(b, 4); S.givenCurrent = s16(b, 6);
    S.hallDev = s16(b, 8); S.testState = s16(b, 10); S.resetState = s16(b, 12);
  }
  // SETTING notify = chunked: each chunk [byte0 totalPayloadLen][byte1 offset][payload]; reassembled payload
  // = [0x00][startKey][int16 BE per key] (BleClient.java:112-147 test harness). device_side: the real receive
  // reassembly/strip code was not located, so this is best-effort. Buffer is driver-local, cleared on reset().
  let settingBuf = null, settingLen = 0, settingGot = 0;
  function resetSettingAssembly() { settingBuf = null; settingLen = 0; settingGot = 0; }
  function feedSetting(b, S) {
    if (b.length < 2) return;
    const total = b[0] & 0xff, offset = b[1] & 0xff, chunk = b.slice(2);
    if (settingBuf === null || total !== settingLen) { settingLen = total; settingBuf = new Array(total).fill(null); settingGot = 0; }
    for (let i = 0; i < chunk.length && offset + i < settingLen; i++) { if (settingBuf[offset + i] === null) settingGot++; settingBuf[offset + i] = chunk[i]; }
    if (settingLen > 0 && settingGot >= settingLen) parseSettingPayload(settingBuf.slice(), S);
  }
  function parseSettingPayload(p, S) {
    if (p.length < 2) return;
    const startKey = p[1] & 0xff; const vals = p.slice(2);
    for (let i = 0; i * 2 + 1 < vals.length; i++) S.settings[startKey + i] = s16(vals, i * 2);
  }

  // DeviceState enum (DeviceState.java) -> short label for the state tile.
  const STATE_LABELS = {
    0: 'restart', 1: 'sys error', 3: 'throttle err', 4: 'hall test', 20: 'e-brake', 21: 'brake', 22: 'regen',
    23: 'run (flux on)', 24: 'run (flux off)', 25: 'reverse', 26: 'anti-loose', 27: 'anti-theft'
  };

  // hex helper (advanced raw/free builders): strip spaces/punctuation, parse pairs, drop a dangling nibble
  function hexToBytes(s) {
    const clean = String(s).replace(/[^0-9a-fA-F]/g, '');
    const out = []; for (let i = 0; i + 2 <= clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
    return out;
  }

  // load-time self-test: the int16-BE builders must match hand-computed vectors; decoders must round-trip.
  function runSelfTest() {
    const eq = (a, b) => a.length === b.length && a.every((v, i) => (v & 0xff) === (b[i] & 0xff));
    const t1 = eq(buildSettingWrite(KEY.LOCK_MOTOR, [1]), [0x00, 0x11, 0x00, 0x01]);          // lock motor (key 17) = 1
    const t2 = eq(buildSettingWrite(KEY.INTERNAL_SPEED_LIMIT_RATIO, [80]), [0x00, 0x22, 0x00, 0x50]); // key 34 = 80
    const t3 = eq(stateRefresh(10, 10, 10), [0x00, 0x0a, 0x0a, 0x0a]) && eq(stateStore(), [0x01]) && eq(stateReset(), [0x02]);
    const t4 = (s16([0x12, 0x34], 0) === 0x1234) && (s16([0xff, 0xfe], 0) === -2) && (u16([0xff, 0xfe], 0) === 0xfffe);
    const t5 = eq(buildSettingWrite(KEY.SPEED_LIMIT_MODE, [1]), [0x00, 0x21, 0x00, 0x01]);     // speed-limit mode (key 33) = 1
    const t6 = eq(buildSettingWrite(KEY.L3_LOW_RATIO, [50]), [0x00, 0x23, 0x00, 0x32])          // 3-level low ratio (key 35) = 50
      && eq(buildSettingWrite(KEY.REVERSING_SPEED_LIMIT, [10]), [0x00, 0x12, 0x00, 0x0a]);       // reversing limit (key 18) = 10
    return t1 && t2 && t3 && t4 && t5 && t6;
  }

  // live device state, rebuilt from the push frames (the command builders + tiles read from this)
  function newState() {
    return {
      state: null, battV: null, ctrlTemp: null, motorTemp: null, speed: null, hall: null, handleV: null,
      fault1: null, fault2: null, fault3: null,
      scaleFactor: null, hallTest: null, workMode: null, givenCurrent: null, hallDev: null, testState: null, resetState: null,
      settings: {}   // key -> signed int16 value, best-effort from the Setting-char chunked dump
    };
  }

  const num = (v) => v == null ? null : String(v);
  const setVal = (S, key) => { const v = S.settings[key]; return v == null ? null : (v ? 1 : 0); };
  const faultTile = (v, ctx) => v == null ? null : (v === 0 ? (ctx.lang === 'de' ? 'keiner' : 'none') : '#' + v);

  // =========================================================================================
  //  DRIVER MANIFEST
  // =========================================================================================
  const DRIVER = {
    meta: {
      id: 'zero', brand: 'Zero',
      models: [{ id: 'default', label: 'Zero' }],
      defaultModel: 'default'
    },

    connection: {
      services: [U.SERVICE],                 // one generic profile; also the 128-bit scan filter 0F557B00
      transports: [
        { role: 'state', uuid: U.STATE, notify: true },                 // 20-byte telemetry notify + command write
        { role: 'setting', uuid: U.SETTING, notify: true },             // chunked register dump notify + tuning write
        { role: 'debug', uuid: U.DEBUG, notify: true, optional: true }  // 14-byte engineer notify (may be absent)
      ],
      writeMode: 'response',                 // native BluetoothGatt default write-with-response
      defaultTarget: 'setting',              // tuning writes go to the Setting characteristic
      needs: { model: false, pin: false, localKey: false, btsnoop: false },
      // telemetry kick: the proven default refresh period 10/10/10 (InitRefreshPeriodTask) over the State char
      onConnect: async (tx) => { await tx.write('state', stateRefresh(10, 10, 10)); tx.log('refresh period set 10/10/10'); }
    },

    newState,
    reset() { resetSettingAssembly(); },     // clear the chunked-dump buffer on disconnect (S is reset by the runtime)

    // ---- pure protocol: per-characteristic decode/reassembly; returns an ack key to resolve, or null ----
    onNotify(role, b, S) {
      if (role === 'state') { parseState(b, S); return null; }
      if (role === 'debug') { parseDebug(b, S); return null; }
      if (role === 'setting') { feedSetting(b, S); return 'rx:setting'; }
      return null;
    },

    build: {
      raw(hex) { return hexToBytes(hex); },                               // verbatim bytes to the chosen characteristic
      free(idxStr, payStr) {                                              // [writeMethod 0][startIndex][int16 BE values]
        const idx = parseInt(idxStr, 10);
        if (isNaN(idx) || idx < 0 || idx > 255) return null;
        return [0x00, idx & 0xff].concat(hexToBytes(payStr || ''));
      }
    },

    selfTest() { return { ok: runSelfTest(), label: 'protocol self-test' }; },

    // ---- declarative telemetry (get -> display string or null; runtime shows a dash for null) ----
    telemetry: {
      live: [
        { key: 'state', label: { de: 'Zustand', en: 'State' }, get: S => S.state == null ? null : (STATE_LABELS[S.state] || '#' + S.state) },
        { key: 'speed', label: { de: 'Tempo', en: 'Speed' }, get: S => num(S.speed) },
        { key: 'ctrltemp', label: { de: 'Controller-Temp.', en: 'Controller temp.' }, get: S => num(S.ctrlTemp) },
        { key: 'motortemp', label: { de: 'Motor-Temp.', en: 'Motor temp.' }, get: S => num(S.motorTemp) },
        { key: 'hall', label: { de: 'Hall-Wert', en: 'Hall value' }, get: S => num(S.hall) },
        { key: 'handlev', label: { de: 'Lenker-Spannung', en: 'Handlebar voltage' }, get: S => num(S.handleV) },
        { key: 'fault1', label: { de: 'Fehler 1', en: 'Fault 1' }, get: (S, ctx) => faultTile(S.fault1, ctx) },
        { key: 'fault2', label: { de: 'Fehler 2', en: 'Fault 2' }, get: (S, ctx) => faultTile(S.fault2, ctx) },
        { key: 'fault3', label: { de: 'Fehler 3', en: 'Fault 3' }, get: (S, ctx) => faultTile(S.fault3, ctx) },
        // Debug-char engineer values (raw signed int16; DebugCharacteristic.java:32-58). Unit/scaling unknown.
        { key: 'scale', label: { de: 'Skalierungsfaktor', en: 'Scale factor' }, get: S => num(S.scaleFactor) },
        { key: 'halltest', label: { de: 'Hall-Test', en: 'Hall test' }, get: S => num(S.hallTest) },
        { key: 'workmode', label: { de: 'Arbeitsmodus', en: 'Work mode' }, get: S => num(S.workMode) },
        { key: 'given', label: { de: 'Sollstrom', en: 'Given current' }, get: S => num(S.givenCurrent) },
        { key: 'halldev', label: { de: 'Hall-Abweichung', en: 'Hall deviation' }, get: S => num(S.hallDev) },
        { key: 'teststate', label: { de: 'Test-Zustand', en: 'Test state' }, get: S => num(S.testState) },
        { key: 'resetstate', label: { de: 'Reset-Zustand', en: 'Reset state' }, get: S => num(S.resetState) }
      ],
      battery: [
        { key: 'battv', label: { de: 'Akku-Spannung', en: 'Battery voltage' }, get: S => num(S.battV) }
      ]
    },

    // ---- declarative settings (runtime renders by type, groups by `group`; zero shows all on connect: gate:false) ----
    settings: [
      { key: 'speedmode', type: 'select', gate: false, target: 'setting', ack: 'rx:setting',
        group: { de: 'Tempo und Freischaltung', en: 'Speed and unlocking' },
        label: { de: 'Geschwindigkeits-Limit (Register 33)', en: 'Speed limit (register 33)' },
        options: [{ val: 0, label: { de: 'aus (entsperrt)', en: 'off (unlocked)' } }, { val: 1, label: { de: 'an (gesperrt)', en: 'on (locked)' } }],
        read: S => setVal(S, KEY.SPEED_LIMIT_MODE), write: (v, S) => buildSettingWrite(KEY.SPEED_LIMIT_MODE, [v]),
        risky: true, warn: { de: 'Das schaltet das Geschwindigkeits-Limit aus. Ohne Drossel erlischt die ABE und der Betrieb auf öffentlichen Wegen ist nicht erlaubt.', en: 'This turns the speed limit off. Without the throttle the type approval becomes void and riding on public roads is not allowed.' } },

      { key: 'ratio', type: 'number', gate: false, reflect: true, target: 'setting', ack: 'rx:setting', ls: 'ratio',
        group: { de: 'Tempo und Freischaltung', en: 'Speed and unlocking' },
        label: { de: 'Internes Limit (Register 34, Wert 0-100)', en: 'Internal limit (register 34, value 0-100)' },
        bounds: { min: 0, max: 100 }, default: 100, errKey: 'errRatioRange',
        read: S => S.settings[KEY.INTERNAL_SPEED_LIMIT_RATIO], write: (v, S) => buildSettingWrite(KEY.INTERNAL_SPEED_LIMIT_RATIO, [v]),
        risky: true, warn: { de: 'Das setzt das interne Limit-Verhältnis (Register 34). Ein hoher Wert kann die Höchstgeschwindigkeit anheben.', en: 'This sets the internal limit ratio (register 34). A high value can raise the top speed.' },
        hint: { de: 'Setzt das interne Limit-Verhältnis (Register 34). Ein Report heißt "angekommen", erst die Live-Werte zeigen die Wirkung.', en: 'Sets the internal limit ratio (register 34). A report only means "arrived"; the live values show the effect.' } },

      { key: 'regen', type: 'select', gate: false, target: 'setting', ack: 'rx:setting',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'Rekuperation (Register 22)', en: 'Regeneration (register 22)' },
        options: [{ val: 0, label: { de: 'aus', en: 'off' } }, { val: 1, label: { de: 'an', en: 'on' } }],
        read: S => setVal(S, KEY.REGEN_ENABLE), write: (v, S) => buildSettingWrite(KEY.REGEN_ENABLE, [v]) },

      { key: 'flux', type: 'select', gate: false, target: 'setting', ack: 'rx:setting',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'Feldschwächung (Register 19)', en: 'Flux weakening (register 19)' },
        options: [{ val: 0, label: { de: 'aus', en: 'off' } }, { val: 1, label: { de: 'an', en: 'on' } }],
        read: S => setVal(S, KEY.FLUX_WEAKEN_ENABLE), write: (v, S) => buildSettingWrite(KEY.FLUX_WEAKEN_ENABLE, [v]),
        risky: true, warn: { de: 'Feldschwächung beeinflusst das Hochdrehzahl-Verhalten des Motors. Falsch gesetzt kann der Motor heiß werden. Nur am eigenen Fahrzeug testen.', en: 'Flux weakening affects the motor high-RPM behaviour. Set wrong, the motor can overheat. Test on your own vehicle only.' } },

      { key: 'rotation', type: 'select', gate: false, target: 'setting', ack: 'rx:setting',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'Motor-Drehrichtung (Register 31)', en: 'Motor rotation (register 31)' },
        options: [{ val: 0, label: { de: 'normal', en: 'normal' } }, { val: 1, label: { de: 'umgekehrt', en: 'reversed' } }],
        read: S => setVal(S, KEY.MOTOR_ROTATION), write: (v, S) => buildSettingWrite(KEY.MOTOR_ROTATION, [v]),
        risky: true, warn: { de: 'Das kehrt die Motor-Drehrichtung um. Falsch gesetzt fährt der Roller rückwärts. Nur am eigenen Fahrzeug testen.', en: 'This reverses the motor rotation. Set wrong, the scooter drives backwards. Test on your own vehicle only.' } },

      { key: 'lock', type: 'select', gate: false, target: 'setting', ack: 'rx:setting',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'Motor sperren (Register 17)', en: 'Lock motor (register 17)' },
        options: [{ val: 0, label: { de: 'offen', en: 'open' } }, { val: 1, label: { de: 'gesperrt', en: 'locked' } }],
        read: S => setVal(S, KEY.LOCK_MOTOR), write: (v, S) => buildSettingWrite(KEY.LOCK_MOTOR, [v]),
        risky: true, warn: { de: 'Das sperrt den Motor (Immobilizer). Entsperren geht nur wieder über Bluetooth.', en: 'This locks the motor (immobilizer). It can only be unlocked again over Bluetooth.' } },

      { key: 'store', type: 'action', target: 'state',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'In EEPROM speichern', en: 'Store to EEPROM' },
        hint: { de: 'Register-Schreibvorgänge sind flüchtig, bis dies sie dauerhaft im EEPROM sichert.', en: 'Register writes are volatile until this persists them to EEPROM.' },
        write: () => stateStore() },

      { key: 'reset', type: 'action', target: 'state',
        group: { de: 'Allgemein', en: 'General' },
        label: { de: 'Controller-Reset', en: 'Controller reset' },
        write: () => stateReset(),
        risky: true, warn: { de: 'Das startet den Controller neu. Laufende Fahrt vorher beenden.', en: 'This reboots the controller. End any ride first.' } }
    ],

    // ---- advanced (engine level): raw speed-ratio/limit registers + free register write + raw bytes ----
    advanced: [
      { key: 'l3low', type: 'number', target: 'setting', ack: 'rx:setting', reflect: true,
        group: { de: 'Speed-Ratios und Limits (roh)', en: 'Speed ratios and limits (raw)' },
        label: { de: '3-Stufen-Limit niedrig (Register 35)', en: '3-level limit low (register 35)' },
        bounds: { min: 0, max: 100 }, errKey: 'errRatioRange',
        read: S => S.settings[KEY.L3_LOW_RATIO], write: (v, S) => buildSettingWrite(KEY.L3_LOW_RATIO, [v]),
        risky: true, warn: { de: 'Das schreibt ein Speed-Ratio- oder Limit-Register roh. Ein hoher Wert kann die Höchstgeschwindigkeit anheben. Nur am eigenen Fahrzeug testen.', en: 'This writes a speed-ratio or limit register raw. A high value can raise the top speed. Test on your own vehicle only.' } },

      { key: 'l3med', type: 'number', target: 'setting', ack: 'rx:setting', reflect: true,
        group: { de: 'Speed-Ratios und Limits (roh)', en: 'Speed ratios and limits (raw)' },
        label: { de: '3-Stufen-Limit mittel (Register 36)', en: '3-level limit medium (register 36)' },
        bounds: { min: 0, max: 100 }, errKey: 'errRatioRange',
        read: S => S.settings[KEY.L3_MED_RATIO], write: (v, S) => buildSettingWrite(KEY.L3_MED_RATIO, [v]),
        risky: true, warn: { de: 'Das schreibt ein Speed-Ratio- oder Limit-Register roh. Ein hoher Wert kann die Höchstgeschwindigkeit anheben. Nur am eigenen Fahrzeug testen.', en: 'This writes a speed-ratio or limit register raw. A high value can raise the top speed. Test on your own vehicle only.' } },

      { key: 'revlimit', type: 'number', target: 'setting', ack: 'rx:setting', reflect: true,
        group: { de: 'Speed-Ratios und Limits (roh)', en: 'Speed ratios and limits (raw)' },
        label: { de: 'Rückwärts-Limit (Register 18)', en: 'Reversing limit (register 18)' },
        bounds: { min: 0, max: 100 }, errKey: 'errRatioRange',
        read: S => S.settings[KEY.REVERSING_SPEED_LIMIT], write: (v, S) => buildSettingWrite(KEY.REVERSING_SPEED_LIMIT, [v]),
        risky: true, warn: { de: 'Das schreibt ein Speed-Ratio- oder Limit-Register roh. Ein hoher Wert kann die Höchstgeschwindigkeit anheben. Nur am eigenen Fahrzeug testen.', en: 'This writes a speed-ratio or limit register raw. A high value can raise the top speed. Test on your own vehicle only.' },
        hint: { de: 'Dieselben Register-Schreibvorgänge wie das interne Limit (Register 34): roher 16-Bit-Wert, Skalierung unbekannt. Ein Report heißt "angekommen", erst die Live-Werte zeigen die Wirkung.', en: 'The same register writes as the internal limit (register 34): raw 16-bit value, scaling unknown. A report only means "arrived"; the live values show the effect.' } },

      { key: 'free', type: 'free', target: 'setting', radix: 'dec', errKey: 'errBadIdx',
        group: { de: 'Register schreiben (Index + Werte)', en: 'Write register (index + values)' },
        opLabel: { de: 'Start-Index', en: 'Start index' }, opPlaceholder: '34',
        payloadLabel: { de: 'Werte (Hex)', en: 'Values (hex)' }, payloadPlaceholder: '00 50',
        btn: { de: 'Bauen und senden', en: 'Build and send' },
        logLabel: { de: 'Register-Write', en: 'register write' },
        hint: { de: 'Baut aus Start-Index und 16-Bit-Hex-Werten den Setting-Rahmen [00 Index Werte] und sendet ihn an die Setting-Charakteristik. Mehrere Werte schreiben aufeinanderfolgende Register ab dem Index.', en: 'Builds the setting frame [00 index values] from a start index and 16-bit hex values and sends it to the Setting characteristic. Several values write consecutive registers from the index.' } },

      { key: 'raw', type: 'raw', target: 'setting',
        group: { de: 'Rohe Bytes senden', en: 'Send raw bytes' },
        targets: ['setting', 'state', 'debug'],
        targetLabels: { setting: { de: 'Setting (0F557B02)', en: 'Setting (0F557B02)' }, state: { de: 'State (0F557B01)', en: 'State (0F557B01)' }, debug: { de: 'Debug (0F557B04)', en: 'Debug (0F557B04)' } },
        label: { de: 'Hex', en: 'Hex' }, placeholder: '00 11 00 01', btn: { de: 'Senden', en: 'Send' },
        logLabel: { de: 'rohe Bytes', en: 'raw bytes' },
        hint: { de: 'Sendet deine Hex-Bytes unverändert an die gewählte Charakteristik.', en: 'Sends your hex bytes unchanged to the chosen characteristic.' } }
    ],

    // ---- log anonymization pipeline (mask = always at source; redact = when public-log is on) ----
    logAnonymize: {
      mask: [
        { re: /eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g, repl: '[redacted-jwt]' },
        { re: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, repl: 'Bearer ***' },
        { re: /\b(access[_-]?token|refresh[_-]?token|token|jwt|password|passwd|pwd|secret|code|otp)\b(\s*[:=]\s*)("?)([^\s",}]+)\3/gi, repl: (m, k, sep) => k + sep + '***' }
      ],
      redact: [
        { re: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, repl: '[redacted-mac]' },
        { re: /\b(secret|token|key|aes|pwd|password|pin|mac|serial|vin|uid|imei)\b(\s*[:=]\s*)("?)([^\s",]+)\3/gi, repl: (m, k, sep) => k + sep + '[redacted]' },
        { re: /\b[0-9A-Fa-f]{16,}\b/g, repl: '[redacted-hex]' }
      ]
    },

    docs: {
      trademarks: { de: 'MQCON und ZERO sind Marken der jeweiligen Inhaber.', en: 'MQCON and ZERO are trademarks of their respective owners.' },
      guide: { de: 'GUIDE.de.md', en: 'GUIDE.en.md' },
      readme: { de: 'README.md', en: 'README.md' }
    }
  };

  if (typeof window !== 'undefined') window.DRIVER = DRIVER;
  if (typeof module !== 'undefined' && module.exports) module.exports = DRIVER;

})();
