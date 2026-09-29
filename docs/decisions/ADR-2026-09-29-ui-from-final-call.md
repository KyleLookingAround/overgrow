# ADR-2026-09-29: The UI and multi-device rules Overgrow takes from Final Call

## Status

Accepted when the PR that adds it merges (the brief `docs/briefs/final-call-wins.md`). The rules bind a part as it touches the UI; nothing here rewrites part 1's shell in a separate PR.

## Context

Final Call reached version 34 with a phone-first UI and paid for its layout bugs in look backs and audits. The runbook ADR (`ADR-2026-09-28-runbook-from-final-call.md`) took the way of working; this record takes the UI and multi-device rules, so the parts that build panels, cards and the map's chrome (parts 3 to 7) start with them. Each rule below was checked against Final Call's files on 29 Sep 2026. Final Call paths are given relative to its own `docs`, `src` and `tools` folders (`lessons/…` is under its `docs`, `game/…` and `shell.html` under its `src`, `checks/…` under its `tools`), so they aren't mistaken for Overgrow's; the full paths are in `docs/ideas/final-call-wins.md`. where Final Call is the counter-example, or the rule is Overgrow's own, it says so.

## Options Considered

### Option 1: Leave the UI to each part
**Pros:** nothing to write. **Cons:** each part rediscovers the same failures on a phone; Final Call's #124 ran to five times its estimate fixing one geometry bug per round.

### Option 2: Copy Final Call's UI lessons as they stand
**Pros:** proven. **Cons:** some were workarounds for its own choices (a manual notch band, heights from JavaScript, a dark-only page) and some are for a Canvas 2D board, not a map-first Preact and PixiJS page with light and dark themes.

### Option 3: Adopt the rules that hold, adapt them, and record what is left out (chosen)
**Pros:** the rules that cost Final Call the most are in force before the first panel is built. **Cons:** one more record to keep true.

## Decision

Option 3.

### Adopted

