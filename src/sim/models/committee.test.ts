// The committee model's plausibility test: a motion passes when enough members' goals and goodwill favour it and fails
// otherwise; a dry summer carries a hosepipe rule; persuasion shifts a close vote and not a lopsided one; proposing costs
// political capital that goodwill brings back; voting with the majority keeps goodwill and can cost the outcome you
// wanted, and voting your preference can win it and cost goodwill; every rule is a trade-off between wet weeks and dry;
// burning garden waste is smoke now and a heap keeps the carbon; and the system and the graph half of the command move
// the capital, the rules and the relationships.
import {describe, expect, it} from 'vitest';
import {CAPITAL, MAX_BEES, MOTION_IDS, MOTIONS, PLOTS, RULE, START_RULES, WASTE} from '../../data/committee';
import {applyFlow, makeGraph, qty, type Graph} from '../graph';
import type {TickContext} from '../clock';
import {rng} from '../random';
import {AGENT, allotment, makeAgent, newRelation, RELATION, householdOf, siteGoodwill, type Agent, type Relation} from './agency';
import {
  aftermath, applyMotion, canPropose, capitalAfter, CAPITAL_STOCK, committee, committeeOf, COMMITTEE, effects, GOODWILL_STOCK, hold, lean, lifted, persuasion,
  propose, proposeOn, put, RULES, rulesOf, startCommittee, voteOf, wasteCarbon, type Committee, type Vote,
} from './committee';

const person = (id: string, goals: Agent['goals'], habit: Agent['habit'] = 'generous'): Agent => ({...makeAgent(id, id, habit, householdOf(id, id, {holder: 'none'}), rng(1), `plot-${id}`), goals});
/** A member wanting only one thing. */
const wants = (w: keyof Agent['goals']): Agent['goals'] => ({harvest: 0, rest: 0, standing: 0, money: 0, [w]: 1});
/** A committee of members of a kind, at a goodwill: counts of `[goals, count, goodwill]`. */
function room(...groups: [Agent['goals'], number, number?][]): Committee {
  const members: Agent[] = [], relations: Record<string, Relation> = {};
  groups.forEach(([goals, n, goodwill], gi) => {
    for (let i = 0; i < n; i++) {
      const p = person(`${gi}-${i}`, goals);
      members.push(p);
      relations[p.id] = {...newRelation(), goodwill: goodwill ?? 0.5};
    }
  });
  return {members, relations, capital: CAPITAL.cap, rules: {...START_RULES}};
}
const tally = (c: Committee, motion: Parameters<typeof hold>[1], o: Parameters<typeof hold>[2] = {}, seed = 1) => hold(c, motion, o, rng(seed));

describe('a member’s vote', () => {
  it('follows their goals: a member who wants standing backs the bees’ plot, one who wants harvest opposes it', () => {
    expect(lean(person('a', wants('standing')), 'plotToBees')).toBeGreaterThan(0.3);
    expect(lean(person('b', wants('harvest')), 'plotToBees')).toBeLessThan(-0.19);
    expect(voteOf(0.3)).toBe('yes');
    expect(voteOf(-0.3)).toBe('no');
    expect(voteOf(0)).toBe('abstain');
  });

  it('follows their habit: tidy and lazy neighbours resist a bonfire ban that generous ones back', () => {
    const goals = {harvest: 0.25, rest: 0.25, standing: 0.25, money: 0.25};
    expect(lean(person('t', goals, 'tidy'), 'bonfireBan')).toBeLessThan(lean(person('g', goals, 'generous'), 'bonfireBan') - 0.3);
    expect(lean(person('l', goals, 'lazy'), 'bonfireBan')).toBeLessThan(0);
  });

  it('follows their goodwill towards you: the same member leans further your way the more they like you', () => {
    const m = person('m', wants('harvest'));
    expect(lean(m, 'waterRota', 1)).toBeGreaterThan(lean(m, 'waterRota', 0.5));
    expect(lean(m, 'waterRota', 0.5)).toBeGreaterThan(lean(m, 'waterRota', 0));
    expect(lean(m, 'waterRota', 1) - lean(m, 'waterRota', 0)).toBeCloseTo(0.7, 9);
  });

  it('follows the season: a dry summer pushes everyone towards a hosepipe rule, and a wet one does not', () => {
    const m = person('m', {harvest: 0.25, rest: 0.25, standing: 0.25, money: 0.25});
    expect(lean(m, 'hosepipe', 0.5, 1)).toBeGreaterThan(lean(m, 'hosepipe', 0.5, 0) + 0.8);
    expect(lean(m, 'bonfireBan', 0.5, 1)).toBe(lean(m, 'bonfireBan', 0.5, 0));
  });
});

