import { Ban, CalendarDays, Check, ChevronRight, Flag, Heart, Info, Lock, MapPin, MoreHorizontal, Pencil, Settings, Share2, Shapes, ShieldCheck, Star, Sunrise, TrendingUp, Trophy, UserPlus, Users } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { FacilityCard, PlayerCard, ReliabilityBadge, SportBadge, SportCard } from '../components/cards';
import { SportIcon } from '../components/icons';
import { confirmDialog, SheetBody, SheetHeader } from '../components/Sheet';
import { openLogResult, openReport, openShare } from '../components/sheets';
import { Avatar, Button, Chip, CtaBar, EmptyState, Field, IconButton, Pill, Row, Screen, Section } from '../components/ui';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements';
import { statsFor } from '../data/compete';
import { FACILITIES, FACILITY_BY_ID, spacesFor } from '../data/facilities';
import { DEMO_FRIENDS, PEOPLE, TAKEN_USERNAMES } from '../data/people';
import { levelLabel, SKILL_LEVELS, SPORT_BY_ID, sportName } from '../data/sports';
import type { SkillLevel, SportId, SportLevel } from '../data/types';
import { cx, plural } from '../lib/format';
import { fmtShortDate, monthShort } from '../lib/time';
import { reliability } from '../services/trust';
import { block, inviteToGame, progressFor, setSports, toggleFollow, updateAccount, updateProfile } from '../state/actions';
import { nav } from '../state/nav';
import { me, pastActivity, upcoming, userById } from '../state/selectors';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import { PhotoInput } from './Onboarding';
import type { ScreenComponentProps } from './routes';
import { ReviewItem } from './Facility';

// ---------------------------------------------------------------- achievements

const ACH_ICON: Record<string, ReactNode> = {
  flag: <Flag size={22} />,
  five: <b className="ach-num">5</b>,
  ten: <b className="ach-num">10</b>,
  fifty: <b className="ach-num">50</b>,
  trophy: <Trophy size={22} />,
  sunrise: <Sunrise size={22} />,
  pin: <MapPin size={22} />,
  shapes: <Shapes size={22} />,
  shield: <ShieldCheck size={22} /> };

export function AchievementBadge({ id, unlocked, size = 'md', progress }: { id: string; unlocked: boolean; size?: 'sm' | 'md'; progress?: number }) {
  const a = ACHIEVEMENT_BY_ID[id];
  return (
    <div className={cx('ach', `ach--${size}`, unlocked ? 'is-unlocked' : 'is-locked')} aria-label={`${a.name}${unlocked ? ', unlocked' : ', locked'}`}>
      <span className="ach__medal" style={progress != null && !unlocked ? { ['--p' as string]: `${Math.round(progress * 100)}%` } : undefined}>
        {ACH_ICON[a.icon]}
        {!unlocked && (
          <span className="ach__lock">
            <Lock size={10} />
          </span>
        )}
      </span>
      <span className="ach__name">{a.name}</span>
    </div>
  );
}

