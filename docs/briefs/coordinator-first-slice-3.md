# Brief: coordinate the rest of the first slice (the third coordinator)

The second coordinator ran from 04:50 to about 09:40 on 29 Sep and handed over at about 380k of context and $10, early and at a quiet moment rather than at 500k, since each turn re-reads the whole conversation. This brief keeps `docs/briefs/coordinator-first-slice-2.md` in force (its goal, the owner's decisions 1 to 13, "What goes in every brief" with its "How it fits and grows" section, what it may touch, its own docs-only PRs, who merges and when, when to stop and ask, and its cost rules) and changes only what's below. Read that brief first; where the two differ, this one wins.

## Goal and what it may touch

- **The goal** is unchanged: run the first slice from where it stands to its release, polished and well thought out in every way; you sweep, brief, start, message and retire, and build no game code.
- **It may touch** what the second brief allows: `docs/briefs/`, `docs/roadmap.d/`, `docs/lessons/` and the playbooks, in one small docs-only PR at a time; nothing under `src/` or `tools/`.
- **Where it stands at 09:40 UTC, 29 Sep.**
  - **Merged since the second coordinator took over** (look backs in `docs/lessons/`):
    - the second coordinator's brief (#28) and the pacing decision (#33);
    - models ahead: labour, machinery and energy (#26, $3.55), the household economy (#32, $2.74), livestock (#25, $4.48), storage, spoilage and the first market (#36, $4.69), the hooks #29 asked of them (#39, $5.42), agency and the committee (#42, $5.09), rotation and field soil (#44, $4.01);
    - the systems web (#31, $13.01) and the owner's answers to it written into the founding spec (#37, $2.84; #29 closed);
    - part 5, pests, wildlife and Explain (#35, $35.54 of $25: two mid-build asks and three merges of `main`).
  - **Running:** part 6a, unfolding and the first minute: `session_01FTY38eNAVyNAvsW85pJjZU`, `feature/unfolding-first-minute`, opus, $22, started 07:32, no PR yet at 09:25.
  - **The models-ahead queue is empty.** Every model the slice needs is written ahead except the parts' own wiring; add a models-ahead session only where a part's brief finds one missing.
  - **Open issues:** Balance #21, #22, #23 and #24 (rotation still loses in the garden's first year; left for 6c).
- **The owner's decisions:** 1 to 13 as in the second brief. The owner is often in the conversation: ask them directly (the `AskUserQuestion` tool took #29's fifteen questions in one answer).
- **The plan from here.**
  - **A garden nutrients fix, now, in parallel with 6a** (a Bug issue, a fresh session on the default model, about $10): the garden's output falls to a fifth by year three on the published site because phosphorus and potassium run out and nothing puts them back (`docs/systems/rotation.md`, the section for part 6c, has the diagnosis with numbers and the fix: P and K in the heap's stocks and in compost spreading, crop residues back to the heap, and a pool size or a first feeding choice). It touches `soil.ts`, `carbon.ts`, the heap and the crops' uptake, which 6a doesn't; say in its brief to merge `main` before the last CI round and to leave unfolding and the shed to 6a and 6c. With the owner's full garden year (Q15), a garden that dies in year three is the slice's worst bug; it gets the check that would have caught it (a headless run holding year three's output within reach of year one's with compost) and a Bug issue that closes with it.
  - **6b, the household,** when 6a merges: its brief is drafted, passes `node tools/brief.mjs`, and is committed as `docs/briefs/household-wiring.md`. Before starting it, read 6a's look back and add anything 6a leaves for 6b; then `create_session` on `feature/household` with the brief as the first message, as any other.
  - **6c, the shed, the hens and the advisers,** after 6b (or before it if 6b stalls): write its brief. It covers the shed's upgrades each hidden until worth having (more beds, a bigger butt, a compost bin, the cold frame, netting, the beer trap and nematodes, peat against peat-free as the first carbon choice); the hens from `livestock.ts` (eggs to the kitchen, droppings to the heap); advisers, recommendations and "let them decide" (W6, W25, W28's simple form, W29) and the step-up card's queue (W4); the bot's longest-quiet-stretch measure and `tools/baseline.json` reset for a full garden year (the project notes and the `balance` playbook already point at 6c for this); closing #21, #22, #23 and #24 with the bot on seeds 1 to 3; and "strategic and long" checked with the bot: no dominant plan.
  - **Parts 7 to 15, then the audit,** as the second brief says. Each wires its model(s) written ahead: 7 the sealing maths (`ladder.ts`), 8 to 10 the allotment (`agency.ts`, `committee.ts`, households as neighbours, Q13's neglected plot, Q8 (b)'s hosepipe ban, Q11's bonfire vote), 11 fields (`rotation.ts`), 12 livestock, 13 labour, machinery and energy (with the tractor loan of Q5, part-time and the hire), 14 storage and the market (the box scheme's customers as households).
  - **Speed.** Parts 5 and 6a take about 0.22 ms of the 1.0 ms garden day the parts share; give each later part its share in its brief and ask it to measure against `main` in alternation.

## Read first

- The project notes, `docs/briefs/coordinator-first-slice-2.md` (the rules and decisions this brief keeps), then `node tools/graph.mjs "The map and the page's shell"` and only what it lists.
- The `coordinator`, `feature`, `steward` and `balance` playbooks (changed on 29 Sep by #28, #31 and #33).
- `docs/briefs/household-wiring.md` (6b, ready), `docs/briefs/unfolding-first-minute.md` (6a, running) and `docs/briefs/rotation-and-fields.md` (the shape of a models-ahead brief).
- `docs/systems/rotation.md`'s section for part 6c (the nutrients fault) and `docs/lessons/35-pests-wildlife-explain.md` (what part 5 left for 6a and 6c).
- The founding spec and the systems web (`docs/specs/overgrow/systems-web.md`) only for the part you're briefing.

## How it fits and grows

The coordinator adds no mechanic; every brief it writes answers this section for its part and names its rows in the systems web (`docs/specs/overgrow/systems-web.md`), as the second brief's "What goes in every brief" sets out.

## Speed budget

None for the coordinator. Share the parts' reserve among the remaining parts in their briefs, as above.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

As in the second brief: each part and models-ahead session merges its own PR per the `steward` playbook; you merge only your own docs-only PRs. Keep one `send_later` check-in (about an hour while parts build, 50 minutes near a merge). In your first turn, book the hourly heartbeat (`coordinator` playbook §9) bound to your own session, and retire the second coordinator (§1): `delete_trigger` its heartbeat `trig_01Ur3dJnCAb3sTsVfDs6MjRR` and its check-in if one is still booked (`list_triggers`), then `archive_session` on `session_01Aq8H4VdiARDjwRdXECDHQy`.

## What's left for others

- The parts build the game; you only brief, start, message and sweep.
- The owner: the ruleset on `main` requiring `check` and "Allow auto-merge"; a `CATCH_UP_TOKEN` secret if they want Catch up's pushes to trigger runs.
- Levels 4 to 8 each get their own spec after the slice has been played, with the systems web as their starting point.

## When to stop and ask

As in the second brief: ask the owner only for something irreversible or outside the brief, or a change to the founding spec's model or carry-over rule; otherwise take the recommended option and tell the owner what was chosen. When they're in the conversation, ask directly; if not, open an issue labelled `needs-owner` with the question, the options and the default, and take the default after 12 hours (except for the spec-model questions).

## Cost budget

- **Estimate:** about $20 for this coordinator through part 15 (about 12 more PRs, the nutrients fix and the audit). The parts: $15–25 each on the default model; a part that crossed its estimate (part 5) did so on mid-build asks and repeated merges of `main`, so put the whole ask in the brief and tell parts to merge `main` once, before the last CI round.
- **Handing over:** at about 450k of context, at a quiet moment (no PR about to merge), with a short brief like this one that keeps the last one in force and changes only the state and the plan.
- **Keeping context down:** `get_session` on known ids; paste each brief once; read a merged session's look back rather than its transcript.
- **Stopping points and the rate limit** as in the second brief; a session stopped by a usage limit gets a "carry on" message a minute after `resetsAt` (the `coordinator` playbook §2).
