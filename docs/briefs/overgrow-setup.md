# Brief: Overgrow, the runbook and the game's spec

*Kept as the owner wrote it. The architecture it describes for PR 1 (plain JavaScript joined into one page) was replaced with the owner on 28 Sep by the TypeScript scaffold: `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`, "Changed rather than copied".*

The owner, 28 Sep 2026, on a new game in the empty repo `KyleLookingAround/overgrow`:

> An upgrade sim game like Final Call, but based on agriculture, farming, food systems and anything that affects them, and the effects that has. Every level is a zoom-out, and what you micromanaged in one level becomes a single building block in the next. Your back garden becomes one plot in the community garden, the community garden becomes one field on the farm, and the farm becomes one supplier on the supermarket's map. A rough ladder, with the core problem changing at each scale:
> - **Back garden:** soil, watering, pests, what grows when. Time passes in days.
> - **Allotment or community garden:** shared space and water, other gardeners, swapping surplus.
> - **Smallholding or farm:** crop rotation, machinery, labour, weather risk. Time passes in seasons.
> - **Local distribution:** farm shops, markets and spoilage. Food now has a shelf life on the road.
> - **Supermarket supply chain:** depots, lorry routes, cold chain, demand spikes, waste.
> - **National or global:** imports, harvest failures abroad, fuel costs, food security.
>
> What makes this work is that the skills carry over but the unit changes. A pest outbreak you fixed by hand in level 1 is just a "yield −20%" event on a node by level 5. And the clock speeds up as you zoom out, from hours to seasons to years. One twist: occasionally let the player zoom back in. A national shortage could be traced to one failing farm, and you'd drop down and fix it at the small scale.

This session sets up the repo and writes the spec. It builds no game.

## Goal and what it may touch

Two PRs in `KyleLookingAround/overgrow`, in order. First run `add_repo` for `KyleLookingAround/final-call` (read) and clone it beside overgrow. It's the model for everything below: `npm run pack` there builds its whole runbook as one folder, and `docs/SYSTEMS.md` explains it.

