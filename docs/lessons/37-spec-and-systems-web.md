Theme: spec
# The founding spec, the systems web and the owner's answers (#3, #31, #37) · 28–29 Sep 2026

- **Numbers:** #3 estimate $25 with the runbook, $50 at the merge, twice it: the owner joined and the architecture, the eight-level ladder and three pages for their answers were work the brief didn't ask for; #31 estimate $15, cost not reported, three pushes, three merges from `main`; #37 estimate $6, docs only, one push.
- **Went well:**
  - Designing in the conversation before writing meant the spec was written once (#3); generating the owner's page from the web's own tables meant the page and the doc couldn't disagree, and the owner's mid-session addition (unfolding) reached both by editing only the web (#31).
  - A read-only helper summarised the three open model PRs before any writing, so the hooks were checked against real code (#31); the fresh review found a wrong "From", five rows marked settled that the spec doesn't settle, and three overstated figures.
  - Small scripted replacements that assert each target appears exactly once meant no edit landed twice or missed its line; each answer keeps its source visible (`O·Qn`, *(approved, #29 Qn)*) (#37).
- **Lessons:**
  - A founding spec for a systems game is a different document from a feature spec. → `docs/specs/TEMPLATE.md` makes it the one exception to the one-page rule.
  - With the owner present, a design conversation is cheaper than a design document; a `needs-owner` issue got no answer in an hour, but a page with the options pre-selected, saving to a store the session reads back, got ten in minutes. → the `feature` playbook's needs-owner queue.
  - For a long grid, write one system's table in full first and agree its depth before doing the rest; a column the owner adds mid-session is quicker and safer by script from one table of values than by hand in 28 tables (#31).
  - Grandfathering a new brief rule needs the names of briefs still in flight, and again after every merge from `main`. → the warning beside `BEFORE` in `tools/brief.mjs`.
  - A page script's global named `top` collided with `window.top` and broke the page silently; one screenshot pass caught it.
  - Decide a marker's wording on one row before running a global replace (the first pass turned every `Q` into a bare `O`); and a spec that names parts by number drifts when parts split, so name the piece and let the roadmap carry the number (#37).
  - Lengthening the levels made the step-up numbers harder to meet over a year than a month; they stay proposed until the bot sets them (#37; carried by #56's and #70's lessons).
