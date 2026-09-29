// The rotation model's plausibility test, each trade-off shown both ways over the horizon where it turns: a legume break
// leaves about what RB209 credits; repeating a family builds its soil-borne disease and cuts yield in years two and
// three; a four-course rotation loses to the most valuable crop in year one and beats it over three years, and beats
// continuous wheat too; a cover crop costs the season and pays back in carbon and nitrogen; fallow rests the ground and
// earns nothing; a ley builds carbon and leaves nitrogen; wheels' compaction lowers yield and recovers slowly; a well-run
// rotation holds its yields over five years while mining phosphorus and potassium does not; nitrate leaches more from
// bare winter ground than from green; nitrous oxide is the IPCC's share; nitrogen is conserved; the graph flows match.
import {describe, expect, it} from 'vitest';
import {N2O} from '../../data/rotation';
import {startingSoil} from './soil';
import {applyFlow, imbalance, makeGraph, stockTotals, type Flow, type Graph} from '../graph';
import {rng} from '../random';
import {ATMOSPHERE} from '../state';
import {structure, organicMatter} from './soil';
import {
  awcOf, continuous, diseaseFactor, farmYear, fieldOf, followed, followRotation, growYear, healthOf, newField, nitrogenSupply, organicMatterOf, planOf,
  rotation, scorePlans, structureOf, summed, totalsOf, yearsOf, RESIDUE_N, type Act, type Field, type Plan,
} from './rotation';

const run = (f: Field, acts: (Act | Plan)[], weather?: Parameters<typeof farmYear>[2]) =>
  acts.reduce((r, a) => farmYear(r.field, typeof a === 'string' ? {act: a} : a, weather), {field: f} as ReturnType<typeof farmYear>);

describe('rotation: what came before', () => {
  it('a legume break leaves the next crop about what RB209 credits, and the advised fertiliser falls by as much', () => {
    const after = (first: Act) => run(newField(), [first]).field;
    const bean = after('beans'), wheat = after('wheat');
    const gain = nitrogenSupply(bean, 'wheat') - nitrogenSupply(wheat, 'wheat');
    expect(gain).toBeGreaterThan(15); // RB209: a bean crop leaves roughly 20–40 kg N/ha more than a cereal for the next crop
    expect(gain).toBeLessThan(60);
    const saved = farmYear(wheat, {act: 'wheat'}).n.fertiliser - farmYear(bean, {act: 'wheat'}).n.fertiliser;
    expect(saved).toBeGreaterThan(15);
    expect(saved).toBeLessThan(60);
    // and the beans themselves fix most of their own nitrogen, so they take almost none of the soil's
    const r = farmYear(newField(), {act: 'beans'});
    expect(r.n.fixed).toBeGreaterThan(100);
    expect(r.n.fertiliser).toBe(0);
  });

  it('repeating a family builds its soil-borne disease and cuts yield in years two and three; a break sets it back', () => {
    for (const act of ['wheat', 'potatoes', 'barley'] as const) {
      const s = scorePlans(newField(), continuous(act), 4);
      const rel = s.years.map((r) => r.relative);
      expect(rel[1]!).toBeLessThan(rel[0]!);
      expect(rel[2]!).toBeLessThan(rel[1]!);
      expect(s.years[2]!.factors.disease).toBeLessThan(s.years[0]!.factors.disease - 0.02);
    }
    // potato cyst nematode is the worst: a third potato crop in a row loses more to it than a third wheat
    const p = scorePlans(newField(), continuous('potatoes'), 3).years[2]!.factors.disease, w = scorePlans(newField(), continuous('wheat'), 3).years[2]!.factors.disease;
    expect(p).toBeLessThan(w);
    // a year of beans in between and it dies back
    const f = run(newField(), ['wheat', 'wheat', 'wheat']).field, back = run(f, ['beans', 'beans'], undefined).field;
    expect(f.inoculum.cereal).toBeGreaterThan(0.3);
    expect(back.inoculum.cereal).toBeLessThan(f.inoculum.cereal / 3);
    expect(diseaseFactor(back, 'cereal')).toBeGreaterThan(diseaseFactor(f, 'cereal'));
    // and the field remembers what it grew, most recent last
    expect(yearsOf(run(newField(), ['wheat', 'wheat']).field, 'cereal')).toBe(2);
    expect(yearsOf(run(newField(), ['wheat', 'beans']).field, 'cereal')).toBe(0);
    expect(run(newField(), ['wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat', 'wheat']).field.history).toHaveLength(5);
  });

  it('follows the rotation from wherever the field is', () => {
    expect(followRotation(newField()).act).toBe('beans');
    expect(followRotation(run(newField(), ['beans']).field).act).toBe('wheat');
    expect(followRotation(run(newField(), ['beans', 'wheat', 'potatoes', 'barley']).field).act).toBe('beans');
    // a year of fallow or cover in between doesn't lose its place
    expect(followRotation(run(newField(), ['beans', 'fallow']).field).act).toBe('wheat');
  });
});

