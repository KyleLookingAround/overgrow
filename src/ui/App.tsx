// The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a
// living map"). The UI shows what the clock loop's view shows, and changes the game only by sending commands. Over the
// map sit the badges, the notices, the goal bar and one card at a time (win W5's queue): the first plan's card first,
// while nothing else is shown over it, then the Explain card (opened by a tap on any effect, badge or number). What the
// player sees unfolds from the snapshot's `seen` (src/data/unfold.ts), one sign a batch; the page keeps a week's log of
// effects for the places' panels (src/ui/effects-log.ts). A quiet night, with no card or notice waiting, passes quickly
// (src/ui/quiet-night.ts), with the moon by the speeds and one short notice the first time on this device.
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {SimClient} from '../app/sim-client';
import {LEVELS, START, type Speed} from '../data/ladder';
import {CARDS} from '../data/unfold';
import type {Command} from '../sim/commands';
import type {NodeId} from '../sim/graph';
import {hourOf, type WeatherDay} from '../sim/models/weather';
import {calendar} from '../sim/clock';
import type {Snapshot} from '../sim/state';
import {badgesOf} from './badges';
import {bedCardOf} from './bed-card';
import {decisionsOf} from './decisions';
import {EffectsLog} from './effects-log';
import {Explain, type Explaining} from './Explain';
import {FirstPlan} from './FirstPlan';
import {GoalBar} from './GoalBar';
import {juiceOf, JUICE_MS, type Juice} from './juice';
import {FirstYearCard} from './YearCard';
import {latched, StayBar, StepUpCard} from './StepUpCard';
import {AllotmentPanel} from './AllotmentPanel';
import {YEAR_HOURS} from '../sim/commands';
import type {MapRenderer} from './map/renderer';
import {MapView} from './MapView';
import {current, push, today, unfoldSign, type Notice} from './notices';
import {markOf, momentsOf, type SeasonMark} from './moments';
import {Notices} from './Notices';
import {Panel, type Focus} from './Panel';
import {TopBar} from './TopBar';
import {quietUntil} from './quiet-night';

let noticeId = 0;

/** The game hours after which the first minute is over and the "try faster" nudge may show (win W17): a real minute at
 *  1× in the garden. */
const FIRST_MINUTE = (60 * 24) / LEVELS[0]!.secondsPerDay;
/** The device's note that the quiet night's notice has shown, once (a convenience of the page's, not the game's). */
const QUIET_SEEN = 'overgrow-quiet-night-seen';
let quietNoted = false;
const quietSeen = () => {
  try {
    return quietNoted || localStorage.getItem(QUIET_SEEN) === '1';
  } catch {
    return quietNoted;
  }
};
const QUIET_TEXT = 'Quiet nights pass quickly';
/** A jump in game hours between two snapshots past which the page starts its signs and moments afresh. */
const JUMP_HOURS = 24 * 7;

/** Whether the first plan's card is up: not yet answered, and the clock hasn't moved. */
export const firstPlanDue = (snap: Snapshot) => !snap.seen.includes(CARDS.firstPlan) && snap.hours === 0;

/** The weather at an hour the snapshot's air carries, or null. */
function hourNow(snap: Snapshot, hours: number) {
  const day = snap.nodes.find((n) => n.kind === 'atmosphere')?.levers.weather as unknown as WeatherDay | null | undefined;
  return day && day.day === calendar(hours).dayIndex ? hourOf(day, (hours + START.hour) % 24) : null;
}

