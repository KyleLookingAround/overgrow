# Headroom for the garden day, again (#60) · 29 Sep 2026

- **Numbers:**
  - It followed #59 in the same session. `main` went red on the Pages run minutes after the merge: the garden-day test measured 2.02 ms against 2 ms. The PR's own two CI runs had passed on the same code.
  - The fix is one change to the water model. The first two tries, a cached node list and three lookups made cheaper, measured nothing.
- **Went well:**
  - **Counting flows by kind located the cost.** A day's flows counted by `what` showed that evapotranspiration was half of every tick's flows. Profiles spread the same cost thinly over the flow bookkeeping and the snapshot, and hid it.
  - **The bot settled the play question.** Running it on seeds 1–3 against `main` showed that a coarser step for the water balance moved play by a hundredth of a kilo a day, so the change could ship without re-tuning.
- **Lessons:**
  - **A speed test near its limit fails on a slower runner, not on the PR.** The estimate "about 1.6 ms on CI" came from one runner's ratio. #59 then added 0.07 ms and merged with less headroom than it claimed.
  - **Before a merge that adds sim work, check CI's own measured figure from the PR run, not a local ratio.** Where it's within 15 % of the limit, make room first. When a timing test's value is only in the log, print it where the PR's CI summary shows it.
  - **Micro-cuts under noise are unmeasurable.** When a flat profile's biggest share is under 5 %, look for the flow or the loop that multiplies everything else before cutting lines.
  - **A fixed pause after a tap is a race under load.** The first-minute check read the nudge 600 ms after answering it and once saw it still drawn. It now waits for the nudge to go, then checks it stays gone.
