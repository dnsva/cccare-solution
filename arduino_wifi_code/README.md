# Arduino MAX30102 Heart Rate Monitor

Firmware for an Arduino UNO R4 Minima with a Dragino Yun Shield and MAX30102 pulse oximeter. Reads heart-rate and SpO₂ measurements, then uploads valid heart-rate readings to ThingSpeak.

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
   Without this, the library sends its traffic over USB instead of pins 0/1.
4. Install the **DFRobot_MAX30102** library from [GitHub](https://github.com/DFRobot/DFRobot_MAX30102).
5. Copy `secrets.h.example` to `secrets.h` and paste in your ThingSpeak **Write API Key**:
   ```cpp
   #define THINGSPEAK_API_KEY "YOUR_WRITE_API_KEY"
   ```
   `secrets.h` is git-ignored, so don't commit it.

## ThingSpeak setup
- Create a channel with **Field 1** enabled for heart-rate readings (BPM).
- Sharing should be set to **Public** if the website needs to read the channel.
- The sketch uploads valid heart-rate readings every **20 seconds** by default.
- SpO₂ is measured by the sensor but is **not currently uploaded**.

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
1. Configure the Dragino shield to connect to your Wi-Fi network.
2. Power the Arduino.
3. Open the Serial Monitor at **115200 baud**.
4. The sketch reads heart rate and SpO₂ continuously.
5. Valid heart-rate readings are uploaded to ThingSpeak Field 1 every 20 seconds.
6. The Serial Monitor prints the calculated trimmed average of the five stored heart-rate readings, along with upload status messages when data is sent.

## Heart-rate processing
- The sketch stores five heart-rate readings in an array.
- `calculateHeartRateFromData()` sorts the readings, discards the highest and lowest values, and averages the remaining three.
- This average is printed to the Serial Monitor; the raw heart-rate reading is what gets uploaded to ThingSpeak.

## Known quirks
- The five-element reading array is not initialized before use, so the initial average may be incorrect.
- The current array-shifting loop runs in the wrong direction, which can overwrite readings instead of shifting them correctly.
- Invalid heart-rate readings trigger a retry after a 50 ms delay.
- ThingSpeak upload responses and process exit codes are printed to the Serial Monitor.