describe('rotation: the trade-offs over years', () => {
  it('a four-course rotation loses to the most valuable crop in year one and beats it over three years, and beats continuous wheat', () => {
    const rot = scorePlans(newField(), followed, 3), wheat = scorePlans(newField(), continuous('wheat'), 3), spuds = scorePlans(newField(), continuous('potatoes'), 3);
    // year one: the legume's cash is the lowest, so both continuous crops win it
    expect(rot.margins[0]!).toBeLessThan(wheat.margins[0]!);
    expect(rot.margins[0]!).toBeLessThan(spuds.margins[0]!);
    // three years on: it has earned more than either, its soil-borne disease is a fraction and its wheels have done less harm
    expect(rot.total).toBeGreaterThan(wheat.total);
    expect(rot.total).toBeGreaterThan(spuds.total);
    expect(rot.disease).toBeLessThan(wheat.disease / 4);
    expect(rot.disease).toBeLessThan(spuds.disease / 4);
    expect(rot.compaction).toBeLessThan(spuds.compaction);
    expect(rot.organicMatter).toBeGreaterThan(spuds.organicMatter);
    expect(rot.health).toBeGreaterThan(spuds.health);
  });

  it('the same crop every year wins once and loses after: continuous potatoes are ahead in year one and behind for good by year five', () => {
    const rot = scorePlans(newField(), followed, 5), spuds = scorePlans(newField(), continuous('potatoes'), 5);
    expect(spuds.margins[0]!).toBeGreaterThan(rot.margins[0]!);
    expect(spuds.margins[3]!).toBeLessThan(0); // a quarter of the crop for the whole crop's costs
    expect(spuds.years[4]!.relative).toBeLessThan(0.4 * spuds.years[0]!.relative);
    expect(rot.total).toBeGreaterThan(spuds.total + 3000);
    const wheat = scorePlans(newField(), continuous('wheat'), 5);
    expect(rot.total).toBeGreaterThan(wheat.total); // and continuous wheat too, though later and by less
  });

  it('a cover crop costs a season\'s cash crop and pays back in carbon and nitrogen', () => {
    const cover = farmYear(newField(), {act: 'cover'}), beans = farmYear(newField(), {act: 'beans'});
    expect(cover.yieldT).toBe(0);
    expect(cover.margin).toBeLessThan(-50); // seed and a pass, earning nothing
    expect(cover.margin).toBeLessThan(beans.margin - 400);
    // its carbon: it puts several tonnes in where a cash crop leaves a little, so organic matter is up where the crop's is down
    expect(cover.c.change).toBeGreaterThan(500);
    expect(beans.c.change).toBeLessThan(0);
    // over years (a cover crop, then two wheats, against three wheats): organic matter higher, the next crop's fertiliser lower
    const withCover = run(newField(), ['cover', 'wheat', 'wheat']), without = run(newField(), ['fallow', 'wheat', 'wheat']);
    const plain = run(newField(), ['wheat', 'wheat', 'wheat']);
    expect(organicMatterOf(withCover.field)).toBeGreaterThan(organicMatterOf(plain.field) + 0.02);
    const nextWheat = (f: Field) => farmYear(f, {act: 'wheat'}).n.fertiliser;
    expect(nextWheat(run(newField(), ['cover']).field)).toBeLessThan(nextWheat(run(newField(), ['wheat']).field) - 20);
    expect(organicMatterOf(withCover.field)).toBeGreaterThan(organicMatterOf(without.field));
    // but the season's cash is not earned back in three years
    expect(scorePlans(newField(), [{act: 'cover'}, {act: 'wheat'}, {act: 'wheat'}], 3).total).toBeLessThan(scorePlans(newField(), continuous('wheat'), 3).total);
  });

  it('fallow rests the soil and earns nothing: disease and wheels ease, but it loses carbon and leaches nitrate', () => {
    const worn = run(newField(), ['potatoes', 'potatoes']).field;
    const rest = farmYear(worn, {act: 'fallow'}), crop = farmYear(worn, {act: 'wheat'});
    expect(rest.revenue).toBe(0);
    expect(rest.margin).toBeLessThan(0);
    expect(rest.field.inoculum.solanum).toBeLessThan(0.75 * worn.inoculum.solanum);
    expect(rest.field.compaction).toBeLessThan(crop.field.compaction);
    // and the price: the most carbon lost of any year, and more nitrate leached than under a cover crop
    expect(rest.c.change).toBeLessThan(crop.c.change);
    expect(rest.c.change).toBeLessThan(-1500);
    expect(rest.n.leached).toBeGreaterThan(farmYear(newField(), {act: 'cover'}).n.leached * 3);
    // the field it rested is then the better for the next crop's disease
    expect(diseaseFactor(rest.field, 'solanum')).toBeGreaterThan(diseaseFactor(worn, 'solanum') + 0.03);
  });

  it('a ley builds the most carbon, fixes nitrogen, earns a little and leaves a credit', () => {
    const ley = farmYear(newField(), {act: 'ley'}), beans = farmYear(newField(), {act: 'beans'});
    expect(ley.c.change).toBeGreaterThan(1500);
    expect(ley.c.change).toBeGreaterThan(farmYear(newField(), {act: 'cover'}).c.change);
    expect(ley.n.fixed).toBeGreaterThan(50);
    expect(ley.margin).toBeGreaterThan(0);
    expect(ley.margin).toBeLessThan(beans.margin);
    const after = nitrogenSupply(ley.field, 'wheat') - nitrogenSupply(newField(), 'wheat');
    expect(after).toBeGreaterThan(20);
  });

  it('a margin takes land and gives pollination and pest control: it pays a bean crop and costs a cereal', () => {
    const bare = newField(), edged = newField({margin: 0.05});
    const beans = (f: Field) => farmYear(f, {act: 'beans'}).yieldT, wheat = (f: Field) => farmYear(f, {act: 'wheat'}).yieldT;
    expect(beans(edged)).toBeGreaterThan(beans(bare) * 1.03);
    expect(wheat(edged)).toBeLessThan(wheat(bare));
    expect(wheat(edged)).toBeGreaterThan(wheat(bare) * 0.94); // the pests it holds back give some of the land back
    expect(farmYear(edged, {act: 'beans'}).factors.pollination).toBeGreaterThan(farmYear(bare, {act: 'beans'}).factors.pollination);
  });
});

