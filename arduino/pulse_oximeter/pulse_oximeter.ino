// CCCare pulse oximeter: sends heart rate and blood oxygen to the CCCare site over Wi-Fi.
//
// PLACEHOLDER. This file only describes what the sketch has to do. The real code depends on the
// exact Wi-Fi shield and sensor models, so fill those in first.
//
// ---------------------------------------------------------------------------------------------
// Hardware (fill in)
// ---------------------------------------------------------------------------------------------
//   Board:       Arduino Uno
//   Wi-Fi:       ____________  (e.g. ESP8266 / ESP-01 shield, Arduino WiFi Shield, WiFi101)
//   Sensor:      ____________  (e.g. MAX30102 or MAX30100 breakout, on I2C: SDA = A4, SCL = A5)
//
// The Uno has only 2 KB of RAM. Keep strings in flash with F("...") and avoid the String class
// where you can.
//
// ---------------------------------------------------------------------------------------------
// Libraries (depend on the models above)
// ---------------------------------------------------------------------------------------------
//   Wi-Fi:  ESP8266 shield -> WiFiEsp (or plain AT commands over SoftwareSerial)
//           WiFi101 / Arduino WiFi Shield -> WiFi101 / WiFi
//   Sensor: MAX30102 -> SparkFun MAX3010x library (heartRate + spo2_algorithm)
//           MAX30100 -> MAX30100lib (oxullo)
//
// ---------------------------------------------------------------------------------------------
// Settings: keep them in secrets.h next to this file (it's gitignored, don't commit it)
// ---------------------------------------------------------------------------------------------
//   WIFI_NAME       the network name. Use a phone hotspot: school Wi-Fi like eduroam needs a
//                   username login the shield can't do, and often blocks devices talking to
//                   each other.
//   WIFI_PASSWORD   its password.
//   SERVER_IP       the laptop's IP. Run `npm run dev` on the laptop and copy the IP from the
//                   "Network:" line, e.g. 172.20.10.3. It can change when you reconnect.
//   SERVER_PORT     5173
//   DEVICE_ID       "oxi-1". Shows in the site as "Live sensor oxi-1".
//
// ---------------------------------------------------------------------------------------------
// setup()
// ---------------------------------------------------------------------------------------------
//   1. Serial.begin(9600) (or 115200) for debugging.
//   2. Start the sensor. If it isn't found, print an error and stop, since the wiring is wrong.
//   3. Start the Wi-Fi shield and join WIFI_NAME. Print the Uno's own IP once connected.
//
// ---------------------------------------------------------------------------------------------
// loop()
// ---------------------------------------------------------------------------------------------
//   1. Read the sensor continuously (the libraries expect to be read many times a second).
//   2. Finger check: if the IR value is below the library's threshold (about 50000 for MAX3010x),
//      there's no finger.
//   3. Average the heart rate over about the last 4 beats, so the number doesn't jump around.
//      Only count it as valid once it's between 30 and 230 bpm. Blood oxygen (SpO2) is valid
//      between 50 and 100; leave it out if the library says it's not valid yet.
//   4. About once a second, send one reading to the site (don't send faster than this):
//
//        POST /api/reading HTTP/1.1
//        Host: <SERVER_IP>:5173
//        Content-Type: application/x-www-form-urlencoded
//        Content-Length: <length of body>
//        Connection: close
//
//        device=oxi-1&bpm=92&spo2=97&finger=1
//
//      With no finger, send:  device=oxi-1&finger=0
//      Before the reading has settled, send nothing at all (the site waits).
//      The site replies 204 when it's accepted, or 400 with a reason (print it to Serial).
//   5. If Wi-Fi drops, reconnect. Don't block the sensor reading for long while you do.
//
// ---------------------------------------------------------------------------------------------
// Debugging
// ---------------------------------------------------------------------------------------------
//   - Print every reading to the Serial Monitor before trying Wi-Fi, to check the sensor alone.
//   - Check the site side first from the laptop, with no Arduino:
//       curl -X POST http://localhost:5173/api/reading -d 'device=oxi-1&bpm=95&spo2=97&finger=1'
//     then curl http://localhost:5173/api/devices to see what the site has received.
//   - If the Arduino can't connect but curl works: check the laptop and Arduino are on the same
//     network, SERVER_IP is current, and macOS allowed incoming connections for Node.

void setup() {}

void loop() {}
