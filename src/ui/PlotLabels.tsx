// The allotment's plots' numbers over the map (level 2): each tile's headline (Output a day, Health and where it's
// heading) at its centre, the player's in the accent
// colour, its tile outlined, placed with the renderer's own camera helper from the same places and size, so they sit on their tiles at
// every screen size. They let taps through to the map (the tile selects its plot).
import {PLAYER_PLOT} from '../data/allotment';
import type {GraphNode} from '../sim/graph';
import type {Camera} from './map/draw';
import {headline} from './AllotmentPanel';
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
            {headline(n).split(' · ').map((l) => <span class="plot-label-line">{l}</span>)}
          </span>
        );
      })}
    </div>
  );
}
