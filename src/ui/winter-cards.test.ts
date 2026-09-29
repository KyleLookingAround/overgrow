// The autumn's and winter's cards (the playable garden, round three), each answered and shown to be gone: the leaves
// raked onto the heap, a cordon planted in bare-root season (and asked again only after three weeks, and never past the
// fence's room), the beds dug over or left no-dig; the glut card's buttons match its words; the year's card on the first
// anniversary; and what the mid-priced kit does: the propagator's cheaper seed, the bee hotel's bees, the purse's week.
import {describe, expect, it} from 'vitest';
import {CORDON, HOTEL, PROPAGATOR, UPGRADES} from '../data/shed';
import {CROPS} from '../data/crops';
import {calendar} from '../sim/clock';
import {YEAR_HOURS} from '../sim/commands';
import {createSim, type Command} from '../sim/index';
import {seedCost} from '../sim/shed';
import type {Purse} from '../sim/purse';
import {decisionsOf} from './decisions';
import {goOf, nextStep} from './goal';

/** A game from seed 1 carried on from an edited save. */
function game(edit: (save: any) => void) {
  const sim = createSim(1), save = JSON.parse(sim.save());
  edit(save);
  expect(sim.apply({type: 'load', save: JSON.stringify(save)}).rejected).toBeNull();
  return sim;
}
const rich = (s: any) => {
  s.graph.nodes.kitchen.stocks.money.amount = 500;
  s.seen = ['card.first-plan', 'garden.money', 'garden.soil'];
};
/** Plays on a day at a time to a month and day. */
function to(sim: ReturnType<typeof createSim>, month: number, day = 1) {
  while (!(calendar(sim.snapshot().hours).month === month && calendar(sim.snapshot().hours).day >= day)) sim.apply({type: 'tick', hours: 24});
}
const card = (sim: ReturnType<typeof createSim>, id: string) => decisionsOf(sim.snapshot()).find((d) => d.id === id) ?? null;
const answer = (sim: ReturnType<typeof createSim>, id: string, value: string) => sim.apply({type: 'card', id, answer: value} as Command);
const kitOf = (sim: ReturnType<typeof createSim>) => sim.snapshot().nodes.find((n) => n.id === 'shed')!.levers.kit as unknown as {owned: string[]};

describe('the autumn’s and winter’s cards', () => {
  it('asks to rake the leaves from mid-October; raking puts them on the heap, and it doesn’t ask again that autumn', () => {
    const sim = game(rich);
    to(sim, 10, 1);
    expect(card(sim, 'leaves')).toBeNull();
    to(sim, 10, 15);
    expect(card(sim, 'leaves')).not.toBeNull();
    const heap = () => sim.snapshot().nodes.find((n) => n.id === 'heap')!.stocks.waste?.amount ?? 0, was = heap();
    expect(answer(sim, 'leaves', 'rake').rejected).toBeNull();
    expect(heap() - was).toBeCloseTo(25, 6);
    expect(card(sim, 'leaves')).toBeNull();
    to(sim, 11, 20);
    expect(card(sim, 'leaves')).toBeNull();
  });

  it('offers a cordon in bare-root season, plants it on the fence, asks again after three weeks, and stops at the fence’s room', () => {
    const sim = game(rich);
    expect(sim.apply({type: 'buy', id: 'cordon'}).rejected).not.toBeNull();
    to(sim, 11, 2);
    const d = card(sim, 'bare-root')!;
    expect(d).not.toBeNull();
    const money = sim.snapshot().money;
    expect(sim.apply(d.actions[0]!.cmd).rejected).toBeNull();
    expect(sim.snapshot().money).toBeCloseTo(money - UPGRADES.cordon.price, 6);
    expect(sim.snapshot().nodes.find((n) => n.id === 'cordons')!.stocks['land.crops']!.amount).toBeCloseTo(CORDON.m2, 6);
    expect(card(sim, 'bare-root')).toBeNull();
    sim.apply({type: 'tick', hours: 24 * 20});
    expect(card(sim, 'bare-root')).toBeNull();
    sim.apply({type: 'tick', hours: 24 * 2});
    expect(card(sim, 'bare-root')).not.toBeNull();
    // the fence's room: past it the card and the shed stop
    for (let i = 1; i < CORDON.most; i++) expect(sim.apply({type: 'buy', id: 'cordon'}).rejected).toBeNull();
    expect(kitOf(sim).owned.filter((x) => x === 'cordon')).toHaveLength(CORDON.most);
    expect(card(sim, 'bare-root')).toBeNull();
    expect(sim.apply({type: 'buy', id: 'cordon'}).rejected).toMatch(/room/);
    // and out of season, none
    to(sim, 4, 2);
    expect(sim.snapshot().nodes.find((n) => n.id === 'shed')!.levers.kit).toMatchObject({bare: false});
  });

  it('asks in December whether to dig the empty beds over; digging turns up slugs, and either answer ends it for the winter', () => {
    for (const choice of ['dig', 'no-dig']) {
      const sim = game((s) => {
        rich(s);
        // bed 2 empty and plain: nothing in it to hold the card back
        s.graph.nodes['bed-2'].levers.sow = 'none';
      });
      to(sim, 12, 2);
      const bed = sim.snapshot().nodes.find((n) => n.kind === 'bed' && !n.levers.crop && (n.stocks['land.crops']?.amount ?? 0) > 0)!;
      expect(bed).toBeTruthy();
      const slugs = bed.stocks['pests.slugs']?.amount ?? 0;
      expect(card(sim, 'dig-over')).not.toBeNull();
      expect(answer(sim, 'dig-over', choice).rejected).toBeNull();
      const after = sim.snapshot().nodes.find((n) => n.id === bed.id)!.stocks['pests.slugs']?.amount ?? 0;
      if (choice === 'dig' && slugs > 1) expect(after).toBeLessThan(slugs);
      if (choice === 'no-dig') expect(after).toBeCloseTo(slugs, 9);
      expect(card(sim, 'dig-over')).toBeNull();
      to(sim, 1, 20);
      expect(card(sim, 'dig-over')).toBeNull();
    }
  });

  it('gives the glut card a button for each choice its words name', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks['food.lettuce'] = {unit: 'kgFood', amount: 8, product: 'lettuce'};
      s.graph.nodes.kitchen.levers.glut = 'preserve';
      s.seen = ['card.first-plan'];
    });
    for (let h = 0; h < 30; h++) sim.apply({type: 'tick', hours: 1});
    const d = card(sim, 'glut')!;
    expect(d.actions.map((a) => a.label)).toEqual(['Give it away', 'Sell at the box']);
    for (const a of d.actions) expect(d.text.toLowerCase()).toContain(a.label.toLowerCase());
    expect(sim.apply(d.actions[1]!.cmd).rejected).toBeNull();
    expect(card(sim, 'glut')).toBeNull();
  });
});

