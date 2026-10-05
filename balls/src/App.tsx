import { CalendarDays, Compass, House, Users } from 'lucide-react';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import { ScreenBoundary } from './components/ErrorBoundary';
import { joinLayer, useJoinLayer } from './components/Join';
import { SheetHost, ToastHost } from './components/Sheet';
import { Logo } from './components/icons';
import { cx } from './lib/format';
import { analytics } from './services/analytics';
import { type Route, type SubState, type Tab, nav, useNav } from './state/nav';
import { upcoming, unreadCount } from './state/selectors';
import { useApp } from './state/store';
import { ROUTES } from './screens/routes';
import { Onboarding } from './screens/Onboarding';
import { fmtTime, now } from './lib/time';

const TABS: Array<{ id: Tab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'book', label: 'Book', icon: CalendarDays },
  { id: 'friends', label: 'Friends', icon: Users },
];

const SUBS: { [T in keyof SubState]: Array<{ id: SubState[T]; label: string }> } = {
  book: [
    { id: 'book', label: 'Book' },
    { id: 'mine', label: 'My bookings' },
  ],
  friends: [
    { id: 'play', label: 'Play' },
    { id: 'coaches', label: 'Coaches' },
    { id: 'friends', label: 'Friends' },
  ],
};

/** The second switch that sits just above the tab bar on Book and Friends. */
function SubBar({ hidden }: { hidden: boolean }) {
  const n = useNav();
  const tab = n.tab;
  if (tab !== 'book' && tab !== 'friends') return null;
  const items = SUBS[tab] as Array<{ id: string; label: string }>;
  const cur = n.sub[tab];
  const i = Math.max(0, items.findIndex((x) => x.id === cur));
  const show = !hidden && n.stacks[tab].length === 1;
  return (
    <div className={cx('subbar', !show && 'is-hidden')} aria-hidden={!show}>
      <div className="subbar__track" role="tablist" aria-label={tab === 'book' ? 'Book' : 'Friends'} style={{ ['--n' as string]: items.length, ['--i' as string]: i }}>
        <span className="subbar__thumb" aria-hidden="true" />
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={it.id === cur}
            tabIndex={show ? 0 : -1}
            className={cx('subbar__item', it.id === cur && 'is-active')}
            onClick={() => (tab === 'book' ? nav.setSub('book', it.id as SubState['book']) : nav.setSub('friends', it.id as SubState['friends']))}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bottom navigation bar. */
function NavigationBar({ hidden, covered }: { hidden: boolean; covered: boolean }) {
  const n = useNav();
  const s = useApp();
  const next = upcoming(s).length;
  const requests = s.friendRequests.filter((r) => r.dir === 'in').length;
  return (
    <nav className={cx('tabbar', hidden && 'is-hidden')} aria-label="Main" inert={covered || undefined}>
      {TABS.map((t) => {
        const on = n.tab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            className={cx('tabbar__item', on && 'is-active')}
            aria-current={on ? 'page' : undefined}
            aria-label={t.id === 'book' && next > 0 ? `${t.label}, ${next} upcoming` : t.id === 'friends' && requests > 0 ? `${t.label}, ${requests} requests` : t.label}
            onClick={() => nav.switchTab(t.id)}
          >
            <span className="tabbar__icon">
              <Icon size={23} strokeWidth={on ? 2.3 : 1.9} />
              {((t.id === 'book' && next > 0) || (t.id === 'friends' && requests > 0)) && <span className="tabbar__dot" aria-hidden="true" />}
            </span>
            <span className="tabbar__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface Rendered extends Route {
  leaving?: boolean;
}

/** One tab's navigation stack with native-style push/pop transitions. */
function Stack({ tab, routes, active }: { tab: Tab; routes: Route[]; active: boolean }) {
  const [rendered, setRendered] = useState<Rendered[]>(routes);
  const prevKeys = useRef(routes.map((r) => r.key));
  const n = useNav();

  useEffect(() => {
    const keys = routes.map((r) => r.key);
    const removed = prevKeys.current.filter((k) => !keys.includes(k));
    prevKeys.current = keys;
    if (!removed.length) {
      setRendered(routes);
      return;
    }
    setRendered((cur) => {
      const leaving = cur.filter((r) => removed.includes(r.key)).map((r) => ({ ...r, leaving: true }));
      return [...routes, ...leaving];
    });
    const t = setTimeout(() => setRendered((cur) => cur.filter((r) => !r.leaving)), 300);
    return () => clearTimeout(t);
  }, [routes]);

  const topIndex = routes.length - 1;
  const topIsModal = !!ROUTES[routes[topIndex]?.name]?.modal;
  return (
    <section className="stack" hidden={!active} aria-hidden={!active}>
      {rendered.map((r, i) => {
        const def = ROUTES[r.name];
        if (!def) return null;
        const Comp = def.component;
        const isTop = !r.leaving && i === topIndex;
        return (
          <div
            key={r.key}
            className={cx('screen', i > 0 && 'is-pushed', r.leaving && 'is-leaving', !r.leaving && i < topIndex && 'is-covered', !r.leaving && i < topIndex && topIsModal && 'under-modal', def.modal && 'is-modal', !def.hideTabBar && 'with-tabbar', def.subbar && i === 0 && 'with-subbar')}
            aria-hidden={!isTop}
            inert={!isTop ? true : undefined}
          >
            <ScreenBoundary onBack={() => (i > 0 ? nav.pop() : nav.reset())}>
              <Comp params={r.params} routeKey={r.key} retap={i === 0 ? n.retap[tab] : 0} />
            </ScreenBoundary>
          </div>
        );
      })}
    </section>
  );
}

function Shell({ covered }: { covered: boolean }) {
  const n = useNav();
  const [visited, setVisited] = useState<Set<Tab>>(new Set(['home']));
  useEffect(() => {
    setVisited((v) => (v.has(n.tab) ? v : new Set([...v, n.tab])));
  }, [n.tab]);

  const top = n.stacks[n.tab][n.stacks[n.tab].length - 1];
  const hideBar = !!ROUTES[top.name]?.hideTabBar;

  return (
    <>
      <div className="stage" inert={covered || undefined}>
        {TABS.map((t) => (visited.has(t.id) || t.id === n.tab ? <Stack key={t.id} tab={t.id} routes={n.stacks[t.id]} active={n.tab === t.id} /> : null))}
      </div>
      <SubBar hidden={hideBar || covered} />
      <NavigationBar hidden={hideBar} covered={covered} />
    </>
  );
}

/** The short sign-up a guest sees over the app, so they come back to the same screen. */
function JoinHost() {
  const j = useJoinLayer();
  const s = useApp();
  useEffect(() => {
    if (s.account && j.open) joinLayer.close();
  }, [s.account, j.open]);
  if (!j.open) return null;
  return (
    <div className={cx('join-layer', j.closing && 'is-closing')} role="dialog" aria-modal="true" aria-label="Create an account or log in">
      <Onboarding key={j.start} join={{ start: j.start, onClose: joinLayer.close }} />
    </div>
  );
}

function useFrameMode() {
  const q = '(min-width: 1024px) and (min-height: 700px)';
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setOn(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return on;
}

function StatusBar() {
  const [t, setT] = useState(now());
  useEffect(() => {
    const i = setInterval(() => setT(now()), 20_000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{fmtTime(t)}</span>
      <span className="statusbar__icons">
        <svg width="18" height="11" viewBox="0 0 18 11">
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
          <rect x="23.5" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}

export function App() {
  const s = useApp();
  const j = useJoinLayer();
  const framed = useFrameMode();
  const scheme = s.settings.theme;
  const unread = unreadCount(s);

  useEffect(() => {
    analytics.track('app_opened', { signedIn: !!s.account });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = unread && s.account ? `(${unread}) BALLS` : 'BALLS';
  }, [unread, s.account]);

  const app = (
    <div className={cx('app', framed && 'app--framed')} data-scheme={scheme}>
      {framed && <StatusBar />}
      {(s.account && s.onboarded) || s.guest ? <Shell covered={j.open} /> : <Onboarding />}
      <JoinHost />
      <SheetHost />
      <ToastHost />
    </div>
  );

  if (!framed) return app;
  return (
    <div className="desk" data-scheme={scheme}>
      <aside className="desk__brand">
        <Logo size={44} className="desk__logo" />
        <h1 className="desk__title">Padel and tennis near you</h1>
        <p className="desk__lede">Book a court, join a game when you’re short of players, and find a coach. All in one place.</p>
        <ul className="desk__points">
          <li>Every padel and tennis court nearby on one map</li>
          <li>Join a game tonight in a couple of taps</li>
          <li>Book and pay for lessons with local coaches</li>
        </ul>
        <p className="desk__note">Prototype. Best on a phone.</p>
      </aside>
      <div className="device">{app}</div>
    </div>
  );
}
