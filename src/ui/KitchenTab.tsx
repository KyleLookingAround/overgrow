// The Kitchen tab: the day's ask by group and what met it at the last meal, the last week's share, what's in the kitchen
// and at the honesty box, and the running totals: picked, eaten, sold (and what the box took) and wasted. The ask and
// the box's takings open their Explain cards.
import {CROPS, type Group} from '../data/crops';
import {ASK, MEAL_HOUR} from '../data/kitchen';
import type {GraphNode} from '../sim/graph';
import type {Ledger} from '../sim/models/kitchen';
import {grams, money} from './format';
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

export function KitchenTab({ledger, nodes, onExplain}: {ledger: Ledger; nodes: GraphNode[]; onExplain: (cause: string, at: string | null) => void}) {
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
          {(Object.keys(ASK) as Group[]).map((g) => {
            const kg = ate(g);
            return (
              <div class="row">
                <dt>{GROUP_NAME[g]}</dt>
                <dd>
                  <meter min={0} max={ASK[g]} value={Math.min(ASK[g], kg)} aria-label={`${GROUP_NAME[g]} met`} /> {grams(kg)} of {grams(ASK[g])}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
      <section class="place">
        <Held n={nodes.find((n) => n.id === 'kitchen')} title="In the kitchen" />
        <Held n={nodes.find((n) => n.id === 'gate')} title="In the honesty box" />
        <h4>Since the start</h4>
        <dl>
          {([['Picked', grams(ledger.picked), 'picking'], ['Eaten', grams(ledger.eaten), 'eating'], ['Sold at the box', `${grams(ledger.sold)}, ${money(ledger.earned)}`, 'honesty box'],
            ['Gone off or rotted', grams(ledger.wasted), 'going off']] as const).map(([k, v, cause]) => (
            <div class="row">
              <dt>{k}</dt>
              <dd><Num v={v} cause={cause} at="kitchen" onExplain={onExplain} label={k} /></dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