describe('rotation: soil at field scale', () => {
  it('compaction lowers yield and recovers slowly', () => {
    const f = newField(), tight = {...f, compaction: 40};
    const loose = farmYear(f, {act: 'wheat'}), squeezed = farmYear(tight, {act: 'wheat'});
    expect(squeezed.yieldT / loose.yieldT).toBeGreaterThan(0.84);
    expect(squeezed.yieldT / loose.yieldT).toBeLessThan(0.92); // Håkansson & Reeder: 10–15 % for a typical compacted field
    // a year with nothing wheeled but a topping brings it down a little, not away: half in about five years
    const rested = farmYear(tight, {act: 'fallow'}).field.compaction;
    expect(rested).toBeLessThan(40);
    expect(rested).toBeGreaterThan(30);
    // potatoes, lifted from wet ground in the autumn, do more harm than wheat, harvested from dry
    expect(farmYear(f, {act: 'potatoes'}).field.compaction).toBeGreaterThan(3 * farmYear(f, {act: 'wheat'}).field.compaction);
    // and it takes structure off the soil, so health
    expect(healthOf(tight)).toBeLessThan(healthOf(f));
  });

  it('a well-run rotation holds its yields over five years, and a well-run one with manure and covers holds its carbon', () => {
    const s = scorePlans(newField(), followed, 8);
    const first = s.years.slice(0, 4), second = s.years.slice(4);
    for (let i = 0; i < 4; i++) expect(second[i]!.relative).toBeGreaterThan(0.9 * first[i]!.relative);
    for (const r of s.years) expect(r.relative).toBeGreaterThan(0.75);
    // through wet and dry years as well
    const weathered = scorePlans(newField(), followed, 8, [{drainage: 250, dry: 0, season: 1}, {drainage: 400, dry: 0, season: 0.95}, {drainage: 150, dry: 0.8, season: 1}]);
    for (const r of weathered.years) expect(r.relative).toBeGreaterThan(0.65);
    // phosphorus and potassium hold (the garden's beds ran theirs to nothing in two years: docs/systems/rotation.md)
    expect(s.field.p).toBeGreaterThan(0.9 * newField().p);
    expect(s.field.k).toBeGreaterThan(0.9 * newField().k);
    // manure and a catch crop after each spring crop hold organic matter where the plain rotation loses it
    const kind = (f: Field): Plan => ({...followed(f), manure: 25, catchCrop: true});
    expect(scorePlans(newField(), kind, 8).organicMatter).toBeGreaterThan(s.organicMatter + 0.15);
    expect(scorePlans(newField(), kind, 8).organicMatter).toBeGreaterThan(newField().humus * 0 + organicMatterOf(newField()) - 0.05);
  });

  it('mining phosphorus and potassium works for a while and then fails', () => {
    const mined = scorePlans(newField(), (f) => ({...followed(f), maintain: false}), 8), kept = scorePlans(newField(), followed, 8);
    expect(mined.years[0]!.relative).toBeCloseTo(kept.years[0]!.relative, 2);
    expect(mined.years[0]!.margin).toBeGreaterThan(kept.years[0]!.margin); // the fertiliser it didn't buy
    expect(mined.years[7]!.relative).toBeLessThan(0.85 * kept.years[7]!.relative);
    expect(mined.field.k).toBeLessThan(150);
  });

  it('leaches more nitrate from bare winter ground than from green', () => {
    // a field left with mineral nitrogen after potatoes; the next winter is bare under spring barley, green under winter wheat or after a catch crop
    const rich = {...run(newField(), ['potatoes']).field, nitrate: 120};
    const bare = farmYear(rich, {act: 'barley'}), green = farmYear(rich, {act: 'wheat'}), caught = farmYear({...rich, catchCrop: true}, {act: 'barley'});
    expect(bare.n.leached).toBeGreaterThan(green.n.leached + 15);
    expect(bare.n.leached).toBeGreaterThan(caught.n.leached + 15);
    expect(bare.n.leached).toBeGreaterThan(60); // a wet winter on bare, rich ground: over half of what's there
    // wetter winters wash more, drier less
    expect(farmYear(rich, {act: 'barley'}, {drainage: 400, dry: 0, season: 1}).n.leached).toBeGreaterThan(bare.n.leached);
    expect(farmYear(rich, {act: 'barley'}, {drainage: 100, dry: 0, season: 1}).n.leached).toBeLessThan(bare.n.leached);
    // the catch crop is paid for by what it saves: next year's crop has more nitrogen to use
    const catchYear = run({...rich}, [{act: 'potatoes', catchCrop: true}]).field, noCatch = run({...rich}, ['potatoes']).field;
    expect(nitrogenSupply(catchYear, 'barley')).toBeGreaterThan(nitrogenSupply(noCatch, 'barley'));
  });

  it('nitrous oxide is the IPCC\'s share: 1 % of applied and residue nitrogen, and 1.1 % of what leaches', () => {
    const r = farmYear(newField(), {act: 'wheat', manure: 25});
    const applied = r.n.fertiliser + r.n.manure, direct = r.n.nitrous - (r.n.leached / (1 - N2O.indirect)) * N2O.indirect;
    expect(direct).toBeGreaterThan(0.009 * applied);
    expect(direct).toBeLessThan(0.013 * applied);
    // kg CO₂e: 44/28 of the N₂O-N, 273 times carbon dioxide's warming
    expect(r.nitrousCo2e).toBeCloseTo(r.n.nitrous * (44 / 28) * 273, 6);
    expect(r.nitrousCo2e).toBeGreaterThan(400); // about a tonne CO₂e/ha for a fertilised wheat crop
    expect(r.nitrousCo2e).toBeLessThan(2500);
    // no fertiliser, none of that: a bean crop's nitrous oxide is a fifth of it or less
    expect(farmYear(newField(), {act: 'beans'}).nitrousCo2e).toBeLessThan(r.nitrousCo2e / 3);
  });

  it('a soil with more organic matter holds more water and loses less in a dry year', () => {
    const poor = newField({organicMatter: 2}), rich = newField({organicMatter: 6}), dry = {drainage: 250, dry: 1, season: 1};
    expect(awcOf(rich)).toBeGreaterThan(awcOf(poor));
    const loss = (f: Field) => 1 - farmYear(f, {act: 'barley'}, dry).factors.drought;
    expect(loss(poor)).toBeGreaterThan(loss(rich));
    expect(loss(poor)).toBeLessThan(0.35);
  });

  it('keeps nitrogen: what comes in less what goes out is what the stocks gained, every year, every act', () => {
    let f = newField();
    for (const act of ['beans', 'wheat', 'potatoes', 'barley', 'cover', 'ley', 'fallow', 'rape', 'wheat'] as const) {
      const r = farmYear(f, {act, manure: act === 'wheat' ? 20 : 0, catchCrop: act === 'barley'});
      const inn = r.n.fertiliser + r.n.manure + r.n.fixed, out = r.n.offtake + r.n.leached + r.n.nitrous;
      expect(r.n.change).toBeCloseTo(inn - out, 6);
      expect(r.field.nitrate).toBeGreaterThanOrEqual(0);
      f = r.field;
    }
  });
});

