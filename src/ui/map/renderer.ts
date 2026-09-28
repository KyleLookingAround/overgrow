// The map's renderer: PixiJS on WebGL, or Pixi's Canvas 2D renderer where WebGL is missing
// (docs/decisions/ADR-2026-09-28-webgl-map.md). It draws the level's nodes in the flat, top-down, soft style
// (src/ui/map/draw.ts), the people and things moving from the snapshot's activities at the view time the clock loop
// gives it, and the night falling. The ground is drawn once and redrawn only when the graph, the size or the colours
// change; what moves is a pool of particles placed each frame, so thousands stay cheap. Nothing drawn changes the game.
// docs/systems/map.md.
import {Application, Graphics, Particle, ParticleContainer, type Texture} from 'pixi.js';
import {placeAt, type Activity} from '../../sim/activity';
import {calendar} from '../../sim/clock';
import type {Box, GraphNode, NodeId} from '../../sim/graph';
import type {View} from '../../app/clock-loop';
import {darkness} from './daylight';
import {camera, drawLive, drawNode, drawPerson, type Camera} from './draw';
import type {Palette} from './palette';

export interface MapRenderer {
  /** 'webgl', or 'canvas' where WebGL is missing. */
  readonly kind: string;
  resize(w: number, h: number): void;
  setPalette(p: Palette): void;
  draw(v: View): void;
  /** The drawn node under a point in CSS pixels, or null. */
  hit(x: number, y: number): NodeId | null;
  /** For the checks: the last frames' times in ms, and where the first movers are drawn, in CSS pixels. */
  stats(): {frames: number[]; movers: {id: string; x: number; y: number}[]; cam: Camera | null};
  destroy(): void;
}

const MIN_PERSON_PX = 6;

export async function createRenderer(canvas: HTMLCanvasElement, palette: Palette, w: number, h: number): Promise<MapRenderer> {
  const app = new Application();
  await app.init({
    canvas, width: w, height: h, resolution: window.devicePixelRatio || 1, autoDensity: true, antialias: true, backgroundAlpha: 0,
    preference: ['webgl', 'canvas'], autoStart: false, sharedTicker: false,
  });
  const ground = new Graphics(), live = new Graphics(), night = new Graphics();
  const movers = new ParticleContainer({dynamicProperties: {position: true, vertex: false, rotation: false, uvs: false, color: false}});
  app.stage.addChild(ground, live, movers, night);
  let pal = palette, width = w, height = h, cam: Camera | null = null, drawnRev = -1, person: Texture | null = null;
  let boxes = new Map<NodeId, Box>(), drawn: GraphNode[] = [];
  const pool: Particle[] = [], frames: number[] = [];
  let lastMovers: {id: string; x: number; y: number}[] = [];

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
    draw(v) {
      const t0 = performance.now(), cur = v.cur;
      if (cur.rev !== drawnRev || !cam) {
        rebuild(cur.nodes);
        drawnRev = cur.rev;
      }
      const c = cam!;
      live.clear();
      drawLive(live, v, c, pal);
      // the people and things moving, from the activities, at the view time
      const acts = cur.activities, out: {id: string; x: number; y: number}[] = [], shown = movers.particleChildren;
      let used = 0;
      for (const a of acts) {
        if (!place(a, v.hours, c)) continue;
        let p = pool[used];
        if (!p) pool.push((p = new Particle({texture: person!, anchorX: 0.5, anchorY: 0.6})));
        p.x = at.x;
        p.y = at.y;
        if (out.length < 16) out.push({id: a.id, x: at.x, y: at.y});
        used++;
      }
      if (shown.length !== used) {
        shown.length = 0;
        for (let i = 0; i < used; i++) shown.push(pool[i]!);
        movers.update();
      }
      lastMovers = out;
      night.alpha = darkness(calendar(v.hours)) * pal.nightMax;
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
    stats: () => ({frames: frames.slice(), movers: lastMovers, cam}),
    destroy() {
      app.destroy(false, {children: true, texture: true});
    },
  };
}
