// The systems that run on the clock's ticks, in the order they run. Each is its own file exporting a `System`
// (src/sim/clock.ts); a new system adds one import and one entry here and edits no other system. The weather comes
// first so the water and soil read today's; the flowers bring their wildlife; the pests feed, breed and spread, and what
// the shed sold (the traps, the nematodes) catches some of them; the hens eat, drink, lay and drop their droppings; the crops grow on the day's weather and the soil's water, less what the pests took, and the soft fruit ripens; the gardener works through the day's
// jobs; the kitchen eats in the evening; the household counts what the garden fed it; the heap breaks down; and each week the goal records the garden's week and the purse's week starts again.
// At the allotment (level 2) the garden's systems rest: the allotment puts the plan on the player's plot, takes yesterday's
// food off the plots and sends the people to them, then every sealed plot ticks (src/sim/allotment.ts, src/sim/ladder.ts).
import type {System} from './clock';
import {allotment} from './allotment';
import {gardener} from './gardener';
import {goal} from './goal';
import {biodiversity} from './models/biodiversity';
import {carbon} from './models/carbon';
import {crops} from './models/crops';
import {fruit} from './models/fruit';
import {household} from './models/household';
import {kitchen} from './models/kitchen';
import {sealedSystem} from './ladder';
import {livestock} from './models/livestock';
import {pests} from './models/pests';
import {purse} from './purse';
import {shed} from './shed';
import {soil} from './models/soil';
import {water} from './models/water';
import {weather} from './models/weather';

/** The garden's systems, which run at level 1 only. */
const GARDEN: readonly System[] = [weather, water, soil, biodiversity, pests, shed, livestock, crops, fruit, gardener, kitchen, household, carbon, goal, purse];

export const SYSTEMS: readonly System[] = [...GARDEN.map((s) => ({...s, levels: [1]})), allotment, sealedSystem];
