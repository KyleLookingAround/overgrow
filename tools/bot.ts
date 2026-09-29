// The bot: plays Overgrow headless in Node, through createSim() and the same commands the player has, and measures its
// pacing (the founding spec, "How the bot measures pacing and balance from the first build"; the `balance` playbook).
//
//   npm run bot -- <game time> --seed <n> [--seed <n> …] [--player <name>] [--markdown <file>] [--json <file>]
//
// Game time is 120d, 2w, 1y or 36h (a bare number is days; 120d by default). For each seed it prints SEED, REACHED
// {milestone: game day}, PLAY (a fingerprint of the saved state that affects play) and ERR [...], then one table of
// every seed against tools/baseline.json. --markdown writes the same as Markdown (the Balance workflow's summary),
// --json every run in full. It exits 1 if any seed's ERR isn't empty, and never on a number. Run by vite-node, which
// Vitest brings, so the sim's TypeScript runs as it is, without a build step. The run itself is tools/bot/play.ts.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {table, type Baseline} from './bot/baseline';
import {MILESTONES} from './bot/milestones';
import {parseGameTime, play, type Run} from './bot/play';
import {PLAYERS} from './bot/player';

const here = dirname(fileURLToPath(import.meta.url));

function args(argv: string[]) {
  const out = {time: '120d', seeds: [] as number[], player: 'sensible', markdown: '', json: ''};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!, next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--') continue;
    else if (a === '--seed') out.seeds.push(Number(next()));
    else if (a === '--player') out.player = next();
    else if (a === '--markdown') out.markdown = next();
    else if (a === '--json') out.json = next();
    else if (!a.startsWith('--')) out.time = a;
    else throw new Error(`unknown option ${a}`);
  }
  if (!out.seeds.length) out.seeds.push(1);
  for (const s of out.seeds) if (!Number.isInteger(s)) throw new Error(`a seed is a whole number, not ${s}`);
  if (!PLAYERS[out.player]) throw new Error(`no player ${out.player}: ${Object.keys(PLAYERS).join(', ')}`);
  return out;
}

/** What the bot prints for one seed. */
export function block(run: Run): string {
  const reached = MILESTONES.filter((m) => m.reached).map((m) => `${m.id}: ${m.id in run.reached ? `day ${run.reached[m.id]}` : '—'}`);
  return [`SEED ${run.seed}`, `REACHED {${reached.join(', ')}}`, `PLAY ${run.play}`, `ERR ${JSON.stringify(run.err)}`].join('\n');
}

function main() {
  const o = args(process.argv.slice(2)), hours = parseGameTime(o.time), file = join(here, 'baseline.json');
  const base = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Baseline) : null;
  const runs: Run[] = [];
  for (const seed of o.seeds) {
    const t0 = performance.now(), run = play({seed, hours, player: PLAYERS[o.player]});
    runs.push(run);
    console.log(`${block(run)}\n(${o.player}, ${o.time}, ${((performance.now() - t0) / 1000).toFixed(1)} s)\n`);
  }
  if (base && base.gameTime !== o.time) console.log(`(the baselines are for ${base.gameTime}; this run is ${o.time})`);
  console.log(table(runs, base, 'text'));
  const write = (path: string, text: string) => {
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, text);
  };
  if (o.markdown) {
    const blocks = runs.map((r) => '```\n' + block(r) + '\n```').join('\n');
    const status = base ? `Baselines: \`tools/baseline.json\`, ${base.status}, for ${base.gameTime}.` : 'No baselines yet.';
    write(o.markdown, `## The bot, ${o.time}, player ${o.player}\n\n${status} \`ok\` inside the range, \`near\` within 15 %, \`off\` beyond (the \`balance\` playbook).\n\n${table(runs, base, 'markdown')}\n\n${blocks}\n`);
  }
  if (o.json) write(o.json, JSON.stringify(runs, null, 1));
  if (runs.some((r) => r.err.length)) process.exitCode = 1;
}

main();
