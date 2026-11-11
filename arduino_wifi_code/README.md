# Arduino MAX30102 Heart Rate Monitor

Firmware for an Arduino UNO R4 Minima with a Dragino Yun Shield and a MAX30102 pulse oximeter. It reads heart rate and SpO₂, smooths the heart rate with a trimmed average, and uploads the smoothed value to ThingSpeak.

## Hardware
- Arduino UNO R4 Minima
- Dragino Yun Shield, stacked on top and pushed fully onto the headers (firmware: Dragino-v2 common-2.0.5)
- MAX30102 pulse oximeter, connected over I²C (SDA: A4, SCL: A5)
- Power from the DC jack (7–12V, 1A or more) is recommended. USB alone from a laptop may be less consistent for the shield.
- Pins 0 and 1 are used by the shield, so don't connect anything to them.

## Software setup
1. Arduino IDE with the **Arduino UNO R4 Boards** core (version: *1.6.0*).
2. Install the **Bridge** library from the ZIP at `github.com/arduino-libraries/Bridge` (the library is retired, so it isn't in the Library Manager).
3. **Patch the library.** In `libraries/Bridge/src/Bridge.cpp`, replace the final `#if ... #endif` block that creates `Bridge` with:
   ```cpp
   SerialBridgeClass Bridge(Serial1);
   ```
   Without this, the library sends its traffic over USB instead of pins 0/1, and `Bridge.begin()` never finishes.
4. Install the **DFRobot_MAX30102** library from [GitHub](https://github.com/DFRobot/DFRobot_MAX30102).
5. **Keep the include order.** In the sketch, `<Bridge.h>` and `<Process.h>` must come *before* `<DFRobot_MAX30102.h>`. DFRobot's header defines a `BUFFER_SIZE` macro that breaks Bridge's headers if it is included first.
6. Copy `secrets.h.example` to `secrets.h` and paste in your ThingSpeak **Write API Key**:
   ```cpp
   #define THINGSPEAK_API_KEY "YOUR_WRITE_API_KEY"
   ```
   `secrets.h` is git-ignored, so don't commit it.

## ThingSpeak setup
- Create a channel with **Field 1** enabled. It receives the smoothed heart rate (BPM).
- Set sharing to **Public** if the website needs to read the channel.
- Free accounts allow one update every 15 seconds at most. The sketch uploads every 20.
- SpO₂ is measured by the sensor but is **not currently uploaded**.

## Shield setup (first time)
1. Power the Arduino and wait for the `Dragino-…` WiFi network to appear.
2. Join it and open `http://192.168.240.1` (log in as `root`).
3. Set the shield to join your phone's hotspot. The shield only supports 2.4 GHz, so on iPhone turn on **Maximize Compatibility**.
4. If the shield stops responding, hold the **Failsafe** button for 5 seconds to reset its WiFi settings before trying again.

## Sensor configuration
The MAX30102 is configured with:
- LED brightness: 60
- Sample averaging: 8
- Mode: Multi-LED
- Sample rate: 400
- Pulse width: 411
- ADC range: 16384

If the sensor fails to initialize, the sketch prints `MAX30102 not found!` and retries every 200 ms until initialization succeeds.

## Running it
1. Turn the phone hotspot **on first**, then power the Arduino.
2. Open the Serial Monitor at **115200 baud**. Nothing prints at first: `Bridge.begin()` runs before the sensor is initialized and can take a minute or more.
3. Place a finger firmly on the sensor.
4. The Serial Monitor shows `New heart rate` and `Calculated (smoothed) heart rate` for each valid reading, and `Invalid input, retrying...` when the sensor has no valid reading.
5. A reading is uploaded to ThingSpeak Field 1 only when **all** of these are true:
   - at least 20 seconds have passed since the last upload (`uploadInterval`)
   - a valid reading arrived within the last 10 seconds (`signalTimeout`)
   - a smoothed average exists (at least 3 readings are stored)
6. Each upload prints the process exit code (`0` = request sent), ThingSpeak's reply (a positive number means the reading was saved; `0` means it was rejected), and the value sent.

Adjustable settings at the top of the sketch: `uploadInterval` (20000 ms), `signalTimeout` (10000 ms), `sensorRetryDelay` (50 ms), and `maxReadings` (5).

## Heart-rate processing
- The sketch keeps the 5 most recent valid heart-rate readings (`maxReadings`), newest first.
- With fewer than 3 readings there is no average yet (the value is `-1`), and nothing is uploaded.
- `calculateTrimmedMean()` sorts a copy of the readings, discards the highest and lowest, and averages the rest. With a full buffer of 5, that is the middle three.
- This smoothed value is what is printed and uploaded to ThingSpeak.

## Known quirks
- The Serial Monitor can time out right after an upload. Wait a few seconds and reopen it.
- SSH to the shield needs extra options for its old firmware:
  `ssh -o KexAlgorithms=+diffie-hellman-group14-sha1 -o HostKeyAlgorithms=+ssh-rsa -o MACs=+hmac-sha1 root@<shield-ip>`
- The shield is finicky and often takes several attempts, with Failsafe resets in between, to join a new network.
- Uploads stop if no valid reading arrives for 10 seconds, but the stored readings are not cleared. If someone removes their finger and someone else puts theirs on, the first averages mix both people's readings.
- Each upload blocks sampling for a second or more (the `curl` call), so the first reading afterwards may look odd.
- Invalid readings trigger a retry after a 50 ms delay.