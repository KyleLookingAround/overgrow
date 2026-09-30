// The allotment's plots' numbers over the map (level 2): each tile's Output a day at its centre, the player's marked
// "You", placed with the renderer's own camera helper from the same places and size, so they sit on their tiles at
// every screen size. They let taps through to the map (the tile selects its plot).
import {PLAYER_PLOT} from '../data/allotment';
import type {GraphNode} from '../sim/graph';
import type {Camera} from './map/draw';
import {num} from './format';
import './styles/allotment.css';

export function PlotLabels({nodes, cam}: {nodes: readonly GraphNode[]; cam: Camera | null}) {
  if (!cam) return null;
  const plots = nodes.filter((n) => n.kind === 'plot' && n.box);
  if (!plots.length) return null;
  return (
    <div class="plot-labels" aria-hidden="true">
      {plots.map((n) => {
        const b = n.box!, mine = n.id === PLAYER_PLOT;
        return (
          <span class={mine ? 'plot-label mine' : 'plot-label'} data-plot={n.id}
            style={{left: `${cam.x + (b.x + b.w / 2) * cam.s}px`, top: `${cam.y + (b.y + b.h / 2) * cam.s}px`}}>
            {mine ? 'You · ' : ''}{num(n.totals.output * 1000)} g
          </span>
        );
      })}
    </div>
  );
}
