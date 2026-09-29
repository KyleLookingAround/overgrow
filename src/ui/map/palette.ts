// The map's colours, read from the design tokens (src/ui/styles/tokens.css) so light and dark follow the device.
const NAMES = [
  'edge', 'lawn', 'house', 'house-edge', 'path', 'shadow', 'shadow-deep', 'bed-dug', 'bed-wet', 'bed-dry', 'bed-grass', 'plot-line', 'shed', 'shed-roof',
  'butt', 'water', 'tap', 'heap-rim', 'heap', 'person', 'skin', 'hat', 'night', 'frost', 'rain',
  'drill', 'leaf', 'leaf-light', 'leaf-dark', 'wilt', 'blackened', 'fruit-red', 'fruit-pink', 'gate', 'gate-slot', 'can', 'basket', 'bags', 'compost',
  'slug', 'slime', 'aphid', 'blight', 'bee', 'bee-stripe', 'ladybird', 'ladybird-spot', 'cat', 'torch', 'marigold', 'pulse',
] as const;
export type Swatch = (typeof NAMES)[number];

/** A colour as the renderer takes it: 0xrrggbb and an alpha. */
export interface Paint {
  color: number;
  alpha: number;
}
export type Palette = Record<Swatch, Paint> & {nightMax: number; frostMax: number};

function parse(css: string): Paint {
  const hex = css.trim().replace('#', '');
  const full = hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join('') : hex;
  const n = parseInt(full.slice(0, 6), 16);
  return {color: Number.isFinite(n) ? n : 0xff00ff, alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1};
}

export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el), out = {} as Palette;
  for (const k of NAMES) out[k] = parse(cs.getPropertyValue('--map-' + k));
  out.nightMax = parseFloat(cs.getPropertyValue('--map-night-max')) || 0;
  out.frostMax = parseFloat(cs.getPropertyValue('--map-frost-max')) || 0;
  return out;
}
