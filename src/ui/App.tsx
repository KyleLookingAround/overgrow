// The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a
// living map"). The UI shows what the clock loop's view shows, and changes the game only by sending commands. Over the
// map sit the badges, the notices, the goal bar and one card at a time (win W5's queue): the first plan's card first,
// while nothing else is shown over it, then the Explain card (opened by a tap on any effect, badge or number). What the
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
import {EffectsLog} from './effects-log';
import {Explain, type Explaining} from './Explain';
import {FirstPlan} from './FirstPlan';
import {GoalBar} from './GoalBar';
import type {MapRenderer} from './map/renderer';
import {MapView} from './MapView';
import {current, push, unfoldSign, type Notice} from './notices';
import {Notices} from './Notices';
import {Panel} from './Panel';
import {TopBar} from './TopBar';

let noticeId = 0;

/** The game hours after which the first minute is over and the "try faster" nudge may show (win W17). */
const FIRST_MINUTE = 60;

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
  const [open, setOpen] = useState(true);
  const [explain, setExplain] = useState<Explaining | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
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
  // one sign for each batch of instruments that unfold together (win W26); a new game or a load starts afresh
  const was = useRef<{seed: number; seen: readonly string[]} | null>(null);
  useEffect(() => sim.onSnapshot((s) => {
    const before = was.current;
    was.current = {seed: s.seed, seen: s.seen};
    if (!before || before.seed !== s.seed || s.seen.length < before.seen.length) return;
    const sign = unfoldSign(before.seen, s.seen, ++noticeId, Date.now());
    if (sign) setNotices((l) => push(l, sign));
  }), [sim]);
  const snap = shown?.snap, all = snap?.settings.details === true;
  const first = !!snap && firstPlanDue(snap);
  // the one "try faster" nudge: after the first harvest, at 1×, once a save, and never in the first minute
  const nudge = !!snap && !first && snap.kitchen?.firstHarvest != null && snap.hours > FIRST_MINUTE && shown!.speed === 1 && snap.seen.includes(CARDS.firstPlan) &&
    !snap.seen.includes(CARDS.tryFaster);
  const faster: Notice | null = nudge ? {
    id: -1, at: 0, choice: true, text: 'The first harvest is in. Try 2× to watch the season go by faster.',
    actions: [{label: 'Try 2×', run: () => send({type: 'card', id: 'try-faster', answer: 'yes'})}],
  } : null;
  const nodes = snap?.nodes ?? [];
  const badges = snap ? badgesOf(nodes, hourNow(snap, shown!.hour), snap.seen, all) : [];
  const shownNotices = first ? [] : faster ? [...notices, faster] : notices;
  return (
    <div class="page" data-sim={shown ? 'ready' : 'waiting'}>
      <h1 class="visually-hidden">Overgrow</h1>
      {shown ? <TopBar snap={shown.snap} hours={shown.hour} speed={shown.speed} onSpeed={speed} onExplain={explainAt} /> : <header class="topbar"><span class="soft">Starting…</span></header>}
      <main class="main">
        <MapView loop={loop} onSelect={(id) => { setSelected(id); setOpen(true); }} onReady={onRenderer} onExplain={explainAt} nodes={nodes} badges={badges}
          pulse={first ? null : explain?.at ?? null}>
          <Notices list={shownNotices} onDismiss={(id) => {
            if (id === -1) send({type: 'card', id: 'try-faster', answer: 'no'});
            else setNotices((l) => l.filter((n) => n.id !== id));
          }} />
          {first ? <FirstPlan onAnswer={(answer) => send({type: 'card', id: 'first-plan', answer})} />
            : explain ? <Explain what={explain} nodes={nodes} log={log} onClose={() => setExplain(null)} />
            : snap && !shownNotices.length && <GoalBar snap={snap} />}
        </MapView>
        <Panel nodes={nodes} seen={snap?.seen ?? []} all={all} onDetails={(v) => send({type: 'setting', key: 'details', value: v})} acts={shown?.snap.activities ?? []} hours={shown?.hour ?? 0} ledger={shown?.snap.kitchen ?? null} log={log}
          selected={selected} onSelect={setSelected} open={open} onToggle={() => setOpen(!open)} send={send} onExplain={explainAt} />
      </main>
    </div>
  );
}
