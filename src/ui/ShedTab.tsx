// The Shed tab, shown once the garden first needs something from it (src/data/unfold.ts, `garden.shed`): each offer that's
// worth having (its own `shed.<id>` key), with its price once money has unfolded, what it saves and what it costs besides,
// and a Buy button that sends a `buy` command (src/sim/shed.ts); then the garden's tools and kit. Offers not yet worth
// having are hidden, not greyed; one the purse can't pay for yet says how much more it needs.
import {TOOLS, type Tool} from '../data/jobs';
import {NEMATODES, UPGRADE_IDS, UPGRADES, type UpgradeId} from '../data/shed';
import {unfolded} from '../data/unfold';
import type {Command} from '../sim/commands';
import {GARDENER} from '../sim/gardener';
import type {GraphNode} from '../sim/graph';
import {NO_KIT, SHED, type Kit} from '../sim/kit';
import {money} from './format';

export const kitIn = (nodes: GraphNode[]): Kit => (nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;

/** The offers the shed shows now: unfolded, and not kept already (a pack of nematodes shows again once it's spent). */
export function offersIn(nodes: GraphNode[], seen: readonly string[]): UpgradeId[] {
  const kit = kitIn(nodes);
  return UPGRADE_IDS.filter((id) => unfolded(seen, `shed.${id}`) && !(UPGRADES[id].kept && kit.owned.includes(id)) && !(id === 'nematodes' && kit.nematodes > 0));
}

export function ShedTab({nodes, seen, purse, see, send}: {
  nodes: GraphNode[]; seen: readonly string[]; purse: number; see: (key: string) => boolean; send: (cmd: Command) => void;
}) {
  const tools = (nodes.find((n) => n.id === GARDENER)?.levers.tools as Tool[] | undefined) ?? [], kit = kitIn(nodes), offers = offersIn(nodes, seen);
  const cover = nodes.find((n) => n.kind === 'bed' && n.levers.cover);
  const priced = see('garden.money');
  return (
    <>
      {offers.length > 0 && (
        <section class="card" aria-labelledby="offers-title">
          <h3 id="offers-title">Worth having</h3>
          {offers.map((id) => {
            const u = UPGRADES[id], short = u.price - purse;
            return (
              <div class="offer" data-offer={id} key={id}>
                <p class="job"><strong>{u.name}</strong>{priced ? `, ${money(u.price)}` : ''}</p>
                <p class="soft">{u.does}</p>
                <p class="soft">Saves: {u.saves}</p>
                <p class="soft">But: {u.trade}</p>
                {short > 0 ? <p class="soft short">{money(short)} more in the purse to buy it</p> : (
                  <button type="button" class="primary buy" onClick={() => send({type: 'buy', id})}>Buy {u.name.toLowerCase()}</button>
                )}
              </div>
            );
          })}
        </section>
      )}
      <section class="place">
        <h3>In the shed</h3>
        <ul class="tools">
          {tools.filter((t) => t !== 'hose').map((t) => <li>{TOOLS[t]?.name ?? t}</li>)}
          {kit.owned.map((id) => (
            <li data-kit={id}>{UPGRADES[id].name}{id === 'cold-frame' && cover ? `, over ${cover.name}` : ''}{id === 'beer-trap' && kit.dry ? ', dry this week' : ''}</li>
          ))}
          {kit.nematodes > 0 && <li data-kit="nematodes">Nematodes in the beds, {Math.ceil(kit.nematodes)} of {NEMATODES.days} days left</li>}
        </ul>
      </section>
    </>
  );
}
