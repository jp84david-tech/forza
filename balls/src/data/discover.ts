import type { Coach, FeedItem, Shop, SportsEvent, TrainingSession } from './types';
import { daysUntil, minsAgo, slot } from './schedule';

/** Events, training and local services. In production: /events, /training, /services */

const sun = daysUntil(0);

export const EVENTS: SportsEvent[] = [
  {
    id: 'e2', kind: 'training', title: 'Intro to Padel Taster', sport: 'padel', facilityId: 'archway-padel', ...slot(2, 18, 60),
    price: 1000, capacity: 8, taken: 5, level: 'beginner', organiser: 'Archway Padel Club', ageRule: 'adults',
    description: 'Never played? One hour with a coach covering the grip, the walls and the scoring. Racket and balls included.',
  },
  {
    id: 'e10', kind: 'community', title: 'Sunday Social Tennis', sport: 'tennis', facilityId: 'finsbury-hub', ...slot(sun, 10, 120),
    price: 500, capacity: 16, taken: 9, level: 'casual', organiser: 'Finsbury Park Tennis Centre', ageRule: 'adults',
    description: 'Turn up, get paired, play short doubles sets. Balls provided.',
  },
];

export const COACHES: Coach[] = [
  {
    id: 'c1', name: 'Maya Okafor', sports: ['tennis'], color: '#3d5a4a', rating: 4.9, reviewCount: 64, area: 'Dartmouth Park', from: 4500, safeguarding: true, venueId: 'dartmouth-tennis',
    headline: 'Adults getting back into tennis',
    bio: 'LTA Level 4 coach. I work with adults getting back into tennis and juniors starting out. Patient, technical, fun.',
    qualifications: ['LTA Level 4 Senior Club Coach', 'First aid certified', 'DBS checked'],
  },
  {
    id: 'c2', name: 'Sophie Laurent', sports: ['padel', 'tennis'], color: '#6b5a45', rating: 4.9, reviewCount: 41, area: 'Archway', from: 4000, safeguarding: true, venueId: 'archway-padel',
    headline: 'Tennis players moving to padel',
    bio: 'Padel coach at Archway Padel Club. I help tennis players adapt and total beginners fall in love with the walls.',
    qualifications: ['LTA Padel Coach', 'DBS checked'],
  },
  {
    id: 'c3', name: 'Tom Hartley', sports: ['tennis'], color: '#3f4a66', rating: 4.8, reviewCount: 112, area: 'Holloway', from: 5500, safeguarding: true, venueId: 'holloway-tennis',
    headline: 'Match play and serve',
    bio: 'Former county player, now LTA Level 5. Indoors all year. Best for intermediate and advanced players who want to win more matches.',
    qualifications: ['LTA Level 5 Master Performance Coach', 'DBS checked'],
  },
  {
    id: 'c4', name: 'Inés García', sports: ['padel'], color: '#5a4660', rating: 5.0, reviewCount: 23, area: 'Camden Town', from: 5000, safeguarding: true, venueId: 'camden-padel',
    headline: 'Ex-tour player, all levels',
    bio: 'Played the Spanish circuit for six years. I teach positioning and the bandeja properly, from your first lesson.',
    qualifications: ['FEP Padel Coach Level 2', 'LTA Padel Coach', 'DBS checked'],
  },
  {
    id: 'c5', name: 'Kwame Asante', sports: ['tennis'], color: '#4a5f3a', rating: 4.8, reviewCount: 89, area: 'Finsbury Park', from: 3000, safeguarding: true, venueId: 'finsbury-hub',
    headline: 'Beginners and juniors',
    bio: 'Community coach in Finsbury Park. Relaxed first lessons, racket provided. Great if you have never picked one up.',
    qualifications: ['LTA Level 3 Club Coach', 'First aid certified', 'DBS checked'],
  },
  {
    id: 'c6', name: 'Lucía Romero', sports: ['padel'], color: '#6a4a42', rating: 4.7, reviewCount: 38, area: 'Crouch End', from: 3800, safeguarding: true, venueId: 'crouch-end-padel',
    headline: 'Doubles tactics',
    bio: 'I coach pairs as a team: who covers what, when to go to the net and how to stop giving away easy points.',
    qualifications: ['LTA Padel Coach', 'DBS checked'],
  },
];

