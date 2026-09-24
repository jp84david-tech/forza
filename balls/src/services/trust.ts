import type { AttendanceRecord, Message, ReportTarget } from '../data/types';

/**
 * Reliability, moderation and anti-spam.
 *
 * Reliability is computed server-side from attendance events that users can't
 * edit: organiser/venue check-ins, cancellations and reported no-shows. Late
 * cancellations count once, no-shows count double.
 */
export interface Reliability {
  score: number | null;
  label: string;
  tier: 'new' | 'very' | 'reliable' | 'low';
}

export function reliability(a: AttendanceRecord): Reliability {
  const total = a.attended + a.lateCancels + a.noShows;
  if (total < 5) return { score: null, label: 'New player', tier: 'new' };
  const score = Math.round((100 * a.attended) / (a.attended + a.lateCancels + a.noShows * 2));
  if (score >= 95) return { score, label: 'Very reliable', tier: 'very' };
  if (score >= 85) return { score, label: 'Reliable', tier: 'reliable' };
  return { score, label: 'Sometimes cancels', tier: 'low' };
}

export const REPORT_REASONS: Record<ReportTarget, string[]> = {
  user: ['Harassment or abuse', 'Spam or scam', 'Inappropriate behaviour', 'Fake profile', 'Safety concern', 'Something else'],
  game: ['Misleading details', 'Unsafe or inappropriate', 'Spam or scam', 'Asking for payment outside BALLS', 'Something else'],
  facility: ['Wrong information', 'Permanently closed', 'Safety issue', 'Pricing is wrong', 'Something else'],
  message: ['Harassment or abuse', 'Spam', 'Hate speech', 'Sharing personal information', 'Something else'],
  review: ['Fake or misleading', 'Offensive content', 'Not about this venue', 'Something else'],
};

const BLOCKLIST = ['fuck', 'shit', 'cunt', 'wanker', 'twat', 'bitch', 'prick'];
const PHONE = /(\+?44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b|\b\d{5}\s?\d{6}\b/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const LINK = /(https?:\/\/|www\.)\S+/i;

export interface MessageCheck {
  ok: boolean;
  error?: string;
  text: string;
}

/**
 * Checks a chat message before it's sent. Mirrors server-side rules so users
 * get instant feedback: rate limits, duplicate spam, links from new accounts,
 * and contact details in public chats.
 */
export function checkMessage(raw: string, opts: { mine: Message[]; gamesPlayed: number; minor: boolean }): MessageCheck {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, text };
  if (text.length > 500) return { ok: false, text, error: 'Messages can be up to 500 characters.' };
  const nowMs = Date.now();
  const recent = opts.mine.filter((m) => nowMs - new Date(m.at).getTime() < 10_000);
  if (recent.length >= 4) return { ok: false, text, error: 'You’re sending messages quickly. Wait a few seconds.' };
  const lastTwo = opts.mine.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((m) => m.text.toLowerCase() === text.toLowerCase())) {
    return { ok: false, text, error: 'You’ve already sent that message.' };
  }
  if (LINK.test(text) && (opts.gamesPlayed < 3 || opts.minor)) {
    return { ok: false, text, error: 'Links are turned off until you’ve played 3 games.' };
  }
  if (PHONE.test(text) || EMAIL.test(text)) {
    return { ok: false, text, error: 'For safety, keep phone numbers and emails out of game chats.' };
  }
  let clean = text;
  for (const w of BLOCKLIST) clean = clean.replace(new RegExp(`\\b${w}\\w*`, 'gi'), (m) => m[0] + '*'.repeat(m.length - 1));
  return { ok: true, text: clean };
}

/** Limit report volume so the report button can't be used to spam moderators. */
export function canReport(reportTimes: string[]): boolean {
  const hourAgo = Date.now() - 3_600_000;
  return reportTimes.filter((t) => new Date(t).getTime() > hourAgo).length < 5;
}
