# CCCare

A clickable prototype of the CCCare app, built with Vite, React and TypeScript. It has two views, switched from the bar at the top of the page:

- **Staff (R.Kin):** sections, live heart rates against each participant's target zone, session phases, messages, and each participant's exercise program.
- **Participant:** streak, "My program" for logging sets, reps and weight, and joining a live class.

All data is demo data held in memory. Reloading the page resets it.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```sh
git clone <repo url>
cd cccare-solution
npm install
npm run dev
```

Then open http://localhost:5173. The page reloads as you save files. The "Network" address Vite prints works from phones on the same Wi-Fi too.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | Checks types without building |
| `npm run build` | Typechecks, then builds to `dist/` |
| `npm run preview` | Serves the built `dist/` folder |
| `npm run fake-sensor` | Pretends to be the Arduino, for testing the live sensor without it |

## Where things live

| Path | Contents |
| --- | --- |
| `src/lib/dosage.ts` | All dosing rules: heart-rate zone, session phases, progression |
| `src/data.ts` | Seed data: staff, class types, exercises, participants, sections |
| `src/store.tsx` | In-memory app state and actions |
| `src/instructor/` | Staff screens |
| `src/participant/` | Participant screens |
| `src/components/` | Shared components |
| `src/styles/base.css` | Colors, fonts and shared styles |
| `src/lib/liveDevices.tsx` | Receives live pulse-oximeter readings in the browser |
| `server/deviceRelay.ts` | Dev-server endpoint the Arduino sends readings to |
| `arduino/` | Arduino sketch (placeholder for now) |

## Live pulse oximeter

Heart rates are simulated, except for a participant who has the real sensor assigned. The Arduino sends a reading to the laptop running `npm run dev` about once a second. Staff and participant pages update live.

```
Arduino ──POST /api/reading──▶ laptop (npm run dev) ──live updates──▶ staff & participant pages
```

It only works on the local network. Nothing is stored, so restarting the dev server forgets the sensor until it sends again.

For the full connection walkthrough, troubleshooting, and the files still to write, see [LIVE_SENSOR_SETUP.md](LIVE_SENSOR_SETUP.md).

### Setting it up

1. Put the laptop and the Arduino on the same network. A **phone hotspot** is the easiest choice. School Wi-Fi like eduroam needs a username login the Wi-Fi shield can't do, and often blocks devices from talking to each other.
2. Run `npm run dev` and note the IP in the `Network:` line, for example `172.20.10.3`. That's what the Arduino sends to. If macOS asks whether Node can accept incoming connections, allow it.
3. Turn on the Arduino. See `arduino/pulse_oximeter/pulse_oximeter.ino` for what it has to do.
4. In the staff view, open a section → **Participants**. When the sensor is sending, each row shows **Use live sensor oxi-1**. Pick the participant wearing it.
5. Start the class. That participant's tile shows a **LIVE** badge, their real heart rate and blood oxygen (SpO₂), and the usual target-zone alerts.

### Testing without the Arduino

```sh
npm run fake-sensor                      # oxi-1 at about 95 bpm
npm run fake-sensor -- --bpm 150         # above most zones, to see an alert
npm run fake-sensor -- --no-finger       # sensor on, no finger
```

Stop it with Ctrl+C, and the site shows "Sensor not sending" about 5 seconds later.

You can also send one reading by hand:

```sh
curl -X POST http://localhost:5173/api/reading -d 'device=oxi-1&bpm=95&spo2=97&finger=1'
curl http://localhost:5173/api/devices   # what the site has received
```

### What the Arduino sends

`POST http://<laptop-ip>:5173/api/reading`, with the body either as form text or as JSON:

```
device=oxi-1&bpm=92&spo2=97&finger=1
{"device":"oxi-1","bpm":92,"spo2":97,"finger":true}
```

| Field | Rules |
| --- | --- |
| `device` | 1–32 letters, digits, `-` or `_` |
| `bpm` | 30–230. Required unless `finger` is 0 |
| `spo2` | 50–100. Optional |
| `finger` | `1`/`true` or `0`/`false`. Defaults to on |

The site replies `204` when the reading is accepted, or `400` with the reason. A sensor counts as stopped when nothing has arrived for 5 seconds.

## Making changes with pull requests

Nobody pushes straight to `main`. Every change goes through a pull request (PR) so someone else sees it first.

1. **Get the latest `main`.**
   ```sh
   git checkout main
   git pull
   ```
2. **Make a branch** named after what you're doing, for example `fix-chat-scroll` or `add-rest-timer`.
   ```sh
   git checkout -b add-rest-timer
   ```
3. **Make your changes and commit them.** Keep each commit to one idea, with a message that says what changed.
   ```sh
   git add -A
   git commit -m "Add rest timer between strength sets"
   ```
4. **Check that it still builds** before you push.
   ```sh
   npm run build
   ```
5. **Push your branch.**
   ```sh
   git push -u origin add-rest-timer
   ```
6. **Open the pull request.** GitHub shows a "Compare & pull request" button after you push. Say what you changed and why, and how to see it in the app (which view, which screen). Add a screenshot for anything visual.
7. **Get a review.** At least one other group member reads the PR and either approves it or leaves comments. To fix something, commit to the same branch and push again. The PR updates itself.
8. **Merge.** Once it's approved, merge it on GitHub and delete the branch. Then everyone runs `git pull` on `main` to get it.

If `main` changed while you were working and GitHub says there are conflicts, update your branch and fix them locally:

```sh
git checkout main
git pull
git checkout add-rest-timer
git merge main
# fix the conflicted files, then:
git add -A
git commit
git push
```
