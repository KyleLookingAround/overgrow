# The UI and UX overhaul (#68) · 30 Sep 2026

- **Numbers:**
  - The estimate was $35. `get_session` reported no cost at any of the four readings (the field was absent, not 0), so the session's cost is unknown here; the coordinator's view has it.
  - The session started at 23:16 UTC on 29 Sep. The draft PR with the audit and the spec opened at 23:42; phase 2's push came at about 01:10 on 30 Sep.
  - Two full `npm run check` runs before the push (one caught my own test's wrong expectation and three checks matching the old words; the second the fullscreen button unmounting itself), then the affected groups alone.
  - One merge from `main` by hand (#66), no conflicts. No hours waiting on the owner: the brief approved the spec in advance.
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
  - **WebKit isn't here.** Only Chromium is installed and the brief says not to download browsers, so the home-screen install, the status bar style and the notch's insets wait for a real iPhone or iPad; the PR lists them.
