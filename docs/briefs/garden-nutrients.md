# Brief: the garden's nutrients (Bug #47)

The garden's output falls to a fifth by year three on the published site: phosphorus and potassium run out of the beds and nothing puts them back. With the owner's full garden year (#29, Q15), a garden that dies in year three is the slice's worst bug. This session fixes it with the real mechanism (a gardener's compost and crop residues carry P and K back), in parallel with part 6a, and adds the check that would have caught it.

## Goal and what it may touch

- **Deliver** one PR on `feature/garden-nutrients` from `main` that closes Bug #47 (`Fixes #47` in the description).
- **The diagnosis** is in `docs/systems/rotation.md`, the section for part 6c, with numbers: bed pools of 0.018 kg P and 0.135 kg K (index 2) emptied by three to five crops; uptake lost to the `growth` boundary; `HEAPED` in `carbon.ts` carrying carbon and organic nitrogen only; compost adding no P or K; mineral nitrogen thin (secondary). Reproduce it headless on seeds 1 to 3 before changing anything.
- **The fix, in this order, stopping when year three holds:**
  1. **P and K through the heap.** `HEAPED` gains `phosphorus` and `potassium`; what goes on the heap (crop residues, kitchen scraps, weeds) carries its P and K in; compost spreading moves them into the bed's pools, conserved (nothing made or lost but what leaches or leaves as food).
  2. **Crop residues back to the heap.** The share of a crop's uptake that isn't the harvested part (leaves, stems, roots) goes to the heap instead of the `growth` boundary; the harvested part leaves as food, as now. Name the harvest index per crop from a source.
  3. **The beds' starting pools.** English garden soils are often at P and K index 3 or above after years of feeding (RHS; the AHDB Nutrient Management Guide, RB209, for the indices). Raise the pools to a sourced garden index only if 1 and 2 aren't enough, and say which index and why.
  - A bought fertiliser as the first feeding choice is a lever the player sees: leave it for 6c's shed. Clubroot in bed-2 is rotation's lesson: leave it.
- **The check.** A headless test (Vitest, the sim in Node) on seeds 1 to 3 over four garden years with the garden's own gardener and plan: the kitchen's picked kg in year three at least 70 % of year one's, and P and K in each bed never at zero for a season. Name it in `docs/SYSTEMS.md`'s check list if it's a group.
- **The bot.** Run it on seeds 1 to 3 against a build of `main` (the `balance` playbook). Year one's milestones should stay about where they were; later years rise. Put the table in the PR. This brief approves the change to later years' output; if year one's first sale or the kitchen's met share moves beyond the baselines' tolerance, say why in the PR and ask the coordinator before merging.
- **It may touch:** `src/sim/soil.ts`, `src/sim/carbon.ts`, `src/sim/crops.ts` (uptake and residue), the heap's and the gardener's spreading code, `src/data/` for the crops' harvest index and compost's P and K, `src/data/explain.ts` for the compost card's new line, saved state (raise the version: no compatibility before the release), the tests and checks this changes, `docs/systems/` for soil, carbon, crops and the heap, the rotation notes' 6c section (mark the fault fixed and point at this PR), `docs/briefs/household-wiring.md`'s "What's left for others" line about the year-three fault (remove it), `docs/briefs/garden-nutrients.md` (this brief, saved as is), `src/updates.d/` (a What's new line) and `docs/lessons/`.
- **Leave alone:** the unfold table, the first-minute card, lever gating and the pulse (6a is building them now, on `feature/unfolding-first-minute`); the shed, the hens, fertiliser and the advisers (6c); the household (6b).

## Read first

- The project notes, then `node tools/graph.mjs src/sim/soil.ts`, `node tools/graph.mjs src/sim/carbon.ts` and `node tools/graph.mjs src/sim/crops.ts`, and only the files those list.
- `docs/systems/rotation.md`, the section for part 6c (the diagnosis); `src/sim/models/rotation.ts`'s `maintain` for how the fields' model keeps P and K, to stay consistent with it.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): soil and the heap (the waste loop's first return), and rotation's seed in the garden.
1. **Born where.** The garden (level 1): each bed a node with soil stocks, the heap a node; flows are kg of P, K and N moved from crop to heap to bed, conserved, with food leaving through the kitchen.
2. **Across the ladder.** A sealed garden carries its soil in Health; the smallholding's fields keep P and K by the year plan (`rotation.ts`'s `maintain`); at the farm, manure and fertiliser; at the region, P and K balances as a tint and one line; later phosphate rock as a finite world stock.
3. **Loops.** The waste loop (scraps and residues back to the soil) and the intensification loop (mining the soil against feeding it). Fast: a composted bed's next crop; slow: the pools over years.
4. **People.** The gardener heaps and spreads, within the hours they have; nothing new to delegate.
5. **The lever.** None new: compost is already the gardener's; the first bought feed is 6c's.
6. **The map.** Nothing new beyond compost already carried to the beds; a starving bed's paler crop, if the crops' drawing already tints by growth.
7. **Explain.** The compost card gains one line: compost returns the P and K the crops took (WRAP's PAS 100 compost analyses; RB209 for crop offtake).
8. **Economy and balance.** Kg picked in years two to four rise towards year one's; year one about unchanged; the bot's milestones for year one should hold.
9. **Carbon and land.** None new: the heap's carbon is unchanged.
10. **Polish.** No new UI; one Explain line in concise UK English.
11. **The lesson.** Every harvest carries nutrients away; composting puts most back, which is why a garden that's fed keeps giving.
12. **Unfolding.** Nothing new to unfold: N-P-K's numbers are 6a's to reveal with the first feeding choice.

## Speed budget

0.02 ms a garden day headless from the parts' reserve, nothing on the frame, copy or bundle beyond a few bytes. Measure against a build of `main` in alternation, three runs each, and add your line to `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed and the Balance table is in the PR; then confirm the Pages publish. Merge `main` once, just before the last CI round (6a may merge first; its save version and docs may conflict: keep both). Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- 6a (running) owns unfolding; 6b the household; 6c the shed, fertiliser as the first feeding choice, the hens, the advisers, the baselines' reset and #21 to #24.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question and the option it will take by default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $10 (three sim files and their data, one test, the bot on three seeds, one or two CI rounds). Model `claude-opus-5-5` at high effort. No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left.
