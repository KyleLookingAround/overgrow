// The panel at the allotment (level 2), in place of the garden's: beside the map on wide screens and tablets, below it as
// a sheet on portrait phones, as the garden's is. Two tabs: "Your plot", with the plot's numbers and its plan's three
// levers (care, the mix, the feed), each unfolding in turn over the first weeks and each with its Explain card, and what
// the plot has saved the household; and "The allotment", every plot with its holder and its numbers, the neglected one
// marked. The first season's sections (src/ui/SeasonPanel.tsx) sit in each tab, and a short "Coming soon" line says what's
// left for parts 9 and 10. The plan is
// sent as commands; nothing here reaches into the sim.
import {useState} from 'preact/hooks';
import {CARE, FEEDS, LEVER_DAYS, MIXES, PLAYER_PLOT, type Care, type Feed, type Mix} from '../data/allotment';
import {HABITS} from '../data/agency';
import type {Command} from '../sim/commands';
import type {GraphNode} from '../sim/graph';
import {baseOf, holderOf, leverOpen, planFor, sealedOf, type AllotmentLedger} from '../sim/allotment';
import {membersIn, weekGardenHours} from '../sim/models/household';
import {money, num} from './format';
import {Num} from './Num';
import {COMING, Neighbours, SeasonSections} from './SeasonPanel';
import './styles/allotment.css';

type Tab = 'plot' | 'allotment';

/** Which way a plot's Health is heading: toward its plan's target, a point a season at most. */
export function trend(n: GraphNode): '↑' | '↓' | '→' {
  const s = sealedOf(n), gap = s ? s.plan.health - n.totals.health : 0;
  return gap > 0.5 ? '↑' : gap < -0.5 ? '↓' : '→';
}
/** A plot's headline, as its tile and its row lead with it: Output a day, and Health with its direction. */
export const headline = (n: GraphNode) => `${num(n.totals.output * 1000)} g · ${Math.round(n.totals.health)}${trend(n)}`;
type Explain = (cause: string, at: string | null) => void;

/** The plan's levers in the panel: each option's words, and the Explain card behind the lever's name. */
const LEVERS = {
  care: {name: 'Care', cause: 'plot care', options: CARE.options.map((h) => [h, `${h} h a week`] as const)},
  mix: {name: 'The mix', cause: 'plot mix', options: (Object.keys(MIXES) as Mix[]).map((m) => [m, MIXES[m].name] as const)},
  feed: {name: 'Feed', cause: 'plot feed', options: (Object.keys(FEEDS) as Feed[]).map((f) => [f, FEEDS[f].name] as const)},
} as const;
type Lever = keyof typeof LEVERS;

/** What a lever's choice does, in a line: where Health heads, and the kg, £ and carbon a day against the plan now. */
function consequence(n: GraphNode, lever: Lever, value: string | number): string {
  const base = baseOf(n);
  if (!base) return '';
  const plan = {care: n.levers.care as Care, mix: n.levers.mix as Mix, feed: n.levers.feed as Feed};
  const now = planFor(base, plan.care, plan.mix, plan.feed);
  const then = planFor(base, (lever === 'care' ? value : plan.care) as Care, (lever === 'mix' ? value : plan.mix) as Mix, (lever === 'feed' ? value : plan.feed) as Feed);
  if (lever === 'care') return `Health heads for ${Math.round(then.health)}, a point a season.`;
  if (lever === 'mix') {
    const top = Object.entries(then.mix).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    return `${num(then.output * 1000)} g a day${top ? `, most of it ${top[0]}` : ''}.`;
  }
  return `${num(then.output * 1000)} g a day, ${money(then.upkeep)} a day, Health heads for ${Math.round(then.health)}${then.carbon > now.carbon + 1e-9 ? ', more carbon' : ''}.`;
}

