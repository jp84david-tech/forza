import { AlertTriangle, ArrowRight, Ban, CalendarDays, Check, ChevronRight, Crown, Flag, Info, Lock, MapPin, MessageCircle, MoreHorizontal, Plus, Send, Share2, ShieldCheck, SlidersHorizontal, UserPlus, Users, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Artwork, sportArt } from '../components/Artwork';
import { GameCard, PlayerCard, ReliabilityBadge, SportBadge, SpotsBar } from '../components/cards';
import { SportIcon } from '../components/icons';
import { confirmDialog, SheetBody, SheetFooter, SheetHeader } from '../components/Sheet';
import { DirectionsButton, openInvite, openReport, openShare, PaymentMethodSelect } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, Field, IconButton, Pill, Row, Screen, Section, Segmented, Stepper } from '../components/ui';
import { FACILITIES, FACILITY_BY_ID, SPACE_BY_ID, spacesFor } from '../data/facilities';
import { defaultPlayers, levelIndex, levelLabel, SKILL_LEVELS, SPORT_BY_ID, sportName } from '../data/sports';
import type { Game, SkillLevel, SportId } from '../data/types';
import { cx, miles, money, moneyExact, plural } from '../lib/format';
import { addDays, at, dateKey, fmtDay, fmtRange, fmtShortDate, fmtTime, fmtWhen, hourLabel, isSameDay, startOfDay, weekdayShort } from '../lib/time';
import { analytics } from '../services/analytics';
import { unavailableReason } from '../services/availability';
import { findGames, type When, WHEN_LABELS } from '../services/discovery';
import { cancelGame, createGame, inviteToGame, joinGame, leaveGame, sendMessage, toggleMute } from '../state/actions';
import { nav } from '../state/nav';
import { availCtx, clashes, distanceTo, firstName, gameById, isMinor, joinedPlayers, levelFor, messagesOf, myRow, playersOf, sportOrder, userById } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import type { ScreenComponentProps } from './routes';

const WHAT_TO_BRING: Partial<Record<SportId, string>> = {
  football: 'Astro boots or trainers, shin pads, a dark and a light top.',
  basketball: 'Indoor or court shoes and water. Balls are provided.',
  tennis: 'Your racket and tennis shoes. Balls are provided.',
  padel: 'A racket (hire available) and trainers with good grip.',
  badminton: 'Non-marking indoor shoes and a racket if you have one.',
  volleyball: 'Water and sun cream. Play barefoot on sand.',
  cricket: 'Bat, pads and gloves if you have them. Helmets available.',
  rugby: 'Boots or astro trainers and a gumshield.',
  running: 'Running shoes and a layer for after.',
  gym: 'Trainers, a towel and a padlock.',
  swimming: 'Swimwear, a towel and goggles.' };

// ---------------------------------------------------------------- Play Now

type PNStep = 'sport' | 'level' | 'when' | 'search' | 'results';

