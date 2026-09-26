import type { Coach, FeedItem, Shop, SportsEvent, TrainingSession } from './types';
import { daysUntil, minsAgo, slot } from './schedule';

/** Events, training and local services. In production: /events, /training, /services */

const sat = daysUntil(6);
const sun = daysUntil(0);

export const EVENTS: SportsEvent[] = [
  {
    id: 'e1', kind: 'community', title: 'Free Community Kickabout', sport: 'football', facilityId: 'tufnell-pitch', ...slot(sat, 10, 120),
    price: 0, capacity: 40, taken: 26, level: 'beginner', organiser: 'Tufnell Park Community Trust', ageRule: 'all',
    description: 'Mixed-age small-sided games on the 7-a-side pitch. Coaches on hand, bibs and balls provided. Under-16s must come with a parent or guardian.',
  },
  {
    id: 'e2', kind: 'training', title: 'Intro to Padel Taster', sport: 'padel', facilityId: 'archway-padel', ...slot(2, 18, 60),
    price: 1000, capacity: 8, taken: 5, level: 'beginner', organiser: 'Archway Padel Club', ageRule: 'adults',
    description: 'Never played? One hour with a coach covering the grip, the walls and the scoring. Racket and balls included.',
  },
  {
    id: 'e3', kind: 'community', title: 'Heath 5K Social Run', sport: 'running', facilityId: 'heath-track', ...slot(sun, 9, 60),
    price: 0, capacity: 80, taken: 47, organiser: 'Parliament Hill Track', ageRule: 'all', level: 'casual',
    description: 'A friendly, untimed 5K loop starting at the track. Pacers for 25, 30 and 35 minutes. Coffee afterwards.',
  },
  {
    id: 'e4', kind: 'camp', title: 'Half-Term Multi-Sport Camp', sport: 'other', facilityId: 'highgate-sc', ...slot(18, 9, 7 * 60),
    price: 2800, capacity: 40, taken: 31, organiser: 'Highgate Sports Centre', ageRule: 'juniors', level: 'beginner',
    description: 'Football, basketball, tennis and dodgeball for ages 6–14. DBS-checked coaches and a supervised lunch.',
  },
  {
    id: 'e5', kind: 'sporting-event', title: 'Crouch End 10K', sport: 'running', facilityId: 'crouch-end-hall', ...slot(sun + 14, 9, 3 * 60),
    price: 2200, capacity: 600, taken: 412, organiser: 'Crouch End Runners', ageRule: 'adults', level: 'intermediate',
    description: 'A chip-timed 10K through Crouch End and Priory Park. Medal, T-shirt and water stations.',
  },
  {
    id: 'e6', kind: 'training', title: 'Beach Volleyball Beginners Night', sport: 'volleyball', facilityId: 'hornsey-beach', ...slot(4, 19, 90),
    price: 800, capacity: 16, taken: 9, level: 'beginner', organiser: 'Hornsey Beach Volleyball', ageRule: 'adults',
    description: 'Learn the dig, the set and the serve, then play short games. No experience needed.',
  },
  {
    id: 'e7', kind: 'community', title: 'Wednesday Badminton Social', sport: 'badminton', facilityId: 'holloway-leisure', ...slot(daysUntil(3), 19, 120),
    price: 600, capacity: 24, taken: 17, level: 'casual', organiser: 'Holloway Leisure Centre', ageRule: 'adults',
    description: 'Turn up, get paired, play. Four courts, rotating doubles, shuttles provided.',
  },
  {
    id: 'e8', kind: 'community', title: 'Walking Football (50+)', sport: 'football', facilityId: 'tufnell-pitch', ...slot(daysUntil(5), 11, 60),
    price: 300, capacity: 20, taken: 12, level: 'beginner', organiser: 'Tufnell Park Community Trust', ageRule: 'adults',
    description: 'Football at walking pace. No running, no contact, lots of laughs. Great for getting back into sport.',
  },
  {
    id: 'e9', kind: 'competition', title: 'Parliament Hill Mile', sport: 'running', facilityId: 'heath-track', ...slot(10, 18.5, 120),
    price: 700, capacity: 120, taken: 64, organiser: 'Parliament Hill Track', ageRule: 'all', level: 'intermediate',
    description: 'Graded mile races on the track, from 8-minute milers to sub-5. Chip timing and live results.',
  },
];

