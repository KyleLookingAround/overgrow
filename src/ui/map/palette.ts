// The map's colours, read from the design tokens (src/ui/styles/tokens.css) so light and dark follow the device.
const NAMES = [
  'edge', 'hedge-leaf', 'lawn', 'lawn-stripe', 'lawn-tuft', 'lawn-wet', 'house', 'house-edge', 'door', 'window', 'step', 'path', 'path-edge', 'pebble', 'puddle',
  'shadow', 'shadow-deep', 'bed-dug', 'bed-wet', 'bed-dry', 'soil-rim', 'tilth', 'bed-grass', 'plot-line', 'fence', 'fence-post', 'shed', 'shed-roof', 'roof-lit',
  'butt', 'butt-rim', 'water', 'tap', 'heap-rim', 'heap', 'heap-crumb', 'person', 'person-2', 'skin', 'hat', 'hair', 'foot', 'night', 'dawn', 'frost', 'rain', 'snow',
  'drill', 'seedling', 'leaf', 'leaf-light', 'leaf-dark', 'leaf-ripe', 'sheen', 'cane', 'wilt', 'blackened', 'fruit-red', 'fruit-pink', 'gate', 'gate-slot', 'can', 'basket', 'bags', 'compost',
  'slug', 'slime', 'aphid', 'blight', 'bee', 'bee-stripe', 'wing', 'ladybird', 'ladybird-spot', 'cat', 'torch', 'marigold', 'pulse',
  'frame', 'frame-edge', 'bin', 'trap', 'hose', 'timber', 'tank', 'run', 'hen-house', 'hen', 'hen-tail', 'comb', 'beak', 'net', 'berry', 'blossom',
  'autumn-leaf', 'autumn-leaf-2', 'butterfly', 'robin', 'robin-breast', 'eye', 'steam',
] as const;
export type Swatch = (typeof NAMES)[number];

/** A colour as the renderer takes it: 0xrrggbb and an alpha. */
export interface Paint {
  color: number;
  alpha: number;
}
export type Palette = Record<Swatch, Paint> & {nightMax: number; dawnMax: number; frostMax: number};

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
  out.dawnMax = parseFloat(cs.getPropertyValue('--map-dawn-max')) || 0;
  out.frostMax = parseFloat(cs.getPropertyValue('--map-frost-max')) || 0;
  return out;
}
