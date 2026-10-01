// The map: one canvas filling its box, drawn by the renderer (src/ui/map/renderer.ts) every frame the clock loop gives
// it, through the player's camera (src/ui/map/camera.ts): a drag moves it, a pinch or the wheel zooms about the fingers
// or the pointer, and the + and − buttons fly in and out a step. How far in it is sets the clock's pace (the loop's
// setZoom). A tap on a creature (a slug, a bee, the cat) opens its Explain card; a tap on a place selects it in the panel;
// nothing on the map does the work. Over the canvas sit the badges (src/ui/Badges.tsx), the Explain card and the notices,
// in a layer that lets taps through to the map (the owner's win W12). The same places are in the panel's list, so
// everything here is reachable by keyboard too. The layer says which way a card docks (data-dock: away from the place
// the card is about, "top" when that place is in the map's lower half), and the map's own controls sit at its corners:
// fullscreen where the browser has it (src/ui/Fullscreen.tsx), and under it the zoom's + and −, each hidden at its end.
import type {ComponentChildren} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {GraphNode, NodeId} from '../sim/graph';
import type {Badge} from './badges';
import {Badges} from './Badges';
import {JuiceLayer} from './Juice';
import {PlotLabels} from './PlotLabels';
import type {Juice} from './juice';
import {camera} from './map/draw';
import type {Camera} from './map/camera';
import {readPalette} from './map/palette';
import {createRenderer, type CameraState, type MapRenderer} from './map/renderer';
import {Fullscreen} from './Fullscreen';

/** How far a finger moves before a touch is a drag rather than a tap, px; and how much a wheel's notch zooms. */
const DRAG_PX = 8, WHEEL = 0.0015;

