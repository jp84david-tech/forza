# BALLS — working notes for Claude

## How to work with the owner

- **Push back when an idea would hurt the app.** The goal is what's best for BALLS and its players, not doing exactly what was asked. If a request would make the app worse (harder to use, slower, less trustworthy, more work for no gain), say so plainly, explain why, and suggest something better. Then do what the owner decides.
- Say how sure you are. Separate firm calls ("this will break X") from judgement calls ("I think players would prefer Y").
- The owner isn't a developer. Explain things in plain words, give steps they can follow on a phone, and share links rather than file paths.
- Test in a real browser before saying something works. Say what you couldn't test (for example real iPhone Safari).

## The project

- `balls/` is the app source: Vite, React 19, TypeScript. It has no backend yet. All "server" behaviour is simulated in `src/state/actions.ts` and state is saved in the browser (`localStorage`, key `balls.state.v2`; bump the key when saved data would no longer make sense).
- `npm run build` typechecks, writes the whole app into one file (`balls/dist/index.html`) plus the install files from `balls/public/`, then runs `scripts/copy-builds.mjs` to refresh `app/` and `balls.html`.
- Built copies are committed so they can be opened without setup:
  - `app/` is the hosted build (installable: web manifest, icons, offline service worker). Share links point at `app/index.html`.
  - `balls.html` is the same app as a single file for downloading and sending.
  - Both are refreshed by `npm run build`. Commit them with the source change.
- `forzagame.html` is a separate older file, not part of BALLS.
- The sample data is North London: 12 made-up tennis and padel venues, 14 open games, 6 coaches, 30 players. The map is a hand-drawn SVG, not a real map service.
- The full sport catalogue still exists in `data/sports.ts` for types; what the app shows comes from `PLAYABLE` (padel, tennis).

## App structure

- Bottom bar: **Home · Explore · Book · Friends** (`state/nav.ts`, `App.tsx`).
- Book and Friends each have a second switch that floats just above the bottom bar (`SubBar` in `App.tsx`, state in `nav.sub`). It only shows on the tab's first screen.
  - Book: **Book** (find a free court by sport, day and time: `screens/BookHub.tsx`) and **My bookings** (courts, joined games and coach lessons).
  - Friends: **Play** (open games to join), **Coaches** (book and pay for lessons), **Friends** (username search; people show as friends once both have added each other). All in `screens/FriendsHub.tsx`.
- Home is a simple welcome screen: greeting, next booking, a "Book a court" card with a slow picture slideshow, and Play / Coaches tiles. Profile and settings open from the avatar (guests: the person icon).
- Competitions, events, training pages, feed and stats still exist as screens but have no way in from the main navigation.

## Decisions so far

- Guests can browse without an account. An account is only asked for when doing something that needs one (booking, joining, saving, messaging, registering, reviewing, reporting, following). After signing up they return to the same screen.
- Agreed order of work: quick wins first (guest browsing, installable app), then choose the one core thing BALLS does best and where it launches, then build the real backend around that choice.
- Launch focus (Sept 2026): **tennis and padel only**. Three main features: booking courts, and in the Friends area, playing with others and booking coaches. Colours, name and logos stay as they are.
- Words are green, white or black. Secondary text is white (or black in light mode) at lower opacity, not grey. Form error messages stay red so mistakes stand out.

## Design (Sept 2026 redesign, from the owner's mockup and logos)

- Dark first: background `#0b1410`, cards `#131f1a`, accent lime `#d4ff3a` with dark text on it. Light mode exists; accent text there is dark green `#3f6b00`. Tokens live in `balls/src/styles/tokens.css`.
- Fonts: Barlow (UI), Barlow Condensed (big titles, countdowns), Archivo 900 only for the "balls" wordmark.
- Small corner radii (4 to 10px), 1px outlines, no gradients or glows. Sport colours are all the one accent.
- Logos: the lime square "b" mark is the app icon and splash (`public/icons`, drawn as vector in `components/icons.tsx`). The lockup (mark + "balls") is used everywhere else. The logo lime is `#9ef01a`, slightly different from the UI lime `#d4ff3a` (both as supplied).
- 24-hour times ("19:30"). Plain, short copy: no slogans, exclamation marks or em dashes in UI text.

## Open questions for the owner

- Launch area (currently North London sample data).
- Whether the logo lime and UI lime should be the same colour.
- Backend and payments provider, once the focus is decided.
