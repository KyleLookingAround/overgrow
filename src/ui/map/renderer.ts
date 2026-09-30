// The map's renderer: PixiJS on WebGL, or Pixi's Canvas 2D renderer where WebGL is missing
// (docs/decisions/ADR-2026-09-28-webgl-map.md). It draws the level's nodes in the flat, top-down, soft style
// (src/ui/map/draw.ts), the people and things moving from the snapshot's activities at the view time the clock loop
// gives it (one figure for each person, where their latest-started activity puts them, with what they carry, and none
// while they're away at work beyond the gate), the
// weather (a shower crossing the garden while the sim says it rains, a rime while it says there's frost), the crops in
// the beds, the garden's pests and wildlife (src/ui/map/life.ts), the gardener's torch after dark, a ring pulsing at the
// place an Explain card is about, and the night falling. The ground is drawn once and redrawn only when the graph, the size or the colours change; what
// moves is a pool of particles placed each frame, so thousands stay cheap. Nothing drawn changes the game.
// docs/systems/map.md.
import {Application, Container, Graphics, Particle, ParticleContainer, Rectangle, Sprite, type Texture} from 'pixi.js';
import {PLAYER_PLOT} from '../../data/allotment';
import {placeAt, type Activity} from '../../sim/activity';
import {calendar} from '../../sim/clock';
import type {Box, GraphNode, NodeId} from '../../sim/graph';
import type {View} from '../../app/clock-loop';
import {darkness, daySeconds, steadyLight} from './daylight';
import type {Stage} from '../../sim/models/crops';
import {drawBarrow} from './season';
import {camera, drawItem, drawLive, drawNode, drawPerson, groundKey, itemOf, weatherAt, type Camera} from './draw';
import {drawLife, type Creature, type LifeStats} from './life';
import type {Palette} from './palette';

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
  /** For the checks: the last frames' times in ms, where the first movers are drawn (in CSS pixels), the weather, each
   *  dug bed's crop stage, and the gardener: what they're doing, where, and what they carry. */
  stats(): {
    frames: number[]; movers: {id: string; x: number; y: number}[]; cam: Camera | null; weather: WeatherStats; crops: Record<string, Stage>; gardener: GardenerStats | null;
    life: LifeStats; creatures: Creature[]; torch: boolean; pulse: NodeId | null;
    /** The night layer's opacity. */
    night: number;
    /** The level drawn, the step up's zoom-out and the dive: running, and how far through, 0–1; and the trace drawn. */
    level: number; zoom: number | null; dive: number | null; trace: boolean;
  };
  destroy(): void;
}

/** What the weather drawn last frame came to, for the checks: raindrops shown and the first few's places, the frost's
 *  opacity, and each dug bed's soil from -1 (dry) to 1 (soaked). */
export interface WeatherStats {
  rain: number;
  drops: {x: number; y: number}[];
  frost: number;
  soil: Record<string, number>;
}

