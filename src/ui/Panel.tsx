// The panel: beside the map on wide screens and tablets on their side, below it as a sheet on phones and tablets held
// upright (three resting heights, peek, half and tall, cycled by its button: docs/specs/ui-overhaul.md), beside it on a
// phone on its side. Its tabs are the garden's (the founding spec: Garden, Shed, Kitchen,
// Goals, each shown once it has something in it, src/data/unfold.ts): today the Garden tab (the gardener's card, the
// plan, and the places with what each holds, its pests and what happened there in the last week), the Shed tab and the
// Kitchen tab. A place's numbers unfold with their systems (moisture with the watering line, N-P-K and organic matter
// with the first compost, carbon and land with the first carbon choice, money with the first payday or sale), or all at once
// with the "Show all details" setting at the foot of the Garden tab. A number with an Explain card is a button that
// opens it.
import {useEffect, useState} from 'preact/hooks';
import type {UpgradeId} from '../data/shed';
import {CROPS} from '../data/crops';
import type {Activity} from '../sim/activity';
import type {Command} from '../sim/commands';
import type {GraphNode, NodeId} from '../sim/graph';
import {borderOf, inFlower} from '../sim/models/biodiversity';
import {cropOf, HELD, IN_WASTE, quality} from '../sim/models/crops';
import {aphidsOn, pestsOf} from '../sim/models/pests';
import {shows, unfolded} from '../data/unfold';
import {digCost} from '../data/garden';
import {TOOLS} from '../data/jobs';
import {cupboardDays} from '../sim/models/household';
import {KITCHEN, type Ledger} from '../sim/models/kitchen';
import {hasSoil, health, limitsOf, moisture, organicMatter, SOIL} from '../sim/models/soil';
import type {EffectsLog, Logged} from './effects-log';
import {unitShown} from './Explain';
import {amount, days as dayCount, effectAmount, grams, money, num} from './format';
import {GardenTab} from './GardenTab';
import {KitchenTab} from './KitchenTab';
import {ShedTab} from './ShedTab';
import {Num} from './Num';
import {isDug} from './map/draw';

const ORDER = ['bed', 'kitchen', 'gate', 'shed', 'butt', 'tap', 'heap', 'path', 'lawn'];
const rank = (n: GraphNode) => (ORDER.indexOf(n.kind) + 1 || ORDER.length + 1);

const STOCK_NAME: Record<string, string> = {
  carbon: 'Carbon', water: 'Water', money: 'Money', waste: 'Green waste', compost: 'Compost', 'nitrogen.organic': 'Nitrogen', phosphorus: 'Phosphorus', potassium: 'Potassium', 'pests.slugs': 'Slugs', 'pests.aphids': 'Aphids',
};
/** The Explain card a place's stock opens. */
function causeOf(n: GraphNode, key: string): string | undefined {
  if (key.startsWith('food.')) return n.kind === 'bed' ? 'ripening' : n.kind === 'gate' ? 'honesty box' : 'eating';
  if (key.startsWith('land.')) return 'digging';
  return ({carbon: n.kind === 'heap' ? 'composting' : 'decay', water: 'rain', money: 'money', waste: 'to the heap', compost: 'compost', 'nitrogen.organic': 'composting', phosphorus: 'composting', potassium: 'composting',
    'pests.slugs': 'slugs breeding', 'pests.aphids': 'aphids'} as Record<string, string>)[key];
}
type Row = readonly [string, string, string?];
const LAND: Record<string, string> = {crops: 'crops', grass: 'grass', built: 'built on', path: 'path', water: 'water', woodland: 'woodland'};