export function MapView({loop, onSelect, onReady, onExplain, onPlace, nodes, badges, pulse, juice = [], children}: {
  loop: Loop; onSelect: (id: NodeId) => void; onReady: (r: MapRenderer) => void; onExplain: (cause: string, at: string) => void;
  onPlace?: (place: CameraState['place']) => void;
  nodes: readonly GraphNode[]; badges: readonly Badge[]; pulse: NodeId | null; juice?: readonly Juice[]; children?: ComponentChildren;
}) {
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<MapRenderer | null>(null);
  const [size, setSize] = useState({w: 0, h: 0});
  // the camera the renderer draws with, for everything over the map, and whether it can go further in or out
  const [view, setView] = useState<{cam: Camera; canIn: boolean; canOut: boolean} | null>(null);
  const placed = useRef<string | null>(null);
  useEffect(() => {
    let gone = false, stop = () => {};
    const el = box.current!, size = () => ({w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight)});
    const ro = new ResizeObserver(() => {
      const {w, h} = size();
      renderer.current?.resize(w, h);
      setSize({w, h});
    });
    const scheme = matchMedia('(prefers-color-scheme: dark)'), repaint = () => renderer.current?.setPalette(readPalette(el));
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), still = () => {
      loop.setReducedMotion(motion.matches);
      renderer.current?.setReducedMotion(motion.matches);
    };
    still();
    motion.addEventListener('change', still);
    scheme.addEventListener('change', repaint);
    const {w, h} = size();
    void createRenderer(canvas.current!, readPalette(el), w, h).then((made) => {
      if (gone) return made.destroy();
      renderer.current = made;
      made.setReducedMotion(motion.matches);
      el.dataset.renderer = made.kind;
      ro.observe(el);
      setSize(size());
      stop = loop.onFrame((v) => renderer.current?.draw(v));
      const quit = made.onCamera((c) => {
        setView({cam: c.cam, canIn: c.canIn, canOut: c.canOut});
        loop.setZoom(c.t);
        const id = c.place?.id ?? null;
        if (id !== placed.current) {
          placed.current = id;
          onPlace?.(c.place);
        }
      });
      const was = stop;
      stop = () => {
        was();
        quit();
      };
      onReady(made);
    });
    return () => {
      gone = true;
      stop();
      ro.disconnect();
      scheme.removeEventListener('change', repaint);
      motion.removeEventListener('change', still);
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, [loop]);
  useEffect(() => renderer.current?.setPulse(pulse), [pulse, renderer.current]);
  const tap = (x: number, y: number) => {
    const life = renderer.current?.creatureAt(x, y);
    if (life) return onExplain(life.cause, life.at);
    const id = renderer.current?.hit(x, y);
    if (id) onSelect(id);
  };
  // the fingers on the map: one drags the view (or, if it barely moves, taps), two pinch it; a tap during the step up's
  // zoom-out ends it
  const fingers = useRef(new Map<number, {x: number; y: number; x0: number; y0: number}>()), gesture = useRef({moved: false, pinch: false, skipped: false});
  const local = (e: MouseEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return {x: e.clientX - r.left, y: e.clientY - r.top};
  };
  const down = (e: PointerEvent) => {
    const p = local(e), g = gesture.current;
    if (!fingers.current.size) {
      g.moved = false;
      g.pinch = false;
      g.skipped = !!renderer.current?.skipZoom();
    } else g.pinch = true;
    fingers.current.set(e.pointerId, {x: p.x, y: p.y, x0: p.x, y0: p.y});
    try {
      canvas.current!.setPointerCapture(e.pointerId);
    } catch {
      // a synthetic pointer can't be captured: the drag still follows it over the canvas
    }
  };
  const move = (e: PointerEvent) => {
    const f = fingers.current, p = f.get(e.pointerId), r = renderer.current, g = gesture.current;
    if (!p || !r || g.skipped) return;
    const q = local(e);
    if (f.size === 1) {
      if (!g.moved && Math.hypot(q.x - p.x0, q.y - p.y0) < DRAG_PX) return;
      g.moved = true;
      r.panBy(q.x - p.x, q.y - p.y);
    } else if (f.size === 2) {
      const o = [...f.entries()].find(([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(q.x - o.x, q.y - o.y);
      const m0 = {x: (p.x + o.x) / 2, y: (p.y + o.y) / 2}, m1 = {x: (q.x + o.x) / 2, y: (q.y + o.y) / 2};
      if (d0 > 1) r.zoomBy(d1 / d0, m0.x, m0.y);
      r.panBy(m1.x - m0.x, m1.y - m0.y);
      g.moved = true;
    }
    p.x = q.x;
    p.y = q.y;
  };
  const up = (e: PointerEvent, cancel = false) => {
    const f = fingers.current, p = f.get(e.pointerId), g = gesture.current;
    if (!p) return;
    f.delete(e.pointerId);
    if (!f.size && !cancel && !g.moved && !g.pinch && !g.skipped) tap(p.x, p.y);
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local(e), notch = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    renderer.current?.zoomBy(Math.exp(-e.deltaY * notch * WHEEL), p.x, p.y);
  };
  // the camera the renderer draws with, for the badges and labels: the renderer's own once it has drawn, the level's
  // widest view before (the same helper, from the same places and size)
  const drawn = nodes.filter((n) => n.box), cam = view?.cam ?? (size.w && drawn.length ? camera(drawn, size.w, size.h) : null);
  // a card docks away from its place: at the top when the place's centre is in the lower half of the map
  const at = pulse ? drawn.find((n) => n.id === pulse)?.box : undefined;
  const dock = at && cam && cam.y + (at.y + at.h / 2) * cam.s > size.h / 2 ? 'top' : 'bottom';
  return (
    <div class="map" ref={box}>
      <canvas ref={canvas} role="img" aria-label={drawn.some((n) => n.kind === 'plot') ? 'The allotment, from above' : 'The garden, from above'}
        onPointerDown={down} onPointerMove={move} onPointerUp={(e) => up(e)} onPointerCancel={(e) => up(e, true)} onWheel={wheel} />
      <div class="map-over" data-dock={dock}>
        <Fullscreen />
        {view && (view.canIn || view.canOut) && (
          <div class="zoom-buttons">
            <button type="button" class="zoom-in" aria-label="Zoom in" title="Zoom in" data-end={!view.canIn || undefined} onClick={() => renderer.current?.zoomStep(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button type="button" class="zoom-out" aria-label="Zoom out" title="Zoom out" data-end={!view.canOut || undefined} onClick={() => renderer.current?.zoomStep(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
            </button>
          </div>
        )}
        <Badges badges={badges} nodes={drawn} cam={cam} w={size.w} h={size.h} onExplain={onExplain} />
        <JuiceLayer list={juice} nodes={drawn} cam={cam} />
        <PlotLabels nodes={drawn} cam={cam} />
        {children}
      </div>
    </div>
  );
}
