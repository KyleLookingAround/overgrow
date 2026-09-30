// The map's camera (src/ui/map/camera.ts): the widest view fits the level, the closest fills the view with one of its
// places, every view stays inside the widest, a zoom about a point keeps that point still, and the depth the clock's pace
// follows runs from 0 to 1.
import {describe, expect, it} from 'vitest';
import {PLOTS, plotBox} from '../../data/allotment';
import type {GraphNode} from '../../sim/graph';
import {boundsOf, clampZoom, closest, depth, detailAlpha, fillWith, fit, inside, panBy, placeIn, viewOf, widest, zoomAbout} from './camera';

const plots: GraphNode[] = Array.from({length: PLOTS}, (_, i) => ({id: `plot-${i + 1}`, kind: 'plot', name: `Plot ${i + 1}`, box: plotBox(i), stocks: {}, levers: {}}) as unknown as GraphNode);
const W = 390, H = 500, b = boundsOf(plots)!;
const screen = (z: {k: number; x: number; y: number}) => {
  const c = viewOf(b, W, H, z);
  return {x0: -c.x / c.s, y0: -c.y / c.s, x1: (W - c.x) / c.s, y1: (H - c.y) / c.s};
};

describe('the camera', () => {
  it('opens at the widest view, the whole level fitted, and goes in until a plot fills the view', () => {
    const most = closest(plots, 2, b, W, H), f = fit(b, W, H);
    expect(viewOf(b, W, H, widest(b))).toEqual(f);
    expect(most).toBeGreaterThan(3);
    const z = fillWith(plotBox(5), b, W, H, most), c = viewOf(b, W, H, z);
    expect(plotBox(5).w * c.s).toBeGreaterThan(W * 0.85);
    expect(depth(z, most)).toBeCloseTo(1, 1);
    expect(depth(widest(b), most)).toBe(0);
    expect(closest(plots, 5, b, W, H)).toBe(1); // a level without a zoom band yet
  });

  it('keeps every view inside the widest one, zoomed and dragged anywhere', () => {
    const most = closest(plots, 2, b, W, H), wide = screen(widest(b));
    let z = widest(b);
    for (const [f, dx, dy] of [[3, 0, 0], [1, 5000, -5000], [2, -9000, 9000], [0.2, 0, 0], [50, 100, 100]] as const) {
      z = panBy(zoomAbout(z, f, W * 0.3, H * 0.7, b, W, H, most), dx, dy, b, W, H, most);
      const v = screen(z);
      expect(z.k).toBeGreaterThanOrEqual(1);
      expect(z.k).toBeLessThanOrEqual(most + 1e-9);
      expect(v.x0).toBeGreaterThanOrEqual(wide.x0 - 1e-6);
      expect(v.y0).toBeGreaterThanOrEqual(wide.y0 - 1e-6);
      expect(v.x1).toBeLessThanOrEqual(wide.x1 + 1e-6);
      expect(v.y1).toBeLessThanOrEqual(wide.y1 + 1e-6);
    }
    expect(clampZoom({k: 0.1, x: -1e6, y: 1e6}, b, W, H, most)).toEqual(widest(b));
  });

  it('zooms about a point, which stays under the fingers', () => {
    const most = closest(plots, 2, b, W, H), z0 = {k: 2, x: b.x + b.w / 2, y: b.y + b.h / 2}, c0 = viewOf(b, W, H, z0);
    const sx = W / 2 + 20, sy = H / 2 - 30, mx = (sx - c0.x) / c0.s, my = (sy - c0.y) / c0.s;
    const c1 = viewOf(b, W, H, zoomAbout(z0, 1.5, sx, sy, b, W, H, most));
    expect(c1.x + mx * c1.s).toBeCloseTo(sx, 6);
    expect(c1.y + my * c1.s).toBeCloseTo(sy, 6);
  });

  it('names the place zoomed into once past halfway, and shows its inside by its size on screen', () => {
    const most = closest(plots, 2, b, W, H);
    expect(placeIn(plots, 2, widest(b), most)).toBeNull();
    expect(placeIn(plots, 2, fillWith(plotBox(7), b, W, H, most), most)?.id).toBe('plot-8');
    expect(detailAlpha(40)).toBe(0);
    expect(detailAlpha(1000)).toBe(1);
    // a garden 12 × 8 m laid inside a plot's tile fills it
    const c = inside({x: 0, y: 0, w: 12, h: 8}, plotBox(0), {x: 10, y: 20, s: 5});
    expect(c.x).toBeCloseTo(10 + plotBox(0).x * 5);
    expect(c.s).toBeCloseTo(5);
  });
});
