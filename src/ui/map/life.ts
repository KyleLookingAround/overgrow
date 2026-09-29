// The garden's small life on the map, drawn from the sim's populations (the founding spec: things that are stocks rather
// than jobs are drawn from their totals with cosmetic randomness seeded from the game's seed): slugs creeping on the beds
// after dark as many as the pest model has out, and the slime they leave by morning; aphids clustered on the plants they
// infest; bees over the flowers and the pollinated crops by day; ladybirds where the aphids and flowers are; and the
// neighbour's cat strolling the lawn on a dry day. Nothing here changes the game. Under reduced motion they move per
// tick. Where each creature was drawn is kept, so a tap on one opens its Explain card.
import type {Graphics} from 'pixi.js';
import type {View} from '../../app/clock-loop';
import type {Box, GraphNode} from '../../sim/graph';
import {bloomOn, wildlifeOf, type Wildlife} from '../../sim/models/biodiversity';
import {cropOf} from '../../sim/models/crops';
import {aphidsOn, pestsOf} from '../../sim/models/pests';
import {areaOf} from '../../sim/models/soil';
import type {Camera} from './draw';
import type {Palette} from './palette';

export interface Creature {
  cause: string;
  at: string;
  x: number;
  y: number;
}

export interface LifeStats {
  slugs: number;
  slime: number;
  aphids: number;
  bees: number;
  ladybirds: number;
  cat: boolean;
}