describe('the year’s card', () => {
  it('comes on the first anniversary, once, whether or not the offer is won', () => {
    const sim = game(rich);
    expect(sim.apply({type: 'card', id: 'first-year', answer: 'ok'}).rejected).toMatch(/isn’t done/);
    sim.apply({type: 'tick', hours: YEAR_HOURS - sim.snapshot().hours});
    expect(sim.snapshot().hours).toBeGreaterThanOrEqual(YEAR_HOURS);
    expect(sim.apply({type: 'card', id: 'first-year', answer: 'ok'}).rejected).toBeNull();
    expect(sim.snapshot().seen).toContain('card.first-year');
    expect(sim.apply({type: 'card', id: 'first-year', answer: 'ok'}).rejected).toMatch(/answered/);
  });
});

describe('the mid-priced kit', () => {
  it('raises the propagator’s crops from a packet: a third of a tray’s price', () => {
    const sim = game((s) => {
      rich(s);
      s.seen.push('shed.propagator');
    });
    const g = () => ({nodes: Object.fromEntries(sim.snapshot().nodes.map((n) => [n.id, n])), edges: [], rev: 0});
    expect(seedCost(g(), 'tomatoes', 2027)).toBeCloseTo(CROPS.tomatoes.seed, 9);
    expect(sim.apply({type: 'buy', id: 'propagator'}).rejected).toBeNull();
    expect(seedCost(g(), 'tomatoes', 2027)).toBeCloseTo(CROPS.tomatoes.seed * PROPAGATOR.share, 9);
    expect(seedCost(g(), 'potatoes', 2027)).toBeCloseTo(CROPS.potatoes.seed, 9);
  });

  it('brings a few more bees in May with the bee hotel', () => {
    const bees = (hotel: boolean) => {
      const sim = game((s) => {
        rich(s);
        if (hotel) s.graph.nodes.shed.levers.kit.owned = ['bee-hotel'];
      });
      to(sim, 5, 20);
      return (sim.snapshot().nodes.find((n) => n.id === 'lawn')!.levers.wildlife as {bees: number}).bees;
    };
    const without = bees(false), with_ = bees(true);
    expect(with_).toBeGreaterThan(without);
    expect(with_ - without).toBeLessThan(HOTEL.bees * 1.01);
  });

  it('keeps the purse’s week: a buy is money out and the last big spend', () => {
    const sim = game((s) => {
      rich(s);
      s.seen.push('shed.cloches');
    });
    expect(sim.apply({type: 'buy', id: 'cloches'}).rejected).toBeNull();
    const p = sim.snapshot().nodes.find((n) => n.id === 'kitchen')!.levers.purse as unknown as Purse;
    expect(p.now.out).toBeCloseTo(UPGRADES.cloches.price, 9);
    expect(p.big).toMatchObject({what: 'Cloches', gbp: UPGRADES.cloches.price});
    // the cloches went over a bed in the open
    expect(sim.snapshot().nodes.some((n) => n.kind === 'bed' && n.levers.cover === 'cloches')).toBe(true);
    // a week on, this week's tally starts again and last week's is kept
    sim.apply({type: 'tick', hours: 24 * 8});
    const q = sim.snapshot().nodes.find((n) => n.id === 'kitchen')!.levers.purse as unknown as Purse;
    expect(q.last).not.toBeNull();
  });

  it('points the goal bar at the Shed when the step is a thing to save for', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 30;
      s.seen = ['card.first-plan', 'garden.money', 'shed.hens'];
    });
    const step = nextStep(sim.snapshot(), 'output')!;
    expect(step.text).toMatch(/^Save for the hen house and three hens: £210 to go$/);
    expect(goOf(step)).toMatchObject({label: 'Open the Shed', tab: 'shed', shed: 'hens'});
    expect(goOf(null).tab).toBe('garden');
    expect(goOf({text: 'x', cmds: [{type: 'buy', id: 'hens'}]}).cmds).toHaveLength(1);
  });
});
