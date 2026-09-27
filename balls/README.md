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

**Demo account:** on the welcome screen tap **I have an account** and log in with any email and a password of 8 or more characters. That opens David's account: court bookings with a cost split in progress, a coach lesson, joined games, friends and two friend requests. **Get started** runs the real onboarding and creates a fresh, empty account instead.

## What's in it

BALLS is focused on **tennis and padel**.

| Area | What works |
| --- | --- |
| **Home** | Welcome screen with your next booking, a "Book a court" card with a slow picture slideshow, and shortcuts to Play and Coaches. Profile and settings open from the avatar. |
| **Explore** | Map and list of every padel and tennis venue nearby, filters, venue pages with photos, courts, prices, reviews, directions and availability alerts. |
| **Book → Book** | Pick padel or tennis, a day and a time of day, and see every free court nearby with its prices. Tap a time to book, split the cost and pay. |
| **Book → My bookings** | Upcoming, past and cancelled courts, games you've joined and coach lessons, with check-in codes, who's paid and cancellation with refunds. |
| **Friends → Play** | Open games that need players. Join and pay your share, chat with the group, or create your own game. |
| **Friends → Coaches** | Six local coaches. Pick a length, just you or you and a friend, a day and a time, and pay. Cancel free up to 24 hours before. |
| **Friends → Friends** | Search by username. Add people; they show as friends once you've both added each other. Accept or decline requests. Sign-up tells you if a username is taken and suggests another. |

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
