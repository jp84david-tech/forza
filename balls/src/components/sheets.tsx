import { Check, ChevronRight, Copy, CreditCard, LocateFixed, Lock, MapPin, MessageCircle, Navigation, Search, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AREAS } from '../data/map';
import { PEOPLE } from '../data/people';
import { SPORT_BY_ID, levelLabel, sportName } from '../data/sports';
import type { Facility, PaymentMethod, ReportTarget, SportId, User } from '../data/types';
import { cx } from '../lib/format';
import { approximate, directionsUrl, distanceMiles } from '../lib/geo';
import { REPORT_REASONS } from '../services/trust';
import { methodLabel } from '../services/payments';
import { addTestCard, block, logResult, report, setLocation, setPrefs } from '../state/actions';
import { getState, useApp } from '../state/store';
import { ui } from '../state/ui';
import { userById } from '../state/selectors';
import { needsAccount } from './Join';
import { SheetBody, SheetFooter, SheetHeader } from './Sheet';
import { Avatar, Button, Chip, Field, Stepper, Switch } from './ui';
import { MAP_CENTER } from '../data/map';

// ---------------------------------------------------------------- directions

const MAPS_APPS = [
  { id: 'google', label: 'Google Maps' },
  { id: 'apple', label: 'Apple Maps' },
  { id: 'citymapper', label: 'Citymapper' },
  { id: 'waze', label: 'Waze' },
] as const;

function DirectionsSheet({ f, close }: { f: Facility; close: () => void }) {
  const [remember, setRemember] = useState(true);
  return (
    <>
      <SheetHeader title="Get directions" subtitle={`${f.name} · ${f.address}, ${f.postcode}`} onClose={close} />
      <SheetBody>
        <div className="list-card">
          {MAPS_APPS.map((a) => (
            <a
              key={a.id}
              className="row row--btn"
              href={directionsUrl(a.id, f, f.name)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (remember) setPrefs({ mapsApp: a.id });
                close();
              }}
            >
              <span className="row__icon">
                <Navigation size={18} />
              </span>
              <span className="row__body">
                <span className="row__title">{a.label}</span>
              </span>
              <ChevronRight size={18} className="row__chev" />
            </a>
          ))}
        </div>
        <label className="check-row">
          <span>Remember my choice</span>
          <Switch checked={remember} onChange={setRemember} label="Remember my choice" />
        </label>
        <p className="fine">Opens in your maps app. You can change this later in Settings.</p>
      </SheetBody>
    </>
  );
}

