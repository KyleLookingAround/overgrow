// The Garden tab, leading with one headline number, the gardener's hours left today (the spec
// docs/specs/ui-overhaul.md): the gardener's card (the day's hours ticking down, the job in hand, and their work's days
// and hours once the commute has unfolded) and the plan (what to sow in
// each dug bed and from when, or the rotation, a border of flowers along its edge, the moisture below which the gardener
// waters, and the pest policy for each pest the garden's crops draw: leave, pick, trap or treat). The pest lines and
// the flowers, and the watering line, appear only once they've come up in the garden (src/data/unfold.ts): they're
// levers, so "Show all details" doesn't show them before the sim would take them. The plan changes the
// game only through `plan` and `policy` commands; the gardener picks it up at once. Each bed's line says what's true
// now (why it's empty, how long since sowing); a crop following its own family warns of its soil pests, and the slug
// policy's line says its time or money and what pests have taken (the playable garden's consequences).
import {CROP_IDS, CROPS, FLOWER_IDS, WINTER_IDS, type CropId} from '../data/crops';
import {CONTROL, POLICIES, START_POLICY, type PestId, type Policy} from '../data/pests';
import {unfolded} from '../data/unfold';
import type {Activity} from '../sim/activity';
import type {Command} from '../sim/commands';
import {GARDENER, hoursOn} from '../sim/gardener';
import type {GraphNode, LeverValue} from '../sim/graph';
import {cropOf, nextSowing, PICK_MIN, progress, ripe, stageOf} from '../sim/models/crops';
import {kitIn} from './ShedTab';
import {sowForWinter} from './bed-card';
import {commute, HOUSEHOLD, membersIn} from '../sim/models/household';
import {calendar, type CalendarDate} from '../sim/clock';
import {START} from '../data/ladder';
import {isDug} from './map/draw';
import {hourMinute, num} from './format';
import {Num} from './Num';

const name = (nodes: GraphNode[], id: string) => nodes.find((n) => n.id === id)?.name ?? id;
const lower = (s: string) => s[0]!.toLowerCase() + s.slice(1);

/** The gardener's latest activity to have started by an hour, or null. */
export function jobInHand(acts: Activity[], hours: number): Activity | null {
  let pick: Activity | null = null;
  for (const a of acts) if (a.who === GARDENER && a.start <= hours && (!pick || a.start >= pick.start)) pick = a;
  return pick;
}

