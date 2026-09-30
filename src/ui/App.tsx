// The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a
// living map"). The UI shows what the clock loop's view shows, and changes the game only by sending commands. Over the
// map sit the badges, the notices, the goal bar and one card at a time (win W5's queue): the first plan's card first,
// while nothing else is shown over it, then the Explain card (opened by a tap on any effect, badge or number); no notice
// shows while a card is up, and the goal bar gives way to a card but stays under a notice (the spec
// docs/specs/ui-overhaul.md). On a phone the folded speed button sits at the map's foot, in thumb reach. What the
// player sees unfolds from the snapshot's `seen` (src/data/unfold.ts), one sign a batch; the page keeps a week's log of
// effects for the places' panels (src/ui/effects-log.ts).
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {SimClient} from '../app/sim-client';
import {START, type Speed} from '../data/ladder';
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
import {statusOf} from './goal';
import {FirstYearCard, YearCard} from './YearCard';
import {YEAR_HOURS} from '../sim/commands';
import type {MapRenderer} from './map/renderer';
import {MapView} from './MapView';
import {current, push, today, unfoldSign, type Notice} from './notices';
import {markOf, momentsOf, type SeasonMark} from './moments';
import {Notices} from './Notices';
import {Panel, type Focus, type Sheet} from './Panel';
import {nextSpeed} from './TopBar';
import {TopBar} from './TopBar';

let noticeId = 0;

/** A speed's label on the map's folded button, as the top bar writes it. */
const speedLabel = (s: Speed) => (s === 0 ? 'paused' : `${s}×`);