export const COACHES: Coach[] = [
  {
    id: 'c1', name: 'Maya Okafor', sports: ['tennis'], color: '#138A4B', rating: 4.9, reviewCount: 64, area: 'Dartmouth Park', from: 4500, safeguarding: true,
    bio: 'LTA Level 4 coach. I work with adults getting back into tennis and juniors starting out. Patient, technical, fun.',
    qualifications: ['LTA Level 4 Senior Club Coach', 'First aid certified', 'DBS checked'],
  },
  {
    id: 'c2', name: 'Andre “Dre” Williams', sports: ['basketball'], color: '#E4572E', rating: 4.8, reviewCount: 88, area: 'Holloway', from: 1200, safeguarding: true,
    bio: 'Former National League guard. I run beginner clinics and small-group shooting sessions across North London.',
    qualifications: ['Basketball England Level 2', 'DBS checked'],
  },
  {
    id: 'c3', name: 'Sophie Laurent', sports: ['padel', 'tennis'], color: '#3d5a4a', rating: 4.9, reviewCount: 41, area: 'Archway', from: 4000, safeguarding: true,
    bio: 'Padel coach at Archway Padel Club. I help tennis players adapt and total beginners fall in love with the walls.',
    qualifications: ['LTA Padel Coach', 'DBS checked'],
  },
  {
    id: 'c4', name: 'Jamal Reid', sports: ['football'], color: '#7C4DDB', rating: 4.7, reviewCount: 120, area: 'Tufnell Park', from: 1000, safeguarding: true,
    bio: 'UEFA B coach running junior academies and adult skills nights. Every session is about touches on the ball.',
    qualifications: ['UEFA B Licence', 'FA Safeguarding', 'DBS checked'],
  },
  {
    id: 'c5', name: 'Hana Suzuki', sports: ['swimming'], color: '#0B7EA8', rating: 4.9, reviewCount: 37, area: 'Kentish Town', from: 3000, safeguarding: true,
    bio: 'Swim England coach. Stroke correction, open-water prep and adult learn-to-swim.',
    qualifications: ['Swim England Level 2', 'RLSS lifeguard', 'DBS checked'],
  },
  {
    id: 'c6', name: 'Ellie Price', sports: ['gym', 'running'], color: '#C2417A', rating: 4.8, reviewCount: 52, area: 'Tufnell Park', from: 3500, safeguarding: true,
    bio: 'Strength coach for runners and team-sport players. Four-week foundations blocks and 1:1 programming.',
    qualifications: ['UKSCA Accredited', 'BSc Sport Science', 'DBS checked'],
  },
];

export const COACH_BY_ID = Object.fromEntries(COACHES.map((c) => [c.id, c]));