/** What they're doing, in a few words. */
export function describe(a: Activity | null, nodes: GraphNode[]): string {
  if (!a) return 'By the shed';
  const place = nodes.find((n) => n.id === a.to), to = place?.name ?? a.to, product = a.carry?.product;
  const what = product ? lower(CROPS[product as CropId]?.name ?? product) : 'produce';
  // a bed is named as it is ("Bed 1"), other places as things ("the water butt")
  const the = (id: string) => (nodes.find((n) => n.id === id)?.kind === 'bed' ? name(nodes, id) : `the ${lower(name(nodes, id))}`);
  // what's being sown: from the step's own effect while it's under way, else what's now in the bed
  const crop = () => {
    const day = nodes.find((n) => n.id === GARDENER)?.levers.day as {steps?: {id: string; effect?: {crop?: string}}[]} | null | undefined;
    const id = day?.steps?.find((st) => st.id === a.id)?.effect?.crop ?? (place && cropOf(place)?.id);
    return id ? lower(CROPS[id as CropId].name) : 'seed';
  };
  switch (a.doing) {
    case 'rest':
      return 'Resting';
    case 'leave':
      return 'Off to work';
    case 'away':
      return `At work, home at ${hourMinute(a.end + START.hour)}`;
    case 'home':
      return a.carry ? 'Home from work with the week’s shop' : 'Home from work';
    case 'fetch':
      return a.carry?.unit === 'L' ? `Fetching the can from ${the(a.to)}` : a.to === 'shed' ? 'Fetching seed from the shed' : `Going to ${the(a.to)}`;
    case 'fill':
      return `Filling the can at ${the(a.to)}`;
    case 'carry':
      if (a.carry?.unit === 'L') return `Carrying water to ${to}`;
      if (a.carry?.unit === 'kgFood') return a.to === 'gate' ? `Taking ${what} to the honesty box` : `Taking ${what} to the kitchen`;
      return a.carry?.product === 'compost' ? `Bringing compost to ${to}` : 'Taking waste to the heap';
    case 'water':
      return `Watering ${to}`;
    case 'sow':
      return `Sowing ${crop()} in ${to}`;
    case 'plant':
      return `Planting ${crop()} in ${to}`;
    case 'pick':
      return `Picking ${what}`;
    case 'clear':
      return `Clearing ${a.to === 'kitchen' ? 'the kitchen scraps' : to}`;
    case 'load':
      return a.carry?.unit === 'kgFood' ? 'Filling the basket' : 'Filling the bucket';
    case 'spread':
      return `Spreading compost on ${to}`;
    case 'dig':
      return `Digging ${to}`;
    case 'torch':
      return a.from === a.to ? `Picking slugs off ${to} by torchlight` : `Out with a torch, to ${the(a.to)}`;
    case 'trap':
      return `Emptying the slug traps in ${to}`;
    case 'pellets':
      return `Scattering slug pellets on ${to}`;
    case 'squash':
      return `Squashing aphids on ${to}`;
    case 'spray':
      return `Spraying ${to}`;
    case 'deleaf':
      return `Picking blighted leaves off ${to}`;
    case 'hens':
      return 'Seeing to the hens';
    case 'preserve':
      return 'Freezing and bottling the glut';
    case 'give':
      return `Taking ${what} over the fence to the neighbour`;
    default:
      return `Walking to ${the(a.to)}`;
  }
}

