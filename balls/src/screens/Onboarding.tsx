import { Camera, Check, ChevronLeft, Eye, EyeOff, Lock, MapPin, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SportCard } from '../components/cards';
import { LogoMark, SportIcon } from '../components/icons';
import { MapView, type MapMarkerData } from '../components/MapView';
import { LocationPicker } from '../components/sheets';
import { Button, Field } from '../components/ui';
import { FACILITIES, spacesFor } from '../data/facilities';
import { AVATAR_COLORS, TAKEN_USERNAMES } from '../data/people';
import { SKILL_LEVELS, sportName } from '../data/sports';
import type { AgeGroup, SkillLevel, SportId } from '../data/types';
import { cx, money } from '../lib/format';
import { distanceMiles } from '../lib/geo';
import { browseAsGuest, requestPasswordReset, signInDemo, signUp } from '../state/actions';
import { getState, useApp } from '../state/store';
import { MAP_CENTER } from '../data/map';

type Step = 'welcome' | 'login' | 'forgot' | 'sports' | 'levels' | 'distance' | 'location' | 'profile';
const FLOW: Step[] = ['sports', 'levels', 'distance', 'location', 'profile'];
const ALL: SportId[] = ['football', 'basketball', 'tennis', 'padel', 'badminton', 'volleyball', 'cricket', 'rugby', 'running', 'gym', 'swimming', 'other'];

const WELCOME_MARKERS: MapMarkerData[] = FACILITIES.slice(0, 14).map((f) => {
  const sp = spacesFor(f.id)[0];
  return { id: f.id, lat: f.lat, lng: f.lng, sport: sp.sport, label: sp.walkUp ? 'Free' : money(sp.offPeak), title: f.name };
});

function Welcome({ go }: { go: (s: Step) => void }) {
  return (
    <div className="welcome">
      <div className="welcome__map" aria-hidden="true">
        <MapView markers={WELCOME_MARKERS} interactive={false} initialZoom={0.085} center={{ lat: 51.5655, lng: -0.1335 }} user={{ lat: 51.5567, lng: -0.138 }} controls={false} />
        <div className="welcome__fade" />
        <div className="welcome__live welcome__live--a">
          <span className="live-dot" /> 5-a-side · 7 PM · 2 spots left
        </div>
        <div className="welcome__live welcome__live--b">
          <span className="live-dot" /> Padel doubles · need 1
        </div>
        <div className="welcome__live welcome__live--c">
          <span className="live-dot" /> Court free now · £12
        </div>
      </div>
      <div className="welcome__body">
        <LogoMark size={52} />
        <div className="eyebrow eyebrow--light">Welcome to BALLS</div>
        <h1 className="welcome__title">Your local sports world.</h1>
        <p className="welcome__lede">Find a pitch, book a court, join a game tonight. Sport is happening around you right now.</p>
        <div className="welcome__actions">
          <Button size="lg" block onClick={() => go('sports')}>
            Get started
          </Button>
          <Button size="lg" block variant="night" onClick={() => go('login')}>
            I have an account
          </Button>
          <button type="button" className="welcome__guest" onClick={browseAsGuest}>
            Just look around
          </button>
        </div>
      </div>
    </div>
  );
}

