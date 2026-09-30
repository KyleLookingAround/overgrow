// The bot: plays Overgrow headless in Node, through createSim() and the same commands the player has, and measures its
// pacing (the founding spec, "How the bot measures pacing and balance from the first build"; the `balance` playbook).
//
//   npm run bot -- <game time> --seed <n> [--seed <n> …] [--player <name>] [--markdown <file>] [--json <file>]
//
// Game time is 120d, 2w, 1y or 36h (a bare number is days; 120d by default). For each seed it prints SEED, REACHED
// {milestone: game day}, PLAY (a fingerprint of the saved state that affects play) and ERR [...], then one table of
// every seed against tools/baseline.json; how long each seed took goes to stderr, so two runs' output diff cleanly.
// --markdown writes the same as Markdown (the Balance workflow's summary), --json every run in full. It exits 1 if any seed's ERR isn't empty, and never on a number. Run by vite-node, which
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
  const bought = run.bought.map((b) => `${b.id}: day ${b.day}`).join(', ');
  const food = `eaten ${run.days.reduce((a, d) => a + d.eaten, 0).toFixed(1)}, sold ${run.days.reduce((a, d) => a + d.sold, 0).toFixed(1)}, preserved ${run.preserved.toFixed(1)}, given ${run.given.toFixed(1)}, wasted ${run.wasted.toFixed(1)}`;
  return [`SEED ${run.seed}`, `REACHED {${reached.join(', ')}}`, `BOUGHT {${bought}}`, `FOOD kg {${food}}`, `QUIET ${run.quiet.days} days from day ${run.quiet.from}`, ...purseLines(run), ...(run.allotment ? [allotmentLine(run.allotment)] : []), `PLAY ${run.play}`, `ERR ${JSON.stringify(run.err)}`].join('\n');
}

/** The purse (round four): its £ at each 30 days, the longest run of days it sat under £1, and the longest wait between
 *  one purchase (a cordon's included) and the next. */
export function purseLines(run: Run): string[] {
  const month = run.days.filter((d) => d.day % 30 === 0).map((d) => `${d.day}: £${d.money.toFixed(0)}`);
  let zero = {days: 0, from: 0}, run0 = 0;
  for (const d of run.days) {
    run0 = d.money < 1 ? run0 + 1 : 0;
    if (run0 > zero.days) zero = {days: run0, from: d.day - run0 + 1};
  }
  let gap = {days: 0, from: 0};
  run.bought.forEach((b, i) => {
    const last = i ? run.bought[i - 1]!.day : 1;
    if (b.day - last > gap.days) gap = {days: b.day - last, from: last};
  });
  return [`PURSE {${month.join(', ')}}`, `EMPTY ${zero.days} days from day ${zero.from}; LONGEST WAIT TO BUY ${gap.days} days from day ${gap.from}`];
}

/** The allotment's line: the step-up day, and the plot's and the neighbours' numbers at the end. */
function allotmentLine(a: NonNullable<Run['allotment']>): string {
  const n = a.neighbours;
  return `ALLOTMENT {step-up: day ${a.day}, days: ${Math.round(a.days)}, plan: ${a.plan}, plot kg/day: ${a.output.toFixed(3)}, health: ${a.health.toFixed(1)}, upkeep £/day: ${a.upkeep.toFixed(2)}, saved £: ${a.saved.toFixed(2)}, ` +
    `neighbours kg/day: ${n.output.toFixed(3)}, health: ${n.health.toFixed(1)}, neglected health: ${n.neglected.toFixed(1)}}\n` + seasonLine(a.season);
}

/** The first season's line (src/sim/season.ts): the second plot's day, the first swap's, the vote, the helper's hidden take, and the quiet. */
function seasonLine(s: NonNullable<Run['allotment']>['season']): string {
  const day = (d: number | null) => (d === null ? '—' : `day ${d}`), v = s.vote;
  return `SEASON {second plot: ${day(s.second)}, reclaimed: ${(s.reclaimed * 100).toFixed(0)} %, second kg/day home: ${s.secondKg.toFixed(3)}, helper hidden kg: ${s.hidden.toFixed(2)} (reported ${s.reported.toFixed(2)}), ` +
    `first swap: ${day(s.swap)}, vote: ${v ? `day ${v.day}, ${v.motion} ${v.passed ? 'passed' : 'lost'} ${v.yes}–${v.no}` : '—'}, quiet at the allotment: ${s.quiet.days} days from day ${s.quiet.from}}`;
}

function main() {
  const o = args(process.argv.slice(2)), hours = parseGameTime(o.time), file = join(here, 'baseline.json');
  const base = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Baseline) : null;
  const runs: Run[] = [];
  for (const seed of o.seeds) {
    const t0 = performance.now(), run = play({seed, hours, player: PLAYERS[o.player]});
    runs.push(run);
    console.log(`${block(run)}\n`);
    console.error(`(seed ${seed}, ${o.player}, ${o.time}: ${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  }
  if (base && parseGameTime(base.gameTime) !== hours) console.log(`(the baselines are for ${base.gameTime}; this run is ${o.time})`);
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
