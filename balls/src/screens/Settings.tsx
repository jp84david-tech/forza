import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  FlaskConical,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Navigation,
  Palette,
  Shapes,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  UserX,
  Wallet } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { InstallRow } from '../components/Install';
import { confirmDialog } from '../components/Sheet';
import { LocationPicker } from '../components/sheets';
import { SportIcon } from '../components/icons';
import { Avatar, Button, Chip, CtaBar, EmptyState, Field, Pill, Row, Screen, Section, Segmented, Stepper, Switch } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { sportName } from '../data/sports';
import type { NotificationCategory, TimeOfDay } from '../data/types';
import { cx, money, moneyExact } from '../lib/format';
import { addDays, dateKey, fmtShortDate, fmtTime, hourLabel, startOfDay, timeAgo, weekdayShort } from '../lib/time';
import { analytics } from '../services/analytics';
import { clearResourceCache } from '../services/api';
import { daySlots, rates } from '../services/availability';
import { methodLabel } from '../services/payments';
import {
  addMaintenanceBlock,
  addTestCard,
  removeMaintenanceBlock,
  removeMethod,
  report,
  resetDemo,
  setDefaultMethod,
  setNotificationPrefs,
  setPrefs,
  setPriceOverride,
  setPrivacy,
  setSettings,
  signOut,
  unblock,
  updateAccount } from '../state/actions';
import { nav } from '../state/nav';
import { availCtx, facilityRating, facilityReviews, userById } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import type { ScreenComponentProps } from './routes';
import { ReviewItem } from './Facility';
import { RatingSummary } from './Facility';

const VERSION = '0.9.0 (prototype)';

export function SettingsScreen() {
  const s = useApp();
  const logout = async () => {
    if (await confirmDialog({ title: 'Log out of BALLS?', body: 'Your bookings stay safe. Log back in any time.', confirm: 'Log out' })) signOut();
  };
  return (
    <Screen title="Settings">
      <div className="pad stack-20">
        <Section title="Account">
          <div className="list-card">
            <Row icon={<UserRound size={18} />} title="Account" subtitle={s.account?.email} onClick={() => nav.push('settingsAccount')} />
            <Row icon={<Avatar name={s.account?.firstName ?? '?'} color={s.account?.color ?? '#333'} photo={s.account?.photo} size={22} />} title="Profile" subtitle="Name, photo, username" onClick={() => nav.push('editProfile')} />
            <Row icon={<Shapes size={18} />} title="Favourite sports" subtitle={s.profile.sports.map((x) => sportName(x.sport)).join(', ') || 'None yet'} onClick={() => nav.push('editSports')} />
            <Row icon={<MapPin size={18} />} title="Location" subtitle={s.location ? `${s.location.label} · ${s.location.source === 'device' ? 'from device' : 'chosen manually'}` : 'Not set'} onClick={() => nav.push('settingsLocation')} />
          </div>
        </Section>
        <Section title="Preferences">
          <div className="list-card">
            <Row icon={<CalendarDays size={18} />} title="Play & booking" subtitle={`Within ${s.prefs.distance} mi · ${s.prefs.splitByDefault ? 'split costs by default' : 'pay in full by default'}`} onClick={() => nav.push('settingsPlay')} />
            <Row icon={<Bell size={18} />} title="Notifications" onClick={() => nav.push('settingsNotifications')} />
            <Row icon={<Palette size={18} />} title="Appearance" subtitle={s.settings.theme === 'system' ? 'Match device' : s.settings.theme === 'dark' ? 'Dark' : 'Light'} onClick={() => nav.push('settingsAppearance')} />
            <InstallRow />
          </div>
        </Section>
        <Section title="Privacy & safety">
          <div className="list-card">
            <Row icon={<ShieldCheck size={18} />} title="Privacy" subtitle={s.privacy.visibility === 'everyone' ? 'Profile visible to everyone' : s.privacy.visibility === 'players' ? 'Visible to players you’ve played with' : 'Private profile'} onClick={() => nav.push('settingsPrivacy')} />
            <Row icon={<Lock size={18} />} title="Security" onClick={() => nav.push('settingsSecurity')} />
            <Row icon={<UserX size={18} />} title="Blocked users" subtitle={s.blocked.length ? `${s.blocked.length} blocked` : 'None'} onClick={() => nav.push('settingsBlocked')} />
          </div>
        </Section>
        <Section title="Payments">
          <div className="list-card">
            <Row icon={<CreditCard size={18} />} title="Payment methods" subtitle={s.paymentMethods.find((m) => m.isDefault) ? methodLabel(s.paymentMethods.find((m) => m.isDefault)!) : 'None saved'} onClick={() => nav.push('settingsPayments')} />
          </div>
        </Section>
        <Section title="Support">
          <div className="list-card">
            <Row icon={<CircleHelp size={18} />} title="Help centre" onClick={() => nav.push('settingsHelp')} />
            <Row icon={<Smartphone size={18} />} title="Report a problem" onClick={() => nav.push('settingsReport')} />
            <Row icon={<FileText size={18} />} title="Terms of service" onClick={() => nav.push('settingsLegal', { doc: 'terms' })} />
            <Row icon={<FileText size={18} />} title="Privacy policy" onClick={() => nav.push('settingsLegal', { doc: 'privacy' })} />
          </div>
        </Section>
        <Section title="For venues">
          <div className="list-card">
            <Row icon={<Building2 size={18} />} title="BALLS for venues" subtitle="Manage prices, availability and bookings" onClick={() => nav.push('partner')} />
          </div>
        </Section>
        <Section title="Prototype">
          <div className="list-card">
            <Row icon={<FlaskConical size={18} />} title="Demo tools" subtitle="Error states, reset data, analytics events" onClick={() => nav.push('settingsDemo')} />
          </div>
        </Section>
        <div className="list-card">
          <Row icon={<LogOut size={18} />} title="Log out" danger onClick={logout} chevron={false} />
        </div>
        <p className="fine center">BALLS {VERSION}</p>
      </div>
    </Screen>
  );
}

