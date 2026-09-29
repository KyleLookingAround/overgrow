# The playable garden, round two (#58) · 29 Sep 2026

- **Numbers:**
  - The estimate was $30. The session's cost read nothing (not reported) at its one reading. The session started at 18:53 UTC and the PR opened at about 21:10 UTC, with items 0 to 8 in it.
  - There were four full `npm run check` runs before the push. Every failure was a check reading an old number or an old wording (£4.50 of edging, the gardener digging at 18:00 on day 1, the goal bar's text, a click on "the first choice button").
- **Went well:**
  - **Speed first, fingerprinted.** Hashing snapshots and saves on seeds 1–3 over 400 days before and after each change made every speed cut provably play-neutral. The A/B against a `main` worktree, alternating and with nothing else running, gave clean numbers: 23 % faster.
  - **The bot found the economy's shape before any UI.** The first run with the new budget showed the purse at £20–40 all year. The bot then bought six raised beds before saving for anything big. Ordering the bot's shopping (small kit, then the big buys, then raised beds) was a player-priority question, not a price one.
  - **Measuring waste by cause and month.** The bot's waste wasn't the gluts. It was the kitchen keeping a stretched ask for half each crop's shelf life. A household that preserves or gives keeps three days fresh (WRAP's advice), and that is what moved it.
  - **The tips player earned its keep.** Following only the goal bar, it missed the offer on seed 1 once the year became 52 weeks. That surfaced two tips the bar lacked:
    - buy the hens when Output binds;
    - preserve gluts only while Output has room.

    It also surfaced one bad tip: the fruit cage for this year's Output.
  - **The fresh review caught real loops.** The bed card came straight back when a bed had a later start date. It also overwrote the greenhouse's tomatoes, the frost card asked twice a night, and the mulch card nagged monthly.
- **Lessons:**
  - **A card is a loop until proved otherwise.** Every "asks once" rule needs its end state tested: that the answer really makes the condition false. `sowFrom`, a named plan, and "answered within 12 hours" inside a 15-hour window each broke that. A Vitest test per card that answers it and asserts it's gone would have caught all four; the next card-heavy part should write that test first.
  - **A bot policy can fight a card.** The sensible bot's watering policy reset the line every morning, so the dry-spell card came back every fortnight. When a card changes a lever a bot policy also sets, make the policy one-way ("only raise").
  - **Winter and early spring are structurally quiet** while every bed holds a winter crop. Real winter jobs (the catalogue, chitting, warming the soil, a mulch, winter digging) took the longest quiet stretch from 44–96 days to 29–40, not to 14. The rest needs something the brief leaves alone: a spring with beds free to plan, or harvests counted as events.
  - **The window's length decides whether a first year can win.** `ceil(365 / 7)` is 53 samples, so a year of weekly samples from the first day fills on day 371. A goal meant to land in the first year needs a 52-week window.
  - **Budget `dist/` early.** Six cards, five big buys and fourteen Explain entries came to 17 KB, over the 15 KB share. It was measured only at the end, when trimming meant cutting features.
