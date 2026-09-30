// The bot's player: the choices a sensible player makes, as policies that read the snapshot and return commands. Each
// morning the bot asks every policy in turn and sends what they return through `apply()`, exactly as the page does for
// the player; a policy never touches a bed or a stock. A player is its policies: the plan (what to sow where, in
// season, rotating families), the moisture line to water at, the pest policy, the shop (the next thing worth having,
// bought once the purse holds its price and a little over), digging (another bed once the dug ones are all in use) and
// the winter line (a winter crop in each bed once the first autumn bed stands empty), and the week's cards, the autumn's
// and winter's among them (the leaves raked, a cordon each time bare-root season asks, the beds left no-dig). A policy on a lever or an offer
// that unfolds (src/data/unfold.ts) waits until it has, as a player would: the sim refuses it before.
import {CROPS, type CropId} from '../../src/data/crops';
import {RUNGS, UPGRADE_IDS, UPGRADES, type UpgradeId} from '../../src/data/shed';
import {digCost} from '../../src/data/garden';
import {unfolded} from '../../src/data/unfold';
import {NO_KIT, SHED, type Kit} from '../../src/sim/kit';
import type {CalendarDate} from '../../src/sim/clock';
import type {GraphNode, LeverValue} from '../../src/sim/graph';
import type {Command, Snapshot} from '../../src/sim/index';
import {isDug} from './measure';
import {bedCardOf} from '../../src/ui/bed-card';
import {goalLine, statusOf} from '../../src/ui/goal';
import {CARDS} from '../../src/data/unfold';
import {YEAR_HOURS} from '../../src/sim/commands';
import {decisionsOf} from '../../src/ui/decisions';
import {PRESERVE} from '../../src/data/kitchen';
import {cataloguePrice, refuseBuy} from '../../src/sim/shed';
import {nextRung} from '../../src/ui/goal';
import {MIX_IDS, PLAYER_PLOT, type Care, type Feed, type Mix} from '../../src/data/allotment';
import {PRICE} from '../../src/data/household';
import {baseOf, leverOpen, planFor, plotDays} from '../../src/sim/allotment';
import {offered, goalOf} from '../../src/sim/goal';
import {meetingOf, personNode, secondOf, secondPlot} from '../../src/sim/season';
import {HELPING, takingsOf, type Helping} from '../../src/sim/models/agency';

const graphOf = (snap: Snapshot) => ({nodes: Object.fromEntries(snap.nodes.map((n) => [n.id, n])), edges: [], rev: 0});

/** What a policy sees: the snapshot after the last tick, and the date. */
export interface View {
  snap: Snapshot;
  /** Day 1 is the game's first day. */
  day: number;
  date: CalendarDate;
}

/** One kind of choice: returns the commands to send now (none if nothing needs changing). */
export type Policy = (v: View) => Command[];

export interface Player {
  name: string;
  /** What to sow in each bed and when. */
  plan: Policy;
  /** The moisture line the gardener waters at. */
  water: Policy;
  /** Leave, pick, trap or treat, for each pest once it has come up. */
  pests: Policy | null;
  /** The next thing in the shed worth having, bought once the purse holds its price and a reserve. */
  shop: Policy | null;
  /** Another bed dug once every dug bed is in use. */
  dig: Policy | null;
  /** What goes in an empty bed: the bed card's answer, or each dug bed's winter crop once winter crops have come up. */
  winter: Policy | null;
  /** The week's decision cards (src/ui/decisions.ts): a frost, a glut, a dry spell, the catalogue. */
  decide?: Policy | null;
}

/** Sets a lever on every node of a kind that has it, where it isn't set to that already. */
export const setLever = (lever: string, value: LeverValue, kind: string): Policy =>
  ({snap}) =>
    snap.nodes
      .filter((n) => n.kind === kind && lever in n.levers && JSON.stringify(n.levers[lever]) !== JSON.stringify(value))
      .map((n) => ({type: 'plan', node: n.id, lever, value}));