export function AccountSettings() {
  const s = useApp();
  const [email, setEmail] = useState(s.account?.email ?? '');
  const err = !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address.' : null;
  return (
    <Screen title="Account">
      <div className="pad stack-20">
        <Field label="Email" htmlFor="acc-email" error={email !== s.account?.email ? err : null} hint="Used to log in and for receipts. Never shown to other players.">
          <input id="acc-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button
          variant="secondary"
          disabled={!!err || email === s.account?.email}
          onClick={() => {
            updateAccount({ email: email.trim() });
            ui.toast('Email updated. We’ve sent a confirmation link.', { tone: 'success' });
          }}
        >
          Update email
        </Button>
        <div className="list-card">
          <Row icon={<KeyRound size={18} />} title="Change password" onClick={() => nav.push('settingsSecurity')} />
          <Row icon={<Globe size={18} />} title="Age group" subtitle={s.account?.ageGroup === 'adult' ? '18 or over' : s.account?.ageGroup === 'u18' ? '16–17 (junior safety settings on)' : '13–15 (junior safety settings on)'} />
          <Row icon={<CalendarDays size={18} />} title="Member since" subtitle={s.account?.joined ? fmtShortDate(s.account.joined) + ' ' + new Date(s.account.joined).getFullYear() : ''} />
        </div>
        <Section title="Your data">
          <div className="list-card">
            <Row icon={<FileText size={18} />} title="Download my data" subtitle="We’ll email you a copy within 48 hours" onClick={() => ui.toast('Request received. We’ll email your data within 48 hours.', { tone: 'success' })} />
            <Row
              icon={<Trash2 size={18} />}
              title="Delete account"
              danger
              onClick={async () => {
                if (await confirmDialog({ title: 'Delete your account?', body: 'Upcoming bookings will be cancelled under each venue’s policy and your profile removed. This can’t be undone.', confirm: 'Delete account', danger: true })) {
                  signOut();
                }
              }}
            />
          </div>
        </Section>
      </div>
    </Screen>
  );
}

export function LocationSettings() {
  return (
    <Screen title="Location">
      <div className="pad stack-16">
        <p className="prose">We use an approximate location (about 500 metres) to find venues and games near you. Other players never see where you are.</p>
        <LocationPicker compact onDone={() => { ui.toast('Location updated', { tone: 'success' }); nav.pop(); }} />
      </div>
    </Screen>
  );
}

