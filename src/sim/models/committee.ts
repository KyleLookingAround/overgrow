// The allotment committee: motions, each member's vote from their goals, habit and goodwill towards the proposer,
// persuasion by hours spent talking, political capital spent on proposing and replenished by goodwill, the rules a passed
// motion sets and what they cost the plots, and burning garden waste against composting it. Pure functions over the
// graph's typed quantities, and a `committee` system, not yet listed in src/sim/systems.ts (part 10 adds it).
// docs/systems/committee.md says how it works.
//
// Sources: the founding spec's coalition and veto-player models (a vote is members' goals as weights on a motion's effects,
//   passing on a simple majority; Tsebelis 2002, "Veto Players", for why a rule the status quo favours is hard to move);
//   political capital as a stock a leader spends and support refills (Neustadt 1960; the spec's "Politics and policy");
//   how a small group is persuaded, with diminishing returns to more talk and more to those who already trust you (Cialdini
//   2001, on liking and reciprocity); the IPCC 2006 Guidelines vol. 4 and 5 for open burning and composting of green waste
//   (through data/committee.ts's WASTE); the Water Industry Act 1991 for the shape of a hosepipe ban.
// Simplifies: four motions, four rules, one vote a member with no abstention beyond a narrow band; a member's lean is
//   a weighted sum with one nudge per habit, not a negotiation; persuasion moves a lean by a curve and never makes anyone
//   change their goals; nobody trades votes; goodwill towards the proposer is the member's goodwill towards the player
//   (a member proposing is taken as neutral); political capital is one number; the committee meets when the player
//   proposes, not on a schedule; rules are on or off, with no notice period or sunset; burning and composting are two
//   whole routes with their emissions read from IPCC defaults, not a mix.
//   Fast effect: a vote's result, a rule taking hold, and the goodwill a vote moves. Slow effect: political capital coming
//   back with the site's goodwill, and a rule's cost or saving over the seasons it stands.
import {
  AFTERMATH, CAPITAL, MAX_BEES, MOTIONS, PERSUADE, PLOTS, RULE, START_RULES, VOTE, WASTE,
  type MotionId, type Rules,
} from '../../data/committee';
import {WANTS} from '../../data/agency';
import type {System} from '../clock';
import {touch, type Graph, type GraphNode, type LeverValue} from '../graph';
import type {Rng} from '../random';
import {agentOf, newRelation, nudged, RELATION, relationOf, siteGoodwill, type Agent, type Relation} from './agency';

export const COMMITTEE = 'committee';
/** The levers and stocks a committee node keeps its rules and its political capital in; goodwill is the mean of its members' relationships. */
export const RULES = 'rules';
export const CAPITAL_STOCK = 'support.capital';
export const GOODWILL_STOCK = 'support.goodwill';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const setLever = (n: GraphNode, k: string, v: unknown) => void (n.levers[k] = v as LeverValue);

export type Vote = 'yes' | 'no' | 'abstain';

/** The committee: the members (the eleven neighbours), their relationships with the player, the player's political capital and the rules in force. */
export interface Committee {
  members: Agent[];
  relations: Record<string, Relation>;
  capital: number;
  rules: Rules;
}
export const startCommittee = (members: Agent[]): Committee => ({
  members, relations: Object.fromEntries(members.map((m) => [m.id, newRelation()])), capital: CAPITAL.start, rules: {...START_RULES},
});

// ---- a member's vote ----

/**
 * How far a member leans towards a motion, positive for yes: their goals' weights times the motion's appeal to each, the
 * habit's nudge, a dry summer's push, and their goodwill towards the proposer, then the day's mood. Above `abstainBand` is a
 * yes, below its negative a no.
 */
