// The map: one canvas filling its box, drawn by the renderer (src/ui/map/renderer.ts) every frame the clock loop gives
// it. A tap or click on a place selects it in the panel; nothing on the map does the work. The same places are in the
// panel's list, so everything here is reachable by keyboard too.
import {useEffect, useRef} from 'preact/hooks';
import type {Loop} from '../app/clock-loop';
import type {NodeId} from '../sim/graph';
import {readPalette} from './map/palette';
import {createRenderer, type MapRenderer} from './map/renderer';

export function MapView({loop, onSelect, onReady}: {loop: Loop; onSelect: (id: NodeId) => void; onReady: (r: MapRenderer) => void}) {
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<MapRenderer | null>(null);
  useEffect(() => {
    let gone = false, stop = () => {};
    const el = box.current!, size = () => ({w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight)});
    const ro = new ResizeObserver(() => {
      const {w, h} = size();
      renderer.current?.resize(w, h);
    });
    const scheme = matchMedia('(prefers-color-scheme: dark)'), repaint = () => renderer.current?.setPalette(readPalette(el));
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), still = () => loop.setReducedMotion(motion.matches);
    still();
    motion.addEventListener('change', still);
    scheme.addEventListener('change', repaint);
    const {w, h} = size();
    void createRenderer(canvas.current!, readPalette(el), w, h).then((made) => {
      if (gone) return made.destroy();
      renderer.current = made;
      el.dataset.renderer = made.kind;
      ro.observe(el);
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
  const tap = (e: PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect(), id = renderer.current?.hit(e.clientX - r.left, e.clientY - r.top);
    if (id) onSelect(id);
  };
  return (
    <div class="map" ref={box}>
      <canvas ref={canvas} role="img" aria-label="The garden, from above" onPointerDown={tap} />
    </div>
  );
}