function about(n: GraphNode): string {
  if (n.kind !== 'bed') return '';
  const c = cropOf(n);
  if (c) return `${CROPS[c.id].name}${c.dead ? ', killed by frost' : `, quality ${quality(c)} / 100`}`;
  const grass = n.stocks['land.grass']?.amount ?? 0, crops = n.stocks['land.crops']?.amount ?? 0;
  if (grass > 1e-6 && n.levers.dig === true) return `Being dug: ${num(crops)} of ${num(grass + crops)} m²`;
  return isDug(n) ? 'Dug, ready to sow' : 'Under grass, not dug yet';
}

/** "Dig this bed" on a plot under grass, once the dug beds are all in use (`garden.dig`): what it costs in the gardener's
 *  hours, the purse and the soil's carbon, and the button that sends the plan's `dig`. Digging can be stopped. */
function DigOffer({n, open, send}: {n: GraphNode; open: boolean; send: (cmd: Command) => void}) {
  const grass = n.stocks['land.grass']?.amount ?? 0;
  if (n.kind !== 'bed' || grass <= 1e-6) return null;
  if (n.levers.dig === true)
    return <button type="button" class="dig" onClick={() => send({type: 'plan', node: n.id, lever: 'dig', value: false})}>Stop digging</button>;
  if (!open) return null;
  const hours = grass * (TOOLS.spade.jobs.dig?.per ?? 1);
  return (
    <div class="dig-offer">
      <p class="soft">About {num(hours)} h of the gardener’s time, {money(digCost(grass))} for edging and compost, and a little of the soil’s carbon.</p>
      <button type="button" class="primary dig" onClick={() => send({type: 'plan', node: n.id, lever: 'dig', value: true})}>Dig this bed</button>
    </div>
  );
}

/** A bed's or the lawn's soil: its water for roots once the watering line has unfolded, and organic matter, nutrients and
 *  health once feeding has. */
function soilRows(n: GraphNode, see: (key: string) => boolean): Row[] {
  const lim = limitsOf(n), m = moisture(n, lim), water = n.stocks[SOIL.water]?.amount ?? 0, s = n.stocks, full = water > lim.fc + 0.01 * (lim.sat - lim.fc);
  const wet: Row[] = see('garden.water') ? [['Moisture', full ? 'Full, draining' : `${Math.max(0, Math.round(100 * m))} %`, full ? 'waterlogging' : m < 0.5 ? 'drought' : 'evapotranspiration']] : [];
  if (!see('garden.soil')) return wet;
  return [
    ...wet,
    ['Organic matter', `${num(organicMatter(n))} %`, 'decay'],
    ['Nitrogen (nitrate)', grams(s[SOIL.nitrate]?.amount ?? 0), 'leaching'],
    ['Phosphorus', grams(s[SOIL.phosphorus]?.amount ?? 0), 'uptake'],
    ['Potassium', grams(s[SOIL.potassium]?.amount ?? 0), 'uptake'],
    ['Soil health', `${Math.round(health(n, lim))} / 100`, 'soil health'],
  ];
}
/** A bed's pests and flowers beyond its slug and aphid stocks. */
function pestRows(n: GraphNode, see: (key: string) => boolean): Row[] {
  if (n.kind !== 'bed') return [];
  const p = pestsOf(n), c = cropOf(n), b = borderOf(n), rows: Row[] = [], any = ['slugs', 'aphids', 'blight'].some((k) => see(`garden.${k}`));
  if (p.blight > 0 && see('garden.blight')) rows.push(['Blight', `${Math.round(100 * p.blight)} % of the tops`, 'blight']);
  const worst = p.blight > 0 ? 'blight' : aphidsOn(n) > 0 ? 'aphids' : 'slugs';
  if (any && c && c.lost > 0.005) rows.push(['Lost to pests', `${Math.round(100 * c.lost)} % of the crop`, worst]);
  if (any && p.eaten > 0.001) rows.push(['Eaten or rotted', grams(p.eaten), worst]);
  if (b) rows.push(['Border', `${CROPS[b.id].name}${inFlower(b) ? ', in flower' : ''}`, 'flowers']);
  return rows;
}
/** The soil's stocks the soil rows already show, and the nutrients a crop and its residue hold (shown as the crop and
 *  its green waste). */
