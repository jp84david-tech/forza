import { useSyncExternalStore } from 'react';

/**
 * Navigation. Each tab keeps its own stack (like a native tab bar app), so
 * switching tabs never loses your place. Screens push onto the active tab.
 */
export type Tab = 'home' | 'explore' | 'book' | 'friends';

/** The Book and Friends tabs each have a second switch above the tab bar. */
export type BookSub = 'book' | 'mine';
export type FriendsSub = 'play' | 'coaches' | 'friends';
export interface SubState {
  book: BookSub;
  friends: FriendsSub;
}

export interface Route {
  key: string;
  name: string;
  params: Record<string, string | undefined>;
}

export interface NavState {
  tab: Tab;
  stacks: Record<Tab, Route[]>;
  /** Incremented when a tab is re-tapped so its root can scroll to top. */
  retap: Record<Tab, number>;
  sub: SubState;
}

let seq = 0;
const route = (name: string, params: Route['params'] = {}): Route => ({ key: `${name}-${++seq}`, name, params });

const initial = (): NavState => ({
  tab: 'home',
  stacks: {
    home: [route('home')],
    explore: [route('explore')],
    book: [route('bookHub')],
    friends: [route('friendsHub')],
  },
  retap: { home: 0, explore: 0, book: 0, friends: 0 },
  sub: { book: 'book', friends: 'play' },
});

let state: NavState = initial();
const listeners = new Set<() => void>();
const emit = (next: NavState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const TAB_FOR_ROUTE: Record<string, Tab> = {
  booking: 'book',
  lesson: 'book',
};

export const nav = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  reset() {
    emit(initial());
  },
  push(name: string, params: Route['params'] = {}) {
    const s = state.stacks[state.tab];
    emit({ ...state, stacks: { ...state.stacks, [state.tab]: [...s, route(name, params)] } });
  },
  /** Replace the top screen (used when a flow step shouldn't be returned to). */
  replace(name: string, params: Route['params'] = {}) {
    const s = state.stacks[state.tab];
    emit({ ...state, stacks: { ...state.stacks, [state.tab]: [...s.slice(0, -1), route(name, params)] } });
  },
  pop(n = 1) {
    const s = state.stacks[state.tab];
    if (s.length <= 1) return;
    emit({ ...state, stacks: { ...state.stacks, [state.tab]: s.slice(0, Math.max(1, s.length - n)) } });
  },
  /** Pop back to the most recent screen with this name, then optionally push. */
  popTo(name: string, then?: { name: string; params?: Route['params'] }) {
    const s = state.stacks[state.tab];
    let i = s.map((r) => r.name).lastIndexOf(name);
    if (i < 0) i = 0;
    const kept = s.slice(0, i + 1);
    emit({ ...state, stacks: { ...state.stacks, [state.tab]: then ? [...kept, route(then.name, then.params)] : kept } });
  },
  /** Remove flow screens (e.g. booking steps) and push a result screen. */
  finishFlow(flowNames: string[], next: { name: string; params?: Route['params'] }) {
    const s = state.stacks[state.tab];
    const kept = s.filter((r) => !flowNames.includes(r.name));
    emit({ ...state, stacks: { ...state.stacks, [state.tab]: [...kept, route(next.name, next.params)] } });
  },
  switchTab(tab: Tab) {
    if (tab === state.tab) {
      const s = state.stacks[tab];
      if (s.length > 1) emit({ ...state, stacks: { ...state.stacks, [tab]: [s[0]] } });
      else emit({ ...state, retap: { ...state.retap, [tab]: state.retap[tab] + 1 } });
      return;
    }
    emit({ ...state, tab });
  },
  /** Jump to a tab and open a screen there, on top of that tab's root. */
  go(tab: Tab, name?: string, params: Route['params'] = {}) {
    const root = state.stacks[tab][0];
    // Without a screen name, the params go to the tab's root (e.g. Explore → list view, football).
    const stack =
      name && name !== root.name
        ? [root, route(name, params)]
        : Object.keys(params).length
          ? [{ ...root, params: { ...params, _t: String(Date.now()) } }]
          : [root];
    // Opening a booking lands on the "My bookings" side of the Book tab.
    const sub = tab === 'book' && (name === 'booking' || name === 'lesson') ? { ...state.sub, book: 'mine' as const } : state.sub;
    emit({ ...state, tab, sub, stacks: { ...state.stacks, [tab]: stack } });
  },
  /** Switch the second bar on the Book or Friends tab. */
  setSub<T extends keyof SubState>(tab: T, value: SubState[T]) {
    if (state.sub[tab] === value) return;
    emit({ ...state, sub: { ...state.sub, [tab]: value } });
  },
  /** Go to a tab's root with a given sub-section showing. */
  openSub<T extends keyof SubState>(tab: T, value: SubState[T]) {
    emit({ ...state, tab, sub: { ...state.sub, [tab]: value }, stacks: { ...state.stacks, [tab]: [state.stacks[tab][0]] } });
  },
  /** Update params of the current tab's root (e.g. pre-filter Explore). */
  setRootParams(tab: Tab, params: Route['params']) {
    const s = state.stacks[tab];
    emit({ ...state, stacks: { ...state.stacks, [tab]: [{ ...s[0], params: { ...s[0].params, ...params, _t: String(Date.now()) } }, ...s.slice(1)] } });
  },
};

export function useNav(): NavState {
  return useSyncExternalStore(nav.subscribe, nav.get, nav.get);
}

/** Open a link object from a notification or feed item. */
export function openLink(link: { route: string; params?: Record<string, string> }) {
  const tab = TAB_FOR_ROUTE[link.route];
  if (tab) nav.go(tab, link.route, link.params);
  else nav.push(link.route, link.params);
}
