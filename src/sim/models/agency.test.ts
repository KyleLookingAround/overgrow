// The agency model's plausibility test: the allotment's eleven neighbours are households with goals, habits and a hidden
// honesty; a helper of low integrity reports less than they took while the flows still balance; watching narrows the gap
// and costs hours and goodwill, and pays or doesn't by the price of your hours; the plot of the household with the least
// time is the one neglected over a season, from a seed; goodwill rises with shared surplus, falls with a bonfire and
// drifts slowly back; trust in reports comes to match the truth; the seed catalogue's list favours its own seeds; and the
// same functions serve a hired hand.
import {describe, expect, it} from 'vitest';
import {CATALOGUE, HELP, INTEGRITY, NEIGHBOURS, TRUST, WATCH} from '../../data/agency';
import {applyFlow, boundaryNet, imbalance, makeGraph, qty, stockTotals, type Flow} from '../graph';
import type {TickContext} from '../clock';
import {rng} from '../random';
import {dayHours} from './labour';
import {weekGardenHours} from './household';
import {
  after, agency, allotment, asWorker, audited, AGENT, drift, HELPING, helperWeek, honesty, makeAgent, neglectedPlot, newRelation, padded, plotHours,
  RELATION, recommend, reportOf, shared, secondPlot, siteGoodwill, spareHours, takingsOf, TAKINGS, tilt, weekPlan, householdOf, type Agent, type Option, type Relation,
} from './agency';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const lone = (integrity: number, habit: Agent['habit'] = 'competitive'): Agent => ({...makeAgent('h', 'Helper', habit, householdOf('h', 'Helper', {holder: 'none'}), rng(9)), integrity});

describe('the allotment’s eleven neighbours', () => {
  it('are households with a habit, goals summing to 1 and an honesty within bounds, on plots 2 to 12', () => {
    const {agents} = allotment(rng(1));
    expect(agents).toHaveLength(11);
    expect(agents.map((a) => a.plot).sort()).toEqual(Array.from({length: 11}, (_, i) => `plot-${i + 2}`).sort());
    const habits = (h: string) => agents.filter((a) => a.habit === h).length;
    expect([habits('tidy'), habits('lazy'), habits('generous'), habits('competitive')]).toEqual([3, 3, 2, 3]);
    for (const a of agents) {
      expect(Object.values(a.goals).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9);
      expect(a.integrity).toBeGreaterThanOrEqual(INTEGRITY.min);
      expect(a.integrity).toBeLessThanOrEqual(INTEGRITY.max);
      expect(a.household.members.length).toBeGreaterThan(0);
    }
    expect(new Set(agents.map((a) => a.name)).size).toBe(11);
  });

  it('want what their habit says: the lazy want rest, the competitive want harvest, the tidy want standing', () => {
    const many = Array.from({length: 40}, (_, i) => allotment(rng(i + 1)).agents).flat();
    const goal = (h: string, w: keyof Agent['goals']) => mean(many.filter((a) => a.habit === h).map((a) => a.goals[w]));
    expect(goal('lazy', 'rest')).toBeGreaterThan(goal('competitive', 'rest') * 3);
    expect(goal('competitive', 'harvest')).toBeGreaterThan(goal('lazy', 'harvest') * 2);
    expect(goal('tidy', 'standing')).toBeGreaterThan(goal('lazy', 'standing') * 5);
    // and competitive neighbours are the least honest, tidy the most
    const honest = (h: string) => mean(many.filter((a) => a.habit === h).map((a) => a.integrity));
    expect(honest('tidy')).toBeGreaterThan(honest('competitive') + 0.1);
  });

  it('draws the same allotment from the same seed and another from another', () => {
    expect(allotment(rng(3))).toEqual(allotment(rng(3)));
    expect(allotment(rng(3)).agents.map((a) => a.id + a.plot)).not.toEqual(allotment(rng(4)).agents.map((a) => a.id + a.plot));
  });

  it('offers a helper from the generous or the competitive, with spare time, and an honesty kept low', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const {agents, helper} = allotment(rng(seed)), h = agents.find((a) => a.id === helper)!;
      expect(['generous', 'competitive']).toContain(h.habit);
      expect(h.integrity).toBeLessThanOrEqual(INTEGRITY.helperMax);
      expect(spareHours(h)).toBeGreaterThan(0);
    }
  });
});

