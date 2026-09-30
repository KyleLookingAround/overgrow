# Brief: the playable garden, round five: a box you find and a midwinter worth playing

Round four (#84) added the money ladder, the box kept stocked year-round and midwinter's jobs. A fifth playtest of `main` after #84 (seed 1: phone days 1 to about 690, past the step up; desktop days 1 to 120) found that level 1 is a game for most of the year, the goal bar chains well, and the light is steady at 16×. It also found:

- **The box is hard to find.** "Keep the box stocked" is an unticked checkbox at the foot of the Kitchen tab, and nothing points to it. Left alone, the box sold nothing after day 220 (30 kg at day 220, 31 kg at day 306). Ticked, it sold about 1 kg a week, £1 a week. The playtest jumped between checkpoints with `tick`, so it may have skipped round four's `box` card: confirm first whether a player at 1× to 16× meets the card, and when.
- **Midwinter is thin** (days 300 to 366). The goal is "Fruit cage, £X to go", the gardener picks the winter salad, kale and leeks on her own, and the only actions are the fruit cage and the raised bed, both waiting on money. Money creeps up about £3 a day, and the Shed showed "£0.00 in" in some weeks between days 150 and 220.
- **Numbers without words.** The step-up card reads "Output 0.3 of 0.25 kg a day, Reliability 39 of 35, Health 71 of 50", then the allotment shows the same output as "264 g". The Kitchen's "Pay £590 / The rest of life £550 / The shop £24", "Its footprint 40 kg CO₂e", and the dial's "+44 kg" header with no label are opaque on first look.
- **Two numbers that disagree.** At the same moment the goal bar said "£4 to go" and the Shed said "£3.35 more".

The coordinator chose (decisions 15 and 20): **surface what round four built, and give midwinter a choice to make, rather than add a new system.** The allotment's own gaps the playtest found (no goal bar and nothing to buy after the step up) are a later part's, not this round's.

## Goal and what it may touch

- **Deliver** one PR on `feature/playable-garden-5` from `main`. Start from a GitHub issue (the Feature template). The coordinator approves the spec (decisions 15 and 20); record it in `docs/specs/playable-garden-4.md` as a round-five section rather than a new spec.
- **In priority order.** Trim from the bottom if it runs long.
  1. **The box, found and worth it.** The `box` card comes once the kitchen has a surplus in late summer, whatever the speed, and a player who dismissed it can find the choice again where the harvest is (the Kitchen's headline, not the foot of the tab). When the box is empty in winter, the goal bar or a notice says so once. Check what the box sells in winter against real honesty-box takings for winter veg (rough numbers, named sources). If about £1 a week is right, say so and leave it; if the stock rule starves it, fix the rule.
  2. **A midwinter choice.** Days 300 to 366 get one or two decisions with a real trade-off, not another purchase. For example: force rhubarb or chicory under a pot, lift and store or leave the leeks in the ground, or plan next year's rotation on a card that shows what each bed had. Each moves kg, hours or money and names its mechanism. Use what the sim already has; add a model only if it's small, with its plausibility test.
  3. **Numbers with words.** The step-up card says what each number means in a few words, and uses the same unit as the allotment shows (kg a day on both, or g a day on both). The Kitchen's pay, rest-of-life, shop and footprint lines get a one-line label each, and the dial's header its name. Keep the explainers.
  4. **One number, one answer.** The goal bar and the Shed read the same figure for the same gap (round the same way from the same source).
- **It may touch:** `src/sim/` (`goal.ts`, `commands.ts`, `gardener.ts`, the kitchen and box model, `purse.ts`, `shed.ts`), `src/data/` (cards, crops, unfold, explain), `src/ui/` (the Kitchen tab, the goal bar, the Shed, the step-up card), `tools/bot*` and `tools/checks/`, and docs: `docs/systems/kitchen.md`, `docs/systems/shed.md`, `docs/specs/playable-garden-4.md`, `docs/roadmap.d/`, `src/updates.d/`, this brief as committed, and `docs/lessons/`.
  - **Don't touch** the allotment's files (`src/sim/allotment.ts`, `src/sim/season.ts`, `src/ui/SeasonPanel.tsx`, `season.css`, `src/ui/map/season.ts`, `src/ui/AllotmentPanel.tsx`) or the ladder's sealing. Part 9 (`feature/zoom-back-in`) and the season panel follow-up build there. The step-up card's text is yours; its sealing isn't.
- **Sessions building beside you:** part 9 (the first zoom back in, `feature/zoom-back-in`) and the map art (#72, `feature/map-art`). Merge `main` the moment either lands.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/goal.ts` and `node tools/graph.mjs kitchen`, and only the files those list.
- `docs/briefs/playable-garden-4.md`, `docs/lessons/83-playable-garden-4.md`, `docs/specs/playable-garden-4.md`.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "Trade" at 1 (the honesty box), "Crops" and "Storage" at 1 (the midwinter choice), "Advisers, recommendations and Explain" at 1 (words on the numbers), and level 1's row in the quiet-stretch table.

1. **Born where.** The back garden (level 1). Flows: kg to the box and money back, kg stored or left in the ground, and the gardener's hours. All conserved.
2. **Across the ladder.** The box's takings are part of the sealed garden's Output and money when it seals; the midwinter choice shows as Reliability over the winter window. One level up, a node's number; two up, a tint.
3. **Loops.** Trade (selling a surplus) and waste (food sold or stored isn't wasted). Fast: a week's takings. Slow: a steadier winter supply.
4. **People.** The gardener stocks the box and does the winter job; neighbours pay at the box. The player chooses.
5. **The lever.** The box policy, found; the midwinter decision.
6. **The map.** The box stocked or empty, and the winter job drawn where it happens. Reduced motion shows the end state.
7. **Explain.** Honesty-box selling and what it earns; the winter job's mechanism (forcing, storing in the ground, rotation) with its source.
8. **Economy and balance.** The box's winter takings and the midwinter choice's kg and money. The bot on seeds 1–3: the longest quiet stretch at level 1 no longer than round four's, and the step-up day inside the baselines. Report both.
9. **Carbon and land.** Food sold or stored rather than wasted; no new land.
10. **Polish.** Phones first (320 px portrait and landscape) up to large screens. Concise UK English. Nothing new greyed out.
11. **The lesson.** A small surplus sold locally adds up, and winter's garden is a storage problem as much as a growing one.
12. **Unfolding.** The box card with the first late-summer surplus; the midwinter choice in its week, once.

## Speed budget

Keep a garden day and the garden's 1440 × 900 frame no slower than `main`'s, measured in alternation, three runs each.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- The session merges its own PR per the `steward` playbook: squash and merge once `check` (the summing job over CI's three parts) and Description are green on the latest head, with the look back committed. Then confirm the Pages publish, and stop.
- **Play it yourself** at 390 × 844, then at 1440 × 900, at days 220, 280, 300, 330 and 366, at 1× to 16× without jumping past cards. Put "is midwinter a game now" in the PR.
- **Waiting:** call `subscribe_pr_activity` once the PR is open. When you end a turn waiting on CI, book a `send_later` about 15 minutes out, since nothing else wakes an idle session.

## What's left for others

- **The allotment's goal and shop** (no goal bar after the step up, and money piling up with nothing to buy) is the coordinator's next part after part 9.
- The helper offer's text overflowing at 390 px, and the plot's care and feed levers showing no effect, go to the season panel follow-up.
- Advisers and "let them decide", the baselines reset, the strategy tests and Balance #21 to #24.
- List anything you leave under a heading "Handed on" in the PR.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $8 on the cheaper model: surfacing an existing card, one or two small decisions on existing models, labels, the bot, and two CI rounds of about 11 minutes.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning. Open the PR once item 1 works.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 4 upwards.
