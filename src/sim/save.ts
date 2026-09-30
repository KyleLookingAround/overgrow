// The save format: versioned JSON, with a migration step per version once the game is released. The sim only turns a
// state into text and back; where the text is kept is src/app/storage.ts (localStorage today, IndexedDB once a save
// passes 1 MB, behind the same two calls). Until the first release (part 15) the saved shape changes freely and an older
// save starts a new game; from then on, never rename or remove a saved field: add one with a default and a migration
// step (docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md). docs/systems/saving.md says how it works.
import {SPEEDS} from '../data/ladder';
import {rng} from './random';
import type {State} from './state';

/** The one key the game saves under (the project notes). */
export const SAVE_KEY = 'overgrow-save-v1';
/** The version this build writes. Raise it whenever the saved shape changes (with a migration step once released). */
export const SAVE_VERSION = 15;

/** What's written: the state less what's runtime only, with the generator's state in place of the generator. */
export type SaveFile = Omit<State, 'rng' | 'rejected' | 'errors' | 'effects'> & {version: number; rng: number};

export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * One step per version: MIGRATIONS[n] turns a version-n save into a version n+1 one. Empty until the first release:
 * before it, saves carry no compatibility promise (docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md),
 * so a change to the saved shape raises the version and an older save starts a new game.
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
    if (!step) throw new SaveError(`it's from an earlier build (version ${v}), before saves were kept across versions`);
    s = {...step(s), version: v + 1};
    v++;
  }
  return s;
}

export function toSave(s: State): string {
  const file: SaveFile = {
    version: SAVE_VERSION, seed: s.seed, rng: s.rng.state(), hours: s.hours, level: s.level, speed: s.speed, home: s.home,
    graph: s.graph, flows: s.flows, activities: s.activities, ladder: s.ladder, zoom: s.zoom, upgrades: s.upgrades, laws: s.laws,
    goals: s.goals, settings: s.settings, seen: s.seen, unfolding: s.unfolding, answered: s.answered,
  };
  return JSON.stringify(file);
}

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
  for (const k of ['goals', 'settings', 'answered', 'unfolding'] as const) if (!isObj(f[k])) throw new SaveError(`${k} is missing`);
  return {
    seed: f.seed, rng: rng(f.rng), hours: f.hours, level: f.level, speed: f.speed, home: f.home, graph: f.graph, flows: f.flows,
    activities: f.activities, ladder: f.ladder, zoom: isObj(f.zoom) ? f.zoom : null, upgrades: f.upgrades, laws: f.laws, goals: f.goals, settings: f.settings,
    seen: f.seen, unfolding: f.unfolding, answered: f.answered, rejected: null, errors: [], effects: [],
  };
}
