// The panel: beside the map on wide screens and tablets, below it as a sheet on portrait phones (which can fold down to
// its heading), beside it on a phone on its side. Its tabs are the garden's (the founding spec: Garden, Shed, Kitchen,
// Goals, each shown once it has something in it): today the Garden tab (the gardener's card, the plan, and the places
// with what each holds, its pests and what happened there in the last week) and the Kitchen tab. A number with an Explain
// card is a button that opens it.
import {useState} from 'preact/hooks';
import {CROPS} from '../data/crops';
import type {Activity} from '../sim/activity';
import type {Command} from '../sim/commands';
import type {GraphNode, NodeId} from '../sim/graph';
import {borderOf, inFlower} from '../sim/models/biodiversity';
import {cropOf, quality} from '../sim/models/crops';
import {pestsOf} from '../sim/models/pests';
import {unfolded} from '../data/unfold';
import type {Ledger} from '../sim/models/kitchen';
import {hasSoil, health, limitsOf, moisture, organicMatter, SOIL} from '../sim/models/soil';
import type {EffectsLog, Logged} from './effects-log';
import {unitShown} from './Explain';
import {amount, effectAmount, grams, num} from './format';
import {GardenTab} from './GardenTab';
import {KitchenTab} from './KitchenTab';
import {Num} from './Num';
import {isDug} from './map/draw';

const ORDER = ['bed', 'kitchen', 'gate', 'shed', 'butt', 'tap', 'heap', 'path', 'lawn'];
const rank = (n: GraphNode) => (ORDER.indexOf(n.kind) + 1 || ORDER.length + 1);

const STOCK_NAME: Record<string, string> = {
  carbon: 'Carbon', water: 'Water', money: 'Money', waste: 'Green waste', compost: 'Compost', 'nitrogen.organic': 'Nitrogen', 'pests.slugs': 'Slugs', 'pests.aphids': 'Aphids',
};
/** The Explain card a place's stock opens. */
function causeOf(n: GraphNode, key: string): string | undefined {
  if (key.startsWith('food.')) return n.kind === 'bed' ? 'ripening' : n.kind === 'gate' ? 'honesty box' : 'eating';
  if (key.startsWith('land.')) return 'digging';
  return ({carbon: n.kind === 'heap' ? 'composting' : 'decay', water: 'rain', money: 'money', waste: 'to the heap', compost: 'compost', 'nitrogen.organic': 'composting',
    'pests.slugs': 'slugs breeding', 'pests.aphids': 'aphids'} as Record<string, string>)[key];
}
type Row = readonly [string, string, string?];
const LAND: Record<string, string> = {crops: 'crops', grass: 'grass', built: 'built on', path: 'path', water: 'water', woodland: 'woodland'};

function about(n: GraphNode): string {
  if (n.kind !== 'bed') return '';
  const c = cropOf(n);
  if (c) return `${CROPS[c.id].name}${c.dead ? ', killed by frost' : `, quality ${quality(c)} / 100`}`;
  return isDug(n) ? 'Dug, ready to sow' : 'Under grass, not dug yet';
}

/** A bed's or the lawn's soil: its water for roots, organic matter, nutrients and health. */
function soilRows(n: GraphNode): Row[] {
  const lim = limitsOf(n), m = moisture(n, lim), water = n.stocks[SOIL.water]?.amount ?? 0, s = n.stocks, full = water > lim.fc + 0.01 * (lim.sat - lim.fc);
  return [
    ['Moisture', full ? 'Full, draining' : `${Math.max(0, Math.round(100 * m))} %`, full ? 'waterlogging' : m < 0.5 ? 'drought' : 'evapotranspiration'],
    ['Organic matter', `${num(organicMatter(n))} %`, 'decay'],
    ['Nitrogen (nitrate)', grams(s[SOIL.nitrate]?.amount ?? 0), 'leaching'],
    ['Phosphorus', grams(s[SOIL.phosphorus]?.amount ?? 0), 'uptake'],
    ['Potassium', grams(s[SOIL.potassium]?.amount ?? 0), 'uptake'],
    ['Soil health', `${Math.round(health(n, lim))} / 100`, 'soil health'],
  ];
}
/** A bed's pests and flowers beyond its slug and aphid stocks. */
function pestRows(n: GraphNode, seen: readonly string[]): Row[] {
  if (n.kind !== 'bed') return [];
  const p = pestsOf(n), c = cropOf(n), b = borderOf(n), rows: Row[] = [], any = ['slugs', 'aphids', 'blight'].some((k) => unfolded(seen, `pests.${k}`));
  if (p.blight > 0 && unfolded(seen, 'pests.blight')) rows.push(['Blight', `${Math.round(100 * p.blight)} % of the tops`, 'blight']);
  if (any && c && c.lost > 0.005) rows.push(['Lost to pests', `${Math.round(100 * c.lost)} % of the crop`, 'slugs']);
  if (any && p.eaten > 0.001) rows.push(['Eaten or rotted', grams(p.eaten), 'slugs']);
  if (b) rows.push(['Border', `${CROPS[b.id].name}${inFlower(b) ? ', in flower' : ''}`, 'flowers']);
  return rows;
}
/** The soil's stocks the soil rows already show. */
const SHOWN = new Set<string>([SOIL.water, SOIL.fresh, SOIL.organicN, SOIL.nitrate, SOIL.phosphorus, SOIL.potassium]);

