// Round four's rules (docs/specs/playable-garden-4.md): the money ladder the goal bar climbs, the caps on repeat buys,
// the honesty box kept stocked, the glut card's money, midwinter's jobs as cards asked once and gone, and one "New:" a day.
import {describe, expect, it} from 'vitest';
import {BOX} from '../data/kitchen';
import {CLEAN, SETS, SILL} from '../data/shed';
import {calendar} from '../sim/clock';
import {createSim, type Command} from '../sim/index';
import {SPACED_FROM, unfold} from '../sim/commands';
import {newState} from '../sim/state';
import {seedCost} from '../sim/shed';
import {decisionsOf, glutGives} from './decisions';
import {nextRung, rungStep} from './goal';
import {offersIn} from './ShedTab';
import {nextLine} from './YearCard';

type Sim = ReturnType<typeof createSim>;
function game(edit: (save: any) => void): Sim {
  const sim = createSim(1), save = JSON.parse(sim.save());
  edit(save);
  expect(sim.apply({type: 'load', save: JSON.stringify(save)}).rejected).toBeNull();
  return sim;
}
const to = (sim: Sim, month: number, day = 1) => {
  while (!(calendar(sim.snapshot().hours).month === month && calendar(sim.snapshot().hours).day >= day)) sim.apply({type: 'tick', hours: 24});
};
const card = (sim: Sim, id: string) => decisionsOf(sim.snapshot()).find((d) => d.id === id) ?? null;
const answer = (sim: Sim, id: string, value: string) => sim.apply({type: 'card', id, answer: value} as Command);
const node = (sim: Sim, id: string) => sim.snapshot().nodes.find((n) => n.id === id)!;
const graph = (sim: Sim) => ({nodes: Object.fromEntries(sim.snapshot().nodes.map((n) => [n.id, n])), edges: [], rev: 0}) as never;

describe('the money ladder', () => {
  it('names the next rung with its gap, opens the Shed at it, and buys it once the purse can pay', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 20;
      s.seen = ['card.first-plan', 'garden.money', 'shed.beer-trap', 'shed.coop', 'shed.cold-frame'];
      s.graph.nodes.shed.levers.kit.owned = ['beer-trap'];
    });
    // the ladder's order, not the cheapest: the frame before the hen house
    expect(nextRung(sim.snapshot())).toBe('cold-frame');
    expect(rungStep(sim.snapshot())).toMatchObject({text: 'Cold frame: £20 to go', shed: 'cold-frame'});
    sim.apply({type: 'buy', id: 'beer-trap'});
    const rich = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 60;
      s.seen = ['card.first-plan', 'garden.money', 'shed.cold-frame'];
    });
    const step = rungStep(rich.snapshot())!;
    expect(step.cmds).toEqual([{type: 'buy', id: 'cold-frame'}]);
    expect(rich.apply(step.cmds[0]!).rejected).toBeNull();
    // with nothing more on offer, no rung
    expect(nextRung(rich.snapshot())).toBeNull();
  });

  it('shows each step once the one before is bought, and never the hens before their house', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 500;
      s.seen = ['card.first-plan', 'garden.money', 'shed.coop'];
    });
    expect(sim.apply({type: 'buy', id: 'hens'}).rejected).toMatch(/isn’t offering/);
    expect(sim.apply({type: 'buy', id: 'coop'}).rejected).toBeNull();
    expect(sim.snapshot().seen).toContain('shed.hens');
    expect(nextRung(sim.snapshot())).toBe('hens');
    expect(sim.apply({type: 'buy', id: 'hens'}).rejected).toBeNull();
    expect(sim.snapshot().seen).toContain('shed.hen');
  });

  it('hides a raised bed once every whole dug bed is raised, and never raises a half-dug one', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 500;
      s.seen = ['card.first-plan', 'garden.money', 'shed.raised-bed'];
    });
    expect(offersIn(sim.snapshot().nodes, sim.snapshot().seen)).toContain('raised-bed');
    sim.apply({type: 'buy', id: 'raised-bed'});
    sim.apply({type: 'buy', id: 'raised-bed'});
    expect(offersIn(sim.snapshot().nodes, sim.snapshot().seen)).not.toContain('raised-bed');
    // a bed being dug, part of it still grass, isn't one to raise
    sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true});
    sim.apply({type: 'tick', hours: 30});
    const b3 = node(sim, 'bed-3');
    if ((b3.stocks['land.grass']?.amount ?? 0) > 1e-6) expect(sim.apply({type: 'buy', id: 'raised-bed'}).rejected).toMatch(/every dug bed/);
  });

  it('carries the next rung into the year card’s line, with the offer’s state', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 30;
      s.seen = ['card.first-plan', 'garden.money', 'shed.coop'];
    });
    expect(nextLine(sim.snapshot())).toMatch(/^Next: hen house and run: £45 to go; the allotment: \d of 3 requirements met\.$/);
  });
});

