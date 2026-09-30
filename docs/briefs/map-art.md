# Brief: a beautiful map

At about 00:00 on 30 Sep the owner asked: "make sure the map itself looks beautiful too". The game's first rule is impacts on the map, not in text, so the map is where the player looks most. Today it draws the garden in the owner's chosen style (flat, top-down and soft: `docs/specs/overgrow/art-styles.html`, style A) from `src/ui/map/draw.ts`, `life.ts`, `daylight.ts` and `palette.ts`. It was built part by part and has never had an art pass of its own.

## Goal and what it may touch

- **Deliver** one PR on `feature/map-art` from `main`. Start from a GitHub issue (the Feature template). The coordinator approves (decisions 15, 20 and 21).
- **Start by looking.**
  - **Screenshots of `main`:** 390 × 844 and 1440 × 900, light and dark, at dawn, midday, dusk and night. Take them in spring, high summer, autumn and a frosty winter, in rain, with slugs out and with the Shed's kit placed.
  - **Then a short art spec,** `docs/specs/map-art.md`: the palette's roles and values, light and dark, and how each thing is drawn (shapes, soft shadows, depth, texture), with a before-and-after mock of one scene.
- **Then, in priority order.** Trim from the bottom if it runs long.
  1. **The garden's ground and structure:**
     - lawn with a gentle texture and mowing stripes;
     - dug soil that reads as soil, darkening wet and paling dry;
     - bed edges and paths;
     - the house edge, fence, shed, heap, butt and kit as soft, consistent objects with a shared light direction and soft contact shadows.
  2. **Plants that read at a glance and grow visibly.** Each crop has a recognisable silhouette at each stage (seedling, growing, ready), without pixel detail, so it reads from phone size up. Ready-to-pick shows (fuller colour, a small sheen). Stress shows (wilting when dry, yellowing when short of nitrogen), which is the owner's "impact on the map".
  3. **Light, weather and seasons.**
     - Warm dawn and dusk, cool night with the quiet-night dim from `feature/shorter-garden-year`.
     - Rain with puddles on the paths, frost on the lawn and the kit.
     - Autumn leaves on the lawn, and snow if the weather model has it.
     - Blossom on the cordons in spring.
     - Reduced motion shows the still state.
  4. **Life:** the gardener, the household, slugs, bees, birds and the hens, drawn with a little character (a walk cycle of two or three frames, a bob), all from flows the sim has. Nothing drawn changes the game.
  5. **Small delights:** a butterfly in summer, a robin in winter, steam off the heap on a cold morning, the box's coin. Cheap, rare and never in the way.
- **Everything is data-driven from the sim and tokenised.** Every colour is a `--map-*` token in `tokens.css`, light and dark. Readability comes first: the beds' tints and badges that carry information stay clear. The UI overhaul (#68) is presenting information on the map too (tints, badges, small labels), so coordinate through the tokens and don't restyle its badges.
- **Build a shared style kit for every level's map.** Put the pieces the allotment and later levels will reuse (ground, paths, sheds, plants, figures, weather) in functions that take a scale. Part 7 (`feature/step-up`) is drawing the allotment's twelve plots beside you: it will move onto your kit when you land, so name it in `docs/systems/map.md`.
- **It may touch:**
  - `src/ui/map/` (draw, life, daylight, palette, placement and new files for the kit), `src/ui/styles/tokens.css` (the `--map-*` tokens), and `src/ui/MapView.tsx` only if the renderer needs a hook;
  - the `scene` check and its screenshots;
  - `docs/specs/map-art.md`, `docs/systems/map.md`, `docs/roadmap.d/`, `src/updates.d/`, `docs/briefs/map-art.md` (this brief, committed by the coordinator; don't add another copy) and `docs/lessons/`.
- **Don't touch:** the sim, the data, the bot, the panels or the page's layout (the overhaul's).

## Read first

- The project notes, then `node tools/graph.mjs src/ui/map/draw.ts` and `node tools/graph.mjs scene`, and only the files those list.
- `docs/specs/overgrow/art-styles.html` (the owner's pick), `docs/decisions/ADR-2026-09-28-webgl-map.md`, `docs/systems/map.md`, and the founding spec's "The map" section.
- The `feature` and `steward` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): none change. It draws what every row's impacts look like on the garden's map, and sets the style kit every level's map uses.

1. **Born where.** The garden's map (level 1). No flows move.
2. **Across the ladder.** The kit takes a scale: plots at the allotment, fields at the smallholding, and so on up. A sealed node's tile uses the same ground, tints and shadows.
3. **Loops.** None directly. Each loop's impact is easier to see: a wilting bed, a steaming heap, a sparse winter.
4. **People.** The gardener and the household drawn with character, from their activities.
5. **The lever.** None new.
6. **The map.** This part is the map. Impact first. Reduced motion shows stills.
7. **Explain.** Unchanged. A drawn stress state (wilting, yellowing) is the same effect the Explain card names.
8. **Economy and balance.** None: `PLAY` is identical on seeds 1–3 against `main`.
9. **Carbon and land.** None.
10. **Polish.** Beautiful at 320 px and at 3440 px, in light and dark, at every time of day and season.
11. **The lesson.** A garden you can read at a glance: the state of the soil and plants is visible, not only numbered.
12. **Unfolding.** Unchanged. Kit appears when bought.

## Speed budget

- **Frames:** the garden's 1440 × 900 frame stays under 2 ms mean on the `scene` check (about 1 ms on `main`), and the throttled phone frame no more than 0.5 ms above `main`'s. Measure both against a build of `main`, three runs each, alternating.
- **`dist/`:** within 15 KB gzipped more.
- **If a texture costs too much,** pre-render it once to a texture, not every frame.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the before-and-after screenshots and `PLAY` are in the PR.
- **Before the last CI round:** merge `main`.
- **After merging:** confirm the Pages run publishes.
- **Waiting:** once the PR is ready, call `subscribe_pr_activity` and end the turn. Don't book a `send_later`. When it has merged and published, the session stops.

## What's left for others

- The page's layout and the information on it (the UI overhaul, #68).
- The allotment's map content (part 7), which moves onto this kit.
- Sound.
- The owner has said the coordinator chooses (decisions 15 and 20). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $25. It covers the look and the art spec, the ground and structure, plants by stage, light and seasons, life, a few delights, the style kit, the `scene` check's screenshots, and two CI rounds. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Look at screenshots at reduced size where you can. Open the PR once items 1 and 2 work. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 5 upwards.
