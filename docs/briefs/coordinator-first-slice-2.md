# Brief: coordinate the rest of the first slice (the second coordinator)

The first coordinator ran from 20:13 on 28 Sep to 04:50 on 29 Sep. It handed over at 628k of context and $21, past its $20 estimate, because a long conversation re-reads its whole history every turn (the `coordinator` playbook §1). This brief carries everything it knew. It replaces `docs/briefs/coordinator-first-slice.md` for the rest of the slice, keeping that brief's rules except where this one changes them. Where the two differ, this one wins.

## Goal and what it may touch

- **The goal.** Run the founding spec's first slice (`docs/specs/overgrow.md`, "The first roadmap") from where it stands to its release. The owner wants the full game polished and well thought out in every way before release. Each part gets its own brief and a fresh session; the parts merge their own PRs; you sweep, brief, start, message and retire. You build no game code.
- **Where it stands at 04:50 UTC, 29 Sep.**
  - **Merged** (the look backs are in `docs/lessons/`):
    - part 1, #5, the graph, the clock, saves and the shell: $15.93 of $25;
    - part 2, #7, weather, soil and water: $17.15 of $20;
    - part 3, #12, crops, the gardener, the kitchen and the heap, with the owner's head start (#11): $22.30 of $25;
    - part 4, #10, the bot and the proposed baselines: about $8 of $15;
    - the Final Call wins, #14: $5.86 of $8;
    - models ahead: the sealing maths, #20, about $4 of $8.
  - **Running** (read each with `get_session`):
    - part 5, pests, wildlife and Explain: `session_01QeD2wtiNc3ftjbAKKZbYyd`, `feature/pests-wildlife-explain`, issue #19, $25;
    - models ahead, livestock: `session_012Jjn1F5RXGiU9UE3EZa6vf`, PR #25, $8;
    - models ahead, labour, machinery and energy: `session_01NiF9U4oHo1kfzk8KET5CEY`, PR #26, $10;
    - the systems web: `session_01NGEmaw2WT9RvWWSPjBxyaw`, `feature/systems-web`, $15, started 04:42.
  - **To archive at your first sweep**, since their PRs have merged: part 4's session (`session_01U8Cd7rza7U8bWUZoF3ZnPm`), the sealing session (`session_01QXCQthD6bSmu1CgSH43t1D`), and the first coordinator (`session_01VXFhhDdTHejQhUy63adabf`). The first coordinator has already deleted its own check-in and heartbeat.
  - **Open issues:** Balance #21 (no first sale in 120 days), #22 (half the kitchen's need only around day 114), #23 (Output and Reliability far short of the allotment offer) and #24 (rotation doesn't beat one crop; part 5 is closing it).
