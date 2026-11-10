# CCCare

A clickable prototype of the CCCare app, built with Vite, React and TypeScript. It has two views, switched from the bar at the top of the page:

- **Staff (R.Kin):** sections, live heart rates against each participant's target zone, session phases, messages, and each participant's exercise program.
- **Participant:** streak calendar (today shows the class plan, with "See full plan" for the timeline and every exercise; tap a past day to see that class), and joining a live class. Participants don't log exercises: the R.Kin leads them on the video call.

All data is demo data held in memory. Reloading the page resets it, except the class chat. Chat goes through the laptop running `npm run dev`, so staff and participants on different devices see the same messages (see [Class chat](#class-chat)).

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
| `src/lib/liveDevices.tsx` | Pulls live pulse-oximeter readings from ThingSpeak |
| `server/chatRelay.ts` | Dev-server chat endpoints and the live stream pages listen on |
| `server/chat.ts` | Chat message rules and storage on the dev server |
| `src/lib/relayStream.ts` | The page's one live connection to the dev server, for chat |
| `wifi_test/` | Arduino sketch and hardware setup (uploads to ThingSpeak) |

## Class chat

Messages sync between every page connected to the same `npm run dev`: staff on a laptop, participants on phones on the same Wi-Fi, or two browser tabs.

```
page ──POST /api/chat──▶ laptop (npm run dev) ──live updates──▶ every open page
```

- Your own message shows **Sending…** until the laptop has it. If it can't get through, it shows **Not sent · Try again**.
- A page that opens or reloads gets the whole chat history.
- Messages are kept in memory only. Restarting the dev server clears every chat, on every device.
- To see what the laptop has stored: `curl http://localhost:5173/api/chat`

## Live pulse oximeter

Heart rates are simulated, except for a participant who has the real sensor assigned. The Arduino runs on its own and uploads each reading to a public ThingSpeak channel. The website pulls the channel every 15 seconds.

```
Arduino ──upload, about every 20 s──▶ ThingSpeak channel 3561813 ◀──every 15 s── staff pages
```

The Arduino and the laptop don't need to be on the same network, and `npm run dev` doesn't need to be running for the Arduino to upload. For the Arduino side (hardware, libraries, shield Wi-Fi), see [wifi_test/README.md](wifi_test/README.md).

### What the website reads

| ThingSpeak field | Meaning | Valid range |
| --- | --- | --- |
| Field 1 | Heart rate (bpm) | 30–230 |
| Field 2 | Blood oxygen, SpO₂ (%). Optional; the current sketch doesn't send it | 50–100 |

Values outside the range are skipped. The channel ID and the sensor's name (`oxi-1`) are set in `src/config.ts`.

### Using it

1. Turn on the Arduino and check its Serial Monitor shows ThingSpeak replying with an entry number.
2. In the staff view, open a section → **Participants**. Once a reading from the last minute is on ThingSpeak, each row shows **Use live sensor oxi-1**. Pick the participant wearing it.
3. Start the class. That participant's tile shows a **LIVE** badge, their real heart rate and the usual target-zone alerts.

Expect a delay of up to about 35 seconds between a heartbeat and the site: the sketch uploads every 20 seconds and the site checks every 15. If no reading newer than a minute arrives, the tile shows "Sensor not sending".

### Testing without the Arduino

Send a reading straight to ThingSpeak with the channel's **Write API Key** (it's in `wifi_test/secrets.h`). Wait at least 15 seconds between sends:

```sh
curl "https://api.thingspeak.com/update?api_key=YOUR_WRITE_KEY&field1=95"
```

To see what the site will read:

```sh
curl "https://api.thingspeak.com/channels/3561813/feeds/last.json"
```

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
