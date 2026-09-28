import {describe, expect, it} from 'vitest';
import {placeAt, type Activity} from './activity';

const boxes: Record<string, {x: number; y: number; w: number; h: number}> = {a: {x: 0, y: 0, w: 2, h: 2}, b: {x: 10, y: 0, w: 2, h: 2}, c: {x: 10, y: 10, w: 2, h: 2}};
const walk: Activity = {id: 'w', who: 'gardener', kind: 'person', doing: 'walk', from: 'a', to: 'c', via: ['b'], start: 10, end: 12};

describe('activity', () => {
  it('places its actor along the way at an even pace, held at the ends', () => {
    const at = (h: number) => placeAt(walk, h, (id) => boxes[id]);
    expect(at(9)).toEqual({x: 1, y: 1, progress: 0, facing: 0});
    expect(at(10.5)).toMatchObject({x: 6, y: 1, facing: 1});
    expect(at(11.5)).toMatchObject({x: 11, y: 6, facing: 0});
    expect(at(13)).toEqual({x: 11, y: 11, progress: 1, facing: 0});
  });
  it('is null when a place has no box on the map', () => {
    expect(placeAt({...walk, to: 'atmosphere'}, 11, (id) => boxes[id])).toBeNull();
  });
});