1. **The runbook** (branch `feature/runbook` from overgrow's default branch). Port Final Call's way of working, adapted and trimmed to a new, empty game, not copied blindly. Cut anything that only makes sense for an airport or for a game already at version 34, and write down what was left out and why in `docs/decisions/`. It covers:
   - The project notes (`CLAUDE.md`), with the same attribution rules, the author KyleLookingAround <KyleMck10@hotmail.com>, and the owner's preferences carried over (below).
   - `.claude/settings.json` with attribution off, the SessionStart hook, and `.githooks/commit-msg`.
   - The `feature`, `steward`, `balance`, `release` and `coordinator` playbooks, rewritten for Overgrow.
   - `docs/briefs/TEMPLATE.md` with `tools/brief.mjs`, `docs/specs/TEMPLATE.md`, and the issue and PR templates.
   - The one-file-per-entry folders with `tools/join.mjs`: lessons, roadmap items, decisions, What's new fragments.
   - `tools/build.mjs`, which joins `src/game/*.js` and `src/shell.html` into `dist/index.html` and rejects `Math.random()` without `// cosmetic`.
   - `tools/check.mjs` with its check groups in `tools/checks/`, starting with `brief`, `graph` (if `tools/graph.mjs` comes across) and a `build` smoke test.
   - The GitHub workflows: Checks, Description, Pages publish and Catch up.
   - A placeholder `src/` that builds a blank page saying "Overgrow", so Pages publishes.

   Keep what Final Call's lessons proved worth it, and leave out what they record as costly. The lessons tidy PR #131, the Routines retired in #134, and the cost overruns are examples of each. It's done when `npm run build` and `npm run check` pass, the Checks workflow is green, and the Pages site shows the placeholder.
2. **The spec** (branch `feature/game-spec`, from the default branch after the runbook merges). Write `docs/specs/overgrow.md` from the spec template, marked `Proposed`, as the game's founding spec. It covers:
   - **The ladder:** each level's scale, its core problem, its clock, and what the level below collapses into. For example, a garden's soil, water, pests and planting become one plot's yield and quality.
   - **The carry-over rule, stated exactly:** which numbers from a level survive as a node's properties in the next one, and how an event at one scale shows at another. A pest outbreak is hand work in level 1 and "yield −20%" on a node by level 5.
   - **Zooming back in:** what triggers it (a shortage traced to one failing node), how the player drops down, what they fix, how long the level above waits, and what they win.
   - **The first playable slice:** the back garden and its step up to the allotment. Say exactly what ships first, what a player sees in the first minute, and what makes the jump to the allotment feel earned.
   - **The simulation's state and time:** saved state versus runtime, one clock that speeds up by level, and a headless run for a bot.
   - **How the bot measures pacing and balance from the first build.**
   - **Food-system effects** worth modelling, for example soil health, water, weather, pests, waste, spoilage, fuel costs, imports and food security. For each, say at which levels it appears and how it scales up.
   - **The look:** a canvas plus HTML panels in one page, like Final Call, working on phones down to 320 px, on tablets and on large screens.
   - **The first roadmap:** the parts in order, each one PR.

   Then open one issue labelled `needs-owner` listing every choice the owner must make, each with a default. Include at least:
   - how many levels ship at launch
   - whether levels are replayable or one continuous save
   - the name of each level
   - whether there's a fail state
   - real-world data or invented places
   - the art style

It may touch: anything in `KyleLookingAround/overgrow`. Nothing in `KyleLookingAround/final-call`: read it, never push to it.

**The owner's preferences, carried over from Final Call as defaults to confirm in the issue:**
- No choice of scenario at the start.
- Hide locked things instead of greying them out.
- Show impacts on the map, not as text events.
- Concise UK English.
- Balance checked with a bot.
- A long headless simulation that keeps working.
- Phones (portrait and landscape, 320 px), tablets and large screens.
- Managers and recommendations for players who don't want the details.
- Saves on the device.

## Read first

- In final-call: its project notes, then `node tools/graph.mjs brief`, `node tools/graph.mjs join.mjs` and `node tools/graph.mjs check.mjs`, and only what they list. Also read `docs/SYSTEMS.md`, the five playbooks under `.claude/skills/`, `docs/LESSONS.md` (for what cost time and money), and `docs/specs/TEMPLATE.md` with one approved spec such as `docs/specs/late-runners.md`.
- In overgrow: whatever is already there, and don't overwrite the owner's files.

## Speed budget

None: no game code beyond a placeholder page. The spec sets the first slice's budget, as `perf` and `scene` do in Final Call.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com>. Set `git config user.email` and `user.name` in the overgrow clone before the first commit. Its hooks don't exist until PR 1 adds them.

## Who merges and when

- **PR 1 (runbook):** you merge it with Squash and merge once the Checks and Description workflows it adds are green on it. If the repo has no branch rules yet, still merge only through the PR. Then confirm the Pages publish. If Pages isn't enabled for the repo, say so to the owner in the PR and in your final message: it's switched on in the repo's Settings › Pages, source "GitHub Actions".
- **PR 2 (spec):** open it with the spec `Proposed` and the `needs-owner` issue. Subscribe to its events and keep one `send_later` (about an hour) as the fallback. If the owner approves, mark it `Approved`, write the look back into the PR, and merge. With no answer after 12 hours, merge it still `Proposed`: nothing is built until the owner approves.
- After opening each PR, read its description back and remove any "Generated by" footer or session link.

## What's left for others

- Not this session: any game code past the placeholder, and anything in Final Call.
- After approval: the first slice's parts, each in a fresh session from a brief, started by the owner or a coordinator.
- In Final Call meanwhile: multiple floors (#133) is in its step 2 (checks refresh and refactor 7), and the Roadmap tab spec (#137) waits on the owner's #143. Income is on hold.

## When to stop and ask

- Only for something irreversible or outside this brief. Examples: repo settings you can't change, such as Pages or branch rules; or anything that would push to final-call.
- Otherwise, if it truly needs the owner: open an issue in overgrow labelled `needs-owner` with the question and the option it will take by default, carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing less) and say so in the PR.

## Cost budget

- Estimate: about $25. The runbook port is most of it: many files, rewritten rather than copied, plus two or three CI rounds while the new workflows settle. The spec is about $8 of it.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. The owner has said to ignore `allowed_warning`.
- Starting another session (`create_session`)? Don't.
- Past twice the estimate: say why in the PR and in the look back (`docs/lessons/`), and trim or split what's left.
