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

Then open http://localhost:5173. The page reloads as you save files.

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
