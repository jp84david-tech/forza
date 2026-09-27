import type { CancellationPolicy, Facility, OpeningHours, Space } from './types';

/**
 * Mock venue data for North London. In production this comes from
 * GET /facilities and GET /facilities/:id/spaces.
 */

export const POLICIES: CancellationPolicy[] = [
  { id: 'flex24', name: 'Flexible', fullRefundHours: 24, summary: 'Free cancellation until 24 hours before.' },
  { id: 'flex12', name: 'Very flexible', fullRefundHours: 12, summary: 'Free cancellation until 12 hours before.' },
  {
    id: 'standard48',
    name: 'Standard',
    fullRefundHours: 48,
    partialRefundHours: 24,
    partialRefundPercent: 50,
    summary: 'Full refund until 48 hours before. 50% refund until 24 hours before.',
  },
  { id: 'session2', name: 'Sessions', fullRefundHours: 2, summary: 'Free cancellation until 2 hours before.' },
];

export const POLICY_BY_ID = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

const every = (open: number, close: number): OpeningHours => Array.from({ length: 7 }, () => [open, close] as [number, number]);
const weekdayWeekend = (wd: [number, number], we: [number, number]): OpeningHours => [we, wd, wd, wd, wd, wd, we];

const courtRules = { durations: [60, 90, 120], maxAdvanceDays: 14, peakFromHour: 17 };

