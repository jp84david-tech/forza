# BALLS

The all-in-one local sports app: find somewhere to play, book it, split the cost, fill your game, compete and track your season.

This is a working, mobile-first prototype built with React and TypeScript. Every screen is interactive, uses realistic North London data, and keeps what you do (bookings, games, reviews, settings) on your device.

## Try it

- **Online:** open `app/index.html` from the repo through any static host (for example raw.githack.com or GitHub Pages). This copy is installable: "Add to Home screen" gives it its own icon, it opens full screen, and it works offline.
- **No setup:** open [`../balls.html`](../balls.html) in a browser. It is the whole app in one file, good for downloading or sending. A downloaded file can't be installed as an app.
- **Develop:**

  ```bash
  cd balls
  npm install
  npm run dev      # http://localhost:5173
  npm run build    # typecheck, build to dist/, then copy to ../app and ../balls.html
  ```

On a phone it runs full screen. On a desktop it appears inside a device frame, and on tablets the lists switch to two columns.

**Guests:** **Just look around** on the welcome screen opens the app without an account. Booking, joining, saving, messaging, registering, following and reporting ask for a free account first, then return you to the same screen with what you picked still selected.

**Demo account:** on the welcome screen tap **I have an account** and log in with any email and a password of 8 or more characters. That opens David's account, which has bookings, a cost split in progress, joined games, stats and notifications. **Get started** runs the real onboarding and creates a fresh, empty account instead.

## What's in it

| Area | What works |
| --- | --- |
| **Home** | Personal greeting, next game with live countdown, favourite sports first, Play Now, quick actions, nearby games, “free tonight” slots for your most-booked sport, popular venues, local feed |
| **Explore** | Pan and pinch-zoom vector map of North London with price markers, your approximate location, marker preview (price, rating, next free slot, one-tap Book), map/list toggle, sport chips, full filter sheet (sport, distance, price, date, time, venue type, facilities, rating), sort, price comparison |
| **Venues** | Photo gallery, rating breakdown, sport-specific spaces (format, surface, floodlights; court type; lanes), peak and off-peak prices, facilities, opening hours, map and directions, reviews with “load more”, write a review (only after playing there), availability alerts, report |
| **Booking** | Space → duration → day (Today / Tomorrow / This week) → time. Green is available, grey is full, brand blue is selected, always with a text label too. Waitlists on full slots, review and pay, cost splitting with exact 1p rounding, confirmation, booking page with check-in code, who has paid, cancellation with a refund quote from the venue's policy |
| **Play** | Play Now (sport → level → when → results, or your usual in one tap), find a game, game page, join and pay your share, leave (with late-cancel warning), create a game (from scratch or from a booking), invite friends, share link, group chat with safety rules |
| **Compete** | Your season, tournaments (register as a team or free agent), leagues (table, fixtures), sport-specific leaderboards (local, friends, global), achievements, events, training and coaches |
| **Profile** | Profile, sport-specific stats with form and weekly chart, achievements, saved venues, reviews, friends, public player profiles with reliability |
| **Settings** | Account, profile, sports, location, play and booking preferences, preferred maps app, notifications per category, appearance (system, light, dark), privacy, security, payment methods, blocked users, help, report a problem, terms, privacy policy, log out |
| **Venue side** | “BALLS for venues” dashboard: today's bookings, utilisation, revenue, edit prices, block out spaces (players see changes straight away), reviews |

Things other people would do in a live app are simulated so the flows can be tried alone: a waitlisted slot opens up after about 25 seconds, invited friends accept or pay their share, players join games you create, and someone replies in chat.

**Demo tools** (Settings → Demo tools) can simulate network errors so you can see the skeleton, error and retry states and a declined payment. You can also reset the demo data and view the analytics event log.

## How it's built

```
src/
  data/        Domain model (types.ts) and mock data: venues, spaces, players, games,
               tournaments, leagues, events, coaches, shops, reviews, map geometry
  services/    availability.ts   30-minute slot engine: opening hours, peak pricing,
                                 bookings, games, maintenance blocks, session capacity
               payments.ts       Tokenised payment methods, charge flow, exact cost splitting,
                                 refund quotes from cancellation policies
               discovery.ts      Venue and game recommendations, with reasons
               search.ts         Universal search (prefix, substring and typo-tolerant)
               filters.ts        Explore filters
               trust.ts          Reliability score, report reasons, chat anti-spam rules
               analytics.ts      Privacy-safe event tracking
               api.ts            Loading, caching and error boundary for screens
  state/       store.ts (persisted app state), actions.ts (every user action),
               selectors.ts (derived data), nav.ts (tab stacks), ui.ts (sheets, toasts),
               demo.ts (sample account)
  components/  Reusable UI: cards, map, availability calendar, filter sheet, sheets,
               generated venue artwork, icons, primitives
  screens/     Every screen, plus routes.ts (the route registry)
  styles/      tokens.css (light and dark palettes), base, components, screens
```

- **Data model:** entities reference each other by id, and money is stored in pence. Swapping the mock data for API calls means replacing the modules in `data/` and the action bodies in `state/actions.ts`.
- **Payments:** the app never sees card numbers. Payment methods are provider tokens plus display details. `services/payments.ts` documents the intended payment-intent flow.
- **Safety:** under-18 accounts are private by default and only see junior or venue-run activity. You can block and report users, games, venues, messages and reviews. Report volume is rate-limited. Chat blocks phone numbers and emails, rate-limits messages, and turns links off for new accounts. Location is rounded to about 500 metres and never shown to other players.
- **Accessibility:** real buttons and labels throughout, visible focus, 44px touch targets, status is never shown by colour alone, and reduced-motion support.
- **Imagery:** venue photos are generated top-down artwork, so the prototype works offline. Real photos can replace them without changing any component APIs.
