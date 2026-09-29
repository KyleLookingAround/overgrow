// The Shed tab, shown once the garden first needs something from it (src/data/unfold.ts, `garden.shed`): the tools the
// gardener has, and the first thing worth having, the beer trap, with its price and what it does (src/data/shed.ts).
// Buying it and the shed's other upgrades are part 6c's.
import {TOOLS, type Tool} from '../data/jobs';
import {FIRST_OFFER} from '../data/shed';
import {GARDENER} from '../sim/gardener';
import type {GraphNode} from '../sim/graph';
import {money} from './format';

export function ShedTab({nodes}: {nodes: GraphNode[]}) {
  const tools = (nodes.find((n) => n.id === GARDENER)?.levers.tools as Tool[] | undefined) ?? [];
  return (
    <>
      <section class="card offer" aria-labelledby="offer-title" data-offer={FIRST_OFFER.id}>
        <h3 id="offer-title">Worth having next</h3>
        <p class="job">{FIRST_OFFER.name}, {money(FIRST_OFFER.price)}</p>
        <p class="soft">{FIRST_OFFER.does}</p>
      </section>
      <section class="place">
        <h3>In the shed</h3>
        <ul class="tools">
          {tools.map((t) => (
            <li>{TOOLS[t]?.name ?? t}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
