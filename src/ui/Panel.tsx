// The panel: beside the map on wide screens and tablets, below it as a sheet on portrait phones (which can fold down to
// its heading), beside it on a phone on its side. Until the garden's tabs arrive (Garden, Shed, Kitchen, Goals, each
// shown once it has something in it) it lists the garden's places and what the selected one holds.
import type {GraphNode, NodeId} from '../sim/graph';
import {amount} from './format';

const ORDER = ['bed', 'kitchen', 'shed', 'butt', 'tap', 'heap', 'path', 'lawn'];
const rank = (n: GraphNode) => (ORDER.indexOf(n.kind) + 1 || ORDER.length + 1);

const STOCK_NAME: Record<string, string> = {carbon: 'Carbon', water: 'Water', money: 'Money'};
const LAND: Record<string, string> = {crops: 'crops', grass: 'grass', built: 'built on', path: 'path', water: 'water', woodland: 'woodland'};

function about(n: GraphNode): string {
  if (n.kind !== 'bed') return '';
  return (n.stocks['land.crops']?.amount ?? 0) > 0 ? 'Dug, ready to sow' : 'Under grass, not dug yet';
}

function Place({n}: {n: GraphNode}) {
  const rows = Object.entries(n.stocks).map(([k, s]) => {
    const land = k.startsWith('land.');
    if (land && !s.amount) return null;
    const name = land ? `Land (${LAND[k.slice(5)] ?? k.slice(5)})` : STOCK_NAME[k] ?? (s.product ? s.product[0]!.toUpperCase() + s.product.slice(1) : k);
    return [name, amount(s)] as const;
  }).filter((r): r is readonly [string, string] => !!r);
  return (
    <section class="place" aria-live="polite">
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

export function Panel(props: {nodes: GraphNode[]; selected: NodeId | null; onSelect: (id: NodeId) => void; open: boolean; onToggle: () => void}) {
  const places = props.nodes.filter((n) => n.box).sort((a, b) => rank(a) - rank(b));
  const chosen = places.find((n) => n.id === props.selected);
  return (
    <aside class={props.open ? 'panel' : 'panel folded'} aria-labelledby="panel-title">
      <div class="panel-head">
        <h2 id="panel-title">Garden</h2>
        <button type="button" class="sheet-toggle" aria-expanded={props.open} aria-controls="panel-body" onClick={props.onToggle}>
          {props.open ? 'Hide' : 'Show'}
        </button>
      </div>
      <div class="panel-body" id="panel-body">
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
      </div>
    </aside>
  );
}
