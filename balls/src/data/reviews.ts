import { clamp } from '../lib/format';
import { pick, rng } from '../lib/rng';
import { ago } from './schedule';
import { FACILITIES, spacesFor } from './facilities';
import { PEOPLE } from './people';
import type { Facility, Review, SportId } from './types';

/**
 * Venue reviews. A handful are hand-written; the rest are generated from
 * sport-aware sentence banks so every venue has a believable history.
 * In production: GET /facilities/:id/reviews?cursor=…
 */

const HANDWRITTEN: Array<Omit<Review, 'id' | 'at'> & { daysAgo: number }> = [
  {
    facilityId: 'highgate-sc', userId: 'u1', sport: 'football', daysAgo: 3,
    rating: { overall: 5, surface: 5, cleanliness: 4, facilities: 5, value: 4 },
    text: 'Best 5-a-side pitches this side of Archway Road. The floodlights are bright, the 3G is barely worn and bibs are free. Only gripe: the car park fills up after 7.',
    photos: [{ kind: 'football', caption: 'Pitch 2', time: 'night', seed: 901 }],
  },
  {
    facilityId: 'highgate-sc', userId: 'u4', sport: 'basketball', daysAgo: 9,
    rating: { overall: 5, surface: 5, cleanliness: 5, facilities: 4, value: 4 },
    text: 'The main hall floor is superb for basketball: proper sprung wood and firm rims. Booked through BALLS and split it six ways in about a minute.',
  },
  {
    facilityId: 'highgate-sc', userId: 'u9', sport: 'football', daysAgo: 16,
    rating: { overall: 4, surface: 4, cleanliness: 3, facilities: 4, value: 4 },
    text: 'Good pitches and easy booking. The changing rooms are a bit tired, but the showers were hot and the café does a decent bacon roll.',
  },
  {
    facilityId: 'tufnell-pitch', userId: 'u15', sport: 'football', daysAgo: 2,
    rating: { overall: 4, surface: 4, cleanliness: 4, facilities: 3, value: 5 },
    text: 'Unbeatable price for floodlit football. The cages are tight, so sharpen your passing. Money goes to the junior sessions, which is a nice bonus.',
  },
  {
    facilityId: 'archway-padel', userId: 'u10', sport: 'padel', daysAgo: 4,
    rating: { overall: 5, surface: 5, cleanliness: 5, facilities: 5, value: 4 },
    text: 'Court 2 is the one: panoramic glass, perfect bounce. Staff are lovely, and the beginner clinic got my partner hooked in one evening.',
    photos: [{ kind: 'padel', caption: 'Court 2', seed: 902 }],
  },
  {
    facilityId: 'dartmouth-tennis', userId: 'u3', sport: 'tennis', daysAgo: 6,
    rating: { overall: 5, surface: 5, cleanliness: 5, facilities: 4, value: 4 },
    text: 'The artificial clay is a joy, slow enough for long rallies. Lights are good for evening doubles. Racket hire saved me when I forgot mine.',
  },
  {
    facilityId: 'gospel-oak-lido', userId: 'u26', sport: 'swimming', daysAgo: 1,
    rating: { overall: 5, surface: 5, cleanliness: 4, facilities: 4, value: 5 },
    text: 'The 7am slot is the best way to start a day in London. Cold, clear and quiet. Booking a slot in advance means no queue at the gate.',
    photos: [{ kind: 'swimming', caption: 'Morning swim', variant: 'lido', time: 'dusk', seed: 903 }],
  },
  {
    facilityId: 'nl-basketball', userId: 'u28', sport: 'basketball', daysAgo: 5,
    rating: { overall: 4, surface: 4, cleanliness: 3, facilities: 3, value: 5 },
    text: 'Solid free courts with new glass backboards. The evening run starts around 6. Bring water, as the fountain is hit and miss.',
  },
];

const OPENERS: Record<'high' | 'mid' | 'low', string[]> = {
  high: ['Great spot.', 'Really solid venue.', 'Our go-to for {sport}.', 'Brilliant session.', 'Easily the best {space} nearby.', 'Can’t fault it.', 'Lovely place to play.', 'Top venue.'],
  mid: ['Decent, not perfect.', 'Good for the price.', 'Does the job.', 'Mostly good.', 'Fine for a weeknight game.'],
  low: ['Disappointing this time.', 'Not our best experience.', 'Mixed night.'],
};

