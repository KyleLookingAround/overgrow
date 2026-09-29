// The badges over the map (src/ui/badges.ts says which): each a button, placed by src/ui/map/placement.ts around its
// place's corner, opening its Explain card. The layer lets taps through to the map (the owner's win W12); only the
// badges take them. Each cause has its own small shape, so the meaning is never colour alone.
import type {Camera} from './map/draw';
import type {GraphNode} from '../sim/graph';
import type {Badge} from './badges';
import {placeBadges} from './map/placement';

/** A badge's size on the map, px: the touch target (its drawn disc is smaller). */
export const BADGE_PX = 40;

function Icon({cause}: {cause: string}) {
  switch (cause) {
    case 'slugs':
      return <path d="M4 15c0-3 4-5 8-5s7 2 8 4c-2 1-4 2-8 2s-8 0-8-1zm12-6l2-4m-4 4l-1-4" />;
    case 'aphids':
      return <g><circle cx="8" cy="10" r="2.5" /><circle cx="14" cy="8" r="2.5" /><circle cx="12" cy="15" r="2.5" /><circle cx="17" cy="14" r="2" /></g>;
    case 'blight':
      return <path d="M12 4c5 3 7 7 5 11s-8 5-11 1 0-9 6-12zm-2 6l2 2m1-4l1 3m-4 3l3 1" />;
    case 'flowers':
      return <g><circle cx="12" cy="12" r="3" /><circle cx="12" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="12" r="2.5" /></g>;
    case 'frost':
    case 'frost damage':
      return <path d="M12 3v18M4 7.5l16 9M4 16.5l16-9M9 4l3 2 3-2M9 20l3-2 3 2" />;
    case 'water stress':
    case 'drought':
      return <path d="M12 4c3 5 6 8 6 11a6 6 0 01-12 0c0-3 3-6 6-11zM8 14l8 4" />;
    default:
      return <circle cx="12" cy="12" r="5" />;
  }
}

export function Badges({badges, nodes, cam, w, h, onExplain}: {
  badges: readonly Badge[]; nodes: readonly GraphNode[]; cam: Camera | null; w: number; h: number; onExplain: (cause: string, at: string) => void;
}) {
  if (!cam || !badges.length) return <div class="badges" />;
  const box = new Map(nodes.map((n) => [n.id, n.box]));
  // each wants the top-right corner of its place, a little inside it
  const wanted = badges.map((b) => {
    const r = box.get(b.at)!;
    return {id: b.id, x: cam.x + (r.x + r.w) * cam.s - BADGE_PX * 0.3, y: cam.y + r.y * cam.s + BADGE_PX * 0.3};
  });
  const placed = new Map(placeBadges(wanted, BADGE_PX, w, h).map((p) => [p.id, p]));
  return (
    <div class="badges">
      {badges.map((b) => {
        const p = placed.get(b.id);
        if (!p) return null;
        return (
          <button type="button" class={`badge badge-${b.cause.replace(/\s+/g, '-')}`} key={b.id} data-cause={b.cause} data-at={b.at} aria-label={b.label}
            style={{left: `${p.x}px`, top: `${p.y}px`}} onClick={() => onExplain(b.cause, b.at)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><Icon cause={b.cause} /></svg>
          </button>
        );
      })}
    </div>
  );
}
