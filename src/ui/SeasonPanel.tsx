// The allotment's first season in the panel (part 8), each part hidden until it unfolds (src/data/unfold.ts): the
// neighbours as a column of names with a face each (goodwill as a face until its number unfolds, trust once the first
// audit shows it); the second plot, its helper's offer and how closely they're watched, with the helper's report (never
// what they hid); the trough's water, its rota and who went short; the committee's motion as a card with its cost and
// buttons, and the room's hands once it has voted; the swap shed; and the household's hours this week. Everything the
// player does here is a command; nothing reaches into the sim.
import {useState} from 'preact/hooks';
import {HABITS, WATCH, type Watching} from '../data/agency';
import {MOTIONS} from '../data/committee';
import {MEETING, SECOND} from '../data/season';
import {shows} from '../data/unfold';
import type {Command} from '../sim/commands';
import type {Graph, GraphNode} from '../sim/graph';
import {agentOf, HELPING, relationOf, type Helping} from '../sim/models/agency';
import {COMMITTEE, rulesOf, type Vote} from '../sim/models/committee';
import {hoursLeft, keptOf, meetingOf, secondOf, shelfOf, troughOf, waterOf} from '../sim/season';
import {num} from './format';
import {Num} from './Num';
import './styles/season.css';

type Explain = (cause: string, at: string | null) => void;
interface Props {
  nodes: GraphNode[];
  seen: readonly string[];
  all: boolean;
  send: (c: Command) => void;
  onExplain: Explain;
}
const graphOf = (nodes: GraphNode[]): Graph => ({nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), edges: [], rev: 0});

/** Goodwill as a face: warm, neutral or cool. */
export function face(goodwill: number): {face: string; words: string} {
  return goodwill > 0.56 ? {face: '🙂', words: 'friendly'} : goodwill < 0.44 ? {face: '🙁', words: 'cool towards you'} : {face: '😐', words: 'neutral'};
}
/** How kept a plot looks this week, in a word. */
const keptWord = (k: number) => (k >= 0.9 ? 'kept' : k >= 0.7 ? 'a bit weedy' : k >= 0.5 ? 'weedy' : 'overgrown');
const pct = (x: number) => `${Math.round(x * 100)} %`;
const ROTA = {open: 'first come, first served', slots: 'a rota of equal shares', need: 'shared by need'} as const;
const WATCHING: Record<Watching, string> = {trust: 'Trust them', glance: `Glance (${WATCH.glance.hours} h a week)`, audit: `Audit (${WATCH.audit.hours} h a week)`};