/** The game hours after which the first minute is over and the "try faster" nudge may show (win W17). */
const FIRST_MINUTE = 60;
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
  const [shown, setShown] = useState<{snap: Snapshot; hour: number; speed: Speed} | null>(null);
  const [selected, setSelected] = useState<NodeId | null>(null);
  // the sheet's resting height on a phone (src/ui/Panel.tsx); a side panel ignores it
  const [sheet, setSheet] = useState<Sheet>('half');
  const [explain, setExplain] = useState<Explaining | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  // the goal bar's button opens a tab of the panel, the Shed at one offer (src/ui/goal.ts's Go)
  const [focus, setFocus] = useState<Focus | null>(null);
  const log = useMemo(() => new EffectsLog(), []);
  useEffect(() => sim.onSnapshot((s) => log.add(s)), [sim]);
  useEffect(() => {
    let snap: Snapshot | null = null, hour = -1, speed = -1;
    return loop.onFrame((v) => {
      if (loop.benching()) return;
      const h = Math.floor(v.hours + 1e-9), s = loop.latest()?.speed ?? v.cur.speed;
      if (v.cur !== snap || h !== hour || s !== speed) {
        snap = v.cur;
        hour = h;
        speed = s;
        setShown({snap, hour, speed: s});
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
  // the garden's year done: the level's end, once a save
  const year = !!snap && !first && !snap.seen.includes(CARDS.year) && statusOf(snap).ready;
  // the garden's first year, on its anniversary, when the offer isn't won yet: once a save
  const firstYear = !!snap && !first && !year && snap.hours >= YEAR_HOURS && !snap.seen.includes(CARDS.year) && !snap.seen.includes(CARDS.firstYear);
  // the one "try faster" nudge: once the first minute is over (the first cut is in by then), before the wait for the
  // spring sowings, at 1×, once a save
  const nudge = !!snap && !first && snap.hours > FIRST_MINUTE && shown!.speed === 1 && snap.seen.includes(CARDS.firstPlan) &&
    !snap.seen.includes(CARDS.tryFaster);
  const faster: Notice | null = nudge ? {
    id: -1, at: 0, choice: true, text: 'The spring sowings take weeks to grow. Try 2× to watch the season go by faster.',
    actions: [{label: 'Try 2×', run: () => send({type: 'card', id: 'try-faster', answer: 'yes'})}],
  } : null;
  // the bed card: an empty bed without the player's say asks what's next, in the queue like the rest
  const bed = snap && !first ? bedCardOf(snap) : null;
  const bedNotice: Notice | null = bed ? {
    id: -2, at: 0, choice: true, text: bed.text,
    actions: bed.actions.map((a) => ({label: a.label, run: () => a.cmds.forEach(send)})),
  } : null;
  // the week's decisions: the most pressing one due, in the queue like the rest
  const due = snap && !first ? decisionsOf(snap)[0] ?? null : null;
  const dueNotice: Notice | null = due ? {id: -3, at: 0, choice: true, text: due.text, actions: due.actions.map((a) => ({label: a.label, run: () => send(a.cmd)}))} : null;
  const nodes = snap?.nodes ?? [];
  const badges = snap ? badgesOf(nodes, hourNow(snap, shown!.hour), snap.seen, all) : [];
  // the nudge is a notice like the rest, waiting its turn in the queue; nothing shows while a card is up, and the
  // notices' clocks start again when it closes, so none expires unseen behind it
  const cardUp = first || year || !!explain || firstYear;
  useEffect(() => {
    if (!cardUp) setNotices((l) => l.map((n) => ({...n, at: Date.now()})));
  }, [cardUp]);
  const shownNotices = cardUp ? [] : [...notices, ...(faster ? [faster] : []), ...(dueNotice ? [dueNotice] : []), ...(bedNotice ? [bedNotice] : [])];
  // on a phone a card folds the sheet while it's up (page.css); the panel says so, and a tap on it closes an Explain card
  const sheetShown: Sheet = cardUp ? 'peek' : sheet;
  const onSheet = (s: Sheet) => {
    if (explain) setExplain(null);
    setSheet(s);
  };
  return (
    <div class="page" data-sim={shown ? 'ready' : 'waiting'}>
      <h1 class="visually-hidden">Overgrow</h1>
      {shown ? <TopBar snap={shown.snap} hours={shown.hour} speed={shown.speed} flash={flash} onSpeed={speed} onExplain={explainAt} /> : <header class="topbar"><span class="soft">Starting…</span></header>}
      <main class="main">
        <MapView loop={loop} onSelect={(id) => { setSelected(id); if (sheet === 'peek') setSheet('half'); }} onReady={onRenderer} onExplain={explainAt} nodes={nodes} badges={badges}
          pulse={explain && !first && !year ? explain.at : null} juice={first ? [] : juice}>
          <Notices list={shownNotices} onDismiss={(id) => {
            if (id === -1) send({type: 'card', id: 'try-faster', answer: 'no'});
            else if (id === -2) bed?.dismiss.forEach(send);
            else if (id === -3 && due) send(due.dismiss);
            else setNotices((l) => l.filter((n) => n.id !== id));
          }} />
          {first ? <FirstPlan onAnswer={(answer) => send({type: 'card', id: 'first-plan', answer})} />
            : year ? <YearCard snap={snap!} onDone={() => send({type: 'card', id: 'year', answer: 'ok'})} />
            : explain ? <Explain what={explain} nodes={nodes} log={log} onClose={() => setExplain(null)} />
            : firstYear ? <FirstYearCard snap={snap!} onDone={() => send({type: 'card', id: 'first-year', answer: 'ok'})} />
            : snap && <GoalBar snap={snap} onGo={(go) => {
              go.cmds.forEach(send);
              if (go.tab) {
                if (sheet === 'peek') onSheet('half');
                setFocus({tab: go.tab, shed: go.shed, at: Date.now()});
              }
            }} />}
          {shown && !first && (
            <button type="button" class="speed-pill" aria-label={`Speed: ${speedLabel(shown.speed)}. Next: ${nextSpeed(shown.speed) === 0 ? 'pause' : speedLabel(nextSpeed(shown.speed))}`}
              onClick={() => speed(nextSpeed(shown.speed))}>
              {shown.speed === 0 ? <span aria-hidden="true" class="pause">❚❚</span> : speedLabel(shown.speed)}
            </button>
          )}
        </MapView>
        <Panel nodes={nodes} seen={snap?.seen ?? []} all={all} onDetails={(v) => send({type: 'setting', key: 'details', value: v})} acts={shown?.snap.activities ?? []} hours={shown?.hour ?? 0} ledger={shown?.snap.kitchen ?? null} log={log}
          selected={selected} onSelect={setSelected} sheet={sheetShown} focus={focus} onSheet={onSheet} send={send} onExplain={explainAt} />
      </main>
    </div>
  );
}