describe('rotation: the same functions at every scale', () => {
  it('gives a bed, a field and a farm the same per-hectare answer, and sums fields to a farm', () => {
    const bed = newField({hectares: 0.0003}), field = newField({hectares: 12});
    expect(farmYear(bed, {act: 'wheat'}).yieldT).toBeCloseTo(farmYear(field, {act: 'wheat'}).yieldT, 9);
    const two = [run(newField({hectares: 4}), ['beans']).field, run(newField({hectares: 6}), ['wheat']).field];
    const farm = summed(two, [farmYear(newField({hectares: 4}), {act: 'beans'}), farmYear(newField({hectares: 6}), {act: 'wheat'})]);
    expect(farm.hectares).toBe(10);
    expect(farm.organicMatter).toBeGreaterThan(3);
    expect(farm.organicMatter).toBeLessThan(4);
    expect(totalsOf(newField(), 10).nitrate).toBeCloseTo(10 * totalsOf(newField(), 1).nitrate, 9);
  });

  it('reads organic matter and structure as the soil model does', () => {
    const area = 3, spec = {texture: 'loam' as const, organicMatter: 4.5};
    const g = makeGraph([{id: 'bed-1', kind: 'bed', name: 'Bed', land: {crops: area}, stocks: startingSoil(spec, area, false)}], []);
    const n = g.nodes['bed-1']!, humus = n.stocks.carbon!.amount;
    n.stocks.carbon = {unit: 'kgCO2e', amount: humus};
    const f = newField({organicMatter: 4.5, texture: 'loam'});
    expect(organicMatterOf(f)).toBeCloseTo(organicMatter(n), 1);
    expect(structureOf(f)).toBeCloseTo(structure(n), 0);
    // and from the node the other way
    const back = fieldOf(n)!;
    expect(back.hectares).toBeCloseTo(area / 1e4, 9);
    expect(organicMatterOf(back)).toBeCloseTo(organicMatter(n), 6);
    expect(back.nitrate).toBeCloseTo(40, 6);
  });
});

