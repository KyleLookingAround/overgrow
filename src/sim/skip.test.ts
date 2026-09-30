// Skips (src/sim/skip.ts; docs/specs/one-map.md, item 7): the sim's foresight offers what's next at least a day off and
// at most a fortnight; a skip runs the same hours watching would, so it ends where a watched stretch does; it stops at its
// hour or at the first wake; and it's never saved.
import {describe, expect, it} from 'vitest';
import {SKIP} from '../data/ladder';
import {createSim} from './index';
import {fromSave, toSave} from './save';
import type {Snapshot} from './state';
import {WAKES} from './skip';

/** A game on its way, the first plan accepted, some days in. */
function started(seed: number, days = 10) {
  const sim = createSim(seed);
  sim.apply({type: 'card', id: 'first-plan', answer: 'accept'});
  sim.apply({type: 'tick', hours: 24 * days});
  return sim;
}
/** Ticks a day at a time until something is offered. */
function untilDue(sim: ReturnType<typeof createSim>): Snapshot {
  let s = sim.snapshot();
  for (let i = 0; i < 200 && !s.due; i++) s = sim.apply({type: 'tick', hours: 24});
  expect(s.due).not.toBeNull();
  return s;
}
/** What a watched game and a skipped one must agree on: everything but the skip and its line. */
const game = (s: Snapshot) => ({...s, skip: null, woke: null, seen: s.seen.filter((k) => k !== 'card.skip')});

describe('skips', () => {
  it('offers what’s next at least a day off and at most a fortnight, and a reason', () => {
    const sim = started(1, 2);
    let offered = 0;
    for (let d = 0; d < 120; d++) {
      const s = sim.apply({type: 'tick', hours: 24});
      if (!s.due) continue;
      offered++;
      expect(s.due.hours).toBeGreaterThanOrEqual(s.hours + 24);
      expect(s.due.hours).toBeLessThanOrEqual(s.hours + 24 * (SKIP.mostDays + 1));
      expect(s.due.why.length).toBeGreaterThan(3);
    }
    expect(offered).toBeGreaterThan(10);
  });

  it('runs every hour as watching would: a skipped stretch ends where a watched one does', () => {
    const watched = started(3), skipped = started(3);
    const s = untilDue(skipped);
    untilDue(watched);
    const until = s.due!.hours, run = skipped.apply({type: 'skip', until});
    expect(run.rejected).toBeNull();
    expect(run.skip).toEqual({until, why: s.due!.why});
    expect(run.seen).toContain('card.skip');
    let a = watched.snapshot(), b = run;
    while (b.hours < until) {
      a = watched.apply({type: 'tick', hours: 3});
      b = skipped.apply({type: 'tick', hours: 3});
      expect(game(b)).toEqual(game(a));
    }
    expect(b.skip).toBeNull();
  });

  it('ends at its hour or at the first wake: a thing the player would act on, or something new', () => {
    let wakes = 0, ends = 0;
    for (const seed of [1, 2]) {
      const sim = started(seed, 1);
      let s = sim.snapshot();
      while (s.hours < 24 * 365) {
        if (!s.skip && s.due) s = sim.apply({type: 'skip', until: s.due.hours});
        const until = s.skip?.until, seen = s.seen.length;
        s = sim.apply({type: 'tick', hours: s.skip ? 1 : 24});
        if (until === undefined || s.skip) continue;
        ends++;
        // woken early only by what wakes one, and said why
        const woke = s.effects.some((e) => e.amount > 0 && WAKES.has(e.cause)) || s.seen.length > seen || s.woke === 'frost forecast';
        expect(s.hours >= until || (woke && s.woke !== null)).toBe(true);
        if (s.hours < until) wakes++;
      }
    }
    expect(ends).toBeGreaterThan(20);
    expect(wakes).toBeGreaterThan(0);
  });

  it('refuses a skip past what’s next or with nothing to skip to, and stops when asked', () => {
    const sim = started(1, 2), s = untilDue(sim);
    // asked from a snapshot a step behind, past what's next, it runs to what's next
    expect(sim.apply({type: 'skip', until: s.due!.hours + 1}).skip?.until).toBe(s.due!.hours);
    sim.apply({type: 'skip', until: null});
    expect(sim.apply({type: 'skip', until: s.hours}).rejected).toMatch(/what’s next/);
    expect(sim.apply({type: 'skip', until: s.due!.hours}).skip).not.toBeNull();
    expect(sim.apply({type: 'skip', until: null}).skip).toBeNull();
    // the first morning in March, a frost forecast or not, never offers a skip past a fortnight
    const fresh = createSim(1).snapshot();
    if (fresh.due) expect(fresh.due.hours - fresh.hours).toBeLessThanOrEqual(24 * (SKIP.mostDays + 1));
  });

  it('isn’t saved: a save taken during one keeps the hour reached', () => {
    const sim = started(1, 2), s = untilDue(sim);
    sim.apply({type: 'skip', until: s.due!.hours});
    sim.apply({type: 'tick', hours: 5});
    const text = sim.save(), back = fromSave(text);
    expect(JSON.parse(text).skip).toBeUndefined();
    expect(back.skip).toBeNull();
    expect(back.hours).toBe(sim.snapshot().hours);
    expect(toSave(back)).toBe(text);
  });
});
