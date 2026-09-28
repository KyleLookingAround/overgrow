// The map: one canvas that fills its box at the device's pixel ratio. Drawing is cosmetic and may use Math.random();
// nothing drawn here changes the game. The placeholder draws a field of soil.
import {useEffect, useRef} from 'preact/hooks';

export function MapCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const draw = () => {
      const box = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--soil');
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--soil-line');
      for (let y = 24; y < box.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(box.width, y);
        ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} class="map" aria-hidden="true" />;
}
