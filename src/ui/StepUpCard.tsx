// The step-up card (the founding spec, "What makes the jump feel earned"): the garden's year done and its offer latched,
// the old "A year worth a plot" card becomes the choice. It shows the garden's year and what it taught, and what the
// allotment opens, listed from the same tables the game gates on (src/data/allotment.ts; win W4). "Take the plot" sends
// the step-up command and the zoom-out follows on the map; "Stay in the garden a while" answers the card and keeps the
// offer on the goal bar's place as a slim bar with the same button (the stay bar). One card at a time, like the rest.
import {CARE, LEVER_DAYS, PLOTS} from '../data/allotment';
import type {Goal} from '../sim/goal';
import type {Snapshot} from '../sim/state';
import {Card} from './Card';
import {money, num} from './format';
import {MEANING, statusOf, valueText} from './goal';
import {lessons, savedAtShop} from './YearCard';
import './styles/allotment.css';

/** Whether the garden's offer is latched (src/sim/goal.ts): the step-up card, and then the stay bar, come from it. */
export const latched = (snap: Pick<Snapshot, 'nodes' | 'level'>) =>
  snap.level === 1 && (snap.nodes.find((n) => n.id === 'kitchen')?.levers.goal as unknown as Goal | undefined)?.offered != null;

const NAME_OF = {output: 'Output', reliability: 'Reliability', health: 'Health'} as const;
const WHEN = (days: number) => (days === 0 ? 'at once' : days === 7 ? 'after a week' : `after ${Math.round(days / 7)} weeks`);

/** What the allotment opens, in lines, from the tables it gates on. */
export function opens(): string[] {
  return [
    `A plot among ${PLOTS}: your garden, carried up as one tile with its numbers.`,
    `${PLOTS - 1} neighbours, each keeping their plot as their household has time.`,
    `Your plot’s plan: its care (${CARE.options[0]}–${CARE.options.at(-1)} h a week) ${WHEN(LEVER_DAYS.care)}, its mix ${WHEN(LEVER_DAYS.mix)}, and compost or bought feed ${WHEN(LEVER_DAYS.feed)}.`,
    'A faster clock: a day passes in a few seconds.',
  ];
}

export function StepUpCard({snap, onTake, onStay}: {snap: Snapshot; onTake: () => void; onStay: () => void}) {
  const k = snap.kitchen, st = statusOf(snap);
  return (
    <Card title="A year worth a plot" kicker="The garden’s year" label="The step up" onClose={onStay}
      footer={<div class="card-actions">
        <button type="button" onClick={onStay}>Stay in the garden a while</button>
        <button type="button" class="primary step-up-take" onClick={onTake}>Take the plot</button>
      </div>}>
      <div class="year-card step-up-card">
        <p>The allotment committee has seen your garden’s year: {st.requirements.map((r) => valueText(r)).join(', ')}. A plot is yours.</p>
        <ul class="step-up-means soft">{st.requirements.map((r) => <li>{NAME_OF[r.key]}: {MEANING[r.key]}.</li>)}</ul>
        <dl>
          <div class="row"><dt>Picked</dt><dd>{num(k?.picked ?? 0)} kg</dd></div>
          <div class="row"><dt>Eaten at home</dt><dd>{num(k?.eaten ?? 0)} kg</dd></div>
          <div class="row"><dt>Saved at the shop</dt><dd>{money(savedAtShop(snap))}</dd></div>
        </dl>
        <h4>What the year taught</h4>
        <ul class="lessons">{lessons(snap).map((l) => <li>{l}</li>)}</ul>
        <h4>What the allotment opens</h4>
        <ul class="step-up-opens">{opens().map((l) => <li>{l}</li>)}</ul>
        <p class="soft">Your garden becomes a number you manage from further away: you plan it, you don’t tend it.</p>
      </div>
    </Card>
  );
}

/** The offer kept after "Stay a while": a slim bar in the goal bar's place, with the same button. */
export function StayBar({onTake}: {onTake: () => void}) {
  return (
    <section class="goal-bar stay-bar" aria-label="The allotment offer">
      <p>A plot at the allotment is yours when you want it.</p>
      <button type="button" class="primary step-up-take" onClick={onTake}>Take the plot</button>
    </section>
  );
}