const hm = (h: number) => {
  const m = Math.max(0, Math.round(h * 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
};

/** The gardener's job, once it has unfolded: the days and hours it takes them through the gate. */
function JobLine({nodes, onExplain}: {nodes: GraphNode[]; onExplain: (cause: string, at: string | null) => void}) {
  const me = membersIn(nodes.find((n) => n.id === HOUSEHOLD)).members.find((m) => m.role === 'gardener');
  const days = me ? [0, 1, 2, 3, 4, 5, 6].filter((d) => commute(me, d)) : [], c = me && days.length ? commute(me, days[0]!) : null;
  if (!c) return null;
  const v = `${days.length === 5 ? 'weekdays' : `${days.length} days a week`}, ${hourMinute(c.leaves)} to ${hourMinute(c.returns)}`;
  return <p class="soft job-line">At work <Num v={v} cause="commute" at="gate" onExplain={onExplain} label="At work" /></p>;
}

function GardenerCard({nodes, acts, hours, job, onExplain}: {nodes: GraphNode[]; acts: Activity[]; hours: number; job: boolean; onExplain: (cause: string, at: string | null) => void}) {
  const me = nodes.find((n) => n.id === GARDENER);
  if (!me) return null;
  const left = me.stocks.hours?.amount ?? 0, day = hoursOn(membersIn(nodes.find((n) => n.id === HOUSEHOLD)), calendar(hours));
  return (
    <section class="card" aria-label="The gardener">
      <h3>The gardener</h3>
      <p class="headline"><Num v={hm(left)} cause="work" at={GARDENER} onExplain={onExplain} label="Hours left today" /> <span class="headline-unit">left today</span></p>
      <div class="hours">
        <meter min={0} max={day} value={Math.min(day, left)} aria-label="The day’s hours, how much is left" />
      </div>
      <p class="job">{describe(jobInHand(acts, hours), nodes)}</p>
      {job && <JobLine nodes={nodes} onExplain={onExplain} />}
    </section>
  );
}

const FROM: [string, number | null][] = [['Whenever it’s in season', null], ['From 1 Apr', 91], ['From 15 Apr', 105], ['From 1 May', 121], ['From 15 May', 135], ['From 1 Jun', 152], ['From 1 Jul', 182], ['From 1 Aug', 213]];
const LINES: [string, number][] = [['Never', 0], ['Below a quarter', 0.25], ['Below half', 0.5], ['Below three quarters', 0.75]];

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A day of the year as a date ("1 Mar"), in a 365-day year. */
export function dayDate(t: number): string {
  const starts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  let m = 0;
  while (m < 11 && starts[m + 1]! <= t) m++;
  return `${t - starts[m]! + 1} ${MONTH[m]}`;
}
/** A crop's sowing window, as the plan's line says it ("sown 1 Mar to 15 Aug"). */
export const windowOf = (id: CropId) => {
  const c = CROPS[id], d = ([m, day]: readonly [number, number]) => `${day} ${MONTH[m - 1]}`;
  return `${c.how === 'plant' ? 'planted' : 'sown'} ${d(c.sow.from)} to ${d(c.sow.to)}`;
};

/** What a bed has in it, in a line that says what's true now: sown and waiting, growing, being picked, or empty and why. */
export function status(n: GraphNode, date: CalendarDate, hours: number): string {
  const c = cropOf(n);
  if (!c) {
    const next = nextSowing(n, date);
    if (!next) return 'Empty: its plan sows nothing';
    const soon = next.day === date.dayOfYear || next.day === date.dayOfYear + 1;
    return soon ? `Empty: ${lower(CROPS[next.crop].name)} goes in next` : `Empty: nothing sows until ${dayDate(next.day)} (${lower(CROPS[next.crop].name)})`;
  }
  const spec = CROPS[c.id], crop = spec.name, since = Math.max(0, Math.floor((hours - c.sown) / 24));
  switch (stageOf(c)) {
    case 'sown':
      return `${crop}: ${spec.how === 'plant' ? 'planted' : 'sown'} ${since === 1 ? 'a day' : `${since} days`} ago, not up yet`;
    case 'growing':
      return `${crop}: growing, ${Math.round(100 * progress(c))} % of the way`;
    case 'ready':
      if (spec.dugIn) return `${crop}: grown, dug in when the next crop is due`;
      if (ripe(n) >= PICK_MIN) return `${crop}: ready to pick`;
      return spec.harvest === 'repeat' ? `${crop}: cropping, ${num(c.made)} kg so far, more ripening` : `${crop}: picked`;
    case 'dead':
      return `${crop}: killed by frost`;
    default:
      return `${crop}: over`;
  }
}

function BedPlan({n, onPlan, flowers, winter, frame, date, hours}: {
  n: GraphNode; onPlan: (lever: string, value: LeverValue) => void; flowers: boolean; winter: boolean; frame: boolean; date: CalendarDate; hours: number;
}) {
  const sow = String(n.levers.sow ?? 'none'), from = n.levers.sowFrom as number | null, id = `plan-${n.id}`, edge = String(n.levers.edge ?? 'none');
  const cold = String(n.levers.winter ?? 'none'), covered = n.levers.cover === 'cold-frame', glass = n.levers.cover === 'greenhouse';
  return (
    <div class="bed-plan" data-bed={n.id}>
      <label for={id}>{n.name}{covered ? ', under the cold frame' : ''}{n.levers.raised === true ? ', raised' : ''}</label>
      <p class="soft bed-status">{status(n, date, hours)}</p>
      {sow in CROPS && <p class="soft">{CROPS[sow as CropId].name} {windowOf(sow as CropId)}{covered ? ', three weeks either side under the frame' : ''}</p>}
      {rotationLine(n) && <p class="soft consequence">{rotationLine(n)}</p>}
      <div class="pair">
        <select id={id} value={sow} onChange={(e) => onPlan('sow', (e.target as HTMLSelectElement).value)}>
          <option value="rotation">Follow the rotation</option>
          {CROP_IDS.filter((c) => !CROPS[c].winter && (flowers || !CROPS[c].flower || c === sow)).map((c) => (
            <option value={c}>{CROPS[c].name}</option>
          ))}
          <option value="none">Leave empty</option>
        </select>
        <select aria-label={`${n.name}: from when`} value={String(from)} onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          onPlan('sowFrom', v === 'null' ? null : Number(v));
        }}>
          {FROM.map(([label, v]) => (
            <option value={String(v)}>{label}</option>
          ))}
          {from !== null && !FROM.some(([, v]) => v === from) && <option value={String(from)}>From day {from}</option>}
        </select>
      </div>
      {winter && <details class="winter-line">
        <summary class="soft">{cold in CROPS ? `In winter: ${lower(CROPS[cold as CropId].name)}, ${windowOf(cold as CropId)}` : 'Nothing planned for the winter'}</summary>
        <select aria-label={`${n.name}: in the winter`} value={cold} onChange={(e) => onPlan('winter', (e.target as HTMLSelectElement).value)}>
          <option value="none">Nothing over the winter</option>
          {WINTER_IDS.map((c) => (
            <option value={c}>In winter: {lower(CROPS[c].name)}</option>
          ))}
        </select>
      </details>}
      {frame && !covered && !glass && <button type="button" class="plain move-frame" onClick={() => onPlan('cover', 'cold-frame')}>Move the cold frame here</button>}
      {flowers && <label class="check">
        <input type="checkbox" checked={edge !== 'none'} onChange={(e) => onPlan('edge', (e.target as HTMLInputElement).checked ? FLOWER_IDS[0]! : 'none')} />
        {CROPS[FLOWER_IDS[0]!].name} along the edge
      </label>}
    </div>
  );
}

