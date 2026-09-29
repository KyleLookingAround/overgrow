# The owner's answers on the systems web, written into the spec (#37) · 29 Sep 2026

- **Numbers:** estimate $6; `get_session` reported no cost when the PR opened, so it's not yet known (unknown, not free). Docs only: no bot run and no speed budget. Pushes: one before the look back. No merges from `main` needed at opening. One model, no other sessions.
- **Went well:**
  - Reading the questions, the owner's answers and the spec's sections first, then editing by small scripted replacements that assert each target appears exactly once, meant no edit landed twice or missed its line.
  - Keeping each answer's source visible (`O·Qn` in the web, *(approved, #29 Qn)* in the spec) lets a later session trace a rule back to the owner's answer.
- **Lessons:**
  - The first pass turned every `Q` into a bare `O`, which broke sentences ("**O** proposes one") and lost which question a row answered. Deciding the marker's wording on one row before running a global replace would have saved a redo.
  - The brief's part numbers (honesty box in part 6, hosepipe ban in part 10) don't match the founding roadmap's original titles, because 6 was split into 6a to 6c after the spec. A spec that names parts by number drifts when parts split; name the piece, and let the roadmap carry the number.
  - Lengthening the levels makes the step-up numbers (1.5 kg a day, Reliability 60, Health 50) harder to meet over a year than over a month; they stay proposed, and part 6c's bot must set them, not inherit them.