export const FACILITIES: Facility[] = [
  {
    id: 'highgate-sc',
    name: 'Highgate Sports Centre',
    kind: 'sports-centre',
    area: 'Highgate',
    address: '212 Archway Road',
    postcode: 'N6 5BA',
    lat: 51.5746,
    lng: -0.1419,
    description:
      'Four floodlit hard tennis courts and two outdoor padel courts at the top of Archway Road. Balls and rackets are free to borrow at reception.',
    images: [
      { kind: 'tennis', caption: 'Court 2', variant: 'hard', time: 'day', seed: 1 },
      { kind: 'tennis', caption: 'Floodlit evenings', variant: 'hard', time: 'night', seed: 2 },
      { kind: 'padel', caption: 'Padel court A', variant: 'green', seed: 3 },
      { kind: 'changing', caption: 'Changing rooms', seed: 5 },
      { kind: 'cafe', caption: 'Café', seed: 7 },
    ],
    openingHours: weekdayWeekend([7, 23], [8, 22]),
    features: ['changing', 'showers', 'floodlights', 'parking', 'toilets', 'cafe', 'accessible', 'equipment'],
    rating: { overall: 4.6, surface: 4.7, cleanliness: 4.4, facilities: 4.6, value: 4.3 },
    reviewCount: 128,
    cancellationPolicyId: 'flex24',
    rules: courtRules,
    partner: true,
    listedAt: '2025-02-10',
    highlights: ['Free racket loan', 'Floodlit till 23:00'],
  },
  {
    id: 'tufnell-courts',
    name: 'Tufnell Park Tennis Courts',
    kind: 'park',
    area: 'Tufnell Park',
    address: 'Carleton Road',
    postcode: 'N7 0EP',
    lat: 51.5596,
    lng: -0.1318,
    description: 'Three council courts run by a local charity. The cheapest floodlit tennis in N7, and profits pay for free junior sessions on Saturdays.',
    images: [
      { kind: 'tennis', caption: 'Court 1', variant: 'park', time: 'dusk', seed: 11 },
      { kind: 'tennis', caption: 'Courts 2 and 3', variant: 'park', time: 'day', seed: 12 },
      { kind: 'entrance', caption: 'Carleton Road gate', seed: 14 },
    ],
    openingHours: every(8, 21),
    features: ['floodlights', 'toilets', 'accessible'],
    rating: { overall: 4.2, surface: 4.0, cleanliness: 4.1, facilities: 3.6, value: 4.8 },
    reviewCount: 211,
    cancellationPolicyId: 'flex24',
    rules: courtRules,
    partner: true,
    listedAt: '2024-11-02',
    highlights: ['Best value in N7'],
  },
  {
    id: 'finsbury-hub',
    name: 'Finsbury Park Tennis Centre',
    kind: 'sports-centre',
    area: 'Finsbury Park',
    address: 'Endymion Road',
    postcode: 'N4 2NQ',
    lat: 51.5706,
    lng: -0.1047,
    description: 'Six hard courts inside Finsbury Park, plus two covered padel courts by the café. Pay and play every day.',
    images: [
      { kind: 'tennis', caption: 'Courts 1 to 3', variant: 'hard', time: 'day', seed: 23 },
      { kind: 'padel', caption: 'Covered padel', seed: 22 },
      { kind: 'seating', caption: 'Courtside benches', seed: 24 },
      { kind: 'cafe', caption: 'Park café', seed: 25 },
    ],
    openingHours: every(7, 22),
    features: ['changing', 'showers', 'parking', 'floodlights', 'toilets', 'cafe', 'accessible', 'seating'],
    rating: { overall: 4.4, surface: 4.5, cleanliness: 4.2, facilities: 4.4, value: 4.5 },
    reviewCount: 318,
    cancellationPolicyId: 'flex24',
    rules: courtRules,
    partner: false,
    listedAt: '2024-09-15',
  },
  {
    id: 'camden-padel',
    name: 'Camden Rooftop Padel',
    kind: 'club',
    area: 'Camden Town',
    address: 'Rooftop, 14 Pratt Street',
    postcode: 'NW1 0AB',
    lat: 51.5405,
    lng: -0.1388,
    description: 'Three covered padel courts on a car park roof, with views over Camden. Floodlit until late and busy after work.',
    images: [
      { kind: 'padel', caption: 'Court 1', time: 'dusk', seed: 31 },
      { kind: 'padel', caption: 'Under the lights', variant: 'green', time: 'night', seed: 32 },
      { kind: 'seating', caption: 'Rooftop bar', seed: 33 },
    ],
    openingHours: every(7, 23),
    features: ['floodlights', 'equipment', 'toilets', 'seating'],
    rating: { overall: 4.5, surface: 4.6, cleanliness: 4.4, facilities: 4.2, value: 3.9 },
    reviewCount: 74,
    cancellationPolicyId: 'flex12',
    rules: { durations: [60, 90], maxAdvanceDays: 14, peakFromHour: 17 },
    partner: true,
    listedAt: '2026-06-02',
    highlights: ['Open till 23:00'],
  },
  {
    id: 'dartmouth-tennis',
    name: 'Dartmouth Park Tennis Club',
    kind: 'club',
    area: 'Dartmouth Park',
    address: '3 Chester Road',
    postcode: 'N19 5DE',
    lat: 51.5627,
    lng: -0.1429,
    description:
      'A friendly members’ club that opens its courts to pay-and-play bookings. Two floodlit acrylic hard courts and two artificial clay courts. Racket hire at the clubhouse.',
    images: [
      { kind: 'tennis', caption: 'Clay court', variant: 'clay', time: 'day', seed: 61 },
      { kind: 'tennis', caption: 'Floodlit hard court', variant: 'hard', time: 'night', seed: 62 },
      { kind: 'seating', caption: 'Clubhouse terrace', seed: 63 },
      { kind: 'equipment', caption: 'Racket hire', variant: 'tennis', seed: 64 },
    ],
    openingHours: every(7, 22),
    features: ['changing', 'showers', 'floodlights', 'equipment', 'toilets', 'seating'],
    rating: { overall: 4.7, surface: 4.8, cleanliness: 4.7, facilities: 4.5, value: 4.2 },
    reviewCount: 86,
    cancellationPolicyId: 'standard48',
    rules: courtRules,
    partner: true,
    listedAt: '2024-12-05',
  },
  {
    id: 'queens-wood',
    name: 'Queen’s Wood Park Courts',
    kind: 'park',
    area: 'Highgate',
    address: 'Muswell Hill Road',
    postcode: 'N10 3JB',
    lat: 51.5818,
    lng: -0.1437,
    description: 'Three council tennis courts on the edge of Queen’s Wood. Quiet, cheap and shaded in the afternoon. No floodlights.',
    images: [
      { kind: 'tennis', caption: 'Court 1', variant: 'park', time: 'day', seed: 71 },
      { kind: 'tennis', caption: 'Morning light', variant: 'park', time: 'dusk', seed: 72 },
    ],
    openingHours: every(7, 20),
    features: ['toilets'],
    rating: { overall: 4.0, surface: 3.6, cleanliness: 4.0, facilities: 3.2, value: 4.9 },
    reviewCount: 39,
    cancellationPolicyId: 'flex12',
    rules: courtRules,
    partner: false,
    listedAt: '2024-07-30',
  },
  {
    id: 'archway-padel',
    name: 'Archway Padel Club',
    kind: 'club',
    area: 'Archway',
    address: 'Unit 4, Vorley Road',
    postcode: 'N19 5HE',
    lat: 51.5646,
    lng: -0.1331,
    description: 'Four indoor panoramic padel courts in a converted warehouse off Junction Road. Beginner clinics every weekday evening and a social mix-in on Sundays.',
    images: [
      { kind: 'padel', caption: 'Court 2', time: 'day', seed: 81 },
      { kind: 'padel', caption: 'Panoramic glass', variant: 'blue', seed: 82 },
      { kind: 'cafe', caption: 'Bar and lounge', seed: 83 },
      { kind: 'changing', caption: 'Changing rooms', seed: 84 },
    ],
    openingHours: every(7, 23),
    features: ['changing', 'showers', 'equipment', 'cafe', 'toilets', 'accessible', 'seating'],
    rating: { overall: 4.7, surface: 4.9, cleanliness: 4.8, facilities: 4.7, value: 4.0 },
    reviewCount: 93,
    cancellationPolicyId: 'flex12',
    rules: { durations: [60, 90], maxAdvanceDays: 14, peakFromHour: 17 },
    partner: true,
    listedAt: '2026-08-28',
    highlights: ['Racket hire £3'],
  },
  {
    id: 'clocktower-padel',
    name: 'Clocktower Padel',
    kind: 'club',
    area: 'Crouch End',
    address: '8 Park Road',
    postcode: 'N8 8TE',
    lat: 51.5807,
    lng: -0.1262,
    description: 'Two covered outdoor padel courts behind the Crouch End clock tower. Floodlit, and the roof keeps the rain off.',
    images: [
      { kind: 'padel', caption: 'Court 1', variant: 'green', time: 'dusk', seed: 91 },
      { kind: 'padel', caption: 'Under the roof', variant: 'green', time: 'night', seed: 92 },
    ],
    openingHours: every(8, 22),
    features: ['equipment', 'toilets', 'floodlights'],
    rating: { overall: 4.4, surface: 4.5, cleanliness: 4.3, facilities: 3.9, value: 4.3 },
    reviewCount: 29,
    cancellationPolicyId: 'flex12',
    rules: { durations: [60, 90], maxAdvanceDays: 14, peakFromHour: 17 },
    partner: false,
    listedAt: '2026-09-12',
  },
  {
    id: 'crouch-end-padel',
    name: 'Crouch End Padel Hall',
    kind: 'club',
    area: 'Crouch End',
    address: 'Tottenham Lane',
    postcode: 'N8 7EE',
    lat: 51.5832,
    lng: -0.1188,
    description: 'Three indoor padel courts in an old sports hall. Warm, dry and bookable from 07:00, with a small pro shop by the door.',
    images: [
      { kind: 'padel', caption: 'Court 3', seed: 101 },
      { kind: 'padel', caption: 'Indoor courts', variant: 'blue', time: 'night', seed: 102 },
      { kind: 'equipment', caption: 'Pro shop', variant: 'tennis', seed: 103 },
    ],
    openingHours: every(7, 22),
    features: ['changing', 'showers', 'equipment', 'toilets', 'accessible'],
    rating: { overall: 4.5, surface: 4.6, cleanliness: 4.5, facilities: 4.4, value: 4.1 },
    reviewCount: 52,
    cancellationPolicyId: 'flex24',
    rules: { durations: [60, 90], maxAdvanceDays: 14, peakFromHour: 17 },
    partner: true,
    listedAt: '2026-03-18',
  },
  {
    id: 'holloway-tennis',
    name: 'Holloway Indoor Tennis',
    kind: 'sports-centre',
    area: 'Holloway',
    address: '380 Holloway Road',
    postcode: 'N7 6PJ',
    lat: 51.5541,
    lng: -0.1162,
    description: 'Four indoor acrylic courts under a heated dome. The go-to when it rains, so evenings book up early.',
    images: [
      { kind: 'tennis', caption: 'Court 1', variant: 'hard', time: 'night', seed: 111 },
      { kind: 'tennis', caption: 'Under the dome', variant: 'hard', seed: 112 },
      { kind: 'changing', caption: 'Changing rooms', seed: 113 },
    ],
    openingHours: weekdayWeekend([6.5, 23], [8, 21]),
    features: ['changing', 'showers', 'equipment', 'toilets', 'cafe', 'accessible'],
    rating: { overall: 4.5, surface: 4.7, cleanliness: 4.4, facilities: 4.5, value: 3.8 },
    reviewCount: 147,
    cancellationPolicyId: 'standard48',
    rules: courtRules,
    partner: true,
    listedAt: '2025-05-21',
    highlights: ['Indoor, all year'],
  },
  {
    id: 'waterlow-park',
    name: 'Waterlow Park Courts',
    kind: 'park',
    area: 'Highgate',
    address: 'Highgate Hill',
    postcode: 'N6 5HD',
    lat: 51.5687,
    lng: -0.1444,
    description: 'Two free public courts on the slope of Waterlow Park. First come, first served. Bring your own net strap.',
    images: [
      { kind: 'tennis', caption: 'Court 1', variant: 'park', time: 'day', seed: 121 },
      { kind: 'tennis', caption: 'Evening', variant: 'park', time: 'dusk', seed: 122 },
    ],
    openingHours: every(7.5, 20),
    features: ['toilets', 'cafe', 'accessible'],
    rating: { overall: 4.2, surface: 3.8, cleanliness: 4.3, facilities: 3.6, value: 5 },
    reviewCount: 51,
    cancellationPolicyId: 'flex24',
    rules: courtRules,
    partner: false,
    listedAt: '2024-08-12',
    highlights: ['Free'],
  },
  {
    id: 'muswell-ltc',
    name: 'Muswell Hill Lawn Tennis Club',
    kind: 'club',
    area: 'Muswell Hill',
    address: 'Coppetts Road',
    postcode: 'N10 1JP',
    lat: 51.5873,
    lng: -0.1388,
    description: 'Grass courts in summer and artificial clay all year. Visitors can book any court not taken by members.',
    images: [
      { kind: 'tennis', caption: 'Clay court 1', variant: 'clay', time: 'day', seed: 131 },
      { kind: 'tennis', caption: 'Grass court', variant: 'park', time: 'day', seed: 132 },
      { kind: 'seating', caption: 'Pavilion', seed: 133 },
    ],
    openingHours: every(8, 21),
    features: ['changing', 'showers', 'parking', 'toilets', 'seating', 'equipment'],
    rating: { overall: 4.8, surface: 4.9, cleanliness: 4.7, facilities: 4.6, value: 4.0 },
    reviewCount: 61,
    cancellationPolicyId: 'standard48',
    rules: courtRules,
    partner: false,
    listedAt: '2025-01-09',
  },
];