describe('who neglects their plot', () => {
  it('is the household with the least time, over a season, from any seed', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const {agents, neglected} = allotment(rng(seed)), rand = rng(seed * 7);
      const hours = agents.map((a) => weekGardenHours(a.household)), least = agents[hours.indexOf(Math.min(...hours))]!;
      expect(least.plot).toBe(neglected); // exactly one household has the least time, so the plot follows the time
      expect(hours.filter((h) => h === Math.min(...hours))).toHaveLength(1);
      const kept = agents.map((a) => mean(Array.from({length: 13}, () => weekPlan(a, rand).kept)));
      const worst = kept.indexOf(Math.min(...kept));
      expect(agents[worst]!.plot).toBe(neglected);
      expect(kept[worst]!).toBeLessThan(0.85);
      expect(Math.max(...kept)).toBeGreaterThan(0.99);
    }
  });

  it('gives the first zoom back in its plot from a seed, and its plot changes with the seed', () => {
    const picks = Array.from({length: 20}, (_, i) => neglectedPlot(i + 1));
    expect(neglectedPlot(5)).toEqual(neglectedPlot(5));
    expect(new Set(picks.map((p) => p.plot)).size).toBeGreaterThan(5);
    expect(new Set(picks.map((p) => p.who)).size).toBe(1); // who it is follows their time, so it is the same neighbour
    expect(NEIGHBOURS.some((n) => n.name.length > 0)).toBe(true);
  });

  it('follows habit as well as time: a lazy household gives less than a tidy one of the same time', () => {
    const shape = {holder: 'full' as const, partner: 'none' as const};
    const a = (habit: Agent['habit']) => makeAgent('x', 'X', habit, householdOf('x', 'X', shape), rng(1));
    expect(plotHours(a('lazy'))).toBeLessThan(plotHours(a('tidy')));
  });
});

describe('a helper’s report against the truth', () => {
  const build = (helper: Agent, watching: 'trust' | 'glance' | 'audit' = 'trust') => {
    const g = makeGraph([
      {id: 'plot-1b', kind: 'plot', name: 'Second plot', stocks: {'food.potatoes': {unit: 'kgFood', product: 'potatoes', amount: qty(12, 'kgFood')}}},
      {id: 'helper', kind: 'neighbour', name: 'Helper', levers: {[AGENT]: helper as never, [HELPING]: {plot: 'plot-1b', watching, payer: 'you'} as never}},
      {id: 'you', kind: 'gardener', name: 'You', stocks: {hours: {unit: 'h', amount: qty(10, 'h')}}},
    ], [{id: 'e', from: 'plot-1b', to: 'helper', carries: ['kgFood']}]);
    const flows: Flow[] = [];
    const ctx = (hours: number, seed = 1): TickContext => ({
      tick: 'week', hours, dt: 1, date: null as never, level: 2, graph: g, rng: rng(seed), flow: (f) => (flows.push(f), applyFlow(g, f)), activity: () => {},
    });
    return {g, flows, ctx};
  };

  it('is less than they took when their integrity is low, and the truth still balances on the graph', () => {
    const {g, flows, ctx} = build(lone(0.2));
    const before = stockTotals(Object.values(g.nodes));
    agency.on.week!(ctx(168));
    const t = takingsOf(g.nodes.helper!), l = g.nodes[('helper')]!;
    expect(t.took).toBeGreaterThan(HELP.plotKg * HELP.share); // the agreed share and more
    expect(t.reported).toBeLessThan(t.took - 0.5);
    expect(t.hidden).toBeCloseTo(t.took - t.reported, 9);
    expect(l.stocks['food.potatoes']!.amount).toBeCloseTo(t.took, 9); // the kg they took are on their shelf: the map can show it
    expect(g.nodes['plot-1b']!.stocks['food.potatoes']!.amount).toBeCloseTo(12 - t.took, 9);
    const off = imbalance(before, stockTotals(Object.values(g.nodes)), flows);
    for (const v of Object.values(off)) expect(Math.abs(v)).toBeLessThan(1e-9);
    expect(boundaryNet(flows)['kgFood:potatoes'] ?? 0).toBeCloseTo(0, 9);
  });

  it('is the whole truth when they are honest, and less honest people leave a bigger gap', () => {
    const rand = rng(4);
    const gap = (i: number) => mean(Array.from({length: 200}, () => helperWeek(lone(i), 12, 'trust', rand).gap));
    expect(helperWeek(lone(1), 12, 'trust', rng(1)).gap).toBeCloseTo(0, 9);
    expect(gap(0.2)).toBeGreaterThan(gap(0.5));
    expect(gap(0.5)).toBeGreaterThan(gap(0.8));
    expect(honesty(1, 0)).toBe(1);
    expect(honesty(0.4, 0)).toBeCloseTo(0.4, 9);
    expect(honesty(0.4, 1)).toBe(1);
    // a report is never above the truth and never below the agreed share
    const t = helperWeek(lone(0.1), 12, 'trust', rng(2));
    expect(t.reported).toBeLessThanOrEqual(t.took);
    expect(t.reported).toBeGreaterThanOrEqual(t.agreed);
  });

  it('takes more when they are competitive than tidy, at the same honesty', () => {
    const rand = rng(6);
    const took = (h: Agent['habit']) => mean(Array.from({length: 200}, () => helperWeek(lone(0.4, h), 12, 'trust', rand).took));
    expect(took('competitive')).toBeGreaterThan(took('tidy') + 1);
  });
});

