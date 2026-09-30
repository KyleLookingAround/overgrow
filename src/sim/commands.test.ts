import {describe, expect, it} from 'vitest';
import type {System} from './clock';
import {createSim} from './index';

describe('commands', () => {
  it('sets the speed, and refuses one that isn’t on the dial', () => {
    const sim = createSim(1);
    expect(sim.apply({type: 'speed', speed: 4}).speed).toBe(4);
    expect(sim.apply({type: 'speed', speed: 0}).speed).toBe(0);
    expect(sim.apply({type: 'speed', speed: 3 as 4}).rejected).toMatch(/no speed/);
  });

  it('ticks whole steps only', () => {
    const sim = createSim(1);
    expect(sim.apply({type: 'tick', hours: 2.5}).hours).toBe(2);
  });

  it('sets a lever a system declared, lets the system refuse, and refuses one nobody declared', () => {
    const watering: System = {
      name: 'watering',
      on: {},
      command: (cmd) => (cmd.type === 'plan' && cmd.lever === 'water-below' ? (typeof cmd.value === 'number' && cmd.value >= 0 && cmd.value <= 1 ? null : 'a moisture from 0 to 1') : undefined),
    };
    const sim = createSim(1, [watering]);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'water-below', value: 0.3}).rejected).toMatch(/no plan lever/);
    // a system declares a lever by giving the node a default; here the test does it through a save
    const save = JSON.parse(sim.save());
    save.graph.nodes['bed-1'].levers['water-below'] = 0.4;
    sim.apply({type: 'load', save: JSON.stringify(save)});
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'water-below', value: 0.3}).nodes.find((n) => n.id === 'bed-1')!.levers['water-below']).toBe(0.3);
    expect(sim.apply({type: 'plan', node: 'bed-1', lever: 'water-below', value: 2}).rejected).toBe('a moisture from 0 to 1');
    expect(sim.snapshot().nodes.find((n) => n.id === 'bed-1')!.levers['water-below']).toBe(0.3);
    expect(sim.apply({type: 'plan', node: 'nowhere', lever: 'x', value: 1}).rejected).toMatch(/no node/);
  });

  it('refuses a buy before its offer unfolds and one nobody sells, and records one a system carries out', () => {
    const shed: System = {name: 'shed', on: {}, command: (cmd) => (cmd.type === 'buy' && cmd.id === 'hose' ? null : undefined)};
    const sim = createSim(1, [shed]);
    expect(sim.apply({type: 'buy', id: 'hose'}).rejected).toMatch(/isn’t offering/);
    const save = JSON.parse(sim.save());
    save.seen = ['shed.hose'];
    sim.apply({type: 'load', save: JSON.stringify(save)});
    expect(sim.apply({type: 'buy', id: 'tractor'}).rejected).toMatch(/isn’t offering/);
    expect(sim.apply({type: 'buy', id: 'hose'}).rejected).toBeNull();
    expect(JSON.parse(sim.save()).upgrades).toEqual(['hose']);
  });
});

describe('unfolding and the cards', () => {
  it('refuses a hidden lever’s command until its key unfolds, and opens it after', () => {
    const sim = createSim(1);
    expect(sim.snapshot().seen).toEqual([]);
    expect(sim.apply({type: 'plan', node: 'gardener', lever: 'waterBelow', value: 0.75}).rejected).toMatch(/hasn’t come up/);
    // the gardener waters the first sowing in on the first morning
    for (let h = 0; h < 4 && !sim.snapshot().seen.includes('garden.water'); h++) sim.apply({type: 'tick', hours: 1});
    expect(sim.snapshot().seen).toContain('garden.water');
    expect(sim.apply({type: 'plan', node: 'gardener', lever: 'waterBelow', value: 0.75}).rejected).toBeNull();
  });

  it('shows everything with the details setting, but opens no lever: the setting shows numbers, not powers', () => {
    const sim = createSim(1);
    expect(sim.apply({type: 'setting', key: 'details', value: true}).rejected).toBeNull();
    expect(JSON.parse(sim.save()).settings).toEqual({details: true});
    expect(sim.apply({type: 'plan', node: 'gardener', lever: 'waterBelow', value: 0.75}).rejected).toMatch(/hasn’t come up/);
    expect(sim.apply({type: 'setting', key: 'cheats', value: true}).rejected).toMatch(/no setting/);
    expect(sim.apply({type: 'setting', key: 'details', value: 3}).rejected).toMatch(/true or false/);
    // and it carries over to a new game
    expect(JSON.parse((sim.apply({type: 'new-game', seed: 2}), sim.save())).settings).toEqual({details: true});
  });

  it('answers the first plan card once: accept keeps radishes in bed 2, choose lets the gardener rotate; either starts the clock', () => {
    const a = createSim(1);
    a.apply({type: 'speed', speed: 0});
    const s = a.apply({type: 'card', id: 'first-plan', answer: 'accept'});
    expect([s.rejected, s.speed, s.seen]).toEqual([null, 1, ['card.first-plan']]);
    expect(s.nodes.find((n) => n.id === 'bed-2')!.levers.sow).toBe('radish');
    expect(a.apply({type: 'card', id: 'first-plan', answer: 'choose'}).rejected).toMatch(/answered/);
    const b = createSim(1);
    expect(b.apply({type: 'card', id: 'first-plan', answer: 'choose'}).nodes.find((n) => n.id === 'bed-2')!.levers.sow).toBe('rotation');
    // starting the clock another way keeps the card's plan, and once the clock has moved the card can't be answered
    const c = createSim(1);
    expect(c.apply({type: 'speed', speed: 1}).seen).toEqual(['card.first-plan']);
    const d = createSim(1);
    d.apply({type: 'tick', hours: 1});
    expect(d.apply({type: 'card', id: 'first-plan', answer: 'choose'}).rejected).toMatch(/under way/);
  });

  it('answers the try-faster nudge once, by its buttons or by any faster speed', () => {
    const a = createSim(1);
    expect(a.apply({type: 'card', id: 'try-faster', answer: 'yes'}).speed).toBe(2);
    expect(a.snapshot().seen).toContain('card.try-faster');
    const b = createSim(1);
    b.apply({type: 'tick', hours: 1});
    b.apply({type: 'speed', speed: 4});
    expect(b.snapshot().seen).toContain('card.try-faster');
    expect(b.apply({type: 'card', id: 'try-faster', answer: 'no'}).rejected).toMatch(/answered/);
  });

  it('unfolds the keys a tick reaches together in one batch', () => {
    // compost spread on a bed is the first carbon choice and the first feeding at once, and the shop's footprint comes
    // beside the dial
    const sim = createSim(1), before = sim.snapshot().seen.length;
    let s = sim.snapshot();
    for (let d = 0; d < 24 * 150 && !s.seen.includes('garden.carbon'); d++) s = sim.apply({type: 'tick', hours: 1});
    const i = s.seen.indexOf('garden.soil');
    expect(before).toBe(0);
    expect(i).toBeGreaterThan(0);
    expect(s.seen.slice(i)).toEqual(['garden.soil', 'garden.carbon', 'household.footprint', 'shed.compost-bin', 'shed.coop']);
  });
});