const sp = (s: Omit<Space, 'venueType' | 'unit' | 'capacity'> & Partial<Pick<Space, 'venueType' | 'unit' | 'capacity'>>): Space => ({
  venueType: 'outdoor',
  unit: 'hour',
  capacity: 4,
  ...s,
});

const hard = { surface: 'Acrylic hard', play: 'Singles & doubles' };

/** Bookable courts. Prices in pence per hour. */
export const SPACES: Space[] = [
  // Highgate Sports Centre
  sp({ id: 'hsc-t1', facilityId: 'highgate-sc', sport: 'tennis', name: 'Court 1', attrs: hard, offPeak: 1200, peak: 1600 }),
  sp({ id: 'hsc-t2', facilityId: 'highgate-sc', sport: 'tennis', name: 'Court 2', attrs: hard, offPeak: 1200, peak: 1600 }),
  sp({ id: 'hsc-t3', facilityId: 'highgate-sc', sport: 'tennis', name: 'Court 3', attrs: hard, offPeak: 1200, peak: 1600 }),
  sp({ id: 'hsc-t4', facilityId: 'highgate-sc', sport: 'tennis', name: 'Court 4', attrs: hard, offPeak: 1200, peak: 1600 }),
  sp({ id: 'hsc-pa', facilityId: 'highgate-sc', sport: 'padel', name: 'Padel A', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 2600, peak: 3600 }),
  sp({ id: 'hsc-pb', facilityId: 'highgate-sc', sport: 'padel', name: 'Padel B', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2400, peak: 3400 }),

  // Tufnell Park Tennis Courts
  sp({ id: 'tpt-1', facilityId: 'tufnell-courts', sport: 'tennis', name: 'Court 1', attrs: { surface: 'Tarmac, floodlit', play: 'Singles & doubles' }, offPeak: 700, peak: 1000 }),
  sp({ id: 'tpt-2', facilityId: 'tufnell-courts', sport: 'tennis', name: 'Court 2', attrs: { surface: 'Tarmac, floodlit', play: 'Singles & doubles' }, offPeak: 700, peak: 1000 }),
  sp({ id: 'tpt-3', facilityId: 'tufnell-courts', sport: 'tennis', name: 'Court 3', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 700, peak: 900 }),

  // Finsbury Park Tennis Centre
  sp({ id: 'fph-t1', facilityId: 'finsbury-hub', sport: 'tennis', name: 'Court 1', attrs: { surface: 'Hard', play: 'Singles & doubles' }, offPeak: 900, peak: 1200 }),
  sp({ id: 'fph-t2', facilityId: 'finsbury-hub', sport: 'tennis', name: 'Court 2', attrs: { surface: 'Hard', play: 'Singles & doubles' }, offPeak: 900, peak: 1200 }),
  sp({ id: 'fph-t3', facilityId: 'finsbury-hub', sport: 'tennis', name: 'Court 3', attrs: { surface: 'Hard', play: 'Singles & doubles' }, offPeak: 900, peak: 1200 }),
  sp({ id: 'fph-pa', facilityId: 'finsbury-hub', sport: 'padel', name: 'Padel 1', venueType: 'covered', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2200, peak: 3000 }),
  sp({ id: 'fph-pb', facilityId: 'finsbury-hub', sport: 'padel', name: 'Padel 2', venueType: 'covered', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2200, peak: 3000 }),

  // Camden Rooftop Padel
  sp({ id: 'crp-1', facilityId: 'camden-padel', sport: 'padel', name: 'Court 1', venueType: 'covered', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 3400, peak: 4600 }),
  sp({ id: 'crp-2', facilityId: 'camden-padel', sport: 'padel', name: 'Court 2', venueType: 'covered', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 3400, peak: 4600 }),
  sp({ id: 'crp-3', facilityId: 'camden-padel', sport: 'padel', name: 'Court 3', venueType: 'covered', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 3000, peak: 4200 }),

  // Dartmouth Park Tennis Club
  sp({ id: 'dpt-1', facilityId: 'dartmouth-tennis', sport: 'tennis', name: 'Court 1', attrs: { surface: 'Acrylic hard, floodlit', play: 'Singles & doubles' }, offPeak: 1400, peak: 2000 }),
  sp({ id: 'dpt-2', facilityId: 'dartmouth-tennis', sport: 'tennis', name: 'Court 2', attrs: { surface: 'Acrylic hard, floodlit', play: 'Singles & doubles' }, offPeak: 1400, peak: 2000 }),
  sp({ id: 'dpt-3', facilityId: 'dartmouth-tennis', sport: 'tennis', name: 'Court 3', attrs: { surface: 'Artificial clay', play: 'Singles & doubles' }, offPeak: 1600, peak: 2200 }),
  sp({ id: 'dpt-4', facilityId: 'dartmouth-tennis', sport: 'tennis', name: 'Court 4', attrs: { surface: 'Artificial clay', play: 'Singles & doubles' }, offPeak: 1600, peak: 2200 }),

  // Queen's Wood
  sp({ id: 'qw-1', facilityId: 'queens-wood', sport: 'tennis', name: 'Court 1', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 800, peak: 1000 }),
  sp({ id: 'qw-2', facilityId: 'queens-wood', sport: 'tennis', name: 'Court 2', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 800, peak: 1000 }),
  sp({ id: 'qw-3', facilityId: 'queens-wood', sport: 'tennis', name: 'Court 3', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 800, peak: 1000 }),

  // Archway Padel
  sp({ id: 'ap-1', facilityId: 'archway-padel', sport: 'padel', name: 'Court 1', venueType: 'indoor', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 3200, peak: 4400 }),
  sp({ id: 'ap-2', facilityId: 'archway-padel', sport: 'padel', name: 'Court 2', venueType: 'indoor', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 3200, peak: 4400 }),
  sp({ id: 'ap-3', facilityId: 'archway-padel', sport: 'padel', name: 'Court 3', venueType: 'indoor', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2800, peak: 4000 }),
  sp({ id: 'ap-4', facilityId: 'archway-padel', sport: 'padel', name: 'Court 4', venueType: 'indoor', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2800, peak: 4000 }),

  // Clocktower Padel
  sp({ id: 'ctp-1', facilityId: 'clocktower-padel', sport: 'padel', name: 'Court 1', venueType: 'covered', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 2800, peak: 3800 }),
  sp({ id: 'ctp-2', facilityId: 'clocktower-padel', sport: 'padel', name: 'Court 2', venueType: 'covered', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2600, peak: 3600 }),

  // Crouch End Padel Hall
  sp({ id: 'cep-1', facilityId: 'crouch-end-padel', sport: 'padel', name: 'Court 1', venueType: 'indoor', attrs: { court: 'Panoramic', walls: 'Glass' }, offPeak: 3000, peak: 4200 }),
  sp({ id: 'cep-2', facilityId: 'crouch-end-padel', sport: 'padel', name: 'Court 2', venueType: 'indoor', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2800, peak: 3800 }),
  sp({ id: 'cep-3', facilityId: 'crouch-end-padel', sport: 'padel', name: 'Court 3', venueType: 'indoor', attrs: { court: 'Standard', walls: 'Glass & mesh' }, offPeak: 2800, peak: 3800 }),

  // Holloway Indoor Tennis
  sp({ id: 'hit-1', facilityId: 'holloway-tennis', sport: 'tennis', name: 'Court 1', venueType: 'indoor', attrs: hard, offPeak: 2000, peak: 2800 }),
  sp({ id: 'hit-2', facilityId: 'holloway-tennis', sport: 'tennis', name: 'Court 2', venueType: 'indoor', attrs: hard, offPeak: 2000, peak: 2800 }),
  sp({ id: 'hit-3', facilityId: 'holloway-tennis', sport: 'tennis', name: 'Court 3', venueType: 'indoor', attrs: hard, offPeak: 2000, peak: 2800 }),
  sp({ id: 'hit-4', facilityId: 'holloway-tennis', sport: 'tennis', name: 'Court 4', venueType: 'indoor', attrs: hard, offPeak: 2000, peak: 2800 }),

  // Waterlow Park (free, walk-up)
  sp({ id: 'wp-1', facilityId: 'waterlow-park', sport: 'tennis', name: 'Court 1', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 0, peak: 0, walkUp: true }),
  sp({ id: 'wp-2', facilityId: 'waterlow-park', sport: 'tennis', name: 'Court 2', attrs: { surface: 'Tarmac', play: 'Singles & doubles' }, offPeak: 0, peak: 0, walkUp: true }),

  // Muswell Hill LTC
  sp({ id: 'mltc-1', facilityId: 'muswell-ltc', sport: 'tennis', name: 'Clay court 1', attrs: { surface: 'Artificial clay', play: 'Singles & doubles' }, offPeak: 1500, peak: 2000 }),
  sp({ id: 'mltc-2', facilityId: 'muswell-ltc', sport: 'tennis', name: 'Clay court 2', attrs: { surface: 'Artificial clay', play: 'Singles & doubles' }, offPeak: 1500, peak: 2000 }),
  sp({ id: 'mltc-g', facilityId: 'muswell-ltc', sport: 'tennis', name: 'Grass court', attrs: { surface: 'Grass (May to Sept)', play: 'Singles & doubles' }, offPeak: 1800, peak: 2400 }),
];

export const FACILITY_BY_ID: Record<string, Facility> = Object.fromEntries(FACILITIES.map((f) => [f.id, f]));
export const SPACE_BY_ID: Record<string, Space> = Object.fromEntries(SPACES.map((s) => [s.id, s]));

export const spacesFor = (facilityId: string) => SPACES.filter((s) => s.facilityId === facilityId);

export const FEATURE_LABELS: Record<string, string> = {
  changing: 'Changing rooms',
  showers: 'Showers',
  parking: 'Parking',
  floodlights: 'Floodlights',
  equipment: 'Equipment hire',
  accessible: 'Step-free access',
  toilets: 'Toilets',
  cafe: 'Café',
  seating: 'Spectator seating',
};

export const KIND_LABELS: Record<string, string> = {
  'sports-centre': 'Sports centre',
  club: 'Club',
  park: 'Park',
  gym: 'Gym',
  pool: 'Pool',
  court: 'Public court',
  pitch: 'Pitches',
};
