# Brief: coordinate the rest of the first slice (the fourth coordinator)

The third coordinator ran from 09:43 to about 20:30 on 29 Sep and handed over at about 455k of context and $19.30, on its $20 estimate. This brief keeps `docs/briefs/coordinator-first-slice-3.md` and `docs/briefs/coordinator-first-slice-2.md` in force: the owner's decisions 1 to 16, "What goes in every brief", what the coordinator may touch, its own docs-only PRs, and the cost rules. It changes only the state and the plan. Where they differ, this one wins.

## Goal and what it may touch

- **The goal:** run the first slice to its release, polished. The owner's decision 14 puts a playable level 1 first. You sweep, brief, start, message, retire and playtest; you build no game code.
- **It may touch** what the second brief allows: `docs/briefs/`, `docs/roadmap.d/`, `docs/lessons/` and the playbooks, in one small docs-only PR at a time. Nothing under `src/` or `tools/`.
- **Where it stands at about 20:30 UTC, 29 Sep.**
  - **Merged today** (each has a look back in `docs/lessons/`):
    - 6a, unfolding (#45, $22.55);
    - the garden's nutrients (#48, $14.64, Bug #47);
    - 6b, the household (#53, $25.84);
    - the playable garden (#56, $38.41);
    - the Final Call exchange (#57 here and Final Call #178, $5.23);
    - the coordinator's briefs and decisions (#52).
  - **Running:** the playable garden, round two.
    - Session `session_01V9ZuYqhY2ZDgtDp6THY2Tf`, PR #59, `feature/playable-garden-2`, estimated $30, and $34.52 at 20:26.
    - Its brief is `docs/briefs/playable-garden-2.md`.
    - At 20:26 its `check` was running, with Balance and Description green. It merges its own PR.
  - **Watch the speed test.** The garden-day speed test (`src/sim/index.test.ts`) sat at 2.10 ms against its 2 ms limit after #56. Round two's item 0 makes headroom. If `main` goes red on it again, the next part fixes it first.
  - **Open issues:** Balance #21 to #24, left for the garden's later work.
- **The owner's decisions:**
  - 1 to 13 are in the second brief, and 14 to 16 in the third.
  - Decision 15 matters most day to day: **the coordinator chooses**. Answer owner questions yourself, spec and ladder ones included, and tell the owner what you chose.
  - The owner is often in the conversation and likes a short summary with the link to play.
  - **Since this brief (29 Sep, evening):**
    - **17. A shorter garden year** (about 23:10, "52 weeks does feel quite long to play"): the garden keeps its full year, but the year passes much faster. The day goes to 12 s at 1×, quiet nights pass at four times the chosen speed, and there are 8× and 16× speeds (asked for at 23:15). The target is a garden year in about 50–60 minutes at 1×. It's the "shorter garden year" session's PR, which amends `docs/decisions/ADR-2026-09-29-strategic-and-long.md`.
    - **18. A UI and UX overhaul on the Fable model** (about 23:15): a fullscreen mode, good on every device, and "especially mobile", so it's designed phone-first. It's the "UI overhaul" session's PR. The next gameplay round builds on its components.
    - **19. Cheaper steps towards the big buys** (the coordinator's choice under decision 15, answering #63): stage the big buys (the hen house before the hens, a polytunnel before the greenhouse) and keep the household's income on its ONS figures.
    - **20. Overnight, the coordinator runs the game** (about 23:25): "Keep working on the game overnight, start a new coordinator when you want. Make level 1 feel awesome in all ways, gameplay, pacing, ux/ui, and start on the next levels. You can change anything at any time." So the coordinator may change any rule, playbook, spec or decision record without asking, and starts the next levels (part 7 on) alongside the level 1 work. It still records each change where it belongs, and still asks only for something irreversible, like repo settings or deleting work.
    - **21. Presentation is everything** (about 23:55): "we have tonnes of information. so presentation is everything." The UI overhaul makes information design its heart:
      - every surface shows a headline, then a glance, then detail on demand;
      - readable numbers with their direction;
      - small inline visuals such as sparklines, rings and meters;
      - the map first;
      - general components (a stat, a stat with a trend, a node card, a list of nodes, a legend) that every level reuses.
- **The plan from here.**
  1. **When #59 merges:** archive its session. Run a third playtest: a helper `Agent` on the cheaper model, about $5, with the same primer as the first two (days 2–365 at 1440 × 900 and 390 × 844, playing as an engaged first-timer). Then send the owner https://kylelookingaround.github.io/overgrow/, what's new, and the playtest's verdict.
  2. **If the playtest says level 1 still isn't a game all year,** brief a round three from its top problems. Put a check-in about 30 minutes after the start.
  3. **When level 1 holds up,** go back to the garden's remaining work:
     - the hens, if round two didn't wire them;
     - advisers, recommendations and "let them decide": W6, W25, W28's simple form and W29, now informed by Final Call's tips lessons in the `feature` playbook (#57);
     - the step-up card's queue;
     - the baselines reset for a full garden year, with the bot's quiet-stretch measure;
     - the strategy tests;
     - #21 to #24.
  4. **Then parts 7 to 15 and the audit,** as the third brief says. Part 7 revisits the garden's offer targets (#55).

## Read first

- The project notes, `docs/briefs/coordinator-first-slice-3.md` and `docs/briefs/coordinator-first-slice-2.md`, then `node tools/graph.mjs coordinator` and only what it lists.
- The `coordinator`, `feature`, `steward` and `balance` playbooks (changed today by #52 and #57).
- `docs/briefs/playable-garden.md`, `docs/briefs/playable-garden-2.md`, `docs/lessons/56-playable-garden.md` and the third coordinator's look back in `docs/lessons/`.

## How it fits and grows

The coordinator adds no mechanic. Every brief it writes answers this section for its part and names its rows in the systems web (`docs/specs/overgrow/systems-web.md`), as the second brief's "What goes in every brief" sets out.

## Speed budget

None for the coordinator. Give each part its share in its brief, and have it measure over the busiest stretch (summer) as well as the year.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **Merging:** each part merges its own PR per the `steward` playbook. You merge your own docs-only PRs, starting with the one that carries this brief.
- **Check-ins:** keep one `send_later` check-in: about an hour while parts build, and 30 minutes after each start.
- **In your first turn:**
  1. Book the hourly heartbeat (the `coordinator` playbook §9), bound to your own session.
  2. Retire the third coordinator: `delete_trigger` its heartbeat `trig_016b4AXngYYaePoopJzVJQwE` and any check-in of its still booked (`list_triggers`), then `archive_session` on `session_01A5YGarmH6V6NnjgyaCYASz`.
  3. Merge this brief's PR once it's green.
  4. Sweep #59.

## What's left for others

- The parts build the game.
- The owner may add the ruleset on `main` that requires `check` and turns on "Allow auto-merge", and a `CATCH_UP_TOKEN` secret.
- Levels 4 to 8 each get their own spec after the slice has been played.

## When to stop and ask

- **Decide it yourself** (decision 15): take the recommended option and tell the owner what you chose.
- **Ask the owner** only for something irreversible, like repo settings or deleting work. Ask directly when they're in the conversation. Otherwise, open an issue labelled `needs-owner` with the default, and take the default after 12 hours.

## Cost budget

- **Estimate:** about $20, through the playable rounds and the garden's remaining parts. The parts cost $25–38 each today on the default model. Every one ran over its estimate, from mid-build questions, the speed budget and the size of the ask, so estimate $30 for a part that touches the sim, the UI and the bot.
- **Handing over:** at about 450k of context, at a quiet moment, with a brief like this one.
- **Keeping context down:**
  - Use `get_session` on known ids.
  - Point a session at a committed brief instead of pasting it.
  - Read a merged session's look back, not its transcript.
- **Stopping points and the rate limit** work as in the second brief. A session stopped by a usage limit gets a "carry on" message a minute after `resetsAt`.
