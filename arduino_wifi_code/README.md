# Arduino MAX30102 Heart Rate Monitor

Firmware for an Arduino UNO R4 Minima with a Dragino Yun Shield and a MAX30102 pulse oximeter. It measures heart rate, smooths it with a trimmed average, and uploads the smoothed value to ThingSpeak. The library also computes SpO₂, but the sketch doesn't use or upload it.

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
- ThingSpeak's rate limit applies to the whole channel, so give each program that uploads its own channel.

## Shield setup (first time)
1. Power the Arduino and wait for the `Dragino-…` WiFi network to appear.
2. Join it and open `http://192.168.240.1` (log in as `root`).
3. Set the shield to join your phone's hotspot. The shield only supports 2.4 GHz, so on iPhone turn on **Maximize Compatibility**.
4. If the shield stops responding, hold the **Failsafe** button for 5 seconds to reset its WiFi settings before trying again.

After setup, the shield joins the saved hotspot automatically at power-on, as long as the hotspot is already on. If the hotspot isn't available when the shield boots, it falls back to broadcasting its own `Dragino-…` network, and you may need to repeat the setup.

## Sensor configuration
The MAX30102 settings are hardcoded in `setup()` and were selected by testing different combinations:

| Setting | Value | Library constant |
|---|---|---|
| LED brightness | 20 (about 4 mA, typical) | `LED_BRIGHTNESS` |
| Sample averaging | 16 | `SAMPLEAVG_16` |
| Mode | Multi-LED (red + IR) | `MODE_MULTILED` |
| Sample rate | 400 samples/s | `SAMPLERATE_400` |
| Pulse width | 215 µs | `PULSEWIDTH_215` |
| ADC range | 2048 nA | `ADCRANGE_2048` |

- **Keep the effective output rate at 25 Hz.** It equals sample rate ÷ averaging (400 ÷ 16). The DFRobot library's heart-rate calculation assumes 25 Hz, so if you change one of these values, change the other so the result stays 25, and make sure the sample rate is allowed for the pulse width in the MAX30102 datasheet.
- The heart rate comes from the **IR** signal only. Red is used only for SpO₂.
- 2048 nA is the smallest ADC range, so it saturates first. If the finger setup changes (tighter strap, light shield, firmer pressure) and readings stop being valid, the signal may be clipping.
- If the sensor isn't found, the sketch prints `MAX30102 not found!` and retries every 200 ms.

## Running it
1. Turn the phone hotspot **on first**, then power the Arduino.
2. Open the Serial Monitor at **115200 baud**. The sketch prints:
   - `Connecting to WiFi shield...` immediately
   - `Shield ready` when `Bridge.begin()` finishes (this can take a minute or more)
   - `MAX30102 ready` once the sensor is initialized
3. Rest a fingertip on the sensor with **light, steady pressure** and hold still. Pressing hard can flatten the signal.
4. Each reading uses 100 samples, which takes about 4 seconds at 25 Hz. For each reading the monitor prints either `New heart rate` and `Calculated (smoothed) heart rate`, or `Invalid input, retrying...` when there is no valid reading.
5. A reading is uploaded to ThingSpeak Field 1 only when **all** of these are true:
   - at least 20 seconds have passed since the last upload (`uploadInterval`)
   - a valid reading arrived within the last 10 seconds (`signalTimeout`)
   - a smoothed average exists (at least 3 readings are stored)
6. Each upload prints the process exit code (`0` = request sent), ThingSpeak's reply (a positive number means the reading was saved; `0` means it was rejected), and the value sent.

Adjustable settings at the top of the sketch: `uploadInterval` (20000 ms), `signalTimeout` (10000 ms), `sensorRetryDelay` (50 ms), and `maxReadings` (5). The sensor settings are in `setup()`.

## Heart-rate processing
- The sketch keeps the 5 most recent valid heart-rate readings (`maxReadings`), newest first.
- With fewer than 3 readings there is no average yet (the value is `-1`), and nothing is uploaded.
- `calculateTrimmedMean()` sorts a copy of the readings, discards the highest and lowest, and averages the rest. With a full buffer of 5, that is the middle three.
- The smoothed value is uploaded **after** the current reading has been processed, so each upload carries the latest average.
- **The first reading after each upload is discarded.** The upload (`curl`) blocks sampling for a second or more, and the sensor's buffer holds only about 1.3 seconds of data, so the next window can contain mismatched samples. Expect one extra 4-second gap with no output after each upload.

## Known quirks
- The Serial Monitor can time out right after you upload the sketch to the Arduino. Wait a few seconds and reopen it.
- SSH to the shield needs extra options for its old firmware:
  `ssh -o KexAlgorithms=+diffie-hellman-group14-sha1 -o HostKeyAlgorithms=+ssh-rsa -o MACs=+hmac-sha1 root@<shield-ip>`
- The shield is finicky and often takes several attempts, with Failsafe resets in between, to join a new network.
- The sensor is initialized after the shield, so if the shield can't connect, nothing happens until `Bridge.begin()` returns.
- Uploads stop if no valid reading arrives for 10 seconds, but the stored readings are not cleared. If someone removes their finger and someone else puts theirs on, the first averages mix both people's readings.
- Each upload still pauses sampling for a second or more, so there is a short gap in the data after each one.
- Invalid readings trigger a retry after a 50 ms delay.