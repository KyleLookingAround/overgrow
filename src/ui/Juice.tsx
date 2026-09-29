// The map's small rewards over their places (src/ui/juice.ts says which): a ring pulsing where a purchase stands, a coin
// rising from the honesty box to the purse, a burst of leaves over the first harvest's bed, and seed dropping on a bed as
// it's sown. Placed by the map's camera like the badges; the layer lets taps through. Still under reduced motion.
import type {GraphNode} from '../sim/graph';
import type {Camera} from './map/draw';
import type {Juice} from './juice';

export function JuiceLayer({list, nodes, cam}: {list: readonly Juice[]; nodes: readonly GraphNode[]; cam: Camera | null}) {
  if (!cam || !list.length) return null;
  return (
    <div class="juice" aria-hidden="true">
      {list.map((j) => {
        const b = nodes.find((n) => n.id === j.at)?.box;
        if (!b) return null;
        const x = cam.x + (b.x + b.w / 2) * cam.s, y = cam.y + (b.y + b.h / 2) * cam.s, w = b.w * cam.s, h = b.h * cam.s;
        const style = j.kind === 'pulse' ? {left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px`} : {left: `${x}px`, top: `${y}px`};
        return (
          <span class={`juice-${j.kind}`} style={style} key={j.id} data-at={j.at}>
            {j.kind === 'burst' && [0, 1, 2, 3, 4, 5].map((i) => <i style={{'--a': `${i * 60}deg`}} />)}
            {j.kind === 'seed' && [0, 1, 2].map((i) => <i style={{'--i': String(i)}} />)}
          </span>
        );
      })}
    </div>
  );
}