/** A graph with a field, the atmosphere and a household purse, the edges between them, and a context to move flows in. */
function fieldGraph(o: {plan?: Plan | Act | 'rotation'; acts?: number} = {}) {
  const ha = 2, f = newField({hectares: ha}), t = totalsOf(f);
  const g: Graph = makeGraph([
    {
      id: 'field-1', kind: 'field', name: 'Field', land: {crops: ha * 1e4}, carbon: t.carbon * 0.98,
      stocks: {
        'carbon.fresh': {unit: 'kgCO2e', amount: (t.carbon * 0.02) as never}, 'nitrogen.organic': {unit: 'kgN', amount: t.organicN as never}, [RESIDUE_N]: {unit: 'kgN', amount: 0 as never},
        nitrate: {unit: 'kgN', amount: t.nitrate as never}, phosphorus: {unit: 'kgP', amount: t.p as never}, potassium: {unit: 'kgK', amount: t.k as never},
      },
      levers: {plan: (o.plan ?? 'rotation') as never, payer: 'home'},
    },
    {id: ATMOSPHERE, kind: 'atmosphere', name: 'Air', stocks: {}},
    {id: 'home', kind: 'household', name: 'Home', stocks: {money: {unit: 'GBP', amount: 5000 as never}}},
  ], [{id: 'e1', from: 'field-1', to: ATMOSPHERE, carries: ['kgCO2e']}]);
  const flows: Flow[] = [];
  const ctx = {tick: 'year' as const, hours: 0, dt: 24 * 365, date: {} as never, level: 3, graph: g, rng: rng(5), activity: () => {}, flow: (fl: Flow) => {
    const bad = applyFlow(g, fl);
    if (bad) throw new Error(bad);
    flows.push(fl);
    return null;
  }};
  return {g, ctx, flows};
}

