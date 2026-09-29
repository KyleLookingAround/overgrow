// The week's decisions (the playable garden, round two): small real choices that come with what's happening in the
// garden, each asked once for what it's about (the snapshot's `answered`), never a nag. A frost forecast tonight with
// tender crops up in the open (fleece them); a glut in the kitchen (sell, preserve or give it away); a dry spell with
// none forecast (water sooner); and from December to February the seed catalogue (order next year's seed, a third
// cheaper, or blight-resistant); from November, the heap's compost as a winter mulch; and in February and March,
// seed potatoes to chit and empty beds' soil to warm under fleece; and the autumn and winter's jobs (round three): the
// leaves raked onto the heap from mid-October, a cordon redcurrant in bare-root season (November to March, every three
// weeks while the fence has room), and in December and January the empty beds dug over or left no-dig. Pure, so a Vitest test holds it; App.tsx queues the first one due as a notice, and the
// bot answers them (tools/bot/player.ts).
import {FLEECE, UPGRADES} from '../data/shed';
import {unfolded} from '../data/unfold';
import {calendar} from '../sim/clock';
import {DRY_LINE, type Command} from '../sim/commands';
import {GARDENER, MULCH_MIN, mulchBeds} from '../sim/gardener';
import {compostOn} from '../sim/models/carbon';
import type {Graph, GraphNode} from '../sim/graph';
import {kitOf} from '../sim/kit';
import {KITCHEN} from '../sim/models/kitchen';
import {forecastOf, tonight, type WeatherDay} from '../sim/models/weather';
import {cataloguePrice, catalogueOpen, chitOpen, digOverBeds, frostBeds, leavesOpen, refuseBuy, warmBeds} from '../sim/shed';
import type {Snapshot} from '../sim/state';
import {money} from './format';

export interface Decision {
  id: 'frost' | 'glut' | 'dry' | 'catalogue' | 'chit' | 'mulch' | 'warm' | 'leaves' | 'bare-root' | 'dig-over';
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
    const now = String(snap.nodes.find((n) => n.id === KITCHEN)?.levers.glut ?? 'sell');
    // the two choices besides what's done now, each with its button
    const actions: Decision['actions'] = ['preserve', 'give', 'sell'].filter((a) => a !== now).map((a) => ({label: GLUT_LABEL[a]!, cmd: card('glut', a)}));
    out.push({id: 'glut', at: KITCHEN, text: `A glut: more is ready than the kitchen can eat fresh, and it goes to ${GLUT_TO[now] ?? 'the honesty box'}. ${actions.map((a, i) => (i ? a.label[0]!.toLowerCase() + a.label.slice(1) : a.label)).join(' or ')} instead?`,
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