describe('a motion’s outcome', () => {
  it('passes when enough members’ goals and goodwill favour it, and fails otherwise', () => {
    const backers = room([wants('standing'), 7], [wants('harvest'), 4]), against = room([wants('standing'), 3], [wants('harvest'), 8]);
    expect(tally(backers, 'plotToBees').passes).toBe(true);
    expect(tally(backers, 'plotToBees').yes).toBe(8); // seven members and you
    expect(tally(against, 'plotToBees').passes).toBe(false);
    expect(tally(against, 'plotToBees', {you: 'no'}).margin).toBeLessThan(0);
  });

  it('turns on goodwill: the same room refuses a proposer it dislikes and passes one it likes', () => {
    const mixed = (goodwill: number) => room([wants('harvest'), 11, goodwill]);
    // harvest-minded members are a whisker against the bees; goodwill decides whether that holds
    expect(tally(mixed(0.5), 'waterRota').passes).toBe(true);
    const marginal = (goodwill: number) => room([{harvest: 0.05, rest: 0, standing: 0.95, money: 0}, 11, goodwill]);
    expect(lean(marginal(0.5).members[0]!, 'waterRota', 0.5)).toBeLessThan(0);
    expect(tally(marginal(0.5), 'waterRota').passes).toBe(false);
    expect(tally(marginal(1), 'waterRota').passes).toBe(true);
    expect(tally(marginal(0), 'waterRota').yes).toBe(1);
  });

  it('a tie leaves things as they are, and the player’s abstention counts for nothing', () => {
    const split = room([wants('standing'), 5], [wants('harvest'), 6]);
    expect(tally(split, 'plotToBees').passes).toBe(false); // 5 + you against 6: tied at six each
    expect(tally(split, 'plotToBees').margin).toBe(0);
    expect(tally(split, 'plotToBees', {you: 'abstain'}).passes).toBe(false);
    expect(tally(room([wants('standing'), 6], [wants('harvest'), 5]), 'plotToBees', {you: 'abstain'}).passes).toBe(true);
  });

  it('is not a foregone conclusion: on a real allotment each motion passes in some seeds and fails in others', () => {
    const passes = (m: (typeof MOTION_IDS)[number], dryness = 0) => Array.from({length: 60}, (_, i) => {
      const {agents} = allotment(rng(i + 1));
      return tally(startCommittee(agents), m, {dryness}, i + 1).passes;
    });
    const rate = (m: (typeof MOTION_IDS)[number], dryness = 0) => passes(m, dryness).filter(Boolean).length;
    for (const m of ['waterRota', 'bonfireBan', 'plotToBees'] as const) {
      expect(rate(m)).toBeGreaterThan(0);
      expect(rate(m)).toBeLessThan(60);
    }
    // a bonfire ban is the harder sell: the tidy and the lazy hold their bonfires dear
    expect(rate('bonfireBan')).toBeLessThan(rate('plotToBees'));
    // and a dry summer helps the water rota
    expect(rate('waterRota', 1)).toBeGreaterThan(rate('waterRota', 0));
    // in a dry summer a hosepipe rule mostly carries; in a wet one it mostly doesn't
    const dry = passes('hosepipe', 1).filter(Boolean).length, wet = passes('hosepipe', 0).filter(Boolean).length;
    expect(dry).toBeGreaterThan(wet + 20);
  });

  it('draws the same vote from the same dice and a different mood from another seed', () => {
    const c = startCommittee(allotment(rng(2)).agents);
    expect(tally(c, 'waterRota', {}, 5).leans).toEqual(tally(c, 'waterRota', {}, 5).leans);
    expect(tally(c, 'waterRota', {}, 5).leans).not.toEqual(tally(c, 'waterRota', {}, 6).leans);
  });
});