export function lean(m: Agent, motion: MotionId, goodwill = 0.5, dryness = 0, mood = 0): number {
  const mo = MOTIONS[motion];
  let x = 0;
  for (const w of WANTS) x += m.goals[w] * mo.appeal[w];
  return x + (mo.habits[m.habit] ?? 0) + mo.dryness * clamp(dryness, 0, 1) + VOTE.goodwill * (goodwill - 0.5) * 2 + mood;
}
export const voteOf = (x: number): Vote => (x > VOTE.abstainBand ? 'yes' : x < -VOTE.abstainBand ? 'no' : 'abstain');

/** How far `hours` of talk moves a lean towards yours (positive to yes, negative to no): a curve with diminishing returns, larger for someone who likes you. */
export const persuasion = (hours: number, goodwill = 0.5) => PERSUADE.max * (1 - Math.exp(-Math.max(0, hours) / PERSUADE.scale)) * (0.5 + goodwill);

export interface Tally {
  motion: MotionId;
  votes: Record<string, Vote>;
  /** Each member's lean at the vote, persuasion and mood included. */
  leans: Record<string, number>;
  yes: number;
  no: number;
  abstain: number;
  /** yes less no, counting the player's vote. */
  margin: number;
  /** A motion passes when more vote yes than no; a tie leaves things as they are. */
  passes: boolean;
  /** The hours of talk the vote took. */
  hours: number;
}
export interface Hold {
  /** Who proposes: 'you', or a member's id (taken as neutral). */
  proposer?: string;
  /** How the player votes (the player's vote counts as one). Persuasion pushes towards it. */
  you?: Vote;
  dryness?: number;
  /** Hours spent talking to each member by id. */
  talked?: Record<string, number>;
}

/** A vote: every member's lean (goodwill towards a player who proposes, a dry summer's push, persuasion and a day's mood from the dice), then the tally. */
export function hold(c: Pick<Committee, 'members' | 'relations'>, motion: MotionId, o: Hold, rng: Rng): Tally {
  const proposer = o.proposer ?? 'you', you = o.you ?? (proposer === 'you' ? 'yes' : 'abstain'), dir = you === 'yes' ? 1 : you === 'no' ? -1 : 0;
  const votes: Record<string, Vote> = {}, leans: Record<string, number> = {};
  let yes = you === 'yes' ? 1 : 0, no = you === 'no' ? 1 : 0, abstain = you === 'abstain' ? 1 : 0, hours = 0;
  for (const m of c.members) {
    const goodwill = proposer === 'you' ? (c.relations[m.id]?.goodwill ?? 0.5) : 0.5, talked = o.talked?.[m.id] ?? 0;
    const mood = (rng.next() * 2 - 1) * VOTE.mood;
    const x = lean(m, motion, goodwill, o.dryness ?? 0, mood) + dir * persuasion(talked, goodwill);
    hours += talked;
    leans[m.id] = x;
    const v = (votes[m.id] = voteOf(x));
    if (v === 'yes') yes++;
    else if (v === 'no') no++;
    else abstain++;
  }
  return {motion, votes, leans, yes, no, abstain, margin: yes - no, passes: yes > no, hours};
}

// ---- goodwill after a vote, rules and political capital ----

/** What a vote does to each member's goodwill towards the player: the same way as you, a little up; the other way, down; and members who lost to a motion you proposed are sour with you. */
export function aftermath(c: Committee, t: Tally, you: Vote, proposedByYou: boolean): Record<string, Relation> {
  const out: Record<string, Relation> = {};
  for (const m of c.members) {
    const r = c.relations[m.id] ?? newRelation(), v = t.votes[m.id]!;
    let delta = 0;
    if (you !== 'abstain' && v !== 'abstain') delta += v === you ? AFTERMATH.with : AFTERMATH.against;
    if (proposedByYou && t.passes && v === 'no') delta += AFTERMATH.proposer;
    out[m.id] = nudged(r, delta);
  }
  return out;
}