describe('watching', () => {
  const avg = (i: number, w: 'trust' | 'glance' | 'audit', n = 300) => {
    const rand = rng(11), ts = Array.from({length: n}, () => helperWeek(lone(i), 12, w, rand));
    return {gap: mean(ts.map((t) => t.gap)), took: mean(ts.map((t) => t.took)), reported: mean(ts.map((t) => t.reported))};
  };

  it('narrows the gap between report and truth, and the harder the more', () => {
    expect(avg(0.2, 'glance').gap).toBeLessThan(avg(0.2, 'trust').gap);
    expect(avg(0.2, 'audit').gap).toBeLessThan(avg(0.2, 'glance').gap * 0.6);
    expect(avg(0.2, 'audit').took).toBeLessThan(avg(0.2, 'trust').took); // and being watched deters some of the taking
  });

  it('costs the player hours and the helper’s goodwill, each week', () => {
    const t = helperWeek(lone(0.2), 12, 'audit', rng(3)), r = newRelation();
    const watched = audited(r, t, 'audit'), glanced = audited(r, t, 'glance'), trusted = audited(r, t, 'trust');
    expect(trusted.goodwill).toBe(r.goodwill);
    expect(watched.goodwill).toBeLessThan(glanced.goodwill);
    expect(glanced.goodwill).toBeLessThan(r.goodwill);
    expect(WATCH.audit.hours).toBeGreaterThan(WATCH.glance.hours);
    expect(WATCH.trust.hours).toBe(0);
  });

  it('spends the hours in the graph: a watched week takes them from the player, a trusted one takes none', () => {
    const run = (w: 'trust' | 'audit') => {
      const g = makeGraph([
        {id: 'plot', kind: 'plot', name: 'P', stocks: {'food.potatoes': {unit: 'kgFood', product: 'potatoes', amount: qty(12, 'kgFood')}}},
        {id: 'helper', kind: 'neighbour', name: 'H', levers: {[AGENT]: lone(0.5) as never, [HELPING]: {plot: 'plot', watching: w, payer: 'you'} as never}},
        {id: 'you', kind: 'gardener', name: 'You', stocks: {hours: {unit: 'h', amount: qty(10, 'h')}}},
      ], [{id: 'e', from: 'plot', to: 'helper', carries: ['kgFood']}]);
      const c: TickContext = {tick: 'week', hours: 168, dt: 1, date: null as never, level: 2, graph: g, rng: rng(1), flow: (f) => applyFlow(g, f), activity: () => {}};
      agency.on.week!(c);
      return g;
    };
    expect(run('trust').nodes.you!.stocks.hours!.amount).toBe(10);
    expect(run('audit').nodes.you!.stocks.hours!.amount).toBeCloseTo(10 - WATCH.audit.hours, 9);
    expect(takingsOf(run('audit').nodes.helper!).hoursWatched).toBe(WATCH.audit.hours);
  });

  it('teaches trust the truth: an honest person’s reports come to be believed, a liar’s do not', () => {
    const learn = (integrity: number) => {
      let r = newRelation();
      const rand = rng(21);
      for (let w = 0; w < 20; w++) r = audited(r, helperWeek(lone(integrity), 12, 'audit', rand), 'audit');
      return r;
    };
    expect(learn(1).trust).toBeGreaterThan(0.95);
    expect(learn(0.2).trust).toBeLessThan(0.4);
    expect(learn(0.2).trust).toBeLessThan(TRUST.prior);
    expect(audited(newRelation(), helperWeek(lone(0.2), 12, 'trust', rng(3)), 'trust').trust).toBe(TRUST.prior); // no watching, no learning
  });
});