const TIMES: Array<[TimeOfDay, string]> = [
  ['morning', 'Mornings'],
  ['afternoon', 'Afternoons'],
  ['evening', 'Evenings'],
];

export function PlaySettings() {
  const s = useApp();
  const p = s.prefs;
  const toggleTime = (t: TimeOfDay) => setPrefs({ times: p.times.includes(t) ? p.times.filter((x) => x !== t) : [...p.times, t] });
  const toggleDay = (d: number) => setPrefs({ days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] });
  return (
    <Screen title="Play & booking">
      <div className="pad stack-24">
        <Section title="Distance">
          <div className="range">
            <label htmlFor="pref-distance">
              Show things within <b>{p.distance} miles</b>
            </label>
            <input id="pref-distance" type="range" min={1} max={10} value={p.distance} onChange={(e) => setPrefs({ distance: Number(e.target.value) })} />
          </div>
        </Section>
        <Section title="When you like to play">
          <div className="chip-row">
            {TIMES.map(([t, label]) => (
              <Chip key={t} active={p.times.includes(t)} onClick={() => toggleTime(t)}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="chip-row">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <Chip key={d} active={p.days.includes(d)} onClick={() => toggleDay(d)}>
                {weekdayShort(addDays(startOfDay(), (d - new Date().getDay() + 7) % 7))}
              </Chip>
            ))}
          </div>
          <p className="fine">Used to recommend games you can realistically make.</p>
        </Section>
        <Section title="Bookings">
          <div className="list-card">
            <label className="row">
              <span className="row__body">
                <span className="row__title">Split costs by default</span>
                <span className="row__sub">Turn on cost splitting at checkout</span>
              </span>
              <Switch checked={p.splitByDefault} onChange={(v) => setPrefs({ splitByDefault: v })} label="Split costs by default" />
            </label>
            <div className="row">
              <span className="row__body">
                <span className="row__title">Default duration</span>
              </span>
              <Segmented label="Default duration" value={String(p.defaultDuration)} onChange={(v) => setPrefs({ defaultDuration: Number(v) })} options={[{ value: '60', label: '1 hr' }, { value: '90', label: '1.5' }, { value: '120', label: '2 hr' }]} className="seg--sm" />
            </div>
          </div>
        </Section>
        <Section title="Directions open in">
          <div className="chip-row">
            {(
              [
                ['ask', 'Ask each time'],
                ['google', 'Google Maps'],
                ['apple', 'Apple Maps'],
                ['citymapper', 'Citymapper'],
                ['waze', 'Waze'],
              ] as const
            ).map(([k, label]) => (
              <Chip key={k} active={p.mapsApp === k} icon={k !== 'ask' ? <Navigation size={14} /> : undefined} onClick={() => setPrefs({ mapsApp: k })}>
                {label}
              </Chip>
            ))}
          </div>
        </Section>
      </div>
    </Screen>
  );
}

const NOTI_ROWS: Array<[NotificationCategory | 'reminders', string, string]> = [
  ['bookings', 'Bookings', 'Confirmations and cancellations'],
  ['reminders', 'Reminders', 'Before your bookings and games'],
  ['games', 'Game updates', 'Players joining or leaving, games filling up'],
  ['waitlist', 'Waitlist & availability', 'When a slot you want opens up'],
  ['invitations', 'Invitations', 'When someone invites you to play'],
  ['messages', 'Messages', 'New messages in game chats'],
  ['payments', 'Payments & refunds', 'Shares paid, refunds sent'],
  ['competitions', 'Tournaments & leagues', 'Registration, fixtures and results'],
  ['achievements', 'Achievements', 'When you unlock a badge'],
];

export function NotificationSettings() {
  const s = useApp();
  return (
    <Screen title="Notifications">
      <div className="pad stack-16">
        <div className="list-card">
          {NOTI_ROWS.map(([k, title, sub]) => (
            <label key={k} className="row">
              <span className="row__body">
                <span className="row__title">{title}</span>
                <span className="row__sub">{sub}</span>
              </span>
              <Switch checked={s.notificationPrefs[k]} onChange={(v) => setNotificationPrefs({ [k]: v })} label={title} />
            </label>
          ))}
        </div>
        <p className="fine">We never send marketing notifications. Muted game chats stay muted whatever you choose here.</p>
      </div>
    </Screen>
  );
}

