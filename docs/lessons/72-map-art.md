# A beautiful map · 30 Sep 2026

The garden's art pass and the style kit (#72, from `docs/briefs/map-art.md`).

## Numbers

- Cost: (filled in before the merge) against a $25 estimate.
- Started about 00:05 on 30 Sep; the PR opened at (filled in); pushes (filled in); red CI runs (filled in); merges from `main` (filled in).
- Hours waiting on the owner: none. The brief approved the spec in advance.

## Went well

- **Look first, then draw.** A screenshot script over every season, hour and weather (`build/map-shots.mjs`) and a contact sheet (`build/sheet.mjs`) made the "before" plain in one image and every "after" a two-minute look, at a fraction of the tokens of reading full-size screenshots.
- **Layers by how often they change.** Splitting the map into the ground (once), the tilth (once), what grows (once a snapshot) and the live soil and frost (each frame) let the plants have real silhouettes without touching the per-frame budget.
- **One polygon a plant.** A cosine-modulated outline gives a rosette, a fan of blades or a bush as one shape each, so a bed of 36 salads costs no more than the circles it replaced.

## Lessons

- A paused view moves only on a tick of more than four steps: a screenshot script that steps an hour at a time shows the hour before. The `scene` check knew; the script had to learn it.
