# Brief: part 9, the first zoom back in

The founding spec's roadmap, part 9: "The first zoom back in: the trace, Go down or Send someone, the deadline and reward, on the scripted slug outbreak." Part 7 (#70) built the step up and keeps the garden below in `State.ladder`; part 8 (#79) wired the neighbours, and left `neglectedPlot(seed)` for this part (`docs/systems/agency.md`, "Wiring", part 9). The seed catalogue's adviser with an interest (`recommend`, `tilt`) is written and tested, and waits for this part to reach the player.

The owner's decision 20 asks for level 1 to feel awesome and for work on the next levels to start. Decision 21 ("presentation is everything") and decision 18 (the UI overhaul, mobile first) set how it's shown. Decision 22 (no full-map light swinging between day and night faster than the eye can follow, at any speed) holds for the dive and the deadline strip too.

## Goal and what it may touch

- **Deliver** one PR on `feature/zoom-back-in` from `main`. Start from a GitHub issue (the Feature template).
  - **Spec:** write `docs/specs/zoom-back-in.md` from the template. The coordinator approves it (decisions 15 and 20), so nothing waits on the owner.
- **In priority order.** Trim from the bottom if it runs long, and say in the PR what you trimmed. Teach the bot each item as it lands.
  1. **The scripted outbreak and the trace.** In the allotment's first summer (the spec's "Zooming back in": scripted, so every game teaches it in the same place), slugs from the neglected plot (`neglectedPlot(seed)`: the plot and its holder, unchanged) get into the player's own garden, the sealed node below. The garden's Output falls, and the allotment map draws the trace: a line from the shortfall to the player's sealed garden tile, which pulses. Make it a real event on the sealed node (`GameEvent`, `eventFactor`), so the kg lost are conserved and show in the level's numbers.
  2. **Go down.** Tap the tile, then **Go down**. The camera dives into the garden (the zoom-out in reverse, `docs/specs/step-up.md`), and the garden opens from what `State.ladder` kept, with the slugs' event in it and the gardener and the player's plan as they were. One clock: it runs at the garden's rate while you're down, so the allotment barely moves. A deadline in garden days shows as a strip across the top, with the allotment's shortfall still counting. The fix is through the garden's own tools (the slug policy, the beer traps, the hens, the gardener's evening rounds), never a new button. **Back up** returns you to the allotment when you like; the event runs on if it isn't fixed.
  3. **What they win.** Fixed in time: the sealed garden's numbers come back, it earns Reliability +10 and a **Rescued** badge on its tile, and the allotment pays a reward in its own currency (goodwill with the neighbours), bigger the faster it was done. A missed deadline fixes nothing, and the outbreak runs its course. Write down, in the spec, what reseals the garden on the way back up (`sealNode` from the garden's window, or the sealed node with the event lifted), and keep the `carry` check passing.
  4. **Send someone.** For players who'd rather not go down: an adviser sorts it for a fee and half the reward, with a short line saying what they did. This is the level's first "let them decide", so leave the hook general enough for part 10's advisers.
  5. **The seed catalogue's adviser.** On the allotment's seed buying (the catalogue card, or where the allotment buys seed), the catalogue recommends its top picks with `recommend`. The Explain card uses `tilt` to name the bias and the own seeds it pushed in ("Ask who pays the adviser"), shown the first time the player buys from it. Honest advice elsewhere stays honest.
  6. **Unfolding.** New `unfold.ts` keys for the trace, the dive and the catalogue's bias, each with one first-time pulse and a short Explain, never all at once.