describe('persuasion', () => {
  const close = () => room([wants('harvest'), 5, 0.5], [wants('standing'), 6, 0.5]);

  it('shifts a close vote: hours spent talking to a member who leans no can turn them', () => {
    const c = close(), talkTo = c.members.filter((m) => m.id.startsWith('1-'));
    expect(tally(c, 'waterRota').passes).toBe(false);
    expect(tally(c, 'waterRota', {talked: {[talkTo[0]!.id]: 4}}).passes).toBe(true);
    expect(tally(c, 'waterRota', {talked: {[talkTo[0]!.id]: 4}}).hours).toBe(4);
  });

  it('does not shift a lopsided one: the same hours change nothing when the room is set against you', () => {
    const c = room([wants('harvest'), 2, 0.5], [wants('standing'), 9, 0]);
    const talked = Object.fromEntries(c.members.filter((m) => m.id.startsWith('1-')).map((m) => [m.id, 4]));
    const before = tally(c, 'waterRota'), after = tally(c, 'waterRota', {talked});
    expect(before.passes).toBe(false);
    expect(after.passes).toBe(false);
    expect(after.margin).toBe(before.margin); // nine hours of talk each and nobody moved
    expect(Math.max(...Object.values(after.leans))).toBeGreaterThan(0.2);
    expect(after.no).toBe(9);
  });

  it('has diminishing returns, and works further with someone who likes you', () => {
    expect(persuasion(2)).toBeGreaterThan(persuasion(1));
    expect(persuasion(2) - persuasion(1)).toBeGreaterThan(persuasion(8) - persuasion(7));
    expect(persuasion(100, 0.5)).toBeLessThan(0.26);
    expect(persuasion(3, 1)).toBeGreaterThan(persuasion(3, 0));
    expect(persuasion(0)).toBe(0);
  });

  it('costs the player hours, and pushes towards their vote: a player voting no is helped by the same talk', () => {
    const c = room([wants('harvest'), 3], [{harvest: 0.2, rest: 0, standing: 0.7, money: 0.1}, 8]);
    const ids = c.members.map((m) => m.id), talked = Object.fromEntries(ids.map((id) => [id, 3]));
    expect(tally(c, 'waterRota', {you: 'no', talked}).margin).toBeLessThan(tally(c, 'waterRota', {you: 'no'}).margin);
    expect(tally(c, 'waterRota', {you: 'yes', talked}).margin).toBeGreaterThan(tally(c, 'waterRota', {you: 'yes'}).margin);
    expect(tally(c, 'waterRota', {talked}).hours).toBe(3 * ids.length);
  });
});

