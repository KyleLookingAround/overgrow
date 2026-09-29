// The goal bar's next action and the gardener's "What helps", from the garden's own state: a plot to dig once every dug
// bed is in use, a winter crop for an empty autumn bed, the shed's answer to what slugs took; unused hours an invitation
// and a full day a reason for a tool.
import {describe, expect, it} from 'vitest';
import {createSim} from '../sim/index';
import {helpsFor} from './Explain';
import {nextAction} from './goal';

const game = (edit: (save: any) => void) => {
  const sim = createSim(1), save = JSON.parse(sim.save());
  edit(save);
  sim.apply({type: 'load', save: JSON.stringify(save)});
  return sim.snapshot();
};

describe('the next action', () => {
  it('digs the next plot once every dug bed is in use, naming a crop in season for it', () => {
    const snap = game((s) => {
      s.seen = ['garden.dig'];
      s.graph.nodes['bed-2'].levers.crop = {id: 'radish', sown: 0, dd: 10, eta: 0, etc: 0, need: 0, got: 0, made: 0, ks: 1, hurt: 0, lost: 0};
    });
    expect(nextAction(snap, 'output')).toMatch(/^Dig bed 3 and sow [a-z ]+$/);
    expect(nextAction({...snap, seen: []}, 'output')).toBeNull();
  });

  it('asks for the beer traps when slugs have taken a good share of a crop', () => {
    const snap = game((s) => {
      s.seen = ['shed.beer-trap'];
      s.graph.nodes['bed-1'].levers.crop.lost = 0.2;
      s.graph.nodes['bed-2'].levers.crop = {id: 'radish', sown: 0, dd: 10, eta: 0, etc: 0, need: 0, got: 0, made: 0, ks: 1, hurt: 0, lost: 0};
    });
    expect(nextAction(snap, 'output')).toBe('Buy the beer traps: slugs took 20 % of the salad leaves');
  });

  it('sows a winter crop in an empty autumn bed once winter crops have come up', () => {
    const snap = game((s) => {
      s.seen = ['garden.winter'];
      s.hours = 24 * 200; // early October
      s.graph.nodes['bed-2'].levers.sow = 'none';
    });
    expect(nextAction(snap, 'reliability')).toBe('Sow a winter crop in bed 2');
    expect(nextAction(snap, 'health')).toBe('Sow a green manure in bed 2');
  });
});

describe('what helps with the gardener’s time', () => {
  const log = (unused: number) => ({at: () => [{cause: 'work', total: 20}, ...(unused ? [{cause: 'unused', total: unused}] : [])] as never});
  it('reads unused hours as room to grow, and a full week as a reason for a tool', () => {
    expect(helpsFor('unused', log(14))).toMatch(/2 h a day go unused: room to dig another bed/);
    expect(helpsFor('work', log(0))).toMatch(/A full day/);
    expect(helpsFor('work', log(3))).toBeNull();
    expect(helpsFor('slugs', log(14))).toBeNull();
  });
});
