# Guide

> **Important for error reports:** switch on the **Diagnostic log** at the bottom of the page *before* you connect to the scooter. Only then is the full connection handshake captured - and those are exactly the lines we need in a [ticket](https://github.com/Laufbursche42/Laufbursche42/issues) to reproduce a problem.

## What you need
- An e-scooter with an MQCON motor controller (the service `0F557B00` must be found).
- A phone or computer with **Chrome**, **Edge**, or on iOS **Bluefy**. Safari and Firefox cannot do Web Bluetooth.

## Connecting
1. Turn on Bluetooth and wake the scooter.
2. Tap **Connect** and pick the scooter from the list.
3. If it is not listed, tick **Show all devices** and try again. The real check is the Bluetooth service `0F557B00` found, not the advertised name.
4. Once connected, the live-values, motor-lock, speed-limit and settings cards appear. The page also starts the telemetry stream (refresh period 10).

## Reading live values
The controller streams its state continuously on the State characteristic. Each tile appears once its value has arrived; a dash just means that value has not come in yet. The values are raw: voltages, temperatures and speed are shown without a unit or scaling. Below the tiles, **All received frames** lets you follow the raw data per characteristic.

## Motor lock
In the **Motor lock** card you lock or unlock the motor (immobilizer, register key 17). Note: a locked motor can only be unlocked again over Bluetooth.

## Speed limit
- The big button toggles the limit mode (register 33) on or off. It labels itself from the reported mode.
- The **Internal limit** field sets the limit ratio (register 34) as a raw value from 0 to 100.
- Important: a report in the log only means a frame arrived. Only when the live values change is the value really active. Test everything on your own device.

## More settings
Regeneration, flux weakening and motor rotation as register switches. Only rows whose value the controller reports are shown. **Store to EEPROM** (State command 0x01) makes changes permanent, because register writes are volatile until then. **Controller reset** (0x02) reboots the controller.

## Advanced settings (engine level)
**Send raw bytes** sends your hex bytes unchanged to the chosen characteristic (Setting, State or Debug). **Write register** builds a setting frame `[00 index values]` from a start index and hex values and sends it to the Setting characteristic.

## Shortcuts
Copy the link to your home screen, then one tap locks or unlocks the motor directly. On iOS via Bluefy, and the scooter must have been connected normally once before.

## If something does not work
- Cannot connect? Check that the browser supports Web Bluetooth, Bluetooth is on and the scooter is awake. Retry with **Show all devices**.
- Nothing happens after a command? Check the log: if it says "sent" but no report, the controller reported nothing back.
- **Diagnostics: list all devices** in the log area shows every Bluetooth service of a device without writing anything - useful for support.

## Contribute
Want to find out if and how tuning works on your scooter? Test this tool on your own vehicle and open a ticket on [GitHub](https://github.com/Laufbursche42/Laufbursche42/issues) - with your model and what worked (or did not). That way we figure out together what is possible on which model.