1. **Write the layout check first and watch it fail.** A UI change starts with a check that reads bounding boxes and fails on the current build; the same check, passing, is the proof. (Final Call `lessons/107-phone-topbar.md`: the `topbar` check written first, failing on `main` at 320, 390 and 844×390, "faster than squinting at screenshots".)
2. **Measure before fixing, then fix everything measured in one pass.** Bounding boxes and computed styles at all six sizes come first. (`lessons/87-overlay-cards.md`, `124-polish-first-minute.md`: five times the estimate from one geometry bug per round.) The `feature` playbook already says this.
3. **Check a row of controls, not only each control.** A size rule on a row needs a check on the row: how many fit, not just how big each is. (`107`: 42 px buttons grew until the bar wrapped, with no check on the bar.)
4. **Breakpoints follow the map's and the panel's width, with container queries.** The map and the panel are size containers; the top bar steps down by the map's width and the tabs by the panel's, because in landscape the panel sits beside a narrow map. Screen-width media queries stay only for choosing the sheet or the side panel. (`107`; `SYSTEMS.md` "Views and phone layout"; `shell.html` `.stage` and `.side`.) Measure the container before choosing the steps.
5. **Measure the tab strip before adding a tab or a control.** Chrome is budgeted at 320×568, and tabs fall back to icons (with an accessible name) below about 380 px of panel width. (`112-polish-where-to-look.md`: a tab added without measuring was 59 px over; `ideas/release-audit.md` row 33.)
6. **A real tap on a touch page.** Touch checks tap (`page.touchscreen.tap` on a touch context), not click, and anything that shows or hides layout on `pointerup` eats the click that follows. (`100-photo-mode.md`: the mouse check could not see the click landing on whatever was under the finger.)
7. **Chrome over the map lets taps through.** An overlay's background has `pointer-events: none`, its buttons `auto`. (`systems/guided-start.md`, issue #103.)
8. **Safe areas by CSS.** `viewport-fit=cover` (already in `index.html`) and `env(safe-area-inset-*)` on anything fixed to an edge: the sheet's foot, card footers, the top bar. Final Call sets `viewport-fit=cover` in `sources.mjs` and uses `env()` in seven places in `shell.html`, but leaves the notch to a manual band (below).
9. **`dvh`/`svh` and CSS for heights, not JavaScript.** Final Call is the counter-example: its sheet snaps and the tour's placement are computed from `innerHeight` (`game/19-bottom-sheet.js`, `36-guided-start.js`), and its phone geometry fixes ended up as JavaScript clamps (`lessons/124-polish-first-minute.md`: a chrome-avoidance clamp, a rectangle-shape bug and a side-panel clamp). It uses no `dvh` or `svh` anywhere. This rule is Overgrow's own; the sources show what it replaces. A script may read `getBoundingClientRect()` to place a thing, never to size the page.
10. **Touch targets at least 40 px** (`--touch`, already in `tokens.css` and checked by `layout`). A variant class with a more specific selector can silently keep a small size, so the check covers every button. (`lessons/84-phone-chrome.md`, `ideas/polish-2026-09.md` rows 2 and 3.)
11. **Wrap rather than ellipsis on touch.** There is no hover to reveal a clipped label; goals, stat rows and cards wrap or step down to a condensed size first. (`ideas/polish-2026-09.md` row 19; `SYSTEMS.md` side panel bullets.)
12. **Numbers carry their units, and the unit is chosen after rounding.** Units always follow the number (the spec's SI rule, Overgrow's own); Final Call adds that 999,960 must not print as "$1000.0k" and −0.004 must not print as "−$0" (`ideas/release-audit.md` row 35). A Vitest test on `src/ui/format.ts` holds the edges.
13. **Step-up and level cards list only what unlocked, capped.** Built from the same data the game gates on, at most five items and "and N more", one chip per tab, pausing the game and restoring the speed, queued behind the first minute rather than dropped. (`systems/level-up-card.md`, `checks/levelup.mjs`, `lessons/150-first-level-up-card.md`.)
14. **One overlay style.** Every card (Explain, step-up, What's new, help) shares one component: header, body, footer, close button, safe-area padding. (`87-overlay-cards.md`.)
15. **The first minute never mentions or points at UI the layout hides,** hides while any card is open, and never spotlights ground the chrome covers. (`systems/guided-start.md`.)
16. **Impacts are on the map first, and a notice is second.** This is the founding spec's rule and Overgrow's own. Final Call is the counter-example again: it made records toasts because a floater at a fixed map spot is off screen at some size (`ideas/release-audit.md` row 22; `systems/records.md`). Overgrow's answer is to anchor an impact to the thing that changed (the `at` place, `docs/ideas/final-call-wins.md` W3) and, if it is off screen, to pulse the screen edge nearest it.
17. **One sign per batch.** Several completions together make one pulse, and the check builds a case where more than one really qualifies. (`lessons/159-release-p2-moments.md`.)
18. **A fresh review of the whole function a UI fix touches,** not only the branch the bug takes. (`87-overlay-cards.md`: a fallback path still measured the old rectangle.)

### Not adopted

| Not adopted | Final Call source | Why not |
| --- | --- | --- |
| A manual notch band ("Space for the camera") | `game/15-panel.js` (`gapPref`), `--gapsz`, `--topgap`, `--sidegap` | Rule 8 does its job without asking the player. |
| A dark-only palette | `shell.html` | Light and dark come from tokens (`src/ui/styles/tokens.css`), and the `layout` check tests both. |
| 36 px targets (and 27 px in old builds) | `.lvgo .ic`, `.tabs .fold`, `@media (max-width:272px)` step in `SYSTEMS.md` | The floor is 40 px on touch (rule 10). When the bar does not fit at 40 px, something leaves the bar (rule 4), it does not shrink. |
| Labels under 11 px | `.tabs button` at 9.5–10 px, board labels at 9 px in `shell.html` | Final Call's audits raised many of them and they were still hard to read. 11 px is the floor; below it, icon plus accessible name. |
| Floaters at fixed map spots, and toast-first feedback | `game/35-records.js`, `earn()` | Rule 16. |
| Heights from JavaScript | `19-bottom-sheet.js`, `36-guided-start.js` | Rule 9. |

## Consequences

- The `feature` playbook and the `steward` playbook carry the process lines (write the check first, tap on a touch page); the rules that need code (container queries, `env()`, `dvh`, a row check) go into the parts that touch the UI, through the owner's pick on `docs/ideas/final-call-wins.md`.
- `docs/systems/map.md` names these rules the first time a part changes the page's shell.
- A rule that turns out wrong for Overgrow is replaced by a new record, not edited here.