/** What a bed's plan does to its soil, in a line: the same family again builds up its soil pests; the rotation lets them
 *  die away. */
export function rotationLine(n: GraphNode): string | null {
  const sow = n.levers.sow, history = (n.levers.history as string[] | undefined) ?? [], last = history[history.length - 1];
  if (sow === 'rotation') return 'Rotation: each family comes back every few years, so its soil pests die away';
  if (typeof sow === 'string' && sow in CROPS && CROPS[sow as CropId].family === last)
    return `Same family as its last crop: its soil pests build up (clubroot, cyst nematode, root rots)`;
  return null;
}

/** What the slug policy costs and what slugs have taken, in a line: its time or money for the dug beds, and the share of
 *  what's growing lost to pests so far. */
export function slugLine(policy: Policy, beds: GraphNode[], traps: boolean): string {
  const growing = beds.map((b) => cropOf(b)).filter((c) => c && !c.dead), n = growing.length;
  const lost = n ? Math.round((100 * growing.reduce((a, c) => a + c!.lost, 0)) / n) : 0;
  const cost = policy === 'pick' ? `about ${CONTROL.slugs.pick.minutes * n} min at dusk on a damp evening`
    : policy === 'trap' ? `about ${CONTROL.slugs.trap.minutes * n} min each morning`
    : policy === 'treat' ? `about £${(CONTROL.slugs.treat.cost * n).toFixed(2)} in pellets a fortnight` : 'no time or money';
  return `${cost[0]!.toUpperCase()}${cost.slice(1)}${traps ? ', and the beer traps catch some every night' : ''}; pests have taken ${lost} % of what’s growing`;
}

const PEST_NAME: Record<PestId, string> = {slugs: 'Slugs', aphids: 'Aphids', blight: 'Blight'};
const POLICY_NAME: Record<PestId, Record<Policy, string>> = {
  slugs: {leave: 'Leave them', pick: 'Pick at dusk by torch', trap: 'Set traps', treat: 'Scatter pellets'},
  aphids: {leave: 'Leave them to the ladybirds', pick: 'Squash by hand', trap: 'Set traps', treat: 'Spray'},
  blight: {leave: 'Leave it', pick: 'Pick off blighted leaves', trap: 'Set traps', treat: 'Spray fungicide'},
};

