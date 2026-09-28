// The seeded random generator. Anything that can change the game draws from an Rng made from the game's seed, never
// from Math.random(), so a seed repeats a run exactly (docs/decisions/ADR-2026-09-28-seeded-randomness.md). This is the
// only file in src/ allowed Math.random() without a `// cosmetic` mark, and only to pick a seed when none is given.
export interface Rng {
  /** A number in [0, 1), like Math.random(). */
  next(): number;
  /** The state, so a save can carry the stream on exactly where it was. */
  state(): number;
}

/** mulberry32: small, fast and good enough for a game. */
export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => s,
  };
}

/** A seed for a new game when the player didn't choose one. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
}
