# Arduino sensor firmware (WiFi test)

Test sketch that checks an Arduino UNO R4 Minima with a Dragino Yun Shield can send readings to a ThingSpeak channel.

## Hardware
- Arduino UNO R4 Minima
- Dragino Yun Shield, stacked on top and pushed fully onto the headers (firmware: Dragino-v2 common-2.0.5)
- Power from the DC jack (7–12V, 1A or more) is recommended. USB alone from a laptop is less consistent for the shield.
- Pins 0 and 1 are used by the shield, so don't connect anything to them.

## Software setup
1. Arduino IDE with the **Arduino UNO R4 Boards** core (version: _1.6.0_).
2. Install the **Bridge** library from the ZIP at `github.com/arduino-libraries/Bridge` (the library is retired, so it isn't in the Library Manager).
3. **Patch the library.** In `libraries/Bridge/src/Bridge.cpp`, replace the final `#if ... #endif` block that creates `Bridge` with this one line:
   ```cpp
   SerialBridgeClass Bridge(Serial1);
   ```
   Without this, the library sends its traffic over USB instead of pins 0/1 and `Bridge.begin()` never finishes.
4. Copy `secrets.h.example` to `secrets.h` and paste in your ThingSpeak **Write API Key**. `secrets.h` is git-ignored, so don't commit it.

## ThingSpeak setup
- Channel with **Field 1** enabled.
- Sharing set to **Public** so the website can read it.
- Free accounts allow one update every 15 seconds at most. The sketch waits 20 by default.

## Shield setup (first time)
1. Power the Arduino and wait for the `Dragino-…` WiFi network to appear.
2. Join it and open `http://192.168.240.1` (log in as `root`).
3. Set the shield to join your phone's hotspot. The shield only supports 2.4 GHz, so on iPhone turn on **Maximize Compatibility**.
4. If the shield stops responding, hold the **Failsafe** button for 5 seconds to reset its WiFi settings before trying again.

## Running it
1. Turn the phone hotspot **on first** (otherwise the shield may revert back to its own network).
2. Then power the Arduino.
3. Open the Serial Monitor at 9600 baud. It prints `bridge ready`, then an exit code and ThingSpeak's reply every 20 seconds.

## Known quirks
- The Serial Monitor can time out right after an upload. Wait a few seconds and reopen it.
- SSH to the shield needs extra options for its old firmware:
  `ssh -o KexAlgorithms=+diffie-hellman-group14-sha1 -o HostKeyAlgorithms=+ssh-rsa -o MACs=+hmac-sha1 root@<shield-ip>`
- The shield is incredibly finicky, and often takes multiple attempts with shield resets between each attempt to set up properly on a new network. If the shield won’t join your network, check that the hotspot is on 2.4 GHz (Maximize Compatibility), recheck the password for typos, hold Failsafe for 5 seconds, and try again.