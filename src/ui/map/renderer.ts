// The map's renderer: PixiJS on WebGL, or Pixi's Canvas 2D renderer where WebGL is missing
// (docs/decisions/ADR-2026-09-28-webgl-map.md). It draws the level's nodes in the flat, top-down, soft style with the
// style kit (src/ui/map/draw.ts, kit.ts, plants.ts), the people and things moving from the snapshot's activities at the
// view time the clock loop gives it (one figure for each person, where their latest-started activity puts them, stepping
// through a three-frame walk as they move, with what they carry, and none while they're away at work beyond the gate),
// the weather (a shower crossing the garden while the sim says it rains, as flakes in freezing air, a rime while it says
// there's frost, puddles on the paths), the crops in the beds, the garden's pests, wildlife and delights
// (src/ui/map/life.ts), the gardener's torch after dark, a ring pulsing at the place an Explain card is about, the warm
// glow of dawn and dusk and the night falling. The layers, bottom up: the ground (drawn once and redrawn only when the
// graph, the size or the colours change), the live soil (each frame), the tilth (once), what grows (once a snapshot),
// what's over the plants (each frame), the life, the movers, what they carry, the rain, the night, the dawn, the torch
// and the ring. What moves is a pool of particles placed each frame, so thousands stay cheap. Nothing drawn changes
// the game. docs/systems/map.md.
import {Application, Container, Graphics, Particle, ParticleContainer, Rectangle, Sprite, Texture} from 'pixi.js';
import {PLAYER_PLOT} from '../../data/allotment';
import {placeAt, type Activity} from '../../sim/activity';
import {calendar} from '../../sim/clock';
import type {Box, GraphNode, NodeId} from '../../sim/graph';
import type {View} from '../../app/clock-loop';
import type {Snapshot} from '../../sim/state';
import {darkness, steadyLight, warmth} from './daylight';
import type {Stage} from '../../sim/models/crops';
import {drawGround, drawGrown, drawInside, drawItem, drawLive, drawOver, drawPerson, drawTilth, groundKey, itemOf, weatherAt} from './draw';
import {between, boundsOf, clampZoom, closest, depth, detailAlpha, fillWith, fit, inside, panBy, placeIn, viewOf, widest, zoomAbout, type Camera, type Zoom} from './camera';
import {tag} from './allotment';
import {detailOf, drawDetail, PLANT_KG} from './detail';
import {TILE} from '../../data/allotment';
import {drawLand, landKey} from './land';
import type {Land} from '../../sim/land';
import {drawLife, type Creature, type LifeStats} from './life';
import {drawBarrow} from './season';
import type {Palette} from './palette';
import type {Shape} from './plants';

export interface MapRenderer {
  /** 'webgl', or 'canvas' where WebGL is missing. */
  readonly kind: string;
  resize(w: number, h: number): void;
  setPalette(p: Palette): void;
  /** Rain stops falling (it's still shown, still per tick) under prefers-reduced-motion. */
  setReducedMotion(on: boolean): void;
  draw(v: View): void;
  /** The drawn node under a point in CSS pixels, or null. */
  hit(x: number, y: number): NodeId | null;
  /** The creature drawn nearest a point in CSS pixels, within a finger's width, or null. */
  creatureAt(x: number, y: number): Creature | null;
  /** A ring pulsing at a place (the Explain card's), or none. */
  setPulse(at: NodeId | null): void;
  /** Skips the step up's zoom-out if it's running; says whether it was. */
  skipZoom(): boolean;
  /** The player's camera (src/ui/map/camera.ts): zoom by a factor about a point on screen, px (the wheel, a pinch). */
  zoomBy(factor: number, x: number, y: number): void;
  /** Move the view by a drag, px. */
  panBy(dx: number, dy: number): void;
  /** Fly in to a place, filling the view with it, or out to the level's widest view (null); a jump under reduced motion. */
  flyTo(id: NodeId | null): void;
  /** Fly in or out a step (the + and − buttons), about the view's centre. */
  zoomStep(inwards: boolean): void;
  /** Called with the camera whenever it moves or the map is redrawn; returns a function that stops it. */
  onCamera(fn: (c: CameraState) => void): () => void;
  /** Check-only: show a piece of land drawn by code (src/ui/map/land.ts) on a day of the year in place of the level,
   *  through the same camera; null returns to the game. Never a player's view. */
  setLand(scene: {land: Land; day: number} | null): void;
  /** For the checks: the last frames' times in ms, where the first movers are drawn (in CSS pixels) and how many are mid-step, the weather, each
   *  dug bed's crop stage and the shape it's drawn in, and the gardener: what they're doing, where, and what they carry. */
  stats(): {
    frames: number[]; movers: {id: string; x: number; y: number}[]; stepping: number; cam: Camera | null; weather: WeatherStats; crops: Record<string, Stage>; shapes: Record<string, Shape>;
    gardener: GardenerStats | null; life: LifeStats; creatures: Creature[]; torch: boolean; pulse: NodeId | null;
    /** The night layer's opacity. */
    night: number;
    /** The level drawn, the step up's zoom-out and the dive: running, and how far through, 0–1; and the trace drawn. */
    level: number; zoom: number | null; dive: number | null; trace: boolean;
    /** The player's zoom, how much of the kept garden shows inside the player's plot, 0–1, the neighbours' plots drawn
     *  from their totals, and the last few of those drawings' times, ms. */
    zoomed: Zoom | null; inner: number; detailed: NodeId[]; detailMs: number[];
    /** The land scene's last few drawings' times, ms, and how many times it has been drawn. */
    landMs: number[]; landDrawn: number;
    /** Whether the land scene is showing. */
    scene: boolean;
  };
  destroy(): void;
}

