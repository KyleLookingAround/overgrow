// The bed card (the playable garden, round two): no dug bed stands empty without the player's say. When one does (the
// crops model's `idle`: nothing in it and nothing in its plan sowing in the next few days), a choice in the notices'
// queue asks what's next and offers the rotation's pick for the season, or a winter crop in autumn, in one tap; in
// autumn with more than one bed empty, one tap sows them all for the winter. Closing it leaves the bed empty (its
// `fallow` lever) until the next crop. Pure, so a Vitest test holds it; App.tsx turns it into a notice.
import {CROPS, type CropId} from '../data/crops';
import {unfolded} from '../data/unfold';
import type {Command} from '../sim/commands';
import {calendar} from '../sim/clock';
import type {GraphNode, LeverValue} from '../sim/graph';
import {cropOf, idle, suggestion, winterPick, type Neighbours} from '../sim/models/crops';
import type {Snapshot} from '../sim/state';

export interface BedCard {
  bed: string;
  text: string;
  /** Each button: its label and the commands it sends. */
  actions: {label: string; cmds: Command[]}[];
  /** What closing it sends: the bed left empty, at the player's say. */
  dismiss: Command[];
}

const lower = (s: string) => s[0]!.toLowerCase() + s.slice(1);
const others = (beds: readonly GraphNode[], n: GraphNode): Neighbours => beds.flatMap((b) => (b !== n && cropOf(b) ? [cropOf(b)!.id] : []));
const plan = (n: GraphNode, lever: string, value: LeverValue): Command => ({type: 'plan', node: n.id, lever, value});

/** The winter plan for every dug bed without a winter crop yet: one command each, or none out of season. */
export function sowForWinter(snap: {nodes: readonly GraphNode[]; hours: number; seen: readonly string[]}): Command[] {
  const date = calendar(snap.hours), beds = snap.nodes.filter((n) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0);
  if (!unfolded(snap.seen, 'garden.winter')) return [];
  const taken: CropId[] = [];
  return beds.flatMap((n) => {
    if (n.levers.winter !== 'none' || n.levers.cover === 'greenhouse') return [];
    const crop = winterPick(n, date, [...others(beds, n), ...taken]);
    if (!crop) return [];
    taken.push(crop);
    return [plan(n, 'winter', crop)];
  });
}

/** The card for the first idle bed, or null when every bed is in use or has the player's say. */
export function bedCardOf(snap: Snapshot): BedCard | null {
  const date = calendar(snap.hours), beds = snap.nodes.filter((n) => n.kind === 'bed');
  const empty = beds.filter((n) => idle(n, date));
  for (const n of empty) {
    const s = suggestion(n, date, others(beds, n));
    // a winter crop only once winter crops have come up (the sim refuses the line before)
    if (!s || (s.lever === 'winter' && !unfolded(snap.seen, 'garden.winter'))) continue;
    const name = lower(CROPS[s.crop].name), actions: BedCard['actions'] = [{label: `Sow ${name}`, cmds: [plan(n, s.lever, s.crop)]}];
    if (s.lever === 'sow' && n.levers.sow !== 'rotation') actions.push({label: 'Follow the rotation', cmds: [plan(n, 'sow', 'rotation')]});
    const winter = sowForWinter(snap);
    if (s.lever === 'winter' && empty.length > 1 && winter.length > 1) actions.push({label: 'Sow every empty bed for winter', cmds: winter});
    const why = s.lever === 'sow' ? 'the rotation’s pick' : 'it stands the winter';
    return {bed: n.id, text: `${n.name} is empty. Sow ${name} (${why})?`, actions, dismiss: [plan(n, 'fallow', true)]};
  }
  return null;
}
