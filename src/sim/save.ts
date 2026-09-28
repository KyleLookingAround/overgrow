// The save format: versioned JSON, with one migration step per version so every old save keeps loading. The sim only
// turns a state into text and back; where the text is kept is src/app/storage.ts (localStorage today, IndexedDB once a
// save passes 1 MB, behind the same two calls). Never rename or remove a saved field: add one with a default and a
// migration step. docs/systems/saving.md says how it works.
import {SPEEDS} from '../data/ladder';
import {rng} from './random';
import type {State} from './state';

/** The one key the game saves under (the project notes). */
export const SAVE_KEY = 'overgrow-save-v1';
/** The version this build writes. Raise it with a migration step whenever the saved shape changes. */
export const SAVE_VERSION = 1;

/** What's written: the state less what's runtime only, with the generator's state in place of the generator. */
export type SaveFile = Omit<State, 'rng' | 'rejected' | 'errors'> & {version: number; rng: number};

export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/**
 * One step per version: MIGRATIONS[n] turns a version-n save into a version n+1 one. Version 1 is the first saved
 * shape, so there are no steps yet; the first change to it adds MIGRATIONS[1] and raises SAVE_VERSION to 2.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export class SaveError extends Error {}

/** A save brought up to a version, one step at a time. */
export function migrate(save: Record<string, unknown>, steps: Readonly<Record<number, Migration>> = MIGRATIONS, to = SAVE_VERSION): Record<string, unknown> {
  let v = save.version;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new SaveError('it has no version');
  if (v > to) throw new SaveError(`it's from a newer version (${v}) of the game`);
  let s = save;
  while (v < to) {
    const step = steps[v];
    if (!step) throw new SaveError(`no step to bring version ${v} up to date`);
    s = {...step(s), version: v + 1};
    v++;
  }
  return s;
}

export function toSave(s: State): string {
  const file: SaveFile = {
    version: SAVE_VERSION, seed: s.seed, rng: s.rng.state(), hours: s.hours, level: s.level, speed: s.speed, home: s.home,
    graph: s.graph, flows: s.flows, activities: s.activities, ladder: s.ladder, upgrades: s.upgrades, laws: s.laws,
    goals: s.goals, settings: s.settings, seen: s.seen,
  };
  return JSON.stringify(file);
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** A state from a save's text, migrated to this version. Throws a SaveError naming what's wrong. */
export function fromSave(text: string): State {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError("it isn't JSON");
  }
  if (!isObj(raw)) throw new SaveError("it isn't a save");
  const f = migrate(raw) as unknown as SaveFile;
  for (const k of ['seed', 'rng', 'hours', 'level'] as const) if (typeof f[k] !== 'number' || !Number.isFinite(f[k])) throw new SaveError(`${k} isn't a number`);
  if (!(SPEEDS as readonly number[]).includes(f.speed)) throw new SaveError(`no speed ${String(f.speed)}`);
  if (!isObj(f.graph) || !isObj(f.graph.nodes) || !Array.isArray(f.graph.edges)) throw new SaveError('the graph is missing');
  for (const [id, n] of Object.entries(f.graph.nodes)) {
    if (!isObj(n) || !isObj(n.stocks) || !isObj(n.levers) || !isObj(n.totals)) throw new SaveError(`node ${id} is malformed`);
    if (!n.stocks.carbon || !Object.keys(n.stocks).some((k) => k.startsWith('land.'))) throw new SaveError(`node ${id} has no carbon or land`);
  }
  if (typeof f.home !== 'string' || !f.graph.nodes[f.home]) throw new SaveError('the household is missing');
  for (const k of ['flows', 'activities', 'ladder', 'upgrades', 'laws', 'seen'] as const) if (!Array.isArray(f[k])) throw new SaveError(`${k} isn't a list`);
  for (const k of ['goals', 'settings'] as const) if (!isObj(f[k])) throw new SaveError(`${k} is missing`);
  return {
    seed: f.seed, rng: rng(f.rng), hours: f.hours, level: f.level, speed: f.speed, home: f.home, graph: f.graph, flows: f.flows,
    activities: f.activities, ladder: f.ladder, upgrades: f.upgrades, laws: f.laws, goals: f.goals, settings: f.settings,
    seen: f.seen, rejected: null, errors: [],
  };
}