/** What happened at a place in the last week, each opening its Explain card: the most recent ten. */
function Lately({n, log, onExplain}: {n: GraphNode; log: EffectsLog; onExplain: (cause: string, at: string | null) => void}) {
  const seen = new Set<string>(), shown = (e: Logged) => effectAmount(unitShown(e.unit) ? e.last : e.total, e.unit);
  // the most recent ten, one a cause, leaving out what rounds to nothing
  const items = log.at(n.id).filter((e) => e.kind !== 'unknown' && !/^[−-]?0( |$)/.test(shown(e)) && !seen.has(e.cause) && (seen.add(e.cause), true)).slice(0, 10);
  if (!items.length) return null;
  return (
    <>
      <h4>In the last week</h4>
      <ul class="lately" aria-label={`What happened at ${n.name} in the last week`}>
        {items.map((e) => (
          <li>
            <button type="button" class="effect" data-cause={e.cause} data-kind={e.kind} onClick={() => onExplain(e.cause, n.id)}>
              {e.cause[0]!.toUpperCase() + e.cause.slice(1)} <span class="soft">{shown(e)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Place({n, log, seen, onExplain}: {n: GraphNode; log: EffectsLog; seen: readonly string[]; onExplain: (cause: string, at: string | null) => void}) {
  const soil = hasSoil(n);
  const rows = Object.entries(n.stocks).map(([k, s]): Row | null => {
    if (soil && SHOWN.has(k)) return null;
    if (soil && k === SOIL.humus) return ['Carbon in the soil', amount(s), 'decay'];
    const land = k.startsWith('land.');
    if (land && !s.amount) return null;
    if (s.unit === 'pests' && (s.amount < 0.5 || !unfolded(seen, `pests.${s.product}`))) return null;
    const name = land ? `Land (${LAND[k.slice(5)] ?? k.slice(5)})` : STOCK_NAME[k] ?? (s.product ? s.product[0]!.toUpperCase() + s.product.slice(1) : k);
    return [name, s.unit === 'pests' ? num(Math.round(s.amount)) : amount(s), causeOf(n, k)];
  }).filter((r): r is Row => !!r);
  if (soil) rows.unshift(...soilRows(n));
  rows.push(...pestRows(n, seen));
  return (
    <section class="place">
      <h3>{n.name}</h3>
      {about(n) && <p class="soft">{about(n)}</p>}
      <dl>
        {rows.map(([k, v, cause]) => (
          <div class="row">
            <dt>{k}</dt>
            <dd><Num v={v} cause={cause} at={n.id} onExplain={onExplain} label={k} /></dd>
          </div>
        ))}
      </dl>
      <Lately n={n} log={log} onExplain={onExplain} />
    </section>
  );
}

type Tab = 'garden' | 'kitchen';
const TABS: [Tab, string][] = [['garden', 'Garden'], ['kitchen', 'Kitchen']];

export function Panel(props: {
  nodes: GraphNode[]; acts: Activity[]; hours: number; ledger: Ledger | null; log: EffectsLog; seen: readonly string[]; selected: NodeId | null; onSelect: (id: NodeId) => void;
  open: boolean; onToggle: () => void; send: (cmd: Command) => void; onExplain: (cause: string, at: string | null) => void;
}) {
  const [tab, setTab] = useState<Tab>('garden');
  const places = props.nodes.filter((n) => n.box).sort((a, b) => rank(a) - rank(b));
  const chosen = places.find((n) => n.id === props.selected);
  // a tab shows once it has something in it
  const shown = TABS.filter(([t]) => t !== 'kitchen' || props.ledger);
  const current = shown.some(([t]) => t === tab) ? tab : 'garden';
  return (
    <aside class={props.open ? 'panel' : 'panel folded'} aria-labelledby="panel-title">
      <div class="panel-head">
        <h2 id="panel-title" class="visually-hidden">{shown.find(([t]) => t === current)![1]}</h2>
        <div class="tabs" role="group" aria-label="Panels">
          {shown.map(([t, label]) => (
            <button type="button" id={`tab-${t}`} aria-pressed={t === current} aria-controls="panel-body" class="tab" onClick={() => {
              setTab(t);
              if (!props.open) props.onToggle();
            }}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" class="sheet-toggle" aria-expanded={props.open} aria-controls="panel-body" onClick={props.onToggle}>
          {props.open ? 'Hide' : 'Show'}
        </button>
      </div>
      <div class="panel-body" id="panel-body">
        {current === 'kitchen' && props.ledger ? (
          <KitchenTab ledger={props.ledger} nodes={props.nodes} onExplain={props.onExplain} />
        ) : (
          <>
            <GardenTab nodes={props.nodes} acts={props.acts} hours={props.hours} seen={props.seen} send={props.send} onExplain={props.onExplain} />
            <h3 class="places-title">Places</h3>
            <ul class="places" aria-label="Places in the garden">
              {places.map((n) => (
                <li>
                  <button type="button" class="place-button" aria-pressed={n.id === props.selected} onClick={() => props.onSelect(n.id)}>
                    {n.name}
                  </button>
                </li>
              ))}
            </ul>
            {chosen ? <Place n={chosen} log={props.log} seen={props.seen} onExplain={props.onExplain} /> : <p class="soft">Tap a place on the map, or pick one here, to see what it holds.</p>}
          </>
        )}
      </div>
    </aside>
  );
}
