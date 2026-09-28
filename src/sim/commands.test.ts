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

  it('refuses an upgrade nobody sells, and records one a system carries out', () => {
    const shed: System = {name: 'shed', on: {}, command: (cmd) => (cmd.type === 'upgrade' && cmd.id === 'hose' ? null : undefined)};
    const sim = createSim(1, [shed]);
    expect(sim.apply({type: 'upgrade', id: 'tractor'}).rejected).toMatch(/no upgrade/);
    expect(sim.apply({type: 'upgrade', id: 'hose'}).rejected).toBeNull();
    expect(JSON.parse(sim.save()).upgrades).toEqual(['hose']);
  });
});
