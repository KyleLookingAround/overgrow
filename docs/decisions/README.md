# Decision records

Short records of decisions that shape the code or the way of working, so later changes know what they must keep and why.

- One decision per file: `ADR-YYYY-MM-DD-short-slug.md`, dated the day it was made, with **Status**, **Context**, **Options Considered**, **Decision** and **Consequences**.
- A record is approved when the PR that adds it is merged. Until then it's a proposal.
- Don't rewrite an approved record. To change course, add a new one and mark the old one `Superseded` with a link to its replacement.
- Write one when a change sets a rule other changes must follow, rules out an obvious alternative, or would surprise someone reading the code later.

The list is joined from the files here by `node tools/join.mjs` (`npm run build` runs it): add a record by adding its file, never a row.

<!-- joined:decisions from the ADR files here by tools/join.mjs: don't edit between these lines -->
| Record | Decision |
| --- | --- |
| [ADR-2026-09-28-one-file-per-entry](ADR-2026-09-28-one-file-per-entry.md) | One file per entry, joined lists, and Catch up |
| [ADR-2026-09-28-real-mechanisms-rough-numbers](ADR-2026-09-28-real-mechanisms-rough-numbers.md) | Real mechanisms, rough numbers |
| [ADR-2026-09-28-runbook-from-final-call](ADR-2026-09-28-runbook-from-final-call.md) | The runbook comes from Final Call, trimmed to an empty game |
| [ADR-2026-09-28-scale-free-graph](ADR-2026-09-28-scale-free-graph.md) | One scale-free graph of nodes and flows, simulated in a worker |
| [ADR-2026-09-28-seeded-randomness](ADR-2026-09-28-seeded-randomness.md) | A seeded random generator and a headless simulation from the first line |
| [ADR-2026-09-28-static-site-typescript](ADR-2026-09-28-static-site-typescript.md) | A static site built with Vite from TypeScript, with three runtime dependencies |
| [ADR-2026-09-28-webgl-map](ADR-2026-09-28-webgl-map.md) | The map is drawn with WebGL (PixiJS) from the start |
| [ADR-2026-09-29-born-small-grows-up](ADR-2026-09-29-born-small-grows-up.md) | Every mechanic is born small, grows up the ladder, and unfolds with influence |
| [ADR-2026-09-29-garden-reliability](ADR-2026-09-29-garden-reliability.md) | The garden's offer measures Reliability as the household fed, week by week |
| [ADR-2026-09-29-no-save-compatibility-before-release](ADR-2026-09-29-no-save-compatibility-before-release.md) | No save compatibility before the first release |
| [ADR-2026-09-29-strategic-and-long](ADR-2026-09-29-strategic-and-long.md) | The game is strategic and long, and each level lasts long enough for its slowest lever to pay back |
| [ADR-2026-09-29-ui-from-final-call](ADR-2026-09-29-ui-from-final-call.md) | The UI and multi-device rules Overgrow takes from Final Call |
| [ADR-2026-09-29-unfolding](ADR-2026-09-29-unfolding.md) | Instruments unfold as the player gains influence, from one table, gated in the sim |
<!-- /joined:decisions -->
