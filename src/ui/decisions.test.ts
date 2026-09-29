// The bed card and the week's decisions: an empty bed asks what's next with the rotation's pick and stops asking once
// the player has said; a glut asks once and its answer is the kitchen's policy; the catalogue opens in December and its
// order covers next year's seed; a forecast frost with tender crops up asks for fleece; each asks once for what it's about.
import {describe, expect, it} from 'vitest';
import {createSim, type Command} from '../sim/index';
import {calendar} from '../sim/clock';
import {bedCardOf} from './bed-card';
import {decisionsOf} from './decisions';

/** A game from seed 1 carried on from an edited save. */
function game(edit: (save: any) => void) {
  const sim = createSim(1), save = JSON.parse(sim.save());
  edit(save);
  expect(sim.apply({type: 'load', save: JSON.stringify(save)}).rejected).toBeNull();
  return sim;
}
const dugBed3 = (save: any) => {
  const b = save.graph.nodes['bed-3'];
  b.stocks['land.crops'] = b.stocks['land.grass'];
  b.stocks['land.grass'] = {unit: 'm2', amount: 0};
};

describe('the bed card', () => {
  it('asks what goes in an empty bed, suggests the rotation’s pick, and stops once the player has said', () => {
    const sim = game((s) => {
      dugBed3(s);
      s.seen = ['card.first-plan'];
    });
    const card = bedCardOf(sim.snapshot())!;
    expect(card.bed).toBe('bed-3');
    expect(card.text).toMatch(/Bed 3 is empty\. Sow .* \(the rotation’s pick\)\?/);
    // one tap sows it: the bed isn't idle any more
    for (const c of card.actions[0]!.cmds) expect(sim.apply(c).rejected).toBeNull();
    expect(bedCardOf(sim.snapshot())).toBeNull();
    // closing it leaves the bed empty at the player's say
    const other = game((s) => dugBed3(s));
    for (const c of bedCardOf(other.snapshot())!.dismiss) expect(other.apply(c).rejected).toBeNull();
    expect(bedCardOf(other.snapshot())).toBeNull();
  });
});

describe('the week’s decisions', () => {
  it('asks once about a glut, and the answer is the kitchen’s policy', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks['food.lettuce'] = {unit: 'kgFood', amount: 8, product: 'lettuce'};
      s.seen = ['card.first-plan'];
    });
    for (let h = 0; h < 30; h++) sim.apply({type: 'tick', hours: 1});
    const d = decisionsOf(sim.snapshot()).find((x) => x.id === 'glut')!;
    expect(d).toBeTruthy();
    const preserve = d.actions.find((a) => (a.cmd as {answer: string}).answer === 'preserve')!.cmd;
    expect(sim.apply(preserve).rejected).toBeNull();
    expect(sim.snapshot().nodes.find((n) => n.id === 'kitchen')!.levers.glut).toBe('preserve');
    expect(decisionsOf(sim.snapshot()).some((x) => x.id === 'glut')).toBe(false);
    // the next glut goes into the freezer, not to the box
    const save = JSON.parse(sim.save());
    save.graph.nodes.kitchen.stocks['food.lettuce'] = {unit: 'kgFood', amount: 8, product: 'lettuce'};
    sim.apply({type: 'load', save: JSON.stringify(save)});
    for (let h = 0; h < 48; h++) sim.apply({type: 'tick', hours: 1});
    expect(sim.snapshot().kitchen!.preserved).toBeGreaterThan(3);
  });

  it('opens the seed catalogue in December; the order is paid now and next year’s sowings cost nothing', () => {
    const sim = game((s) => {
      s.graph.nodes.kitchen.stocks.money.amount = 200;
      s.seen = ['card.first-plan', 'garden.money'];
    });
    expect(decisionsOf(sim.snapshot()).some((x) => x.id === 'catalogue')).toBe(false);
    // on to December
    while (calendar(sim.snapshot().hours).month !== 12) sim.apply({type: 'tick', hours: 24});
    const d = decisionsOf(sim.snapshot()).find((x) => x.id === 'catalogue')!;
    const money = sim.snapshot().money, cmd = d.actions[0]!.cmd;
    expect(sim.apply(cmd).rejected).toBeNull();
    expect(sim.snapshot().money).toBeLessThan(money);
    expect(decisionsOf(sim.snapshot()).some((x) => x.id === 'catalogue')).toBe(false);
    // and again is refused: next year's is ordered
    expect(sim.apply(cmd).rejected).not.toBeNull();
  });

  it('warns of a forecast frost with tender crops up in the open, and the fleece keeps it off', () => {
    const sim = game((s) => {
      s.graph.nodes['bed-2'].levers.crop = {id: 'potatoes', sown: -24 * 20, dd: 200, eta: 0, etc: 0, need: 0.2, got: 0.2, made: 0, ks: 1, hurt: 0, lost: 0};
      s.graph.nodes.kitchen.stocks.money.amount = 50;
    });
    // find a morning whose forecast says frost tonight
    let d = null;
    for (let h = 0; h < 24 * 60 && !d; h++) {
      sim.apply({type: 'tick', hours: 1});
      d = decisionsOf(sim.snapshot()).find((x) => x.id === 'frost') ?? null;
    }
    expect(d).not.toBeNull();
    expect(sim.apply(d!.actions[0]!.cmd as Command).rejected).toBeNull();
    const bed = sim.snapshot().nodes.find((n) => n.id === 'bed-2')!;
    expect(bed.levers.fleece).toBeGreaterThan(sim.snapshot().hours);
    expect(decisionsOf(sim.snapshot()).some((x) => x.id === 'frost')).toBe(false);
  });
});
