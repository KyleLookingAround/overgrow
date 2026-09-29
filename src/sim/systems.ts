// The systems that run on the clock's ticks, in the order they run. Each is its own file exporting a `System`
// (src/sim/clock.ts); a new system adds one import and one entry here and edits no other system. The weather comes
// first so the water and soil read today's; the crops and the gardener come in part 3.
import type {System} from './clock';
import {soil} from './models/soil';
import {water} from './models/water';
import {weather} from './models/weather';

export const SYSTEMS: readonly System[] = [weather, water, soil];