- **The owner's decisions so far.** All are in force. Write each into the briefs it touches.
  1. **Saves.** No save compatibility before the first release: reshape freely; part 15 restores the rule, the fixtures and the `migrate` check (`docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md`).
  2. **Final Call.** Lean on Final Call's UI, multi-device and design knowledge (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, `docs/ideas/final-call-wins.md`). The owner accepted every recommended win; fold each part's wins into its brief, own direction allowed. The public repo is `https://github.com/KyleLookingAround/final-call` (clone read-only).
  3. **Recommendations stand.** The coordinator's recommendations stand for later choices: take the recommended option on an owner question and tell the owner what was chosen. The exceptions are anything irreversible, outside the brief, or a change to the founding spec's model, ladder or carry-over rule; those stay the owner's to answer.
  4. **The head start** (#11). The game opens with one bed of overwintered salad leaves; spring sowings keep the real degree-day pace.
  5. **Baselines** (#15). Option 2, taken: the proposed ranges stand, marked proposed, with a Balance issue per gap.
  6. **The job and groceries.** The gardener has a job and buys groceries.
     - The job takes weekdays and is why the garden gets about four hours a day. The gardener is drawn leaving through the gate and coming home. The wage is the household's main income.
     - A weekly shop buys what the garden doesn't meet, at DEFRA Family Food prices. Shop food carries its farm and transport carbon, land and water (Poore & Nemecek; transport is a small share, a myth the game can correct). The garden's value becomes groceries saved as well as sales.
     - At the smallholding the job can go part-time.
  7. **A partner.** The gardener can later get a partner who earns or helps.
     - The household has members from the start.
     - The partner moves in during the allotment's year (part 10). Work, help or a mix is a plan lever, and the kitchen's ask grows.
     - The partner has goals, through the agency system. Later come children and family.
  8. **Every angle, ever-expanding systems.** Consider every angle and how everything fits as ever-expanding systems. Every brief carries a "How it fits and grows" section (below). The systems web session writes `docs/specs/overgrow/systems-web.md`:
     - every mechanic across levels 1 to 8;
     - the role-reversal spine: buy from the shop, then sell a box scheme to households, run the market, be the buyer, set the rules;
     - seeds and dead ends, and the household traced up the ladder;
     - the template section and playbook lines;
     - spec proposals in a `needs-owner` issue, the owner's to answer;
     - a page for the owner.
  9. **Don't overwhelm the player.** Every system runs from the start, and the living map shows its impacts from day one. Its instruments (numbers, dials, badges, tabs, plan lines, levers) unfold only as the player gains influence over it: never greyed, never all at once, with one first-time pulse and a short Explain. Views are keyed in `src/data/unfold.ts` from the sim's saved `seen` list; part 5 is starting that table for its own UI. Levers are gated in the sim, so a hidden lever's command is refused and the bot plays the same game. Each new level starts simple again. The carbon dial moves from "day one" to the first carbon choice, which the owner's principle settles. A "Show all details" setting, off by default, serves players who want the numbers early.
  10. **The models-ahead track.** Pure models are built ahead of their parts, in new files only, on the cheaper model, while the parts run in sequence; each part then wires its model.
  11. **A polish audit before part 15** (`docs/roadmap.d/2026-09-29-04-polish-audit.md`): parallel read-only reviewers, one per device or concern, then fixes.
- **The plan from here.**
  - **Part 6 is split into three PRs, in order,** each on the default model from `main` after the one before:
    - **6a, unfolding and the first minute** (start when part 5 merges):
      - retrofit everything parts 1 to 5 show into the unfold table: soil moisture first with the watering line, N-P-K when feeding becomes a lever, the carbon dial with the first carbon choice, money with the first wage or purchase, the temperature, the tabs;
      - lever gating in the sim, and the first-time pulse (W26);
      - an `unfold` check: a new game shows only the core; each trigger reveals its key; unknown keys fail closed; a hidden lever's command is refused;
      - the first-minute card and a goal bar that names the binding requirement (W5, W17, W18, W21);
      - the "Show all details" setting;
      - the principle's decision record, if the systems web didn't write one, and the founding spec's lines updated (the carbon dial);
      - a roadmap item recording the split.
    - **6b, the household** (after 6a, once the household model has merged): the job's hours on the gardener, the wage and the grocery bill as money flows, the commute and the weekly shop on the map, the kitchen buying what the garden doesn't meet, the owner's decisions 6 and 7 written into the founding spec's garden section, and each piece unfolding as it first matters.
    - **6c, the shed, the hens and the advisers** (after 6b, or before it if the household model is late):
      - upgrades each hidden until worth having;
      - the livestock model's hens (eggs to the kitchen, droppings to the heap);
      - more beds, the cold frame, netting, the beer trap, nematodes and peat;
      - advisers, recommendations and "let them decide" (W6, W25, W28's simple form, W29), and the step-up card's queue (W4);
      - closing #21, #22 and #23 with the bot on seeds 1 to 3.
  - **Parts 7 to 15, then the audit.** Parts 7 to 15 follow the founding spec's roadmap. Part 7 wires `src/sim/ladder.ts` (#20), with the step-up card (W4) and the `carry` check. Parts 12, 13 and 14 may run side by side once 11 has merged. The polish audit comes before 15. Part 15 is the release: saves restored, W8, W10, W19, W34 and W35.
  - **The models-ahead queue.** Two or three at a time, on the cheaper model, each from a brief like the committed `docs/briefs/sealing-maths.md` (new files only, shaped for wiring, a plausibility test, a Wiring note). A slot is free now:
    1. **The household economy model, first.** It goes in `household.ts` in `src/sim/models/` and `src/data/household.ts`, and covers:
       - members, each with a job, hours by weekday and a wage;
       - a weekly grocery basket with prices;
       - shop food's carbon, land and water per kg;
       - each member's garden hours and the work-or-help choice;
       - being scale-free: the allotment's neighbours are households, so long working hours mean a neglected plot; box-scheme customers are households; and town demand is baskets summed by income decile;
       - its Wiring note names parts 6b, 8, 10 and 13.
    2. Storage and spoilage, with the market and demand, for part 14.
    3. Neighbours, agency and trust, and the committee, for parts 8 and 10.
    4. Rotation over years and field-scale soil, for part 11.
- **What goes in every brief.** The brief template's sections; the part's spec rows, which the brief approves in advance; the owner's decisions that touch it; its wins; its speed share; and this section, filled in for the part:

  > **How it fits and grows** (answer each briefly, for what this part adds; the systems web has each system's row once it has merged):
  > 1. **Born where.** The level where it's hands-on, the node type, and the flows it moves (SI units), kept conserved.
  > 2. **Across the ladder.** What a sealed node carries up from it. How it shows one level up and two up. Where it comes back later as an aggregate, or as a role reversal.
  > 3. **Loops.** Which of the spec's loops it feeds, and its fast and slow effect.
  > 4. **People.** Who does the work, their hours and goals, and what the player delegates.
  > 5. **The lever.** The plan, upgrade, policy or law, and "let them decide".
  > 6. **The map.** What's drawn, impact first, and what reduced motion shows.
  > 7. **Explain.** The mechanism and source for each effect.
  > 8. **Economy and balance.** The money, hours and kg it moves, and the bot milestones it shifts.
  > 9. **Carbon and land.** What it adds to the dial and the land account.
  > 10. **Polish.** Phones to large screens, concise UK English, the UI record's rules.
  > 11. **The lesson.** The one real-world thing it teaches, and any myth it corrects.
  > 12. **Unfolding.** What the player sees of it and when, the influence that reveals it, and its keys in `src/data/unfold.ts`.

- **It may touch:**
  - `docs/briefs/` (each part's brief, and this one, saved as is);
  - `docs/roadmap.d/` (moving items along);
  - `docs/lessons/` (the first coordinator's look back, below, and your own);
  - the playbooks, where a lesson changes one.
- **Its own PRs.** Unlike the first brief, you may open and merge one small docs-only PR at a time for those files, per the `steward` playbook, once Checks and the Description check are green. Your first one should carry this brief (as `docs/briefs/coordinator-first-slice-2.md`), the first coordinator's look back, and the playbook lines it proposes. Nothing under `src/` or `tools/`: that's the parts' work.

## Read first

- The project notes, then `node tools/graph.mjs "The map and the page's shell"` and `node tools/graph.mjs src/sim/systems.ts`, and only what they list.
- The `coordinator`, `feature` and `steward` playbooks. They were changed on 29 Sep by #14, and are changed again by the systems web once it merges.
- `docs/briefs/coordinator-first-slice.md` (the rules this brief keeps), `docs/briefs/crops-and-gardener.md` and `docs/briefs/sealing-maths.md` (the shapes of a part's brief and a models-ahead brief), and `docs/SYSTEMS.md` "Speed budget" (parts 5 to 14 share a reserve of 1.0 ms a garden day, 3 ms of a desktop frame, 1.6 ms of a throttled phone frame, 1.5 ms of copy and 275 KB; part 5 took up to 0.15, 0.4, 0.25, 0.15 ms and 25 KB).
- `docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, and the "Lands" column of `docs/ideas/final-call-wins.md`.
- The founding spec when you write a part's brief: its sections for that part, not end to end.

## Speed budget

None for the coordinator. Share the parts-5-to-14 reserve among the remaining parts in their briefs, as part 5's was, and ask each part to report what it used.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **The parts.** Each part and models-ahead session merges its own PR per the `steward` playbook, by hand until the owner adds the ruleset and auto-merge, and subscribes to its own PR. You merge only your own docs-only PRs, as above.
- **Check-ins.** Keep one `send_later` check-in: about an hour while parts build, 50 minutes near a merge, a few hours when quiet. Book the hourly heartbeat Routine (`coordinator` playbook §9) in your first turn, bound to your own session, since a five-hour usage limit stopped the first coordinator for two and a half hours on the first night.
- **Before each merge.** Read the PR's title and description for attribution (§3).
- **After each merge.** Archive the session.

## What's left for others

- The parts build the game; you only brief, start, message and sweep.
- The owner: the ruleset on `main` requiring `check` and "Allow auto-merge" (noted in #1); a `CATCH_UP_TOKEN` secret if they want Catch up's pushes to trigger runs; and the systems web's proposals issue, once it's opened.
- Levels 4 to 8 each get their own spec after the slice has been played, with the systems web as their starting point; not this session.

## When to stop and ask

- **Ask the owner** only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, or a part that wants to widen the slice.
- **Otherwise take the recommended option** (the owner's decision 3) and tell the owner what was chosen.
- **When the owner must decide:**
  - if they're in the conversation, ask them directly: that answered #11 in minutes;
  - if not, open an issue labelled `needs-owner` with the question, the options and the default, with a page where the options are things to look at. Take the default after 12 hours, except for the spec-model questions above.
- **Where it's merely unclear,** take the safer option (easier to undo, changing less) and say so in the PR.

## Cost budget

- **Estimate:** about $25 for this coordinator through part 15. That's about 14 more PRs, four more models-ahead sessions and the audit, with a sweep each hour. For the parts: $15–25 each, $8–10 per models-ahead session.
- **Handing over:** at about 500k of context or past the estimate, whichever comes first, hand over to a fresh coordinator with a brief like this one. That's the first coordinator's lesson.
- **Keeping context down:** read sessions with `get_session` on known ids rather than `list_sessions` (it returns every session on the account, Final Call's included). Keep each brief in a file and paste it once.
- **Stopping points:** at each one (a part started, a PR opened, CI back, a merge), read `get_session` for `usage.cost_usd` against the estimate and for `rate_limit_info`. If it's "rejected" or `isUsingOverage`, book a `send_later` a minute after `resetsAt` and end the turn. The owner has said to ignore `allowed_warning`.
- **The model:** `claude-opus-5-5` at high effort, for you and for the parts. Models-ahead, research and docs-only jobs go on `claude-sonnet-5-5`. Keep about four Overgrow default-model sessions at most; Final Call runs its own sessions on the same account.
- **Past twice the estimate:** say why in the look back, and trim what's left.

## The first coordinator's look back, to commit as a lesson

Commit this as its own file in `docs/lessons/`, named after the PR that carries it, with `Theme: coordinator` as its first line.

> **The first slice's first coordinator · 28–29 Sep 2026**
>
> - **Numbers.**
>   - Estimate $20 for the whole slice; $21.24 and 628k of 1M context at the handover (8.5 hours).
>   - Parts 1 to 4, the wins, and the first models-ahead session merged: about $87 against $108 estimated, every one under its estimate.
>   - A five-hour usage limit ended a check-in at 22:02, and nothing woke the coordinator until 00:36.
> - **Went well.**
>   - Drafting the next part's brief while the current part's CI ran: each part started within minutes of the last merging.
>   - Carrying the running plan in each check-in's prompt, so a resumed turn had it all.
>   - Asking the owner directly when they were in the conversation: #11 was answered in a minute, where the issue waited.
>   - The models-ahead track: three pure models built in parallel, in new files only, while part 5 edited the shared code.
>   - Pasting Final Call's UI lessons into part 3 mid-build: it applied six of seven.
> - **Lessons.**
>   - **Book the heartbeat when the first part starts, not after the first stall.** → The `coordinator` playbook §9 should say so.
>   - **Context runs out faster than cost.** The coordinator's context went mostly on `list_sessions` output (every session on the account, another project's too) and on full briefs pasted into prompts. → Use `get_session` on known ids. Paste a brief once. Hand over at about 500k or at the estimate, whichever comes first (the `coordinator` playbook §1).
>   - **The owner designs in bursts while sessions run.** Record each decision at once in one list (this brief's), and pass on to a running session only what changes its current work.
>   - **A first bot run finds design gaps, not just ranges.** Part 4's baselines showed no sales, a hungry kitchen and a rotation that didn't pay. → Run even a crude bot as early as the garden grows, before the parts pile on.
>   - **A part's brief should say what the part before left undone.** Part 3 couldn't touch part 1's shell, so container queries and safe areas moved to part 5.
