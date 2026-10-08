# Laufbursche ZERO unlock

A static web page that talks to e-scooters running an **MQCON brushless-motor controller** over Web Bluetooth. Connect, read the live telemetry and - straight from the browser - lock and unlock the motor, toggle the speed limit, change tuning registers and persist them to the controller EEPROM. Nothing to install: no app store, no signing, no developer account. It runs in **Bluefy** on iOS and in **Chrome** or **Edge** on Android or desktop.

> **This is a feasibility study - the register writes are sent, their effect on hardware is unconfirmed.** It exists to show what the MQCON controller's Bluetooth protocol makes possible, not to be a finished product; the protocol was reconstructed from the official app (`com.mqcon.app.android.settingtool`, app name "MQCON") and is documented byte for byte. The whole protocol is plain Java/Dalvik - no native `.so`, no React-Native/Hermes, no Flutter. One generic `DEFAULT` profile covers every controller this app talks to (the bundled firmware targets a W511-class controller), and there is **no authentication** of any kind: the profile exposes only the State / Setting / Debug characteristics, with no PIN, pairing or password, so any client that advertises the service UUID can read and write. **Reading works:** the 20-byte State telemetry (state, raw battery voltage, raw speed, controller and motor temperature, hall value, handlebar voltage and three fault words) is decoded and shown live. The **writes are sent on request** - motor lock (setting key 17), speed-limit mode and internal-limit ratio (keys 33 and 34), regeneration / flux-weakening / motor-rotation flags, plus the State store and reset commands - but whether the controller firmware honours them, and the **units and scaling** of every raw register value, sit in the controller and cannot be proven from the app: they must be tested on the device. Error-free operation is not promised and there is no warranty of any kind. Whatever you do with it, you do at your own risk - read the [Legal](#legal) section before you connect a scooter.

**Open the web app: [laufbursche42.github.io/zero-unlock](https://laufbursche42.github.io/zero-unlock/)**

Or run it yourself, no build step and no dependencies: clone the repo and serve the folder over a local HTTP server. Opening `index.html` directly as a `file://` URL will not work, the page fetches its own documents and browsers block that over `file://`.

```
git clone https://github.com/Laufbursche42/zero-unlock.git
cd zero-unlock
python -m http.server 8000
```

Any static server works. With Node installed, this does the same job:

```
npx serve .
```

Then open the printed address in a browser that supports Web Bluetooth.

**Guide: [Deutsch](GUIDE.de.md) | [English](GUIDE.en.md)** covers everything step by step, from connecting to the first send.

## What it does

- **Live values** - state (decoded), raw speed, raw battery and handlebar voltage, controller and motor temperature, hall value, and three fault words. Only what the controller reports is shown; the raw values carry no unit proven from the app.
- **Motor lock** - the immobilizer, via setting key `17`.
- **Speed limit** - a mode toggle (setting key `33`) plus a raw internal-limit ratio (key `34`). The scaling is unknown and must be tested.
- **More settings** - regeneration (key `22`), flux weakening (key `19`) and motor rotation (key `31`) as register switches, plus **Store to EEPROM** (State `0x01`) and **Controller reset** (State `0x02`).
- **Expert** - send raw bytes verbatim to any of the three characteristics, or build a setting-register write from a start index plus hex values.
- **Shortcut** - a home-screen link that locks or unlocks the motor in a single tap.

## Protocol (proven)

- Service `0F557B00-A37D-E411-BEDB-50ED7800A5A5` with three characteristics: State `0F557B01` (20-byte telemetry notify + command write), Setting `0F557B02` (chunked register dump notify + register write), Debug `0F557B04` (14-byte notify + factory write). CCCD `0x2902`, notify not indicate. No pairing, no PIN.
- **No framing**: no header, no length field, no CRC/checksum. Values are raw big-endian int16 arrays (`Util` MSB,LSB; State/fault words unsigned, the rest signed).
- State write: store `{01}`, reset `{02}`, set-refresh-period `{00, tTest, tNormal, tSetting}` (default `10`). Setting write: `[00 writeMethod][startIndex][int16 BE value ...]`. Debug write: five int16 BE.

## Honesty

Device-untested by design - you test on your own scooter, which is exactly the point of a public tool. Some register semantics are proven only app-side: the **units and scaling** of the telemetry and of the speed-limit ratio, the exact lock/mode value meaning, whether the controller enforces any gate of its own, and the firmware `< 1.6` vs `>= 1.6` setting-index remap (this page assumes the modern `>= 1.6` identity index). A report arriving in the log means the controller **sent a frame**; only the changed value appearing in the live telemetry proves a write actually took effect. Setting writes are volatile until **Store to EEPROM**.

## Legal

License: PolyForm Noncommercial, see [License](LICENSE.md). Privacy: nothing leaves your device, see [Privacy](PRIVACY.md). Trademarks: MQCON and ZERO are trademarks of their respective owners, this project is independent, see [Trademarks](TRADEMARKS.md).

Source: https://github.com/Laufbursche42/zero-unlock