describe('the honesty box and the glut', () => {
  it('keeps the box stocked from what the kitchen has beyond two days, eggs and jars too, never the winter’s store', () => {
    const play = (box: string) => {
      const sim = game((s) => {
        const k = s.graph.nodes.kitchen;
        k.stocks['food.lettuce'] = {unit: 'kgFood', amount: 0.5, product: 'lettuce'};
        k.stocks['food.potatoes'] = {unit: 'kgFood', amount: 8, product: 'potatoes'};
        k.stocks['food.preserves'] = {unit: 'kgFood', amount: 12, product: 'preserves'};
        k.levers.box = box;
        s.seen = ['card.first-plan', 'garden.money'];
      });
      // carried during the day, before the evening's passers-by
      sim.apply({type: 'tick', hours: 10});
      const gate = node(sim, 'gate');
      return {sim, at: (p: string) => gate.stocks[`food.${p}`]?.amount ?? 0};
    };
    const stock = play('stock'), spare = play('spare');
    expect(stock.at('preserves')).toBeGreaterThan(1);
    expect(stock.at('lettuce')).toBeGreaterThan(0.1);
    expect(stock.at('preserves') + stock.at('lettuce')).toBeLessThanOrEqual(BOX.stock + 1e-6);
    // the potatoes stored for the winter go only as far as they would anyway; left to what's spare, no jars or lettuce
    expect(stock.at('potatoes')).toBeCloseTo(spare.at('potatoes'), 9);
    expect(spare.at('preserves') + spare.at('lettuce')).toBe(0);
    expect(stock.sim.apply({type: 'policy', node: 'kitchen', lever: 'box', value: 'sometimes'}).rejected).toMatch(/spare or stock/);
  });

  it('asks to keep the box stocked when the purse is short of the rung, once, and the answer sets the policy', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 5;
      s.graph.nodes.kitchen.levers.ledger.firstHarvest = 1;
      s.seen = ['card.first-plan', 'garden.money', 'shed.coop'];
    });
    const d = card(sim, 'box')!;
    expect(d.text).toMatch(/Hen house and run is £70.00 away/);
    expect(sim.apply(d.actions[0]!.cmd).rejected).toBeNull();
    expect(node(sim, 'kitchen').levers.box).toBe('stock');
    expect(card(sim, 'box')).toBeNull();
  });

  it('says what each glut choice gives', () => {
    expect(glutGives('sell', 4)).toBe('up to £10.00');
    expect(glutGives('sell', 40)).toBe('up to £15.00');
    expect(glutGives('preserve', 4)).toBe('10 jars, £10.40 saved in winter');
    expect(glutGives('give', 4)).toBe('goodwill next door');
  });
});