/** A rule after a motion has passed: the rota goes to fixed slots (or to shares by need), bonfires are banned, one more plot goes to the bees, a hosepipe rule comes on. */
export function applyMotion(r: Rules, motion: MotionId): Rules {
  switch (motion) {
    case 'waterRota': return {...r, rota: 'slots'};
    case 'waterNeed': return {...r, rota: 'need'};
    case 'bonfireBan': return {...r, bonfires: 'banned'};
    case 'plotToBees': return {...r, bees: Math.min(MAX_BEES, r.bees + 1)};
    case 'hosepipe': return {...r, hosepipe: 'on'};
  }
}
/** Whether a motion would change anything (a rule already in force can't be proposed again; a plot for the bees can, until there's only yours left). */
export const pending = (r: Rules, motion: MotionId) => JSON.stringify(applyMotion(r, motion)) !== JSON.stringify(r);
/** Lifts a hosepipe rule when the dry spell ends (the water company's, not a vote). */
export const lifted = (r: Rules): Rules => ({...r, hosepipe: 'off'});

export const canPropose = (c: Committee, motion: MotionId) => c.capital >= MOTIONS[motion].cost && pending(c.rules, motion);
/** Political capital a week adds: `weekly` at neutral goodwill, doubled at full goodwill and none at none, up to the cap. */
export const capitalAfter = (capital: number, goodwill: number) => clamp(capital + CAPITAL.weekly * goodwill * 2, 0, CAPITAL.cap);

export interface Result {
  committee: Committee;
  tally: Tally;
}
/**
 * The player proposes a motion: capital is spent (win or lose), the vote is held, goodwill moves, and if it passes the rule
 * takes hold. Returns why it can't be proposed, or the committee after and the tally. Pure: nothing is changed in place.
 */
export function propose(c: Committee, motion: MotionId, o: Hold, rng: Rng): Result | string {
  if (!pending(c.rules, motion)) return `${MOTIONS[motion].name}: already the rule`;
  if (c.capital < MOTIONS[motion].cost) return `${MOTIONS[motion].name}: costs ${MOTIONS[motion].cost} political capital and there is ${c.capital.toFixed(1)}`;
  const you = o.you ?? 'yes', tally = hold(c, motion, {...o, proposer: 'you', you}, rng);
  return {
    committee: {...c, capital: c.capital - MOTIONS[motion].cost, relations: aftermath(c, tally, you, true), rules: tally.passes ? applyMotion(c.rules, motion) : c.rules},
    tally,
  };
}
/** A motion put by another member (a hosepipe rule from the water company, a neighbour's bonfire ban): no capital spent, goodwill towards the proposer taken as neutral, and the player votes. */
export function put(c: Committee, motion: MotionId, o: Omit<Hold, 'proposer'>, rng: Rng): Result {
  const you = o.you ?? 'abstain', tally = hold(c, motion, {...o, proposer: 'member', you}, rng);
  return {committee: {...c, relations: aftermath(c, tally, you, false), rules: tally.passes ? applyMotion(c.rules, motion) : c.rules}, tally};
}

// ---- what the rules cost the plots ----

export interface Effects {
  /** Hours a plot-holder spends queueing at the trough in a week, at this dryness (0 to 1). */
  queueHours: number;
  /** The trough's litres a plot a day. */
  litresPerPlotDay: number;
  /** The share of garden waste burnt on site. */
  burnShare: number;
  /** Plots left to garden, and the pollination the bees' plots add to every plot's fruit set (a share). */
  plots: number;
  pollination: number;
}
/** What the rules in force do to the plots, at a dryness of the season. Open first-come queues cost nothing in a wet week and most in the driest; fixed slots, or shares by need, cost a flat half hour. */
export function effects(r: Rules, dryness = 0): Effects {
  return {
    queueHours: r.rota === 'open' ? RULE.queueBase + RULE.queue * clamp(dryness, 0, 1) : RULE.slot,
    litresPerPlotDay: RULE.litres * (r.hosepipe === 'on' ? 1 - RULE.hosepipeCut : 1),
    burnShare: r.bonfires === 'allowed' ? RULE.burn : 0,
    plots: PLOTS - r.bees,
    pollination: RULE.pollination * r.bees,
  };
}

