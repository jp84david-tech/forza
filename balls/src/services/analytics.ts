/**
 * Product analytics.
 *
 * Events carry ids and simple enums only (no names, emails, messages or
 * precise locations). In production `flush` would batch-send to an analytics
 * endpoint; here events stay in memory and can be inspected in
 * Settings → Demo tools → Analytics events.
 */
export type AnalyticsEvent =
  | 'app_opened'
  | 'sport_selected'
  | 'facility_viewed'
  | 'search_performed'
  | 'game_viewed'
  | 'game_joined'
  | 'game_left'
  | 'game_created'
  | 'booking_started'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'facility_saved'
  | 'facility_unsaved'
  | 'review_submitted'
  | 'play_now_searched'
  | 'waitlist_joined'
  | 'registration_completed'
  | 'invite_sent'
  | 'report_submitted'
  | 'filter_applied'
  | 'signed_up'
  | 'signed_in'
  | 'guest_started'
  | 'account_prompted'
  | 'app_installed';

type Props = Record<string, string | number | boolean | undefined>;

export interface TrackedEvent {
  name: AnalyticsEvent;
  props: Props;
  at: string;
}

const FORBIDDEN = /name|email|text|message|phone|address|lat|lng|password/i;
const buffer: TrackedEvent[] = [];
const listeners = new Set<() => void>();

export const analytics = {
  track(name: AnalyticsEvent, props: Props = {}) {
    const safe: Props = {};
    for (const [k, v] of Object.entries(props)) if (!FORBIDDEN.test(k) && v !== undefined) safe[k] = v;
    buffer.unshift({ name, props: safe, at: new Date().toISOString() });
    if (buffer.length > 200) buffer.pop();
    listeners.forEach((l) => l());
  },
  events: () => buffer,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