/** A directions control that goes straight to the user's preferred maps app. */
export function DirectionsButton({ f, variant = 'secondary', block: isBlock, size = 'md', label = 'Directions' }: { f: Facility; variant?: 'secondary' | 'ghost' | 'outline' | 'primary'; block?: boolean; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const s = useApp();
  const app = s.prefs.mapsApp;
  const cls = cx('btn', `btn--${variant}`, `btn--${size}`, isBlock && 'btn--block');
  if (app !== 'ask') {
    return (
      <a className={cls} href={directionsUrl(app, f, f.name)} target="_blank" rel="noopener noreferrer">
        <Navigation size={17} />
        <span className="btn__label">{label}</span>
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => openDirections(f)}>
      <Navigation size={17} />
      <span className="btn__label">{label}</span>
    </button>
  );
}

export function openDirections(f: Facility) {
  ui.open('Get directions', (close) => <DirectionsSheet f={f} close={close} />);
}

// ---------------------------------------------------------------- share

function ShareSheet({ title, text, url, close }: { title: string; text: string; url: string; close: () => void }) {
  const [copied, setCopied] = useState(false);
  const full = `${text} ${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      ui.toast('Link copied', { tone: 'success' });
    } catch {
      const el = document.getElementById('share-text') as HTMLTextAreaElement | null;
      el?.select();
      ui.toast('Press Copy on your keyboard to copy the selected text');
    }
  };
  return (
    <>
      <SheetHeader title={title} onClose={close} />
      <SheetBody>
        <div className="share-preview">
          <textarea id="share-text" readOnly value={full} rows={3} aria-label="Message to share" />
        </div>
        <div className="share-actions">
          <button type="button" className="share-btn" onClick={copy}>
            <span className="share-btn__icon">{copied ? <Check size={20} /> : <Copy size={20} />}</span>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <a className="share-btn" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer">
            <span className="share-btn__icon share-btn__icon--wa">
              <MessageCircle size={20} />
            </span>
            WhatsApp
          </a>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              className="share-btn"
              onClick={() => {
                navigator.share({ title, text, url }).catch(() => ui.toast('Sharing isn’t available here. Copy the link instead.'));
              }}
            >
              <span className="share-btn__icon">
                <Smartphone size={20} />
              </span>
              More
            </button>
          )}
        </div>
      </SheetBody>
    </>
  );
}

export function openShare(opts: { title: string; text: string; path: string }) {
  const url = `https://balls.app/${opts.path}`;
  ui.open(opts.title, (close) => <ShareSheet title={opts.title} text={opts.text} url={url} close={close} />);
}

// ---------------------------------------------------------------- report & block

function ReportSheet({ target, id, name, close }: { target: ReportTarget; id: string; name: string; close: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(target === 'user' || target === 'message');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = target === 'message' ? id.split(':')[0] : id;

  if (sent) {
    return (
      <>
        <SheetHeader title="Report sent" onClose={close} />
        <SheetBody>
          <div className="done">
            <span className="done__icon">
              <ShieldCheck size={28} />
            </span>
            <h3>Thanks for telling us.</h3>
            <p>Our safety team reviews every report, usually within 24 hours. {name} won’t know who reported them.</p>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button block onClick={close}>
            Done
          </Button>
        </SheetFooter>
      </>
    );
  }
  return (
    <>
      <SheetHeader title={`Report ${target === 'facility' ? 'venue' : target}`} subtitle={name} onClose={close} />
      <SheetBody>
        <fieldset className="radio-list">
          <legend className="field__label">What’s wrong?</legend>
          {REPORT_REASONS[target].map((r) => (
            <label key={r} className={cx('radio-row', reason === r && 'is-on')}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </fieldset>
        <Field label="Anything else we should know?" optional htmlFor="report-details" hint="Don’t include anyone’s contact details.">
          <textarea id="report-details" className="input textarea" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        {(target === 'user' || target === 'message') && userId !== 'me' && (
          <label className="check-row">
            <span>Also block {name.split(' ')[0]}</span>
            <Switch checked={alsoBlock} onChange={setAlsoBlock} label="Also block" />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          block
          variant="danger"
          disabled={!reason}
          onClick={() => {
            const res = report(target, id, reason!, details);
            if (!res.ok) {
              setError(res.error ?? 'Couldn’t send report.');
              return;
            }
            if (alsoBlock && (target === 'user' || target === 'message')) block(userId);
            setSent(true);
          }}
        >
          Send report
        </Button>
      </SheetFooter>
    </>
  );
}

export function openReport(target: ReportTarget, id: string, name: string) {
  if (needsAccount('report')) return;
  ui.open('Report', (close) => <ReportSheet target={target} id={id} name={name} close={close} />);
}

// ---------------------------------------------------------------- payment methods

const BRAND_ICON = (m: PaymentMethod) => (m.brand === 'apple-pay' || m.brand === 'google-pay' ? <Wallet size={18} /> : <CreditCard size={18} />);

function PaymentPicker({ selected, onPick, close }: { selected?: string; onPick: (id: string) => void; close: () => void }) {
  const s = useApp();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <SheetHeader title="Pay with" onClose={close} />
      <SheetBody>
        <div className="list-card">
          {s.paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cx('row row--btn', selected === m.id && 'is-selected')}
              onClick={() => {
                onPick(m.id);
                close();
              }}
            >
              <span className="row__icon">{BRAND_ICON(m)}</span>
              <span className="row__body">
                <span className="row__title">{methodLabel(m)}</span>
                {m.expiry && <span className="row__sub">Expires {m.expiry}</span>}
              </span>
              {selected === m.id && <Check size={18} className="row__check" />}
            </button>
          ))}
        </div>
        {adding ? (
          <div className="add-card">
            <p className="fine">
              <Lock size={13} /> In the live app, card details are entered in our payment provider’s secure form. BALLS never sees or stores your card number. For this demo, pick a test card:
            </p>
            <div className="add-card__opts">
              {(['visa', 'mastercard', 'amex'] as const).map((b) => (
                <Button
                  key={b}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const card = addTestCard(b);
                    onPick(card.id);
                    close();
                  }}
                >
                  {b === 'visa' ? 'Visa test card' : b === 'mastercard' ? 'Mastercard test card' : 'Amex test card'}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Button variant="ghost" block icon={<CreditCard size={17} />} onClick={() => setAdding(true)}>
            Add a card
          </Button>
        )}
      </SheetBody>
    </>
  );
}

export function PaymentMethodSelect({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const s = useApp();
  const m = s.paymentMethods.find((x) => x.id === value);
  return (
    <button type="button" className="paysel" onClick={() => ui.open('Payment method', (close) => <PaymentPicker selected={value} onPick={onChange} close={close} />)}>
      <span className="paysel__icon">{m ? BRAND_ICON(m) : <CreditCard size={18} />}</span>
      <span className="paysel__body">
        <span className="paysel__label">{m ? methodLabel(m) : 'Add a payment method'}</span>
        <span className="paysel__sub">
          <Lock size={11} /> Secured by our payment provider
        </span>
      </span>
      <span className="paysel__change">{m ? 'Change' : 'Add'}</span>
    </button>
  );
}

// ---------------------------------------------------------------- invites

function InviteSheet({ title, subtitle, exclude, onSend, share, close, sport }: { title: string; subtitle?: string; exclude: string[]; onSend: (ids: string[]) => void; share?: { text: string; path: string }; close: () => void; sport?: SportId }) {
  const s = useApp();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const people = useMemo(() => {
    const friends = s.following.map((id) => userById(s, id)).filter(Boolean) as User[];
    const others = PEOPLE.filter((p) => !s.following.includes(p.id) && (!sport || p.sports.some((x) => x.sport === sport))).slice(0, 8);
    return [...friends, ...others].filter((p) => !exclude.includes(p.id) && !s.blocked.includes(p.id) && p.visibility !== 'private');
  }, [s, exclude, sport]);
  const list = people.filter((p) => !q || `${p.name} ${p.username}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <>
      <SheetHeader title={title} subtitle={subtitle} onClose={close} />
      <SheetBody>
        {share && (
          <button type="button" className="invite-link" onClick={() => openShare({ title: 'Share invite link', text: share.text, path: share.path })}>
            <span className="invite-link__icon">
              <Copy size={18} />
            </span>
            <span>
              <b>Share an invite link</b>
              <small>Send it to anyone, in any app</small>
            </span>
            <ChevronRight size={18} />
          </button>
        )}
        <div className="searchbar searchbar--inline">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search players" id="invite-search" />
        </div>
        <div className="pick-list" role="group" aria-label="Players">
          {list.map((p) => {
            const on = picked.includes(p.id);
            const main = sport ? p.sports.find((x) => x.sport === sport) ?? p.sports[0] : p.sports[0];
            return (
              <label key={p.id} className={cx('pick', on && 'is-on')}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                <Avatar name={p.name} color={p.color} size={40} />
                <span className="pick__body">
                  <b>{p.name}</b>
                  <small>
                    {s.following.includes(p.id) ? 'Friend' : 'Plays nearby'} · {main ? `${sportName(main.sport)}, ${levelLabel(main.level)}` : `@${p.username}`}
                  </small>
                </span>
                <span className="pick__box" aria-hidden="true">
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
              </label>
            );
          })}
          {!list.length && <p className="fine">No players match “{q}”.</p>}
        </div>
      </SheetBody>
      <SheetFooter>
        <Button
          block
          disabled={!picked.length}
          onClick={() => {
            onSend(picked);
            close();
          }}
        >
          {picked.length ? `Send ${picked.length} ${picked.length === 1 ? 'invite' : 'invites'}` : 'Choose players'}
        </Button>
      </SheetFooter>
    </>
  );
}

export function openInvite(opts: { title: string; subtitle?: string; exclude?: string[]; onSend: (ids: string[]) => void; share?: { text: string; path: string }; sport?: SportId }) {
  ui.open(opts.title, (close) => <InviteSheet {...opts} exclude={opts.exclude ?? []} close={close} />);
}

// ---------------------------------------------------------------- location

export function LocationPicker({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'asking' | 'denied' | 'outside'>('idle');
  const useDevice = () => {
    if (!('geolocation' in navigator)) {
      setStatus('denied');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = approximate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (distanceMiles(p, MAP_CENTER) > 12) {
          setStatus('outside');
          return;
        }
        const nearest = [...AREAS].sort((a, b) => distanceMiles(a, p) - distanceMiles(b, p))[0];
        setLocation({ label: nearest.name, lat: p.lat, lng: p.lng, source: 'device' });
        onDone();
      },
      () => setStatus('denied'),
      { timeout: 8000, maximumAge: 600_000 },
    );
  };
  return (
    <div className="locpick">
      <Button block icon={<LocateFixed size={18} />} loading={status === 'asking'} onClick={useDevice} variant={compact ? 'secondary' : 'primary'} size="lg">
        Use my current location
      </Button>
      {status === 'denied' && <p className="notice">Location access is off, so choose your area below. You can turn it on later in your browser settings.</p>}
      {status === 'outside' && <p className="notice">BALLS is live in North London first. Pick the area nearest to where you play and we’ll show you what’s on.</p>}
      <div className="field__label">Or choose your area</div>
      <div className="area-grid">
        {AREAS.map((a) => (
          <button
            key={a.name}
            type="button"
            className={cx('area', getState().location?.label === a.name && 'is-on')}
            onClick={() => {
              setLocation({ label: a.name, ...approximate(a), source: 'manual' });
              onDone();
            }}
          >
            <MapPin size={15} aria-hidden="true" />
            <span>
              {a.name}
              <small>{a.postcode}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function openLocation() {
  ui.open('Your location', (close) => (
    <>
      <SheetHeader title="Where do you play?" subtitle="We use an approximate location to find sport near you. It’s never shown to other players." onClose={close} />
      <SheetBody>
        <LocationPicker
          compact
          onDone={() => {
            close();
            ui.toast(`Showing sport near ${getState().location?.label}`);
          }}
        />
      </SheetBody>
    </>
  ));
}

// ---------------------------------------------------------------- log a result

function LogResultSheet({ sport, facilityId, start, close }: { sport: SportId; facilityId: string; start: string; close: () => void }) {
  const def = SPORT_BY_ID[sport];
  const [result, setResult] = useState<'W' | 'D' | 'L'>('W');
  const countable = def.stats.filter((x) => x.kind === 'count' && !['games', 'matches', 'sessions', 'swims', 'runs', 'wins'].includes(x.id) && x.id !== 'best5k');
  const [values, setValues] = useState<Record<string, number>>(Object.fromEntries(countable.map((x) => [x.id, 0])));
  const drawable = ['football', 'rugby', 'cricket'].includes(sport);
  const hasResult = !['running', 'gym', 'swimming', 'other'].includes(sport);
  return (
    <>
      <SheetHeader title="Add your stats" subtitle={`${sportName(sport)} · stats are self-reported`} onClose={close} />
      <SheetBody>
        {hasResult && (
          <div className="field">
            <div className="field__label">Result</div>
            <div className="chip-row">
              <Chip active={result === 'W'} onClick={() => setResult('W')}>
                Won
              </Chip>
              {drawable && (
                <Chip active={result === 'D'} onClick={() => setResult('D')}>
                  Drew
                </Chip>
              )}
              <Chip active={result === 'L'} onClick={() => setResult('L')}>
                Lost
              </Chip>
            </div>
          </div>
        )}
        {countable.map((st) => (
          <div key={st.id} className="stat-input">
            <span>{st.label}</span>
            <Stepper value={values[st.id]} min={0} max={sport === 'basketball' ? 80 : 30} label={st.label} onChange={(v) => setValues((x) => ({ ...x, [st.id]: v }))} />
          </div>
        ))}
        {sport === 'running' || sport === 'swimming' ? (
          <div className="stat-input">
            <span>Distance (km)</span>
            <Stepper value={values.distance ?? 0} min={0} max={50} label="Distance" onChange={(v) => setValues((x) => ({ ...x, distance: v }))} />
          </div>
        ) : null}
      </SheetBody>
      <SheetFooter>
        <Button
          block
          onClick={() => {
            logResult({ sport, result: hasResult ? result : 'W', values, facilityId, start });
            close();
          }}
        >
          Save stats
        </Button>
      </SheetFooter>
    </>
  );
}

export function openLogResult(sport: SportId, facilityId: string, start: string) {
  ui.open('Add your stats', (close) => <LogResultSheet sport={sport} facilityId={facilityId} start={start} close={close} />);
}