const SHOWN = new Set<string>([SOIL.water, SOIL.fresh, SOIL.organicN, SOIL.nitrate, SOIL.phosphorus, SOIL.potassium, ...Object.values(HELD), ...Object.values(IN_WASTE)]);

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

/** The key a place's stock shows with: its system's (src/data/unfold.ts), or none for what's always shown. */
function keyOf(k: string, unit: string): string | null {
  if (k === 'carbon' || k === SOIL.humus || k.startsWith('land.')) return 'garden.carbon';
  if (k === 'money') return 'garden.money';
  if (k === 'nitrogen.organic' || k === 'phosphorus' || k === 'potassium') return 'garden.soil';
  if (k === 'water' && unit === 'L') return 'garden.water';
  return null;
}

function Place({n, days, log, see, dig, send, onExplain}: {
  n: GraphNode; days: number; log: EffectsLog; see: (key: string) => boolean; dig: boolean; send: (cmd: Command) => void; onExplain: (cause: string, at: string | null) => void;
}) {
  const soil = hasSoil(n);
  const rows = Object.entries(n.stocks).map(([k, s]): Row | null => {
    if (soil && SHOWN.has(k)) return null;
    if (k.startsWith('food.shop-')) return null;
    const key = keyOf(k, s.unit);
    if (key && !see(key)) return null;
    if (soil && k === SOIL.humus) return ['Carbon in the soil', amount(s), 'decay'];
    const land = k.startsWith('land.');
    if (land && !s.amount) return null;
    if (s.unit === 'pests' && (s.amount < 0.5 || !see(`garden.${s.product}`))) return null;
    const name = land ? `Land (${LAND[k.slice(5)] ?? k.slice(5)})` : STOCK_NAME[k] ?? (s.product ? s.product[0]!.toUpperCase() + s.product.slice(1) : k);
    return [name, s.unit === 'pests' ? num(Math.round(s.amount)) : s.unit === 'kgP' || s.unit === 'kgK' ? grams(s.amount) : amount(s), causeOf(n, k)];
  }).filter((r): r is Row => !!r);
  if (soil) rows.unshift(...soilRows(n, see));
  if (n.id === KITCHEN && see('garden.kitchen')) rows.push(['Food from the shop', dayCount(days), 'shop food eaten']);
  rows.push(...pestRows(n, see));
  return (
    <section class="place">
      <h3>{n.name}</h3>
      {about(n) && <p class="soft">{about(n)}</p>}
      <DigOffer n={n} open={dig} send={send} />
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

type Tab = 'garden' | 'shed' | 'kitchen';
/** A tab the goal bar's button opens, the Shed at one offer; `at` makes each tap a fresh one. */
export interface Focus {
  tab: 'garden' | 'shed';
  shed: UpgradeId | null;
  at: number;
}
/** The sheet's resting heights on a phone: its head only, about half the screen, or most of it. */
export type Sheet = 'peek' | 'half' | 'tall';
/** The sheet's button cycles up through the heights and back to its head. */
export const nextSheet = (s: Sheet): Sheet => (s === 'half' ? 'tall' : s === 'tall' ? 'peek' : 'half');
const SHEET_LABEL: Record<Sheet, string> = {peek: 'Open the panel', half: 'Open the panel fully', tall: 'Fold the panel down'};

/** A panel's head, the garden's and every level's (src/ui/AllotmentPanel.tsx): the tabs as pressed buttons, and on a sheet
 *  the button that cycles its resting heights; a tab tap opens a folded sheet. */
export function SheetHead({tabs, current, sheet, onSheet, onTab}: {
  tabs: readonly (readonly [string, string])[]; current: string; sheet: Sheet; onSheet: (s: Sheet) => void; onTab: (t: string) => void;
}) {
  return (
    <div class="panel-head">
      <h2 id="panel-title" class="visually-hidden">{tabs.find(([t]) => t === current)?.[1]}</h2>
      <div class="tabs" role="group" aria-label="Panels">
        {tabs.map(([t, label]) => (
          <button type="button" id={`tab-${t}`} aria-pressed={t === current} aria-controls="panel-body" class="tab" onClick={() => {
            onTab(t);
            if (sheet === 'peek') onSheet('half');
          }}>
            {label}
          </button>
        ))}
      </div>
      <button type="button" class="sheet-toggle" aria-expanded={sheet !== 'peek'} aria-controls="panel-body" aria-label={SHEET_LABEL[sheet]}
        title={SHEET_LABEL[sheet]} onClick={() => onSheet(nextSheet(sheet))}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {sheet === 'tall' ? <path d="M6 9l6 6 6-6" /> : <path d="M6 15l6-6 6 6" />}
        </svg>
      </button>
    </div>
  );
}

/** The tabs, and the key each shows with (null: from the start). */
const TABS: [Tab, string, string | null][] = [['garden', 'Garden', null], ['shed', 'Shed', 'garden.shed'], ['kitchen', 'Kitchen', 'garden.kitchen']];

export function Panel(props: {
  nodes: GraphNode[]; acts: Activity[]; hours: number; ledger: Ledger | null; log: EffectsLog; seen: readonly string[]; selected: NodeId | null; onSelect: (id: NodeId) => void;
  sheet: Sheet; onSheet: (s: Sheet) => void; send: (cmd: Command) => void; onExplain: (cause: string, at: string | null) => void;
  /** "Show all details": every number shows, whatever has unfolded (the sim's gates on levers stay). */
  all: boolean; onDetails: (all: boolean) => void;
  focus?: Focus | null;
}) {
  const see = (key: string) => shows(props.seen, key, props.all);
  const [tab, setTab] = useState<Tab>('garden');
  useEffect(() => void (props.focus && setTab(props.focus.tab)), [props.focus]);
  const places = props.nodes.filter((n) => n.box).sort((a, b) => rank(a) - rank(b));
  const chosen = places.find((n) => n.id === props.selected);
  // a tab shows once it has something in it
  const shown = TABS.filter(([t, , key]) => (!key || see(key)) && (t !== 'kitchen' || props.ledger));
  const current = shown.some(([t]) => t === tab) ? tab : 'garden';
  return (
    <aside class="panel" data-sheet={props.sheet} aria-labelledby="panel-title">
      <SheetHead tabs={shown.map(([t, label]) => [t, label] as const)} current={current} sheet={props.sheet} onSheet={props.onSheet} onTab={(t) => setTab(t as Tab)} />
      <div class="panel-body" id="panel-body">
        <div class="panel-content" key={current}>
          {current === 'kitchen' && props.ledger ? (
            <KitchenTab ledger={props.ledger} nodes={props.nodes} see={see} onExplain={props.onExplain} />
          ) : current === 'shed' ? (
            <ShedTab nodes={props.nodes} seen={props.seen} purse={props.nodes.find((n) => n.id === KITCHEN)?.stocks.money?.amount ?? 0} see={see} send={props.send}
              focus={props.focus?.tab === 'shed' ? props.focus : null} />
          ) : (
            <>
              <GardenTab nodes={props.nodes} acts={props.acts} hours={props.hours} seen={props.seen} job={see('household.commute')} send={props.send} onExplain={props.onExplain} />
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
              {chosen ? <Place n={chosen} days={cupboardDays(props.nodes)} log={props.log} see={see} dig={unfolded(props.seen, 'garden.dig')} send={props.send} onExplain={props.onExplain} /> : <p class="empty">Tap a place on the map, or pick one here, to see what it holds.</p>}
              <label class="check details">
                <input type="checkbox" checked={props.all} onChange={(e) => props.onDetails((e.target as HTMLInputElement).checked)} />
                Show all details
              </label>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