export interface GardenerStats {
  id: string;
  doing: string;
  to: string;
  x: number;
  y: number;
  item: string | null;
}

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
  const ground = new Graphics(), live = new Graphics(), life = new Graphics(), night = new Graphics(), carried = new Graphics(), glow = new Graphics(), ring = new Graphics();
  const movers = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: false, color: false}});
  const rain = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: false, color: false}});
  // everything is drawn in the world, which the step up's zoom-out moves; the garden's last picture shrinks over it
  const world = new Container();
  world.addChild(ground, live, life, movers, carried, rain, night, glow, ring);
  app.stage.addChild(world);
  let level = -1, zoom: {start: number; shot: Sprite | null} | null = null, highlight = 0;
  // the zoom back in's dive (part 9): the allotment's last picture, and where the player's plot sat on it
  let traced = false;
  let dive: {start: number; shot: Sprite; P: {x: number; y: number}; pw: number; ph: number} | null = null;
  let pal = palette, width = w, height = h, cam: Camera | null = null, drawnRev = -1, drawnKey = '', keyOf: GraphNode[] | null = null;
  const light = steadyLight(); // the night layer's opacity, never flashing (src/ui/map/daylight.ts)
  let person: Texture | null = null, drop: Texture | null = null, still = false, garden: Box | null = null;
  const drops: Particle[] = [];
  let weather: WeatherStats = {rain: 0, drops: [], frost: 0, soil: {}};
  let crops: Record<string, Stage> = {}, gardener: GardenerStats | null = null;
  let boxes = new Map<NodeId, Box>(), drawn: GraphNode[] = [];
  const pool: Particle[] = [], frames: number[] = [];
  let lastMovers: {id: string; x: number; y: number}[] = [];
  let creatures: Creature[] = [], lifeStats: LifeStats = {slugs: 0, slime: 0, aphids: 0, bees: 0, ladybirds: 0, cat: false}, torch = false, pulse: NodeId | null = null;

  const rebuild = (nodes: GraphNode[]) => {
    drawn = nodes.filter((n) => n.box);
    boxes = new Map(drawn.map((n) => [n.id, n.box!]));
    ends = new WeakMap();
    cam = camera(drawn, width, height);
    ground.clear();
    ground.rect(0, 0, width, height).fill(pal.edge);
    for (const n of drawn) drawNode(ground, n, cam, pal);
    night.clear().rect(0, 0, width, height).fill({color: pal.night.color, alpha: 1});
    person?.destroy(true);
    const g = new Graphics();
    drawPerson(g, Math.max(MIN_PERSON_PX / 0.5, cam.s), pal);
    person = app.renderer.generateTexture({target: g, resolution: window.devicePixelRatio || 1, antialias: true});
    g.destroy();
    movers.texture = person;
    for (const p of pool) p.texture = person;
    movers.update();
    // a raindrop: a short slanted streak, about 30 cm long at the garden's scale
    drop?.destroy(true);
    const d = new Graphics(), len = Math.max(6, 0.3 * cam.s), wide = Math.max(1, 0.025 * cam.s), lean = len * 0.27;
    d.poly([lean, 0, lean + wide, 0, wide, len, 0, len]).fill({color: pal.rain.color, alpha: 1});
    drop = app.renderer.generateTexture({target: d, resolution: window.devicePixelRatio || 1, antialias: true});
    d.destroy();
    rain.texture = drop;
    rain.alpha = pal.rain.alpha;
    for (const p of drops) p.texture = drop;
    rain.update();
    garden = drawn.find((n) => n.kind === 'lawn')?.box ?? null;
  };
  // the shower: while the sim says it rains, streaks fall across the garden, as many as the rain is heavy, its front
  // crossing from the west as it starts and leaving to the east as it stops; still, but shown, under reduced motion
  const shower = (v: View, c: Camera, w: ReturnType<typeof weatherAt>) => {
    let n = 0;
    const out: {x: number; y: number}[] = [];
    if (w && garden && w.day.rainHours > 0) {
      const {day, t} = w, x0 = c.x + garden.x * c.s, y0 = c.y + garden.y * c.s, gw = garden.w * c.s, gh = garden.h * c.s;
      const want = Math.min(DROPS.max, Math.round(DROPS.min + DROPS.perMm * (day.rain / day.rainHours)));
      const time = still ? Math.floor(v.hours) * 0.37 : performance.now() / 1000, lean = 0.27 * (gh / gw);
      for (let i = 0; i < want; i++) {
        const across = SCATTER[3 * i]!, since = t - day.rainFrom - FRONT_HOURS * across;
        if (since < 0 || since >= day.rainHours) continue;
        const fall = (SCATTER[3 * i + 1]! + time * (1.2 + 0.4 * SCATTER[3 * i + 2]!)) % 1;
        let p = drops[n];
        if (!p) drops.push((p = new Particle({texture: drop!})));
        p.x = x0 + ((((across - fall * lean) % 1) + 1) % 1) * gw; // falling along its slant, down and to the left
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
    return {n, out};
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
  const endZoom = () => {
    if (!zoom) return false;
    zoom.shot?.destroy({texture: true});
    zoom = null;
    world.scale.set(1);
    world.position.set(0, 0);
    if (holder) delete holder.dataset.zooming;
    return true;
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
      const tex = app.renderer.generateTexture({target: world, frame: new Rectangle(x0, y0, x1 - x0, y1 - y0), resolution: window.devicePixelRatio || 1});
      shot = new Sprite(tex);
      app.stage.addChild(shot);
    }
    zoom = {start: performance.now(), shot};
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
    if (!zoom || !box || !cam) return void endZoom();
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
    },
    setReducedMotion(on) {
      still = on;
    },
    draw(v) {
      const t0 = performance.now(), cur = v.cur;
      // the ground: redrawn when the graph changes, or a bed plot is dug (checked once a snapshot)
      const key = keyOf === cur.nodes ? drawnKey : groundKey(cur.nodes);
      // the step up: the garden's picture taken before the allotment is drawn
      const stepped = level === 1 && cur.level === 2;
      if (stepped && !still && cam) startZoom();
      // going down: the allotment's picture taken before the garden is drawn
      if (level === 2 && cur.level === 1 && !still && cam) startDive();
      if (cur.level !== level) {
        if (level !== -1 && cur.level === 2) highlight = performance.now() + (still ? 0 : ZOOM_MS) + HIGHLIGHT_MS;
        if (cur.level !== 2) endZoom();
        if (cur.level !== 1) endDive();
        level = cur.level;
      }
      if (cur.rev !== drawnRev || key !== drawnKey || !cam) {
        rebuild(cur.nodes);
        drawnRev = cur.rev;
      }
      drawnKey = key;
      keyOf = cur.nodes;
      const c = cam!;
      live.clear();
      const w = weatherAt(v), {crops: grown, ...lived} = drawLive(live, v, c, pal, w), fell = shower(v, c, w);
      weather = {rain: fell.n, drops: fell.out, ...lived};
      crops = grown;
      // the pests and wildlife, from the sim's populations
      const dusk = darkness(calendar(v.hours));
      life.clear();
      const drawnLife = drawLife(life, v, c, pal, dusk, still ? Math.floor(v.hours) * 0.37 : performance.now() / 1000, still);
      creatures = drawnLife.creatures;
      lifeStats = drawnLife.stats;
      // the people and things moving, one figure each, from their activities at the view time
      const out: {id: string; x: number; y: number}[] = [], shown = movers.particleChildren;
      let used = 0;
      carried.clear();
      glow.clear();
      torch = false;
      gardener = null;
      for (const l of byWho(cur.activities)) {
        const a = current(l, v.hours);
        if (!place(a, v.hours, c)) continue;
        // out at work through the gate: not in the garden until they come home
        if (a.doing === 'away') {
          if (a.who === 'gardener') gardener = {id: a.id, doing: a.doing, to: a.to, x: at.x, y: at.y, item: null};
          continue;
        }
        let p = pool[used];
        if (!p) pool.push((p = new Particle({texture: person!, anchorX: 0.5, anchorY: 0.6})));
        p.x = at.x;
        p.y = at.y;
        if (out.length < 16) out.push({id: a.id, x: at.x, y: at.y});
        const item = itemOf(a.carry), s = Math.max(MIN_PERSON_PX / 0.5, c.s);
        // the helper's barrow, heaped by what they carry against what they said (src/ui/map/season.ts)
        if (a.carry?.product === 'barrow') drawBarrow(carried, a.carry, at.x + 0.3 * s, at.y + 0.02 * s, s, pal);
        else if (item) drawItem(carried, item, at.x + 0.2 * s, at.y + 0.02 * s, s, pal);
        if (a.who === 'gardener') gardener = {id: a.id, doing: a.doing, to: a.to, x: at.x, y: at.y, item};
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
        for (let i = 0; i < used; i++) shown.push(pool[i]!);
        movers.update();
      }
      lastMovers = out;
      // the night falls with the sun, but at speed holds a steady light (a gentle dim through a quiet night), easing slowly
      night.alpha = light(dusk * pal.nightMax, v.quiet ? pal.nightQuiet : 0, daySeconds(cur.level, cur.speed, v.quiet), t0);
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
      if (dive) stepDive();
      app.render();
      frames.push(performance.now() - t0);
      if (frames.length > 240) frames.shift();
    },
    hit(x, y) {
      if (!cam) return null;
      const wx = (x - cam.x) / cam.s, wy = (y - cam.y) / cam.s;
      for (let i = drawn.length - 1; i >= 0; i--) {
        const b = drawn[i]!.box!;
        if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return drawn[i]!.id;
      }
      return null;
    },
    creatureAt(x, y) {
      let best: Creature | null = null, d = CREATURE_PX * CREATURE_PX;
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
    stats: () => ({frames: frames.slice(), movers: lastMovers, cam, weather, crops, gardener, life: lifeStats, creatures: creatures.slice(0, 40), torch, pulse, level, night: night.alpha,
      zoom: zoom ? Math.min(1, (performance.now() - zoom.start) / ZOOM_MS) : null, dive: dive ? Math.min(1, (performance.now() - dive.start) / ZOOM_MS) : null, trace: traced}),
    destroy() {
      app.destroy(false, {children: true, texture: true});
    },
  };
}