describe('the second plot is a trade, both ways', () => {
  const avg = (o: Parameters<typeof secondPlot>[0], n = 400) => {
    const rand = rng(31), r = Array.from({length: n}, () => secondPlot(o, rand));
    return {hours: mean(r.map((x) => x.hours)), kg: mean(r.map((x) => x.kg)), hidden: mean(r.map((x) => x.hidden)), value: mean(r.map((x) => x.value))};
  };

  it('a helper saves the player’s hours and costs kg they do not see', () => {
    const alone = avg({helper: null}), helped = avg({helper: lone(0.2)});
    expect(helped.hours).toBeLessThan(alone.hours);
    expect(helped.kg).toBeLessThan(alone.kg * 0.5);
    expect(helped.hidden).toBeGreaterThan(1); // taken, not reported, and nowhere in the numbers
    expect(avg({helper: lone(1)}).hidden).toBeCloseTo(0, 9);
  });

  it('is worth it when hours are dear and an honest helper is on offer, and not when hours are cheap', () => {
    const honest = lone(1);
    expect(avg({helper: honest, hourKg: 3}).value).toBeGreaterThan(avg({helper: null, hourKg: 3}).value);
    expect(avg({helper: honest, hourKg: 0.3}).value).toBeLessThan(avg({helper: null, hourKg: 0.3}).value);
  });

  it('a dishonest helper is a worse bet than an honest one at every price of an hour', () => {
    for (const hourKg of [0.3, 1.5, 3]) expect(avg({helper: lone(0.2), hourKg}).value).toBeLessThan(avg({helper: lone(1), hourKg}).value);
  });

  it('auditing pays when your hours are cheap and a dishonest helper is taking, and not when they are dear or the helper is honest', () => {
    const liar = lone(0.2), honest = lone(1);
    expect(avg({helper: liar, watching: 'audit', hourKg: 0.3}).value).toBeGreaterThan(avg({helper: liar, hourKg: 0.3}).value);
    expect(avg({helper: liar, watching: 'audit', hourKg: 3}).value).toBeLessThan(avg({helper: liar, hourKg: 3}).value);
    expect(avg({helper: honest, watching: 'audit', hourKg: 0.3}).value).toBeLessThan(avg({helper: honest, hourKg: 0.3}).value);
  });

  it('a partly kept plot gives a smaller harvest to share', () => {
    expect(avg({helper: lone(0.5), kept: 0.5}).kg).toBeLessThan(avg({helper: lone(0.5), kept: 1}).kg);
  });
});

