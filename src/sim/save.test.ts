import {describe, expect, it} from 'vitest';
import {churn} from './churn';
import {createSim} from './index';
import {fromSave, migrate, SAVE_VERSION, SaveError, toSave} from './save';

describe('save', () => {
  it('round-trips a game, the generator included', () => {
    const sim = createSim(11, [churn]);
    sim.apply({type: 'speed', speed: 0});
    sim.apply({type: 'tick', hours: 100});
    const text = sim.save(), state = fromSave(text);
    expect(JSON.parse(text).version).toBe(SAVE_VERSION);
    expect(toSave(state)).toBe(text);
    expect(state.hours).toBe(100);
    expect(state.speed).toBe(0);
    const again = createSim(1, [churn]);
    again.apply({type: 'load', save: text});
    expect(again.apply({type: 'tick', hours: 50})).toEqual(sim.apply({type: 'tick', hours: 50}));
  });

  it('runs the migration chain one step at a time', () => {
    const steps = {
      1: (s: Record<string, unknown>) => ({...s, beds: 6}),
      2: (s: Record<string, unknown>) => ({...s, beds: (s.beds as number) + 1, hens: 3}),
    };
    expect(migrate({version: 1, seed: 1}, steps, 3)).toEqual({version: 3, seed: 1, beds: 7, hens: 3});
    expect(migrate({version: 2, beds: 1}, steps, 3)).toEqual({version: 3, beds: 2, hens: 3});
    expect(() => migrate({version: 1}, {1: steps[1]}, 3)).toThrow(/earlier build/);
    expect(migrate({version: SAVE_VERSION, seed: 1})).toEqual({version: SAVE_VERSION, seed: 1}); // this build's chain
  });

  it('refuses a save from an earlier build before the first release, so the page starts a new game', () => {
    // no compatibility before the first release (docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md)
    const old = JSON.parse(createSim(21).save());
    old.version = SAVE_VERSION - 1;
    expect(() => fromSave(JSON.stringify(old))).toThrow(/earlier build/);
    const sim = createSim(1);
    expect(sim.apply({type: 'load', save: JSON.stringify(old)}).rejected).toMatch(/can't be read/);
  });

  it('saves the plan, the crops, the gardener’s day and the kitchen, and plays on from them exactly', () => {
    const sim = createSim(5);
    sim.apply({type: 'plan', node: 'bed-2', lever: 'sow', value: 'lettuce'});
    sim.apply({type: 'tick', hours: 24 * 40 + 3});
    const text = sim.save(), again = createSim(1);
    again.apply({type: 'load', save: text});
    const bed = again.snapshot().nodes.find((n) => n.id === 'bed-2')!;
    expect((bed.levers.crop as {id: string}).id).toBe('lettuce');
    expect(again.apply({type: 'tick', hours: 24 * 30})).toEqual(sim.apply({type: 'tick', hours: 24 * 30}));
  });

  it('refuses a save it can’t read, and leaves the game as it was', () => {
    for (const bad of ['{', '[]', '{"seed":1}', JSON.stringify({version: SAVE_VERSION + 1})]) expect(() => fromSave(bad)).toThrow(SaveError);
    const good = JSON.parse(createSim(1).save());
    delete good.graph.nodes.shed.stocks.carbon;
    expect(() => fromSave(JSON.stringify(good))).toThrow(/carbon/);
    const sim = createSim(1);
    sim.apply({type: 'tick', hours: 3});
    const s = sim.apply({type: 'load', save: '{'});
    expect(s.rejected).toMatch(/can't be read/);
    expect(s.hours).toBe(3);
  });
});
