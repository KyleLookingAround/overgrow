Theme: coordinator

# The first slice's fourth coordinator · 29–30 Sep 2026

- **Numbers:**
  - About $26 against a $20 estimate, and about 615k of context at the handover.
  - Ran from 20:28 on 29 Sep to about 04:30 on 30 Sep, with a stall from about 01:40 to 04:23.
  - **Merged:** round two (#59), the garden-day headroom (#61), round three (#63, $19.98 of $30), the owner's decisions 17 to 21 (#66), and part 7, the step up to the allotment (#70, $18.90 of $30).
  - **Started and open at the handover:** the shorter year (#67), the UI overhaul on the Fable model (#68), and the map art on the Fable model (#72).
  - **Four playtests:** the third and fourth at about $5 each, on the cheaper model.
- **Went well:**
  - **Playtest, then brief, within the hour.** The third playtest found the 90-day winter, and round three fixed it for $20. The fourth found the money ladder's gap, and its brief (round four) was written from it before the owner woke.
  - **Committed briefs and a one-line first message.** The last three sessions started from a brief committed in the coordinator's docs PR, so no brief was pasted twice.
  - **Owner asks passed on within minutes as short triggers** (the 8× and 16× speeds, mobile first, presentation, the map), each recorded as a decision in the next docs PR.
  - **Part 7 in under two hours** from a brief that pointed at the maths and wiring notes written ahead (`docs/systems/ladder.md`, "Wiring").
- **Lessons:**
  - **Four building sessions and a coordinator spent the five-hour allowance in about four hours.** All of them stalled from about 01:30 to 03:50, and nothing woke them until 04:23. → The fifth brief caps sessions at three, Fable ones included. A coordinator that sees `allowed_warning` should book its own wake for a minute after `resetsAt` straight away, since once it's stopped it can't.
  - **The first `create_session` message left the brief out** (round three's). A trigger a minute later delivered it. → Commit the brief first and point the session at it; the fifth brief says so.
  - **A merge order matters when two PRs touch one file.** Part 7 merged before the shorter year and gave it a conflict in the clock loop. → When two open PRs share a file, tell the second one to merge `main` the moment the first lands.
  - **Reading a generated page before publishing cost about 60k of context** (the knowledge map's embedded data). → Have the helper split its data out, or read it in one pass only when it will be published.
  - **The owner's asks came faster than sessions finished.** Decisions 17 to 21 came within 45 minutes. → Record each at once in the coordinator's brief (the playbook's rule), and batch them into one docs PR.
