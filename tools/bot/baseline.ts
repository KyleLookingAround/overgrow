// The baselines (tools/baseline.json) and the table the bot prints against them. Each row is a milestone (its game
// day) or a measure of the run (the sealed garden's totals, money over time, food wasted, carbon); each has a range,
// and a value is `ok` inside it, `near` within 15 % beyond it, and `off` further out (the `balance` playbook). A row
// without a range is shown with its values and no verdict.
import {MILESTONES} from './milestones';
import type {Run} from './play';

export interface Range {
  /** Either end may be missing: "by day 8" has only a max. */
  min?: number;
  max?: number;
  unit: string;
  /** Where the range comes from: the spec's target, or the seeds it was set from. */
  why?: string;
}

export interface Baseline {
  /** "proposed" until the owner agrees them (the founding spec, "Balance"), then "agreed". */
  status: 'proposed' | 'agreed';
  about: string;
  /** The game time the ranges are for, as `npm run bot` takes it. */
  gameTime: string;
  seeds: number[];
  ranges: Record<string, Range>;
}

export type Verdict = 'ok' | 'near' | 'off' | '';

/** How far beyond a range still counts as near. */
export const NEAR = 0.15;

export function verdict(v: number | undefined, r: Range | undefined): Verdict {
  if (!r) return '';
  // not reached within the run: later than any day, so fine for a range with no end, off for one that has one
  if (v === undefined) return r.max === undefined ? 'ok' : 'off';
  const lo = r.min ?? -Infinity, hi = r.max ?? Infinity;
  if (v >= lo && v <= hi) return 'ok';
  if (v >= lo - NEAR * Math.abs(lo) && v <= hi + NEAR * Math.abs(hi)) return 'near';
  return 'off';
}

/** Days money is shown at: money over time. */
export const MONEY_DAYS = [30, 60, 90, 120];

export interface Row {
  id: string;
  label: string;
  unit: string;
  /** Rounded for the table. */
  digits: number;
}

/** The rows of the table, in order: the milestones this build has, then the measures. */
export function rows(): Row[] {
  return [
    ...MILESTONES.filter((m) => m.reached).map((m) => ({id: m.id, label: m.label, unit: 'day', digits: 0})),
    {id: 'output', label: 'Output, last 28 days', unit: 'kg/day', digits: 2},
    {id: 'reliability', label: 'Reliability, last 28 days', unit: '0–100', digits: 0},
    {id: 'health', label: 'Health, last 28 days', unit: '0–100', digits: 0},
    ...MONEY_DAYS.map((d) => ({id: `money-${d}`, label: `Money on day ${d}`, unit: '£', digits: 2})),
    {id: 'wasted', label: 'Food wasted', unit: 'kg', digits: 1},
    {id: 'carbon', label: 'Carbon into the air', unit: 'kg CO₂e', digits: 1},
  ];
}

/** A run's value for each row; a milestone not reached, or a day the run didn't get to, is missing. */
export function valuesOf(run: Run): Record<string, number | undefined> {
  const money = (d: number) => run.days.find((x) => x.day === d)?.money;
  return {
    ...run.reached,
    output: run.sealed.output, reliability: run.sealed.reliability, health: run.sealed.health,
    ...Object.fromEntries(MONEY_DAYS.map((d) => [`money-${d}`, money(d)])),
    wasted: run.wasted, carbon: run.carbon,
  };
}

const fmt = (v: number | undefined, digits: number) => (v === undefined ? '—' : v.toFixed(digits));
const fmtRange = (r: Range | undefined, digits: number) =>
  !r ? '' : r.min !== undefined && r.max !== undefined ? `${r.min.toFixed(digits)}–${r.max.toFixed(digits)}` : r.max !== undefined ? `≤ ${r.max.toFixed(digits)}` : `≥ ${r.min!.toFixed(digits)}`;

/** The table against the baselines: a row per milestone and measure, a column per seed, and their mean. */
export function table(runs: readonly Run[], base: Baseline | null, format: 'text' | 'markdown'): string {
  const head = ['milestone or measure', 'unit', `baseline${base ? ` (${base.status})` : ''}`, ...runs.map((r) => `seed ${r.seed}`), 'mean'];
  const body = rows().map((row) => {
    const r = base?.ranges[row.id], vals = runs.map((run) => valuesOf(run)[row.id]);
    const got = vals.filter((v): v is number => v !== undefined);
    const mean = got.length === vals.length && got.length ? got.reduce((a, b) => a + b, 0) / got.length : undefined;
    const cell = (v: number | undefined) => `${fmt(v, row.digits)}${r ? ` ${verdict(v, r)}` : ''}`;
    return [row.label, row.unit, fmtRange(r, row.digits), ...vals.map(cell), cell(mean)];
  });
  if (format === 'markdown') {
    const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
    return [line(head), line(head.map((_, i) => (i < 3 ? '---' : '---:'))), ...body.map(line)].join('\n');
  }
  const all = [head, ...body], widths = head.map((_, i) => Math.max(...all.map((r) => r[i]!.length)));
  return all.map((r) => r.map((c, i) => (i < 3 ? c.padEnd(widths[i]!) : c.padStart(widths[i]!))).join('  ').trimEnd()).join('\n');
}