export const COACH_BY_ID = Object.fromEntries(COACHES.map((c) => [c.id, c]));

export const TRAINING: TrainingSession[] = [
  {
    id: 's2', coachId: 'c1', sport: 'tennis', title: 'Adult Cardio Tennis', kind: 'group', facilityId: 'dartmouth-tennis', start: slot(daysUntil(4), 19).start, durationMins: 60,
    price: 1800, capacity: 8, taken: 6, level: 'casual', rating: 4.9, ageRule: 'adults',
    description: 'High-energy drills set to music. A great workout whatever your level.',
  },
  {
    id: 's3', coachId: 'c2', sport: 'padel', title: 'Padel for Beginners', kind: 'group', facilityId: 'archway-padel', start: slot(daysUntil(1), 18).start, durationMins: 60,
    price: 2200, capacity: 4, taken: 2, level: 'beginner', rating: 4.9, ageRule: 'adults',
    description: 'Four players, one coach, one hour. You’ll be playing proper points by the end.',
  },
  {
    id: 's9', coachId: 'c5', sport: 'tennis', title: 'Beginner Group Tennis', kind: 'group', facilityId: 'finsbury-hub', start: slot(daysUntil(6), 9).start, durationMins: 60,
    price: 1200, capacity: 6, taken: 3, level: 'beginner', rating: 4.8, ageRule: 'adults',
    description: 'Rackets provided. Forehand, backhand and serve, then short rallies.',
  },
];

export const SHOPS: Shop[] = [
  { id: 'sh1', name: 'Archway Sports Exchange', kind: 'shop', description: 'Second-hand boots, rackets and kit, with trade-ins welcome.', area: 'Archway', lat: 51.5651, lng: -0.1345, rating: 4.6, sports: ['football', 'tennis', 'running'], hours: 'Open until 19:00' },
  { id: 'sh2', name: 'Strung Out Racket Studio', kind: 'stringing', description: 'Same-day tennis, badminton and padel restringing.', area: 'Crouch End', lat: 51.5795, lng: -0.1229, rating: 4.9, sports: ['tennis', 'badminton', 'padel'], hours: 'Open until 18:00' },
  { id: 'sh3', name: 'Holloway Boot Room', kind: 'shop', description: 'Football boots, astro trainers and goalkeeper gloves.', area: 'Holloway', lat: 51.5531, lng: -0.1150, rating: 4.4, sports: ['football', 'rugby'], hours: 'Open until 20:00' },
  { id: 'sh4', name: 'Heath Sports Physio', kind: 'physio', description: 'Sports injury clinic with same-week appointments.', area: 'Kentish Town', lat: 51.5512, lng: -0.1417, rating: 4.8, sports: ['running', 'football', 'tennis'], hours: 'Open until 21:00' },
  { id: 'sh5', name: 'Camden Run Co.', kind: 'shop', description: 'Running shoes with free gait analysis and a Thursday run club.', area: 'Camden Town', lat: 51.5395, lng: -0.1428, rating: 4.7, sports: ['running'], hours: 'Open until 19:00' },
];

export const FEED: FeedItem[] = [
  { id: 'f2', kind: 'new-venue', title: 'New on BALLS: Clocktower Padel', body: 'Two covered courts in Crouch End, bookable from £26.', sport: 'padel', at: minsAgo(60 * 20), link: { route: 'facility', params: { id: 'clocktower-padel' } }, art: { kind: 'padel', caption: '', variant: 'green', time: 'dusk', seed: 91 } },
  { id: 'f6', kind: 'announcement', title: 'Floodlights now until 23:00', body: 'Highgate Sports Centre has extended evening hours on all four tennis courts.', sport: 'tennis', at: minsAgo(60 * 50), link: { route: 'facility', params: { id: 'highgate-sc' } }, art: { kind: 'tennis', caption: '', variant: 'hard', time: 'night', seed: 2 } },
];
