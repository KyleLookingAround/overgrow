# Brief: a UI and UX overhaul, with a fullscreen mode, good on every device

On 29 Sep at about 23:20 the owner asked for "a ui/ux overhaul … fullscreen mode and really make sure it's good on every device". This session does it.

Where the page stands:
- **Six parts and three playable rounds** each added their piece to the page: the top bar, the goal bar, the panel's tabs (Garden, Shed, Kitchen), cards, notices, badges, the Explain card, the year cards and the purse line.
- **The `layout` check** keeps each piece inside the viewport at six sizes.
- **What's never been done** is the whole thing designed as one: a clear hierarchy, one visual language, and the map first on every device.

## Goal and what it may touch

- **Deliver** one PR on `feature/ui-overhaul` from `main`. Start from a GitHub issue (the Feature template). The owner asked for this directly. The coordinator approves the spec (decision 15), so nothing waits on the owner.
- **Phase 1: audit and spec. Change no code under `src/` yet.**
  1. **Build `main`** and screenshot it at every size in the device list below, in both light and dark schemes.
     - **The moments to capture:** the first card, day 2 with notices, a busy summer day with the Shed open, a winter card, the Explain card, and the year card.
     - **A save for them:** seed 1 at days 1, 2, 120, 250 and 366, from the bot (`tools/bot*`) or commands through `window.__sim`.
  2. **Write down what's wrong,** screenshot by screenshot:
     - hierarchy;
     - crowding;
     - what hides the map;
     - thumb reach on phones;
     - wasted space on large screens;
     - type sizes;
     - contrast;
     - tap targets;
     - landscape phones;
     - the notch and safe areas;
     - how cards, notices and the goal bar compete.
  3. **Write a one-page spec** in `docs/specs/ui-overhaul.md` from `docs/specs/TEMPLATE.md`. It covers:
     - the layout for each device class (phone portrait, phone landscape, tablet, laptop, large desktop and ultrawide);
     - the type scale and spacing scale;
     - the colour roles in `tokens.css`, light and dark;
     - how panels, cards, notices, the goal bar and the top bar share the screen;
     - the motion rules;
     - the fullscreen mode.

     Keep the owner's rules:
     - hide locked things, never grey them;
     - impacts on the map, not text;
     - concise UK English;
     - one card or notice at a time.

     Keep the UI record (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`). Where the spec changes a rule, add a decision record.
  4. **Open the PR as a draft** with the spec and the "before" screenshots, then carry straight on. The coordinator reads it at its next check-in and replies only if something must change.
- **Before phase 2, wait for "a shorter garden year".** That PR (branch `feature/shorter-garden-year`) is changing the top bar's speeds to pause, 1×, 2×, 4×, 8× and 16×, adding a quiet-night mark, and dimming the map at night.
  - Don't edit `TopBar.tsx`, `src/app/clock-loop.ts` or `src/data/ladder.ts` until it's in `main`.
  - Once it lands, merge `main` into your branch and build on its speeds.
  - Other files you can start on as soon as the spec is written.
- **Phase 2: build it,** in priority order. Trim from the bottom if it runs long.
  1. **The layout for each device class, map first.**
     - **Phones:** the panel is a sheet with clear resting heights, and the goal bar and speeds are within thumb reach.
     - **Tablets and laptops:** a side panel.
     - **Large and ultrawide screens:** the map grows and the panel stays readable. Never text stretched across 2,000 px.
  2. **Fullscreen mode.**
     - A fullscreen button uses the Fullscreen API where the browser has it. Show it only there. Hide locked things, never grey them.
     - Leave it cleanly with Esc or the button.
     - Keep the layout right when the viewport changes.
     - For iPhone Safari, which has no Fullscreen API for pages, add a web app manifest (`display: fullscreen`, with a `standalone` fallback) and the Apple web-app meta tags. "Add to Home Screen" then opens without browser chrome, with safe areas respected.
     - **Icons:** an app icon drawn from the game's own palette, as SVG plus the PNG sizes the manifest needs.
     - **No service worker or offline mode** in this PR.
  3. **One visual language.**
     - The type scale, spacing, radii, elevation and colour roles, all in `tokens.css`, applied to the top bar, goal bar, panel, tabs, cards, notices, badges and the Shed's rows.
     - **Numbers:** tabular figures, with units styled consistently (`src/ui/format.ts`).
     - **Dark scheme:** equal to the light one.
     - **Contrast:** WCAG AA for text and controls in both.
  4. **UX flow.**
     - Every tap gives feedback.
     - Cards and notices never cover the thing they talk about.
     - The goal bar's button is the obvious next action.
     - The Shed reads as a shop, with the next thing to save for at the top.
     - Kitchen and Garden lead with one headline number each.
     - Empty states say what to do.
  5. **Input.**
     - Touch, mouse and keyboard all work.
     - Focus is visible.
     - Hover-only affordances get a touch equivalent.
     - Pinch and drag on the map don't fight page scroll.
     - Tap targets are at least 44 px on touch.
  6. **Motion.** Transitions for the sheet, cards and tabs, each under about 200 ms. Reduced motion shows stills.
- **"Every device", proved:**
  - **The device list, in Playwright's Chromium:**
    - 320 × 568;
    - 360 × 640;
    - 375 × 667;
    - 390 × 844;
    - 414 × 896;
    - 430 × 932;
    - each of those phones in landscape;
    - 768 × 1024 and 1024 × 768;
    - 820 × 1180;
    - 1024 × 1366;
    - 1280 × 800;
    - 1440 × 900;
    - 1920 × 1080;
    - 2560 × 1440;
    - 3440 × 1440.
  - **Settings for phones and tablets:** device scale factor 2–3, with `isMobile` and `hasTouch`.
  - **Extend the `layout` check** to the whole list:
    - no overflow;
    - everything inside the viewport and safe areas;
    - tap targets;
    - the map's share of the screen above a floor per device class, set in the spec;
    - fullscreen in and out, where the API exists;
    - the manifest's presence and its fields.
  - **WebKit:** if Playwright's WebKit can run here, add a smoke pass at 390 × 844 and 1024 × 1366. If it can't, don't download browsers: say so in the PR, and list what only a real iPhone or iPad can confirm.
  - **In the PR:** before-and-after screenshots at a phone, a landscape phone, a tablet, a laptop and an ultrawide, in both schemes.
- **It may touch:**
  - `src/ui/` (every component, `map/` for its chrome and hit areas only, not what the map draws) and `src/ui/styles/`;
  - `index.html`, and the manifest and icons in `public/`;
  - `src/app/main.tsx` only for the manifest or the fullscreen wiring;
  - the checks under `tools/checks/` that this changes, and new ones;
  - `docs/specs/ui-overhaul.md`, `docs/SYSTEMS.md` (the layout and checks notes), `docs/systems/map.md` where the chrome is described, a decision record where a rule changes, `src/updates.d/`, `docs/roadmap.d/`, `docs/briefs/ui-overhaul.md` (this brief, saved as is) and `docs/lessons/`.
- **Don't touch:** the sim (`src/sim/`), `src/data/` (beyond words the UI shows, if any live there), the bot, or the economy. This PR changes how the game looks and handles, never what it does: the bot's `PLAY` must stay identical on seeds 1–3 against `main`.

## Read first

- The project notes, then `node tools/graph.mjs "The map and the page's shell"`, `node tools/graph.mjs src/ui/App.tsx` and `node tools/graph.mjs layout`, and only the files those list.
- `docs/decisions/ADR-2026-09-29-ui-from-final-call.md` (the UI record and the owner's wins W1–W29), `docs/decisions/ADR-2026-09-28-webgl-map.md`, and `docs/systems/map.md` and `docs/systems/unfolding.md`.
- The founding spec's UI sections (`docs/specs/overgrow.md`).
- The `feature` and `steward` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): none of the grid's systems change. It is the page's shell that every level's panels sit in, from the garden up to the planet.

1. **Born where.** The page's shell, at level 1. No flows move, and conservation is untouched.
2. **Across the ladder.** Every later level's panels, cards and notices use this layout and these tokens. Name in the spec how the panel scales from one garden to a map of regions: a node's card, a list of nodes, and a legend.
3. **Loops.** None. It makes every loop's impact easier to see on the map.
4. **People.** None changed.
5. **The lever.** No new lever. Fullscreen is a view setting, kept on the device.
6. **The map.** Map first on every device, with the chrome around it and never over what matters. Reduced motion shows stills.
7. **Explain.** The Explain card's layout only. Its words and sources stay.
8. **Economy and balance.** None: `PLAY` is identical.
9. **Carbon and land.** None. The dial's look may change, but not its numbers.
10. **Polish.** This part is the polish: 320 px up to 3440 px, touch, mouse and keyboard, both schemes, AA contrast and safe areas.
11. **The lesson.** None of its own. It makes every other lesson readable.
12. **Unfolding.** Unchanged: things still unfold as `src/data/unfold.ts` says. The fullscreen button shows from the start where the API exists.

## Speed budget

- **The garden's frames:** no worse than `main` on the 1440 × 900 frame and the throttled phone frame. Measure both, three runs each, alternating with a build of `main`.
- **`dist/`:** under 10 KB gzipped more. The icons don't count, since they're not in the page's bundle.
- **The sim:** untouched.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the screenshots and `PLAY` are in the PR.
- **Before the last CI round:** merge `main`.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is ready, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged and published, the session stops.

## What's left for others

- The playable garden's next round (cards, economy, the staged big buys): it follows this PR and builds on its components.
- A service worker and offline play.
- Advisers and "let them decide"; the baselines reset; the strategy tests; Balance #21 to #24; part 7.
- The owner has said the coordinator chooses (decision 15). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $35. It covers an audit at 30 sizes, a spec, a rebuilt shell for every device class, fullscreen and a manifest, the tokens applied everywhere, extended layout checks, and two or three CI rounds. It's past the $25 split line, but the owner asked for it whole. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:**
  - Don't end a turn after planning: build straight on.
  - Look at screenshots at reduced size where you can.
  - Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim phase 2 from item 6 upwards.
