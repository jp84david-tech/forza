import { CalendarCheck, GraduationCap, MessageCircle, Users } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { analytics } from '../services/analytics';
import { getState } from '../state/store';
import { ui } from '../state/ui';
import { Logo } from './icons';
import { SheetBody, SheetFooter } from './Sheet';
import { Button } from './ui';

/**
 * Guests can look around freely. Anything that needs an account goes through
 * `needsAccount`, which asks them to sign up or log in and then brings them
 * back to the same screen (the app stays mounted underneath the sign-up flow).
 */

export type JoinReason = 'book' | 'join' | 'create' | 'save' | 'alert' | 'waitlist' | 'register' | 'review' | 'report' | 'follow' | 'invite' | 'block' | 'request';

const COPY: Record<JoinReason, { title: string; body: string }> = {
  book: { title: 'Create a free account to book', body: 'Your booking, receipt and check-in code are kept in your account, and you can split the cost with friends.' },
  join: { title: 'Create a free account to join', body: 'So the organiser knows who’s coming. You’ll get the group chat, reminders and your share to pay.' },
  create: { title: 'Create a free account to post your game', body: 'Players who join can message you, and we’ll tell you as the spots fill up.' },
  save: { title: 'Create a free account to save venues', body: 'Keep your favourite courts in one place and get told when good slots free up.' },
  alert: { title: 'Create a free account for alerts', body: 'We’ll let you know when evening slots free up at this venue.' },
  waitlist: { title: 'Create a free account to join the waitlist', body: 'If this slot frees up we’ll hold it for you and let you know straight away.' },
  register: { title: 'Create a free account to sign up', body: 'Your place, team and payment are kept in your account, with reminders before it starts.' },
  review: { title: 'Create a free account to write a review', body: 'Reviews come from people who’ve played there, so each one is linked to an account.' },
  report: { title: 'Create a free account to report this', body: 'Reports are linked to an account so our team can follow up and prevent misuse.' },
  follow: { title: 'Create a free account to add friends', body: 'Add friends by username and invite each other to games.' },
  invite: { title: 'Create a free account to invite players', body: 'Invite people to your games and see who’s accepted.' },
  block: { title: 'Create a free account to block players', body: 'Blocking stops someone messaging you or seeing your games.' },
  request: { title: 'Create a free account to book a lesson', body: 'Your lesson and payment are kept in your account, with a reminder before it starts.' },
};

// ---------------------------------------------------------------- sign-up layer state

type JoinStart = 'signup' | 'login';
interface JoinState {
  open: boolean;
  start: JoinStart;
  closing: boolean;
}

let state: JoinState = { open: false, start: 'signup', closing: false };
const listeners = new Set<() => void>();
const emit = (next: JoinState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const joinLayer = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  open(start: JoinStart = 'signup') {
    ui.closeAll();
    emit({ open: true, start, closing: false });
  },
  close() {
    if (!state.open || state.closing) return;
    emit({ ...state, closing: true });
    setTimeout(() => emit({ ...state, open: false, closing: false }), 260);
  },
};

export function useJoinLayer(): JoinState {
  return useSyncExternalStore(joinLayer.subscribe, joinLayer.get, joinLayer.get);
}

// ---------------------------------------------------------------- the prompt

function JoinPrompt({ reason, close }: { reason: JoinReason; close: () => void }) {
  const c = COPY[reason];
  return (
    <>
      <SheetBody className="joinprompt">
        <Logo size={34} />
        <h2 className="joinprompt__title">{c.title}</h2>
        <p className="joinprompt__body">{c.body}</p>
        <ul className="joinprompt__perks">
          <li>
            <CalendarCheck size={17} /> Book courts
          </li>
          <li>
            <MessageCircle size={17} /> Join games and chat
          </li>
          <li>
            <GraduationCap size={17} /> Book coaches
          </li>
          <li>
            <Users size={17} /> Add friends
          </li>
        </ul>
      </SheetBody>
      <SheetFooter>
        <div className="joinprompt__actions">
          <Button block size="lg" onClick={() => joinLayer.open('signup')}>
            Create free account
          </Button>
          <Button block size="lg" variant="secondary" onClick={() => joinLayer.open('login')}>
            I have an account
          </Button>
          <Button block variant="ghost" onClick={close}>
            Not now
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}

/**
 * Returns true (and asks the guest to sign up) when there's no account.
 * Usage: `if (needsAccount('book')) return;`
 */
export function needsAccount(reason: JoinReason): boolean {
  if (getState().account) return false;
  analytics.track('account_prompted', { reason });
  ui.open('Create an account', (close) => <JoinPrompt reason={reason} close={close} />);
  return true;
}