/** What burning or composting `kg` of green waste does to the air, kg CO₂e: the CO₂ and other gases released now, the CO₂ that goes back later (over a year), and the carbon kept (in compost, or as ash and char). Burning is now; a heap keeps the carbon and returns some of it later. */
export function wasteCarbon(kg: number, route: 'burn' | 'compost'): {now: number; later: number; kept: number} {
  const w = WASTE, gases = (ch4: number, n2o: number) => ch4 * w.gwp.ch4 + n2o * w.gwp.n2o;
  if (route === 'burn') return {now: kg * (w.co2 * w.burnReturned + gases(w.burnCh4, w.burnN2o)), later: 0, kept: kg * w.co2 * (1 - w.burnReturned)};
  return {now: kg * gases(w.compostCh4, w.compostN2o), later: kg * w.co2 * w.compostReturned, kept: kg * w.co2 * (1 - w.compostReturned)};
}

// ---- on the graph ----

export const rulesOf = (n: GraphNode | undefined): Rules => (n?.levers[RULES] as unknown as Rules | undefined) ?? {...START_RULES};

/** The committee as the graph has it: members and relationships from the nodes with an `agent` lever, capital and rules from the committee's node. */
export function committeeOf(g: Graph): Committee {
  const n = g.nodes[COMMITTEE], members: Agent[] = [], relations: Record<string, Relation> = {};
  for (const node of Object.values(g.nodes)) {
    const a = agentOf(node);
    if (!a || !a.plot) continue;
    members.push(a);
    relations[a.id] = relationOf(node);
  }
  return {members, relations, capital: n?.stocks[CAPITAL_STOCK]?.amount ?? CAPITAL.start, rules: rulesOf(n)};
}
/** Writes a committee back onto the graph: the rules and capital on the committee's node, each member's relationship on theirs. Opinion and capital aren't conserved (the graph has no boundary for them). */
export function writeCommittee(g: Graph, c: Committee) {
  const n = g.nodes[COMMITTEE];
  if (n) {
    setLever(n, RULES, c.rules);
    if (n.stocks[CAPITAL_STOCK]) n.stocks[CAPITAL_STOCK].amount = c.capital as never;
    if (n.stocks[GOODWILL_STOCK]) n.stocks[GOODWILL_STOCK].amount = siteGoodwill(Object.values(c.relations)) as never;
    // set outside a flow, so the snapshot copies the node again (src/sim/graph.ts)
    touch(g, n.id);
  }
  for (const [id, r] of Object.entries(c.relations)) {
    const node = Object.values(g.nodes).find((x) => agentOf(x)?.id === id);
    if (node) setLever(node, RELATION, r);
  }
}
/** The pure half of the propose command: proposes on the graph's committee and writes the result back; returns why it can't, or the tally. */
export function proposeOn(g: Graph, motion: MotionId, o: Hold, rng: Rng): Tally | string {
  const r = propose(committeeOf(g), motion, o, rng);
  if (typeof r === 'string') return r;
  writeCommittee(g, r.committee);
  return r.tally;
}

/**
 * The committee system: each week its political capital comes back with the site's goodwill, and the goodwill stock shows
 * the mean of its members' relationships. Nothing here is a vote: a vote is a command (`proposeOn`). Not yet listed in
 * src/sim/systems.ts.
 */
export const committee: System = {
  name: 'committee',
  on: {
    week(c) {
      const n = c.graph.nodes[COMMITTEE];
      if (!n) return;
      const com = committeeOf(c.graph), goodwill = siteGoodwill(Object.values(com.relations));
      writeCommittee(c.graph, {...com, capital: capitalAfter(com.capital, goodwill)});
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === COMMITTEE && cmd.lever === RULES) return 'the rules are voted on, not set';
    return undefined;
  },
};
