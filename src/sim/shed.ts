// The shed: buying what the garden needs (src/data/shed.ts), and what each thing bought does day by day. A `buy` pays its
// price from the household's purse (the kitchen's `money`) to the `bought` boundary and adds it to the garden's kit (the
// shed node's `kit` lever, src/sim/kit.ts); the command refuses what hasn't unfolded (src/sim/commands.ts), what's owned
// already, and what the purse can't pay for. Each works through its mechanism: the beer traps drown a share of each
// night's slugs and take their beer each week; a pack of nematodes kills slugs in warm, moist soil for six weeks; the
// cold frame goes over a bed (its `cover`, which the plan can move) and the second butt adds its store to the first's.
// The hose (src/sim/gardener.ts), the compost bin (src/sim/models/carbon.ts), the frame's frost, rain and sowing
// windows (src/sim/models/crops.ts, src/sim/models/water.ts) are read where they act. docs/systems/shed.md says how.
import {BEER_TRAP, NEMATODES, SECOND_BUTT, UPGRADES, type UpgradeId} from '../data/shed';
import type {System, TickContext} from './clock';
import {note} from './effects';
import {applyFlow, qty, touch, type Flow, type Graph} from './graph';
import {kitOf, owns, setKit} from './kit';
import {KITCHEN} from './models/kitchen';
import {pestsOf, SLUG_KEY, slugsOn} from './models/pests';
import {moisture} from './models/soil';
import {weatherOf} from './models/weather';

const isUpgrade = (id: string): id is UpgradeId => id in UPGRADES;
const dugBeds = (g: Graph) => Object.values(g.nodes).filter((n) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0);
const purse = (g: Graph) => g.nodes[KITCHEN]?.stocks.money?.amount ?? 0;

/** Why a buy is refused, or null if it can go ahead. */
export function refuseBuy(g: Graph, id: string): string | null {
  if (!isUpgrade(id)) return `no upgrade ${id}`;
  const u = UPGRADES[id];
  if (u.kept && owns(g, id)) return `the garden has ${u.name.toLowerCase()} already`;
  if (id === 'nematodes' && kitOf(g).nematodes > 0) return 'the last pack is still at work';
  if (purse(g) < u.price) return `${u.name} costs £${u.price.toFixed(2)}`;
  return null;
}

/** A buy's payment: its price from the purse to the `bought` boundary (the command's flow, src/sim/commands.ts). */
export const buyFlow = (id: UpgradeId): Flow => ({what: 'buying', unit: 'GBP', amount: qty(UPGRADES[id].price, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});

/** Carries out a buy the command has allowed: the price out of the purse, and the thing into the kit. */
function buy(g: Graph, id: UpgradeId) {
  applyFlow(g, buyFlow(id));
  if (id === 'nematodes') return setKit(g, {nematodes: NEMATODES.days});
  setKit(g, {owned: [...kitOf(g).owned, id]});
  // the hose joins the gardener's tools: the fastest they have for a job is the one they use (src/data/jobs.ts)
  if (id === 'hose') {
    const me = g.nodes.gardener, tools = (me?.levers.tools as string[] | undefined) ?? [];
    if (me && !tools.includes('hose')) me.levers.tools = [...tools, 'hose'];
  }
  if (id === 'water-butt') {
    const butt = g.nodes.butt?.stocks.water;
    if (butt?.cap !== undefined) butt.cap = qty(butt.cap + SECOND_BUTT, 'L');
    touch(g, 'butt');
  }
  // the frame goes over the first dug bed with nothing in it, else the first dug bed; the plan can move it
  if (id === 'cold-frame') {
    const beds = dugBeds(g), bed = beds.find((b) => !b.levers.crop) ?? beds[0];
    if (bed) bed.levers.cover = 'cold-frame';
  }
}

/** Pays for the beer traps' week from the purse; they go dry for the week if it can't. */
function beerWeek(c: TickContext) {
  if (!owns(c.graph, 'beer-trap')) return;
  const ok = purse(c.graph) >= BEER_TRAP.beerPerWeek;
  if (ok) c.flow({what: 'beer for the traps', unit: 'GBP', amount: qty(BEER_TRAP.beerPerWeek, 'GBP'), from: {node: KITCHEN, stock: 'money'}, to: {boundary: 'bought'}});
  if (kitOf(c.graph).dry === ok) setKit(c.graph, {dry: !ok});
}

/** The day's work of what's in the beds: the traps' catch of last night's slugs, and the nematodes'. */
function day(c: TickContext) {
  const g = c.graph, kit = kitOf(g), trap = kit.owned.includes('beer-trap') && !kit.dry;
  if (!trap && kit.nematodes <= 0) return;
  const w = weatherOf(g), days = w ? (w.step ?? [w]) : [], mean = days.length ? days.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / days.length : 0;
  const n = Math.max(1, days.length);
  for (const b of dugBeds(g)) {
    const kill = (what: string, k: number) => {
      const x = Math.min(k, slugsOn(b));
      if (x > 1e-9) c.flow({what, unit: 'pests', product: 'slugs', amount: qty(x, 'pests'), from: {node: b.id, stock: SLUG_KEY}, to: {boundary: 'decay'}});
    };
    // the traps catch from last night's slugs out: only at the garden's hourly steps, where the nights are played
    if (trap && n === 1) kill('beer trap', BEER_TRAP.share * pestsOf(b).night);
    // nematodes work only in soil warm and moist enough for them to move and find the slugs
    if (kit.nematodes > 0 && mean >= NEMATODES.minTemp && moisture(b) >= NEMATODES.minMoisture) kill('nematodes', slugsOn(b) * (1 - Math.pow(1 - NEMATODES.kill, n)));
  }
  if (kit.nematodes > 0) {
    const left = Math.max(0, kit.nematodes - n);
    setKit(g, {nematodes: left});
    if (!left) note(c, 'nematodes spent', 'shed', 1, 'packs');
  }
}

export const shed: System = {
  name: 'shed',
  on: {day, week: beerWeek},
  command(cmd, g) {
    if (cmd.type === 'buy') {
      const r = refuseBuy(g, cmd.id);
      if (!r) buy(g, cmd.id as UpgradeId);
      return r;
    }
    // the cold frame's place: over a dug bed, moved from wherever it was
    if (cmd.type === 'plan' && cmd.lever === 'cover' && g.nodes[cmd.node]?.kind === 'bed') {
      if (cmd.value !== null && cmd.value !== 'cold-frame') return 'a cover is the cold frame, or none';
      if (cmd.value === 'cold-frame') {
        if (!owns(g, 'cold-frame')) return 'the garden has no cold frame yet';
        if ((g.nodes[cmd.node]!.stocks['land.crops']?.amount ?? 0) <= 0) return 'the cold frame goes on a dug bed';
        for (const b of Object.values(g.nodes)) if (b.kind === 'bed' && b.id !== cmd.node && b.levers.cover) b.levers.cover = null;
      }
      return null;
    }
    if (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') return undefined;
    if (cmd.node === 'shed' && cmd.lever === 'kit') return 'the kit is bought, not set';
    return undefined;
  },
};
