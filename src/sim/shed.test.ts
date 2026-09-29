// The shed and digging: a buy pays its price and is refused when it can't be paid or is owned; each upgrade works
// through its mechanism and in the direction and rough size its sources say (the beer traps catch slugs with no
// gardener's time, nematodes kill slugs in warm, moist soil for six weeks, the bin makes compost faster and keeps more
// nitrogen, the cold frame keeps the rain and a few degrees of frost off, the second butt doubles the store, the hose
// waters with no trips); digging costs the edging and a small flush of the soil's carbon; a green manure goes into the
// soil, not to the heap.
import {describe, expect, it} from 'vitest';
import {BEER_TRAP, NEMATODES, SECOND_BUTT, UPGRADE_IDS} from '../data/shed';
import {DIG, digCost} from '../data/garden';
import {TOOLS} from '../data/jobs';
import {createSim} from './index';
import type {Flow} from './graph';
import {shelter} from './models/crops';

type Sim = ReturnType<typeof createSim>;
const ALL = ['card.first-plan', 'garden.water', 'garden.slugs', 'garden.shed', 'garden.money', 'garden.dig', 'garden.winter', ...UPGRADE_IDS.map((id) => `shed.${id}`)];

/** A game from seed 1 with the shed open, some money in the purse and anything else the save needs changing. */
function game(edit: (save: any) => void = () => {}, money = 200): Sim {
  const sim = createSim(1), save = JSON.parse(sim.save());
  save.seen = ALL;
  save.graph.nodes.kitchen.stocks.money.amount = money;
  edit(save);
  sim.apply({type: 'load', save: JSON.stringify(save)});
  return sim;
}
const node = (sim: Sim, id: string) => sim.snapshot().nodes.find((n) => n.id === id)!;
function run(sim: Sim, hours: number, step = 1) {
  const flows: Flow[] = [];
  for (let h = 0; h < hours; h += step) flows.push(...sim.apply({type: 'tick', hours: step}).flows);
  return flows;
}
const sum = (flows: Flow[], what: string, unit: string) => flows.filter((f) => f.what === what && f.unit === unit).reduce((a, f) => a + f.amount, 0);
const slugs = (sim: Sim) => ['bed-1', 'bed-2'].reduce((a, id) => a + (node(sim, id).stocks['pests.slugs']?.amount ?? 0), 0);

describe('the shed', () => {
  it('sells what has come up for its price, once, and not what the purse can’t pay for', () => {
    const sim = game(undefined, 30);
    expect(sim.apply({type: 'buy', id: 'beer-trap'}).rejected).toBeNull();
    expect(sim.snapshot().money).toBeCloseTo(26);
    expect(sim.apply({type: 'buy', id: 'beer-trap'}).rejected).toMatch(/already/);
    expect(sim.apply({type: 'buy', id: 'cold-frame'}).rejected).toMatch(/costs £40/);
    expect(sim.apply({type: 'buy', id: 'tractor'}).rejected).toMatch(/isn’t offering/);
    expect(JSON.parse(sim.save()).upgrades).toEqual(['beer-trap']);
    expect(sim.apply({type: 'plan', node: 'shed', lever: 'kit', value: null}).rejected).toMatch(/bought/);
  });

  it('beer traps catch slugs every night with none of the gardener’s time, and take their beer each week', () => {
    const leave = (s: any) => void (s.graph.nodes.gardener.levers.slugs = 'leave');
    const without = game(leave), withTrap = game(leave);
    withTrap.apply({type: 'buy', id: 'beer-trap'});
    const flows = run(withTrap, 24 * 21, 24);
    run(without, 24 * 21, 24);
    // a third of a night's slugs drown: over three weeks, a clear cut on the beds (RHS)
    expect(slugs(withTrap)).toBeLessThan(0.8 * slugs(without));
    expect(sum(flows, 'beer trap', 'pests')).toBeGreaterThan(0);
    expect(sum(flows, 'beer for the traps', 'GBP')).toBeCloseTo(3 * BEER_TRAP.beerPerWeek, 6);
    expect(withTrap.snapshot().activities.some((a) => a.doing === 'trap' || a.doing === 'torch')).toBe(false);
  });

  it('nematodes kill slugs in the spring’s moist soil and are spent after six weeks', () => {
    const without = game(), withPack = game();
    withPack.apply({type: 'buy', id: 'nematodes'});
    expect(withPack.apply({type: 'buy', id: 'nematodes'}).rejected).toMatch(/still at work/);
    const flows = run(withPack, 24 * 30, 24);
    run(without, 24 * 30, 24);
    expect(sum(flows, 'nematodes', 'pests')).toBeGreaterThan(0);
    expect(slugs(withPack)).toBeLessThan(0.8 * slugs(without));
    run(withPack, 24 * (NEMATODES.days - 29), 24);
    expect((node(withPack, 'shed').levers.kit as any).nematodes).toBe(0);
  });

  it('a compost bin makes compost faster and keeps more of its nitrogen, for a little more methane', () => {
    const heaped = (s: any) => {
      const h = s.graph.nodes.heap.stocks;
      h.waste = {unit: 'kgWaste', amount: 100, product: 'greens'};
      h['nitrogen.organic'] = {unit: 'kgN', amount: 0.3};
    };
    const open = game(heaped), bin = game(heaped);
    bin.apply({type: 'buy', id: 'compost-bin'});
    const a = run(open, 24 * 30, 24), b = run(bin, 24 * 30, 24);
    const made = (f: Flow[]) => f.filter((x) => x.what === 'composting' && x.unit === 'kgWaste' && x.product === 'compost').reduce((s, x) => s + x.amount, 0);
    expect(made(b)).toBeGreaterThan(1.2 * made(a));
    expect(sum(b, 'composting', 'kgN') / made(b)).toBeLessThan(0.8 * (sum(a, 'composting', 'kgN') / made(a)));
    expect(sum(b, 'methane and nitrous oxide', 'kgCO2e') / made(b)).toBeGreaterThan(sum(a, 'methane and nitrous oxide', 'kgCO2e') / made(a));
  });

  it('the cold frame goes over a bed, keeps its rain and 3 °C of frost off, and moves when the plan says', () => {
    const sim = game();
    sim.apply({type: 'buy', id: 'cold-frame'});
    const covered = sim.snapshot().nodes.filter((n) => n.kind === 'bed' && n.levers.cover);
    expect(covered).toHaveLength(1);
    expect(shelter(covered[0]!)).toBe(3);
    const flows = run(sim, 24 * 20, 24);
    expect(flows.some((f) => f.what === 'rain' && !('boundary' in f.to) && f.to.node === covered[0]!.id)).toBe(false);
    const other = covered[0]!.id === 'bed-1' ? 'bed-2' : 'bed-1';
    expect(sim.apply({type: 'plan', node: other, lever: 'cover', value: 'cold-frame'}).rejected).toBeNull();
    expect(sim.snapshot().nodes.filter((n) => n.levers.cover).map((n) => n.id)).toEqual([other]);
    expect(sim.apply({type: 'plan', node: 'bed-5', lever: 'cover', value: 'cold-frame'}).rejected).toMatch(/dug bed/);
  });

  it('a second butt doubles the store, and the hose waters with no trips to fill a can', () => {
    const sim = game();
    sim.apply({type: 'buy', id: 'water-butt'});
    expect(node(sim, 'butt').stocks.water!.cap).toBe(200 + SECOND_BUTT);
    const dry = (s: any) => {
      for (const b of ['bed-1', 'bed-2']) s.graph.nodes[b].stocks.water.amount *= 0.3;
    };
    const cans = game(dry), hose = game(dry);
    hose.apply({type: 'buy', id: 'hose'});
    const acts = (s: Sim) => {
      const seen = new Map<string, {doing: string; start: number; end: number}>();
      for (let h = 0; h < 30; h++) for (const a of s.apply({type: 'tick', hours: 1}).activities) seen.set(a.id, a);
      return [...seen.values()];
    };
    const byCan = acts(cans), byHose = acts(hose);
    const time = (l: {doing: string; start: number; end: number}[], jobs: string[]) => l.filter((a) => jobs.includes(a.doing)).reduce((s, a) => s + a.end - a.start, 0);
    expect(byHose.some((a) => a.doing === 'fill')).toBe(false);
    expect(byHose.some((a) => a.doing === 'unreel')).toBe(true);
    expect(time(byHose, ['unreel', 'hose', 'water', 'reel'])).toBeLessThan(time(byCan, ['fetch', 'fill', 'carry', 'water']));
  });
});