describe('goodwill and trust as slow stocks', () => {
  const g = (r: Relation) => r.goodwill;

  it('rises with shared surplus, and falls with a bonfire, peat and a plot dug from grass', () => {
    const r = newRelation();
    expect(g(after(r, {type: 'shared', kg: 5}))).toBeGreaterThan(g(r));
    expect(g(after(r, {type: 'shared', kg: 10}))).toBeGreaterThan(g(after(r, {type: 'shared', kg: 5})));
    expect(g(after(r, {type: 'shared', kg: 1000})) - g(r)).toBeLessThan(0.06); // shared surplus can only do so much a week
    for (const choice of ['bonfire', 'peat', 'plot dug from grass']) expect(g(after(r, {type: 'carbon', choice}))).toBeLessThan(g(r));
    for (const choice of ['compost', 'no-dig']) expect(g(after(r, {type: 'carbon', choice}))).toBeGreaterThan(g(r));
    expect(g(after(r, {type: 'carbon', choice: 'bonfire'}))).toBeLessThan(g(after(r, {type: 'carbon', choice: 'peat'})));
    expect(g(after(r, {type: 'carbon', choice: 'something else'}))).toBe(g(r));
  });

  it('costs more the more a watch finds: a bigger gap is a bigger fall, and any gap costs at least the base step', () => {
    const r = newRelation();
    expect(g(after(r, {type: 'found', gap: 4}))).toBeLessThan(g(after(r, {type: 'found', gap: 1})));
    expect(g(after(r, {type: 'found', gap: 0.2}))).toBe(g(after(r, {type: 'found', gap: 1})));
  });

  it('gives away by habit: the generous share far more of a surplus than the competitive', () => {
    const a = (h: Agent['habit']) => lone(0.5, h);
    expect(shared(a('generous'), 10)).toBeGreaterThan(shared(a('competitive'), 10) * 5);
    expect(shared(a('lazy'), -3)).toBe(0);
  });

  it('is built slowly and lost quickly: a broken promise costs more than a kept one earns, and help earns by the hour', () => {
    const r = newRelation();
    expect(g(r) - g(after(r, {type: 'missed'}))).toBeGreaterThan(g(after(r, {type: 'kept'})) - g(r));
    expect(g(after(r, {type: 'help', hours: 6}))).toBeGreaterThan(g(after(r, {type: 'help', hours: 1})));
  });

  it('has no cliff: the nearer to 1, the less a kept promise adds, and the nearer to 0 the less a loss takes', () => {
    const hi: Relation = {goodwill: 0.95, trust: 0.5}, lo: Relation = {goodwill: 0.05, trust: 0.5};
    expect(g(after(hi, {type: 'kept'})) - 0.95).toBeLessThan(g(after(newRelation(), {type: 'kept'})) - 0.5);
    expect(0.05 - g(after(lo, {type: 'missed'}))).toBeLessThan(0.5 - g(after(newRelation(), {type: 'missed'})));
    expect(g(after(hi, {type: 'kept'}))).toBeLessThanOrEqual(1);
    expect(g(after(lo, {type: 'missed'}))).toBeGreaterThanOrEqual(0);
  });

  it('drifts back to neutral over months, not weeks: about half is gone in half a year', () => {
    let r = after(newRelation(), {type: 'carbon', choice: 'bonfire'});
    const dip = TRUST.baseline - g(r);
    for (let w = 0; w < 4; w++) r = drift(r);
    expect(TRUST.baseline - g(r)).toBeGreaterThan(dip * 0.85);
    for (let w = 4; w < 26; w++) r = drift(r);
    expect(TRUST.baseline - g(r)).toBeGreaterThan(dip * 0.4);
    expect(TRUST.baseline - g(r)).toBeLessThan(dip * 0.6);
  });

  it('is the mean across the site: one bonfire lowers every neighbour’s and so the site’s', () => {
    const rs = Array.from({length: 11}, newRelation), before = siteGoodwill(rs);
    expect(siteGoodwill(rs.map((r) => after(r, {type: 'carbon', choice: 'bonfire'})))).toBeLessThan(before);
    expect(siteGoodwill([])).toBe(TRUST.baseline);
  });
});

describe('the seed catalogue’s interest', () => {
  const options = (n: number, rand: ReturnType<typeof rng>): Option[] => Array.from({length: n}, (_, i) => ({id: `s${i}`, merit: 0.3 + rand.next() * 0.6, own: i % 2 === 0}));

  it('favours its own seeds by a measurable margin over an honest list', () => {
    const rand = rng(41);
    const runs = Array.from({length: 200}, () => tilt(options(20, rand), 5));
    const biased = mean(runs.map((t) => t.own)), fair = mean(runs.map((t) => t.ownFair));
    expect(fair).toBeGreaterThan(2); // roughly half of an honest five
    expect(fair).toBeLessThan(3);
    expect(biased).toBeGreaterThan(fair + 0.6);
    expect(mean(runs.map((t) => t.displaced.length))).toBeGreaterThan(0.5);
    expect(runs.every((t) => t.displaced.every((o) => o.own))).toBe(true); // what it pushes in is its own
  });

  it('is honest when its bias is zero, and its top pick is never worse than its bias allows', () => {
    const rand = rng(42), opts = options(20, rand);
    expect(recommend(opts, 5, 0).map((o) => o.id)).toEqual([...opts].sort((a, b) => b.merit - a.merit).slice(0, 5).map((o) => o.id));
    for (let i = 0; i < 50; i++) {
      const o = options(20, rand), best = Math.max(...o.map((x) => x.merit));
      expect(recommend(o, 1)[0]!.merit).toBeGreaterThan(best / (1 + CATALOGUE.bias) - 1e-9);
    }
  });

  it('a bigger bias pushes in more of its own', () => {
    const rand = rng(43), o = options(20, rand);
    const own = (b: number) => recommend(o, 5, b).filter((x) => x.own).length;
    expect(own(1)).toBeGreaterThanOrEqual(own(CATALOGUE.bias));
    expect(own(CATALOGUE.bias)).toBeGreaterThanOrEqual(own(0));
  });
});