describe('political capital', () => {
  it('is spent on proposing, win or lose, and a refused motion costs as much as a carried one', () => {
    const c = room([wants('standing'), 8], [wants('harvest'), 3]);
    const won = propose(c, 'plotToBees', {}, rng(1)), lost = propose(room([wants('standing'), 1], [wants('harvest'), 10]), 'plotToBees', {}, rng(1));
    expect(typeof won).toBe('object');
    expect(typeof lost).toBe('object');
    if (typeof won === 'string' || typeof lost === 'string') return;
    expect(won.tally.passes).toBe(true);
    expect(lost.tally.passes).toBe(false);
    expect(won.committee.capital).toBe(CAPITAL.cap - MOTIONS.plotToBees.cost);
    expect(lost.committee.capital).toBe(CAPITAL.cap - MOTIONS.plotToBees.cost);
    expect(won.committee.rules.bees).toBe(1);
    expect(lost.committee.rules.bees).toBe(0);
  });

  it('is refused when there isn’t enough or the rule already stands, and changes nothing', () => {
    const poor = {...room([wants('standing'), 8]), capital: 1};
    expect(propose(poor, 'bonfireBan', {}, rng(1))).toMatch(/costs 4/);
    expect(canPropose(poor, 'bonfireBan')).toBe(false);
    const banned = {...room([wants('standing'), 8]), rules: {...START_RULES, bonfires: 'banned' as const}};
    expect(propose(banned, 'bonfireBan', {}, rng(1))).toMatch(/already the rule/);
    expect(banned.capital).toBe(CAPITAL.cap);
  });

  it('comes back with goodwill: a liked player is refilled faster than a disliked one, up to a cap', () => {
    expect(capitalAfter(2, 1)).toBeGreaterThan(capitalAfter(2, 0.5));
    expect(capitalAfter(2, 0.5)).toBeGreaterThan(capitalAfter(2, 0));
    expect(capitalAfter(2, 0)).toBe(2);
    expect(capitalAfter(CAPITAL.cap - 0.1, 1)).toBe(CAPITAL.cap);
    let low = 0, high = 0;
    for (let w = 0; w < 13; w++) [low, high] = [capitalAfter(low, 0.2), capitalAfter(high, 0.8)];
    expect(high).toBeGreaterThan(low * 2);
    // a season at neutral goodwill buys about one more motion
    let neutral = 0;
    for (let w = 0; w < 13; w++) neutral = capitalAfter(neutral, 0.5);
    expect(neutral).toBeGreaterThan(MOTIONS.hosepipe.cost);
    expect(neutral).toBeLessThan(MOTIONS.bonfireBan.cost + 2);
  });
});

describe('voting with the majority or with your preference', () => {
  const mean_ = (c: Committee, r: Record<string, Relation>) => siteGoodwill(c.members.map((m) => r[m.id]!));

  it('keeps goodwill when you vote with a majority you didn’t want, and the motion carries either way', () => {
    // nine want the bees’ plot and two don’t; you’d rather not have it
    const c = room([wants('standing'), 9], [wants('harvest'), 2]);
    const withThem = tally(c, 'plotToBees', {proposer: 'member', you: 'yes'}), against = tally(c, 'plotToBees', {proposer: 'member', you: 'no'});
    expect(withThem.passes).toBe(true);
    expect(against.passes).toBe(true); // your no changes nothing
    expect(mean_(c, aftermath(c, withThem, 'yes', false))).toBeGreaterThan(mean_(c, aftermath(c, against, 'no', false)));
    expect(mean_(c, aftermath(c, withThem, 'yes', false))).toBeGreaterThan(mean_(c, c.relations));
    expect(mean_(c, aftermath(c, against, 'no', false))).toBeLessThan(mean_(c, c.relations));
  });

  it('wins you the outcome you wanted when your vote decides, at the cost of the goodwill of the side you beat', () => {
    const c = room([wants('standing'), 5], [wants('harvest'), 5], [{harvest: 0, rest: 0, standing: 0, money: 0}, 1]);
    const yes = put(c, 'plotToBees', {you: 'yes'}, rng(3)), no = put(c, 'plotToBees', {you: 'no'}, rng(3));
    expect(yes.tally.passes).toBe(true); // you decided it
    expect(no.tally.passes).toBe(false);
    expect(yes.committee.rules.bees).toBe(1);
    expect(no.committee.rules.bees).toBe(0);
    // whichever way you go, you’ve sided against the other five
    expect(siteGoodwill(Object.values(yes.committee.relations))).toBeLessThan(siteGoodwill(Object.values(c.relations)));
    expect(siteGoodwill(Object.values(no.committee.relations))).toBeLessThan(siteGoodwill(Object.values(c.relations)));
  });

  it('costs goodwill to win as a proposer: members who lost to your motion are sour with you', () => {
    const c = room([wants('standing'), 8], [wants('harvest'), 3]);
    const mine = propose(c, 'plotToBees', {}, rng(1)), theirs = put(c, 'plotToBees', {you: 'yes'}, rng(1));
    if (typeof mine === 'string') throw new Error(mine);
    expect(mine.tally.passes).toBe(true);
    expect(siteGoodwill(Object.values(mine.committee.relations))).toBeLessThan(siteGoodwill(Object.values(theirs.committee.relations)));
    const noes = c.members.filter((m) => mine.tally.votes[m.id] === 'no');
    expect(noes.length).toBe(3);
    for (const m of noes) expect(mine.committee.relations[m.id]!.goodwill).toBeLessThan(c.relations[m.id]!.goodwill);
  });

  it('abstaining moves nobody’s goodwill', () => {
    const c = room([wants('standing'), 6], [wants('harvest'), 5]);
    const r = put(c, 'plotToBees', {you: 'abstain'}, rng(1));
    expect(r.committee.relations).toEqual(c.relations);
  });
});