function StepShell({ step, onBack, title, lede, children, footer, backLabel = 'Back', progress = true }: { step: number; onBack: () => void; title: string; lede?: string; children: React.ReactNode; footer: React.ReactNode; backLabel?: string; progress?: boolean }) {
  return (
    <div className="onb">
      <header className="onb__top">
        <button type="button" className="iconbtn iconbtn--plain" onClick={onBack} aria-label={backLabel}>
          {backLabel === 'Close' ? <X size={24} strokeWidth={2.2} /> : <ChevronLeft size={24} strokeWidth={2.2} />}
        </button>
        {progress && (
          <>
            <div className="onb__progress" role="progressbar" aria-valuemin={1} aria-valuemax={FLOW.length} aria-valuenow={step} aria-label={`Step ${step} of ${FLOW.length}`}>
              {FLOW.map((_, i) => (
                <span key={i} className={cx('onb__bar', i < step && 'is-done')} />
              ))}
            </div>
            <span className="onb__count">
              {step}/{FLOW.length}
            </span>
          </>
        )}
      </header>
      <div className="onb__scroll">
        <h1 className="onb__title">{title}</h1>
        {lede && <p className="onb__lede">{lede}</p>}
        {children}
      </div>
      <footer className="onb__foot">{footer}</footer>
    </div>
  );
}

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d')!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoInput({ photo, color, name, onChange }: { photo?: string; color: string; name: string; onChange: (p: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const initials = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div className="photo-input">
      <button type="button" className="photo-input__btn" style={{ background: color }} onClick={() => input.current?.click()} aria-label="Add a profile photo">
        {photo ? <img src={photo} alt="" /> : <span>{initials}</span>}
        <span className="photo-input__cam">
          <Camera size={14} />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await resizePhoto(f).catch(() => undefined));
        }}
      />
      {photo && (
        <button type="button" className="link" onClick={() => onChange(undefined)}>
          Remove photo
        </button>
      )}
    </div>
  );
}

