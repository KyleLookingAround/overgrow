// The Kitchen tab: the day's ask by group and what met it at the last meal, the last week's share, the week's shop (the
// pay, the shop and the rest of life, the groceries the garden saved, the days of food in the cupboard and the shop
// food's footprint), what's in the kitchen and at the honesty box, and the running totals: picked, eaten, sold (and
// what the box took), groceries saved and wasted. Each number opens its Explain card; the money shows once it has
// unfolded, groceries saved and the footprint with theirs (src/data/unfold.ts).
import {CROPS, type Group} from '../data/crops';
import {VEG} from '../data/household';
import {MEAL_HOUR} from '../data/kitchen';
import type {GraphNode} from '../sim/graph';
import {cupboardDays, HOUSEHOLD, householdLedgerIn, membersIn, people} from '../sim/models/household';
import {kitchenAsk, type Ledger} from '../sim/models/kitchen';
import {days, grams, money, num} from './format';
import {Num} from './Num';

const GROUP_NAME: Record<Group, string> = {potatoes: 'Potatoes', salads: 'Salads', tomatoes: 'Tomatoes', greens: 'Green veg'};
const pct = (x: number) => `${Math.round(100 * x)} %`;

function Held({n, title}: {n: GraphNode | undefined; title: string}) {
  const food = n ? Object.values(CROPS).map((c) => [c.name, n.stocks[`food.${c.product}`]?.amount ?? 0] as const).filter(([, kg]) => kg > 0.005) : [];
  return (
    <div class="held">
      <h4>{title}</h4>
      {food.length ? (
        <dl>
          {food.map(([k, kg]) => (
            <div class="row">
              <dt>{k}</dt>
              <dd>{grams(kg)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p class="soft">Nothing</p>
      )}
    </div>
  );
}

type Row = readonly [string, string, string];
function Rows({rows, label, onExplain}: {rows: Row[]; label?: string; onExplain: (cause: string, at: string | null) => void}) {
  return (
    <dl aria-label={label}>
      {rows.map(([k, v, cause]) => (
        <div class="row">
          <dt>{k}</dt>
          <dd><Num v={v} cause={cause} at="kitchen" onExplain={onExplain} label={k} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** The last week's shop: what came in and went out of the purse, what the garden saved, and the food's footprint. */
function Week({nodes, see, onExplain}: {nodes: GraphNode[]; see: (key: string) => boolean; onExplain: (cause: string, at: string | null) => void}) {
  const home = nodes.find((n) => n.id === HOUSEHOLD), w = householdLedgerIn(home).week, rows: Row[] = [];
  if (w && see('garden.money')) rows.push(['Pay', money(w.wages), 'wages'], ['The shop', money(w.cost), 'the weekly shop'], ['The rest of life', money(w.rest), 'the rest of life']);
  if (w && see('household.groceries')) rows.push(['Groceries saved', money(w.saved), 'groceries saved']);
  rows.push(['Food in the cupboard', days(cupboardDays(nodes)), 'shop food eaten']);
  if (w && see('household.footprint')) rows.push(['Its footprint', `${num(w.carbon)} kg CO₂e, ${Math.round(100 * w.transport)} % transport`, 'shop food carbon']);
  return (
    <section class="place" aria-labelledby="week-title">
      <h4 id="week-title">{w ? 'Last week’s shop' : 'The shop'}</h4>
      {!w && <p class="soft">The gardener shops on the way home on Friday.</p>}
      <Rows rows={rows} label="The week’s shop" onExplain={onExplain} />
    </section>
  );
}

export function KitchenTab({ledger, nodes, see, onExplain}: {ledger: Ledger; nodes: GraphNode[]; see: (key: string) => boolean; onExplain: (cause: string, at: string | null) => void}) {
  const purse = see('garden.money'), saved = householdLedgerIn(nodes.find((n) => n.id === HOUSEHOLD)).saved;
  const ask = kitchenAsk(people(membersIn(nodes.find((n) => n.id === HOUSEHOLD))));
  const ate = (g: Group) => Object.entries(ledger.ate).reduce((s, [p, kg]) => s + (Object.values(CROPS).find((c) => c.product === p)?.group === g ? kg : 0), 0);
  const week = ledger.week.length ? ledger.week.reduce((s, x) => s + x, 0) / ledger.week.length : 0;
  return (
    <>
      <section class="card" aria-labelledby="ask-title">
        <h3 id="ask-title">The day’s ask: <Num v={grams(ledger.ask)} cause="eating" at="kitchen" onExplain={onExplain} label="The day’s ask" /></h3>
        {ledger.day < 0 ? (
          <p class="soft">The household eats at {MEAL_HOUR}:00.</p>
        ) : (
          <p class="job">Met {pct(ledger.met)} at the last meal, {pct(week)} over the last week.</p>
        )}
        <dl class="ask">
          {VEG.map((g) => {
            const kg = ate(g);
            return (
              <div class="row">
                <dt>{GROUP_NAME[g]}</dt>
                <dd>
                  <meter min={0} max={ask[g]} value={Math.min(ask[g], kg)} aria-label={`${GROUP_NAME[g]} met`} /> {grams(kg)} of {grams(ask[g])}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
      <Week nodes={nodes} see={see} onExplain={onExplain} />
      <section class="place">
        <Held n={nodes.find((n) => n.id === 'kitchen')} title="In the kitchen" />
        <Held n={nodes.find((n) => n.id === 'gate')} title="In the honesty box" />
        <h4>Since the start</h4>
        <Rows
          rows={[
            ['Picked', grams(ledger.picked), 'picking'], ['Eaten', grams(ledger.eaten), 'eating'], ['Sold at the box', purse ? `${grams(ledger.sold)}, ${money(ledger.earned)}` : grams(ledger.sold), 'honesty box'],
            ...(see('household.groceries') ? [['Groceries saved', money(saved), 'groceries saved'] as const] : []), ['Gone off or rotted', grams(ledger.wasted), 'going off'],
          ]}
          onExplain={onExplain}
        />
      </section>
    </>
  );
}
