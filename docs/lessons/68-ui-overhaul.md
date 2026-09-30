Theme: parts
# The UI and UX overhaul (#68) · 30 Sep 2026

- **Numbers:**
  - The estimate was $35; `get_session` read $29.27 at the last reading that carried a cost (the first four readings had no cost field at all). Context used: about 515,000 tokens of the million.
  - The session started at 23:16 UTC on 29 Sep. The draft PR with the audit and the spec opened at 23:42; the usage limit stopped the session at about 01:25 with phase 2 unpushed, and it carried on at 04:36 after the reset. The push with phase 2 came at about 05:05.
  - Four full `npm run check` runs (one caught my own test's wrong expectation and three checks matching the old words; one the fullscreen button unmounting itself; one the merge's `night` group before the moon went on the pill), then the affected groups alone.
  - Three merges from `main`: #66 by hand, then #70 and #67 together by hand (nine conflicts, seven of them in files this PR rewrote), and the Catch up workflow's own merge pulled in after two rejected pushes. No hours waiting on the owner: the brief approved the spec in advance; the owner's two additions came through the coordinator as the work went.
  - The before-and-after screenshots: 112 frames of `main` at the brief's thirty sizes and six moments, then the same at the seven sizes worth looking at.
- **Went well:**
  - **Measuring before designing.** The audit script (`build/shots.mjs`) recorded every box, font size, small target and overflow at each size in one JSON, and a contact sheet (`build/sheet.mjs`) put thirty frames in one image. The notice wider than the map (x = −48 at 320 px) and the goal bar hidden under the "try faster" nudge were numbers before they were opinions.
  - **The contrast script** (`build/contrast.mjs`) turned "AA in both schemes" into a table with a floor per pair; two roles missed by a hair and were fixed before any CSS was written.
  - **The fresh review** found ten real things: a notice covering the fullscreen button, safe-area insets applied inside the map where the bar already pads them, the sheet's state lying under a card, the speed pill lost under a card, the Shed not putting the next buy first, and sizes that had escaped the tokens.
- **Lessons:**
  - **A container query can't style its own container.** The top bar's own gap needed a screen-width media query after all; the stylesheet's header says so. Worth remembering before the next container step.
  - **A rule that changes the map's box changes every check that measured it once.** Folding the sheet under a card grew the map, and the `explain` check compared the card to the map's old box. → `tools/checks/explain.mjs` measures the map again after the card opens.
  - **A media-query-driven component must read its condition once.** The fullscreen button hid itself the moment the page went fullscreen (`display-mode: fullscreen` matched) and the check's second click timed out. Read at mount.
  - **44 px targets move a fold.** The four speeds at 44 px each no longer fit a 640 px bar; the fold moved to 700 px. A tap-target change is a row change too (the UI record's rule 3).
  - **Check the tap's coordinates after the layout moves.** The sheet's button moved when the sheet grew, and the second tap at the old spot landed on the map. → the `layout` check re-measures the button before each tap.
  - **Pull before you push, every time:** two pushes were rejected because the Catch up workflow had merged `main` on GitHub first. → already in `steward` "Catching up with `main`".
  - **A parallel part that rewrites the same files costs a second resolution.** Part 7 and the shorter year landed while this PR rewrote the stylesheet, the app and the layout check: nine conflicts, resolved by taking this branch's version and folding the other's additions in by hand (the moon, the six speeds, the allotment's panel). A shell rewrite is best merged before the parts that sit on it, or briefed with them.
  - **WebKit isn't here.** Only Chromium is installed and the brief says not to download browsers, so the home-screen install, the status bar style and the notch's insets wait for a real iPhone or iPad; the PR lists them.
