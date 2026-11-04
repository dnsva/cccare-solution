# Connecting the Arduino pulse oximeter

How to get live readings from the Arduino into the CCCare site, and what still has to be written.

The website side is done. The Arduino sketch is not: `arduino/pulse_oximeter/pulse_oximeter.ino` only describes what it has to do.

```
Arduino Uno + Wi-Fi shield ──POST /api/reading, about once a second──▶ laptop running `npm run dev`
                                                                              │
                                              staff & participant pages ◀────┘ (live updates)
```

## Before you start

Find these out. Both are usually printed on the board.

- [ ] **Wi-Fi shield model**, e.g. "ESP8266", "ESP-01", "WiFi101", "Arduino WiFi Shield"
- [ ] **Sensor model**, e.g. "MAX30102" or "MAX30100"

You'll also need:

- a phone that can run a hotspot
- a laptop with Node.js 20 or newer and the repo set up (see the README)
- the Arduino IDE

## Step by step

### 1. Wire the sensor to the Uno

1. Stack the Wi-Fi shield on the Uno. If it's a separate ESP-01 module instead of a shield, wire it as its own instructions say.
2. Connect the sensor:

   | Sensor pin | Uno pin |
   | --- | --- |
   | VIN | 3.3V or 5V. **Check your breakout's label or listing first**; some only take 3.3V. |
   | GND | GND |
   | SDA | A4 |
   | SCL | A5 |

3. Before touching Wi-Fi, run the sensor library's example sketch (e.g. the SparkFun MAX3010x "HeartRate" example). Check that a finger on the sensor gives sensible numbers in the Serial Monitor.

### 2. Put everything on one network

1. Turn on a **phone hotspot**. Don't use school Wi-Fi: networks like eduroam need a username login the shield can't do, and they usually block devices from talking to each other.
2. Connect the laptop to the hotspot.
3. If anyone wants to watch on their phone, connect it to the same hotspot.

### 3. Start the site and find the laptop's IP

1. In the repo folder, run:
   ```sh
   npm run dev
   ```
2. Vite prints something like this:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://172.20.10.3:5173/
   ```
   The `Network` address, here `172.20.10.3`, is what the Arduino sends to. Write it down.
3. If the computer asks whether Node can accept incoming connections, click **Allow**. On a Mac this is a macOS firewall popup; on Windows, a Windows Defender popup.

The IP can change each time you reconnect to the hotspot. Check this line again before every demo.

### 4. Check the site side works, without the Arduino

Do this first, so that if something goes wrong later you know it's the Arduino side.

1. In a second terminal, run:
   ```sh
   npm run fake-sensor
   ```
   It should print a line like `oxi-1  95 bpm  SpO2 97%` every second.
2. Open http://localhost:5173 and go to **R.Kin · Priya** → a section → **Participants**. Each row should show **Use live sensor oxi-1**.
3. Stop the fake sensor with Ctrl+C.

To check the network route the Arduino will use, send one reading to the Network address from the laptop:

```sh
curl -X POST http://172.20.10.3:5173/api/reading -d 'device=oxi-1&bpm=95&spo2=97&finger=1'
curl http://172.20.10.3:5173/api/devices
```

The second command should list `oxi-1`.

### 5. Set up and upload the sketch

1. Create `arduino/pulse_oximeter/secrets.h`. git ignores this file, so the hotspot password never gets committed.
   ```cpp
   #define WIFI_NAME     "your hotspot name"
   #define WIFI_PASSWORD "your hotspot password"
   #define SERVER_IP     "172.20.10.3"   // the Network IP from step 3
   #define SERVER_PORT   5173
   #define DEVICE_ID     "oxi-1"
   ```
2. Open `arduino/pulse_oximeter/pulse_oximeter.ino` in the Arduino IDE and install the libraries for your shield and sensor.
3. Upload it, open the Serial Monitor, and check that it joins the hotspot. It should print a reading and the site's reply (`204`) about once a second.

### 6. See it in the site

1. In the staff view, open the section → **Participants** → **Use live sensor oxi-1** on the person wearing it.
2. Click **Start class**, then open **Live heart rate**. Their tile shows a **LIVE** badge, their heart rate and their blood oxygen. The line under the tiles should say "● Live sensor connected".
3. To see what the participant sees, switch to **Participant · Margaret** (if the sensor is on Margaret) → **My class** → **Join class now**.

## What the Arduino has to send

One request about once a second:

```
POST /api/reading HTTP/1.1
Host: 172.20.10.3:5173
Content-Type: application/x-www-form-urlencoded
Content-Length: 36
Connection: close

device=oxi-1&bpm=92&spo2=97&finger=1
```

| Field | Rules |
| --- | --- |
| `device` | 1–32 letters, digits, `-` or `_` |
| `bpm` | 30–230. Required unless `finger` is 0 |
| `spo2` | 50–100. Optional; leave it out if the sensor's value isn't valid yet |
| `finger` | `1` or `0`. With no finger, send just `device=oxi-1&finger=0` |

Some details to get right:

- `Content-Length` must be the exact length of the body.
- The site replies `204` when the reading is accepted, or `400` with the reason when it isn't. Print the reply to the Serial Monitor.
- Don't send anything until the reading has settled.
- If nothing arrives for 5 seconds, the site shows "Sensor not sending".
- JSON works too: `{"device":"oxi-1","bpm":92,"spo2":97,"finger":true}`.

## Files that still need editing

| File | What to do | Status |
| --- | --- | --- |
| `arduino/pulse_oximeter/pulse_oximeter.ino` | Write the real sketch: fill in the shield and sensor models, include their libraries, then write `setup()` and `loop()` following the comments in the file. | **To do** |
| `arduino/pulse_oximeter/secrets.h` | Create it with the settings from step 5. Each person makes their own copy; it's gitignored. | **To do** |
| `README.md` | Add the shield and sensor models to the "Live pulse oximeter" section once they're known. | **To do** |
| `server/deviceRelay.ts` | Only edit this if the shield can't send a POST, or if the valid bpm/SpO₂ ranges should change. | Only if needed |
| `src/lib/liveDevices.tsx` | Only edit this if the Arduino sends less often than every 4 seconds: raise `LIVE_STALE_MS` (now 5000 ms). | Only if needed |

Nothing else on the website needs to change. The site, the relay, the staff and participant screens, and `npm run fake-sensor` are all done.

## If it doesn't work

| What you see | Likely cause |
| --- | --- |
| Serial Monitor: can't join Wi-Fi | Wrong hotspot name or password, or a 5 GHz-only hotspot. The shield needs 2.4 GHz; on iPhone turn on "Maximize Compatibility". |
| Serial Monitor: can't connect to the server | `SERVER_IP` is out of date, the laptop isn't on the hotspot, `npm run dev` isn't running, or the firewall blocked Node. |
| Serial Monitor shows `400` | The reading broke a rule in the table above. The reply says which. |
| No **Use live sensor** button in Participants | Nothing has arrived in the last 5 seconds. Run `curl http://localhost:5173/api/devices` to see what the site has received. |
| Tile says "Sensor not sending" | Readings stopped. Check the Arduino is still powered and connected. |
| Tile says "No finger on sensor" | The Arduino sent `finger=0`. Rest the finger gently and keep still. |
| Heart rate jumps around | Average over more beats in the sketch, and keep the finger still with light pressure. |
