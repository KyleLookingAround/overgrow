import {describe, expect, it} from 'vitest';
import {LEVELS} from '../data/ladder';
import {calendar, hoursPerSecond, runStep, systemRng, ticksCrossed, type System, type Tick} from './clock';
import {gardenGraph} from './state';

describe('clock', () => {
  it('starts at 06:00 on Monday 15 March, year 1', () => {
    expect(calendar(0)).toMatchObject({year: 1, month: 3, day: 15, weekday: 0, hour: 6, minute: 0, dayIndex: 0, season: 'spring'});
    expect(calendar(18)).toMatchObject({day: 16, hour: 0, dayIndex: 1, weekday: 1});
    expect(calendar(365 * 24)).toMatchObject({year: 1, month: 3, day: 14}); // 2028 is a leap year
    expect(calendar(366 * 24)).toMatchObject({year: 2, month: 3, day: 15, hour: 6});
  });

  it("runs the garden at two hours a real second at 1× (a year in about 73 minutes), and each level at the ladder's rate", () => {
    expect(hoursPerSecond(1, 1)).toBe(2);
    expect(hoursPerSecond(1, 4)).toBe(8);
    expect(hoursPerSecond(1, 8)).toBe(16);
    expect((365 * 24) / hoursPerSecond(1, 1) / 60).toBeCloseTo(73, 0);
    expect(hoursPerSecond(1, 0)).toBe(0);
    expect(hoursPerSecond(3, 1)).toBe(24);
    expect(LEVELS.map((l) => l.stepHours).slice(0, 3)).toEqual([1, 1, 24]);
  });

  it('fires each tick as often as the calendar says over a game year of hourly steps', () => {
    const count: Record<string, number> = {}, hours = 366 * 24; // to 06:00 on 15 March 2028, a leap year
    for (let h = 0; h < hours; h++) for (const t of ticksCrossed(h, h + 1)) count[t] = (count[t] ?? 0) + 1;
    expect(count).toEqual({hour: hours, day: 366, week: 52, season: 4, year: 1});
  });

  it('fires day ticks once per step when a step is a day', () => {
    let days = 0;
    for (let h = 0; h < 365 * 24; h += 24) if (ticksCrossed(h, h + 24).includes('day')) days++;
    expect(days).toBe(365);
  });

  it('calls subscribed systems in list order, tick by tick, each with its own dice', () => {
    const calls: string[] = [];
    const sys = (name: string, ticks: Tick[]): System => ({name, on: Object.fromEntries(ticks.map((t) => [t, () => void calls.push(`${name}:${t}`)]))});
    const base = {dt: 1, level: 1, graph: gardenGraph(), flow: () => null, activity: () => {}};
    runStep([sys('a', ['hour', 'day']), sys('b', ['day'])], base, 1, 17); // 23:00 → midnight
    expect(calls).toEqual(['a:hour', 'a:day', 'b:day']);
    expect(systemRng(1, 'a', 'day', 18).next()).toBe(systemRng(1, 'a', 'day', 18).next());
    expect(systemRng(1, 'a', 'day', 18).next()).not.toBe(systemRng(1, 'b', 'day', 18).next());
    expect(systemRng(1, 'a', 'day', 18).next()).not.toBe(systemRng(2, 'a', 'day', 18).next());
  });
});