export const TRAINING: TrainingSession[] = [
  {
    id: 's1', coachId: 'c2', sport: 'basketball', title: 'Beginner Basketball Clinic', kind: 'group', facilityId: 'holloway-leisure', start: slot(daysUntil(2), 19).start, durationMins: 90,
    price: 1200, capacity: 12, taken: 8, level: 'beginner', rating: 4.8, ageRule: 'adults',
    description: 'Footwork, ball handling and layups, then small-sided games. Designed for adults who never played at school.',
  },
  {
    id: 's2', coachId: 'c1', sport: 'tennis', title: 'Adult Cardio Tennis', kind: 'group', facilityId: 'dartmouth-tennis', start: slot(daysUntil(4), 19).start, durationMins: 60,
    price: 1800, capacity: 8, taken: 6, level: 'casual', rating: 4.9, ageRule: 'adults',
    description: 'High-energy drills set to music. A great workout whatever your level.',
  },
  {
    id: 's3', coachId: 'c3', sport: 'padel', title: 'Padel for Beginners', kind: 'group', facilityId: 'archway-padel', start: slot(daysUntil(1), 18).start, durationMins: 60,
    price: 2200, capacity: 4, taken: 2, level: 'beginner', rating: 4.9, ageRule: 'adults',
    description: 'Four players, one coach, one hour. You’ll be playing proper points by the end.',
  },
  {
    id: 's4', coachId: 'c1', sport: 'tennis', title: '1:1 Tennis Lesson', kind: 'one-to-one', facilityId: 'dartmouth-tennis', start: slot(2, 10).start, durationMins: 60,
    price: 4500, capacity: 1, taken: 0, level: 'intermediate', rating: 4.9, ageRule: 'all',
    description: 'Tailored coaching on whatever you want to fix: serve, backhand, or match play.',
  },
  {
    id: 's5', coachId: 'c4', sport: 'football', title: 'Junior Skills Academy (U12)', kind: 'class', facilityId: 'tufnell-pitch', start: slot(sat, 9).start, durationMins: 90,
    price: 1000, capacity: 24, taken: 19, level: 'beginner', rating: 4.7, ageRule: 'juniors',
    description: 'Ball mastery, 1v1s and small-sided games for ages 7–11. Parents welcome to watch from the side.',
  },
  {
    id: 's6', coachId: 'c5', sport: 'swimming', title: 'Adult Stroke Clinic', kind: 'group', facilityId: 'kentish-baths', start: slot(daysUntil(3), 20).start, durationMins: 45,
    price: 1600, capacity: 6, taken: 4, level: 'casual', rating: 4.9, ageRule: 'adults',
    description: 'Front crawl technique with video feedback. You should be able to swim two lengths.',
  },
  {
    id: 's7', coachId: 'c6', sport: 'gym', title: 'Strength Foundations', kind: 'class', facilityId: 'tufnell-fitness', start: slot(daysUntil(1), 7).start, durationMins: 60,
    price: 1800, capacity: 8, taken: 5, level: 'beginner', rating: 4.8, ageRule: 'adults',
    description: 'Learn the big lifts safely: squat, hinge, press and pull. Small group, lots of coaching.',
  },
  {
    id: 's8', coachId: 'c4', sport: 'football', title: 'Adult Skills Night', kind: 'group', facilityId: 'highgate-sc', start: slot(daysUntil(3), 20).start, durationMins: 60,
    price: 1500, capacity: 16, taken: 11, level: 'intermediate', rating: 4.7, ageRule: 'adults',
    description: 'Finishing, first touch and small-sided games at a proper tempo.',
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
  { id: 'f1', kind: 'tournament', title: 'Highgate 5s Cup: 4 places left', body: 'Registration closes Friday. Sixteen teams, one trophy.', sport: 'football', at: minsAgo(90), link: { route: 'tournament', params: { id: 't1' } }, art: { kind: 'football', caption: '', time: 'night', seed: 2 } },
  { id: 'f2', kind: 'new-venue', title: 'New on BALLS: Clocktower Padel', body: 'Two covered courts in Crouch End, bookable from £28.', sport: 'padel', at: minsAgo(60 * 20), link: { route: 'facility', params: { id: 'clocktower-padel' } }, art: { kind: 'padel', caption: '', variant: 'green', time: 'dusk', seed: 91 } },
  { id: 'f3', kind: 'training', title: 'Beginner basketball clinic: 4 spots', body: 'Coach Dre, Tuesday 19:00 at Holloway Leisure Centre.', sport: 'basketball', at: minsAgo(60 * 5), link: { route: 'session', params: { id: 's1' } }, art: { kind: 'basketball', caption: '', variant: 'hardwood', seed: 103 } },
  { id: 'f4', kind: 'popular-game', title: 'Saturday 11-a-side is nearly full', body: '18 of 22 players in. Finsbury Park, 10:00.', sport: 'football', at: minsAgo(60 * 3), link: { route: 'game', params: { id: 'g16' } }, art: { kind: 'football', caption: '', time: 'day', seed: 22 } },
  { id: 'f5', kind: 'event', title: 'Heath 5K Social Run this Sunday', body: 'Free, untimed, with pacers for every ability.', sport: 'running', at: minsAgo(60 * 30), link: { route: 'event', params: { id: 'e3' } }, art: { kind: 'running', caption: '', time: 'day', seed: 162 } },
  { id: 'f6', kind: 'announcement', title: 'Floodlights now until 23:00', body: 'Highgate Sports Centre has extended evening hours on all three pitches.', sport: 'football', at: minsAgo(60 * 50), link: { route: 'facility', params: { id: 'highgate-sc' } }, art: { kind: 'football', caption: '', time: 'night', seed: 1 } },
  { id: 'f7', kind: 'new-venue', title: 'Hornsey Beach Volleyball is open', body: 'Covered sand courts, all year round. Thursday social league starting soon.', sport: 'volleyball', at: minsAgo(60 * 72), link: { route: 'facility', params: { id: 'hornsey-beach' } }, art: { kind: 'volleyball', caption: '', variant: 'beach', seed: 111 } },
];
