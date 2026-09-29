// The Garden tab: the gardener's card (the day's hours ticking down and the job in hand) and the plan (what to sow in
// each dug bed and from when, or the rotation, a border of flowers along its edge, the moisture below which the gardener
// waters, and the pest policy for each pest the garden's crops draw: leave, pick, trap or treat). The plan changes the
// game only through `plan` and `policy` commands; the gardener picks it up at once.
import {CROP_IDS, CROPS, FLOWER_IDS, type CropId} from '../data/crops';
import {POLICIES, START_POLICY, type PestId, type Policy} from '../data/pests';
import type {Activity} from '../sim/activity';
import type {Command} from '../sim/commands';
import {GARDENER, hoursOn} from '../sim/gardener';
import type {GraphNode, LeverValue} from '../sim/graph';
import {cropOf, progress, stageOf} from '../sim/models/crops';
import {calendar} from '../sim/clock';
import {isDug} from './map/draw';
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
    default:
      return `Walking to ${the(a.to)}`;
  }
}

const hm = (h: number) => {
  const m = Math.max(0, Math.round(h * 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
};

function GardenerCard({nodes, acts, hours, onExplain}: {nodes: GraphNode[]; acts: Activity[]; hours: number; onExplain: (cause: string, at: string | null) => void}) {
  const me = nodes.find((n) => n.id === GARDENER);
  if (!me) return null;
  const left = me.stocks.hours?.amount ?? 0, day = hoursOn(calendar(hours));
  return (
    <section class="card" aria-label="The gardener">
      <h3>The gardener</h3>
      <p class="job">{describe(jobInHand(acts, hours), nodes)}</p>
      <div class="hours">
        <meter min={0} max={day} value={Math.min(day, left)} aria-label="Hours left today" />
        <span><Num v={hm(left)} cause="work" at={GARDENER} onExplain={onExplain} label="Hours left today" /> left today</span>
      </div>
    </section>
  );
}

const FROM: [string, number | null][] = [['In season', null], ['From 1 Apr', 91], ['From 15 Apr', 105], ['From 1 May', 121], ['From 15 May', 135], ['From 1 Jun', 152], ['From 1 Jul', 182], ['From 1 Aug', 213]];
const LINES: [string, number][] = [['Never', 0], ['Below a quarter', 0.25], ['Below half', 0.5], ['Below three quarters', 0.75]];

function status(n: GraphNode): string {
  const c = cropOf(n);
  if (!c) return 'Empty';
  const crop = CROPS[c.id].name;
  switch (stageOf(c)) {
    case 'sown':
      return `${crop}: sown, not up yet`;
    case 'growing':
      return `${crop}: growing, ${Math.round(100 * progress(c))} % of the way`;
    case 'ready':
      return `${crop}: ready to pick`;
    case 'dead':
      return `${crop}: killed by frost`;
    default:
      return `${crop}: over`;
  }
}

function BedPlan({n, onPlan}: {n: GraphNode; onPlan: (lever: string, value: LeverValue) => void}) {
  const sow = String(n.levers.sow ?? 'none'), from = n.levers.sowFrom as number | null, id = `plan-${n.id}`, edge = String(n.levers.edge ?? 'none');
  return (
    <div class="bed-plan">
      <label for={id}>{n.name}</label>
      <p class="soft">{status(n)}</p>
      <div class="pair">
        <select id={id} value={sow} onChange={(e) => onPlan('sow', (e.target as HTMLSelectElement).value)}>
          <option value="rotation">Follow the rotation</option>
          {CROP_IDS.map((c) => (
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
      <label class="check">
        <input type="checkbox" checked={edge !== 'none'} onChange={(e) => onPlan('edge', (e.target as HTMLInputElement).checked ? FLOWER_IDS[0]! : 'none')} />
        {CROPS[FLOWER_IDS[0]!].name} along the edge
      </label>
    </div>
  );
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

export function GardenTab({nodes, acts, hours, send, onExplain}: {nodes: GraphNode[]; acts: Activity[]; hours: number; send: (cmd: Command) => void; onExplain: (cause: string, at: string | null) => void}) {
  const beds = nodes.filter((n) => n.kind === 'bed' && isDug(n)), me = nodes.find((n) => n.id === GARDENER);
  const line = Number(me?.levers.waterBelow ?? 0.5);
  return (
    <>
      <GardenerCard nodes={nodes} acts={acts} hours={hours} onExplain={onExplain} />
      <section class="plan" aria-labelledby="plan-title">
        <h3 id="plan-title">The plan</h3>
        {beds.map((n) => (
          <BedPlan n={n} onPlan={(lever, value) => send({type: 'plan', node: n.id, lever, value})} />
        ))}
        <div class="bed-plan">
          <label for="plan-water">Water when the soil’s moisture is</label>
          <select id="plan-water" value={String(line)} onChange={(e) => send({type: 'plan', node: GARDENER, lever: 'waterBelow', value: Number((e.target as HTMLSelectElement).value)})}>
            {LINES.map(([label, v]) => (
              <option value={String(v)}>{label}</option>
            ))}
          </select>
        </div>
      </section>
      <section class="plan pest-plan" aria-labelledby="pests-title">
        <h3 id="pests-title">Pests</h3>
        {drawn(nodes).map((pest) => (
          <div class="bed-plan">
            <label for={`policy-${pest}`}>{PEST_NAME[pest]}</label>
            <select id={`policy-${pest}`} value={String(me?.levers[pest] ?? START_POLICY[pest])}
              onChange={(e) => send({type: 'policy', node: GARDENER, lever: pest, value: (e.target as HTMLSelectElement).value})}>
              {POLICIES[pest].map((p) => (
                <option value={p}>{POLICY_NAME[pest][p]}</option>
              ))}
            </select>
          </div>
        ))}
      </section>
    </>
  );
}