describe('midwinter’s jobs', () => {
  const winter = (s: any) => {
    s.graph.nodes.kitchen.stocks.money.amount = 500;
    s.seen = ['card.first-plan', 'garden.money', 'garden.soil', 'garden.shed', 'garden.kitchen', 'shed.coop', 'shed.hens', 'shed.fruit-bush', 'shed.propagator'];
  };
  it('asks each once a winter, from its own date, and each answer does its job and ends it', () => {
    const sim = game(winter);
    for (const id of ['fruit-bush', 'coop', 'hens']) expect(sim.apply({type: 'buy', id}).rejected).toBeNull();
    to(sim, 12, 14);
    for (const id of ['hen-care', 'prune', 'clean', 'sets', 'sill']) expect(card(sim, id)).toBeNull();
    to(sim, 12, 15);
    expect(card(sim, 'hen-care')).not.toBeNull();
    expect(answer(sim, 'hen-care', 'care').rejected).toBeNull();
    expect(card(sim, 'hen-care')).toBeNull();
    to(sim, 12, 20);
    // the bush went in in March: it fruits next summer on older wood, so it's pruned
    expect(card(sim, 'prune')).not.toBeNull();
    expect(answer(sim, 'prune', 'prune').rejected).toBeNull();
    expect(card(sim, 'prune')).toBeNull();
    to(sim, CLEAN.from[0], CLEAN.from[1]);
    const slugs = () => sim.snapshot().nodes.filter((n) => n.kind === 'bed').reduce((a, n) => a + (n.stocks['pests.slugs']?.amount ?? 0), 0), was = slugs();
    expect(card(sim, 'clean')).not.toBeNull();
    expect(answer(sim, 'clean', 'clean').rejected).toBeNull();
    if (was > 1) expect(slugs()).toBeLessThan(was);
    expect(answer(sim, 'clean', 'clean').rejected).toMatch(/already/);
    expect(card(sim, 'clean')).toBeNull();
    to(sim, SETS.from[0], SETS.from[1]);
    expect(card(sim, 'sets')).not.toBeNull();
    const year = calendar(sim.snapshot().hours).year + 1;
    expect(answer(sim, 'sets', 'order').rejected).toBeNull();
    expect(seedCost(graph(sim), 'potatoes', year)).toBe(0);
    expect(card(sim, 'sets')).toBeNull();
    to(sim, SILL.from[0], SILL.from[1]);
    expect(card(sim, 'sill')).not.toBeNull();
    expect(answer(sim, 'sill', 'sow').rejected).toBeNull();
    expect(card(sim, 'sill')).toBeNull();
    const picked = sim.snapshot().kitchen!.picked;
    sim.apply({type: 'tick', hours: 24 * (SILL.wait + 7)});
    // the propagator's warmth: 30 g a day once ready
    expect(sim.snapshot().kitchen!.picked - picked).toBeGreaterThan(0.1);
    for (const id of ['hen-care', 'prune', 'clean', 'sets', 'sill']) expect(card(sim, id)).toBeNull();
  });
});

describe('spacing what unfolds', () => {
  it('unfolds no more than one batch a day from the third day, the rest with the next day’s first', () => {
    const s = newState(1, 1);
    // the first minute's days: every batch at once
    unfold(s, ['garden.water']);
    unfold(s, ['garden.slugs']);
    expect(s.seen).toEqual(['garden.water', 'garden.slugs']);
    s.hours = 24 * SPACED_FROM + 10;
    unfold(s, ['garden.aphids']);
    unfold(s, ['garden.blight', 'garden.flowers']);
    expect(s.seen).not.toContain('garden.blight');
    expect(s.unfolding.waiting).toEqual(['garden.blight', 'garden.flowers']);
    // nothing new the next day: the waiting batch comes on its own
    s.hours += 24;
    unfold(s, []);
    expect(s.seen).toContain('garden.blight');
    expect(s.seen).toContain('garden.flowers');
    expect(s.unfolding.waiting).toEqual([]);
    // and a second batch that day waits again
    unfold(s, ['garden.soil']);
    expect(s.seen).not.toContain('garden.soil');
  });
});
