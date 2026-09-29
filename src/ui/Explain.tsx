// The Explain card (the founding spec, "Explain"): tap any effect, badge or number and it says what happened, where and
// how much in the last week, the lever that helps, and a line each of the mechanism and the source, from the Explain
// table (src/data/explain.ts): short, so it reads at a glance (part 5's look back). The map pulses at the place while it's open (src/ui/map/renderer.ts).
// What helps with the gardener's time reads their last day (helpsFor()): hours going unused are an invitation to dig or
// sow more, and a day with none to spare asks for a tool that saves time.
import {explain, KIND_NAME} from '../data/explain';
import type {GraphNode} from '../sim/graph';
import {Card} from './Card';
import type {EffectsLog} from './effects-log';
import {effectAmount} from './format';

export interface Explaining {
  cause: string;
  at: string | null;
}

export function Explain({what, nodes, log, onClose}: {what: Explaining; nodes: readonly GraphNode[]; log: EffectsLog; onClose: () => void}) {
  const e = explain(what.cause), place = what.at ? nodes.find((n) => n.id === what.at) : undefined;
  if (!e) return null;
  // what happened here in the last week, by the causes this entry covers
  const here = what.at ? log.at(what.at).filter((x) => e.causes.includes(x.cause)) : [];
  const helps = helpsFor(what.cause, log) ?? e.helps;
  return (
    <Card title={e.title} kicker={KIND_NAME[e.kind]} onClose={onClose} footer={<p class="source"><span class="soft">Source:</span> {e.source}</p>}>
      <div class="explain" data-cause={what.cause} data-kind={e.kind}>
        <p class="says">{e.says}</p>
        {place && (
          <p class="where">
            <strong>{place.name}</strong>
            {here.length ? `, the last week: ${here.map((x) => `${x.cause} ${effectAmount(unitShown(x.unit) ? x.last : x.total, x.unit)}`).join('; ')}` : ''}
          </p>
        )}
        <dl class="explain-rows">
          <div><dt>What helps</dt><dd class="helps">{helps}</dd></div>
          <div><dt>How</dt><dd>{e.mechanism}</dd></div>
        </dl>
      </div>
    </Card>
  );
}

/** The gardener's time: what helps, from the hours that went unused yesterday (the log's latest `unused` at the
 *  gardener, noted as each new day starts), or null for any other cause. */
export function helpsFor(cause: string, log: Pick<EffectsLog, 'at'>): string | null {
  if (!['work', 'unused', 'a day’s hours'].includes(cause)) return null;
  const week = log.at('gardener');
  // nothing logged yet (a new game): the table's own line
  if (!week.some((x) => x.cause === 'work')) return null;
  const unused = week.find((x) => x.cause === 'unused')?.last ?? 0;
  if (unused >= 1) return `About ${Math.round(unused)} h went unused yesterday: room to dig another bed or sow more.`;
  if (unused < 0.25) return 'A full day, every day: a tool that saves time (a hose, a closed bin) frees hours for more.';
  return null;
}

/** Units shown as the latest amount rather than a week's sum (a frost's degrees, flowers' m², humid hours). */
export const unitShown = (unit: string) => unit === '°C' || unit === 'm2' || unit === 'h';
