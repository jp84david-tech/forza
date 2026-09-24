import { CalendarDays, Compass, House, Trophy, UserRound } from 'lucide-react';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import { SheetHost, ToastHost } from './components/Sheet';
import { LogoMark } from './components/icons';
import { cx } from './lib/format';
import { analytics } from './services/analytics';
import { type Route, type Tab, nav, useNav } from './state/nav';
import { upcoming, unreadCount } from './state/selectors';
import { useApp } from './state/store';
import { ROUTES } from './screens/routes';
import { Onboarding } from './screens/Onboarding';
import { fmtTime, now } from './lib/time';

const TABS: Array<{ id: Tab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'compete', label: 'Compete', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

/** Bottom navigation bar. */
function NavigationBar({ hidden }: { hidden: boolean }) {
  const n = useNav();
  const s = useApp();
  const next = upcoming(s).length;
  return (
    <nav className={cx('tabbar', hidden && 'is-hidden')} aria-label="Main">
      {TABS.map((t) => {
        const on = n.tab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            className={cx('tabbar__item', on && 'is-active')}
            aria-current={on ? 'page' : undefined}
            aria-label={t.id === 'bookings' && next > 0 ? `${t.label}, ${next} upcoming` : t.label}
            onClick={() => nav.switchTab(t.id)}
          >
            <span className="tabbar__icon">
              <Icon size={23} strokeWidth={on ? 2.3 : 1.9} />
              {t.id === 'bookings' && next > 0 && <span className="tabbar__dot" aria-hidden="true" />}
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
            className={cx('screen', i > 0 && 'is-pushed', r.leaving && 'is-leaving', !r.leaving && i < topIndex && 'is-covered', def.modal && 'is-modal', !def.hideTabBar && 'with-tabbar')}
            aria-hidden={!isTop}
            inert={!isTop ? true : undefined}
          >
            <Comp params={r.params} routeKey={r.key} retap={i === 0 ? n.retap[tab] : 0} />
          </div>
        );
      })}
    </section>
  );
}

function Shell() {
  const n = useNav();
  const [visited, setVisited] = useState<Set<Tab>>(new Set(['home']));
  useEffect(() => {
    setVisited((v) => (v.has(n.tab) ? v : new Set([...v, n.tab])));
  }, [n.tab]);

  const top = n.stacks[n.tab][n.stacks[n.tab].length - 1];
  const hideBar = !!ROUTES[top.name]?.hideTabBar;

  return (
    <>
      <div className="stage">
        {TABS.map((t) => (visited.has(t.id) || t.id === n.tab ? <Stack key={t.id} tab={t.id} routes={n.stacks[t.id]} active={n.tab === t.id} /> : null))}
      </div>
      <NavigationBar hidden={hideBar} />
    </>
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
      <span>{fmtTime(t).replace(/ (AM|PM)/, '')}</span>
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
  const framed = useFrameMode();
  const scheme = s.settings.theme === 'system' ? undefined : s.settings.theme;
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
      {s.account && s.onboarded ? <Shell /> : <Onboarding />}
      <SheetHost />
      <ToastHost />
    </div>
  );

  if (!framed) return app;
  return (
    <div className="desk" data-scheme={scheme}>
      <aside className="desk__brand">
        <div className="desk__logo">
          <LogoMark size={44} />
          <span className="wordmark">BALLS</span>
        </div>
        <h1 className="desk__title">Your local sports world.</h1>
        <p className="desk__lede">Find somewhere to play, book it, split the cost, fill your game and track your season. All in one app.</p>
        <ul className="desk__points">
          <li>
            <b>Explore</b> every pitch, court and pool near you on one map
          </li>
          <li>
            <b>Play Now</b> finds a game that needs players, in seconds
          </li>
          <li>
            <b>Split costs</b> automatically and see who has paid
          </li>
        </ul>
        <p className="desk__note">Interactive prototype · mobile-first · try it on your phone for the full feel</p>
      </aside>
      <div className="device">{app}</div>
    </div>
  );
}
