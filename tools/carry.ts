// The `carry` check's run (tools/checks/carry.mjs): the sensible bot plays seeds 1 to 3 until a season after the step
// up, and each sealed garden is held to the carry-over rule (src/sim/allotment.ts's carryReport(): the plot's Output
// against the garden's last full year within 1 %, its land and carbon carried exactly, and a first cycle rebuilt from the
// sealed node inside INFLATE_TOLERANCE). Prints one JSON line a seed. Run by vite-node, as the bot is.
import {carryReport} from '../src/sim/allotment';
import {fromSave} from '../src/sim/save';
import {parseGameTime, play} from './bot/play';

const seeds = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
for (const seed of seeds.length ? seeds : [1, 2, 3]) {
  const run = play({seed, hours: parseGameTime('520d'), keepSave: true});
  const s = fromSave(run.save!), report = carryReport(s);
  console.log(JSON.stringify({seed, stepUp: run.allotment?.day ?? null, err: run.err.length, report}));
}
