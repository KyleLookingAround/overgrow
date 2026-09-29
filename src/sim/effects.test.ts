// Effects and the Explain table: every cause the game's own systems record over a year (with every pest policy and
// flowers in the plan) has an entry, every entry says all it must and names a source, and effects are merged by cause,
// place and unit, each at a place on the map or a node.
import {describe, expect, it} from 'vitest';
import {entries, explain} from '../data/explain';
import {POLICIES, type PestId} from '../data/pests';
import {Recorder} from './effects';
import {createSim} from './index';

describe('effects', () => {
  it('has an Explain entry for every cause a year of the game records, whatever the pest policy', () => {
    const seen = new Map<string, string>(), missing = new Set<string>();
    for (const how of ['pick', 'trap', 'treat'] as const) {
      const sim = createSim(3), set = new Set<string>();
      sim.apply({type: 'plan', node: 'bed-3', lever: 'dig', value: true});
      sim.apply({type: 'plan', node: 'bed-3', lever: 'sow', value: 'potatoes'});
      for (let h = 0; h < 24 * 365; h += 6) {
        // each lever as soon as it has unfolded
        for (const pest of Object.keys(POLICIES) as PestId[])
          if (!set.has(pest) && (POLICIES[pest] as string[]).includes(how) && sim.apply({type: 'policy', node: 'gardener', lever: pest, value: how}).rejected === null) set.add(pest);
        if (!set.has('edge') && sim.apply({type: 'plan', node: 'bed-2', lever: 'edge', value: 'marigolds'}).rejected === null) set.add('edge');
        const s = sim.apply({type: 'tick', hours: 6});
        const ids = new Set(s.nodes.map((n) => n.id));
        for (const e of s.effects) {
          seen.set(e.cause, e.kind);
          if (e.kind === 'unknown' || !explain(e.cause)) missing.add(e.cause);
          expect(ids.has(e.at)).toBe(true);
        }
      }
    }
    expect([...missing]).toEqual([]);
    // the brief's list, all recorded
    for (const cause of ['rain', 'frost', 'drought', 'waterlogging', 'decay', 'leaching', 'growth', 'water stress', 'picking', 'eating', 'honesty box',
      'to the heap', 'digging', 'slugs', 'hand-picking', 'trapping', 'slug pellets', 'aphids', 'blight', 'Smith period', 'fungicide', 'pollination', 'flowers'])
      expect(seen.has(cause), cause).toBe(true);
  }, 60_000);

  it('says what happened, how, its fast and slow effects and its source for every entry, each cause once', () => {
    const causes: string[] = [];
    for (const [key, e] of entries()) {
      for (const f of ['title', 'says', 'mechanism', 'fast', 'slow', 'source'] as const) expect(e[f].trim().length, `${key}.${f}`).toBeGreaterThan(3);
      expect(e.causes.length, key).toBeGreaterThan(0);
      causes.push(...e.causes);
    }
    expect(new Set(causes).size).toBe(causes.length);
  });

  it('merges effects by cause, place and unit', () => {
    const r = new Recorder();
    r.add('rain', 'bed-1', 2, 'L');
    r.add('rain', 'bed-1', 3, 'L');
    r.add('rain', 'bed-2', 1, 'L');
    r.add('slug pellets', 'bed-1', 1, 'pests');
    r.add('slug pellets', 'bed-1', 0.1, 'GBP');
    r.add('no such cause', 'bed-1', 1, 'L');
    expect(r.list()).toEqual([
      {kind: 'weather', cause: 'rain', at: 'bed-1', amount: 5, unit: 'L'},
      {kind: 'weather', cause: 'rain', at: 'bed-2', amount: 1, unit: 'L'},
      {kind: 'pest', cause: 'slug pellets', at: 'bed-1', amount: 1, unit: 'pests'},
      {kind: 'pest', cause: 'slug pellets', at: 'bed-1', amount: 0.1, unit: 'GBP'},
      {kind: 'unknown', cause: 'no such cause', at: 'bed-1', amount: 1, unit: 'L'},
    ]);
  });
});