/** A number in [0, 1) from the game's seed, a place and an index: the same every frame (cosmetic). */
export function scatter(seed: number, id: string, i: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let k = 0; k < id.length; k++) h = Math.imul(h ^ id.charCodeAt(k), 0x01000193);
  h = Math.imul(h ^ (i + 1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const px = (b: Box, c: Camera) => ({x: c.x + b.x * c.s, y: c.y + b.y * c.s, w: b.w * c.s, h: b.h * c.s});
const wrap = (v: number) => ((v % 1) + 1) % 1;

// the places life is drawn on, looked up once per snapshot
const found = new WeakMap<GraphNode[], {beds: GraphNode[]; lawn: GraphNode | null; wild: Wildlife}>();
function places(nodes: GraphNode[]) {
  let f = found.get(nodes);
  if (!f) {
    const beds = nodes.filter((n) => n.kind === 'bed' && n.box && (n.stocks['land.crops']?.amount ?? 0) > 0);
    const lawn = nodes.find((n) => n.kind === 'lawn') ?? null;
    const g = {nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), edges: [], rev: 0};
    f = {beds, lawn, wild: wildlifeOf(g)};
    found.set(nodes, f);
  }
  return f;
}

/**
 * Draws the slugs, slime, aphids, bees, ladybirds and the cat for a view, returning where each creature is and the
 * counts. `dark` is 0 by day to 1 at night; `now` the seconds bees fly by (a tick's hour under reduced motion).
 */
export function drawLife(g: Graphics, v: View, c: Camera, pal: Palette, dark: number, now: number, still: boolean): {creatures: Creature[]; stats: LifeStats} {
  const {beds, lawn, wild} = places(v.cur.nodes), seed = v.cur.seed, creatures: Creature[] = [];
  const stats: LifeStats = {slugs: 0, slime: 0, aphids: 0, bees: 0, ladybirds: 0, cat: false};
  const hours = still ? Math.floor(v.hours) : v.hours, s = c.s;
  for (const n of beds) {
    const p = pestsOf(n), r = px(n.box!, c), pad = 0.1 * s;
    // slime: silvery trails where slugs were out in the last day, fading as it dries
    const since = p.slimed === null ? Infinity : v.hours - p.slimed;
    if (since < 18 && p.out < 0.5) {
      const alpha = pal.slime.alpha * (1 - since / 18), t = Math.max(1, 0.02 * s);
      for (let i = 0; i < 4; i++) {
        const x = r.x + pad + scatter(seed, n.id, 40 + i) * (r.w - 2 * pad), y = r.y + pad + scatter(seed, n.id, 50 + i) * (r.h - 2 * pad);
        g.moveTo(x, y).bezierCurveTo(x + 0.15 * s, y - 0.1 * s, x + 0.25 * s, y + 0.1 * s, x + 0.4 * s, y + 0.02 * s);
      }
      g.stroke({width: t, color: pal.slime.color, alpha});
      stats.slime++;
    }
    // slugs out: as many as the model has out, up to a dozen a bed, creeping slowly
    const slugs = p.out >= 0.5 ? Math.min(12, Math.ceil(p.out / 2)) : 0;
    for (let i = 0; i < slugs; i++) {
      const dir = scatter(seed, n.id, i) * Math.PI * 2, pace = 0.15 + 0.1 * scatter(seed, n.id, 20 + i);
      const fx = wrap(scatter(seed, n.id, 60 + i) + (Math.cos(dir) * pace * hours) / n.box!.w), fy = wrap(scatter(seed, n.id, 80 + i) + (Math.sin(dir) * pace * hours) / n.box!.h);
      const x = r.x + pad + fx * (r.w - 2 * pad), y = r.y + pad + fy * (r.h - 2 * pad), len = Math.max(4, 0.13 * s), wide = Math.max(2, 0.05 * s);
      g.ellipse(x, y, len / 2, wide / 2).fill(pal.slug);
      g.circle(x + (Math.cos(dir) * len) / 2, y + (Math.sin(dir) * len) / 2, wide * 0.45).fill(pal.slug);
      creatures.push({cause: 'slugs', at: n.id, x, y});
      stats.slugs++;
    }
    // aphids: clusters on the plants, more dots the thicker they are
    const dens = aphidsOn(n) / Math.max(1e-6, areaOf(n)), crop = cropOf(n);
    if (dens > 5 && crop && !crop.dead) {
      const per = Math.min(6, Math.ceil(Math.log10(dens))), clusters = Math.min(10, 2 + Math.floor(dens / 100)), dot = Math.max(1, 0.018 * s);
      for (let i = 0; i < clusters; i++) {
        const x0 = r.x + pad + scatter(seed, n.id, 100 + i) * (r.w - 2 * pad), y0 = r.y + pad + scatter(seed, n.id, 120 + i) * (r.h - 2 * pad);
        for (let k = 0; k < per; k++) g.circle(x0 + (scatter(seed, n.id, 200 + i * 8 + k) - 0.5) * 0.08 * s, y0 + (scatter(seed, n.id, 300 + i * 8 + k) - 0.5) * 0.08 * s, dot);
        creatures.push({cause: 'aphids', at: n.id, x: x0, y: y0});
      }
      g.fill(pal.aphid);
      stats.aphids += clusters;
    }
  }
  if (dark < 0.5) {
    // ladybirds where the aphids are (or the flowers), crawling
    const hosts = beds.filter((n) => aphidsOn(n) > 1 || bloomOn(n) > 0), lady = hosts.length ? Math.min(8, Math.round(wild.ladybirds)) : 0;
    for (let i = 0; i < lady; i++) {
      const n = hosts[i % hosts.length]!, r = px(n.box!, c), a = scatter(seed, n.id, 400 + i) * Math.PI * 2 + hours * 0.3;
      const x = r.x + r.w * (0.2 + 0.6 * scatter(seed, n.id, 420 + i)) + Math.cos(a) * 0.1 * s, y = r.y + r.h * (0.2 + 0.6 * scatter(seed, n.id, 440 + i)) + Math.sin(a) * 0.1 * s;
      const rad = Math.max(2, 0.035 * s);
      g.circle(x, y, rad).fill(pal.ladybird);
      g.circle(x, y, rad * 0.35).fill(pal['ladybird-spot']);
      creatures.push({cause: 'ladybirds', at: n.id, x, y});
      stats.ladybirds++;
    }
    // bees about the flowers, or else the pollinated crops, or anywhere over the beds
    const flowers = beds.filter((n) => bloomOn(n) > 0), crops = beds.filter((n) => cropOf(n) && !cropOf(n)!.dead);
    const over = flowers.length ? flowers : crops.length ? crops : beds, bees = over.length ? Math.min(12, Math.round(wild.bees)) : 0;
    for (let i = 0; i < bees; i++) {
      const n = over[i % over.length]!, r = px(n.box!, c), a = scatter(seed, 'bee', i) * Math.PI * 2 + now * (1.2 + scatter(seed, 'bee', 30 + i));
      const x = r.x + r.w / 2 + Math.cos(a) * r.w * 0.4, y = r.y + r.h / 2 + Math.sin(a * 1.3) * r.h * 0.4, rad = Math.max(2, 0.04 * s);
      g.ellipse(x, y, rad * 1.3, rad).fill(pal.bee);
      g.rect(x - rad * 0.2, y - rad, rad * 0.4, rad * 2).fill(pal['bee-stripe']);
      creatures.push({cause: 'bees', at: n.id, x, y});
      stats.bees++;
    }
    // the cat, on a dry day: along the lawn, pausing, a crossing every three hours or so
    if (wild.cat && lawn?.box) {
      const r = px(lawn.box, c), leg = wrap(hours / 3 + scatter(seed, 'cat', 0)), k = Math.min(1, Math.max(0, (leg - 0.15) / 0.7));
      const x = r.x + r.w * (0.1 + 0.8 * k), y = r.y + r.h * (0.72 + 0.12 * Math.sin(k * Math.PI * 2)), body = Math.max(6, 0.3 * s);
      g.ellipse(x, y, body / 2, body / 5).fill(pal.cat);
      g.circle(x + body / 2, y - body / 12, body / 6).fill(pal.cat);
      g.rect(x - body / 2 - body / 3, y - body / 20, body / 3, body / 12).fill(pal.cat);
      creatures.push({cause: 'cat', at: 'lawn', x, y});
      stats.cat = true;
    }
  }
  return {creatures, stats};
}