describe('what the rules do to the plots', () => {
  it('trade the wet weeks against the dry ones: open queues are cheaper until the trough runs short, slots the reverse', () => {
    const slots = applyMotion(START_RULES, 'waterRota');
    expect(effects(START_RULES, 0).queueHours).toBeLessThan(effects(slots, 0).queueHours);
    expect(effects(START_RULES, 1).queueHours).toBeGreaterThan(effects(slots, 1).queueHours);
    expect(effects(START_RULES, 1).queueHours).toBeCloseTo(RULE.queueBase + RULE.queue, 9);
  });

  it('a hosepipe rule halves what the trough gives a plot, and lifting it puts it back', () => {
    const on = applyMotion(START_RULES, 'hosepipe');
    expect(effects(on).litresPerPlotDay).toBe(RULE.litres * (1 - RULE.hosepipeCut));
    expect(effects(lifted(on)).litresPerPlotDay).toBe(RULE.litres);
  });

  it('a bonfire ban ends the burning, and a bees’ plot costs a plot and adds pollination for the rest', () => {
    expect(effects(START_RULES).burnShare).toBe(RULE.burn);
    expect(effects(applyMotion(START_RULES, 'bonfireBan')).burnShare).toBe(0);
    let r = START_RULES;
    r = applyMotion(r, 'plotToBees');
    expect(effects(r).plots).toBe(PLOTS - 1);
    expect(effects(r).pollination).toBeGreaterThan(effects(START_RULES).pollination);
    for (let i = 0; i < 20; i++) r = applyMotion(r, 'plotToBees');
    expect(effects(r).plots).toBe(PLOTS - MAX_BEES); // only empty plots go, never yours or a neighbour's
  });

  it('start with nothing decided', () => {
    expect(START_RULES).toEqual({rota: 'open', bonfires: 'allowed', bees: 0, hosepipe: 'off'});
    expect(effects(START_RULES).plots).toBe(PLOTS);
  });
});

describe('burning against composting (the waste system’s Q11 seed)', () => {
  it('puts smoke and CO₂ into the air now when burnt, and a heap keeps most of the carbon and gives some back over a year', () => {
    const burn = wasteCarbon(100, 'burn'), heap = wasteCarbon(100, 'compost');
    expect(burn.now).toBeGreaterThan(heap.now * 3);
    expect(heap.later).toBeGreaterThan(20);
    expect(burn.later).toBe(0);
    expect(heap.kept).toBeGreaterThan(burn.kept * 5);
    expect(burn.now).toBeGreaterThan(heap.now + heap.later); // over the year, burning still puts more in the air
    expect(burn.now).toBeCloseTo(85, -1);
  });

  it('is linear in the waste, and the carbon in a kg is the same either way (returned plus kept)', () => {
    expect(wasteCarbon(200, 'burn').now).toBeCloseTo(2 * wasteCarbon(100, 'burn').now, 9);
    const heap = wasteCarbon(1, 'compost'), burn = wasteCarbon(1, 'burn');
    expect(heap.later + heap.kept).toBeCloseTo(WASTE.co2, 9);
    expect(burn.kept + WASTE.co2 * WASTE.burnReturned).toBeCloseTo(WASTE.co2, 9);
  });
});

