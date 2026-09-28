// The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a
// living map"). The UI shows what the clock loop's view shows, and changes the game only by sending commands.
import {useEffect, useState} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {SimClient} from '../app/sim-client';
import type {Speed} from '../data/ladder';
import type {NodeId} from '../sim/graph';
import type {Snapshot} from '../sim/state';
import type {MapRenderer} from './map/renderer';
import {MapView} from './MapView';
import {Panel} from './Panel';
import {TopBar} from './TopBar';

export function App({sim, loop, onRenderer}: {sim: SimClient; loop: Loop; onRenderer: (r: MapRenderer) => void}) {
  const [shown, setShown] = useState<{snap: Snapshot; hour: number; speed: Speed} | null>(null);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [open, setOpen] = useState(true);
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
  const speed = (s: Speed) => void sim.send({type: 'speed', speed: s});
  return (
    <div class="page" data-sim={shown ? 'ready' : 'waiting'}>
      <h1 class="visually-hidden">Overgrow</h1>
      {shown ? <TopBar snap={shown.snap} hours={shown.hour} speed={shown.speed} onSpeed={speed} /> : <header class="topbar"><span class="soft">Starting…</span></header>}
      <main class="main">
        <MapView loop={loop} onSelect={(id) => { setSelected(id); setOpen(true); }} onReady={onRenderer} />
        <Panel nodes={shown?.snap.nodes ?? []} selected={selected} onSelect={setSelected} open={open} onToggle={() => setOpen(!open)} />
      </main>
    </div>
  );
}
