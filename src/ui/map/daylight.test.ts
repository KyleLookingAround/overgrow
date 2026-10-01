// The steady light (src/ui/map/daylight.ts): the night cycles in the back garden, holds a steady light wherever a day is
// quicker (the allotment, a quiet night, the checks' fast clock), and never changes faster than LIGHT_MOST a second.
import {describe, expect, it} from 'vitest';
import {calendar} from '../../sim/clock';
import {darkness, daySeconds, LIGHT_MOST, SETTLE_S, STEADY_DAY_S, steadyLight} from './daylight';

const NIGHT = 0.35, FRAME = 1000 / 60;

// the night layer frame by frame for `seconds` at a speed, with the game's hours moving at that pace from `from`
function run(speed: number, seconds: number, from = 6) {
  const light = steadyLight(), out: number[] = [], rate = 24 / daySeconds(12, speed, false);
  for (let f = 0; f * FRAME <= seconds * 1000; f++) {
    const hours = from + (f * FRAME * rate) / 1000;
    out.push(light(darkness(calendar(hours)) * NIGHT, 0, daySeconds(12, speed, false), f * FRAME));
  }
  return out;
}
const most = (a: number[]) => Math.max(...a.slice(1).map((x, i) => Math.abs(x - a[i]!)));

describe('the steady light', () => {
  it('cycles in the back garden, holds on the checks\' fast clock, at the allotment and at every level above', () => {
    expect(daySeconds(12, 1, false)).toBeGreaterThanOrEqual(STEADY_DAY_S);
    expect(daySeconds(12, 2, false)).toBeLessThan(STEADY_DAY_S);
    expect(daySeconds(6, 1, false)).toBeLessThan(STEADY_DAY_S); // the allotment's widest view
    expect(daySeconds(12, 1, true)).toBeLessThan(STEADY_DAY_S); // a quiet night passes four times faster
    expect(daySeconds(12, 0, false)).toBe(Infinity);
  });

  it('lets the night fall at 1×', () => {
    const a = run(1, 24); // two game days from 06:00
    expect(Math.max(...a)).toBeGreaterThan(NIGHT * 0.95);
    expect(Math.min(...a.slice(60))).toBeLessThan(0.01);
    expect(most(a)).toBeLessThanOrEqual(LIGHT_MOST * (FRAME / 1000) + 1e-9);
  });

  it('holds daylight at 16× through two game days, however dark the hours', () => {
    const a = run(16, 1.5);
    expect(Math.max(...a)).toBeLessThan(0.02);
  });

  it('eases from night to a held day at no more than the limit', () => {
    const light = steadyLight();
    light(NIGHT, 0, Infinity, 0); // paused at midnight: full night at once, the first frame
    const a = [NIGHT];
    for (let t = FRAME; t < 4000; t += FRAME) a.push(light(NIGHT, 0, daySeconds(12, 16, false), t));
    expect(a[a.length - 1]).toBe(0);
    expect(most(a)).toBeLessThanOrEqual(LIGHT_MOST * (FRAME / 1000) + 1e-9);
    expect(a.findIndex((x) => x === 0) * FRAME).toBeGreaterThan((NIGHT / LIGHT_MOST) * 1000 - 50); // at least 1¾ s
  });

  it('darkens to a quiet night\'s dim only once it has lasted a second', () => {
    const light = steadyLight(), quiet = daySeconds(12, 1, true);
    light(0, 0, Infinity, 0);
    const a = [0];
    for (let t = FRAME; t < 3000; t += FRAME) a.push(light(NIGHT, 0.3, quiet, t));
    expect(a[Math.floor(SETTLE_S * 1000 / FRAME) - 2]).toBe(0);
    expect(a[a.length - 1]).toBeCloseTo(0.3);
  });

  it('never jumps on a long gap between frames', () => {
    const light = steadyLight();
    light(0, 0, Infinity, 0);
    expect(light(NIGHT, 0, Infinity, 60_000)).toBeLessThanOrEqual(LIGHT_MOST * 0.25 + 1e-9);
  });

  it('skips a quiet night too short to dim for', () => {
    const light = steadyLight(), day = daySeconds(12, 16, false), quiet = daySeconds(12, 16, true);
    let t = 0, top = 0;
    for (let d = 0; d < 6; d++) {
      for (let i = 0; i < 80; i++, t += FRAME) top = Math.max(top, light(0, 0, day, t)); // about 1.3 s of day
      for (let i = 0; i < 12; i++, t += FRAME) top = Math.max(top, light(NIGHT, 0.3, quiet, t)); // a fifth of a second of quiet night
    }
    expect(top).toBe(0);
  });
});
