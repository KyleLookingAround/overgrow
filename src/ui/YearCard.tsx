// The garden's year done (the level's end until part 7 builds the step-up): once the allotment offer's three
// requirements are met over the garden's year (src/sim/goal.ts's gardenStatus()), a card celebrates it with the
// garden's totals and what the year taught, and says the allotment is coming. "Carry on" answers it (a `card` command,
// once a save) and play carries on. It's a card over the map like the others (win W5): one at a time.
import {UPGRADES} from '../data/shed';
import type {GraphNode} from '../sim/graph';
import {kitIn} from './ShedTab';
import type {Snapshot} from '../sim/state';
import {Card} from './Card';
import {money, num} from './format';
import {PRIZE, statusOf, valueText} from './goal';

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

export function YearCard({snap, onDone}: {snap: Snapshot; onDone: () => void}) {
  const k = snap.kitchen, saved = (snap.nodes.find((n) => n.id === 'household')?.levers.ledger as {saved?: number} | undefined)?.saved ?? 0;
  const st = statusOf(snap), beds = snap.nodes.filter(dug).length;
  return (
    <Card title="A year worth a plot" kicker="The garden’s year" label="The garden’s year" onClose={onDone}
      footer={<div class="card-actions"><button type="button" class="primary" onClick={onDone}>Carry on</button></div>}>
      <div class="year-card">
        <p>The allotment committee has seen your garden’s year: {st.requirements.map((r) => valueText(r)).join(', ')}. A plot is coming.</p>
        <dl>
          <div class="row"><dt>Picked</dt><dd>{num(k?.picked ?? 0)} kg</dd></div>
          <div class="row"><dt>Eaten at home</dt><dd>{num(k?.eaten ?? 0)} kg</dd></div>
          <div class="row"><dt>Sold at the gate</dt><dd>{num(k?.sold ?? 0)} kg, {money(k?.earned ?? 0)}</dd></div>
          <div class="row"><dt>Groceries saved</dt><dd>{money(saved)}</dd></div>
          <div class="row"><dt>Beds</dt><dd>{beds}</dd></div>
        </dl>
        <h4>What the year taught</h4>
        <ul class="lessons">{lessons(snap).map((l) => <li>{l}</li>)}</ul>
        <p class="soft">{PRIZE}.</p>
      </div>
    </Card>
  );
}
