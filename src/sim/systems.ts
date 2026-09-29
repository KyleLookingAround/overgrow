// The systems that run on the clock's ticks, in the order they run. Each is its own file exporting a `System`
// (src/sim/clock.ts); a new system adds one import and one entry here and edits no other system. The weather comes
// first so the water and soil read today's; the crops grow on the day's weather and the soil's water; the gardener
// works through the day's jobs; the kitchen eats in the evening; and the heap breaks down.
import type {System} from './clock';
import {gardener} from './gardener';
import {carbon} from './models/carbon';
import {crops} from './models/crops';
import {kitchen} from './models/kitchen';
import {soil} from './models/soil';
import {water} from './models/water';
import {weather} from './models/weather';

export const SYSTEMS: readonly System[] = [weather, water, soil, crops, gardener, kitchen, carbon];
