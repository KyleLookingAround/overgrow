# ADR-2026-09-29: The shell's rules from the UI overhaul

## Status

Accepted when the PR that adds it merges (the brief `docs/briefs/ui-overhaul.md`, the spec `docs/specs/ui-overhaul.md`). It adds to `ADR-2026-09-29-ui-from-final-call.md` and replaces three of that record's numbers; the rest of that record stands.

## Context

Six parts each added their piece to the page and the `layout` check kept each inside the viewport, but the whole was never designed as one. The audit of `main` at thirty sizes (the spec) found the goal bar hidden by the "try faster" nudge for as long as a player stays at 1×, the Explain card covering the place it explains on every phone, a notice wider than the map, control borders under 3:1, and no type scale.

## Options Considered

### Option 1: Fix each finding where it is
**Pros:** small diffs. **Cons:** the next part adds its piece the same way; the audit is repeated after every part.

### Option 2: One set of rules for the shell, in the tokens and the checks (chosen)
**Pros:** every later level's panels, cards and notices inherit them; the `layout` check holds them at every size. **Cons:** a large PR that touches every component's styling.

## Decision

Option 2. The rules, each held by the `layout` check:

1. **Touch targets are 44 px on touch and 40 px otherwise** (`--touch` under `(pointer: coarse)`). Replaces rule 10 of the UI record.
2. **A card docks away from its place.** The map says which half the card's place is in and the card docks at the other end; a card with no place docks at the bottom. On a phone a card takes at most 60 % of the map's height. Cards, notices and the goal bar never sit over the thing they talk about.
3. **The goal bar gives way to a card, not to a notice.** A notice is one line at the top of the map and the bar is at its foot; they never overlap. The bar is the next action and stays in reach. Replaces the "gives way to any card or notice" line of `docs/systems/unfolding.md`.
4. **A notice is never wider than the map,** and wraps to two lines on touch rather than clipping (the record's rule 11 applied to notices).
5. **Control borders reach 3:1** (`--line-strong`) in both schemes; hairlines (`--line`) stay decorative. Text roles reach 4.5:1. The dark scheme has every role the light one has.
6. **One type scale and one spacing scale** in the tokens; no component declares a size of its own.
7. **The sheet has three resting heights in CSS** (peek, half, tall), never from JavaScript (the record's rule 9 kept).
8. **Map chrome is the map's:** the fullscreen button and, on phones, the folded speed button sit at the map's corners with the goal bar, and let taps through around them (rule 7 kept).
9. **The map's share of the screen has a floor per device class** (the spec's table), checked at every size in the brief's list.
10. **The page is installable:** a manifest and the Apple meta tags, with icons from the game's palette. No service worker until a later part decides one.

## Consequences

- `docs/systems/map.md` describes the shell by these rules; `docs/systems/unfolding.md` says the goal bar yields to a card only.
- A part that adds a panel, card or notice uses the tokens' scales and roles and the `Card` component; the `layout` check fails it otherwise at the sizes it breaks.
- The UI record's rules 9, 10 and 11 read with this record's 1, 4 and 7.
