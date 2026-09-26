# BALLS — working notes for Claude

## How to work with the owner

- **Push back when an idea would hurt the app.** The goal is what's best for BALLS and its players, not doing exactly what was asked. If a request would make the app worse (harder to use, slower, less trustworthy, more work for no gain), say so plainly, explain why, and suggest something better. Then do what the owner decides.
- Say how sure you are. Separate firm calls ("this will break X") from judgement calls ("I think players would prefer Y").
- The owner isn't a developer. Explain things in plain words, give steps they can follow on a phone, and share links rather than file paths.
- Test in a real browser before saying something works. Say what you couldn't test (for example real iPhone Safari).

## The project

- `balls/` is the app source: Vite, React 19, TypeScript. It has no backend yet. All "server" behaviour is simulated in `src/state/actions.ts` and state is saved in the browser (`localStorage`, key `balls.state.v1`).
- `npm run build` typechecks, writes the whole app into one file (`balls/dist/index.html`) plus the install files from `balls/public/`, then runs `scripts/copy-builds.mjs` to refresh `app/` and `balls.html`.
- Built copies are committed so they can be opened without setup:
  - `app/` is the hosted build (installable: web manifest, icons, offline service worker). Share links point at `app/index.html`.
  - `balls.html` is the same app as a single file for downloading and sending.
  - Both are refreshed by `npm run build`. Commit them with the source change.
- `forzagame.html` is a separate older file, not part of BALLS.
- The sample data is North London, 21 made-up venues. The map is a hand-drawn SVG, not a real map service.

## Decisions so far

- Guests can browse without an account. An account is only asked for when doing something that needs one (booking, joining, saving, messaging, registering, reviewing, reporting, following). After signing up they return to the same screen.
- Agreed order of work: quick wins first (guest browsing, installable app), then choose the one core thing BALLS does best and where it launches, then build the real backend around that choice.

## Open questions for the owner

- Launch focus: which sport, which core use (filling pickup games vs booking venues), which area.
- Whether to keep the name "BALLS" (memorable, but hard to search and may put off venue partners and app stores).
- Backend and payments provider, once the focus is decided.
