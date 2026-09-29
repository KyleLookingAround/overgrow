import {describe, expect, it} from 'vitest';
import {churn} from './churn';
import {createSim} from './index';
import {fromSave, migrate, SAVE_VERSION, SaveError, toSave} from './save';
import {organicMatter, SOIL, specOf} from './models/soil';

/**
 * A save as part 1's build wrote it (version 1): the garden with no soil and no weather. Made from this build by taking
 * them away; checked byte for byte against a save written by part 1's build (#5) from the same seed and hours.
 */
function partOneSave(seed: number, hours: number): string {
  const sim = createSim(seed, []);
  sim.apply({type: 'speed', speed: 2});
  sim.apply({type: 'tick', hours});
  const s = JSON.parse(sim.save());
  s.version = 1;
  for (const n of Object.values<{id: string; stocks: Record<string, {amount: number}>; levers: Record<string, unknown>}>(s.graph.nodes)) {
    for (const k of Object.keys(n.stocks)) {
      if (k.startsWith('land.') || (n.id === 'butt' && k === 'water') || (n.id === 'kitchen' && k === 'money')) continue;
      if (k === 'carbon') n.stocks[k]!.amount = 0;
      else delete n.stocks[k];
    }
    delete n.levers.weather;
  }
  return JSON.stringify(s);
}

describe('save', () => {
  it('round-trips a game, the generator included', () => {
    const sim = createSim(11, [churn]);
    sim.apply({type: 'speed', speed: 2});
    sim.apply({type: 'tick', hours: 100});
    const text = sim.save(), state = fromSave(text);
    expect(JSON.parse(text).version).toBe(SAVE_VERSION);
    expect(toSave(state)).toBe(text);
    expect(state.hours).toBe(100);
    expect(state.speed).toBe(2);
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
    expect(() => migrate({version: 1}, {1: steps[1]}, 3)).toThrow(/no step/);
    expect(migrate({version: SAVE_VERSION, seed: 1})).toEqual({version: SAVE_VERSION, seed: 1}); // this build's chain
  });

  it('loads a save from part 1 and plays on, with the soils and the weather it lacked', () => {
    const old = partOneSave(21, 30), sim = createSim(1);
    expect(sim.apply({type: 'load', save: old}).rejected).toBeNull();
    const s = sim.snapshot(), bed = s.nodes.find((n) => n.id === 'bed-1')!, air = s.nodes.find((n) => n.id === 'atmosphere')!;
    expect(s.hours).toBe(30);
    expect(s.speed).toBe(2);
    for (const k of Object.values(SOIL)) expect(bed.stocks[k]!.amount).toBeGreaterThan(0);
    expect(organicMatter(bed)).toBeCloseTo(specOf('bed-1').organicMatter);
    expect(air.levers).toHaveProperty('weather', null);
    // it plays on: two months of the weather, water and soil with nothing refused
    for (let i = 0; i < 24 * 60; i++) expect(sim.apply({type: 'tick', hours: 1}).errors).toEqual([]);
    expect((sim.snapshot().nodes.find((n) => n.id === 'atmosphere')!.levers.weather as {day: number}).day).toBeGreaterThan(0);
    expect(JSON.parse(sim.save()).version).toBe(SAVE_VERSION);
    expect(sim.snapshot().nodes.find((n) => n.id === 'bed-1')!.stocks.water!.amount).toBeGreaterThan(0);
    // the saved stocks and weather come back exactly
    expect(fromSave(sim.save()).graph).toEqual(JSON.parse(sim.save()).graph);
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