const SPORT_LINES: Record<SportId, string[]> = {
  football: ['The 3G is in good nick and the lights are bright.', 'Pitch was a bit worn near the goals but played fine.', 'Bibs and balls were ready when we arrived.', 'Good bounce, and the nets are actually intact.'],
  basketball: ['Rims are firm and the floor has good grip.', 'Backboards are new and the lighting is decent.', 'Plenty of room behind the baselines.'],
  tennis: ['Courts were dry and the lines freshly painted.', 'Net height was spot on.', 'The surface plays true, even late in the day.'],
  padel: ['The glass is spotless and the turf is fresh.', 'Great bounce off the walls.', 'Balls provided were new, which makes a difference.'],
  badminton: ['The floor is grippy and the lights don’t blind you on high serves.', 'Nets were set at the right height.', 'Hall was warm without being stuffy.'],
  volleyball: ['The sand is deep and clean.', 'Net tension was perfect.', 'Plenty of space around the court.'],
  cricket: ['The bowling machine is reliable and the nets are in good shape.', 'Matting has plenty of pace.', 'Lanes are properly separated.'],
  rugby: ['Pitch drains well even after rain.', 'Posts and padding in good condition.', 'Lights cover the whole pitch.'],
  running: ['The track surface is great and the lane markings are clear.', 'Quiet enough in the mornings to do proper reps.', 'Floodlights make winter sessions easy.'],
  gym: ['Plenty of racks, and I never had to wait.', 'Kit is well maintained.', 'Coaches on the floor are helpful without being pushy.'],
  swimming: ['Water was clear and the lanes weren’t overcrowded.', 'Lane etiquette is well managed.', 'Freezing, in the best way.'],
  other: ['Problems are reset often and the setters are creative.', 'Great mix of grades.', 'Mats are thick and clean.'],
};

const FEATURE_LINES = {
  good: ['Changing rooms were clean.', 'Showers were hot.', 'Staff were friendly and helpful.', 'Booking was quick and the split payment saved a lot of chasing.', 'Easy to get to from the Tube.', 'Café does a good flat white.'],
  bad: ['Started ten minutes late because the group before overran.', 'A bit pricey at peak times.', 'One of the lights flickered all game.', 'Toilets needed some attention.', 'Parking was a struggle.'],
};

const CLOSERS = ['Will be back.', 'Recommended.', 'We’ve booked again for next week.', '', 'Worth it.', 'See you there.'];

const SPACE_WORDS: Partial<Record<SportId, string>> = { football: 'pitch', rugby: 'pitch', swimming: 'pool', gym: 'gym', running: 'track', cricket: 'nets' };

function generate(f: Facility): Review[] {
  const r = rng(`reviews-${f.id}`);
  const sports = [...new Set(spacesFor(f.id).map((s) => s.sport))];
  const count = Math.min(f.reviewCount, 28);
  const out: Review[] = [];
  for (let i = 0; i < count; i++) {
    const sport = pick(r, sports);
    const drift = (r() - 0.62) * 2.2;
    const overall = clamp(Math.round(f.rating.overall + drift), 2, 5);
    const tier = overall >= 5 ? 'high' : overall >= 4 ? (r() > 0.4 ? 'high' : 'mid') : overall === 3 ? 'mid' : 'low';
    const sportName = sport === 'other' ? 'climbing' : sport;
    const opener = pick(r, OPENERS[tier]).replace('{sport}', sportName).replace('{space}', SPACE_WORDS[sport] ?? 'court');
    const parts = [opener, pick(r, SPORT_LINES[sport])];
    if (overall >= 4) parts.push(pick(r, FEATURE_LINES.good));
    else parts.push(pick(r, FEATURE_LINES.bad));
    const closer = overall >= 4 ? pick(r, CLOSERS) : '';
    if (closer) parts.push(closer);
    const sub = (k: number) => clamp(Math.round(overall + (r() - 0.5) * 1.6 + k), 1, 5);
    out.push({
      id: `${f.id}-r${i}`,
      facilityId: f.id,
      userId: PEOPLE[Math.floor(r() * PEOPLE.length)].id,
      rating: { overall, surface: sub(0.1), cleanliness: sub(-0.2), facilities: sub(-0.1), value: sub(0) },
      text: parts.join(' '),
      sport,
      at: ago(8 + i * 5 + Math.floor(r() * 5), 12 + Math.floor(r() * 8)),
      photos: r() > 0.86 ? [{ ...f.images[Math.floor(r() * Math.min(2, f.images.length))], seed: 1000 + i }] : undefined,
    });
  }
  return out;
}

export const SEED_REVIEWS: Review[] = [
  ...HANDWRITTEN.map(({ daysAgo, ...rev }, i) => ({ ...rev, id: `hw${i}`, at: ago(daysAgo, 18) })),
  ...FACILITIES.flatMap(generate),
];
