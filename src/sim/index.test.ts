import {describe, expect, it} from 'vitest';
import {churn} from './churn';
import {createSim} from './index';
import {SYSTEMS} from './systems';
import {parseGameTime, play} from '../../tools/bot/play';

/** The long headless runs' time limit: they check what the game does, not how fast (the budget test below does that), and a
 *  slow runner takes them past Vitest's 5 s default (two three-year bot runs take about 3 s on a fast machine). */
const LONG_RUN_MS = 30_000;

describe('sim', () => {
  it('plays a long headless run without errors and repeats it from the seed', () => {
    const play = () => {
      const sim = createSim(7);
      for (let i = 0; i < 24 * 365 * 2; i++) expect(sim.apply({type: 'tick', hours: 1}).errors).toEqual([]);
      return sim.snapshot();
    };
    const a = play(), b = play();
    expect(a).toEqual(b);
    expect(a.hours).toBe(24 * 365 * 2);
    // and the garden grows food all the while: picked, eaten, and a glut sold at the box
    expect(a.kitchen!.picked).toBeGreaterThan(40);
    expect(a.kitchen!.eaten).toBeGreaterThan(20);
    expect(a.kitchen!.sold).toBeGreaterThan(0);
  }, LONG_RUN_MS);

  it('crosses the step up with a player and plays the allotment on, without errors, repeating from the seed', () => {
    const run = () => play({seed: 7, hours: parseGameTime('3y')});
    const a = run(), b = run();
    expect(a.err).toEqual([]);
    expect(a.reached['step-up']).toBeGreaterThan(300);
    expect(a.allotment!.days).toBeGreaterThan(300);
    expect(a.allotment!.output).toBeGreaterThan(0.1);
    expect(b.play).toBe(a.play);
    expect(b.allotment).toEqual(a.allotment);
  }, LONG_RUN_MS);

  it('plays on exactly as it would have after a save and load mid-run', () => {
    const straight = createSim(7, [churn]), broken = createSim(7, [churn]);
    for (let i = 0; i < 24 * 200; i++) {
      straight.apply({type: 'tick', hours: 1});
      broken.apply({type: 'tick', hours: 1});
    }
    const text = broken.save(), resumed = createSim(99, [churn]);
    expect(resumed.apply({type: 'load', save: text}).rejected).toBeNull();
    for (let i = 0; i < 24 * 530; i++) {
      straight.apply({type: 'tick', hours: 1});
      resumed.apply({type: 'tick', hours: 1});
    }
    const a = straight.snapshot(), b = resumed.snapshot();
    expect(b).toEqual(a);
    expect(b.errors).toEqual([]);
    expect(b.activities.length).toBeGreaterThan(0);
  }, LONG_RUN_MS);

  it('starts a new game from a chosen seed, on the garden on day 1', () => {
    const sim = createSim(1);
    sim.apply({type: 'tick', hours: 5});
    const s = sim.apply({type: 'new-game', seed: 42});
    expect(s).toMatchObject({seed: 42, hours: 0, level: 1, step: 1, speed: 1, money: 20, carbon: 0});
    expect(s.nodes.filter((n) => n.kind === 'bed')).toHaveLength(6);
  });

  it('runs a garden day in well under the 2 ms budget, with the test system and with the game’s own', () => {
    for (const systems of [[churn], SYSTEMS]) {
      const sim = createSim(3, systems), days = 200;
      for (let i = 0; i < 24 * 20; i++) sim.apply({type: 'tick', hours: 1}); // warm up
      const t0 = performance.now();
      for (let i = 0; i < 24 * days; i++) sim.apply({type: 'tick', hours: 1});
      const perDay = (performance.now() - t0) / days;
      expect(perDay).toBeLessThan(2);
    }
  });

  it('copies again only the nodes that changed, and every snapshot matches the graph', () => {
    const sim = createSim(2);
    let before = sim.snapshot(), reused = 0;
    for (let h = 0; h < 24 * 60; h++) {
      if (h === 24 * 10) sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true});
      const snap = sim.apply({type: 'tick', hours: 1}), graph = JSON.parse(sim.save()).graph.nodes;
      for (const n of snap.nodes) expect(JSON.parse(JSON.stringify(n))).toEqual(graph[n.id]);
      reused += snap.nodes.filter((n, i) => n === before.nodes[i]).length;
      before = snap;
    }
    // most nodes don't change in most hours: the shed, the tap, the path, the gate, the household
    expect(reused).toBeGreaterThan(24 * 60 * 3);
  });
});