describe('digging', () => {
  it('costs most of a week’s hours, the edging and compost, and a small flush of the soil’s carbon, and moves the land to crops', () => {
    const sim = game();
    expect(sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true}).rejected).toBeNull();
    const days = run(sim, 24 * 3);
    // not done in three days: a bed is about 21 hours of spade work, most of a week's 32 spare hours
    expect(node(sim, 'bed-3').stocks['land.grass']!.amount).toBeGreaterThan(0.2);
    expect(3 * TOOLS.spade.jobs.dig!.per).toBeGreaterThan(18);
    const flows = [...days, ...run(sim, 24 * 11)];
    const bed = node(sim, 'bed-3');
    expect(bed.stocks['land.grass']!.amount).toBeCloseTo(0, 6);
    expect(bed.stocks['land.crops']!.amount).toBeCloseTo(3, 6);
    expect(sum(flows, 'edging', 'GBP')).toBeCloseTo(3 * DIG.edgingPerM2, 6);
    expect(sum(flows, 'bagged compost', 'GBP')).toBeCloseTo(3 * DIG.compostKgPerM2 * DIG.compostGbpPerKg, 6);
    // the compost's carbon goes into the soil, tens of pounds in all
    expect(sum(flows, 'bagged compost', 'kgCO2e')).toBeGreaterThan(3);
    expect(digCost(3)).toBeGreaterThan(20);
    expect(sum(flows, 'digging', 'kgCO2e')).toBeCloseTo(3 * DIG.flushPerM2, 6);
    expect(sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true}).rejected).toMatch(/dug already/);
  });

  it('digs a grown green manure into the soil when the summer plan’s crop is due, none of it to the heap', () => {
    const sim = game((s) => {
      const b = s.graph.nodes['bed-2'];
      b.levers.crop = {id: 'green-manure', sown: -24 * 150, dd: 1000, eta: 0, etc: 0, need: 1, got: 1, made: 0, ks: 1, hurt: 0, lost: 0};
      b.stocks['crop.nitrogen'] = {unit: 'kgN', amount: 0.02};
      b.levers.sow = 'radish';
    });
    const before = node(sim, 'bed-2').stocks['nitrogen.organic']!.amount;
    const flows = run(sim, 36);
    expect((node(sim, 'bed-2').levers.crop as any)?.id).toBe('radish');
    expect(sum(flows, 'digging in', 'kgN')).toBeGreaterThan(0.01);
    expect(sum(flows, 'digging in', 'kgCO2e')).toBeGreaterThan(0);
    expect(node(sim, 'bed-2').stocks['nitrogen.organic']!.amount).toBeGreaterThan(before);
    expect(flows.some((f) => f.what === 'to the heap' && 'node' in f.from && f.from.node === 'bed-2')).toBe(false);
  });
});
