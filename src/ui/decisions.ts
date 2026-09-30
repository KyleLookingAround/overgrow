// The week's decisions (the playable garden, round two): small real choices that come with what's happening in the
// garden, each asked once for what it's about (the snapshot's `answered`), never a nag. A frost forecast tonight with
// tender crops up in the open (fleece them); a glut in the kitchen (sell, preserve or give it away); a dry spell with
// none forecast (water sooner); and from December to February the seed catalogue (order next year's seed, a third
// cheaper, or blight-resistant); from November, the heap's compost as a winter mulch; and in February and March,
// seed potatoes to chit and empty beds' soil to warm under fleece; and the autumn and winter's jobs (round three): the
// leaves raked onto the heap from mid-October, a cordon redcurrant in bare-root season (November to March, every three
// weeks while the fence has room), and in December and January the empty beds dug over or left no-dig; and midwinter's
// jobs (round four), each from its own date so they come days apart: the hens' winter care, the currants pruned, the pots
// washed, seed potatoes by post and salad on the windowsill; and when the purse is short of the money ladder's next
// rung, the honesty box kept stocked. The glut card says what each choice gives, selling first when money's short. Pure, so a Vitest test holds it; App.tsx queues the first one due as a notice, and the
// bot answers them (tools/bot/player.ts).
import {CLEAN, FLEECE, FORCE, HEN_CARE, inWinter, PRUNE, SETS, SILL, UPGRADES} from '../data/shed';
import {BOX, PRESERVE} from '../data/kitchen';
import {PRICE} from '../data/household';
import {unfolded} from '../data/unfold';
import {calendar} from '../sim/clock';
import {DRY_LINE, type Command} from '../sim/commands';
import {GARDENER, MULCH_MIN, mulchBeds} from '../sim/gardener';
import {compostOn} from '../sim/models/carbon';
import type {Graph, GraphNode} from '../sim/graph';
import {kitOf} from '../sim/kit';
import {boxPolicy, KITCHEN, surplusOf} from '../sim/models/kitchen';
import {nextRung} from './goal';
import {forecastOf, tonight, type WeatherDay} from '../sim/models/weather';
import {cataloguePrice, catalogueOpen, chitOpen, digOverBeds, forceOpen, frostBeds, henCareOpen, leavesOpen, pruneCount, pruneOpen, refuseBuy, setsOpen, sillOpen, warmBeds} from '../sim/shed';
import type {Snapshot} from '../sim/state';
import {money} from './format';

export interface Decision {
  id: 'frost' | 'glut' | 'dry' | 'catalogue' | 'chit' | 'mulch' | 'warm' | 'leaves' | 'bare-root' | 'dig-over' | 'prune' | 'sets' | 'clean' | 'sill' | 'hen-care' | 'force' | 'box';
  text: string;
  /** Where on the map it's about. */
  at: string;
  actions: {label: string; cmd: Command}[];
  /** What closing it sends: the choice to leave things as they are. */
  dismiss: Command;
}

/** A dry spell worth a word: this many days in a row with less than a millimetre of rain, and none tomorrow. */
export const DRY_DAYS = 7;
/** The catalogue asks again this long after "later", game hours; and bare-root season's cordon, after each answer. */
export const LATER_HOURS = 21 * 24;
/** A card asked once a year asks again no sooner than this, game hours. */
const YEARLY = 200 * 24;
/** Where a glut goes by each of the kitchen's policies, and each choice's button. */
const GLUT_TO: Record<string, string> = {sell: 'the honesty box', preserve: 'the freezer', give: 'a neighbour'};
const GLUT_LABEL: Record<string, string> = {preserve: 'Preserve it', give: 'Give it away', sell: 'Sell at the box'};
/** What each glut choice gives for `kg`: £ at the box, jars (and the £ they save in the winter, at the shop's price for
 *  green veg), or the neighbours' goodwill. */
export function glutGives(choice: string, kg: number): string {
  // the box sells a few days' worth before the rest goes off
  if (choice === 'sell') return `up to ${money(Math.min(kg, BOX.perDay * GLUT_DAYS) * BOX.price)}`;
  if (choice === 'preserve') return `${Math.max(1, Math.round(kg / PRESERVE.jarKg))} jars, ${money(kg * PRICE.greens)} saved in winter`;
  return 'goodwill next door';
}
/** The days of the box's sales a glut's money is counted over. */
const GLUT_DAYS = 3;
/** The box card asks again no sooner than this after an answer, game hours. */
const BOX_AGAIN = 60 * 24;