export function AppearanceSettings() {
  const s = useApp();
  const opts = [
    { v: 'dark' as const, label: 'Dark', icon: <Moon size={20} /> },
    { v: 'light' as const, label: 'Light', icon: <Sun size={20} /> },
    { v: 'system' as const, label: 'Match device', icon: <Monitor size={20} /> },
  ];
  return (
    <Screen title="Appearance">
      <div className="pad">
        <div className="theme-pick" role="radiogroup" aria-label="Theme">
          {opts.map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={s.settings.theme === o.v} className={cx('theme-opt', `theme-opt--${o.v}`, s.settings.theme === o.v && 'is-on')} onClick={() => setSettings({ theme: o.v, themeChosen: true })}>
              <span className="theme-opt__preview" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="theme-opt__label">
                {o.icon} {o.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}

export function PrivacySettings() {
  const s = useApp();
  const p = s.privacy;
  const minor = s.account?.ageGroup !== 'adult';
  return (
    <Screen title="Privacy">
      <div className="pad stack-24">
        {minor && (
          <p className="notice notice--safe">
            <ShieldCheck size={16} /> Junior safety settings are on for your account. Some options are fixed.
          </p>
        )}
        <Section title="Who can see your profile">
          <div className="radio-list">
            {(
              [
                ['everyone', 'Everyone on BALLS', 'Name, sports, levels, badges and reliability'],
                ['players', 'Players you’ve played with', 'Others see your first name only'],
                ['private', 'Only you', 'Others see your first name in games you join'],
              ] as const
            ).map(([k, title, sub]) => (
              <label key={k} className={cx('radio-row', p.visibility === k && 'is-on')}>
                <input type="radio" name="vis" checked={p.visibility === k} disabled={minor && k === 'everyone'} onChange={() => setPrivacy({ visibility: k })} />
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
              </label>
            ))}
          </div>
        </Section>
        <div className="list-card">
          <label className="row">
            <span className="row__body">
              <span className="row__title">Show me on leaderboards</span>
              <span className="row__sub">Your first name and stats</span>
            </span>
            <Switch checked={p.showOnLeaderboards} onChange={(v) => setPrivacy({ showOnLeaderboards: v })} label="Show me on leaderboards" />
          </label>
          <label className="row">
            <span className="row__body">
              <span className="row__title">Show my area</span>
              <span className="row__sub">Neighbourhood only, e.g. “{s.location?.label ?? 'Tufnell Park'}”. Never your address.</span>
            </span>
            <Switch checked={p.showArea} onChange={(v) => setPrivacy({ showArea: v })} label="Show my area" />
          </label>
        </div>
        <Section title="Who can invite you">
          <Segmented
            label="Who can invite you"
            value={p.invitesFrom}
            onChange={(v) => setPrivacy({ invitesFrom: v })}
            options={[
              { value: 'everyone', label: 'Anyone' },
              { value: 'played-with', label: 'Played with' },
              { value: 'nobody', label: 'Nobody' },
            ]}
          />
        </Section>
        <p className="fine">BALLS never shows your email, phone number or exact location to other players.</p>
      </div>
    </Screen>
  );
}

export function SecuritySettings() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [twofa, setTwofa] = useState(false);
  const err = next && next.length < 8 ? 'Use at least 8 characters.' : null;
  return (
    <Screen title="Security">
      <div className="pad stack-20">
        <Section title="Change password">
          <form
            className="stack-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!cur || !next || err) return;
              setCur('');
              setNext('');
              ui.toast('Password changed. Other devices have been logged out.', { tone: 'success' });
            }}
          >
            <Field label="Current password" htmlFor="sec-cur">
              <input id="sec-cur" className="input" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </Field>
            <Field label="New password" htmlFor="sec-new" error={err}>
              <input id="sec-new" className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" disabled={!cur || !next || !!err}>
              Update password
            </Button>
          </form>
        </Section>
        <div className="list-card">
          <label className="row">
            <span className="row__body">
              <span className="row__title">Two-step verification</span>
              <span className="row__sub">Ask for a code when you log in on a new device</span>
            </span>
            <Switch
              checked={twofa}
              onChange={(v) => {
                setTwofa(v);
                ui.toast(v ? 'Two-step verification on' : 'Two-step verification off');
              }}
              label="Two-step verification"
            />
          </label>
        </div>
        <Section title="Where you’re logged in">
          <div className="list-card">
            <Row icon={<Smartphone size={18} />} title="This device" subtitle="Active now" trailing={<Pill tone="success">Current</Pill>} />
          </div>
        </Section>
      </div>
    </Screen>
  );
}