describe('the committee on the graph', () => {
  const build = (): Graph => {
    const {agents} = allotment(rng(1));
    return makeGraph([
      ...agents.map((a) => ({id: a.id, kind: 'neighbour', name: a.name, levers: {[AGENT]: a as never, [RELATION]: newRelation() as never}})),
      {id: COMMITTEE, kind: 'committee', name: 'Committee', stocks: {[CAPITAL_STOCK]: {unit: 'support', amount: qty(CAPITAL.start, 'support')}, [GOODWILL_STOCK]: {unit: 'support', amount: qty(0.5, 'support')}}, levers: {[RULES]: START_RULES as never}},
    ], []);
  };
  const ctx = (g: Graph, hours = 168): TickContext => ({tick: 'week', hours, dt: 1, date: null as never, level: 2, graph: g, rng: rng(hours), flow: (f) => applyFlow(g, f), activity: () => {}});

  it('reads its members, relationships, capital and rules off the nodes', () => {
    const c = committeeOf(build());
    expect(c.members).toHaveLength(11);
    expect(c.capital).toBe(CAPITAL.start);
    expect(c.rules).toEqual(START_RULES);
    expect(Object.keys(c.relations)).toHaveLength(11);
  });

  it('brings political capital back each week with the site’s goodwill, and shows that goodwill', () => {
    const g = build();
    committee.on.week!(ctx(g));
    const a = g.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount;
    expect(a).toBeCloseTo(CAPITAL.start + CAPITAL.weekly, 9);
    expect(g.nodes[COMMITTEE]!.stocks[GOODWILL_STOCK]!.amount).toBeCloseTo(0.5, 9);
    // a well-liked player is refilled faster
    const liked = build();
    for (const n of Object.values(liked.nodes)) if (n.levers[RELATION]) n.levers[RELATION] = {goodwill: 0.9, trust: 0.5};
    committee.on.week!(ctx(liked));
    expect(liked.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount).toBeGreaterThan(a);
    // and it never goes over the cap
    for (let w = 0; w < 30; w++) committee.on.week!(ctx(liked, 168 * w));
    expect(liked.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount).toBe(CAPITAL.cap);
  });

  it('proposes on the graph: capital spent, the rules and the relationships written back, and refusals leave it alone', () => {
    const g = build();
    g.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount = qty(CAPITAL.cap, 'support');
    const r = proposeOn(g, 'hosepipe', {dryness: 1}, rng(3));
    expect(typeof r).toBe('object');
    expect(g.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount).toBe(CAPITAL.cap - MOTIONS.hosepipe.cost);
    if (typeof r === 'object') expect(rulesOf(g.nodes[COMMITTEE]).hosepipe).toBe(r.passes ? 'on' : 'off');
    const poor = build();
    poor.nodes[COMMITTEE]!.stocks[CAPITAL_STOCK]!.amount = qty(0.5, 'support');
    const before = JSON.stringify(committeeOf(poor));
    expect(typeof proposeOn(poor, 'bonfireBan', {}, rng(3))).toBe('string');
    expect(JSON.stringify(committeeOf(poor))).toBe(before);
  });

  it('refuses a plan on its rules: they are voted on', () => {
    expect(committee.command!({type: 'law', node: COMMITTEE, lever: RULES, value: null}, build(), 2)).toMatch(/voted/);
    expect(committee.command!({type: 'law', node: 'elsewhere', lever: RULES, value: null}, build(), 2)).toBeUndefined();
  });

  it('runs a week and a vote for a committee of eleven and you well inside the budget (measured in Node)', () => {
    const g = build(), c = committeeOf(g);
    for (let i = 0; i < 50; i++) committee.on.week!(ctx(g, 168 * i));
    const n = 1000, t0 = performance.now();
    let seen: Vote = 'abstain';
    for (let i = 0; i < n; i++) {
      committee.on.week!(ctx(g, 168 * (i + 50)));
      seen = hold(c, 'waterRota', {dryness: 0.5, talked: {[c.members[0]!.id]: 2}}, rng(i)).votes[c.members[0]!.id]!;
    }
    const per = (performance.now() - t0) / n;
    console.log(`committee: a week and a vote for eleven members and you take ${(per * 1000).toFixed(0)} µs (${seen})`);
    expect(per).toBeLessThan(2);
  });
});