describe('the same people one level up', () => {
  it('a hired hand is an agent too: their skills and their wish to rest become a labour.ts worker, and their hours are padded by the dishonest', () => {
    const rand = rng(51), lazy = makeAgent('hand', 'Hand', 'lazy', householdOf('hand', 'Hand', {holder: 'none'}), rand);
    const w = asWorker(lazy);
    expect(w.role).toBe('hired hand');
    expect(w.goals.hoursCap).toBe(6);
    expect(dayHours(w.role, {season: 'summer', weekday: 1}, w.goals)).toBeLessThan(dayHours(w.role, {season: 'summer', weekday: 1}));
    expect(asWorker({...lazy, goals: {...lazy.goals, rest: 0.1}}).goals.hoursCap).toBeUndefined();
    expect(padded(8, 2, 0.2, 0)).toBeGreaterThan(padded(8, 2, 0.8, 0));
    expect(padded(8, 2, 0.2, 1)).toBe(8);
    expect(padded(8, 2, 1, 0)).toBe(8);
    expect(reportOf(4, 6, 0.5, 0)).toBe(7);
  });
});

describe('the agency system', () => {
  const site = () => {
    const {agents, helper} = allotment(rng(1));
    const nodes = agents.map((a) => ({id: a.id, kind: 'neighbour', name: a.name, levers: (a.id === helper ? {[AGENT]: a, [HELPING]: {plot: 'second', watching: 'trust'}} : {[AGENT]: a}) as never}));
    const g = makeGraph([...nodes, {id: 'second', kind: 'plot', name: 'Second', stocks: {'food.potatoes': {unit: 'kgFood', product: 'potatoes', amount: qty(12, 'kgFood')}}}],
      [{id: 'e', from: 'second', to: helper, carries: ['kgFood']}]);
    const ctx = (hours: number, graph = g): TickContext => ({tick: 'week', hours, dt: 1, date: null as never, level: 2, graph, rng: rng(hours), flow: (f) => applyFlow(graph, f), activity: () => {}});
    return {g, agents, helper, ctx};
  };

  it('plans every neighbour’s week, drifts their goodwill, and lets the helper take what the flows show', () => {
    const {g, agents, helper, ctx} = site();
    for (let w = 1; w <= 3; w++) agency.on.week!(ctx(168 * w));
    for (const a of agents) expect((g.nodes[a.id]!.levers.week as unknown as {hours: number}).hours).toBeGreaterThan(0);
    expect(takingsOf(g.nodes[helper]!).weeks).toBe(3);
    expect(takingsOf(g.nodes[helper]!).took).toBeGreaterThan(0);
    expect(g.nodes[helper]!.stocks['food.potatoes']!.amount).toBeCloseTo(takingsOf(g.nodes[helper]!).took, 9);
    const other = agents.find((a) => a.id !== helper)!;
    expect((g.nodes[other.id]!.levers[RELATION] as unknown as Relation).goodwill).toBeCloseTo(TRUST.baseline, 9);
  });

  it('refuses a plan on a person’s honesty, goodwill or takings', () => {
    for (const lever of [AGENT, RELATION, TAKINGS])
      expect(agency.command!({type: 'plan', node: 'x', lever, value: 1}, makeGraph([], []), 2)).toMatch(/kept, not set/);
    expect(agency.command!({type: 'plan', node: 'x', lever: 'something', value: 1}, makeGraph([], []), 2)).toBeUndefined();
  });

  it('runs a week for eleven neighbours and a helper well inside the budget (measured in Node)', () => {
    const {g, ctx} = site();
    for (let w = 0; w < 20; w++) agency.on.week!(ctx(168 * w)); // warm up
    const n = 400, t0 = performance.now();
    for (let w = 0; w < n; w++) {
      g.nodes.second!.stocks['food.potatoes']!.amount = qty(12, 'kgFood');
      agency.on.week!(ctx(168 * (w + 20)));
    }
    const per = (performance.now() - t0) / n;
    console.log(`agency: a week for eleven neighbours and a helper takes ${(per * 1000).toFixed(0)} µs`);
    expect(per).toBeLessThan(2);
  });
});
