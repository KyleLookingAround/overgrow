// The Shed tab, shown once the garden first needs something from it (src/data/unfold.ts, `garden.shed`): each offer that's
// worth having (its own `shed.<id>` key), with its price (a price tag, shown before the purse is), what it saves and what
// it costs besides, and a Buy button that sends a `buy` command (src/sim/shed.ts); then the garden's tools and kit. Offers
// not yet worth having are hidden, not greyed; one the purse can't pay for yet says so, and a big buy shows how far the
// purse has saved towards it. Above them, once money has unfolded, the purse's line (src/sim/purse.ts): the week's money
// in and out, and the last big spend; and the next big buy to save for, so one is always in sight. The goal bar's button
// can open the tab at one offer (`focus`), which it scrolls to and marks.
import {TOOLS, type Tool} from '../data/jobs';
import {useEffect} from 'preact/hooks';
import {CORDON, NEMATODES, UPGRADE_IDS, UPGRADES, type UpgradeId} from '../data/shed';
import {calendar} from '../sim/clock';
import {KITCHEN} from '../sim/models/kitchen';
import {PURSE, type Purse} from '../sim/purse';
import type {Focus} from './Panel';
import {unfolded} from '../data/unfold';
import type {Command} from '../sim/commands';
import {GARDENER} from '../sim/gardener';
import type {GraphNode} from '../sim/graph';
import {NO_KIT, SHED, type Kit} from '../sim/kit';
import {money} from './format';
import {isDug} from './map/draw';

export const kitIn = (nodes: GraphNode[]): Kit => (nodes.find((n) => n.id === SHED)?.levers.kit as unknown as Kit | undefined) ?? NO_KIT;

/** The offers the shed shows now: unfolded, and not kept already (a pack of nematodes shows again once it's spent). */
export function offersIn(nodes: GraphNode[], seen: readonly string[]): UpgradeId[] {
  const kit = kitIn(nodes), unraised = nodes.some((n) => n.kind === 'bed' && isDug(n) && n.levers.raised !== true && n.levers.cover !== 'greenhouse');
  const cordons = kit.owned.filter((x) => x === 'cordon').length;
  return UPGRADE_IDS.filter((id) => unfolded(seen, `shed.${id}`) && !(UPGRADES[id].kept && kit.owned.includes(id)) && !(id === 'nematodes' && kit.nematodes > 0) &&
    !(id === 'raised-bed' && !unraised) && !(id === 'cordon' && (!kit.bare || cordons >= CORDON.most)));
}

/** The big buys in the order they're worth saving for: eggs, then glass, then fruit. */
export const BIG_ORDER: readonly UpgradeId[] = ['hens', 'greenhouse', 'fruit-cage'];
/** The next big buy to save for: the first on offer that isn't bought. */
export const savingFor = (offers: readonly UpgradeId[]) => BIG_ORDER.find((id) => offers.includes(id)) ?? null;

/** The purse's line: the week's money in and out, and the last big spend with its date. */
function PurseLine({nodes}: {nodes: GraphNode[]}) {
  const p = nodes.find((n) => n.id === KITCHEN)?.levers[PURSE] as unknown as Purse | undefined;
  if (!p) return null;
  const w = p.now.in || p.now.out || !p.last ? p.now : p.last, d = p.big && calendar(p.big.hours);
  return (
    <p class="soft purse-line" data-purse>
      {w === p.now ? 'This week' : 'Last week'}: {money(w.in)} in, {money(w.out)} out.
      {p.big && d && ` Last big spend: ${p.big.what.toLowerCase()}, ${money(p.big.gbp)} on ${d.day} ${MONTHS[d.month - 1]}.`}
    </p>
  );
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ShedTab({nodes, seen, purse, see, send, focus}: {
  nodes: GraphNode[]; seen: readonly string[]; purse: number; see: (key: string) => boolean; send: (cmd: Command) => void; focus?: Focus | null;
}) {
  const tools = (nodes.find((n) => n.id === GARDENER)?.levers.tools as Tool[] | undefined) ?? [], kit = kitIn(nodes), offers = offersIn(nodes, seen);
  const covered = (id: string) => nodes.find((n) => n.kind === 'bed' && n.levers.cover === id);
  const purseShown = see('garden.money'), next = savingFor(offers);
  // the goal bar's button: the offer it points at scrolled into view
  useEffect(() => {
    if (!focus?.shed) return;
    document.querySelector(`[data-offer="${focus.shed}"]`)?.scrollIntoView({block: 'nearest'});
  }, [focus]);
  return (
    <>
      {offers.length > 0 && (
        <section class="card" aria-labelledby="offers-title">
          <h3 id="offers-title">Worth having</h3>
          {purseShown && <PurseLine nodes={nodes} />}
          {purseShown && next && purse < UPGRADES[next].price && <p class="soft saving-for">Saving for: {UPGRADES[next].name.toLowerCase()}, {money(UPGRADES[next].price - purse)} to go.</p>}
          {offers.map((id) => {
            const u = UPGRADES[id], short = u.price - purse;
            return (
              <div class={focus?.shed === id ? 'offer focus' : 'offer'} data-offer={id} key={id}>
                <p class="job"><strong>{u.name}</strong>, {money(u.price)}</p>
                <p class="soft">{u.does}</p>
                <p class="soft">Saves: {u.saves}</p>
                <p class="soft">But: {u.trade}</p>
                {short > 0 && u.big && purseShown && <meter class="saving" min={0} max={u.price} value={Math.max(0, purse)} aria-label={`Saved towards the ${u.name.toLowerCase()}`} />}
                {short > 0 ? <p class="soft short">{purseShown ? `${money(short)} more in the purse to buy it` : 'Not enough in the purse yet'}</p> : (
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
          {[...new Set(kit.owned)].map((id) => {
            const n = kit.owned.filter((x) => x === id).length;
            return <li data-kit={id}>{n > 1 ? `${UPGRADES[id].name}s, ${n}` : UPGRADES[id].name}{(id === 'cold-frame' || id === 'cloches') && covered(id) ? `, over ${covered(id)!.name}` : ''}{id === 'beer-trap' && kit.dry ? ', dry this week' : ''}</li>;
          })}
          {kit.nematodes > 0 && <li data-kit="nematodes">Nematodes in the beds, {Math.ceil(kit.nematodes)} of {NEMATODES.days} days left</li>}
        </ul>
      </section>
    </>
  );
}