- **It may touch:**
  - `src/sim/`: `allotment.ts`, `ladder.ts` (the event and resealing), `commands.ts`, `state.ts`, `save.ts`, `systems.ts`, a new `src/sim/zoom.ts` for the rescue, and the wiring halves of `src/sim/models/agency.ts` and `pests.ts`.
  - `src/data/`: allotment, agency, unfold and explain.
  - `src/ui/`: the allotment panel and map, the camera's dive, the deadline strip and a Rescued badge. Build them on the UI overhaul's components (#68) and the map art's style kit (#72 once it lands).
  - `tools/bot*` and `tools/checks/`, with a new check group for the zoom back in.
  - Docs: `docs/systems/ladder.md` and `agency.md` ("Wiring" becomes "wired" for what lands), a new `docs/systems/zoom.md`, `docs/SYSTEMS.md`, `docs/roadmap.d/`, `src/updates.d/`, this brief as committed, and `docs/lessons/`.
  - Don't touch `src/ui/SeasonPanel.tsx`, `season.css` or `src/ui/map/season.ts`: a follow-up session moves them onto the overhaul's components and the art kit.
- **Sessions building beside you:**
  - **The map art** (#72, `feature/map-art`, the Fable model) may still be open. Merge `main` the moment it lands, and draw with its kit before your last CI round.
  - **The season panel follow-up** (the cheaper model), after #72, in the files above.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/ladder.ts`, `node tools/graph.mjs src/sim/allotment.ts` and `node tools/graph.mjs src/sim/models/agency.ts`, and only the files those list.
- The founding spec (`docs/specs/overgrow.md`): "Zooming back in", "The allotment" and the first roadmap's part 9.
- `docs/specs/step-up.md` (the zoom-out this reverses), `docs/specs/allotment-season.md`, `docs/systems/ladder.md` ("Inflating and the `carry` check"), `docs/systems/agency.md` ("Wiring") and `docs/systems/season.md`.
- `docs/lessons/79-allotment-season.md`, `docs/lessons/81-steady-light.md`, and the `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "Zooming back in" at 2 (the scripted slugs, the trace and the dive), "Pests" at 2 (pests from next door, into your garden), and "Advisers, recommendations and Explain" at 2 (the seed catalogue whose advice favours its seeds).

1. **Born where.** The allotment (level 2), reaching down to the garden (level 1). Flows: kg of food lost to the slugs on the sealed garden and won back, the player's hours in the garden, and the adviser's fee in money. The kg are conserved, and the event is a real one on the sealed node. Goodwill, the reward, is opinion kept in levers.
2. **Across the ladder.** A rescued node carries its Rescued badge and +10 Reliability up when the allotment seals. The same move comes back at every level from 2 up: shortages traced to one node, at most once a game year per level and never in a level's first year. The first unscripted one is part 10's or later. At the planet the trace runs all the way down.
3. **Loops.** Agency (Send someone is delegating, with a fee), and the spec's rule that a failure far off has a cause close up. Fast: the deadline. Slow: the lasting mark.
4. **People.** The player, going down; the gardener, acting on the plan below; the neighbour whose plot is neglected, named; the adviser sent instead, with a fee.
5. **The lever.** Go down or Send someone; below, the garden's own slug tools. For players who'd rather not, Send someone is "let them decide".
6. **The map.** The trace from the shortfall to the tile, pulsing; slugs crossing the path from the neglected plot; the dive; the deadline strip; the Rescued badge. Reduced motion cuts straight in and out and shows the end states, and the light stays steady (decision 22).
7. **Explain.** Pests from untended hosts (RHS); the event's kg lost; why a failure far off has a cause close up; the adviser's interest ("ask who pays the adviser") with the own seeds it pushed in (`tilt`).
8. **Economy and balance.** The kg the outbreak costs the sealed garden, the reward in goodwill, the adviser's fee, and the catalogue's tilt on what's bought. The bot reports the outbreak's day, whether it went down or sent someone, the rescue's garden days against the deadline, and the allotment's Output across it, on seeds 1–3. `PLAY` before the step up stays identical to `main`.
9. **Carbon and land.** None new: the garden's own carbon and land carry through the dive unchanged, and the `carry` check proves it.
10. **Polish.** Phones first (320 px portrait and landscape) up to large screens. At 320 px the deadline strip is one line, and Go down and Send someone are a card with the fee and reward on it. Concise UK English. Everything stays hidden until it unfolds.
11. **The lesson.** A failure far off has a cause close up, and you can go and fix it; and an adviser's advice has an interest behind it.
12. **Unfolding.** The trace and Go down arrive with the outbreak in the allotment's first summer; Send someone arrives with them; the catalogue's bias with the first seed bought from it. Keys as item 6.

## Speed budget

- **Headless:** keep an allotment day under 0.5 ms (part 7's test), and a garden day while you're down no slower than the garden's today.
- **Frames:** the dive runs at the garden's frame time or better; nothing drawn per frame for the trace beyond one line and a pulse.
- **`dist/`:** within 15 KB gzipped more.
- **Measuring:** against a build of `main` in alternation, three runs each. Add your line to `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once `check` (the summing job over CI's three parts) and the Description check are green on the latest head and the look back is committed.
- **Before your last CI round:** merge `main` each time a neighbour session lands, and again before the last round.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is ready, call `subscribe_pr_activity` on it. When you end a turn waiting on CI, book a `send_later` about 15 minutes out, since an idle session isn't woken by anything else (three sessions sat idle this way on 30 Sep). When the PR has merged and published, the session stops.

## What's left for others

- **Part 10**, the allotment's years: the bonfire and bee plot votes, proposing motions, the hosepipe ban, carbon choices moving goodwill, the swap shed's weighting by habit, the partner, unscripted zooms back in, and sealing the allotment with its offer.
- **Advisers and "let them decide"** on every tab of the garden and the allotment, the baselines reset, the strategy tests and Balance #21 to #24. Leave Send someone's hook general for them.
- **The season panel follow-up**, in the files named above.
- Under a heading "Handed on" in the PR, list what this part leaves for part 10 and the advisers.
- The owner has said the coordinator chooses (decisions 15 and 20). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $25: one new mechanic that crosses two levels (the event, the dive, the deadline and the resealing), a card and a strip, the adviser on existing models, the bot, and two or three CI rounds of about 11 minutes each. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Open the PR once items 1 to 3 work, then add the rest in pushes.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 6 upwards.