/** What the weather drawn last frame came to, for the checks: raindrops shown and the first few's places (as snow or
 *  not), the frost's opacity, the dawn glow's, puddles on the paths, leaves on the lawn, and each dug bed's soil from -1
 *  (dry) to 1 (soaked). */
export interface WeatherStats {
  rain: number;
  snow: boolean;
  drops: {x: number; y: number}[];
  frost: number;
  dawn: number;
  puddles: number;
  leaves: number;
  soil: Record<string, number>;
}

/** Where the camera is: the view's camera, how far in (0 at the level's widest view to 1 at its closest, the clock's
 *  pace follows it), whether it can go further in or out, and the place it has zoomed into, for the breadcrumb. */
export interface CameraState {
  cam: Camera;
  t: number;
  canIn: boolean;
  canOut: boolean;
  place: {id: NodeId; name: string} | null;
}

export interface GardenerStats {
  id: string;
  doing: string;
  to: string;
  x: number;
  y: number;
  item: string | null;
  frame: number;
}

/** A figure's particle with its walk kept on it: whose it is, where it was last frame, and the distance walked since it
 *  last stood. */
type Walker = Particle & {walk?: {who: string; x: number; y: number; d: number}};

/** Each person's activities, grouped once per snapshot, in order of starting. */
const groups = new WeakMap<Activity[], Activity[][]>();
function byWho(acts: Activity[]): Activity[][] {
  let out = groups.get(acts);
  if (!out) {
    const m = new Map<string, Activity[]>();
    for (const a of acts) {
      const l = m.get(a.who);
      if (l) l.push(a);
      else m.set(a.who, [a]);
    }
    out = [...m.values()];
    for (const l of out) if (l.length > 1) l.sort((a, b) => a.start - b.start);
    groups.set(acts, out);
  }
  return out;
}
/** Where a person is: their latest activity to have started, or the first to come if none has. */
function current(l: Activity[], hours: number): Activity {
  let pick = l[0]!;
  for (let i = 1; i < l.length; i++) if (l[i]!.start <= hours) pick = l[i]!;
  return pick;
}

const MIN_PERSON_PX = 6;
/** How near a tap must land to a creature to open its card rather than select the place under it, px: close, so a tap
 *  on a busy summer bed still selects the bed. */
const CREATURE_PX = 12;
/** Raindrops at the lightest and heaviest rain, and how long the shower's front takes to cross the garden, game hours. */
const DROPS = {min: 30, perMm: 40, max: 160}, FRONT_HOURS = 0.3;
/** Rain falls as snow at or below this air temperature, °C (the Met Office's rule of thumb; the model has no snow of
 *  its own, so it's cosmetic). */
const SNOW_C = 1;
/** A figure's walk: a step every so many metres moved, and the frames it cycles through. Up to this many people step;
 *  a bigger crowd (the top levels' thousands) glides in one frame, its figures too small for a step to show, through a
 *  container that uploads positions alone. */
const STRIDE_M = 0.22, WALK: (0 | 1 | 2)[] = [1, 0, 2, 0], WALK_MAX = 200;
/** How often at most the plants are redrawn, ms. */
const GROWN_MS = 250;
/** The camera: a flight's length, how long it must rest before the map is redrawn crisp at its new scale (it moves as
 *  one picture until then), and how far a + or − button goes. */
