// The systems that run on the clock's ticks, in the order they run. Each is its own file exporting a `System`
// (src/sim/clock.ts); a new system adds one import and one entry here and edits no other system. Part 1 has none: the
// weather, soil and water come in part 2, the crops and the gardener in part 3.
import type {System} from './clock';

export const SYSTEMS: readonly System[] = [];
