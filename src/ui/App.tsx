// The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a
// living map"). The UI shows what the clock loop's view shows, and changes the game only by sending commands. Over the
// map sit the badges, the Explain card (opened by a tap on any effect, badge or number) and the notices; the page keeps
// a week's log of effects for the places' panels (src/ui/effects-log.ts).
import {useEffect, useMemo, useState} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {SimClient} from '../app/sim-client';
import {START, type Speed} from '../data/ladder';
import type {Command} from '../sim/commands';
import type {NodeId} from '../sim/graph';
import {hourOf, type WeatherDay} from '../sim/models/weather';
import {calendar} from '../sim/clock';
import type {Snapshot} from '../sim/state';
import {badgesOf} from './badges';
import {EffectsLog} from './effects-log';
import {Explain, type Explaining} from './Explain';
import type {MapRenderer} from './map/renderer';
import {MapView} from './MapView';
import {current, push, type Notice} from './notices';
import {Notices} from './Notices';
import {Panel} from './Panel';
import {TopBar} from './TopBar';

let noticeId = 0;

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
  const nodes = shown?.snap.nodes ?? [];
  const badges = shown ? badgesOf(nodes, hourNow(shown.snap, shown.hour)) : [];
  return (
    <div class="page" data-sim={shown ? 'ready' : 'waiting'}>
      <h1 class="visually-hidden">Overgrow</h1>
      {shown ? <TopBar snap={shown.snap} hours={shown.hour} speed={shown.speed} onSpeed={speed} onExplain={explainAt} /> : <header class="topbar"><span class="soft">Starting…</span></header>}
      <main class="main">
        <MapView loop={loop} onSelect={(id) => { setSelected(id); setOpen(true); }} onReady={onRenderer} onExplain={explainAt} nodes={nodes} badges={badges}
          pulse={explain?.at ?? null}>
          <Notices list={notices} onDismiss={(id) => setNotices((l) => l.filter((n) => n.id !== id))} />
          {explain && <Explain what={explain} nodes={nodes} log={log} onClose={() => setExplain(null)} />}
        </MapView>
        <Panel nodes={nodes} acts={shown?.snap.activities ?? []} hours={shown?.hour ?? 0} ledger={shown?.snap.kitchen ?? null} log={log}
          selected={selected} onSelect={setSelected} open={open} onToggle={() => setOpen(!open)} send={send} onExplain={explainAt} />
      </main>
    </div>
  );
}
