// The placement pass for the map's badges and labels (the owner's win W15): a pure function of rectangles, so a Vitest
// test and the `explain` check call the same helper the map draws with. Each badge wants to sit at its anchor (a place's
// corner on the map); a badge whose anchor is off the map isn't placed at all, and the rest are kept inside the map and
// moved apart, one pass in order, each to the nearest free spot around where it wanted to be.

export interface Wanted {
  id: string;
  /** The anchor, CSS pixels in the map's box. */
  x: number;
  y: number;
}
export interface Placed {
  id: string;
  /** The badge's top-left corner, CSS pixels. */
  x: number;
  y: number;
}

const overlaps = (a: Placed, b: Placed, size: number) => Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size;

/** Places square badges of a size (px) around their anchors in a w × h map, none overlapping, all inside. */
export function placeBadges(wanted: readonly Wanted[], size: number, w: number, h: number): Placed[] {
  const out: Placed[] = [];
  if (w < size || h < size) return out;
  const clamp = (v: number, hi: number) => Math.min(Math.max(0, v), hi - size);
  // the spots tried, nearest first: where it wants to be, then a ring of steps around it, then a wider ring
  const steps: [number, number][] = [[0, 0]];
  for (let r = 1; r <= 3; r++)
    for (const [dx, dy] of [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]] as const) steps.push([dx * r, dy * r]);
  for (const b of wanted) {
    if (!(b.x >= 0 && b.x <= w && b.y >= 0 && b.y <= h)) continue; // its anchor isn't on the map
    const x0 = b.x - size / 2, y0 = b.y - size / 2;
    for (const [dx, dy] of steps) {
      const p = {id: b.id, x: clamp(x0 + dx * size, w), y: clamp(y0 + dy * size, h)};
      if (!out.some((q) => overlaps(p, q, size))) {
        out.push(p);
        break;
      }
    }
  }
  return out;
}