function PlotTab({nodes, hours, send, onExplain, seen, all}: {nodes: GraphNode[]; hours: number; send: (c: Command) => void; onExplain: Explain; seen: readonly string[]; all: boolean}) {
  const n = nodes.find((x) => x.id === PLAYER_PLOT), home = nodes.find((x) => x.id === 'household');
  if (!n) return null;
  const t = n.totals, l = home?.levers.ledger as unknown as AllotmentLedger | undefined;
  // days by the plot's last tick, as the sim counts them for what has unfolded
  const days = l ? ((sealedOf(n)?.at ?? hours) - l.since) / 24 : 0, spare = weekGardenHours(membersIn(home));
  const open = (Object.keys(LEVERS) as Lever[]).filter((k) => leverOpen(k, Math.floor(days + 1e-9)));
  const next = (Object.keys(LEVERS) as Lever[]).find((k) => !open.includes(k));
  return (
    <>
      <section class="place" aria-labelledby="plot-title">
        <h3 id="plot-title">Your plot</h3>
        <p class="soft">Your garden’s last year, as one plot. You can’t tend its beds from here, only plan it.</p>
        <dl>
          <div class="row"><dt>Output</dt><dd><Num v={`${num(t.output * 1000)} g a day`} cause="harvest" at={n.id} onExplain={onExplain} label="Output" /></dd></div>
          <div class="row"><dt>Health</dt><dd><Num v={`${Math.round(t.health)} / 100 ${trend(n)}`} cause="plot care" at={n.id} onExplain={onExplain} label="Health" /></dd></div>
          <div class="row"><dt>Reliability</dt><dd><Num v={`${Math.round(t.reliability)} / 100`} cause="sealing" at={n.id} onExplain={onExplain} label="Reliability" /></dd></div>
          <div class="row"><dt>Upkeep</dt><dd><Num v={`${money(t.upkeep)} a day`} cause="upkeep" at={n.id} onExplain={onExplain} label="Upkeep" /></dd></div>
          <div class="row"><dt>Carbon</dt><dd><Num v={`${num(t.carbon)} kg CO₂e a day`} cause={t.carbon < 0 ? 'sink' : 'emissions'} at={n.id} onExplain={onExplain} label="Carbon" /></dd></div>
        </dl>
      </section>
      <section class="plan plot-plan" aria-labelledby="plan-title">
        <h3 id="plan-title">The plan</h3>
        {open.map((k) => {
          const lever = LEVERS[k], value = n.levers[k];
          return (
            <div class="bed-plan" key={k} data-lever={k}>
              <label for={`plot-${k}`}>
                <Num v={lever.name} cause={lever.cause} at={n.id} onExplain={onExplain} label={lever.name} />
              </label>
              <select id={`plot-${k}`} value={String(value)}
                onChange={(e) => {
                  const v = (e.target as HTMLSelectElement).value;
                  send({type: 'plan', node: PLAYER_PLOT, lever: k, value: k === 'care' ? Number(v) : v});
                }}>
                {lever.options.map(([v, words]) => <option value={String(v)}>{words}</option>)}
              </select>
              <p class="soft consequence">
                {k === 'care' ? `Of the ${num(spare)} h a week your household has for growing. ` : ''}{consequence(n, k, value as string | number)}
              </p>
            </div>
          );
        })}
        {next && <p class="soft">{LEVERS[next].name} comes up in {Math.max(1, Math.ceil(LEVER_DAYS[next] - days))} days.</p>}
      </section>
      {l && (
        <section class="place" aria-labelledby="home-title">
          <h3 id="home-title">At home</h3>
          <dl>
            <div class="row"><dt>Grown on the plot</dt><dd>{num(l.grown)} kg</dd></div>
            <div class="row"><dt>Saved at the shop</dt><dd><Num v={money(l.saved)} cause="eaten from the plot" at={n.id} onExplain={onExplain} label="Saved at the shop" /></dd></div>
          </dl>
        </section>
      )}
      <SeasonSections nodes={nodes} seen={seen} all={all} send={send} onExplain={onExplain} />
      <p class="soft coming-soon">{COMING}</p>
    </>
  );
}

function AllotmentTab({nodes, onExplain, onSelect, seen, all: details}: {nodes: GraphNode[]; onExplain: Explain; onSelect: (id: string) => void; seen: readonly string[]; all: boolean}) {
  const plots = nodes.filter((n) => n.kind === 'plot').sort((a, b) => Number(a.id.slice(5)) - Number(b.id.slice(5)));
  const all = plots.reduce((s, n) => s + n.totals.output, 0);
  return (
    <>
      <p class="soft">Twelve plots, {num(all)} kg a day between them. Each is kept as well as its household has time.</p>
      <ul class="plot-list" aria-label="The plots">
        {plots.map((n) => {
          const h = holderOf(n), mine = n.id === PLAYER_PLOT;
          return (
            <li class={mine ? 'plot-row mine' : 'plot-row'} data-plot={n.id} data-neglected={h?.neglected ? 'yes' : undefined}>
              <button type="button" class="plain plot-name" onClick={() => onSelect(n.id)}>{mine ? 'Your plot' : n.name}</button>
              <span class="soft plot-who">{mine ? 'you' : h ? `${HABITS[h.habit].name.toLowerCase()}, ${num(h.hours)} h a week${h.neglected ? ', overgrown' : ''}` : ''}</span>
              <span class="plot-num"><Num v={`${num(n.totals.output * 1000)} g`} cause={mine ? 'harvest' : 'a neighbour’s harvest'} at={n.id} onExplain={onExplain} label={`${n.name}’s Output`} /></span>
              <span class="plot-num soft">Health {Math.round(n.totals.health)}{trend(n)}</span>
            </li>
          );
        })}
      </ul>
      <Neighbours nodes={nodes} seen={seen} all={details} onExplain={onExplain} />
      <p class="soft coming-soon">{COMING}</p>
    </>
  );
}

export function AllotmentPanel(props: {
  nodes: GraphNode[]; hours: number; open: boolean; onToggle: () => void; send: (cmd: Command) => void; onExplain: Explain; onSelect: (id: string) => void;
  seen?: readonly string[]; all?: boolean;
}) {
  const seen = props.seen ?? [], all = props.all ?? false;
  const [tab, setTab] = useState<Tab>('plot');
  const tabs: [Tab, string][] = [['plot', 'Your plot'], ['allotment', 'The allotment']];
  return (
    <aside class={props.open ? 'panel allotment-panel' : 'panel allotment-panel folded'} aria-labelledby="panel-title">
      <div class="panel-head">
        <h2 id="panel-title" class="visually-hidden">{tabs.find(([t]) => t === tab)![1]}</h2>
        <div class="tabs" role="group" aria-label="Panels">
          {tabs.map(([t, label]) => (
            <button type="button" id={`tab-${t}`} aria-pressed={t === tab} aria-controls="panel-body" class="tab" onClick={() => {
              setTab(t);
              if (!props.open) props.onToggle();
            }}>{label}</button>
          ))}
        </div>
        <button type="button" class="sheet-toggle" aria-expanded={props.open} aria-controls="panel-body" onClick={props.onToggle}>
          {props.open ? 'Hide' : 'Show'}
        </button>
      </div>
      <div class="panel-body" id="panel-body">
        {tab === 'plot' ? <PlotTab nodes={props.nodes} hours={props.hours} send={props.send} onExplain={props.onExplain} seen={seen} all={all} />
          : <AllotmentTab nodes={props.nodes} onExplain={props.onExplain} seen={seen} all={all} onSelect={(id) => {
            props.onSelect(id);
            if (id === PLAYER_PLOT) setTab('plot');
          }} />}
      </div>
    </aside>
  );
}