/** The neighbours: a column of names with a face each, then goodwill's and trust's numbers as they unfold. */
export function Neighbours({nodes, seen, all, onExplain}: Omit<Props, 'send'>) {
  if (!shows(seen, 'allotment.neighbours', all)) return null;
  const people = nodes.filter((n) => agentOf(n));
  const plotOf = (id: string | null) => (id ? nodes.find((n) => n.id === id) : undefined);
  const goodwill = shows(seen, 'agency.goodwill', all), trust = shows(seen, 'agency.trust', all);
  return (
    <section class="place neighbours" aria-labelledby="neighbours-title">
      <h3 id="neighbours-title"><Num v="The neighbours" cause="a neighbour’s harvest" at={null} onExplain={onExplain} label="The neighbours" /></h3>
      <ul class="neighbour-list">
        {people.map((p) => {
          const a = agentOf(p)!, r = relationOf(p), f = face(r.goodwill), k = keptOf(plotOf(a.plot));
          const helping = !!p.levers[HELPING];
          return (
            <li class="neighbour" data-person={p.id} key={p.id}>
              <span class="neighbour-face" role="img" aria-label={f.words}>{f.face}</span>
              <span class="neighbour-name">{a.name}</span>
              <span class="soft neighbour-what">
                {HABITS[a.habit].name.toLowerCase()}{k ? `, ${keptWord(k.kept)}` : a.plot ? '' : ', no plot now'}{helping ? ', helping you' : ''}
                {goodwill ? `, goodwill ${pct(r.goodwill)}` : ''}{trust && helping ? `, you trust ${pct(r.trust)} of their word` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The second plot, the helper and their report. */
function SecondPlot({nodes, send, onExplain, seen, all}: Props) {
  const g = graphOf(nodes), n = nodes.find((x) => secondOf(x)), sp = secondOf(n);
  if (!n || !sp || !shows(seen, 'agency.helper', all)) return null;
  const helper = nodes.find((x) => x.id === sp.offer), name = helper ? agentOf(helper)?.name ?? 'A neighbour' : 'A neighbour';
  const job = helper?.levers[HELPING] as unknown as Helping | undefined;
  return (
    <section class="place second-plot" aria-labelledby="second-title" data-state={sp.taken == null ? 'offered' : sp.helper ? 'helped' : 'alone'}>
      <h3 id="second-title"><Num v="The second plot" cause="second plot offered" at={n.id} onExplain={onExplain} label="The second plot" /></h3>
      {sp.taken == null ? (
        <>
          <p>The neglected plot is going spare. Reclaiming it takes about {SECOND.hours} hours, a season or two.</p>
          <div class="card-actions">
            <button type="button" class="primary" onClick={() => send({type: 'second-plot', answer: 'take'})}>Take it on</button>
          </div>
        </>
      ) : (
        <>
          <p class="reclaim" style={{'--reclaimed': String(sp.reclaimed)}}>Reclaimed <strong>{pct(sp.reclaimed)}</strong>{sp.kg > 0 ? `, ${num(sp.kg)} kg home last week` : ''}.</p>
          {!sp.helper && !sp.refused && (
            <div class="offer">
              <p><Num v={`${name} offers to work it`} cause="offer of help" at={n.id} onExplain={onExplain} label="The helper’s offer" /> for a third of its harvest.</p>
              <div class="card-actions">
                <button type="button" class="primary" onClick={() => send({type: 'helper', answer: 'accept'})}>Accept</button>
                <button type="button" onClick={() => send({type: 'helper', answer: 'refuse'})}>Do it ourselves</button>
              </div>
            </div>
          )}
          {sp.helper && job && (
            <>
              <p class="report"><Num v={`${name} says they took ${num(sp.reported)} kg`} cause="taken home" at={n.id} onExplain={onExplain} label="The helper’s report" /> last week.</p>
              <label class="watching" for="watching">
                <Num v="Watching" cause="watching the helper" at={n.id} onExplain={onExplain} label="Watching" />
                <select id="watching" value={job.watching} onChange={(e) => send({type: 'watch', watching: (e.target as HTMLSelectElement).value as Watching})}>
                  {(Object.keys(WATCHING) as Watching[]).map((w) => <option value={w}>{WATCHING[w]}</option>)}
                </select>
              </label>
              <button type="button" class="plain let-go" onClick={() => send({type: 'helper', answer: 'let go'})}>Let them go</button>
            </>
          )}
          {!sp.helper && sp.refused && <p class="soft">You work it: {num(sp.worked)} h last week.</p>}
        </>
      )}
      <p class="soft hours"><Num v={`${num(hoursLeft(g))} h left this week`} cause="garden hours" at={null} onExplain={onExplain} label="Hours left" /></p>
    </section>
  );
}

/** The trough: its water, the rota in force, and who went short today. */
function Trough({nodes, seen, all, onExplain}: Omit<Props, 'send'>) {
  const g = graphOf(nodes), t = troughOf(g), trough = nodes.find((n) => n.id === 'trough');
  if (!t || !trough || !shows(seen, 'allotment.trough', all)) return null;
  const rota = rulesOf(g.nodes[COMMITTEE]).rota, mine = t.short.includes('plot-1'), water = trough.stocks.water;
  return (
    <section class="place trough" aria-labelledby="trough-title">
      <h3 id="trough-title"><Num v="The trough" cause="trough short" at="trough" onExplain={onExplain} label="The trough" /></h3>
      <dl>
        <div class="row"><dt>Water</dt><dd>{num(water?.amount ?? 0)} of {num(water?.cap ?? 0)} L</dd></div>
        <div class="row"><dt>Shared</dt><dd>{ROTA[rota]}</dd></div>
        <div class="row"><dt>Short today</dt><dd class={mine ? 'warn' : ''}>{t.short.length ? `${t.short.length} plot${t.short.length > 1 ? 's' : ''}${mine ? ', yours among them' : ''}` : 'none'}</dd></div>
      </dl>
    </section>
  );
}

/** The motion as a card with its cost and buttons, then the room's hands. */
function Motion({nodes, seen, all, send, onExplain}: Props) {
  const g = graphOf(nodes), m = meetingOf(g), [talk, setTalk] = useState(false);
  if (!m || !shows(seen, 'committee.panel', all)) return null;
  const mo = MOTIONS[m.motion], by = agentOf(g.nodes[m.by] ?? ({levers: {}} as GraphNode))?.name ?? 'A neighbour';
  // talking: an hour each with the three members who like you least (the ones a vote could turn)
  const members = nodes.filter((n) => agentOf(n)?.plot).sort((a, b) => relationOf(a).goodwill - relationOf(b).goodwill).slice(0, 3);
  const hours = talk ? members.length : 0, can = hoursLeft(g) >= hours;
  const vote = (answer: Vote) => send({type: 'vote', answer, ...(talk ? {talk: Object.fromEntries(members.map((p) => [p.id, 1]))} : {})});
  return (
    <section class="place motion" aria-labelledby="motion-title" data-held={m.tally ? 'yes' : 'no'}>
      <h3 id="motion-title"><Num v="The committee" cause="motion put" at="sheds" onExplain={onExplain} label="The committee" /></h3>
      <p><strong>{mo.name}.</strong> {mo.what}. Put by {by}.</p>
      {!m.tally ? (
        <>
          <label class="talk"><input type="checkbox" checked={talk} onChange={() => setTalk(!talk)} /> Talk to {members.length} members first ({members.length} h)</label>
          <div class="card-actions">
            <button type="button" class="primary" disabled={!can} onClick={() => vote('yes')}>For</button>
            <button type="button" disabled={!can} onClick={() => vote('no')}>Against</button>
            <button type="button" class="plain" disabled={!can} onClick={() => vote('abstain')}>Abstain</button>
          </div>
          <p class="soft">The meeting votes within {MEETING.days} days; if you don’t, the room decides.</p>
        </>
      ) : (
        <>
          <p class="hands" aria-label={`${m.tally.yes} for, ${m.tally.no} against, ${m.tally.abstain} abstaining`}>
            <span class="for">{'✋'.repeat(m.tally.yes)}</span> <span class="against">{'✋'.repeat(m.tally.no)}</span>
          </p>
          <p><Num v={m.tally.passes ? 'Carried' : 'Lost'} cause="vote" at="sheds" onExplain={onExplain} label="The vote" />: {m.tally.yes} for, {m.tally.no} against{m.you ? `; you ${m.you === 'yes' ? 'voted for' : m.you === 'no' ? 'voted against' : 'abstained'}` : ''}.</p>
        </>
      )}
    </section>
  );
}

/** The swap shed: leave surplus there or not, and what's been swapped. */
function Shed({nodes, seen, all, send, onExplain}: Props) {
  const g = graphOf(nodes), shelf = shelfOf(g), home = g.nodes.household;
  if (!shelf || !home || !shows(seen, 'allotment.shed', all)) return null;
  const on = home.levers.swap === 'on', stocked = Object.entries(shelf.byGroup).filter(([, kg]) => (kg ?? 0) > 0.05).map(([k]) => k);
  return (
    <section class="place swap-shed" aria-labelledby="shed-title">
      <h3 id="shed-title"><Num v="The swap shed" cause="from the swap shed" at="sheds" onExplain={onExplain} label="The swap shed" /></h3>
      <label class="swap"><input type="checkbox" checked={on} onChange={() => send({type: 'policy', node: 'household', lever: 'swap', value: on ? 'off' : 'on'})} /> Leave our surplus and take what we’re short of</label>
      <p class="soft">{shelf.took > 0 ? `${num(shelf.took)} kg swapped so far. ` : ''}{stocked.length ? `On the shelf: ${stocked.join(', ')}.` : 'The shelf is bare.'}</p>
    </section>
  );
}

/** The season's sections for the "Your plot" tab, in the order they unfold. */
export function SeasonSections(p: Props) {
  return (
    <>
      <SecondPlot {...p} />
      <Trough {...p} />
      <Motion {...p} />
      <Shed {...p} />
    </>
  );
}

/** What's still to come at the allotment, after this part. */
export const COMING = 'Coming soon at the allotment: slugs from the neglected plot in your old garden, more votes, and the allotment’s own offer.';

/** The kept-ness of a plot for the list's words (the allotment tab's rows). */
export const waterShort = (n: GraphNode) => {
  const w = waterOf(n);
  return !!w && w.need > 0 && w.given < 0.8 * w.need;
};
