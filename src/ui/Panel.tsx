// The panel: beside the map on wide screens and tablets, below it as a sheet on portrait phones (which can fold down to
// its heading), beside it on a phone on its side. Its tabs are the garden's (the founding spec: Garden, Shed, Kitchen,
// Goals, each shown once it has something in it): today the Garden tab (the gardener's card, the plan, and the places
// with what each holds) and the Kitchen tab.
import {useState} from 'preact/hooks';
import {CROPS} from '../data/crops';
import type {Activity} from '../sim/activity';
import type {Command} from '../sim/commands';
import type {GraphNode, NodeId} from '../sim/graph';
import {cropOf, quality} from '../sim/models/crops';
import type {Ledger} from '../sim/models/kitchen';
import {hasSoil, health, limitsOf, moisture, organicMatter, SOIL} from '../sim/models/soil';
import {amount, grams, num} from './format';
import {GardenTab} from './GardenTab';
import {KitchenTab} from './KitchenTab';
import {isDug} from './map/draw';

const ORDER = ['bed', 'kitchen', 'gate', 'shed', 'butt', 'tap', 'heap', 'path', 'lawn'];
const rank = (n: GraphNode) => (ORDER.indexOf(n.kind) + 1 || ORDER.length + 1);

const STOCK_NAME: Record<string, string> = {carbon: 'Carbon', water: 'Water', money: 'Money', waste: 'Green waste', compost: 'Compost', 'nitrogen.organic': 'Nitrogen'};
const LAND: Record<string, string> = {crops: 'crops', grass: 'grass', built: 'built on', path: 'path', water: 'water', woodland: 'woodland'};

function about(n: GraphNode): string {
  if (n.kind !== 'bed') return '';
  const c = cropOf(n);
  if (c) return `${CROPS[c.id].name}${c.dead ? ', killed by frost' : `, quality ${quality(c)} / 100`}`;
  return isDug(n) ? 'Dug, ready to sow' : 'Under grass, not dug yet';
}

/** A bed's or the lawn's soil: its water for roots, organic matter, nutrients and health. */
function soilRows(n: GraphNode): (readonly [string, string])[] {
  const lim = limitsOf(n), m = moisture(n, lim), water = n.stocks[SOIL.water]?.amount ?? 0, s = n.stocks;
  return [
    ['Moisture', water > lim.fc + 0.01 * (lim.sat - lim.fc) ? 'Full, draining' : `${Math.max(0, Math.round(100 * m))} %`],
    ['Organic matter', `${num(organicMatter(n))} %`],
    ['Nitrogen (nitrate)', grams(s[SOIL.nitrate]?.amount ?? 0)],
    ['Phosphorus', grams(s[SOIL.phosphorus]?.amount ?? 0)],
    ['Potassium', grams(s[SOIL.potassium]?.amount ?? 0)],
    ['Soil health', `${Math.round(health(n, lim))} / 100`],
  ];
}
/** The soil's stocks the soil rows already show. */
const SHOWN = new Set<string>([SOIL.water, SOIL.fresh, SOIL.organicN, SOIL.nitrate, SOIL.phosphorus, SOIL.potassium]);

function Place({n}: {n: GraphNode}) {
  const soil = hasSoil(n);
  const rows = Object.entries(n.stocks).map(([k, s]) => {
    if (soil && SHOWN.has(k)) return null;
    if (soil && k === SOIL.humus) return ['Carbon in the soil', amount(s)] as const;
    const land = k.startsWith('land.');
    if (land && !s.amount) return null;
    const name = land ? `Land (${LAND[k.slice(5)] ?? k.slice(5)})` : STOCK_NAME[k] ?? (s.product ? s.product[0]!.toUpperCase() + s.product.slice(1) : k);
    return [name, amount(s)] as const;
  }).filter((r): r is readonly [string, string] => !!r);
  if (soil) rows.unshift(...soilRows(n));
  return (
    <section class="place">
      <h3>{n.name}</h3>
      {about(n) && <p class="soft">{about(n)}</p>}
      <dl>
        {rows.map(([k, v]) => (
          <div class="row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type Tab = 'garden' | 'kitchen';
const TABS: [Tab, string][] = [['garden', 'Garden'], ['kitchen', 'Kitchen']];

export function Panel(props: {
  nodes: GraphNode[]; acts: Activity[]; hours: number; ledger: Ledger | null; selected: NodeId | null; onSelect: (id: NodeId) => void;
  open: boolean; onToggle: () => void; send: (cmd: Command) => void;
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
        <div class="tabs" role="tablist" aria-label="Panels">
          {shown.map(([t, label]) => (
            <button type="button" role="tab" id={`tab-${t}`} aria-selected={t === current} aria-controls="panel-body" class="tab" onClick={() => {
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
      <div class="panel-body" id="panel-body" role="tabpanel" aria-labelledby={`tab-${current}`}>
        {current === 'kitchen' && props.ledger ? (
          <KitchenTab ledger={props.ledger} nodes={props.nodes} />
        ) : (
          <>
            <GardenTab nodes={props.nodes} acts={props.acts} hours={props.hours} send={props.send} />
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
            {chosen ? <Place n={chosen} /> : <p class="soft">Tap a place on the map, or pick one here, to see what it holds.</p>}
          </>
        )}
      </div>
    </aside>
  );
}
