// The map: one canvas filling its box, drawn by the renderer (src/ui/map/renderer.ts) every frame the clock loop gives
// it. A tap on a creature (a slug, a bee, the cat) opens its Explain card; a tap on a place selects it in the panel;
// nothing on the map does the work. Over the canvas sit the badges (src/ui/Badges.tsx), the Explain card and the notices,
// in a layer that lets taps through to the map (the owner's win W12). The same places are in the panel's list, so
// everything here is reachable by keyboard too.
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
import {readPalette} from './map/palette';
import {createRenderer, type MapRenderer} from './map/renderer';

export function MapView({loop, onSelect, onReady, onExplain, nodes, badges, pulse, juice = [], children}: {
  loop: Loop; onSelect: (id: NodeId) => void; onReady: (r: MapRenderer) => void; onExplain: (cause: string, at: string) => void;
  nodes: readonly GraphNode[]; badges: readonly Badge[]; pulse: NodeId | null; juice?: readonly Juice[]; children?: ComponentChildren;
}) {
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<MapRenderer | null>(null);
  const [size, setSize] = useState({w: 0, h: 0});
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
  const tap = (e: PointerEvent) => {
    // a tap during the zoom-out skips it
    if (renderer.current?.skipZoom()) return;
    const r = canvas.current!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, life = renderer.current?.creatureAt(x, y);
    if (life) return onExplain(life.cause, life.at);
    const id = renderer.current?.hit(x, y);
    if (id) onSelect(id);
  };
  // the camera the renderer draws with, for the badges (the same helper, from the same places and size)
  const drawn = nodes.filter((n) => n.box), cam = size.w && drawn.length ? camera(drawn, size.w, size.h) : null;
  return (
    <div class="map" ref={box}>
      <canvas ref={canvas} role="img" aria-label={drawn.some((n) => n.kind === 'plot') ? 'The allotment, from above' : 'The garden, from above'} onPointerDown={tap} />
      <div class="map-over">
        <Badges badges={badges} nodes={drawn} cam={cam} w={size.w} h={size.h} onExplain={onExplain} />
        <JuiceLayer list={juice} nodes={drawn} cam={cam} />
        <PlotLabels nodes={drawn} cam={cam} />
        {children}
      </div>
    </div>
  );
}
