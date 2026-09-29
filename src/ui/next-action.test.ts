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
  const log = (unused: number) => ({at: () => [{cause: 'work', total: 20, last: 1}, ...(unused ? [{cause: 'unused', total: 50, last: unused}] : [])] as never});
  it('reads unused hours as room to grow, and a full day as a reason for a tool', () => {
    expect(helpsFor('unused', log(2))).toMatch(/2 h went unused yesterday: room to dig another bed/);
    expect(helpsFor('work', log(0))).toMatch(/A full day/);
    expect(helpsFor('work', log(0.5))).toBeNull();
    expect(helpsFor('slugs', log(2))).toBeNull();
  });
});

describe('the plan’s consequences', () => {
  it('warns when a bed grows its last family again, and says what the slug policy costs and what pests took', async () => {
    const {rotationLine, slugLine} = await import('./GardenTab');
    const snap = game((s) => {
      s.graph.nodes['bed-1'].levers.history = ['brassica'];
      s.graph.nodes['bed-1'].levers.sow = 'radish';
      s.graph.nodes['bed-1'].levers.crop.lost = 0.1;
    });
    const bed = snap.nodes.find((n) => n.id === 'bed-1')!, beds = snap.nodes.filter((n) => n.id === 'bed-1' || n.id === 'bed-2');
    expect(rotationLine(bed)).toMatch(/^Same family as its last crop/);
    expect(rotationLine({...bed, levers: {...bed.levers, sow: 'rotation'}})).toMatch(/^Rotation/);
    expect(rotationLine({...bed, levers: {...bed.levers, sow: 'potatoes'}})).toBeNull();
    expect(slugLine('pick', beds, false)).toMatch(/^About 10 min at dusk on a damp evening; pests have taken 10 % of what’s growing$/);
    expect(slugLine('leave', beds, true)).toMatch(/^No time or money, and the beer traps catch some every night/);
  });
});