/** A policy that waits until a key has unfolded (the sim refuses its lever before). */
export const once = (key: string, policy: Policy): Policy => (v) => (unfolded(v.snap.seen, key) ? policy(v) : []);

/** Sets a pest's policy on the gardener once the pest has come up in the garden, where it isn't that already. */
export const pestPolicy = (want: Record<string, string>): Policy => (v) =>
  Object.entries(want).flatMap(([pest, value]) => {
    const me = v.snap.nodes.find((n) => n.kind === 'person' && pest in n.levers);
    return me && unfolded(v.snap.seen, `garden.${pest}`) && me.levers[pest] !== value ? [{type: 'policy' as const, node: me.id, lever: pest, value}] : [];
  });

/** Each dug bed's lever: `want(bed, i)` for the i-th dug bed, sent only where the plan says something else. */
const eachBedLever = (lever: string, want: (n: GraphNode, i: number) => LeverValue): Policy =>
  ({snap}) =>
    snap.nodes.filter(isDug).flatMap((n, i) => {
      const value = want(n, i);
      return JSON.stringify(n.levers[lever]) === JSON.stringify(value) ? [] : [{type: 'plan' as const, node: n.id, lever, value}];
    });
const eachBed = (want: (n: GraphNode, i: number) => LeverValue): Policy => eachBedLever('sow', want);

/** Starts each of the first dug beds on a crop of its own (a mix for the kitchen), then follows the family rotation once
 *  one's in; a bed dug later goes straight onto the rotation, which always sows something in season. */
export const rotate = (first: readonly string[]): Policy =>
  eachBed((n, i) => (i < first.length && n.levers.crop == null && !((n.levers.history as unknown[] | undefined) ?? []).length ? first[i]! : 'rotation'));

/** The same crop in every dug bed, round after round: the single trick the strategy test checks doesn't win. */
export const oneCrop = (crop: string): Policy => eachBed(() => crop);

/** Water when the soil is below this share of its available water: half, where FAO-56 puts most vegetables' stress. */
export const WATER_LINE = 0.5;
/** Sets the watering line to WATER_LINE once it's come up, and never lowers it after a dry spell's card has raised it. */
export const waterLine: Policy = once('garden.water', ({snap}) => {
  const me = snap.nodes.find((n) => n.kind === 'person' && 'waterBelow' in n.levers);
  return me && Number(me.levers.waterBelow) < WATER_LINE ? [{type: 'plan', node: me.id, lever: 'waterBelow', value: WATER_LINE}] : [];
});

/** Slugs picked at dusk (the plan's start), aphids squashed and blighted leaves picked off by hand once each comes up:
 *  the gardener's time rather than the purse's, and nothing that harms the ladybirds. */
export const SENSIBLE_PESTS = pestPolicy({slugs: 'pick', aphids: 'pick', blight: 'pick'});

