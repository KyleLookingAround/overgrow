# A beautiful map · 30 Sep 2026

The garden's art pass and the style kit (#72, from `docs/briefs/map-art.md`).

## Numbers

- Cost: about $38 against a $25 estimate, with about 440k of context used. About a third of it went on the two rounds the estimate didn't hold: three merges from `main` by hand (parts 7's allotment and #66, then the shorter year, then a docs-only one), the allotment moved onto the kit at the coordinator's ask, and a resume after the account's usage limit stopped the session for two and a half hours (01:27 to 03:50).
- Started about 00:00 on 30 Sep; the PR opened at 01:12; 14 commits over 4 pushes before CI's first run; red CI runs: none; merges from `main`: three by hand (the Catch up workflow hit conflicts in the map's files each time).
- Hours waiting on the owner: none. The brief approved the spec in advance.
- The finish: the session ran to about $91 against the $25 estimate and was closed with one check failing (`stepup`'s tap during the zoom-out). A second session took the branch over, reproduced the failure under 20× CPU throttling with software GL, and fixed it in the drawing. A `night` case (a clock-rate reading of 4.9 against more than 5) then failed once on CI's runner. Merges from `main` in all: six by the first session and the Catch up workflow, none more by the second (already up to date).

## Went well

- **Look first, then draw.** A screenshot script over every season, hour and weather (`build/map-shots.mjs`) and a contact sheet (`build/sheet.mjs`) made the "before" plain in one image and every "after" a two-minute look, at a fraction of the tokens of reading full-size screenshots.
- **Layers by how often they change.** Splitting the map into the ground (once), the tilth (once), what grows (once a snapshot) and the live soil and frost (each frame) let the plants have real silhouettes without touching the per-frame budget.
- **The kit's second level came free.** Part 7 landed mid-session with its own allotment drawing; moving it onto the kit (soil, tilth, rosettes, sheds, paths, a hedge round the site) took one file and proved the scale argument the brief asked for.
- **One polygon a plant.** A cosine-modulated outline gives a rosette, a fan of blades or a bush as one shape each, so a bed of 36 salads costs no more than the circles it replaced.

## Lessons

- **Never `pkill -f` a pattern in your own command line.** Stopping a stale check with `pkill -f "npm run check"` killed the shell running it, as the feature playbook already warns; kill by pid from `ps`. → the warning stands in the `feature` playbook; this is the second time it bit.
- A paused view moves only on a tick of more than four steps: a screenshot script that steps an hour at a time shows the hour before. The `scene` check knew; the script had to learn it.
- **Measure the crowd, not only the garden.** The walk cycle cost nothing on six people and half again on the phone bench's 5,000: per-figure work and re-uploaded texture frames scale with the count. A level-of-detail rule (a crowd past 200 glides through a position-only container) gave the budget back. Measure both figures the brief names before opening the PR, not after.
- **A fresh review earns its cost on drawing code.** It found a texture swap that left the old quads, leaves drawn over roofs, and a delight that opened the wrong Explain card: none of them fail a check, all of them a player would see.
- **Why it ran long.** The estimate assumed one art pass; the session merged `main` six times, each with conflicts in the map's files, moved the allotment onto the kit mid-way, and chased CI timings that only show on a slow software renderer. Measure a timing check under throttling (20×, software GL) before the first push, not after CI's third failure.
- **A tap is answered on input, not on the next frame.** The zoom-out's per-frame cost was fine; the first uncached frame after the tap was the stall. The fix keeps the world one cached picture for 600 ms after the tap (`SETTLE_MS` in `src/ui/map/renderer.ts`), so the frames a check reads right after a tap are cheap.
