# Labour

The hours people have, the work a field needs, what a hand costs and what doesn't fit (`src/sim/models/labour.ts`, its plausibility test `src/sim/models/labour.test.ts`, and its data `src/data/labour.ts`). Written ahead of part 13, which wires it; nothing in the game calls it yet, and it isn't in `src/sim/systems.ts`. The gardener (`docs/systems/gardener.md`) is the same rule at back-garden scale.

- **Hours** (`dayHours()`, `hoursOver()`): a person of a role (`owner`, `hired hand`, `seasonal picker`) has so many hours a day by season and weekday, from the Defra Farm Business Survey's working week: a hand about 39 hours a week (none at the weekend), the owner ten hours in summer and six in winter, a seasonal picker only in summer and autumn. A worker's `goals.hoursCap` lowers the day; that's the only goal the model reads. Over a step longer than a day (levels 6 and up) a week's mix is averaged.
- **Work** (`workNeeded()`, `peakMonth()`): hours a hectare a year by crop (AHDB and Nix: potatoes about 90, carrots 200, cabbages 220, wheat 12), spread by month with peaks at sowing and, larger, at harvest, so a harvest month needs three to four times a quiet one's hours. Hand and small machine at experienced pace; `machinery.ts` gives the hand against tractor hours.
- **Pay** (`wageCost()`): rough 2026 figures, £13.50 an hour for a hired hand and £12.71 (the National Living Wage) for a seasonal picker, each with 20 % on top for holiday pay, pension and National Insurance; the owner takes profit, not a wage.
- **Skill** (`timeFactor()`, `factorOf()`): a worker has `skills` (`sowing`, `harvest`, `general`, each 0–1) that the agency system will grow and decide; a job takes 1 / (0.5 + 0.5 × skill) times as long, so a beginner takes twice an experienced hand's time.
- **What fits** (`fit()`): jobs in order, each given to the most skilled worker with hours left, then the next; what doesn't fit is returned as `waiting` to be planned again tomorrow (the gardener's rule at farm scale).
- **Does a hand pay?** (`hireBenefit()`, `waitValue()`): a hand saves only the work that would otherwise wait. That work is worth the crop's margin an hour of its work, less a quarter for each week it waits (leaves bolt, potatoes go green); when everything fits without the hand their wages are all cost.
- **Fast effect** a day's hours spent and a job left waiting; **slow effect** a hand's skill and wages over the seasons, and a farm growing past one person.
- **Speed**: the `labour` system, 20 workers and 50 fields, 20 loaded stores with the other two models' systems, takes about 0.14 ms a game day headless in Node 22 (a 2.1 GHz Xeon), all three together; `fit()` on 100 jobs and 20 workers takes about 0.2 ms, and is only called when the wiring part plans a day.

## Hooks for the levels above

Added for the owner's answers on #29 (all pure, none wired):

- **Wages as a parameter** (`Wages`, `WAGES` the default, `wageCost(role, hours, wages?)`, `hireBenefit({… wages})`): the table is passed, so a level above can set it; `withMinimumWage(minimum, wages?)` gives a new table with every paid role's hourly wage at least the minimum (the owner stays unpaid, and the default table is left alone). A higher wage raises the cost and lowers what a hand nets.
- **A wage-payment flow** (`payWages(c, worker, hours, payer, wages?)`): the wage goes from the payer's `money` to the worker's own `money` stock if their node has one, else out of the model to `bought`, and the employer's on-cost (holiday, pension, National Insurance) goes to `bought`. It returns the wage, the on-cost and the total; nothing is paid without hours, a payer with a purse or a worker record.
- **An off-farm role for the owner** (`Worker.goals.offFarm`, `offFarmDay(job, weekday, share?)`, `earnOffFarm(c, node, job, weekday, share?)`): the household model's job (`JOBS` and `WAGE` in `src/data/household.ts`): its hours at work, the commute on a working day and the take-home pay (about £14.75 an hour). A worker with a job away has those hours and the commute taken off their weekdays (`dayHours`, and so `hoursOver`), so a full-time job leaves the owner about an hour on a summer weekday and the weekend, and the pay comes into the farm's purse from outside as the `off-farm pay` flow. A test holds the hours, commute and pay to the household model's for every weekday.

## Wiring

For part 13:

- **Nodes and levers.** A person who works is a `person` node with a `worker` lever (`Worker`: `id`, `role`, `skills`, `goals`) and an `hours` stock in `h`. The lever is the agency system's to set; the first hire's `skills` and `goals` fields are the hook.
- **Boundaries.** None new: `time` gives and takes the hours, as for the gardener.
- **System.** Add `labour` to `src/sim/systems.ts` after the gardener. Each `day` it hands back unused hours and gives the day's.
- **Commands.** Hire and let go, and the plan the hand follows, are part 13's (through `src/sim/commands.ts`); `hireBenefit()` is what its panel shows as "would pay back / wouldn't".
- **Map and panel.** Draw each worker like the gardener, from their activities; show hours left today, and the work waiting (`fit().waiting`) as a queue of fields, so the player sees what a hand would save before paying.