export function PlayNowScreen() {
  const s = useApp();
  const minor = isMinor(s);
  const order = sportOrder(s);
  const [step, setStep] = useState<PNStep>('sport');
  const [sport, setSport] = useState<SportId | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [when, setWhen] = useState<When | null>(null);
  const [distance, setDistance] = useState(s.prefs.distance);
  const [showAll, setShowAll] = useState(false);
  const late = new Date().getHours() >= 21;

  const pick = (fn: () => void, next: PNStep) => {
    fn();
    setTimeout(() => setStep(next), 140);
  };

  useEffect(() => {
    if (step !== 'search') return;
    const t = setTimeout(() => setStep('results'), 1100);
    analytics.track('play_now_searched', { sport: sport ?? '', level: level ?? '', when: when ?? '', distance });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const results = useMemo(
    () => (sport && level && when ? findGames(s, { sport, level, when, maxDistance: distance, levelTolerance: 1 }) : []),
    [s, sport, level, when, distance],
  );
  const counts = useMemo(() => {
    if (!sport || !level) return {} as Record<When, number>;
    return Object.fromEntries((['now', 'tonight', 'tomorrow', 'weekend'] as When[]).map((w) => [w, findGames(s, { sport, level, when: w, maxDistance: Math.max(distance, 5), levelTolerance: 1 }).length])) as Record<When, number>;
  }, [s, sport, level, distance]);
  const wider = useMemo(() => (sport && level && when && !results.length ? findGames(s, { sport, level, when: 'week', maxDistance: 10, levelTolerance: 2 }) : []), [s, sport, level, when, results.length]);

  const fav = s.profile.sports[0];
  const quickWhen: When = late ? 'tomorrow' : 'tonight';
  const stepIndex = { sport: 0, level: 1, when: 2, search: 3, results: 3 }[step];
  const back = () => {
    if (step === 'sport') nav.pop();
    else if (step === 'level') setStep('sport');
    else if (step === 'when') setStep('level');
    else setStep('when');
  };

  return (
    <div className="screen-inner pn force-dark">
      <header className="pn__top">
        <IconButton label={step === 'sport' ? 'Close' : 'Back'} onClick={back}>
          {step === 'sport' ? <X size={22} /> : <ArrowRight size={22} style={{ transform: 'rotate(180deg)' }} />}
        </IconButton>
        <div className="pn__brand">
          <Zap size={16} fill="currentColor" /> Play Now
        </div>
        <div className="pn__dots" aria-label={`Step ${Math.min(stepIndex + 1, 3)} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx(i <= stepIndex && 'is-on')} />
          ))}
        </div>
      </header>

      <div className="pn__body scroll">
        {step === 'sport' && (
          <div className="pn__step" key="sport">
            <h1 className="pn__title">What are you playing?</h1>
            {fav && (
              <button
                type="button"
                className="pn__quick"
                onClick={() => {
                  setSport(fav.sport);
                  setLevel(fav.level);
                  setWhen(quickWhen);
                  setStep('search');
                }}
              >
                <SportIcon sport={fav.sport} size={20} />
                <span>
                  <b>
                    {sportName(fav.sport)} · {levelLabel(fav.level)} · {WHEN_LABELS[quickWhen]}
                  </b>
                  <small>Your usual. One tap.</small>
                </span>
                <ArrowRight size={18} />
              </button>
            )}
            <div className="pn__grid">
              {(showAll ? order : order.slice(0, 8)).map((sp) => (
                <button key={sp} type="button" className={cx('pn__tile', sport === sp && 'is-on')} onClick={() => pick(() => { setSport(sp); setLevel(levelFor(s, sp)); }, 'level')}>
                  <SportIcon sport={sp} size={28} />
                  <span>{sportName(sp)}</span>
                </button>
              ))}
              {!showAll && (
                <button type="button" className="pn__tile pn__tile--more" onClick={() => setShowAll(true)}>
                  <Plus size={24} />
                  <span>More</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'level' && sport && (
          <div className="pn__step" key="level">
            <h1 className="pn__title">Your level?</h1>
            <p className="pn__lede">We’ll show games one level either side, too.</p>
            <div className="pn__list">
              {SKILL_LEVELS.map((l) => (
                <button key={l.id} type="button" className={cx('pn__opt', level === l.id && 'is-on')} onClick={() => pick(() => setLevel(l.id), 'when')}>
                  <span>
                    <b>{l.label}</b>
                    <small>{l.hint}</small>
                  </span>
                  {s.profile.sports.find((x) => x.sport === sport)?.level === l.id && <Pill tone="glass">Your usual</Pill>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'when' && sport && level && (
          <div className="pn__step" key="when">
            <h1 className="pn__title">When?</h1>
            <div className="pn__list">
              {(['now', 'tonight', 'tomorrow', 'weekend'] as When[])
                .filter((w) => !(w === 'tonight' && late))
                .map((w) => (
                  <button key={w} type="button" className={cx('pn__opt', when === w && 'is-on')} onClick={() => pick(() => setWhen(w), 'search')}>
                    <span>
                      <b>{WHEN_LABELS[w]}</b>
                      <small>{counts[w] ? `${plural(counts[w], 'game')} ${counts[w] === 1 ? 'needs' : 'need'} players` : 'Nothing yet, we’ll suggest alternatives'}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
            </div>
          </div>
        )}

        {step === 'search' && (
          <div className="pn__search" key="search" role="status">
            <div className="radar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span className="radar__sweep" />
              <span className="radar__core">{sport && <SportIcon sport={sport} size={30} />}</span>
            </div>
            <p>
              Finding {sport ? sportName(sport).toLowerCase() : ''} games within {distance} miles…
            </p>
          </div>
        )}

        {step === 'results' && sport && level && when && (
          <div className="pn__results" key="results">
            <h1 className="pn__title pn__title--results" aria-live="polite">
              {results.length ? (
                <>
                  {results.length === 1 ? '1 game needs' : `${results.length} games need`} players near you.
                </>
              ) : (
                'No games nearby yet.'
              )}
            </h1>
            <div className="pn__filters" role="toolbar" aria-label="Adjust search">
              <button type="button" className="chip chip--active" onClick={() => setStep('sport')}>
                <SportIcon sport={sport} size={14} /> {sportName(sport)}
              </button>
              <button type="button" className="chip" onClick={() => setStep('level')}>
                {levelLabel(level)}
              </button>
              <button type="button" className="chip" onClick={() => setStep('when')}>
                {WHEN_LABELS[when]}
              </button>
              <button type="button" className="chip" onClick={() => setDistance((d) => (d >= 10 ? 1 : d < 3 ? 3 : d < 5 ? 5 : 10))} aria-label={`Within ${distance} miles. Tap to change`}>
                <SlidersHorizontal size={14} /> {distance} mi
              </button>
            </div>
            {minor && (
              <p className="notice notice--safe">
                <ShieldCheck size={16} /> You’re seeing junior and venue-run games only.
              </p>
            )}
            {results.length ? (
              <div className="cards">
                {results.map((x) => (
                  <GameCard key={x.g.id} game={x.g} reasons={x.reasons} />
                ))}
              </div>
            ) : (
              <div className="pn__empty">
                <p>Try expanding your distance, or start your own game and we’ll tell nearby players.</p>
                <div className="btn-pair">
                  {distance < 10 && (
                    <Button variant="night" onClick={() => setDistance(distance < 5 ? 5 : 10)}>
                      Expand to {distance < 5 ? 5 : 10} miles
                    </Button>
                  )}
                  <Button onClick={() => nav.replace('createGame', { sport })}>Start your own game</Button>
                </div>
                {wider.length > 0 && (
                  <>
                    <h2 className="pn__sub">Close matches this week</h2>
                    <div className="cards">
                      {wider.slice(0, 4).map((x) => (
                        <GameCard key={x.g.id} game={x.g} reasons={x.reasons} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {results.length > 0 && (
              <button type="button" className="pn__create" onClick={() => nav.replace('createGame', { sport })}>
                <Plus size={18} /> None of these? <b>Start your own game</b>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- find a game (browse)

export function GamesScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const [sport, setSport] = useState<SportId | null>((params.sport as SportId) ?? null);
  const [when, setWhen] = useState<When>('week');
  const [myLevel, setMyLevel] = useState(false);
  const [distance, setDistance] = useState<number>(Math.max(5, s.prefs.distance));
  const order = sportOrder(s).filter((sp) => sp !== 'gym' && sp !== 'swimming');
  const list = useMemo(
    () =>
      findGames(s, { sport: sport ?? undefined, when, maxDistance: distance, level: myLevel && sport ? levelFor(s, sport) : undefined, levelTolerance: myLevel ? 0 : 4 }).sort((a, b) =>
        when === 'week' ? a.g.start.localeCompare(b.g.start) : b.score - a.score,
      ),
    [s, sport, when, distance, myLevel],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, typeof list>();
    list.forEach((x) => {
      const k = dateKey(new Date(x.g.start));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(x);
    });
    return [...m.entries()];
  }, [list]);

  return (
    <Screen
      title="Find a game"
      footer={
        <CtaBar label="Can’t find one?" sub="Start a game and nearby players can join">
          <Button icon={<Plus size={17} />} onClick={() => nav.push('createGame', { sport: sport ?? undefined })}>
            Create game
          </Button>
        </CtaBar>
      }
    >
      <div className="pad">
        <div className="hscroll hscroll--chips hscroll--flush">
          <Chip active={!sport} onClick={() => setSport(null)}>
            All sports
          </Chip>
          {order.map((sp) => (
            <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
              {sportName(sp)}
            </Chip>
          ))}
        </div>
        <div className="hscroll hscroll--chips hscroll--flush">
          {(['now', 'tonight', 'tomorrow', 'weekend', 'week'] as When[]).map((w) => (
            <Chip key={w} active={when === w} onClick={() => setWhen(w)}>
              {WHEN_LABELS[w]}
            </Chip>
          ))}
          <Chip active={myLevel} disabled={!sport} onClick={() => setMyLevel(!myLevel)} title={sport ? undefined : 'Pick a sport first'}>
            {sport ? `My level (${levelLabel(levelFor(s, sport))})` : 'My level'}
          </Chip>
          <Chip active onClick={() => setDistance((d) => (d >= 10 ? 1 : d < 3 ? 3 : d < 5 ? 5 : 10))}>
            Within {distance} mi
          </Chip>
        </div>
        {list.length ? (
          byDay.map(([k, items]) => (
            <Section key={k} title={fmtDay(new Date(`${k}T12:00:00`), { tonight: false })}>
              <div className="cards">
                {items.map((x) => (
                  <GameCard key={x.g.id} game={x.g} reasons={x.reasons} />
                ))}
              </div>
            </Section>
          ))
        ) : (
          <EmptyState
            icon={<Users size={24} />}
            title="No games found nearby."
            body="Try expanding your distance."
            action={{ label: distance < 10 ? `Expand to ${distance < 5 ? 5 : 10} miles` : 'Show all times', onClick: () => (distance < 10 ? setDistance(distance < 5 ? 5 : 10) : setWhen('week')) }}
            secondary={{ label: 'Start your own game', onClick: () => nav.push('createGame', { sport: sport ?? undefined }) }}
          />
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- game page

function JoinSheet({ g, close }: { g: Game; close: () => void }) {
  const s = useApp();
  const f = FACILITY_BY_ID[g.facilityId];
  const [method, setMethod] = useState<string | undefined>(s.paymentMethods.find((m) => m.isDefault)?.id ?? s.paymentMethods[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mine = s.profile.sports.find((x) => x.sport === g.sport)?.level;
  const gap = mine ? levelIndex(g.level) - levelIndex(mine) : 0;
  const clash = clashes(s, g.start, g.end, g.id);
  return (
    <>
      <SheetHeader title="Join game" subtitle={`${g.format ?? sportName(g.sport)} · ${fmtWhen(g.start)}`} onClose={close} />
      <SheetBody>
        <div className="joinsum">
          <SportBadge sport={g.sport} size={44} />
          <div>
            <b>{f.name}</b>
            <small>
              {fmtRange(g.start, g.end)} · {levelLabel(g.level)}
            </small>
          </div>
          <span className="joinsum__price">{g.pricePerPlayer ? moneyExact(g.pricePerPlayer) : 'Free'}</span>
        </div>
        {gap >= 2 && (
          <p className="notice notice--warn">
            <AlertTriangle size={16} /> This game is {levelLabel(g.level)} and you usually play {levelLabel(mine!)}. You’re welcome to join, just expect a quick pace.
          </p>
        )}
        {clash && (
          <p className="notice notice--warn">
            <CalendarDays size={16} /> This overlaps with something you’ve already booked.
          </p>
        )}
        {g.pricePerPlayer > 0 && (
          <div className="field">
            <span className="field__label">Pay your share with</span>
            <PaymentMethodSelect value={method} onChange={setMethod} />
            <p className="field__hint">Leave more than 24 hours before and your share is refunded.</p>
          </div>
        )}
        <p className="fine">
          <ShieldCheck size={13} /> Meet at the venue and never pay anyone outside BALLS. You can report or block players at any time.
        </p>
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button
          block
          size="lg"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const res = await joinGame(g.id, method);
            setBusy(false);
            if (!res.ok) {
              setErr(res.error ?? 'Couldn’t join.');
              return;
            }
            close();
            ui.toast(`You’re in! ${f.name}, ${fmtWhen(g.start)}.`, { tone: 'success', action: { label: 'Chat', run: () => nav.push('chat', { id: g.id }) } });
          }}
        >
          {g.pricePerPlayer ? `Pay ${moneyExact(g.pricePerPlayer)} & join` : 'Join game'}
        </Button>
      </SheetFooter>
    </>
  );
}

function PlayerList({ g, organiser }: { g: Game; organiser: boolean }) {
  const s = useApp();
  const rows = playersOf(s, g.id).filter((r) => r.status !== 'left');
  const joined = rows.filter((r) => r.status === 'joined').sort((a, b) => (a.role === 'organiser' ? -1 : b.role === 'organiser' ? 1 : a.at.localeCompare(b.at)));
  const invited = rows.filter((r) => r.status === 'invited');
  const open = Math.max(0, g.maxPlayers - joined.length);
  return (
    <div className="plist">
      {joined.map((r) => {
        const u = userById(s, r.userId);
        if (!u) return null;
        const blocked = s.blocked.includes(u.id);
        return (
          <PlayerCard
            key={r.userId}
            user={blocked ? { ...u, name: 'Blocked player' } : u}
            onClick={r.userId !== 'me' && !blocked ? () => nav.push('player', { id: r.userId }) : undefined}
            sub={
              <>
                {r.role === 'organiser' ? (
                  <span className="tag">
                    <Crown size={12} /> Organiser
                  </span>
                ) : (
                  levelLabel(u.sports.find((x) => x.sport === g.sport)?.level ?? 'casual')
                )}
                <span className="dot-sep" aria-hidden="true" />
                <ReliabilityBadge user={u} compact />
              </>
            }
            trailing={
              organiser && g.pricePerPlayer > 0 && r.role !== 'organiser' ? (
                r.payment === 'paid' ? (
                  <Pill tone="success" icon={<Check size={11} strokeWidth={3} />}>
                    Paid
                  </Pill>
                ) : (
                  <Pill tone="warning">Pending</Pill>
                )
              ) : r.userId === 'me' ? (
                <Pill tone="brand">You</Pill>
              ) : undefined
            }
          />
        );
      })}
      {invited.map((r) => {
        const u = userById(s, r.userId);
        if (!u) return null;
        return <PlayerCard key={r.userId} user={u} sub="Invited · waiting for reply" trailing={<Pill>Invited</Pill>} />;
      })}
      {Array.from({ length: Math.min(open, 4) }, (_, i) => (
        <div key={i} className="pcard pcard--open">
          <span className="pcard__openicon" aria-hidden="true">
            <UserPlus size={18} />
          </span>
          <span className="pcard__body">
            <span className="pcard__name">Open spot</span>
          </span>
        </div>
      ))}
      {open > 4 && <p className="fine">+{open - 4} more open spots</p>}
    </div>
  );
}

export function GameScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const g = gameById(s, params.id!);
  const [celebrate, setCelebrate] = useState(false);
  const row = g ? myRow(s, g.id) : undefined;
  const inGame = row?.status === 'joined';
  const prevIn = useRef(inGame);
  useEffect(() => {
    if (g) analytics.track('game_viewed', { game: g.id, sport: g.sport });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.id]);
  useEffect(() => {
    if (inGame && !prevIn.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2200);
      prevIn.current = inGame;
      return () => clearTimeout(t);
    }
    prevIn.current = inGame;
  }, [inGame]);

  useEffect(() => {
    if (params.created && g) {
      const t = setTimeout(() => invite(), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!g) {
    return (
      <Screen title="Game">
        <EmptyState icon={<Users size={24} />} title="This game isn’t available" body="It may have been cancelled or made private." action={{ label: 'Find another game', onClick: () => nav.replace('games') }} />
      </Screen>
    );
  }
  const f = FACILITY_BY_ID[g.facilityId];
  const joined = joinedPlayers(s, g.id);
  const left = g.maxPlayers - joined.length;
  const organiser = g.creatorId === 'me';
  const creator = userById(s, g.creatorId);
  const title = `${g.format ?? ''} ${sportName(g.sport)}`.trim();
  const past = new Date(g.end).getTime() < Date.now();
  const clash = !inGame && clashes(s, g.start, g.end, g.id);
  const shareText = organiser ? `Join my ${sportName(g.sport).toLowerCase()} game on BALLS: ${fmtWhen(g.start)} at ${f.name}. ${left} ${left === 1 ? 'spot' : 'spots'} left.` : `${title} on BALLS: ${fmtWhen(g.start)} at ${f.name}.`;

  function invite() {
    openInvite({
      title: 'Invite friends',
      subtitle: `${title} · ${fmtWhen(g!.start)}`,
      sport: g!.sport,
      exclude: playersOf(s, g!.id).filter((r) => r.status !== 'left').map((r) => r.userId),
      onSend: (ids) => inviteToGame(g!.id, ids),
      share: { text: shareText, path: `g/${g!.id}` } });
  }

  const more = () =>
    ui.open('Game options', (close) => (
      <>
        <SheetHeader title={title} onClose={close} />
        <SheetBody>
          <div className="list-card">
            <Row icon={<Share2 size={18} />} title="Share game" onClick={() => { close(); openShare({ title: 'Share game', text: shareText, path: `g/${g.id}` }); }} />
            {organiser && g.status !== 'cancelled' && !past && (
              <Row
                icon={<X size={18} />}
                title="Cancel game"
                danger
                onClick={async () => {
                  close();
                  if (await confirmDialog({ title: 'Cancel this game?', body: `We’ll tell all ${joined.length - 1} players and refund anyone who paid.`, confirm: 'Cancel game', cancel: 'Keep game', danger: true })) cancelGame(g.id);
                }}
              />
            )}
            {!organiser && <Row icon={<Flag size={18} />} title="Report game" danger onClick={() => { close(); openReport('game', g.id, title); }} />}
          </div>
        </SheetBody>
      </>
    ));

  const leave = async () => {
    const late = new Date(g.start).getTime() - Date.now() < 24 * 3600_000;
    const ok = await confirmDialog({
      title: 'Leave this game?',
      body: late ? (
        <>
          It starts in less than 24 hours, so your share won’t be refunded and it counts as a late cancellation on your reliability.
        </>
      ) : g.pricePerPlayer ? (
        `Your ${moneyExact(g.pricePerPlayer)} share will be refunded.`
      ) : (
        'The organiser will be told a spot has opened up.'
      ),
      confirm: 'Leave game',
      cancel: 'Stay in',
      danger: true });
    if (ok) leaveGame(g.id);
  };

  let footer: React.ReactNode;
  if (g.status === 'cancelled') footer = <CtaBar label="This game was cancelled" sub="Anyone who paid has been refunded"><Button variant="secondary" onClick={() => nav.replace('games', { sport: g.sport })}>Find another</Button></CtaBar>;
  else if (past) footer = <CtaBar label="This game has finished" sub={fmtShortDate(g.start)}><Button variant="secondary" onClick={() => nav.replace('games', { sport: g.sport })}>Find another</Button></CtaBar>;
  else if (organiser)
    footer = (
      <CtaBar label={`${joined.length}/${g.maxPlayers} players`} sub={left > 0 ? `${plural(left, 'spot')} to fill` : 'Game is full'}>
        <Button icon={<UserPlus size={17} />} onClick={invite}>
          Invite players
        </Button>
      </CtaBar>
    );
  else if (inGame)
    footer = (
      <CtaBar label={<span className="inlabel"><Check size={16} strokeWidth={3} /> You’re in</span>} sub={row?.payment === 'paid' ? `Paid ${moneyExact(g.pricePerPlayer)}` : 'See you there'}>
        <Button variant="secondary" onClick={leave}>
          Leave
        </Button>
        <Button icon={<MessageCircle size={17} />} onClick={() => nav.push('chat', { id: g.id })}>
          Chat
        </Button>
      </CtaBar>
    );
  else if (g.status === 'full') footer = <CtaBar label="This game is full" sub="Find another nearby"><Button variant="secondary" onClick={() => nav.replace('games', { sport: g.sport })}>Find another</Button></CtaBar>;
  else
    footer = (
      <CtaBar label={<span className="cta-price">{g.pricePerPlayer ? money(g.pricePerPlayer) : 'Free'}<small>{g.pricePerPlayer ? ' per person' : ''}</small></span>} sub={left <= 2 ? `Only ${plural(left, 'spot')} left` : `${plural(left, 'spot')} left`}>
        <Button size="lg" onClick={() => ui.open('Join game', (close) => <JoinSheet g={g} close={close} />)}>
          Join game
        </Button>
      </CtaBar>
    );

  return (
    <Screen
      header="overlay"
      overlayThreshold={170}
      title={title}
      footer={footer}
      actions={
        <>
          <IconButton label="Share game" variant="glass" onClick={() => openShare({ title: 'Share game', text: shareText, path: `g/${g.id}` })}>
            <Share2 size={19} />
          </IconButton>
          <IconButton label="More options" variant="glass" onClick={more}>
            <MoreHorizontal size={20} />
          </IconButton>
        </>
      }
    >
      <div className="ghero">
        <Artwork art={{ ...sportArt(g.sport, Number(g.id.replace(/\D/g, '')) || 3, new Date(g.start).getHours() >= 18 ? 'night' : 'day') }} />
        {celebrate && (
          <div className="joined-burst" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ ['--a' as string]: `${i * 22.5}deg`, ['--d' as string]: `${(i % 4) * 40}ms` }} />
            ))}
            <span>You’re in!</span>
          </div>
        )}
      </div>
      <div className="gamehead">
        <div className="gamehead__sport">
          <SportBadge sport={g.sport} size={30} /> {sportName(g.sport)}
        </div>
        <h1 className="gamehead__title">{title.toUpperCase()}</h1>
        <div className="gamehead__when">
          {fmtDay(g.start)} · {fmtRange(g.start, g.end)}
        </div>
        <div className="chip-row">
          <Pill tone="brand">{levelLabel(g.level)}</Pill>
          <Pill>{g.visibility === 'public' ? 'Public' : 'Private'}</Pill>
          <Pill>{g.ageRule === 'adults' ? '18+' : g.ageRule === 'juniors' ? 'Under-18s' : 'All ages'}</Pill>
          {g.status === 'cancelled' && <Pill tone="danger">Cancelled</Pill>}
        </div>
      </div>

      <div className="pad stack-20">
        {clash && (
          <p className="notice notice--warn">
            <CalendarDays size={16} /> Clashes with {clash.kind === 'booking' ? 'your booking' : 'another game you joined'} at {fmtTime(clash.start)}.
          </p>
        )}
        <div className="gfacts">
          <button type="button" className="gfact" onClick={() => nav.push('facility', { id: f.id })}>
            <MapPin size={18} />
            <span>
              <b>{f.name}</b>
              <small>
                {g.spaceId ? `${SPACE_BY_ID[g.spaceId].name} · ` : ''}
                {miles(distanceTo(s, f))} away
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          <div className="gfact">
            <Users size={18} />
            <span className="gfact__grow">
              <b>
                {joined.length}/{g.maxPlayers} players
              </b>
              <SpotsBar taken={joined.length} max={g.maxPlayers} />
            </span>
          </div>
          <div className="gfact">
            <Info size={18} />
            <span>
              <b>{g.pricePerPlayer ? `${money(g.pricePerPlayer)} per person` : 'Free to play'}</b>
              <small>{g.pricePerPlayer ? 'Paid through BALLS when you join' : 'No payment needed'}</small>
            </span>
          </div>
        </div>

        {!organiser && inGame === false && g.status === 'open' && !past && (
          <div className="gactions">
            <Button variant="secondary" icon={<UserPlus size={17} />} onClick={invite}>
              Invite friends
            </Button>
            <Button variant="secondary" icon={<Lock size={16} />} onClick={() => ui.toast('Join the game to open the chat', { icon: 'lock' })}>
              Chat
            </Button>
          </div>
        )}
        {(organiser || inGame) && g.status !== 'cancelled' && (
          <div className="gactions">
            <Button variant="secondary" icon={<UserPlus size={17} />} onClick={invite}>
              Invite friends
            </Button>
            <Button variant="secondary" icon={<MessageCircle size={17} />} onClick={() => nav.push('chat', { id: g.id })}>
              Chat
            </Button>
          </div>
        )}

        <Section title="Players">
          <PlayerList g={g} organiser={organiser} />
          <p className="fine">
            Levels are chosen by each player, so treat them as a guide. Reliability is based on turning up to booked games.
          </p>
        </Section>

        {g.description && (
          <Section title="About this game">
            {creator && (
              <div className="organiser">
                <Avatar name={creator.name} color={creator.color} photo={creator.photo} size={32} />
                <span>
                  Organised by <b>{g.creatorId === 'me' ? 'you' : firstName(creator)}</b>
                </span>
              </div>
            )}
            <p className="prose">{g.description}</p>
          </Section>
        )}

        {WHAT_TO_BRING[g.sport] && (
          <Section title="What to bring">
            <p className="prose">{WHAT_TO_BRING[g.sport]}</p>
          </Section>
        )}

        <Section title="Getting there">
          <div className="address">
            <div>
              <b>{f.name}</b>
              <span>
                {f.address}, {f.postcode}
              </span>
            </div>
            <DirectionsButton f={f} variant="secondary" size="sm" />
          </div>
        </Section>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- create a game

function VenuePicker({ sport, value, onPick, close }: { sport: SportId; value?: string; onPick: (v: { facilityId: string; bookingId?: string }) => void; close: () => void }) {
  const s = useApp();
  const bookings = s.bookings.filter((b) => b.status === 'confirmed' && b.sport === sport && !b.gameId && new Date(b.start).getTime() > Date.now());
  const venues = FACILITIES.filter((f) => spacesFor(f.id).some((x) => x.sport === sport))
    .map((f) => ({ f, d: distanceTo(s, f) }))
    .sort((a, b) => a.d - b.d);
  return (
    <>
      <SheetHeader title="Where?" subtitle={`Venues with ${sportName(sport).toLowerCase()}`} onClose={close} />
      <SheetBody>
        {bookings.length > 0 && (
          <>
            <div className="field__label">Your bookings</div>
            <div className="list-card">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="row row--btn"
                  onClick={() => {
                    onPick({ facilityId: b.facilityId, bookingId: b.id });
                    close();
                  }}
                >
                  <span className="row__icon">
                    <Check size={18} />
                  </span>
                  <span className="row__body">
                    <span className="row__title">
                      {SPACE_BY_ID[b.spaceId].name} · {FACILITY_BY_ID[b.facilityId].name}
                    </span>
                    <span className="row__sub">
                      Booked · {fmtDay(b.start)} {fmtRange(b.start, b.end)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="field__label">Nearby venues</div>
        <div className="list-card">
          {venues.map(({ f, d }) => (
            <button
              key={f.id}
              type="button"
              className={cx('row row--btn', value === f.id && 'is-selected')}
              onClick={() => {
                onPick({ facilityId: f.id });
                close();
              }}
            >
              <span className="row__icon">
                <MapPin size={18} />
              </span>
              <span className="row__body">
                <span className="row__title">{f.name}</span>
                <span className="row__sub">
                  {f.area} · {miles(d)}
                  {spacesFor(f.id).some((x) => x.sport === sport && x.walkUp) ? ' · free, walk-up' : ''}
                </span>
              </span>
              {value === f.id && <Check size={18} className="row__check" />}
            </button>
          ))}
        </div>
      </SheetBody>
    </>
  );
}

export function CreateGameScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const fromBooking = params.bookingId ? s.bookings.find((b) => b.id === params.bookingId) : undefined;
  const order = sportOrder(s).filter((x) => x !== 'gym' && x !== 'swimming');
  const [sport, setSport] = useState<SportId>(fromBooking?.sport ?? ((params.sport as SportId) || order[0] || 'football'));
  const def = SPORT_BY_ID[sport];
  const bookingSpace = fromBooking ? SPACE_BY_ID[fromBooking.spaceId] : undefined;
  const [format, setFormat] = useState<string | undefined>(bookingSpace?.attrs.format ?? def.formats[0]?.label);
  const [venue, setVenue] = useState<{ facilityId: string; bookingId?: string } | null>(fromBooking ? { facilityId: fromBooking.facilityId, bookingId: fromBooking.id } : null);
  const booking = venue?.bookingId ? s.bookings.find((b) => b.id === venue.bookingId) : undefined;
  const tomorrow = addDays(startOfDay(), 1);
  const [day, setDay] = useState<Date>(new Date().getHours() >= 20 ? tomorrow : startOfDay());
  const [hour, setHour] = useState<number>(new Date().getHours() >= 20 ? 19 : Math.max(new Date().getHours() + 2, 18));
  const [duration, setDuration] = useState(60);
  const [level, setLevel] = useState<SkillLevel>(levelFor(s, sport));
  const [players, setPlayers] = useState(fromBooking?.players ?? defaultPlayers(sport, def.formats[0]?.id));
  const [free, setFree] = useState(false);
  const [total, setTotal] = useState<string>(fromBooking ? (fromBooking.total / 100).toFixed(2) : '');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (fromBooking) return;
    const fm = def.formats.find((x) => x.label === format) ?? def.formats[0];
    setPlayers(fm?.players ?? 8);
    setLevel(levelFor(s, sport));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, format]);

  useEffect(() => {
    if (!fromBooking) setFormat(def.formats[0]?.label);
    if (venue && !venue.bookingId && !spacesFor(venue.facilityId).some((x) => x.sport === sport)) setVenue(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  const start = booking ? new Date(booking.start) : at(day, hour);
  const startIso = start.toISOString();
  const dur = booking ? (new Date(booking.end).getTime() - new Date(booking.start).getTime()) / 60_000 : duration;
  const totalPence = free ? 0 : Math.round(Number(total || '0') * 100);
  const perPlayer = players ? Math.ceil(totalPence / players) : 0;
  const f = venue ? FACILITY_BY_ID[venue.facilityId] : undefined;
  const walkUp = f ? spacesFor(f.id).some((x) => x.sport === sport && x.walkUp) : false;
  const ctx = availCtx(s);
  const candidates = f && !booking && !walkUp ? spacesFor(f.id).filter((sp) => sp.sport === sport && !sp.walkUp) : [];
  const matching = candidates.filter((sp) => !sp.attrs.format || sp.attrs.format === format);
  const freeSpace = (matching.length ? matching : candidates).find((sp) => !unavailableReason(sp, start, dur, ctx));

  const errors = {
    venue: !venue ? 'Choose where you’re playing.' : null,
    time: start.getTime() < Date.now() + 15 * 60_000 ? 'Pick a time at least 15 minutes from now.' : null,
    cost: !free && !booking && (!total || Number.isNaN(Number(total)) || Number(total) <= 0) ? 'Enter the total cost, or mark the game as free.' : null };
  const valid = !errors.venue && !errors.time && !errors.cost;

  const submit = () => {
    setTried(true);
    if (!valid) {
      setTimeout(() => document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30);
      return;
    }
    const g = createGame({
      sport,
      format,
      facilityId: venue!.facilityId,
      spaceId: booking?.spaceId ?? freeSpace?.id,
      bookingId: booking?.id,
      start: startIso,
      durationMins: dur,
      level,
      maxPlayers: players,
      pricePerPlayer: booking ? booking.split?.[0]?.amount ?? perPlayer : perPlayer,
      description: description || `${format ?? sportName(sport)} at ${FACILITY_BY_ID[venue!.facilityId].name}. ${levelLabel(level)} level, all welcome.`,
      visibility });
    ui.toast('Game created', { tone: 'success' });
    nav.replace('game', { id: g.id, created: '1' });
  };

  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i));
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <Screen
      title="Create a game"
      footer={
        <CtaBar label={f ? `${format ?? sportName(sport)} · ${fmtDay(start)} ${fmtTime(start)}` : 'Start your own game'} sub={free || walkUp ? 'Free to join' : totalPence || booking ? `${money(booking ? booking.split?.[0]?.amount ?? perPlayer : perPlayer)} per person` : 'Add the cost to split it'}>
          <Button size="lg" onClick={submit}>
            Create game
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-24 form">
        <div className="bstep">
          <h2 className="bstep__title">Sport</h2>
          <div className="hscroll hscroll--chips hscroll--flush">
            {order.map((sp) => (
              <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => !fromBooking && setSport(sp)} disabled={!!fromBooking && sp !== sport}>
                {sportName(sp)}
              </Chip>
            ))}
          </div>
          {def.formats.length > 1 && (
            <div className="chip-row">
              {def.formats.map((fm) => (
                <Chip key={fm.id} active={format === fm.label} onClick={() => setFormat(fm.label)}>
                  {fm.label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className={cx('bstep', tried && errors.venue && 'has-error')}>
          <h2 className="bstep__title">Where</h2>
          <button type="button" className="picker" onClick={() => !fromBooking && ui.open('Choose venue', (close) => <VenuePicker sport={sport} value={venue?.facilityId} onPick={setVenue} close={close} />)}>
            <MapPin size={18} />
            <span>
              <b>{f ? f.name : 'Choose a venue'}</b>
              <small>{booking ? `Your booking · ${SPACE_BY_ID[booking.spaceId].name}` : f ? `${f.area} · ${miles(distanceTo(s, f))}` : 'Or use one of your bookings'}</small>
            </span>
            {!fromBooking && <ChevronRight size={18} />}
          </button>
          {tried && errors.venue && <p className="field__error">{errors.venue}</p>}
        </div>

        <div className={cx('bstep', tried && errors.time && 'has-error')}>
          <h2 className="bstep__title">When</h2>
          {booking ? (
            <div className="locked">
              <Lock size={15} /> {fmtDay(booking.start)} · {fmtRange(booking.start, booking.end)} (from your booking)
            </div>
          ) : (
            <>
              <div className="daystrip" role="listbox" aria-label="Date">
                {days.map((d) => (
                  <button key={dateKey(d)} type="button" role="option" aria-selected={isSameDay(d, day)} className={cx('day', isSameDay(d, day) && 'is-on')} onClick={() => setDay(d)}>
                    <span className="day__wd">{isSameDay(d, startOfDay()) ? 'Today' : weekdayShort(d)}</span>
                    <span className="day__n">{d.getDate()}</span>
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <Field label="Start time" htmlFor="cg-hour">
                  <select id="cg-hour" className="input" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                    {hours.map((h) => (
                      <option key={h} value={h} disabled={isSameDay(day, startOfDay()) && h <= new Date().getHours()}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Length" htmlFor="cg-dur">
                  <select id="cg-dur" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </Field>
              </div>
              {tried && errors.time && <p className="field__error">{errors.time}</p>}
              {f && !walkUp && (
                <p className={cx('notice', freeSpace ? 'notice--ok' : 'notice--warn')}>
                  {freeSpace ? (
                    <>
                      <Check size={15} /> {freeSpace.name} is free then. Book it once players are in, or <button type="button" className="link link--inline" onClick={() => nav.push('book', { facilityId: f.id, spaceId: freeSpace.id, start: startIso, duration: String(duration) })}>book it now</button>.
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={15} /> Nothing free at {f.name} then. Pick another time, or play somewhere else.
                    </>
                  )}
                </p>
              )}
              {walkUp && (
                <p className="notice notice--ok">
                  <Check size={15} /> Walk-up venue, so there’s nothing to book.
                </p>
              )}
            </>
          )}
        </div>

        <div className="bstep">
          <h2 className="bstep__title">Level</h2>
          <div className="chip-row">
            {SKILL_LEVELS.map((l) => (
              <Chip key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>
                {l.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="bstep bstep--row">
          <div>
            <h2 className="bstep__title">Players</h2>
            <p className="fine">Including you</p>
          </div>
          <Stepper value={players} min={2} max={30} onChange={setPlayers} label="Players" />
        </div>

        <div className={cx('bstep', tried && errors.cost && 'has-error')}>
          <h2 className="bstep__title">Cost</h2>
          {booking ? (
            <div className="locked">
              <Lock size={15} /> {moneyExact(booking.total)} total · {moneyExact(booking.split?.[0]?.amount ?? perPlayer)} each (from your booking)
            </div>
          ) : (
            <>
              <Segmented
                label="Cost"
                value={free || walkUp ? 'free' : 'split'}
                onChange={(v) => setFree(v === 'free')}
                options={[
                  { value: 'split', label: 'Split a cost' },
                  { value: 'free', label: 'Free' },
                ]}
              />
              {!(free || walkUp) && (
                <div className="costrow">
                  <Field label="Total cost" htmlFor="cg-total" hint="e.g. the pitch hire">
                    <div className="input-wrap input-wrap--prefix">
                      <span className="input-wrap__prefix">£</span>
                      <input id="cg-total" className="input" inputMode="decimal" placeholder="40.00" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))} />
                    </div>
                  </Field>
                  <div className="costrow__each" aria-live="polite">
                    <span>Each pays</span>
                    <b>{totalPence ? moneyExact(perPlayer) : '—'}</b>
                    <small>{totalPence ? `${moneyExact(totalPence)} ÷ ${players}` : `÷ ${players} players`}</small>
                  </div>
                </div>
              )}
              {tried && errors.cost && <p className="field__error">{errors.cost}</p>}
            </>
          )}
        </div>

        <Field label="Description" htmlFor="cg-desc" optional hint="Pace, rules, what to bring. Keep contact details out: players can chat in the app.">
          <textarea id="cg-desc" className="input textarea" rows={3} maxLength={400} placeholder="Friendly game, bibs provided. Arrive 10 minutes early." value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="bstep">
          <h2 className="bstep__title">Who can join?</h2>
          <div className="vis">
            <button type="button" className={cx('vis__opt', visibility === 'public' && 'is-on')} onClick={() => setVisibility('public')} aria-pressed={visibility === 'public'}>
              <Users size={18} />
              <b>Public</b>
              <small>Anyone nearby can find and join</small>
            </button>
            <button type="button" className={cx('vis__opt', visibility === 'private' && 'is-on')} onClick={() => setVisibility('private')} aria-pressed={visibility === 'private'}>
              <Lock size={18} />
              <b>Private</b>
              <small>Only people you invite</small>
            </button>
          </div>
          {isMinor(s) && (
            <p className="notice notice--safe">
              <ShieldCheck size={15} /> Games you create are for under-18s only.
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- chat

export function ChatScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const g = gameById(s, params.id!);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const messages = g ? messagesOf(s, g.id) : [];
  const member = g ? myRow(s, g.id)?.status === 'joined' : false;
  const muted = g ? s.mutedChats.includes(g.id) : false;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  if (!g) return <Screen title="Chat">{null}</Screen>;
  const f = FACILITY_BY_ID[g.facilityId];
  const count = joinedPlayers(s, g.id).length;

  const send = () => {
    const res = sendMessage(g.id, text);
    if (!res.ok) {
      setErr(res.error ?? null);
      return;
    }
    setErr(null);
    setText('');
  };

  const onMessage = (userId: string, id: string) => {
    if (userId === 'me') return;
    const u = userById(s, userId);
    if (!u) return;
    ui.open('Message options', (close) => (
      <>
        <SheetHeader title={u.name} onClose={close} />
        <SheetBody>
          <div className="list-card">
            <Row icon={<Users size={18} />} title="View profile" onClick={() => { close(); nav.push('player', { id: userId }); }} />
            <Row icon={<Flag size={18} />} title="Report message" onClick={() => { close(); openReport('message', `${userId}:${id}`, u.name); }} danger />
            <Row
              icon={<Ban size={18} />}
              title={`Block ${firstName(u)}`}
              danger
              onClick={async () => {
                close();
                if (await confirmDialog({ title: `Block ${firstName(u)}?`, body: 'You won’t see their messages or games, and they can’t invite you. They won’t be told.', confirm: 'Block', danger: true })) {
                  const { block } = await import('../state/actions');
                  block(userId);
                }
              }}
            />
          </div>
        </SheetBody>
      </>
    ));
  };

  let lastDay = '';
  let lastUser: string | null | undefined;

  return (
    <Screen
      title={`${g.format ?? sportName(g.sport)}`}
      subtitle={`${count} players · ${fmtWhen(g.start)}`}
      className="chat"
      actions={
        <IconButton
          label="Chat options"
          onClick={() =>
            ui.open('Chat options', (close) => (
              <>
                <SheetHeader title="Chat" onClose={close} />
                <SheetBody>
                  <div className="list-card">
                    <Row icon={<Users size={18} />} title="View game" onClick={() => { close(); nav.pop(); nav.push('game', { id: g.id }); }} />
                    <Row icon={<VolumeX size={18} />} title={muted ? 'Unmute chat' : 'Mute chat'} onClick={() => { toggleMute(g.id); close(); }} />
                    <Row icon={<Flag size={18} />} title="Report game" danger onClick={() => { close(); openReport('game', g.id, `${g.format ?? sportName(g.sport)} at ${f.name}`); }} />
                  </div>
                </SheetBody>
              </>
            ))
          }
        >
          <MoreHorizontal size={20} />
        </IconButton>
      }
      footer={
        member ? (
          <div className="composer">
            {err && (
              <p className="composer__err" role="alert">
                {err}
              </p>
            )}
            <div className="composer__row">
              <label htmlFor="chat-input" className="sr-only">
                Message
              </label>
              <textarea
                id="chat-input"
                rows={1}
                placeholder="Message the group"
                value={text}
                maxLength={500}
                onChange={(e) => {
                  setText(e.target.value);
                  if (err) setErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="composer__send" onClick={send} disabled={!text.trim()} aria-label="Send">
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <CtaBar label="Join the game to chat" sub="Only players can read and send messages">
            <Button onClick={() => nav.replace('game', { id: g.id })}>View game</Button>
          </CtaBar>
        )
      }
    >
      <div className="msgs" ref={list}>
        <p className="msgs__safety">
          <ShieldCheck size={14} /> Chats are for players in this game. Keep contact details private and report anything that feels off.
        </p>
        {member ? (
          messages.map((m) => {
            const day = fmtDay(m.at, { tonight: false });
            const showDay = day !== lastDay;
            lastDay = day;
            if (m.userId === null) {
              lastUser = undefined;
              return (
                <div key={m.id}>
                  {showDay && <div className="msgs__day">{day}</div>}
                  <div className="msg-sys">{m.text}</div>
                </div>
              );
            }
            const u = userById(s, m.userId);
            const mine = m.userId === 'me';
            const blocked = s.blocked.includes(m.userId);
            const first = lastUser !== m.userId || showDay;
            lastUser = m.userId;
            return (
              <div key={m.id}>
                {showDay && <div className="msgs__day">{day}</div>}
                <div className={cx('msg', mine && 'msg--mine', first && 'msg--first')}>
                  {!mine && <span className="msg__av">{first && u && <Avatar name={u.name} color={u.color} size={28} />}</span>}
                  <button type="button" className="msg__bubble" onClick={() => onMessage(m.userId!, m.id)} disabled={mine}>
                    {!mine && first && <span className="msg__name">{blocked ? 'Blocked player' : u?.name}</span>}
                    <span className="msg__text">{blocked ? 'Message hidden' : m.text}</span>
                    <span className="msg__time">{fmtTime(m.at)}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState icon={<Lock size={24} />} title="Chat is for players" body="Join this game to see the conversation." />
        )}
      </div>
    </Screen>
  );
}

