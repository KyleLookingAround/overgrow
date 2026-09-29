import {describe, expect, it} from 'vitest';
import {placeBadges} from './placement';

describe('placeBadges', () => {
  it('keeps each badge at its anchor when there is room', () => {
    expect(placeBadges([{id: 'a', x: 50, y: 50}, {id: 'b', x: 150, y: 50}], 40, 300, 200)).toEqual([{id: 'a', x: 30, y: 30}, {id: 'b', x: 130, y: 30}]);
  });
  it('moves crowded badges apart, all inside the map, none overlapping', () => {
    const wanted = Array.from({length: 6}, (_, i) => ({id: `b${i}`, x: 20 + i * 5, y: 10}));
    const placed = placeBadges(wanted, 40, 320, 240);
    expect(placed).toHaveLength(6);
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + 40).toBeLessThanOrEqual(320);
      expect(p.y + 40).toBeLessThanOrEqual(240);
    }
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) expect(Math.abs(placed[i]!.x - placed[j]!.x) >= 40 || Math.abs(placed[i]!.y - placed[j]!.y) >= 40).toBe(true);
  });
  it('drops a badge whose anchor is off the map, and places nothing on a map smaller than a badge', () => {
    expect(placeBadges([{id: 'a', x: -5, y: 10}, {id: 'b', x: 10, y: 10}], 40, 200, 200).map((p) => p.id)).toEqual(['b']);
    expect(placeBadges([{id: 'a', x: 10, y: 10}], 40, 30, 200)).toEqual([]);
  });
});
