// The Explain card (the founding spec, "Explain"): tap any effect, badge or number and it says what happened, where and
// how much in the last week, the mechanism, its fast and slow effects, and the source, from the Explain table
// (src/data/explain.ts). The map pulses at the place while it's open (src/ui/map/renderer.ts).
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
          <div><dt>How</dt><dd>{e.mechanism}</dd></div>
          <div><dt>Now</dt><dd>{e.fast}</dd></div>
          <div><dt>Over time</dt><dd>{e.slow}</dd></div>
        </dl>
      </div>
    </Card>
  );
}

/** Units shown as the latest amount rather than a week's sum (a frost's degrees, flowers' m², humid hours). */
export const unitShown = (unit: string) => unit === '°C' || unit === 'm2' || unit === 'h';