export function AchievementsScreen() {
  const s = useApp();
  const have = new Map(s.profile.achievements.map((a) => [a.id, a.at]));
  return (
    <Screen title="Achievements">
      <div className="pad stack-16">
        <p className="fine">
          {have.size} of {ACHIEVEMENTS.length} unlocked. Badges come from games you actually play.
        </p>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const p = progressFor(s, a.id);
            const on = have.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className="ach-card"
                onClick={() =>
                  ui.open(a.name, (close) => (
                    <>
                      <SheetHeader title={a.name} onClose={close} />
                      <SheetBody>
                        <div className="ach-detail">
                          <AchievementBadge id={a.id} unlocked={on} progress={p.value / p.target} />
                          <p>{a.description}</p>
                          {on ? (
                            <Pill tone="success" icon={<Check size={12} />}>
                              Unlocked {fmtShortDate(have.get(a.id)!)}
                            </Pill>
                          ) : (
                            <div className="ach-detail__progress">
                              <span className="ach-next__bar">
                                <i style={{ width: `${(p.value / p.target) * 100}%` }} />
                              </span>
                              <small>
                                {p.value} of {p.target}
                              </small>
                            </div>
                          )}
                        </div>
                      </SheetBody>
                    </>
                  ))
                }
              >
                <AchievementBadge id={a.id} unlocked={on} progress={p.value / p.target} />
                <small>{on ? fmtShortDate(have.get(a.id)!) : `${p.value}/${p.target}`}</small>
              </button>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- stats

export function StatsScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const lines = s.profile.stats;
  const [sport, setSport] = useState<SportId | null>((params.sport as SportId) ?? lines[0]?.sport ?? s.profile.sports[0]?.sport ?? null);
  const line = lines.find((x) => x.sport === sport);
  const def = sport ? SPORT_BY_ID[sport] : null;
  const lastVisit = pastActivity(s).find((a) => a.kind === 'booking' && a.booking.sport === sport);
  const logFor = () => {
    if (!sport) return;
    const f = lastVisit && lastVisit.kind === 'booking' ? lastVisit.booking.facilityId : FACILITIES.find((x) => spacesFor(x.id).some((y) => y.sport === sport))?.id ?? 'highgate-sc';
    openLogResult(sport, f, lastVisit?.start ?? new Date().toISOString());
  };
  const sports = [...new Set([...lines.map((x) => x.sport), ...s.profile.sports.map((x) => x.sport)])];
  const max = Math.max(1, ...(line?.weekly ?? [1]));
  return (
    <Screen
      title="My stats"
      footer={
        sport ? (
          <CtaBar label="Played recently?" sub="Add a result to keep your stats up to date">
            <Button icon={<TrendingUp size={17} />} onClick={logFor}>
              Add a result
            </Button>
          </CtaBar>
        ) : undefined
      }
    >
      <div className="pad stack-20">
        {sports.length ? (
          <div className="hscroll hscroll--chips hscroll--flush">
            {sports.map((sp) => (
              <Chip key={sp} active={sport === sp} icon={<SportIcon sport={sp} size={15} />} onClick={() => setSport(sp)}>
                {sportName(sp)}
              </Chip>
            ))}
          </div>
        ) : (
          <EmptyState icon={<TrendingUp size={24} />} title="No stats yet." body="Play a game, then add your result to start tracking." action={{ label: 'Find a game', onClick: () => nav.push('games') }} />
        )}
        {def && (
          <>
            <div className="stat-tiles">
              {def.stats.map((st) => (
                <div key={st.id} className="stat-tile">
                  <b>{line ? (st.kind === 'percent' ? `${line.values[st.id] ?? 0}%` : st.kind === 'rating' ? (line.values[st.id] ?? 0).toFixed(1) : line.values[st.id] ?? 0) : 0}</b>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
            {line && line.form.length > 0 && (
              <Section title="Recent form">
                <div className="formrow" aria-label={`Recent results: ${line.form.join(', ')}`}>
                  {line.form.slice(0, 10).map((r, i) => (
                    <i key={i} className={`formchip formchip--${r}`}>
                      {r}
                    </i>
                  ))}
                </div>
                <p className="fine">W = win, D = draw, L = loss. Newest first.</p>
              </Section>
            )}
            <Section title="Last 8 weeks">
              <div className="bars" role="img" aria-label={`Games per week: ${(line?.weekly ?? []).join(', ')}`}>
                {(line?.weekly ?? [0, 0, 0, 0, 0, 0, 0, 0]).map((v, i) => (
                  <div key={i} className="bars__col">
                    <span className="bars__val">{v || ''}</span>
                    <span className="bars__bar" style={{ height: `${(v / max) * 100}%` }} />
                    <span className="bars__label">{i === 7 ? 'Now' : `-${7 - i}w`}</span>
                  </div>
                ))}
              </div>
            </Section>
            <button type="button" className="card-row row row--btn" onClick={() => nav.push('leaderboard', { sport: sport! })}>
              <span className="row__icon">
                <Trophy size={18} />
              </span>
              <span className="row__body">
                <span className="row__title">See where you rank</span>
                <span className="row__sub">{sportName(sport!)} leaderboard near you</span>
              </span>
              <ChevronRight size={18} className="row__chev" />
            </button>
            <p className="fine">Stats are self-reported after each game and shown on leaderboards unless you turn that off in Privacy.</p>
          </>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- profile tab

export function ProfileScreen({ retap }: ScreenComponentProps) {
  const s = useApp();
  const u = me(s);
  const r = reliability(u.attendance);
  const unlocked = new Set(s.profile.achievements.map((a) => a.id));
  const top = s.profile.stats[0];
  const saved = s.saved.map((x) => FACILITY_BY_ID[x.facilityId]).filter(Boolean);
  const hours = Math.round(s.profile.gamesPlayed * 1.1);

  return (
    <Screen
      title="Profile"
      header="large"
      back={false}
      retap={retap}
      actions={
        <>
          <IconButton label="Share profile" onClick={() => openShare({ title: 'Share profile', text: `Play with me on BALLS: @${u.username}`, path: `u/${u.username}` })}>
            <Share2 size={20} />
          </IconButton>
          <IconButton label="Settings" onClick={() => nav.push('settings')}>
            <Settings size={21} />
          </IconButton>
        </>
      }
    >
      <div className="pad stack-24">
        <div className="phead">
          <Avatar name={s.account?.firstName ?? 'You'} color={u.color} photo={u.photo} size={76} />
          <div className="phead__body">
            <h2>
              {s.account?.firstName} {s.account?.lastName}
            </h2>
            <p>@{u.username}</p>
            <div className="phead__meta">
              <span>
                <MapPin size={13} /> {u.area}
              </span>
              <ReliabilityBadge user={u} />
            </div>
          </div>
        </div>
        <div className="pstats">
          <div>
            <b>{s.profile.gamesPlayed}</b>
            <span>Games</span>
          </div>
          <div>
            <b>{hours}</b>
            <span>Hours</span>
          </div>
          <button type="button" onClick={() => openReliability()}>
            <b>{r.score !== null ? `${r.score}%` : '—'}</b>
            <span>
              Reliability <Info size={11} />
            </span>
          </button>
          <button type="button" onClick={() => nav.push('friends')}>
            <b>{s.following.length}</b>
            <span>Friends</span>
          </button>
        </div>
        <Button variant="secondary" block icon={<Pencil size={16} />} onClick={() => nav.push('editProfile')}>
          Edit profile
        </Button>

        <Section title="My sports" action="Edit" onAction={() => nav.push('editSports')}>
          {s.profile.sports.length ? (
            <div className="mysports">
              {s.profile.sports.map((x) => (
                <button key={x.sport} type="button" className="mysport" onClick={() => nav.push('sport', { id: x.sport })}>
                  <SportBadge sport={x.sport} size={36} />
                  <span>
                    <b>{sportName(x.sport)}</b>
                    <small>{levelLabel(x.level)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<Shapes size={22} />} title="Add the sports you play" action={{ label: 'Add sports', onClick: () => nav.push('editSports') }} />
          )}
          <p className="fine">Levels are self-rated and help us match you with the right games.</p>
        </Section>

        <Section title="My stats" action="All stats" onAction={() => nav.push('stats')}>
          {top ? (
            <button type="button" className="statsum" onClick={() => nav.push('stats', { sport: top.sport })}>
              <span className="statsum__sport">
                <SportIcon sport={top.sport} size={16} /> {sportName(top.sport)}
              </span>
              <span className="statsum__vals">
                {SPORT_BY_ID[top.sport].stats.slice(0, 4).map((st) => (
                  <span key={st.id}>
                    <b>{st.kind === 'percent' ? `${top.values[st.id] ?? 0}%` : top.values[st.id] ?? 0}</b>
                    <small>{st.label}</small>
                  </span>
                ))}
              </span>
            </button>
          ) : (
            <EmptyState compact icon={<TrendingUp size={22} />} title="No stats yet." body="Play a game, then add your result." />
          )}
        </Section>

        <Section title="Achievements" action={`${unlocked.size}/${ACHIEVEMENTS.length}`} onAction={() => nav.push('achievements')}>
          <div className="hscroll hscroll--flush ach-row">
            {ACHIEVEMENTS.map((a) => (
              <button key={a.id} type="button" className="ach-btn" onClick={() => nav.push('achievements')}>
                <AchievementBadge id={a.id} unlocked={unlocked.has(a.id)} size="sm" progress={progressFor(s, a.id).value / progressFor(s, a.id).target} />
              </button>
            ))}
          </div>
        </Section>

        <Section title="Saved" action={saved.length ? 'See all' : undefined} onAction={() => nav.push('saved')}>
          {saved.length ? (
            <div className="hscroll hscroll--cards hscroll--flush">
              {saved.map((f) => (
                <FacilityCard key={f.id} facility={f} variant="wide" />
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<Heart size={22} />} title="Save venues you like and they’ll appear here." action={{ label: 'Explore venues', onClick: () => nav.go('explore') }} />
          )}
        </Section>

        <div className="list-card">
          <Row icon={<CalendarDays size={18} />} title="Bookings" subtitle={`${upcoming(s).length} upcoming`} onClick={() => nav.switchTab('bookings')} />
          <Row icon={<Star size={18} />} title="My reviews" subtitle={plural(s.reviews.length + (s.account?.demo ? 1 : 0), 'review')} onClick={() => nav.push('myReviews')} />
          <Row icon={<Users size={18} />} title="Friends" subtitle={`${s.following.length} following`} onClick={() => nav.push('friends')} />
          <Row icon={<Settings size={18} />} title="Settings" onClick={() => nav.push('settings')} />
        </div>
      </div>
    </Screen>
  );
}

export function openReliability() {
  ui.open('How reliability works', (close) => (
    <>
      <SheetHeader title="How reliability works" onClose={close} />
      <SheetBody>
        <div className="prose stack-12">
          <p>Reliability shows how often someone turns up to games they’ve joined. It helps organisers fill games with people who show up.</p>
          <ul className="rules">
            <li>
              <b>Counts up</b> when an organiser or venue confirms you played.
            </li>
            <li>
              <b>Counts down</b> for leaving less than 24 hours before, or not turning up (no-shows count double).
            </li>
            <li>It only appears after 5 games, so new players aren’t judged on one bad night.</li>
            <li>Nobody can edit their own score, and one-off reports don’t change it without a confirmed no-show.</li>
          </ul>
          <p className="fine">95% and above: Very reliable · 85% and above: Reliable</p>
        </div>
      </SheetBody>
    </>
  ));
}

// ---------------------------------------------------------------- other player's profile

export function PlayerScreen({ params }: ScreenComponentProps) {
  const s = useApp();
  const u = userById(s, params.id!);
  if (!u) return <Screen title="Player">{null}</Screen>;
  const following = s.following.includes(u.id);
  const blocked = s.blocked.includes(u.id);
  const played = DEMO_FRIENDS.includes(u.id) && s.account?.demo ? 2 + (Number(u.id.slice(1)) % 5) : 0;
  const main = u.sports[0];
  const line = main ? statsFor(u.id, main.sport) : null;
  const myGames = upcoming(s).filter((a) => a.kind === 'game' || (a.kind === 'booking' && a.booking.gameId));
  const hidden = u.visibility === 'private' || (u.visibility === 'players' && !played);

  const invite = () => {
    const games = myGames.map((a) => (a.kind === 'game' ? a.game : s.games.find((g) => g.id === (a.kind === 'booking' ? a.booking.gameId : '')))).filter(Boolean);
    ui.open('Invite to a game', (close) => (
      <>
        <SheetHeader title={`Invite ${u.name.split(' ')[0]}`} onClose={close} />
        <SheetBody>
          {games.length ? (
            <div className="list-card">
              {games.map((g) => (
                <button
                  key={g!.id}
                  type="button"
                  className="row row--btn"
                  onClick={() => {
                    inviteToGame(g!.id, [u.id]);
                    close();
                  }}
                >
                  <span className="row__icon">
                    <SportIcon sport={g!.sport} size={18} />
                  </span>
                  <span className="row__body">
                    <span className="row__title">
                      {g!.format ?? sportName(g!.sport)} · {FACILITY_BY_ID[g!.facilityId].name}
                    </span>
                    <span className="row__sub">{new Date(g!.start).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<UserPlus size={22} />} title="You’ve no games coming up." body="Create a game, then invite players." action={{ label: 'Create a game', onClick: () => { close(); nav.push('createGame'); } }} />
          )}
        </SheetBody>
      </>
    ));
  };

  const more = () =>
    ui.open('Player options', (close) => (
      <>
        <SheetHeader title={u.name} onClose={close} />
        <SheetBody>
          <div className="list-card">
            <Row icon={<Flag size={18} />} title="Report player" danger onClick={() => { close(); openReport('user', u.id, u.name); }} />
            <Row
              icon={<Ban size={18} />}
              title={blocked ? 'Blocked' : `Block ${u.name.split(' ')[0]}`}
              danger
              onClick={async () => {
                close();
                if (!blocked && (await confirmDialog({ title: `Block ${u.name.split(' ')[0]}?`, body: 'You won’t see each other’s games or messages, and they can’t invite you. They won’t be told.', confirm: 'Block', danger: true }))) {
                  block(u.id);
                  nav.pop();
                }
              }}
            />
          </div>
        </SheetBody>
      </>
    ));

  return (
    <Screen
      title={u.name}
      actions={
        <IconButton label="More options" onClick={more}>
          <MoreHorizontal size={20} />
        </IconButton>
      }
      footer={
        !blocked && !hidden ? (
          <CtaBar>
            <Button variant={following ? 'secondary' : 'secondary'} onClick={() => toggleFollow(u.id)} aria-pressed={following}>
              {following ? (
                <>
                  <Check size={16} /> Following
                </>
              ) : (
                'Follow'
              )}
            </Button>
            <Button icon={<UserPlus size={17} />} onClick={invite}>
              Invite to game
            </Button>
          </CtaBar>
        ) : undefined
      }
    >
      <div className="pad stack-20">
        <div className="phead phead--center">
          <Avatar name={u.name} color={u.color} size={84} />
          <div className="phead__body">
            <h2>{u.name}</h2>
            <p>@{u.username}</p>
            <div className="phead__meta">
              {!hidden && (
                <span>
                  <MapPin size={13} /> {u.area}
                </span>
              )}
              <span>Joined {monthShort(new Date(u.joined))} {new Date(u.joined).getFullYear()}</span>
            </div>
          </div>
        </div>
        {blocked ? (
          <EmptyState compact icon={<Ban size={22} />} title="You’ve blocked this player." body="Unblock them in Settings → Blocked users." />
        ) : hidden ? (
          <EmptyState compact icon={<Lock size={22} />} title="This profile is private." body="You can still play in the same games." />
        ) : (
          <>
            <div className="pstats">
              <div>
                <b>{u.gamesPlayed}</b>
                <span>Games</span>
              </div>
              <button type="button" onClick={openReliability}>
                <b>{reliability(u.attendance).score ?? '—'}{reliability(u.attendance).score !== null ? '%' : ''}</b>
                <span>
                  Reliability <Info size={11} />
                </span>
              </button>
              <div>
                <b>{u.achievements.length}</b>
                <span>Badges</span>
              </div>
              {played > 0 && (
                <div>
                  <b>{played}</b>
                  <span>With you</span>
                </div>
              )}
            </div>
            <div className="relcard">
              <ReliabilityBadge user={u} />
              <span>{reliability(u.attendance).tier === 'very' ? 'Almost always turns up.' : reliability(u.attendance).tier === 'reliable' ? 'Usually turns up.' : reliability(u.attendance).tier === 'new' ? 'Not enough games to rate yet.' : 'Has left a few games late recently.'}</span>
            </div>
            <Section title="Sports">
              <div className="mysports">
                {u.sports.map((x) => (
                  <div key={x.sport} className="mysport">
                    <SportBadge sport={x.sport} size={36} />
                    <span>
                      <b>{sportName(x.sport)}</b>
                      <small>{levelLabel(x.level)} · self-rated</small>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
            {main && line && (
              <Section title={`${sportName(main.sport)} stats`}>
                <div className="stat-tiles stat-tiles--sm">
                  {SPORT_BY_ID[main.sport].stats.slice(0, 4).map((st) => (
                    <div key={st.id} className="stat-tile">
                      <b>{st.kind === 'percent' ? `${line.values[st.id]}%` : st.kind === 'rating' ? line.values[st.id].toFixed(1) : line.values[st.id]}</b>
                      <span>{st.label}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Achievements">
              <div className="ach-row hscroll hscroll--flush">
                {u.achievements.length ? (
                  u.achievements.map((id) => <AchievementBadge key={id} id={id} unlocked size="sm" />)
                ) : (
                  <p className="fine">No badges yet.</p>
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- saved, reviews, friends

export function SavedScreen() {
  const s = useApp();
  const saved = s.saved.map((x) => FACILITY_BY_ID[x.facilityId]).filter(Boolean);
  return (
    <Screen title="Saved">
      <div className="pad">
        {saved.length ? (
          <div className="cards">
            {saved.map((f) => (
              <div key={f.id} className="savedwrap">
                <FacilityCard facility={f} />
                <div className="pastwrap__actions">
                  <button type="button" className="chip chip--sm" onClick={() => nav.push('book', { facilityId: f.id })}>
                    <CalendarDays size={14} /> Availability
                  </button>
                  <button type="button" className="chip chip--sm" onClick={() => nav.push('facility', { id: f.id })}>
                    Venue
                  </button>
                  <button type="button" className="chip chip--sm" onClick={() => nav.go('explore', undefined, { view: 'map', focus: f.id })}>
                    <MapPin size={14} /> On map
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Heart size={26} />} title="Save venues you like and they’ll appear here." body="Tap the heart on any venue." action={{ label: 'Explore venues', onClick: () => nav.go('explore', undefined, { view: 'list' }) }} />
        )}
      </div>
    </Screen>
  );
}

export function MyReviewsScreen() {
  const s = useApp();
  const demoReview = s.account?.demo
    ? [{ id: 'demo-r', facilityId: 'highgate-sc', userId: 'me', rating: { overall: 5, surface: 5, cleanliness: 4, facilities: 5, value: 4 }, text: 'Pitch 1 was in great shape and the floodlights are properly bright. Easy parking before 7.', sport: 'football' as SportId, at: new Date(Date.now() - 11 * 86_400_000).toISOString() }]
    : [];
  const all = [...s.reviews, ...demoReview];
  return (
    <Screen title="My reviews">
      <div className="pad">
        {all.length ? (
          <div className="reviews">
            {all.map((r) => (
              <div key={r.id} className="myreview">
                <button type="button" className="myreview__venue" onClick={() => nav.push('facility', { id: r.facilityId })}>
                  {FACILITY_BY_ID[r.facilityId].name} <ChevronRight size={14} />
                </button>
                <ReviewItem r={r} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Star size={26} />} title="No reviews yet." body="After you play somewhere, you can rate the surface, cleanliness, facilities and value." />
        )}
      </div>
    </Screen>
  );
}

export function FriendsScreen() {
  const s = useApp();
  const friends = s.following.map((id) => userById(s, id)).filter(Boolean);
  const suggested = PEOPLE.filter((p) => !s.following.includes(p.id) && !s.blocked.includes(p.id) && p.visibility === 'everyone' && p.sports.some((x) => s.profile.sports.some((y) => y.sport === x.sport))).slice(0, 5);
  return (
    <Screen title="Friends">
      <div className="pad stack-20">
        <button type="button" className="invite-link" onClick={() => openShare({ title: 'Invite friends to BALLS', text: `I’m on BALLS for finding games and booking pitches. Join me:`, path: `invite/${s.account?.username}` })}>
          <span className="invite-link__icon">
            <UserPlus size={18} />
          </span>
          <span>
            <b>Invite friends to BALLS</b>
            <small>Share a link in any app</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <Section title={`Following · ${friends.length}`}>
          {friends.length ? (
            <div className="plist">
              {friends.map((u) => (
                <PlayerCard key={u!.id} user={u!} onClick={() => nav.push('player', { id: u!.id })} />
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<Users size={22} />} title="Not following anyone yet." body="Follow players you enjoy playing with to invite them quickly." />
          )}
        </Section>
        {suggested.length > 0 && (
          <Section title="Plays your sports nearby">
            <div className="plist">
              {suggested.map((u) => (
                <PlayerCard
                  key={u.id}
                  user={u}
                  onClick={() => nav.push('player', { id: u.id })}
                  trailing={
                    <Button size="sm" variant="secondary" onClick={() => toggleFollow(u.id)}>
                      Follow
                    </Button>
                  }
                />
              ))}
            </div>
          </Section>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- edit profile & sports

export function EditProfileScreen() {
  const s = useApp();
  const a = s.account!;
  const [first, setFirst] = useState(a.firstName);
  const [last, setLast] = useState(a.lastName);
  const [username, setUsername] = useState(a.username);
  const [bio, setBio] = useState(s.profile.bio);
  const [photo, setPhoto] = useState(a.photo);
  const err = username !== a.username && (!/^[a-z0-9_]{3,20}$/.test(username) ? 'Use 3–20 lowercase letters, numbers or _' : TAKEN_USERNAMES.has(username) ? 'That username is taken' : null);
  return (
    <Screen
      title="Edit profile"
      footer={
        <CtaBar>
          <Button
            block
            size="lg"
            disabled={!!err || !first.trim()}
            onClick={() => {
              updateAccount({ firstName: first.trim(), lastName: last.trim(), username, photo });
              updateProfile({ bio: bio.trim() });
              ui.toast('Profile saved', { tone: 'success' });
              nav.pop();
            }}
          >
            Save
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-16 form">
        <PhotoInput photo={photo} color={a.color} name={first} onChange={setPhoto} />
        <div className="form-grid">
          <Field label="First name" htmlFor="ep-first">
            <input id="ep-first" className="input" value={first} onChange={(e) => setFirst(e.target.value)} />
          </Field>
          <Field label="Last name" htmlFor="ep-last" hint="Others see your initial only">
            <input id="ep-last" className="input" value={last} onChange={(e) => setLast(e.target.value)} />
          </Field>
        </div>
        <Field label="Username" htmlFor="ep-user" error={err || null}>
          <div className="input-wrap input-wrap--prefix">
            <span className="input-wrap__prefix">@</span>
            <input id="ep-user" className="input" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
          </div>
        </Field>
        <Field label="About you" htmlFor="ep-bio" optional hint={`${bio.length}/160 · no contact details, please`}>
          <textarea id="ep-bio" className="input textarea" rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
      </div>
    </Screen>
  );
}

export function EditSportsScreen() {
  const s = useApp();
  const [list, setList] = useState<SportLevel[]>(s.profile.sports);
  const all: SportId[] = ['football', 'basketball', 'tennis', 'padel', 'badminton', 'volleyball', 'cricket', 'rugby', 'running', 'gym', 'swimming', 'other'];
  const toggle = (sp: SportId) => setList((x) => (x.some((y) => y.sport === sp) ? x.filter((y) => y.sport !== sp) : [...x, { sport: sp, level: 'casual' }]));
  const setLevel = (sp: SportId, level: SkillLevel) => setList((x) => x.map((y) => (y.sport === sp ? { ...y, level } : y)));
  const selected = useMemo(() => new Set(list.map((x) => x.sport)), [list]);
  return (
    <Screen
      title="My sports"
      footer={
        <CtaBar>
          <Button
            block
            size="lg"
            disabled={!list.length}
            onClick={() => {
              setSports(list);
              ui.toast('Sports updated. Home now shows these first.', { tone: 'success' });
              nav.pop();
            }}
          >
            Save
          </Button>
        </CtaBar>
      }
    >
      <div className="pad stack-20">
        <p className="fine">Your favourites appear first across BALLS. Tap to add or remove.</p>
        <div className="sport-grid">
          {all.map((sp) => (
            <SportCard key={sp} sport={sp} active={selected.has(sp)} onClick={() => toggle(sp)} />
          ))}
        </div>
        {list.length > 0 && (
          <Section title="Your levels">
            <div className="level-list">
              {list.map((x) => (
                <div key={x.sport} className="level-row">
                  <div className="level-row__head">
                    <SportBadge sport={x.sport} size={30} />
                    <b>{sportName(x.sport)}</b>
                  </div>
                  <div className="level-pick" role="radiogroup" aria-label={`${sportName(x.sport)} level`}>
                    {SKILL_LEVELS.map((l) => (
                      <button key={l.id} type="button" role="radio" aria-checked={x.level === l.id} className={cx('level-pick__opt', x.level === l.id && 'is-on')} onClick={() => setLevel(x.sport, l.id)}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Screen>
  );
}

