// The Shed tab, shown once the garden first needs something from it (src/data/unfold.ts, `garden.shed`): each offer that's
// worth having (its own `shed.<id>` key), with its price (a price tag, shown before the purse is), what it saves and what
// it costs besides, and a Buy button that sends a `buy` command (src/sim/shed.ts); then the garden's tools and kit. Offers
// not yet worth having are hidden, not greyed; one the purse can't pay for yet says so, and a big buy shows how far the
// purse has saved towards it. It reads as a shop (the spec docs/specs/ui-overhaul.md): the purse's line at the top, once
// money has unfolded (src/sim/purse.ts: the week's money in and out, and the last big spend), then the next big buy to
// save for with its meter, so one is always in sight, then each offer as a row with its name and price on one line.
// The goal bar's button can open the tab at one offer (`focus`), which it scrolls to and marks.
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
/** How long an offer the goal bar opened the tab at stays marked, ms. */
const FOCUS_MS = 4000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ShedTab({nodes, seen, purse, see, send, focus}: {
  nodes: GraphNode[]; seen: readonly string[]; purse: number; see: (key: string) => boolean; send: (cmd: Command) => void; focus?: Focus | null;
}) {
  const tools = (nodes.find((n) => n.id === GARDENER)?.levers.tools as Tool[] | undefined) ?? [], kit = kitIn(nodes), offers = offersIn(nodes, seen);
  const covered = (id: string) => nodes.find((n) => n.kind === 'bed' && n.levers.cover === id);
  const purseShown = see('garden.money'), next = savingFor(offers);
  // the shop's order (docs/specs/ui-overhaul.md, "Presenting a lot of information"): the next thing to save for, then
  // what the purse can pay for now, and the rest behind one line, opened when the goal bar points into it
  const rest = offers.filter((id) => id !== next && UPGRADES[id].price > purse);
  const listed = [...(next ? [next] : []), ...offers.filter((id) => id !== next && UPGRADES[id].price <= purse)];
  const restOpen = !!focus?.shed && rest.includes(focus.shed);
  const offer = (id: UpgradeId) => {
    const u = UPGRADES[id], short = u.price - purse;
    return (
      <div class={focus?.shed === id && Date.now() - focus.at < FOCUS_MS ? 'offer focus' : 'offer'} data-offer={id} key={id}>
        <p class="offer-name job"><strong>{u.name}</strong></p>
        <p class="offer-price">{money(u.price)}</p>
        <p class="offer-does soft">{u.does}</p>
        <dl class="offer-rows">
          <dt>Saves</dt><dd class="soft">{u.saves}</dd>
          <dt>But</dt><dd class="soft">{u.trade}</dd>
        </dl>
        <div class="offer-foot">
          {short > 0 && u.big && purseShown && <meter class="saving" min={0} max={u.price} value={Math.max(0, purse)} aria-label={`Saved towards the ${u.name.toLowerCase()}`} />}
          {short > 0 ? <p class="soft short">{purseShown ? `${money(short)} more in the purse to buy it` : 'Not enough in the purse yet'}</p> : (
            <button type="button" class="primary buy" onClick={() => send({type: 'buy', id})}>Buy {u.name.toLowerCase()}</button>
          )}
        </div>
      </div>
    );
  };
  // the goal bar's button: the offer it points at scrolled into view
  useEffect(() => {
    if (!focus?.shed) return;
    document.querySelector(`[data-offer="${focus.shed}"]`)?.scrollIntoView({block: 'nearest'});
  }, [focus]);
  return (
    <>
      <section class="shop" aria-labelledby="offers-title">
        <h3 id="offers-title">Worth having</h3>
        {purseShown && <PurseLine nodes={nodes} />}
        {purseShown && next && purse < UPGRADES[next].price && (
          <p class="saving-for">
            Saving for: {UPGRADES[next].name.toLowerCase()}, {money(UPGRADES[next].price - purse)} to go.
            <meter min={0} max={UPGRADES[next].price} value={Math.max(0, purse)} aria-label={`Saved towards the ${UPGRADES[next].name.toLowerCase()}`} />
          </p>
        )}
        {!offers.length && <p class="empty">Nothing to buy yet: the shed fills as the garden needs things.</p>}
        {listed.map(offer)}
        {rest.length > 0 && (
          <details class="shop-rest" open={restOpen}>
            <summary class="soft">{rest.length === 1 ? 'One more to save for' : `${rest.length} more to save for`}</summary>
            {rest.map(offer)}
          </details>
        )}
      </section>
      <section class="place">
        <h3>In the shed</h3>
        <ul class="tools">
          {tools.filter((t) => t !== 'hose' && t !== 'fork').map((t) => <li>{TOOLS[t]?.name ?? t}</li>)}
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
