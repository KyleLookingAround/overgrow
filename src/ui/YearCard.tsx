// The garden's year: what it taught and what it saved, for the step-up card (src/ui/StepUpCard.tsx, part 7), which
// comes once the offer is latched. It's a card over the map like the others (win W5): one at a time. When the offer
// isn't won by the garden's first anniversary, "Your first year" comes instead (round three): what the garden picked,
// ate, sold, gave and wasted, what it saved at the shop and what was bought, and which of the offer's requirements is
// short, by how much, with the goal bar's next step for it; year two carries on with the bar pointing there.
import {UPGRADES} from '../data/shed';
import type {GraphNode} from '../sim/graph';
import {kitIn} from './ShedTab';
import type {Snapshot} from '../sim/state';
import {Card} from './Card';
import {money, num} from './format';
import {nextStep, RAISE, statusOf, valueText} from './goal';
import type {RequirementStatus} from '../sim/ladder';

const dug = (n: GraphNode) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0 && !((n.stocks['land.grass']?.amount ?? 0) > 1e-6);

/** What the year taught, from what the garden did: a line for each thing it did that the game is about. */
export function lessons(snap: Pick<Snapshot, 'nodes' | 'kitchen'>): string[] {
  const kit = kitIn(snap.nodes), beds = snap.nodes.filter(dug).length, out: string[] = [];
  if (kit.owned.length) out.push(`Every tool was a trade: ${kit.owned.map((id) => UPGRADES[id].name.toLowerCase()).join(', ')} bought time or crop with money.`);
  if (beds > 2) out.push(`${beds} beds from two: more to eat and sell, more to do, and a little of the soil’s carbon.`);
  if (snap.nodes.some((n) => n.kind === 'bed' && (n.levers.winter ?? 'none') !== 'none')) out.push('A winter crop kept the kitchen supplied through the thin months.');
  out.push('A garden gives back what’s put into it, in every season.');
  return out;
}

/** The groceries the garden saved since the start, £ (the household's ledger). */
export const savedAtShop = (snap: Pick<Snapshot, 'nodes'>) => (snap.nodes.find((n) => n.id === 'household')?.levers.ledger as {saved?: number} | undefined)?.saved ?? 0;

/** What was bought from the shed, in a line: each thing once, with how many where there are several. */
export function boughtLine(snap: Pick<Snapshot, 'nodes'>): string {
  const owned = kitIn(snap.nodes).owned, names = [...new Set(owned)].map((id) => {
    const n = owned.filter((x) => x === id).length;
    return n > 1 ? `${n} ${lower(UPGRADES[id].name)}s` : lower(UPGRADES[id].name);
  });
  return names.length ? names.join(', ') : 'nothing yet';
}
const lower = (s: string) => s[0]!.toLowerCase() + s.slice(1);

/** How far a requirement is short of its target, in its own terms. */
export function shortBy(r: RequirementStatus): string {
  const gap = Math.max(0, r.target - r.value);
  return r.key === 'output' ? `${Math.max(1, Math.round(1000 * gap))} g a day short` : `${Math.max(1, Math.ceil(gap))} short`;
}

/** The requirements short at the year's end, the furthest from its target first, each with the one or two things most
 *  likely to close it: the goal bar's next step for it, and what raises it in general. */
export function shortfalls(snap: Pick<Snapshot, 'nodes' | 'seen' | 'hours'>) {
  return statusOf(snap).requirements.filter((r) => !r.met).sort((a, b) => a.progress - b.progress)
    .map((r) => ({r, tips: [nextStep(snap, r.key)?.text, RAISE[r.key][0]!.toUpperCase() + RAISE[r.key].slice(1)].filter((t): t is string => !!t)}));
}

/** The garden's first year, on its anniversary, with the offer not won yet: what it did, and what's short. */
export function FirstYearCard({snap, onDone}: {snap: Snapshot; onDone: () => void}) {
  const k = snap.kitchen, short = shortfalls(snap);
  return (
    <Card title="Your first year" kicker="The garden’s year" label="Your first year" onClose={onDone}
      footer={<div class="card-actions"><button type="button" class="primary" onClick={onDone}>Into year two</button></div>}>
      <div class="year-card">
        <dl>
          <div class="row"><dt>Picked</dt><dd>{num(k?.picked ?? 0)} kg</dd></div>
          <div class="row"><dt>Eaten at home</dt><dd>{num(k?.eaten ?? 0)} kg</dd></div>
          <div class="row"><dt>Sold at the box</dt><dd>{num(k?.sold ?? 0)} kg, {money(k?.earned ?? 0)}</dd></div>
          <div class="row"><dt>Given away</dt><dd>{num(k?.given ?? 0)} kg</dd></div>
          <div class="row"><dt>Gone off</dt><dd>{num(k?.wasted ?? 0)} kg</dd></div>
          <div class="row"><dt>Saved at the shop</dt><dd>{money(savedAtShop(snap))}</dd></div>
          <div class="row"><dt>Bought</dt><dd>{boughtLine(snap)}</dd></div>
        </dl>
        <h4>For the allotment</h4>
        <ul class="lessons">
          {short.map(({r, tips}) => <li data-short={r.key}>{valueText(r)}: {shortBy(r)}. {tips.join('; or ')}.</li>)}
        </ul>
        <p class="soft">The committee looks at the garden’s last whole year: carry on, and it looks again every week.</p>
      </div>
    </Card>
  );
}