const FLY_MS = 450, REST_MS = 160, STEP = 2;
// a fixed scatter for the drops, from a hash of their index (cosmetic, and the same every frame): where each crosses,
// where it starts falling and how fast, worked out once
const SCATTER = new Float32Array(DROPS.max * 3).map((_, j) => {
  const x = Math.sin(Math.floor(j / 3) * 12.9898 + ((j % 3) + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
});

export async function createRenderer(canvas: HTMLCanvasElement, palette: Palette, w: number, h: number): Promise<MapRenderer> {
  const app = new Application();
  await app.init({
    canvas, width: w, height: h, resolution: window.devicePixelRatio || 1, autoDensity: true, antialias: true, backgroundAlpha: 0,
    preference: ['webgl', 'canvas'], autoStart: false, sharedTicker: false,
  });
  const ground = new Graphics(), live = new Graphics(), tilth = new Graphics(), grown = new Graphics(), over = new Graphics(), life = new Graphics();
  const night = new Graphics(), dawn = new Graphics(), carried = new Graphics(), glow = new Graphics(), ring = new Graphics();
  const movers = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: true, color: false}});
  const crowd = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: false, color: false}});
  const rain = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: false, color: false}});
  // the garden kept inside the player's plot at the allotment, the neighbours' plots opened from their totals, and the
  // player's plot's golden tag over them (docs/specs/one-map.md)
  const inner = new Graphics(), marks = new Graphics(), details = new Container();
  // everything is drawn in the world, which the step up's zoom-out moves; the garden's last picture shrinks over it. The
  // lens carries the player's camera while it moves: the world is drawn at the camera it last rested at, and moves and
  // scales as one picture until the camera rests again and it's redrawn crisp (src/ui/map/camera.ts)
  const world = new Container(), lens = new Container();
  world.addChild(ground, live, tilth, inner, details, marks, grown, over, life, movers, crowd, carried, rain, night, dawn, glow, ring);
  // the check-only land scene, in place of the world while it shows
  const landG = new Graphics();
  landG.visible = false;
  lens.addChild(world, landG);
  let scene: {land: Land; day: number} | null = null, sceneKey = '', landCam: Camera | null = null, paletteN = 0, landDrawn = 0;
  const landMs: number[] = [];
  app.stage.addChild(lens);
  let level = -1, zoom: {start: number; shot: Sprite | null} | null = null, highlight = 0, grownAt = 0, grownRev = -1;
  const light = steadyLight(), dawnLight = steadyLight(); // the night's and the dawn's opacity, never flashing (src/ui/map/daylight.ts)
  let pal = palette, width = w, height = h, cam: Camera | null = null, drawnRev = -1, drawnKey = '', keyOf: GraphNode[] | null = null, grownOf: GraphNode[] | null = null;
  let atlas: Texture | null = null, frames: Texture[] = [], drop: Texture | null = null, flake: Texture | null = null, still = false, garden: Box | null = null, snowing = false;
  // the zoom back in's dive (part 9): the allotment's last picture, and where the player's plot sat on it
  let traced = false;
  let dive: {start: number; shot: Sprite; P: {x: number; y: number}; pw: number; ph: number} | null = null;
  const drops: Particle[] = [];
  let weather: WeatherStats = {rain: 0, snow: false, drops: [], frost: 0, dawn: 0, puddles: 0, leaves: 0, soil: {}};
  let crops: Record<string, Stage> = {}, shapes: Record<string, Shape> = {}, leaves = 0, gardener: GardenerStats | null = null;
  let boxes = new Map<NodeId, Box>(), drawn: GraphNode[] = [];
  const pool: Particle[] = [], crowdPool: Particle[] = [], frameTimes: number[] = [];
  let lastMovers: {id: string; x: number; y: number}[] = [], stepping = 0;
  // the camera: the level's bounds, how close it goes, the player's zoom, a flight under way, when it last moved, the view's
  // camera (cam is the one the world was drawn at), and what was last said about it
  let bounds: Box | null = null, most = 1, zoomed: Zoom | null = null, fly: {from: Zoom; to: Zoom; start: number} | null = null, moved = 0;
  let view: Camera | null = null, told = '', innerOf: Snapshot['below'] | undefined;
  const watchers: ((c: CameraState) => void)[] = [];
  // each neighbour's plot drawn from its totals while it's big enough on screen, with what it was drawn from, and the
  // last few drawings' times (the one-off budget)
  const detailed = new Map<NodeId, {g: Graphics; key: string}>(), detailMs: number[] = [];
  const dropDetails = () => {
    for (const d of detailed.values()) d.g.destroy();
    detailed.clear();
  };
  let creatures: Creature[] = [], lifeStats: LifeStats = {slugs: 0, slime: 0, aphids: 0, bees: 0, ladybirds: 0, cat: false, butterfly: false, robin: false, steam: false}, torch = false, pulse: NodeId | null = null;

  const resolution = () => window.devicePixelRatio || 1;
  // the garden kept below the allotment, drawn inside the player's plot from what the ladder kept (the snapshot's
  // `below`), blended into it with no box: redrawn when it changes or the camera rests; and the plot's golden tag
  const drawInner = (s: Snapshot) => {
    inner.clear();
    marks.clear();
    dropDetails();
    innerOf = s.below;
    const box = s.level === 2 ? boxes.get(PLAYER_PLOT) : undefined;
    if (!box || !cam) return;
    tag(marks, cam.x + box.x * cam.s, cam.y + box.y * cam.s, cam.s, pal);
    const kept = s.below?.nodes.filter((n) => n.box) ?? [], lay = boundsOf(kept);
    if (!lay) return;
    const c = inside(lay, box, cam);
    drawInside(inner, kept, c, pal, s.seed);
    drawTilth(inner, kept, c, pal, s.seed);
    drawGrown(inner, {...s, nodes: s.below!.nodes, hours: s.below!.hours}, c, pal);
  };
  const rebuild = (s: Snapshot) => {
    drawn = s.nodes.filter((n) => n.box);
    boxes = new Map(drawn.map((n) => [n.id, n.box!]));
    ends = new WeakMap();
    bounds = boundsOf(drawn);
    most = bounds ? closest(drawn, s.level, bounds, width, height) : 1;
    zoomed = bounds ? clampZoom(zoomed ?? widest(bounds), bounds, width, height, most) : null;
    cam = bounds && zoomed ? viewOf(bounds, width, height, zoomed) : {x: 0, y: 0, s: 1};
    view = cam;
    lens.scale.set(1);
    lens.position.set(0, 0);
    // the edge's green and the night fill the widest view, in this camera's pixels: every view lies inside it
    const all = bounds ? fit(bounds, width, height) : cam, k = cam.s / all.s, pad = 4;
    const area = {x: cam.x - all.x * k - pad, y: cam.y - all.y * k - pad, w: width * k + 2 * pad, h: height * k + 2 * pad};
    ground.clear();
    drawGround(ground, drawn, area, cam, pal, s.seed);
    tilth.clear();
    drawTilth(tilth, drawn, cam, pal, s.seed);
    drawInner(s);
    grownOf = null;
    grownAt = 0;
    night.clear().rect(area.x, area.y, area.w, area.h).fill({color: pal.night.color, alpha: 1});
    dawn.clear().rect(area.x, area.y, area.w, area.h).fill({color: pal.dawn.color, alpha: 1});
    // the figures: one atlas of six frames (the gardener and the household, standing and stepping either foot)
    for (const f of frames) f.destroy(false);
    atlas?.destroy(true);
    const ps = Math.max(MIN_PERSON_PX / 0.5, cam.s), cell = Math.ceil(0.6 * ps), g = new Graphics();
    g.rect(0, 0, cell * 6, cell).fill({color: 0, alpha: 0});
    (['gardener', 'household'] as const).forEach((who, k) =>
      ([0, 1, 2] as const).forEach((f) => {
        const i = k * 3 + f, fig = new Graphics();
        drawPerson(fig, ps, pal, who, f);
        fig.position.set(cell * (i + 0.5), cell * 0.5);
        g.addChild(fig);
      }));
    atlas = app.renderer.generateTexture({target: g, resolution: resolution(), antialias: true});
    g.destroy({children: true});
    frames = [0, 1, 2, 3, 4, 5].map((i) => new Texture({source: atlas!.source, frame: new Rectangle(i * cell, 0, cell, cell)}));
    movers.texture = frames[0]!;
    crowd.texture = frames[0]!;
    for (const p of pool) p.texture = frames[0]!;
    for (const p of crowdPool) p.texture = frames[0]!;
    movers.update();
    crowd.update();
    // a raindrop: a short slanted streak, about 30 cm long at the garden's scale; a flake: a soft dot
    drop?.destroy(true);
    flake?.destroy(true);
    const d = new Graphics(), len = Math.max(6, 0.3 * cam.s), wide = Math.max(1, 0.025 * cam.s), lean = len * 0.27;
    d.poly([lean, 0, lean + wide, 0, wide, len, 0, len]).fill({color: pal.rain.color, alpha: 1});
    drop = app.renderer.generateTexture({target: d, resolution: resolution(), antialias: true});
    d.destroy();
    const f = new Graphics();
    f.circle(0, 0, Math.max(1.5, 0.06 * cam.s)).fill({color: pal.snow.color, alpha: 1});
    flake = app.renderer.generateTexture({target: f, resolution: resolution(), antialias: true});
    f.destroy();
    snowing = false;
    rain.texture = drop;
    rain.alpha = pal.rain.alpha;
    for (const p of drops) p.texture = drop;
    rain.update();
    garden = drawn.find((n) => n.kind === 'lawn')?.box ?? null;
  };
  // the shower: while the sim says it rains, streaks fall across the garden, as many as the rain is heavy, its front
  // crossing from the west as it starts and leaving to the east as it stops; flakes, falling slower, in freezing air;
  // still, but shown, under reduced motion
  const shower = (v: View, c: Camera, w: ReturnType<typeof weatherAt>) => {
    let n = 0;
    const out: {x: number; y: number}[] = [], snow = !!w && w.hour.temp <= SNOW_C;
    if (snow !== snowing) {
      snowing = snow;
      rain.texture = snow ? flake! : drop!;
      rain.alpha = snow ? pal.snow.alpha : pal.rain.alpha;
      for (const p of drops) p.texture = rain.texture;
      rain.update(); // the quads take the new texture's size
    }
    if (w && garden && w.day.rainHours > 0) {
      const {day, t} = w, x0 = c.x + garden.x * c.s, y0 = c.y + garden.y * c.s, gw = garden.w * c.s, gh = garden.h * c.s;
      const want = Math.min(DROPS.max, Math.round(DROPS.min + DROPS.perMm * (day.rain / day.rainHours)));
      const time = (still ? Math.floor(v.hours) * 0.37 : performance.now() / 1000) * (snow ? 0.3 : 1), lean = (snow ? 0.1 : 0.27) * (gh / gw);
      for (let i = 0; i < want; i++) {
        const across = SCATTER[3 * i]!, since = t - day.rainFrom - FRONT_HOURS * across;
        if (since < 0 || since >= day.rainHours) continue;
        const fall = (SCATTER[3 * i + 1]! + time * (1.2 + 0.4 * SCATTER[3 * i + 2]!)) % 1;
        let p = drops[n];
        if (!p) drops.push((p = new Particle({texture: rain.texture})));
        p.x = x0 + ((((across - fall * lean + (snow ? Math.sin(fall * 9 + i) * 0.01 : 0)) % 1) + 1) % 1) * gw; // falling along its slant, down and to the left
        p.y = y0 + fall * gh;
        if (out.length < 6) out.push({x: p.x, y: p.y});
        n++;
      }
    }
    const shown = rain.particleChildren;
    if (shown.length !== n) {
      shown.length = 0;
      for (let i = 0; i < n; i++) shown.push(drops[i]!);
      rain.update();
    }
    return {n, out, snow};
  };
  // the camera said to whoever watches it, when it has moved (the badges and labels over the map, the breadcrumb, the
  // clock's pace)
  const state = (s: Snapshot): CameraState | null => {
    if (!view || !zoomed) return null;
    const p = placeIn(drawn, s.level, zoomed, most);
    return {cam: view, t: depth(zoomed, most), canIn: zoomed.k < most - 1e-6, canOut: zoomed.k > 1 + 1e-6, place: p ? {id: p.id, name: p.name} : null};
  };
  const tell = (s: Snapshot) => {
    if (!watchers.length || !view || !zoomed) return;
    const key = `${view.x.toFixed(2)},${view.y.toFixed(2)},${view.s.toFixed(4)},${most.toFixed(3)},${s.level}`;
    if (key === told) return;
    told = key;
    const st = state(s);
    if (st) for (const fn of watchers) fn(st);
  };
  let last: Snapshot | null = null;
  const move = (next: Zoom) => {
    zoomed = next;
    moved = performance.now();
  };
  const flyTo = (to: Zoom) => {
    if (!zoomed) return;
    if (still) {
      fly = null;
      move(to);
    } else fly = {from: zoomed, to, start: performance.now()};
  };

  const stepFly = (t0: number) => {
    if (!fly || !zoomed || !bounds) return;
    const t = Math.min(1, (t0 - fly.start) / FLY_MS), e = t * t * (3 - 2 * t);
    zoomed = clampZoom(between(fly.from, fly.to, e), bounds, width, height, most);
    moved = t0;
    if (t >= 1) fly = null;
  };
  // the land scene: the land drawn by code at the camera it last rested at, redrawn when the land, its season's stage, the
  // size or the colours change, or the camera rests somewhere new; the camera goes in until about 60 m fills the view
  const drawScene = (sc: {land: Land; day: number}, t0: number) => {
    const key = `${landKey(sc.land, sc.day)}|${width}x${height}|${paletteN}`;
    if (key !== sceneKey) {
      const first = !sceneKey || !bounds || bounds.w !== sc.land.w || bounds.h !== sc.land.h;
      bounds = {x: 0, y: 0, w: sc.land.w, h: sc.land.h};
      most = Math.max(1, (Math.min(width, height) * 0.92) / 60 / fit(bounds, width, height).s);
      zoomed = clampZoom(first || !zoomed ? widest(bounds) : zoomed, bounds, width, height, most);
      sceneKey = key;
      landCam = null;
    }
    stepFly(t0);
    view = viewOf(bounds!, width, height, zoomed!);
    const resting = !fly && t0 - moved >= REST_MS;
    if (!landCam || (resting && (view.s !== landCam.s || view.x !== landCam.x || view.y !== landCam.y))) {
      landCam = view;
      const t = performance.now();
      landG.clear();
      drawLand(landG, sc.land, landCam, pal, sc.day);
      landMs.push(performance.now() - t);
      if (landMs.length > 24) landMs.shift();
      landDrawn++;
    }
    const r = view.s / landCam.s;
    lens.scale.set(r);
    lens.position.set(view.x - r * landCam.x, view.y - r * landCam.y);
    app.render();
    frameTimes.push(performance.now() - t0);
    if (frameTimes.length > 240) frameTimes.shift();
  };

  // where an actor is, in CSS pixels: straight from start to end with its ends looked up once per activity, or along
  // the way through placeAt (people are drawn from above, the same whichever way they face)
  const at = {x: 0, y: 0};
  let ends = new WeakMap<Activity, {x0: number; y0: number; dx: number; dy: number} | null>();
  const place = (a: Activity, hours: number, c: Camera): boolean => {
    let x: number, y: number;
    if (a.via?.length) {
      const p = placeAt(a, hours, (id) => boxes.get(id));
      if (!p) return false;
      x = p.x;
      y = p.y;
    } else {
      let e = ends.get(a);
      if (e === undefined) {
        const f = boxes.get(a.from), t = boxes.get(a.to);
        e = f && t ? {x0: f.x + f.w / 2, y0: f.y + f.h / 2, dx: t.x + t.w / 2 - f.x - f.w / 2, dy: t.y + t.h / 2 - f.y - f.h / 2} : null;
        ends.set(a, e);
      }
      if (!e) return false;
      const span = a.end - a.start, k = span > 0 ? Math.min(1, Math.max(0, (hours - a.start) / span)) : 1;
      x = e.x0 + e.dx * k;
      y = e.y0 + e.dy * k;
    }
    at.x = c.x + x * c.s;
    at.y = c.y + y * c.s;
    return true;
  };

  // the step up's zoom-out (part 7): the garden, as it was last drawn, shrinks into the player's plot while the camera
  // pulls back from that plot to the whole allotment, about three seconds; a tap skips it; reduced motion cuts straight
  // to the allotment, the plot ringed for a few seconds either way
  const ZOOM_MS = 3000, HIGHLIGHT_MS = 5000;
  const holder = canvas.parentElement;
  // the zoom ends on input, but the world stays the one cached picture for a moment longer: the frames right after a
  // tap only show it, and the first uncached frame (the whole allotment drawn live) is where a slow renderer stalls
  const SETTLE_MS = 600;
  let settleAt = 0;
  const uncache = () => {
    settleAt = 0;
    world.cacheAsTexture(false);
  };
  const endZoom = (now = false) => {
    if (!zoom && !settleAt) return false;
    const ended = !!zoom;
    zoom?.shot?.destroy({texture: true});
    zoom = null;
    world.scale.set(1);
    world.position.set(0, 0);
    if (holder) delete holder.dataset.zooming;
    if (now) uncache();
    else if (ended) settleAt = performance.now() + SETTLE_MS;
    return ended;
  };
  const startZoom = () => {
    // the garden's picture: the part of the canvas its places cover
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of drawn) {
      const b = n.box!;
      x0 = Math.min(x0, cam!.x + b.x * cam!.s);
      y0 = Math.min(y0, cam!.y + b.y * cam!.s);
      x1 = Math.max(x1, cam!.x + (b.x + b.w) * cam!.s);
      y1 = Math.max(y1, cam!.y + (b.y + b.h) * cam!.s);
    }
    let shot: Sprite | null = null;
    if (Number.isFinite(x0) && x1 > x0 && y1 > y0) {
      // zoomed in, the garden spans several screens: its picture at no more than a texture's safe size
      const res = Math.min(window.devicePixelRatio || 1, 4096 / Math.max(x1 - x0, y1 - y0));
      const tex = app.renderer.generateTexture({target: world, frame: new Rectangle(x0, y0, x1 - x0, y1 - y0), resolution: res});
      shot = new Sprite(tex);
      app.stage.addChild(shot);
    }
    zoom = {start: performance.now(), shot};
    settleAt = 0;
    // for the zoom's three seconds the world is one cached texture: its frames only move and scale it, so a tap to skip
    // is answered at once even where the allotment's ground is slow to rasterise
    world.cacheAsTexture(true);
    if (holder) holder.dataset.zooming = '1';
  };
  // the dive, the zoom-out in reverse: the camera falls into the player's plot on the allotment's last picture while the
  // garden opens out of it, about three seconds; a tap skips it; reduced motion cuts straight in
  const endDive = () => {
    if (!dive) return false;
    dive.shot.destroy({texture: true});
    dive = null;
    world.scale.set(1);
    world.position.set(0, 0);
    if (holder) delete holder.dataset.zooming;
    return true;
  };
  const startDive = () => {
    const box = boxes.get(PLAYER_PLOT);
    if (!box || !cam) return;
    const tex = app.renderer.generateTexture({target: world, frame: new Rectangle(0, 0, width, height), resolution: window.devicePixelRatio || 1});
    const shot = new Sprite(tex);
    app.stage.addChild(shot);
    dive = {start: performance.now(), shot, P: {x: cam.x + (box.x + box.w / 2) * cam.s, y: cam.y + (box.y + box.h / 2) * cam.s}, pw: box.w * cam.s, ph: box.h * cam.s};
    if (holder) holder.dataset.zooming = '1';
  };
  const stepDive = () => {
    if (!dive) return;
    const t = Math.min(1, (performance.now() - dive.start) / ZOOM_MS), e = t * t * (3 - 2 * t), {P, pw, ph} = dive;
    const k0 = Math.min(width / pw, height / ph) * 0.92, K = Math.pow(k0, e);
    const Q = {x: P.x + (width / 2 - P.x) * e, y: P.y + (height / 2 - P.y) * e};
    dive.shot.scale.set(K);
    dive.shot.position.set(Q.x - K * P.x, Q.y - K * P.y);
    dive.shot.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.35);
    // the garden grows out of the plot to fill the map
    const s = K / k0;
    world.scale.set(s);
    world.position.set(Q.x - s * width / 2, Q.y - s * height / 2);
    if (t >= 1) endDive();
  };
  const stepZoom = () => {
    const box = boxes.get(PLAYER_PLOT);
    if (!zoom || !box || !cam) return void endZoom(true);
    const t = Math.min(1, (performance.now() - zoom.start) / ZOOM_MS), e = t * t * (3 - 2 * t);
    const pw = box.w * cam.s, ph = box.h * cam.s, P = {x: cam.x + (box.x + box.w / 2) * cam.s, y: cam.y + (box.y + box.h / 2) * cam.s};
    const k0 = Math.min(width / pw, height / ph) * 0.92, k = Math.pow(k0, 1 - e);
    const Q = {x: width / 2 + (P.x - width / 2) * e, y: height / 2 + (P.y - height / 2) * e};
    world.scale.set(k);
    world.position.set(Q.x - k * P.x, Q.y - k * P.y);
    if (zoom.shot) {
      zoom.shot.width = k * pw;
      zoom.shot.height = k * ph;
      zoom.shot.position.set(Q.x - (k * pw) / 2, Q.y - (k * ph) / 2);
      zoom.shot.alpha = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.4);
    }
    if (t >= 1) endZoom();
  };

  return {
    kind: app.renderer.name,
    resize(nw, nh) {
      width = nw;
      height = nh;
      app.renderer.resize(nw, nh);
      drawnRev = -1;
    },
    setPalette(p) {
      pal = p;
      drawnRev = -1;
      paletteN++;
    },
    setReducedMotion(on) {
      still = on;
    },
    draw(v) {
      const t0 = performance.now(), cur = v.cur;
      if (scene) return drawScene(scene, t0);
      if (!world.visible) {
        // back from the land scene: the level afresh at its widest view
        world.visible = true;
        landG.visible = false;
        landG.clear();
        zoomed = null;
        cam = null;
      }
      last = cur;
      // the ground: redrawn when the graph changes, or a bed plot is dug (checked once a snapshot)
      const key = keyOf === cur.nodes ? drawnKey : groundKey(cur.nodes);
      // the step up: the garden's picture taken before the allotment is drawn
      const stepped = level === 1 && cur.level === 2;
      if (stepped && !still && cam) startZoom();
      // going down: the allotment's picture taken before the garden is drawn
      if (level === 2 && cur.level === 1 && !still && cam) startDive();
      if (cur.level !== level) {
        // a new level opens at its widest view
        zoomed = null;
        fly = null;
        cam = null;
        if (level !== -1 && cur.level === 2) highlight = performance.now() + (still ? 0 : ZOOM_MS) + HIGHLIGHT_MS;
        if (cur.level !== 2) endZoom(true);
        if (cur.level !== 1) endDive();
        level = cur.level;
      }
      // the camera: a flight moves it each frame; the world is redrawn at the view's camera once it rests, and moves as one
      // picture through the lens until then
      stepFly(t0);
      const resting = !fly && t0 - moved >= REST_MS && !zoom && !dive;
      if (cur.rev !== drawnRev || key !== drawnKey || !cam || (resting && view && cam && (view.s !== cam.s || view.x !== cam.x || view.y !== cam.y))) {
        rebuild(cur);
        drawnRev = cur.rev;
      } else if (cur.below !== innerOf) drawInner(cur);
      drawnKey = key;
      keyOf = cur.nodes;
      const c = cam!, w = weatherAt(v);
      if (bounds && zoomed) {
        view = viewOf(bounds, width, height, zoomed);
        const r = view.s / c.s;
        lens.scale.set(r);
        lens.position.set(view.x - r * c.x, view.y - r * c.y);
      }
      // the kept garden shows as its plot grows big enough on screen to see it, and fades the same way; so does each
      // neighbour's plot, drawn from its totals when it first shows and again only when they change
      const plot = cur.level === 2 ? boxes.get(PLAYER_PLOT) : undefined;
      inner.alpha = plot && view ? detailAlpha(plot.w * view.s) : 0;
      inner.visible = inner.alpha > 0.01;
      if (cur.level === 2 && view) {
        for (const n of drawn) {
          if (n.kind !== 'plot' || n.id === PLAYER_PLOT) continue;
          const b = n.box!, a = detailAlpha(b.w * view.s), x = view.x + b.x * view.s, y = view.y + b.y * view.s;
          const seen = a > 0.01 && x < width && y < height && x + b.w * view.s > 0 && y + b.h * view.s > 0;
          let d = detailed.get(n.id);
          if (!seen) {
            if (d) d.g.visible = false;
            continue;
          }
          const key = `${Math.round(n.totals.output / PLANT_KG)}.${Math.round(n.totals.health)}`;
          if (!d || d.key !== key) {
            const t = performance.now(), g = d?.g.clear() ?? new Graphics();
            drawDetail(g, detailOf(cur.seed, n), n, inside({x: 0, y: 0, w: TILE.w, h: TILE.h}, b, c), pal, cur.seed);
            if (!d) details.addChild(g);
            detailed.set(n.id, (d = {g, key}));
            detailMs.push(performance.now() - t);
            if (detailMs.length > 24) detailMs.shift();
          }
          d.g.visible = true;
          d.g.alpha = a;
        }
      } else if (detailed.size) dropDetails();
      tell(cur);
      // what grows: redrawn once a snapshot, and at most a few times a second (at 16× a snapshot comes every frame, and
      // the plants change too slowly to show a lag of a quarter of a second)
      if (grownOf !== cur.nodes && (grownAt === 0 || t0 - grownAt >= GROWN_MS || cur.rev !== grownRev)) {
        grown.clear();
        const g = drawGrown(grown, cur, c, pal);
        crops = g.crops;
        shapes = g.shapes;
        leaves = g.leaves;
        grownOf = cur.nodes;
        grownAt = t0;
        grownRev = cur.rev;
      }
      live.clear();
      const lived = drawLive(live, v, c, pal, w);
      over.clear();
      const frost = drawOver(over, v, c, pal, w, still);
      const fell = shower(v, c, w), date = calendar(v.hours), dusk = darkness(date), warm = warmth(date) * pal.dawnMax;
      weather = {rain: fell.n, snow: fell.snow, drops: fell.out, frost, dawn: warm, puddles: lived.puddles, leaves, soil: lived.soil};
      // the pests, wildlife and delights, from the sim's populations
      life.clear();
      const now = still ? Math.floor(v.hours) * 0.37 : performance.now() / 1000;
      const drawnLife = drawLife(life, v, c, pal, dusk, now, still, w);
      creatures = drawnLife.creatures;
      lifeStats = drawnLife.stats;
      // the people and things moving, one figure each, from their activities at the view time, stepping as they go
      // (a crowd past WALK_MAX glides, in the position-only container)
      const people = byWho(cur.activities), walking = people.length <= WALK_MAX, held = walking ? movers : crowd, taken = walking ? pool : crowdPool;
      const other = walking ? crowd : movers;
      if (other.particleChildren.length) {
        other.particleChildren.length = 0;
        other.update();
      }
      const out: {id: string; x: number; y: number}[] = [], shown = held.particleChildren;
      let used = 0, changed = false, steps = 0;
      carried.clear();
      glow.clear();
      torch = false;
      gardener = null;
      for (const l of people) {
        const a = current(l, v.hours);
        if (!place(a, v.hours, c)) continue;
        // out at work through the gate: not in the garden until they come home
        if (a.doing === 'away') {
          if (a.who === 'gardener') gardener = {id: a.id, doing: a.doing, to: a.to, x: at.x, y: at.y, item: null, frame: 0};
          continue;
        }
        let p = taken[used] as Walker | undefined;
        if (!p) taken.push((p = new Particle({texture: frames[0]!, anchorX: 0.5, anchorY: 0.5})));
        const s = Math.max(MIN_PERSON_PX / 0.5, c.s);
        let frame: 0 | 1 | 2 = 0;
        if (walking) {
          // the walk: a step every stride moved (the distance kept from frame to frame on the figure, reset by a jump, so
          // a figure taken over by another person starts afresh); standing still otherwise
          const wk = (p.walk ??= {who: a.who, x: at.x, y: at.y, d: 0}), moved = Math.hypot(at.x - wk.x, at.y - wk.y);
          if (wk.who !== a.who || moved >= s * 3 || still) {
            wk.d = 0;
            wk.who = a.who;
          } else if (moved > 0.05) wk.d += moved;
          wk.x = at.x;
          wk.y = at.y;
          frame = moved > 0.05 && !still && wk.d > 0 ? WALK[Math.floor(wk.d / (STRIDE_M * s)) % WALK.length]! : 0;
          p.texture = frames[(a.who === 'gardener' ? 0 : 3) + frame]!; // the uvs are dynamic: a new frame uploads with the positions
          if (frame) steps++;
        }
        p.x = at.x;
        p.y = at.y - (frame ? 0.02 * s : 0);
        if (out.length < 16) out.push({id: a.id, x: at.x, y: at.y});
        const item = itemOf(a.carry);
        // the helper's barrow, heaped by what they carry against what they said (src/ui/map/season.ts)
        if (a.carry?.product === 'barrow') drawBarrow(carried, a.carry, at.x + 0.3 * s, at.y + 0.02 * s, s, pal);
        else if (item) drawItem(carried, item, at.x + 0.2 * s, at.y + 0.02 * s, s, pal);
        if (a.who === 'gardener') gardener = {id: a.id, doing: a.doing, to: a.to, x: at.x, y: at.y, item, frame};
        // out after dark with a torch: a pool of light on the ground ahead of them, over the night
        if (a.doing === 'torch') {
          glow.circle(at.x + 0.25 * s, at.y + 0.1 * s, 0.7 * s).fill({color: pal.torch.color, alpha: 0.28});
          glow.circle(at.x + 0.25 * s, at.y + 0.1 * s, 0.35 * s).fill({color: pal.torch.color, alpha: 0.3});
          torch = true;
        }
        used++;
      }
      if (shown.length !== used) {
        shown.length = 0;
        for (let i = 0; i < used; i++) shown.push(taken[i]!);
        changed = true;
      }
      if (changed) held.update(); // the count changed: the static buffers are rebuilt
      lastMovers = out;
      stepping = steps;
      // the night falls with the sun, but at speed holds a steady light (a gentle dim through a quiet night), easing slowly;
      // the dawn's glow eases the same way and is held off at speed; both full-screen layers are skipped while clear
      const day = v.day;
      night.alpha = light(dusk * pal.nightMax, v.quiet ? pal.nightQuiet : 0, day, t0);
      night.visible = night.alpha > 0;
      dawn.alpha = dawnLight(warm, 0, day, t0);
      dawn.visible = dawn.alpha > 0;
      // the Explain card's place: a ring growing out from it and fading, once a second (held still under reduced motion)
      ring.clear();
      // the zoom back in's trace (part 9): one line from the neglected plot the slugs came from to the player's plot, a
      // few slugs along it, and the player's tile pulsing, while the outbreak runs unfixed
      const z = cur.level === 2 ? cur.zoom : null, tracing = !!z && !z.rescued && v.hours < z.event.from + z.event.days * 24;
      const a = tracing ? boxes.get(z!.from) : undefined, b = tracing ? boxes.get(PLAYER_PLOT) : undefined;
      traced = !!(a && b);
      if (a && b) {
        const x0 = c.x + (a.x + a.w / 2) * c.s, y0 = c.y + (a.y + a.h / 2) * c.s, x1 = c.x + (b.x + b.w / 2) * c.s, y1 = c.y + (b.y + b.h / 2) * c.s;
        ring.moveTo(x0, y0).lineTo(x1, y1).stroke({width: Math.max(2, 0.25 * c.s), color: pal.trace.color, alpha: pal.trace.alpha * 0.85});
        const time = still ? 0.5 : performance.now() / 8000;
        for (let i = 0; i < 3; i++) {
          const k = (time + i / 3) % 1;
          ring.ellipse(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, Math.max(2.5, 0.35 * c.s), Math.max(1.5, 0.18 * c.s)).fill(pal.slug);
        }
      }
      const ringAt = pulse ?? (performance.now() < highlight || b ? PLAYER_PLOT : null), box = ringAt ? boxes.get(ringAt) : undefined;
      if (box) {
        const k = still ? 0.5 : (performance.now() / 1000) % 1, grow = (0.1 + 0.5 * k) * c.s, t = Math.max(2, 0.06 * c.s);
        ring.roundRect(c.x + box.x * c.s - grow, c.y + box.y * c.s - grow, box.w * c.s + 2 * grow, box.h * c.s + 2 * grow, 0.2 * c.s + grow)
          .stroke({width: t, color: pal.pulse.color, alpha: pal.pulse.alpha * (1 - k * 0.8)});
      }
      if (zoom) stepZoom();
      else if (dive) stepDive();
      else if (settleAt && performance.now() >= settleAt) uncache();
      app.render();
      frameTimes.push(performance.now() - t0);
      if (frameTimes.length > 240) frameTimes.shift();
    },
    hit(x, y) {
      // the land scene has none of the level's places
      const c = view ?? cam;
      if (!c || scene) return null;
      const wx = (x - c.x) / c.s, wy = (y - c.y) / c.s;
      for (let i = drawn.length - 1; i >= 0; i--) {
        const b = drawn[i]!.box!;
        if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return drawn[i]!.id;
      }
      return null;
    },
    creatureAt(sx, sy) {
      if (scene) return null;
      // the creatures were placed at the camera the world was drawn at; the tap is on the view
      const r = view && cam ? cam.s / view.s : 1, x = view && cam ? cam.x + (sx - view.x) * r : sx, y = view && cam ? cam.y + (sy - view.y) * r : sy;
      let best: Creature | null = null, d = CREATURE_PX * CREATURE_PX * r * r;
      for (const k of creatures) {
        const e = (k.x - x) ** 2 + (k.y - y) ** 2;
        if (e <= d) {
          d = e;
          best = k;
        }
      }
      return best;
    },
    setPulse(at) {
      pulse = at;
    },
    skipZoom: () => endZoom() || endDive(),
    zoomBy(factor, x, y) {
      if (!zoomed || !bounds || zoom || dive) return;
      fly = null;
      move(zoomAbout(zoomed, factor, x, y, bounds, width, height, most));
    },
    panBy(dx, dy) {
      if (!zoomed || !bounds || zoom || dive) return;
      fly = null;
      move(panBy(zoomed, dx, dy, bounds, width, height, most));
    },
    flyTo(id) {
      if (!bounds || zoom || dive) return;
      const box = id && !scene ? boxes.get(id) : undefined;
      flyTo(box ? fillWith(box, bounds, width, height, most) : widest(bounds));
    },
    zoomStep(inwards) {
      if (!zoomed || !bounds || zoom || dive) return;
      const from = fly ? fly.to : zoomed;
      flyTo(zoomAbout(from, inwards ? STEP : 1 / STEP, width / 2, height / 2, bounds, width, height, most));
    },
    setLand(sc) {
      scene = sc;
      if (sc) {
        world.visible = false;
        landG.visible = true;
      } else sceneKey = '';
      fly = null;
    },
    onCamera(fn) {
      watchers.push(fn);
      const st = last && state(last);
      if (st) fn(st);
      return () => void watchers.splice(watchers.indexOf(fn) >>> 0, 1);
    },
    stats: () => ({frames: frameTimes.slice(), movers: lastMovers, stepping, cam: view ?? cam, zoomed, inner: inner.visible ? inner.alpha : 0,
      detailed: [...detailed].filter(([, d]) => d.g.visible).map(([id]) => id), detailMs: detailMs.slice(), landMs: landMs.slice(), landDrawn, scene: !!scene && landG.visible, weather, crops, shapes, gardener, life: lifeStats, creatures: creatures.slice(0, 40), torch, pulse, level, night: night.alpha,
      zoom: zoom ? Math.min(1, (performance.now() - zoom.start) / ZOOM_MS) : null, dive: dive ? Math.min(1, (performance.now() - dive.start) / ZOOM_MS) : null, trace: traced}),
    destroy() {
      app.destroy(false, {children: true, texture: true});
    },
  };
}
