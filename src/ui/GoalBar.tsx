// The goal bar (the founding spec, "What makes the jump feel earned"; win W18): one slim line at the foot of the map,
// the first harvest counting down, then the step-up offer's three numbers over the garden's year with the one holding the
// player back named and what raises it (src/ui/goal.ts). It gives way to any card or notice over the map (win W5), and
// on a narrow map drops its three small meters.
import type {Snapshot} from '../sim/state';
import {goalLine, valueText} from './goal';

export function GoalBar({snap}: {snap: Snapshot}) {
  const g = goalLine(snap);
  return (
    <section class="goal-bar" aria-label="The goal">
      <p class="goal-text">{g.text}</p>
      {g.rows && (
        <div class="goal-rows">
          {g.rows.map((r) => (
            <meter min={0} max={1} value={r.progress} class={r.met ? 'met' : undefined} aria-label={valueText(r)} title={valueText(r)} data-key={r.key} />
          ))}
        </div>
      )}
    </section>
  );
}
