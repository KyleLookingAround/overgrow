// The quiet night's rule (src/ui/quiet-night.ts): after dark with the gardener in bed until dawn and nothing live on the
// map it runs to 06:00; not by day, not paused, not with a slug out or a frost, and not at the levels that step by the day.
import {describe, expect, it} from 'vitest';
import {createSim} from '../sim/index';
import type {Snapshot} from '../sim/state';
import {quietUntil} from './quiet-night';

/** Seed 1 played on to a game hour, an hour a step, with the first plan kept. */
function at(hours: number): Snapshot {
  const sim = createSim(1);
  sim.apply({type: 'card', id: 'first-plan', answer: 'accept'});
  let s = sim.snapshot();
  while (s.hours < hours) s = sim.apply({type: 'tick', hours: 1});
  return s;
}

describe('the quiet night', () => {
  // 23:00 and 13:00 on day 280, in December when no slug is out (hour 0 is 06:00 on day 1)
  const night = 279 * 24 + 17, noon = 279 * 24 + 7;

  it('runs from bedtime to the next 06:00 when nothing is live', () => {
    const s = at(night), bed = s.activities.find((a) => a.who === 'gardener' && a.start <= night && a.end >= night);
    expect(bed?.doing).toBe('rest');
    expect(quietUntil(s, night, null)).toBe(280 * 24);
  });

  it('never by day, paused, or at a level that steps by the day', () => {
    expect(quietUntil(at(noon), noon, null)).toBeNull();
    // 07:00 on a December weekend: still dark and the gardener resting all day, but the night ended at 06:00
    const morning = 279 * 24 + 1, dawn = at(morning);
    expect(dawn.activities.some((a) => a.who === 'gardener' && a.doing === 'rest' && a.start <= morning && a.end >= 280 * 24)).toBe(true);
    expect(quietUntil(dawn, morning, null)).toBeNull();
    const s = at(night);
    expect(quietUntil({...s, speed: 0}, night, null)).toBeNull();
    expect(quietUntil({...s, level: 3}, night, null)).toBeNull();
  });

  it('hands back the moment a slug is out or a frost falls', () => {
    const s = at(night), bed = s.nodes.find((n) => n.kind === 'bed')!;
    const slugs = {...s, nodes: s.nodes.map((n) => (n === bed ? {...n, levers: {...n.levers, pests: {...(n.levers.pests as object), out: 3}}} : n))} as Snapshot;
    expect(quietUntil(slugs, night, null)).toBeNull();
    expect(quietUntil(s, night, {frost: 0.5} as never)).toBeNull();
  });
});