describe('rotation: on the graph', () => {
  it('moves a field\'s stocks by flows to exactly what farmYear works out, and balances', () => {
    const {g, ctx, flows} = fieldGraph({plan: {act: 'wheat', manure: 10}});
    const before = stockTotals(Object.values(g.nodes)), n = g.nodes['field-1']!, f0 = fieldOf(n)!;
    const r = growYear(ctx, n)!;
    const after = fieldOf(n)!, want = r.field;
    for (const k of ['humus', 'fresh', 'organicN', 'residueN', 'nitrate', 'p', 'k'] as const) expect(after[k], k).toBeCloseTo(want[k], 4);
    expect(after.history.at(-1)!.act).toBe('wheat');
    expect(after.compaction).toBeCloseTo(want.compaction, 9);
    expect(f0.history).toHaveLength(0);
    // the balance: the stocks' change is what crossed the boundaries, and no flow ran out of a stock that lacked it
    const off = imbalance(before, stockTotals(Object.values(g.nodes)), flows);
    for (const [unit, x] of Object.entries(off)) expect(Math.abs(x), unit).toBeLessThan(1e-6);
    // the money: sales in, inputs out
    expect(g.nodes.home!.stocks.money!.amount).toBeCloseTo(5000 + (r.revenue - r.cost) * 2, 4);
    // and the air took the nitrous oxide and the decay
    expect(flows.some((x) => x.what === 'nitrous oxide' && x.unit === 'kgCO2e')).toBe(true);
    expect(flows.some((x) => x.what === 'leaching' && 'boundary' in x.to && x.to.boundary === 'drainage')).toBe(true);
  });

  it('runs a rotation system that follows the plan every year for years', () => {
    const {g, ctx} = fieldGraph();
    const acts: Act[] = [];
    for (let y = 0; y < 5; y++) {
      const n = g.nodes['field-1']!;
      acts.push(planOf(n, fieldOf(n)!).act);
      rotation.on.year!(ctx);
    }
    expect(acts).toEqual(['beans', 'wheat', 'potatoes', 'barley', 'beans']);
    const n = g.nodes['field-1']!, f = fieldOf(n)!;
    expect(f.p).toBeGreaterThan(0.9 * newField().p);
    expect(g.nodes.home!.stocks.money!.amount).toBeGreaterThan(5000);
    // no stock has run negative
    for (const s of Object.values(n.stocks)) expect(s.amount).toBeGreaterThanOrEqual(-1e-9);
  });

  it('runs ten fields for a year in a small fraction of a millisecond each', () => {
    const fields = Array.from({length: 10}, () => run(newField(), ['beans', 'wheat']).field), plan = {act: 'potatoes'} as const;
    for (let i = 0; i < 100; i++) for (const f of fields) farmYear(f, plan); // warm up
    const t0 = performance.now(), calls = 2000;
    for (let i = 0; i < calls; i++) for (const f of fields) farmYear(f, plan);
    const perYear = (performance.now() - t0) / calls; // ms for ten fields
    expect(perYear).toBeLessThan(0.5);
  });
});