function Login({ go, onBack, onSignUp }: { go: (s: Step) => void; onBack: () => void; onSignUp?: () => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<{ email?: string; pw?: string }>({});
  const [loading, setLoading] = useState(false);
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const next: typeof err = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter the email you signed up with.';
    if (pw.length < 8) next.pw = 'Passwords are at least 8 characters.';
    setErr(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setTimeout(signInDemo, 700);
  };
  return (
    <div className="onb">
      <header className="onb__top">
        <button type="button" className="iconbtn iconbtn--plain" onClick={onBack} aria-label="Back">
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
      </header>
      <form className="onb__scroll" onSubmit={submit} noValidate>
        <h1 className="onb__title">Welcome back.</h1>
        <p className="onb__lede">Log in to see your games, bookings and stats.</p>
        <div className="social">
          <Button variant="outline" block size="lg" onClick={() => { setLoading(true); setTimeout(signInDemo, 600); }}>
            Continue with Apple
          </Button>
          <Button variant="outline" block size="lg" onClick={() => { setLoading(true); setTimeout(signInDemo, 600); }}>
            Continue with Google
          </Button>
        </div>
        <div className="or">
          <span>or</span>
        </div>
        <Field label="Email" htmlFor="login-email" error={err.email}>
          <input id="login-email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="login-pw" error={err.pw}>
          <div className="input-wrap">
            <input id="login-pw" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="input-wrap__btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <button type="button" className="link" onClick={() => go('forgot')}>
          Forgot password?
        </button>
        <Button type="submit" block size="lg" loading={loading} className="mt-16">
          Log in
        </Button>
        <p className="demo-hint">
          <Sparkles size={14} /> Demo: any email and a password of 8+ characters opens the sample account (David).
        </p>
        {onSignUp && (
          <p className="onb__switch">
            New to BALLS?{' '}
            <button type="button" className="link" onClick={onSignUp}>
              Create a free account
            </button>
          </p>
        )}
      </form>
    </div>
  );
}

function Forgot({ go }: { go: (s: Step) => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="onb">
      <header className="onb__top">
        <button type="button" className="iconbtn iconbtn--plain" onClick={() => go('login')} aria-label="Back">
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
      </header>
      {state === 'sent' ? (
        <div className="onb__scroll">
          <div className="done">
            <span className="done__icon">
              <Check size={28} />
            </span>
            <h3>Check your inbox</h3>
            <p>If an account exists for {email}, we’ve sent a link to reset your password. It expires in 30 minutes.</p>
          </div>
          <Button block size="lg" onClick={() => go('login')}>
            Back to log in
          </Button>
        </div>
      ) : (
        <form
          className="onb__scroll"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) {
              setErr('Enter a valid email address.');
              return;
            }
            setErr(null);
            setState('sending');
            await requestPasswordReset();
            setState('sent');
          }}
        >
          <h1 className="onb__title">Reset your password</h1>
          <p className="onb__lede">We’ll email you a link to choose a new one.</p>
          <Field label="Email" htmlFor="reset-email" error={err}>
            <input id="reset-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" block size="lg" loading={state === 'sending'}>
            Send reset link
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * First-run onboarding. With `join`, it's the short sign-up a guest sees when
 * they try something that needs an account: just the account form (or log in),
 * closable, returning them to where they were.
 */
export function Onboarding({ join }: { join?: { start: 'signup' | 'login'; onClose: () => void } } = {}) {
  const [step, setStep] = useState<Step>(join ? (join.start === 'login' ? 'login' : 'profile') : 'welcome');
  const [sports, setSports] = useState<SportId[]>([]);
  const [levels, setLevels] = useState<Record<string, SkillLevel>>({});
  const [distance, setDistance] = useState(3);
  const s = useApp();
  const idx = FLOW.indexOf(step);
  const back = () => setStep(idx <= 0 ? 'welcome' : FLOW[idx - 1]);

  const venuesWithin = useMemo(() => {
    const o = s.location ?? { lat: 51.5567, lng: -0.138 };
    return FACILITIES.filter((f) => distanceMiles(o, f) <= distance && (sports.length === 0 || spacesFor(f.id).some((x) => sports.includes(x.sport)))).length;
  }, [distance, sports, s.location]);

  let content: React.ReactNode;
  switch (step) {
    case 'welcome':
      content = <Welcome go={setStep} />;
      break;
    case 'login':
      content = (
        <Login
          go={setStep}
          onBack={join ? (join.start === 'login' ? join.onClose : () => setStep('profile')) : () => setStep('welcome')}
          onSignUp={() => setStep(join ? 'profile' : 'sports')}
        />
      );
      break;
    case 'forgot':
      content = <Forgot go={setStep} />;
      break;
    case 'sports':
      content = (
        <StepShell
          step={1}
          onBack={back}
          title="What do you play?"
          lede="Pick as many as you like. We’ll put these first."
          footer={
            <Button block size="lg" disabled={!sports.length} onClick={() => setStep('levels')}>
              {sports.length ? `Continue with ${sports.length}` : 'Pick at least one'}
            </Button>
          }
        >
          <div className="sport-grid">
            {ALL.map((sp) => (
              <SportCard key={sp} sport={sp} size="lg" active={sports.includes(sp)} onClick={() => setSports((x) => (x.includes(sp) ? x.filter((y) => y !== sp) : [...x, sp]))} />
            ))}
          </div>
        </StepShell>
      );
      break;
    case 'levels':
      content = (
        <StepShell
          step={2}
          onBack={back}
          title="Roughly how good are you?"
          lede="It helps us match you with the right games. Levels are self-chosen and just a guide. Change them anytime."
          footer={
            <Button block size="lg" onClick={() => setStep('distance')}>
              Continue
            </Button>
          }
        >
          <div className="level-list">
            {sports.map((sp) => {
              const cur = levels[sp] ?? 'casual';
              return (
                <div key={sp} className="level-row">
                  <div className="level-row__head">
                    <span className={cx('sportbadge', `sport-${sp}`)} style={{ width: 32, height: 32 }}>
                      <SportIcon sport={sp} size={18} />
                    </span>
                    <b>{sportName(sp)}</b>
                    <span className="level-row__hint">{SKILL_LEVELS.find((l) => l.id === cur)?.hint}</span>
                  </div>
                  <div className="level-pick" role="radiogroup" aria-label={`${sportName(sp)} level`}>
                    {SKILL_LEVELS.map((l) => (
                      <button key={l.id} type="button" role="radio" aria-checked={cur === l.id} className={cx('level-pick__opt', cur === l.id && 'is-on')} onClick={() => setLevels((x) => ({ ...x, [sp]: l.id }))}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </StepShell>
      );
      break;
    case 'distance':
      content = (
        <StepShell
          step={3}
          onBack={back}
          title="How far will you go?"
          lede="We’ll show venues and games within this distance first."
          footer={
            <Button block size="lg" onClick={() => setStep('location')}>
              Continue
            </Button>
          }
        >
          <div className="distance-pick">
            <div className="rings" aria-hidden="true">
              <span className="rings__r rings__r--3" />
              <span className="rings__r rings__r--2" />
              <span className="rings__r rings__r--1" style={{ transform: `scale(${0.35 + (distance / 10) * 0.65})` }} />
              <span className="rings__you" />
            </div>
            <div className="distance-pick__value">
              <b>{distance}</b> {distance === 1 ? 'mile' : 'miles'}
            </div>
            <p className="distance-pick__count">
              {venuesWithin} {venuesWithin === 1 ? 'venue' : 'venues'} for your sports in range
            </p>
            <input type="range" min={1} max={10} step={1} value={distance} onChange={(e) => setDistance(Number(e.target.value))} aria-label="Preferred distance in miles" />
            <div className="chip-row chip-row--center">
              {[1, 3, 5, 10].map((d) => (
                <button key={d} type="button" className={cx('chip', distance === d && 'chip--active')} onClick={() => setDistance(d)}>
                  {d} mi
                </button>
              ))}
            </div>
          </div>
        </StepShell>
      );
      break;
    case 'location':
      content = (
        <StepShell step={4} onBack={back} title="Find sport near you" footer={<Button block size="lg" variant="ghost" disabled={!s.location} onClick={() => setStep('profile')}>{s.location ? `Continue with ${s.location.label}` : 'Choose a location to continue'}</Button>}>
          <ul className="why-list">
            <li>
              <MapPin size={18} /> See venues, prices and free slots nearby
            </li>
            <li>
              <Users size={18} /> Get games within your distance, not across London
            </li>
            <li>
              <Lock size={18} /> We only use an approximate area. Other players never see where you are.
            </li>
          </ul>
          <LocationPicker onDone={() => setStep('profile')} />
        </StepShell>
      );
      break;
    case 'profile':
      content = <ProfileStep onBack={join ? join.onClose : back} onLogin={() => setStep('login')} quick={!!join} sports={sports} levels={levels} distance={distance} />;
      break;
  }
  return (
    <div className="onboarding">
      {/* Keyed by step so every step starts fresh at the top. */}
      <div className="onboarding__step" key={step}>
        {content}
      </div>
    </div>
  );
}

function ProfileStep({ onBack, onLogin, quick, sports, levels, distance }: { onBack: () => void; onLogin: () => void; quick: boolean; sports: SportId[]; levels: Record<string, SkillLevel>; distance: number }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [username, setUsername] = useState('');
  const [touchedUser, setTouchedUser] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [terms, setTerms] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [color] = useState(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);

  useEffect(() => {
    if (!touchedUser) setUsername(first ? `${first.toLowerCase().replace(/[^a-z0-9]/g, '')}${last ? last[0].toLowerCase() : ''}` : '');
  }, [first, last, touchedUser]);

  const userErr = !username ? null : !/^[a-z0-9_]{3,20}$/.test(username) ? 'Use 3–20 lowercase letters, numbers or _' : TAKEN_USERNAMES.has(username) ? 'That username is taken' : null;

  const submit = (method: 'email' | 'apple' | 'google' = 'email') => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = 'Tell us your first name.';
    if (!username || userErr) e.username = userErr ?? 'Choose a username.';
    if (method === 'email') {
      if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address.';
      if (pw.length < 8) e.pw = 'Use at least 8 characters.';
    }
    if (!age) e.age = 'Choose your age group.';
    if (!terms) e.terms = 'You need to agree to continue.';
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    const loc = getState().location ?? { label: 'Tufnell Park', lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, source: 'manual' as const };
    setTimeout(
      () =>
        signUp(
          {
            firstName: first.trim(),
            lastName: last.trim(),
            username,
            email: method === 'email' ? email.trim() : `${username}@privaterelay.example`,
            ageGroup: age!,
            sports: sports.map((sp) => ({ sport: sp, level: levels[sp] ?? 'casual' })),
            distance,
            location: loc,
            photo,
            color,
          },
          method,
        ),
      700,
    );
  };

  return (
    <StepShell
      step={5}
      onBack={onBack}
      progress={!quick}
      backLabel={quick ? 'Close' : 'Back'}
      title={quick ? 'Create your free account' : 'Create your profile'}
      lede={quick ? 'Takes about 30 seconds. You’ll go straight back to what you were doing.' : 'This is what other players see. Keep it simple: first name and a username.'}
      footer={
        <Button block size="lg" loading={loading} onClick={() => submit('email')} disabled={tooYoung}>
          Create account
        </Button>
      }
    >
      <PhotoInput photo={photo} color={color} name={first} onChange={setPhoto} />
      <div className="form-grid">
        <Field label="First name" htmlFor="p-first" error={errors.first}>
          <input id="p-first" className="input" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field label="Last name" htmlFor="p-last" optional hint="Only your initial is shown.">
          <input id="p-last" className="input" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
        </Field>
      </div>
      <Field label="Username" htmlFor="p-user" error={errors.username ?? userErr} hint={username && !userErr ? <span className="ok"><Check size={13} /> @{username} is available</span> : undefined}>
        <div className="input-wrap input-wrap--prefix">
          <span className="input-wrap__prefix">@</span>
          <input
            id="p-user"
            className="input"
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => {
              setTouchedUser(true);
              setUsername(e.target.value.toLowerCase());
            }}
          />
        </div>
      </Field>
      <div className="social social--row">
        <Button variant="outline" onClick={() => submit('apple')}>
          Sign up with Apple
        </Button>
        <Button variant="outline" onClick={() => submit('google')}>
          Sign up with Google
        </Button>
      </div>
      <div className="or">
        <span>or with email</span>
      </div>
      <Field label="Email" htmlFor="p-email" error={errors.email} hint="Never shown to other players.">
        <input id="p-email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="p-pw" error={errors.pw} hint="At least 8 characters.">
        <div className="input-wrap">
          <input id="p-pw" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="input-wrap__btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      <fieldset className={cx('field', errors.age && 'has-error')}>
        <legend className="field__label">How old are you?</legend>
        <div className="age-pick">
          {(
            [
              ['adult', '18 or over'],
              ['u18', '16–17'],
              ['u16', '13–15'],
              ['under13', 'Under 13'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cx('chip', (id === 'under13' ? tooYoung : age === id && !tooYoung) && 'chip--active')}
              onClick={() => {
                if (id === 'under13') {
                  setTooYoung(true);
                  setAge(null);
                } else {
                  setTooYoung(false);
                  setAge(id);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tooYoung && <p className="notice">You need to be 13 or older to use BALLS. Ask a parent or guardian about junior sessions at your local sports centre.</p>}
        {(age === 'u18' || age === 'u16') && (
          <p className="notice notice--safe">
            <ShieldCheck size={16} /> Under-18 accounts are private by default. You’ll see junior sessions and venue-run games, and adults you haven’t played with can’t message you.
          </p>
        )}
        {errors.age && <p className="field__error">{errors.age}</p>}
      </fieldset>
      <label className={cx('consent', errors.terms && 'has-error')}>
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span>
          I agree to the <b>Terms</b> and <b>Privacy Policy</b>, and I’ll play fair.
        </span>
      </label>
      {errors.terms && <p className="field__error">{errors.terms}</p>}
      <p className="onb__switch">
        Already have an account?{' '}
        <button type="button" className="link" onClick={onLogin}>
          Log in
        </button>
      </p>
    </StepShell>
  );
}