export function PaymentSettings() {
  const s = useApp();
  return (
    <Screen title="Payment methods">
      <div className="pad stack-20">
        {s.paymentMethods.length ? (
          <div className="list-card">
            {s.paymentMethods.map((m) => (
              <div key={m.id} className="row">
                <span className="row__icon">{m.brand.includes('pay') ? <Wallet size={18} /> : <CreditCard size={18} />}</span>
                <span className="row__body">
                  <span className="row__title">{methodLabel(m)}</span>
                  <span className="row__sub">{m.isDefault ? 'Default' : m.expiry ? `Expires ${m.expiry}` : 'Wallet'}</span>
                </span>
                <span className="row__trail row__trail--actions">
                  {!m.isDefault && (
                    <button type="button" className="link link--sm" onClick={() => setDefaultMethod(m.id)}>
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    className="link link--sm link--danger"
                    onClick={async () => {
                      if (await confirmDialog({ title: `Remove ${methodLabel(m)}?`, confirm: 'Remove', danger: true })) removeMethod(m.id);
                    }}
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<CreditCard size={22} />} title="No payment methods saved." />
        )}
        <Section title="Add a card">
          <p className="fine">
            <Lock size={13} /> In the live app you enter card details in our payment provider’s secure form. BALLS stores only a token and the last four digits, never your card number. For this prototype, add a test card:
          </p>
          <div className="chip-row">
            {(['visa', 'mastercard', 'amex'] as const).map((b) => (
              <Button key={b} size="sm" variant="secondary" onClick={() => addTestCard(b)}>
                {b === 'visa' ? 'Visa test card' : b === 'mastercard' ? 'Mastercard test card' : 'Amex test card'}
              </Button>
            ))}
          </div>
        </Section>
        <Section title="Recent payments">
          <div className="list-card">
            {s.payments.slice(0, 8).map((p) => (
              <div key={p.id} className="row">
                <span className="row__body">
                  <span className="row__title">{p.description}</span>
                  <span className="row__sub">
                    {fmtShortDate(p.createdAt)} · {p.status === 'succeeded' ? 'Paid' : p.status === 'refunded' ? 'Refunded' : `${moneyExact(p.refunded)} refunded`}
                  </span>
                </span>
                <span className="row__trail">{moneyExact(p.amount)}</span>
              </div>
            ))}
            {!s.payments.length && <p className="fine pad-s">No payments yet.</p>}
          </div>
        </Section>
      </div>
    </Screen>
  );
}

export function BlockedSettings() {
  const s = useApp();
  return (
    <Screen title="Blocked users">
      <div className="pad">
        {s.blocked.length ? (
          <div className="list-card">
            {s.blocked.map((id) => {
              const u = userById(s, id);
              if (!u) return null;
              return (
                <div key={id} className="row">
                  <span className="row__icon">
                    <Avatar name={u.name} color={u.color} size={32} />
                  </span>
                  <span className="row__body">
                    <span className="row__title">{u.name}</span>
                    <span className="row__sub">@{u.username}</span>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => unblock(id)}>
                    Unblock
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<UserX size={26} />} title="You haven’t blocked anyone." body="Blocked players can’t see your games, message you or invite you." />
        )}
      </div>
    </Screen>
  );
}

const FAQ = [
  ['How does splitting the cost work?', 'You pay the full price to secure the booking. Each player then pays their share through BALLS, and it goes back to you. You can see who has paid on the booking page. A share only shows as paid once the money has cleared.'],
  ['What if I need to cancel?', 'Each venue sets its own cancellation policy, shown before you pay. Cancel from the booking page and we show your refund before you confirm.'],
  ['How do waitlists work?', 'Tap a full slot to join its waitlist. If someone cancels, we notify you and hold the slot for 15 minutes. You only pay if you book it.'],
  ['What is reliability?', 'A percentage showing how often a player turns up to games they join. Late cancellations and no-shows lower it. It appears after 5 games.'],
  ['Is my location shared?', 'No. We use an approximate area to find sport near you. Other players only ever see your neighbourhood, and only if you allow it.'],
  ['Are skill levels checked?', 'No. Levels are chosen by each player as a guide, so games stay welcoming.'],
];

export function HelpSettings() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen title="Help centre">
      <div className="pad stack-16">
        <div className="faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={cx('faq__item', open === i && 'is-open')}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {q}
                <ChevronRight size={16} />
              </button>
              {open === i && <p>{a}</p>}
            </div>
          ))}
        </div>
        <Button variant="secondary" block onClick={() => nav.push('settingsReport')}>
          Still stuck? Contact support
        </Button>
      </div>
    </Screen>
  );
}

export function ReportProblemSettings() {
  const [area, setArea] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <Screen title="Report a problem">
        <EmptyState icon={<ShieldCheck size={26} />} title="Thanks, we’ve got it." body="Our support team replies by email, usually within a day." action={{ label: 'Done', onClick: () => nav.pop() }} />
      </Screen>
    );
  return (
    <Screen
      title="Report a problem"
      footer={
        <CtaBar>
          <Button
            block
            size="lg"
            disabled={!area || text.trim().length < 10}
            onClick={() => {
              report('facility', 'app', area!, text);
              setSent(true);
            }}
          >
            Send
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-16">
        <div className="field">
          <span className="field__label">What’s it about?</span>
          <div className="chip-wrap">
            {['A booking', 'A payment or refund', 'A game or player', 'A venue’s details', 'The app isn’t working', 'Something else'].map((x) => (
              <Chip key={x} active={area === x} onClick={() => setArea(x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="What happened?" htmlFor="rp-text" hint="At least 10 characters.">
          <textarea id="rp-text" className="input textarea" rows={6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </div>
    </Screen>
  );
}

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of service',
    body: [
      'BALLS helps you find, book and organise sport. Venues provide the facilities; organisers run their own games.',
      'Bookings are contracts between you and the venue. Prices, rules and cancellation policies are set by each venue and shown before you pay.',
      'When you split a cost, you pay the full amount to secure the booking. Other players’ shares are collected through BALLS and passed back to you.',
      'Be respectful. Harassment, discrimination, spam and asking for payment outside BALLS can lead to your account being suspended.',
      'Play safely and within your ability. Skill levels are self-reported and aren’t verified by BALLS.',
      'Users must be 13 or older. Under-18 accounts have extra safety restrictions.',
    ] },
  privacy: {
    title: 'Privacy policy',
    body: [
      'We collect what we need to run BALLS: your name, email, the sports you play, bookings and an approximate location.',
      'Other players see your first name, last initial, username, sports and, if you allow it, your neighbourhood. We never show your email, phone number or address.',
      'Payment details are handled by our payment provider. We store a token and the last four digits of your card only.',
      'We use product analytics that record actions (for example “booking completed”) without names, messages or precise locations.',
      'You can download or delete your data at any time from Settings → Account.',
    ] } };

export function LegalSettings({ params }: ScreenComponentProps) {
  const doc = DOCS[params.doc ?? 'terms'];
  return (
    <Screen title={doc.title}>
      <div className="pad prose stack-12">
        <p className="fine">Prototype summary · last updated September 2026</p>
        {doc.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- demo tools

export function DemoSettings() {
  const s = useApp();
  const events = useSyncExternalStore(analytics.subscribe, analytics.events, analytics.events);
  const [, force] = useState(0);
  useEffect(() => analytics.subscribe(() => force((x) => x + 1)) as unknown as () => void, []);
  return (
    <Screen title="Demo tools">
      <div className="pad stack-20">
        <div className="list-card">
          <label className="row">
            <span className="row__body">
              <span className="row__title">Simulate network errors</span>
              <span className="row__sub">First load of each screen fails, and every other payment is declined, so you can see error and retry states</span>
            </span>
            <Switch
              checked={s.settings.simulateErrors}
              onChange={(v) => {
                setSettings({ simulateErrors: v });
                clearResourceCache();
              }}
              label="Simulate network errors"
            />
          </label>
          <Row
            icon={<Trash2 size={18} />}
            title="Reset demo data"
            subtitle="Restore the sample bookings, games and notifications"
            onClick={async () => {
              if (await confirmDialog({ title: 'Reset demo data?', body: 'Everything you’ve booked or changed in this prototype will be reset.', confirm: 'Reset', danger: true })) resetDemo();
            }}
          />
        </div>
        <Section title={`Analytics events · ${events.length}`}>
          <p className="fine">Recorded locally. No names, messages or precise locations are ever included.</p>
          <ol className="events">
            {events.slice(0, 40).map((e, i) => (
              <li key={i}>
                <b>{e.name}</b>
                <code>{Object.entries(e.props).map(([k, v]) => `${k}=${v}`).join(' ') || '—'}</code>
                <small>{timeAgo(e.at)}</small>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- venue dashboard (admin foundation)

export function PartnerScreen() {
  const s = useApp();
  const partners = FACILITIES.filter((f) => f.partner);
  const [fid, setFid] = useState(partners[0].id);
  const [tab, setTab] = useState<'today' | 'pricing' | 'availability' | 'reviews'>('today');
  const f = FACILITY_BY_ID[fid];
  const spaces = spacesFor(fid).filter((x) => !x.walkUp);
  const ctx = availCtx(s);
  const today = startOfDay();
  const todays = spaces.flatMap((sp) =>
    daySlots(sp, today, 60, ctx)
      .filter((x) => x.state === 'full' || x.state === 'mine')
      .map((x) => ({ sp, x })),
  );
  const totalSlots = spaces.reduce((n, sp) => n + daySlots(sp, today, 60, ctx).length, 0);
  const revenue = todays.reduce((t, { sp, x }) => t + (sp.unit === 'session' ? x.price * Math.max(1, sp.capacity - (x.spotsLeft ?? 0)) : x.price), 0);
  const rating = facilityRating(s, f);

  const [prices, setPrices] = useState<Record<string, { offPeak: number; peak: number }>>({});
  useEffect(() => setPrices(Object.fromEntries(spaces.map((sp) => [sp.id, rates(sp, s)]))), [fid]); // eslint-disable-line react-hooks/exhaustive-deps

  const [blockSpace, setBlockSpace] = useState(spaces[0]?.id);
  const [blockDay, setBlockDay] = useState(dateKey(addDays(today, 1)));
  const [blockFrom, setBlockFrom] = useState(9);
  const [blockTo, setBlockTo] = useState(12);
  useEffect(() => setBlockSpace(spaces[0]?.id), [fid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title="BALLS for venues">
      <div className="pad stack-16">
        <p className="notice">
          <Building2 size={16} /> Venue dashboard preview. Changes here update what players see in this prototype.
        </p>
        <Field label="Venue" htmlFor="pv-venue">
          <select id="pv-venue" className="input" value={fid} onChange={(e) => setFid(e.target.value)}>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Segmented label="Dashboard" value={tab} onChange={setTab} options={[{ value: 'today', label: 'Today' }, { value: 'pricing', label: 'Prices' }, { value: 'availability', label: 'Block' }, { value: 'reviews', label: 'Reviews' }]} />

        {tab === 'today' && (
          <>
            <div className="kpis">
              <div>
                <span>Bookings today</span>
                <b>{todays.length}</b>
              </div>
              <div>
                <span>Utilisation</span>
                <b>{totalSlots ? Math.round((todays.length / totalSlots) * 100) : 0}%</b>
              </div>
              <div>
                <span>Revenue today</span>
                <b>{money(revenue, { free: false })}</b>
              </div>
            </div>
            <Section title="Today’s bookings">
              <div className="list-card">
                {todays.length ? (
                  todays
                    .sort((a, b) => a.x.start.getTime() - b.x.start.getTime())
                    .map(({ sp, x }) => (
                      <div key={sp.id + x.start.toISOString()} className="row">
                        <span className="row__icon">
                          <SportIcon sport={sp.sport} size={17} />
                        </span>
                        <span className="row__body">
                          <span className="row__title">
                            {fmtTime(x.start)} · {sp.name}
                          </span>
                          <span className="row__sub">{x.state === 'mine' ? 'Booked on BALLS (you)' : sp.unit === 'session' ? `${sp.capacity - (x.spotsLeft ?? 0)} booked` : 'Booked · paid'}</span>
                        </span>
                        <span className="row__trail">{money(x.price, { free: false })}</span>
                      </div>
                    ))
                ) : (
                  <p className="fine pad-s">No bookings today yet.</p>
                )}
              </div>
            </Section>
            <Section title="Coming to the dashboard">
              <ul className="rules">
                <li>Add courts and pitches, opening hours and photos</li>
                <li>Create events and run tournaments</li>
                <li>Handle cancellations and refunds</li>
              </ul>
            </Section>
          </>
        )}

        {tab === 'pricing' && (
          <>
            {spaces.map((sp) => {
              const p = prices[sp.id] ?? rates(sp, s);
              return (
                <div key={sp.id} className="pricerow">
                  <b>
                    {sp.name} <small>{sportName(sp.sport)}</small>
                  </b>
                  <div className="pricerow__steppers">
                    <span>Off-peak</span>
                    <Stepper value={p.offPeak / 100} min={0} max={200} label={`${sp.name} off-peak price`} format={(v) => `£${v}`} onChange={(v) => setPrices((x) => ({ ...x, [sp.id]: { ...p, offPeak: v * 100 } }))} />
                    <span>Peak</span>
                    <Stepper value={p.peak / 100} min={0} max={200} label={`${sp.name} peak price`} format={(v) => `£${v}`} onChange={(v) => setPrices((x) => ({ ...x, [sp.id]: { ...p, peak: v * 100 } }))} />
                  </div>
                </div>
              );
            })}
            <Button
              block
              onClick={() => {
                Object.entries(prices).forEach(([id, p]) => {
                  const cur = rates(spacesFor(fid).find((x) => x.id === id)!, s);
                  if (cur.offPeak !== p.offPeak || cur.peak !== p.peak) setPriceOverride(id, p.offPeak, p.peak);
                });
              }}
            >
              Save prices
            </Button>
          </>
        )}

        {tab === 'availability' && (
          <>
            <p className="fine">Block a space for maintenance or a private event. Players can’t book blocked times.</p>
            <div className="form-grid">
              <Field label="Space" htmlFor="pv-space">
                <select id="pv-space" className="input" value={blockSpace} onChange={(e) => setBlockSpace(e.target.value)}>
                  {spaces.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date" htmlFor="pv-date">
                <input id="pv-date" className="input" type="date" min={dateKey(today)} value={blockDay} onChange={(e) => setBlockDay(e.target.value)} />
              </Field>
              <Field label="From" htmlFor="pv-from">
                <select id="pv-from" className="input" value={blockFrom} onChange={(e) => setBlockFrom(Number(e.target.value))}>
                  {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="To" htmlFor="pv-to">
                <select id="pv-to" className="input" value={blockTo} onChange={(e) => setBlockTo(Number(e.target.value))}>
                  {Array.from({ length: 17 }, (_, i) => i + 7)
                    .filter((h) => h > blockFrom)
                    .map((h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <Button block onClick={() => blockSpace && addMaintenanceBlock({ spaceId: blockSpace, date: blockDay, from: blockFrom, to: Math.max(blockTo, blockFrom + 1), reason: 'Maintenance' })}>
              Block out time
            </Button>
            <Section title="Blocked times">
              <div className="list-card">
                {s.blocks.filter((b) => spaces.some((sp) => sp.id === b.spaceId)).length ? (
                  s.blocks
                    .filter((b) => spaces.some((sp) => sp.id === b.spaceId))
                    .map((b) => (
                      <div key={b.id} className="row">
                        <span className="row__body">
                          <span className="row__title">{spaces.find((sp) => sp.id === b.spaceId)?.name}</span>
                          <span className="row__sub">
                            {fmtShortDate(b.date + 'T12:00:00')} · {hourLabel(b.from)}–{hourLabel(b.to)} · {b.reason}
                          </span>
                        </span>
                        <button type="button" className="link link--sm link--danger" onClick={() => removeMaintenanceBlock(b.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="fine pad-s">Nothing blocked.</p>
                )}
              </div>
            </Section>
          </>
        )}

        {tab === 'reviews' && (
          <>
            <RatingSummary rating={rating} count={rating.count} />
            <div className="reviews">
              {facilityReviews(s, fid)
                .slice(0, 6)
                .map((r) => (
                  <ReviewItem key={r.id} r={r} />
                ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}