/** The pests the garden's crops draw, planned or growing: a policy line shows only for those (locked things hide). */
function drawn(nodes: GraphNode[]): PestId[] {
  const crops = new Set<CropId>();
  for (const n of nodes) {
    if (n.kind !== 'bed' || !isDug(n)) continue;
    const c = cropOf(n), plan = n.levers.sow;
    if (c) crops.add(c.id);
    if (plan === 'rotation') {
      for (const id of CROP_IDS) if (!CROPS[id].flower) crops.add(id);
    } else if (typeof plan === 'string' && plan in CROPS) crops.add(plan as CropId);
  }
  return (Object.keys(POLICIES) as PestId[]).filter((p) => [...crops].some((c) => CROPS[c].pests.includes(p)));
}

export function GardenTab({nodes, acts, hours, seen, job = false, send, onExplain}: {
  nodes: GraphNode[]; acts: Activity[]; hours: number; seen: readonly string[]; job?: boolean; send: (cmd: Command) => void; onExplain: (cause: string, at: string | null) => void;
}) {
  const pests = drawn(nodes).filter((p) => unfolded(seen, `garden.${p}`));
  const beds = nodes.filter((n) => n.kind === 'bed' && isDug(n)), me = nodes.find((n) => n.id === GARDENER);
  const line = Number(me?.levers.waterBelow ?? 0.5), winterAll = sowForWinter({nodes, hours, seen});
  return (
    <>
      <GardenerCard nodes={nodes} acts={acts} hours={hours} job={job} onExplain={onExplain} />
      <section class="plan" aria-labelledby="plan-title">
        <h3 id="plan-title">The plan</h3>
        {beds.map((n) => (
          <BedPlan n={n} flowers={unfolded(seen, 'garden.flowers')} winter={unfolded(seen, 'garden.winter')} frame={kitIn(nodes).owned.includes('cold-frame')}
            date={calendar(hours)} hours={hours} onPlan={(lever, value) => send({type: 'plan', node: n.id, lever, value})} />
        ))}
        {winterAll.length > 0 && <button type="button" class="plain sow-winter" onClick={() => winterAll.forEach(send)}>Sow the empty beds for winter</button>}
        {unfolded(seen, 'garden.water') && <div class="bed-plan">
          <label for="plan-water">Water when the soil’s moisture is</label>
          <select id="plan-water" value={String(line)} onChange={(e) => send({type: 'plan', node: GARDENER, lever: 'waterBelow', value: Number((e.target as HTMLSelectElement).value)})}>
            {LINES.map(([label, v]) => (
              <option value={String(v)}>{label}</option>
            ))}
          </select>
        </div>}
      </section>
      {pests.length > 0 && (
      <section class="plan pest-plan" aria-labelledby="pests-title">
        <h3 id="pests-title">Pests</h3>
        {pests.map((pest) => (
          <div class="bed-plan" key={pest}>
            <label for={`policy-${pest}`}>{PEST_NAME[pest]}</label>
            <select id={`policy-${pest}`} value={String(me?.levers[pest] ?? START_POLICY[pest])}
              onChange={(e) => send({type: 'policy', node: GARDENER, lever: pest, value: (e.target as HTMLSelectElement).value})}>
              {POLICIES[pest].map((p) => (
                <option value={p}>{POLICY_NAME[pest][p]}</option>
              ))}
            </select>
            {pest === 'slugs' && <p class="soft consequence">{slugLine((me?.levers.slugs as Policy | undefined) ?? START_POLICY.slugs, beds, kitIn(nodes).owned.includes('beer-trap'))}</p>}
          </div>
        ))}
      </section>
      )}
    </>
  );
}