/** What's been bought, from the shed's `kit` lever in the snapshot. */
export const kitOf = (snap: Snapshot): Kit => (snap.nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;

/** The purse kept back when buying, £: a week's beer and seed for a sowing or two. */
export const RESERVE = 10;

/** What the shed offers now that the player would buy: what's come up and isn't owned (a raised bed while a dug bed isn't
 *  one), nematodes only from April to September, when the soil is warm enough for them, and a pack at a time. */
function offers(snap: Snapshot, date: CalendarDate): UpgradeId[] {
  const kit = kitOf(snap), unraised = snap.nodes.some((n) => isDug(n) && n.levers.raised !== true && n.levers.cover !== 'greenhouse');
  return UPGRADE_IDS.filter((id) => unfolded(snap.seen, `shed.${id}`) && !(UPGRADES[id].kept && kit.owned.includes(id)))
    .filter((id) => id !== 'raised-bed' || unraised)
    .filter((id) => id !== 'nematodes' || (kit.nematodes <= 0 && date.month >= 4 && date.month <= 9));
}

/** Climbs the money ladder (round four): the first rung in RUNGS that has come up, the garden can take, and pays now (the
 *  mid-priced kit only in its months), bought once the purse holds its price and the reserve; a pack of nematodes in
 *  the warm months beside it. It saves for one rung at a time rather than spending on whatever's cheapest. */
export const buyNext: Policy = ({snap, date}) => {
  // the cordons are planted one at a time as bare-root season's card asks
  const g = graphOf(snap) as never, want = offers(snap, date).filter((id) => id !== 'cordon' && (WHEN[id]?.includes(date.month) ?? true));
  const room = (id: UpgradeId) => {
    const r = refuseBuy(g, id);
    return r === null || r === `${UPGRADES[id].name} costs £${UPGRADES[id].price.toFixed(2)}`;
  };
  const id = RUNGS.find((x) => want.includes(x) && room(x)) ?? (want.includes('nematodes') ? 'nematodes' : undefined);
  return id && snap.money >= UPGRADES[id].price + RESERVE ? [{type: 'buy', id}] : [];
};
/** The mid-priced kit, bought only in the months it pays (the rest of the year it would sit in the shed while the purse
 *  goes short of seed): the fork for the winter digging, cloches for the autumn and the early spring, the propagator
 *  for the spring's tender sowings, and the bee hotel before the mason bees fly. */
export const WHEN: Partial<Record<UpgradeId, readonly number[]>> = {fork: [10, 11, 12, 1, 2], cloches: [9, 10, 2, 3], propagator: [1, 2, 3], 'bee-hotel': [3, 4]};

/** Digs the first plot under grass once "Dig this bed" has come up and the purse holds a bed's edging and compost, one at
 *  a time: in the growing months once every dug bed is in use, and in the winter digging season whenever it can. */
export const digNext: Policy = ({snap, date}) => {
  if (!unfolded(snap.seen, 'garden.dig')) return [];
  const beds = snap.nodes.filter((n) => n.kind === 'bed'), grass = (n: GraphNode) => (n.stocks['land.grass']?.amount ?? 0) > 1e-6;
  if (beds.some((n) => grass(n) && n.levers.dig === true)) return [];
  // in the growing months only once every dug bed is in use; from October to March, the digging season, whenever the
  // purse can pay (frost breaks up the clods of a bed dug in winter: RHS, "Digging")
  const winter = date.month >= 10 || date.month <= 3;
  if (!winter && beds.some((n) => !grass(n) && n.levers.crop == null)) return [];
  const next = beds.find(grass);
  return next && snap.money >= digCost(next.stocks['land.grass']!.amount) + RESERVE ? [{type: 'plan', node: next.id, lever: 'dig', value: true}] : [];
};

/** The winter crops the bot sows: late ones (sown into November) after a crop a frost ends, early ones after the rest. */
export const WINTER_CROPS = {late: ['garlic', 'broad-beans'], early: ['winter-salad', 'onions', 'green-manure']};
/** Each dug bed's winter line, once it has come up, chosen once by what's in the bed then. */
export const winterCrops: Policy = once('garden.winter', ({snap}) =>
  snap.nodes.filter(isDug).flatMap((n, i) => {
    if (n.levers.winter !== 'none') return [];
    const c = n.levers.crop as {id: string} | null, tender = !!c && CROPS[c.id as CropId]?.frost === 'plant';
    const list = tender ? WINTER_CROPS.late : WINTER_CROPS.early;
    return [{type: 'plan' as const, node: n.id, lever: 'winter', value: list[i % list.length]!}];
  }));

/** Answers the bed card (src/ui/bed-card.ts) with its first choice: the rotation's pick, or the winter crop it suggests. */
export const answerBeds: Policy = ({snap}) => bedCardOf(snap)?.actions[0]?.cmds ?? [];

/** What an engaged player answers the week's decisions with: fleece for a frost, a glut preserved while the freezer has
 *  room (it feeds the winter) and given away when it's full, water sooner in a dry spell, and blight-resistant seed. */
export const ANSWERS: Record<string, string> = {frost: 'fleece', glut: 'preserve', dry: 'water', catalogue: 'resistant', chit: 'chit', mulch: 'mulch', warm: 'warm',
  leaves: 'rake', 'bare-root': 'plant', 'dig-over': 'no-dig', prune: 'prune', sets: 'order', clean: 'clean', sill: 'sow', 'hen-care': 'care', box: 'stock'};
export const decideAll: Policy = ({snap}) => [...yearCards(snap), ...decisionsOf(snap).flatMap((d) => {
    let want = ANSWERS[d.id]!;
    if (d.id === 'glut' && Number(snap.nodes.find((n) => n.id === 'kitchen')?.stocks['food.preserves']?.amount ?? 0) >= PRESERVE.cap - 1) want = 'give';
    // a glut sold when the purse is short of the next rung
    const rung = nextRung(snap);
    if (d.id === 'glut' && rung && snap.money < UPGRADES[rung].price) want = 'sell';
    // next year's seed only once the purse has its price and the reserve
    if (d.id === 'catalogue' && snap.money < cataloguePrice(graphOf(snap), 'resistant') + RESERVE) want = 'later';
    const pick = d.actions.find((a) => (a.cmd as {answer?: string}).answer === want)?.cmd ?? (want === (d.dismiss as {answer?: string}).answer ? d.dismiss : d.actions[0]!.cmd);
    return [pick];
  })];

/** The year's cards, read and carried on from: the offer won, or the first anniversary without it. */
function yearCards(snap: Snapshot): Command[] {
  if (statusOf(snap).ready && !snap.seen.includes(CARDS.year)) return [{type: 'card', id: 'year', answer: 'ok'}];
  return snap.hours >= YEAR_HOURS && !snap.seen.includes(CARDS.year) && !snap.seen.includes(CARDS.firstYear) ? [{type: 'card', id: 'first-year', answer: 'ok'}] : [];
}

/** Takes the plot as soon as the committee offers it (the step-up card's "Take the plot"). */
export const takePlot: Policy = ({snap}) => (snap.level === 1 && offered(goalOf(graphOf(snap) as never)) ? [{type: 'step-up'}] : []);

/** The care the sensible player gives their plot, hours a week: a little more than the garden had, for its Health. */
export const PLOT_CARE: Care = 3;
/** The mix that saves the household most at the shop: every group is short, so the most kg at the shop's prices. */
export function bestMix(base: NonNullable<ReturnType<typeof baseOf>>, care: Care, feed: Feed): Mix {
  const worth = (m: Mix) => Object.entries(planFor(base, care, m, feed).mix ?? {}).reduce((s, [g, kg]) => s + (kg ?? 0) * (PRICE[g as keyof typeof PRICE] ?? 0), 0);
  return MIX_IDS.reduce((best, m) => (worth(m) > worth(best) + 1e-9 ? m : best), 'as grown' as Mix);
}
/** The plot's plan at the allotment, each lever once it has unfolded: more care, the mix that saves most, and the heap's
 *  compost kept (bought feed runs the ground down). */
export const plotPlan: Policy = ({snap}) => {
  const n = snap.nodes.find((x) => x.id === PLAYER_PLOT), base = baseOf(n);
  if (snap.level !== 2 || !n || !base) return [];
  const days = plotDays(graphOf(snap) as never), out: Command[] = [];
  const want = {care: PLOT_CARE, mix: bestMix(base, PLOT_CARE, 'compost'), feed: 'compost'} as const;
  for (const lever of ['care', 'mix', 'feed'] as const)
    if (leverOpen(lever, days) && n.levers[lever] !== want[lever]) out.push({type: 'plan', node: PLAYER_PLOT, lever, value: want[lever]});
  return out;
};

/** Sells when short (round four): the honesty box kept stocked while the purse is short of the next rung (the box card's
 *  answer), and back to only what's spare once it holds the rung's price, so the household eats its own again. */
export const sellWhenShort: Policy = ({snap}) => {
  const k = snap.nodes.find((n) => n.id === 'kitchen'), rung = nextRung(snap);
  if (!k || k.levers.box !== 'stock') return [];
  return !rung || snap.money >= UPGRADES[rung].price + RESERVE ? [{type: 'policy', node: 'kitchen', lever: 'box', value: 'spare'}] : [];
};

/** The slug policy once the beer traps are in: leave them to the traps and keep the gardener's evenings. */
export const SLUGS_AFTER_TRAP: Policy = (v) => (kitOf(v.snap).owned.includes('beer-trap') ? pestPolicy({slugs: 'leave'})(v) : []);

/** The players the bot and the strategy tests know, by name. */
export const PLAYERS: Record<string, Player> = {
  /** Salad leaves and potatoes to start, for early leaves and a big crop by July, then the rotation in both beds. */
  sensible: {
    name: 'sensible', plan: rotate(['salad', 'potatoes']), water: waterLine,
    pests: (v) => [...SENSIBLE_PESTS(v).filter((c) => !(c.type === 'policy' && c.lever === 'slugs' && kitOf(v.snap).owned.includes('beer-trap'))), ...SLUGS_AFTER_TRAP(v)],
    shop: (v) => [...buyNext(v), ...sellWhenShort(v)], dig: digNext, winter: answerBeds, decide: decideAll,
  },
  /** The sensible plan with no shopping, digging or winter crops: the garden as it was before the shed opened. */
  /** Does exactly what the goal bar says, and nothing else (the `feature` playbook's tips, proved by a player who follows
   *  them): each morning, the bar's one next action's commands, if it names one. */
  tips: {name: 'tips', plan: (v) => goalLine(v.snap).step?.cmds ?? [], water: () => [], pests: null, shop: null, dig: null, winter: null, decide: decideAll},
  'two-beds': {name: 'two-beds', plan: rotate(['salad', 'potatoes']), water: once('garden.water', setLever('waterBelow', WATER_LINE, 'person')), pests: SENSIBLE_PESTS, shop: null, dig: null, winter: null},
  'one-crop': {name: 'one-crop', plan: oneCrop('salad'), water: once('garden.water', setLever('waterBelow', WATER_LINE, 'person')), pests: SENSIBLE_PESTS, shop: null, dig: null, winter: null},
};

/** The policies in the order the bot asks them each morning. */
export const policiesOf = (p: Player): Policy[] => [takePlot, p.plan, p.water, p.pests, p.shop, p.dig, p.winter, p.decide ?? null].filter((x): x is Policy => x !== null);
/** The weeks the sensible player audits a new helper before trusting their reports enough for a glance. */
export const AUDIT_WEEKS = 4;
/** The allotment's first season (src/sim/season.ts), as a sensible player plays it: takes the second plot on once it's
 *  offered, accepts the helper, audits them for a month and then glances, votes for the rota put (with no talk), and
 *  leaves surplus at the swap shed once it has unfolded. */
export const seasonPlay: Policy = ({snap}) => {
  if (snap.level !== 2) return [];
  const g = graphOf(snap) as never, out: Command[] = [], n = secondPlot(g), sp = secondOf(n ?? undefined);
  if (sp && sp.taken == null && unfolded(snap.seen, 'agency.helper')) out.push({type: 'second-plot', answer: 'take'});
  else if (sp && sp.taken != null && !sp.helper && !sp.refused) out.push({type: 'helper', answer: 'accept'});
  else if (sp?.helper) {
    const p = personNode(g, sp.helper), job = p?.levers[HELPING] as unknown as Helping | undefined, want = takingsOf(p!).weeks < AUDIT_WEEKS ? 'audit' : 'glance';
    if (job && job.watching !== want) out.push({type: 'watch', watching: want});
  }
  const m = meetingOf(g);
  if (m && !m.tally && unfolded(snap.seen, 'committee.panel')) out.push({type: 'vote', answer: 'yes'});
  const home = snap.nodes.find((x) => x.id === 'household');
  if (home && home.levers.swap !== 'on' && unfolded(snap.seen, 'allotment.shed')) out.push({type: 'policy', node: 'household', lever: 'swap', value: 'on'});
  return out;
};

/** The policies at the allotment (level 2): the plot's plan and its first season. */
export const allotmentPolicies = (_p: Player): Policy[] => [plotPlan, seasonPlay];