export function App({sim, loop, onRenderer}: {sim: SimClient; loop: Loop; onRenderer: (r: MapRenderer) => void}) {
  const [shown, setShown] = useState<{snap: Snapshot; hour: number; speed: Speed; quiet: boolean} | null>(null);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [open, setOpen] = useState(true);
  const [explain, setExplain] = useState<Explaining | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  // the goal bar's button opens a tab of the panel, the Shed at one offer (src/ui/goal.ts's Go)
  const [focus, setFocus] = useState<Focus | null>(null);
  const log = useMemo(() => new EffectsLog(), []);
  useEffect(() => sim.onSnapshot((s) => log.add(s)), [sim]);
  useEffect(() => {
    let snap: Snapshot | null = null, hour = -1, speed = -1, quiet = false;
    return loop.onFrame((v) => {
      if (loop.benching()) return;
      const h = Math.floor(v.hours + 1e-9), s = loop.latest()?.speed ?? v.cur.speed;
      if (v.cur !== snap || h !== hour || s !== speed || v.quiet !== quiet) {
        snap = v.cur;
        hour = h;
        speed = s;
        quiet = v.quiet;
        setShown({snap, hour, speed: s, quiet});
      }
    });
  }, [loop]);
  // notices expire on their own
  useEffect(() => {
    if (!notices.length) return;
    const t = setTimeout(() => setNotices((l) => current(l, Date.now())), 1000);
    return () => clearTimeout(t);
  }, [notices]);
  const send = (cmd: Command) => void sim.send(cmd).then((s) => {
    if (s.rejected) setNotices((l) => push(l, {id: ++noticeId, text: `Not done: ${s.rejected}`, at: Date.now()}));
  });
  const speed = (s: Speed) => send({type: 'speed', speed: s});
  const explainAt = (cause: string, at: string | null) => setExplain({cause, at});
  // one sign for each batch of instruments that unfold together (win W26), and the moments (src/ui/moments.ts): the
  // first harvest, the first sale (the money flashes once) and each season's line; a new game or a load starts afresh
  const was = useRef<{seed: number; seen: readonly string[]; snap: Snapshot; mark: SeasonMark} | null>(null);
  const [flash, setFlash] = useState(false);
  // the map's small rewards (src/ui/juice.ts), each gone after its moment
  const [juice, setJuice] = useState<Juice[]>([]);
  useEffect(() => {
    if (!juice.length) return;
    const t = setTimeout(() => setJuice([]), JUICE_MS);
    return () => clearTimeout(t);
  }, [juice]);
  useEffect(() => sim.onSnapshot((s) => {
    // a load or a new game starts afresh: a load brings no effects with what it has seen, and a jump of more than a week
    // is a save carried on from elsewhere (the page never ticks that far at once); its sign would name everything that
    // unfolded since the first morning
    const before = was.current, fresh = !before || before.seed !== s.seed || s.seen.length < before.seen.length || s.hours < before.snap.hours ||
      s.hours - before.snap.hours > JUMP_HOURS || (!s.effects.length && s.seen.length > before.seen.length);
    const m = fresh ? {moments: [], mark: markOf(s)} : momentsOf(before!.snap, s, before!.mark);
    was.current = {seed: s.seed, seen: s.seen, snap: s, mark: m.mark};
    if (fresh) return;
    // the step up: the garden is a plot now, and the garden's moments and rewards stay behind with it
    if (before!.snap.level === 1 && s.level === 2) {
      setNotices((l) => push(l, {id: ++noticeId, text: 'This is your plot now: your garden’s year, as one tile among twelve.', moment: 'season', at: Date.now(), day: calendar(s.hours).dayIndex}));
      return;
    }
    if (s.level !== 1) return;
    const got = juiceOf(before!.snap, s, () => ++noticeId);
    if (got.length) setJuice((l) => [...l, ...got].slice(-8));
    // each notice is about its game day: one not shown by the day's end is dropped, never shown on a later day
    const day = calendar(s.hours).dayIndex, sign = unfoldSign(before!.seen, s.seen, ++noticeId, Date.now());
    if (sign) setNotices((l) => push(today(l, day), {...sign, day}));
    for (const x of m.moments) setNotices((l) => push(today(l, day), {id: ++noticeId, text: x.text, moment: x.kind, at: Date.now(), day}));
    setNotices((l) => (today(l, day).length === l.length ? l : today(l, day)));
    if (m.moments.some((x) => x.kind === 'sale')) setFlash(true);
  }), [sim]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [flash]);
  const snap = shown?.snap, all = snap?.settings.details === true;
  const first = !!snap && firstPlanDue(snap);
  // the allotment (level 2): its own panel, and none of the garden's cards
  const allot = !!snap && snap.level === 2;
  // the garden's year done: the level's end, once a save
  const year = !!snap && !first && !snap.seen.includes(CARDS.year) && latched(snap);
  // the offer kept after "Stay in the garden a while": the stay bar in the goal bar's place
  const stay = !!snap && !first && snap.seen.includes(CARDS.year) && latched(snap);
  // the garden's first year, on its anniversary, when the offer isn't won yet: once a save
  const firstYear = !!snap && !first && !year && !allot && snap.hours >= YEAR_HOURS && !snap.seen.includes(CARDS.year) && !snap.seen.includes(CARDS.firstYear);
  // the one "try faster" nudge: once the first minute is over (the first cut is in by then), before the wait for the
  // spring sowings, at 1×, once a save
  const nudge = !!snap && !first && !allot && snap.hours > FIRST_MINUTE && shown!.speed === 1 && snap.seen.includes(CARDS.firstPlan) &&
    !snap.seen.includes(CARDS.tryFaster);
  const faster: Notice | null = nudge ? {
    id: -1, at: 0, choice: true, text: 'The spring sowings take weeks to grow. Try 2× to watch the season go by faster.',
    actions: [{label: 'Try 2×', run: () => send({type: 'card', id: 'try-faster', answer: 'yes'})}],
  } : null;
  // the bed card: an empty bed without the player's say asks what's next, in the queue like the rest
  const bed = snap && !first && !allot ? bedCardOf(snap) : null;
  const bedNotice: Notice | null = bed ? {
    id: -2, at: 0, choice: true, text: bed.text,
    actions: bed.actions.map((a) => ({label: a.label, run: () => a.cmds.forEach(send)})),
  } : null;
  // the week's decisions: the most pressing one due, in the queue like the rest
  const due = snap && !first && !allot ? decisionsOf(snap)[0] ?? null : null;
  const dueNotice: Notice | null = due ? {id: -3, at: 0, choice: true, text: due.text, actions: due.actions.map((a) => ({label: a.label, run: () => send(a.cmd)}))} : null;
  const nodes = snap?.nodes ?? [];
  const badges = snap ? badgesOf(nodes, hourNow(snap, shown!.hour), snap.seen, all) : [];
  // the nudge is a notice like the rest, waiting its turn in the queue
  const shownNotices = first ? [] : [...notices, ...(faster ? [faster] : []), ...(dueNotice ? [dueNotice] : []), ...(bedNotice ? [bedNotice] : [])];
  // a quiet night: nothing live on the map, and no card or notice waiting but its own; the loop passes it quickly
  const cardUp = first || year || firstYear || !!explain;
  const until = snap && !cardUp && !shownNotices.some((n) => n.text !== QUIET_TEXT) ? quietUntil(snap, shown!.hour, hourNow(snap, shown!.hour)) : null;
  useEffect(() => loop.setQuiet(until), [loop, until]);
  // the first quiet night on this device says so, once
  useEffect(() => {
    if (until === null || quietSeen()) return;
    quietNoted = true;
    try {
      localStorage.setItem(QUIET_SEEN, '1');
    } catch {
      // storage blocked: it may say so again on another visit
    }
    setNotices((l) => push(l, {id: ++noticeId, text: QUIET_TEXT, at: Date.now()}));
  }, [until]);
  return (
    <div class="page" data-sim={shown ? 'ready' : 'waiting'}>
      <h1 class="visually-hidden">Overgrow</h1>
      {shown ? <TopBar snap={shown.snap} hours={shown.hour} speed={shown.speed} flash={flash} quiet={shown.quiet} onSpeed={speed} onExplain={explainAt} /> : <header class="topbar"><span class="soft">Starting…</span></header>}
      <main class="main">
        <MapView loop={loop} onSelect={(id) => { setSelected(id); setOpen(true); }} onReady={onRenderer} onExplain={explainAt} nodes={nodes} badges={badges}
          pulse={first ? null : explain?.at ?? null} juice={first ? [] : juice}>
          <Notices list={shownNotices} onDismiss={(id) => {
            if (id === -1) send({type: 'card', id: 'try-faster', answer: 'no'});
            else if (id === -2) bed?.dismiss.forEach(send);
            else if (id === -3 && due) send(due.dismiss);
            else setNotices((l) => l.filter((n) => n.id !== id));
          }} />
          {first ? <FirstPlan onAnswer={(answer) => send({type: 'card', id: 'first-plan', answer})} />
            : year ? <StepUpCard snap={snap!} onTake={() => send({type: 'step-up'})} onStay={() => send({type: 'card', id: 'year', answer: 'ok'})} />
            : explain ? <Explain what={explain} nodes={nodes} log={log} onClose={() => setExplain(null)} />
            : firstYear ? <FirstYearCard snap={snap!} onDone={() => send({type: 'card', id: 'first-year', answer: 'ok'})} />
            : allot ? null
            : stay ? !shownNotices.length && <StayBar onTake={() => send({type: 'step-up'})} />
            : snap && !shownNotices.length && <GoalBar snap={snap} onGo={(go) => {
              go.cmds.forEach(send);
              if (go.tab) {
                setOpen(true);
                setFocus({tab: go.tab, shed: go.shed, at: Date.now()});
              }
            }} />}
        </MapView>
        {allot ? <AllotmentPanel nodes={nodes} seen={snap?.seen ?? []} all={all} hours={shown?.hour ?? 0} open={open} onToggle={() => setOpen(!open)} send={send} onExplain={explainAt}
          onSelect={(id) => { setSelected(id); setOpen(true); }} />
        : <Panel nodes={nodes} seen={snap?.seen ?? []} all={all} onDetails={(v) => send({type: 'setting', key: 'details', value: v})} acts={shown?.snap.activities ?? []} hours={shown?.hour ?? 0} ledger={shown?.snap.kitchen ?? null} log={log}
          selected={selected} onSelect={setSelected} open={open} focus={focus} onToggle={() => setOpen(!open)} send={send} onExplain={explainAt} />}
      </main>
    </div>
  );
}