/** The glut card's least kg, for its words while the glut is being carried off. */
const GLUT_MIN = 3;
const graphOf = (nodes: readonly GraphNode[]): Graph => ({nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), edges: [], rev: 0});
const card = (id: Decision['id'], answer: string): Command => ({type: 'card', id, answer} as Command);

/** Every decision due now, the most pressing first: a frost tonight, a glut, a dry spell, the catalogue. */
export function decisionsOf(snap: Snapshot): Decision[] {
  const g = graphOf(snap.nodes), date = calendar(snap.hours), asked = (id: string) => snap.answered?.[id] ?? -Infinity, out: Decision[] = [];
  const air = snap.nodes.find((n) => n.kind === 'atmosphere'), today = air?.levers.weather as unknown as WeatherDay | null | undefined, f = forecastOf(g);
  // a frost tonight: from the morning's forecast until the evening, once a night
  const purse = snap.money, roll = kitOf(g).fleece || purse >= FLEECE.gbp;
  if (today && f && today.day === date.dayIndex && date.hour >= 6 && date.hour < 21 && asked('frost') < snap.hours - 20 && roll) {
    const cold = tonight(today, f.day), beds = frostBeds(g).filter((b) => !(typeof b.levers.fleece === 'number' && b.levers.fleece > snap.hours));
    if (cold < 0 && beds.length) {
      const price = kitOf(g).fleece ? '' : ` (${money(FLEECE.gbp)} for a roll)`;
      out.push({id: 'frost', at: beds[0]!.id, text: `Frost forecast tonight, ${Math.round(cold)} °C on the grass: fleece the tender crops?`,
        actions: [{label: `Fleece them${price}`, cmd: card('frost', 'fleece')}], dismiss: card('frost', 'no')});
    }
  }
  // a glut: once a glut, while it lasts
  const l = snap.kitchen;
  if (l?.glutFrom != null && l.glutAt != null && snap.hours - l.glutAt <= 48 && asked('glut') < l.glutFrom) {
    const now = String(snap.nodes.find((n) => n.id === KITCHEN)?.levers.glut ?? 'sell'), kg = Math.max(GLUT_MIN, surplusOf(g).reduce((a, x) => a + x.kg, 0));
    // the two choices besides what's done now, each with what it gives; selling first when the purse is short of the next rung
    const rung = nextRung(snap), short = !!rung && purse < UPGRADES[rung].price;
    const actions: Decision['actions'] = (short ? ['sell', 'preserve', 'give'] : ['preserve', 'give', 'sell']).filter((a) => a !== now)
      .map((a) => ({label: `${GLUT_LABEL[a]!} (${glutGives(a, kg)})`, cmd: card('glut', a)}));
    out.push({id: 'glut', at: KITCHEN, text: `A glut: ${Math.round(kg)} kg more than the kitchen can eat fresh, going to ${GLUT_TO[now] ?? 'the honesty box'} (${glutGives(now, kg)}). Or instead:`,
      actions, dismiss: card('glut', now)});
  }
  // a dry spell in the growing months, none forecast, and the gardener not already watering early: once a spell
  const line = Number(snap.nodes.find((n) => n.id === GARDENER)?.levers.waterBelow ?? 0.5);
  if (f && f.dry >= DRY_DAYS && f.day.rain < 1 && date.month >= 4 && date.month <= 9 && line < DRY_LINE && unfolded(snap.seen, 'garden.water') &&
    asked('dry') < snap.hours - f.dry * 24) {
    out.push({id: 'dry', at: 'butt', text: `A dry spell: ${f.dry} days without rain, and none forecast. Water sooner, at three quarters?`,
      actions: [{label: 'Water sooner', cmd: card('dry', 'water')}], dismiss: card('dry', 'no')});
  }
  // the autumn clear-up: the fallen leaves raked onto the heap, once an autumn
  if (leavesOpen(date) && asked('leaves') < snap.hours - YEARLY && snap.nodes.some((n) => n.id === 'heap')) {
    out.push({id: 'leaves', at: 'heap', text: 'Autumn leaves are down: rake them onto the heap, for compost and leaf mould?',
      actions: [{label: 'Rake them up', cmd: card('leaves', 'rake')}], dismiss: card('leaves', 'no')});
  }
  // the winter catalogue, once a winter (again three weeks after "later")
  if (catalogueOpen(g, date) && asked('catalogue') < snap.hours - LATER_HOURS && unfolded(snap.seen, 'garden.money') && purse >= cataloguePrice(g, 'standard')) {
    const std = cataloguePrice(g, 'standard'), res = cataloguePrice(g, 'resistant');
    const actions: Decision['actions'] = [{label: `Order (${money(std)})`, cmd: card('catalogue', 'standard')}];
    if (purse >= res) actions.push({label: `Blight-resistant (${money(res)})`, cmd: card('catalogue', 'resistant')});
    out.push({id: 'catalogue', at: 'shed', text: `The seed catalogue: next year’s seed for ${money(std)}, about a third less than packets in spring.`, actions,
      dismiss: card('catalogue', 'later')});
  }
  // bare-root season: a cordon redcurrant along the fence, every three weeks while it has room and the purse the price
  const cordon = UPGRADES.cordon.price;
  // asked every three weeks while the fence has room, until "not this winter"
  if (kitOf(g).bare && unfolded(snap.seen, 'shed.cordon') && !refuseBuy(g, 'cordon') && asked('bare-root') < snap.hours - LATER_HOURS && asked('bare-root-no') < snap.hours - YEARLY) {
    out.push({id: 'bare-root', at: 'shed', text: `Bare-root season: a cordon redcurrant is ${money(cordon)}, and settles in best planted now. Plant one along the fence?`,
      actions: [{label: `Plant one (${money(cordon)})`, cmd: card('bare-root', 'plant')}], dismiss: card('bare-root', 'later')});
  }
  // from November to February, the heap's compost as a winter mulch on the beds, once a winter
  const heap = compostOn(g), empty = mulchBeds(g);
  if ((date.month >= 11 || date.month <= 2) && heap >= MULCH_MIN && empty.length && asked('mulch') < snap.hours - 120 * 24 && unfolded(snap.seen, 'garden.soil')) {
    out.push({id: 'mulch', at: 'heap', text: `The heap has ${Math.round(heap)} kg of compost: spread it on the beds as a winter mulch?`,
      actions: [{label: 'Mulch them', cmd: card('mulch', 'mulch')}], dismiss: card('mulch', 'no')});
  }
  // December and January: the empty beds dug over, or left no-dig, once a winter
  const bare = digOverBeds(g, date);
  if (bare.length && asked('dig-over') < snap.hours - YEARLY && unfolded(snap.seen, 'garden.soil')) {
    out.push({id: 'dig-over', at: bare[0]!.id, text: `Winter: dig the ${bare.length === 1 ? 'empty bed' : `${bare.length} empty beds`} over, turning up slugs’ eggs, or leave the soil undisturbed?`,
      actions: [{label: 'Dig them over', cmd: card('dig-over', 'dig')}, {label: 'Leave them no-dig', cmd: card('dig-over', 'no-dig')}], dismiss: card('dig-over', 'no-dig')});
  }
  // midwinter's jobs, each once a winter from its own date
  if (henCareOpen(g, date, snap.hours) && asked('hen-care') < snap.hours - YEARLY && purse >= HEN_CARE.gbp) {
    out.push({id: 'hen-care', at: 'hens', text: `Winter for the hens: fresh straw deep in the house and a check for red mite (${money(HEN_CARE.gbp)}), to keep them well through the cold?`,
      actions: [{label: `Do it (${money(HEN_CARE.gbp)})`, cmd: card('hen-care', 'care')}], dismiss: card('hen-care', 'no')});
  }
  if (pruneOpen(g, date, snap.hours) && asked('prune') < snap.hours - YEARLY) {
    const n = pruneCount(g, snap.hours);
    out.push({id: 'prune', at: snap.nodes.some((x) => x.id === 'cordons') ? 'cordons' : 'bush', text: `The currants are dormant: prune ${n === 1 ? 'it' : `all ${n}`} back to a bud or two, for a fuller crop next summer (${PRUNE.minutes * n} minutes)?`,
      actions: [{label: 'Prune them', cmd: card('prune', 'prune')}], dismiss: card('prune', 'no')});
  }
  if (inWinter(CLEAN, date.month, date.day) && kitOf(g).cleaned !== date.year + 1 && asked('clean') < snap.hours - YEARLY && unfolded(snap.seen, 'garden.shed')) {
    out.push({id: 'clean', at: 'shed', text: 'A midwinter job: wash the pots, the trays and the glass, where slugs hide through the winter?',
      actions: [{label: 'Wash them', cmd: card('clean', 'clean')}], dismiss: card('clean', 'no')});
  }
  if (forceOpen(g, date) && asked('force') < snap.hours - YEARLY && unfolded(snap.seen, 'garden.shed')) {
    out.push({id: 'force', at: 'shed', text: `Pale chicory: force a dozen roots under the pots in the dark, about ${(FORCE.kg * FORCE.days).toFixed(1)} kg of leaves in three weeks (${FORCE.minutes} minutes)? The pots then can’t be washed for slugs this winter.`,
      actions: [{label: 'Force them', cmd: card('force', 'force')}], dismiss: card('force', 'no')});
  }
  if (setsOpen(g, date) && asked('sets') < snap.hours - YEARLY && unfolded(snap.seen, 'garden.money') && purse >= SETS.gbp) {
    out.push({id: 'sets', at: 'shed', text: `Seed potatoes by post: a bag of first earlies for ${money(SETS.gbp)}, cheaper than the spring’s packs, in time to chit?`,
      actions: [{label: `Order them (${money(SETS.gbp)})`, cmd: card('sets', 'order')}], dismiss: card('sets', 'no')});
  }
  if (sillOpen(g, date, snap.hours) && asked('sill') < snap.hours - YEARLY && unfolded(snap.seen, 'garden.kitchen') && purse >= SILL.gbp) {
    const warm = kitOf(g).owned.includes('propagator') ? ' in the propagator' : '';
    out.push({id: 'sill', at: KITCHEN, text: `A winter sowing: salad leaves in trays${warm} on the windowsill, to cut from in a fortnight (${money(SILL.gbp)})?`,
      actions: [{label: `Sow them (${money(SILL.gbp)})`, cmd: card('sill', 'sow')}], dismiss: card('sill', 'no')});
  }
  // a surplus seen (a glut, or the box has sold): the honesty box kept stocked for money now, whatever the purse
  const rung = nextRung(snap);
  if (boxPolicy(g) === 'spare' && (l?.glutFrom != null || (l?.sold ?? 0) > 0) && asked('box') < snap.hours - BOX_AGAIN && unfolded(snap.seen, 'garden.money') && (l?.firstHarvest ?? null) !== null) {
    const why = rung && purse < UPGRADES[rung].price ? `${UPGRADES[rung].name} is ${money(UPGRADES[rung].price - purse)} away: ` : '';
    out.push({id: 'box', at: 'gate', text: `${why}keep the honesty box stocked with some of what the garden has, eggs and jars too? Passers-by pay about £1 a week in winter, more in summer.`,
      actions: [{label: 'Keep it stocked', cmd: card('box', 'stock')}], dismiss: card('box', 'spare')});
  }
  // seed potatoes to chit in February and March, once a spring
  if (chitOpen(g, date, snap.hours) && asked('chit') < snap.hours - 200 * 24 && unfolded(snap.seen, 'garden.money')) {
    out.push({id: 'chit', at: 'shed', text: 'Seed potatoes are in the shops: set them out to chit on a windowsill, for a crop two weeks sooner?',
      actions: [{label: 'Chit them', cmd: card('chit', 'chit')}], dismiss: card('chit', 'no')});
  }
  // from February to mid-April, the empty beds' soil warmed under fleece for an early sowing, once a fortnight at most
  const cold = warmBeds(g, date);
  if (cold.length && asked('warm') < snap.hours - 14 * 24 && unfolded(snap.seen, 'garden.money') && roll) {
    const price = kitOf(g).fleece ? '' : ` (${money(FLEECE.gbp)} for a roll)`;
    out.push({id: 'warm', at: cold[0]!.id, text: `${cold.length === 1 ? cold[0]!.name : `${cold.length} beds`} empty: lay fleece over to warm the soil, and sow two weeks sooner?`,
      actions: [{label: `Lay fleece${price}`, cmd: card('warm', 'warm')}], dismiss: card('warm', 'no')});
  }
  return out;
}
