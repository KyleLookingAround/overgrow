# The UI and UX overhaul: one shell for every device, with a fullscreen mode

Issue: #64 · Status: Approved (the brief `docs/briefs/ui-overhaul.md` approves it in advance, decision 15) · PRs: #68

The page's shell designed as one thing: a clear hierarchy, one visual language from the tokens, and the map first on every device from a 320 px phone to an ultrawide screen. It changes how the game looks and handles, never what it does.

## What the player gets

The map is the biggest thing on every screen, the one thing to do next is the most obvious control, and the panel sits where a thumb or a mouse reaches it: a sheet on phones, a side panel on tablets and up. A fullscreen button where the browser has one, and "Add to Home Screen" on an iPhone opens the game without browser chrome.

## The audit of `main` (29 Sep 2026)

Seed 1 at days 1, 2, 120, 250 and 366, at the brief's 30 sizes in both schemes (`build/shots.mjs`, `build/sheet.mjs`, `build/contrast.mjs`; the before-and-after page is linked from the PR).

- **Hierarchy.** The level's name is the boldest thing on the page and the goal bar the smallest. The tabs, the sheet's "Hide", "Buy" and the card's buttons are all the same chip, so nothing says which is the next action. In the Shed the name, the price, "Saves:" and "But:" are four lines of the same grey.
- **Crowding.** At 320 px the top bar wraps to two rows (81 px) and at 390 px once the temperature and the dial have unfolded (99 px): a fifth of the map's height. The sheet's head (tabs and "Hide") is a 56 px row over a 203 px body at 320 × 568.
- **What hides the map.** On a phone the Explain card covers the whole map (0 % clear at 320 × 568, 4 % at 390 × 844), so the pulse at the place it explains is under the card. A notice with an action is wider than the map (416 px at 320 and 390 px: it starts at −48 px and its words are cut at both ends), and it sits over the top row of beds where the badges are. The "try faster" nudge stays over the map for as long as the player plays at 1×, and hides the goal bar for that long.
- **Thumb reach.** The speeds and pause are in the top right corner, the tabs mid-screen, and the goal bar just above the sheet: only the last is in reach one-handed.
- **Large screens.** From 1920 px up the panel is a 360 px column of 13.6 px grey text beside 1,500 to 3,000 px of lawn; the notice floats in the middle of it. Nothing steps up with the screen.
- **Type.** Three sizes (16, 13.6 and 12 px) and no scale: card titles, section headings and place names are all the same 16 px bold; most of the panel is the 13.6 px grey.
- **Contrast.** Every text pair passes AA (the worst is `--soft` on `--bg` at 4.94 light). Control borders fail 1.4.11: `--line` on the panel is 1.48 light and 1.33 dark, so unpressed tabs and buttons are ghosts, worse in the dark scheme. Numbers' dotted underline is the same faint grey.
- **Tap targets.** The floor is 40 px; the brief asks 44 px on touch. Checkboxes are 20 px.
- **Landscape phones.** Right: the panel is beside the map at 40 %, and at 844 × 390 the four speeds show. Wrong: the first card and the Explain card cover the whole map, and a place's rows wrap into two lines each at 227 px.
- **Safe areas.** The page's padding and the top bar keep them; the sheet's head and the goal bar don't name the bottom inset, and the notices don't name the top one in a landscape phone's notch column.
- **Competition.** The goal bar hides under any notice; the bed card, the week's decision and the nudge are all notices at the top of the map while cards open at the bottom; at 320 px a card, a notice and the sheet's head leave no map.
- **Fine as it is.** No overflow or errors at any size; the dark map; the focus ring; keyboard use; one card at a time.

## Mobile first

The owner's addition (23:18): phone portrait first, the other classes derived from it. Everything a player does often is in the bottom half of a phone's screen: the tabs in the sheet's head, the goal bar's button and the folded speed button at the map's foot, a card's answers in its foot. Nothing that matters sits behind the notch or the home indicator: the top bar pads the top inset, the sheet's foot the bottom. The sheet's heights are peek, half and tall, tapped through by its button (a drag by the handle is left for a later round); the map stays visible and usable at peek. The sheet scrolls inside itself with `overscroll-behavior: contain`, and the canvas takes `touch-action: none`, so neither drags the page. Body text is 16 px, so iOS never zooms on focus; targets are 44 px with 4 px between them; every control has a pressed state; nothing is hover-only. On a phone on its side the map takes the height and the panel is a narrow column beside it under one slim bar. The throttled phone frame is measured against `main` in the PR. The PR's screenshots lead with the phones. The fourth playtest's findings (the goal bar's verb wrapping on desktop; a flood of "New:" signs; the plan's repeated extras; the Shed as a wall of "£X more") are answered here by the goal bar's grid, one notice at a time with its count, and the Shed's order; the plan's extras and the rules for what the goal bar says are round four's.

## Presenting a lot of information

The owner's addition (23:55). The game carries a lot of numbers, so each surface shows one headline, then a glance, then the detail on demand, and the patterns are general so every level uses them:

- **Stat.** One number, large and tabular, with its unit and a plain-word label after it (`.headline`: the gardener's hours left, the share of the day's ask met, a plot's output a day). Built here; used by the Garden, the Kitchen and the allotment's plot.
- **Stat with a trend.** The same with a direction and a comparison ("↑ 12 % on last week", "£18 to go"). The allotment's Health carries its arrow; the sparkline behind it (the purse, output and soil over the last weeks, a few lines of SVG in token colours) is left for round four with the rules on what the goal bar says.
- **Node card.** A place's or plot's section: its name, one line, its rows (label left, tabular value right, each opening its Explain card) and what happened there lately. The garden's places and the allotment's "Your plot".
- **Node list.** The chips of the garden's places, and the allotment's plot rows with their holder and two numbers; a sortable header is round four's when the list needs it.
- **Legend.** What the map's tints mean, once a level has tints to explain (the garden has none).
- **Layers.** Each tab leads with its Stat; the supporting numbers come next, grouped by what a player decides (the plan, the pests, the shop) rather than by the sim's structure; the full breakdown sits behind a tap (a place's rows, the Explain card). Nothing important is only in the deepest layer, and on a phone at the sheet's half height the headline is above the fold. Long lists collapse to the few that matter now: the Shed leads with the next thing to save for, then what's affordable, and a `<details>` line holds the rest.
- **Numbers people can read.** One formatter (`src/ui/format.ts`), tabular figures everywhere, the unit kept to its number by a narrow no-break space, a plain-word label before any jargon.
- **Show, don't list.** The map first: tints, badges and small labels on beds and plots, with the panel as the detail. Meters for moisture and the day's hours, rings and bars for goals. Stacked bars for eaten, sold, preserved and wasted are left for round four.

## The mechanism

None: the page's shell. The rules it keeps are the UI record's (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`); the ones it changes are in `docs/decisions/ADR-2026-09-29-ui-overhaul.md`.

## Where it sits on the ladder

The shell of level 1 and of every level after it. A level's panel is made of three things, so the allotment's twelve plots and a map of regions use the same shell: a **node card** (today the place's section: its name, one line, its rows and its last week), a **node list** (today the places' chips: a list of tiles at the region level) and a **legend** (what the map's tints mean; the garden has none yet). The tabs belong to the level (the garden's Garden, Shed and Kitchen). Nothing carries up: no flows.

## What they see

### The layout, by device class

The class is chosen by screen width and orientation only (the sheet or the side panel); everything inside steps by its own container's width (rule 4).

| Class | Sizes | Layout | Map floor |
| --- | --- | --- | --- |
| Phone portrait | width < 700 px | top bar (one row, at most 60 px), the map, the sheet | 42 % of the screen with the sheet at rest |
| Phone landscape | height ≤ 500 px and width ≥ 500 px | top bar (one row), the map, a side panel at 36 % (220 px at least) | 50 % |
| Tablet portrait | 700 to 1023 px wide, portrait | top bar, the map, the sheet (its content capped at 40 rem and centred) | 50 % |
| Tablet landscape and laptop | 700 px and up otherwise, under 1920 px | top bar, the map, a side panel of 360 px | 60 % |
| Large desktop | 1920 to 2559 px | side panel 400 px; the map grows | 70 % |
| Ultrawide | 2560 px and up | side panel 440 px, its text still 16 px in a 40 rem column | 78 % |

- **The sheet** (phones and portrait tablets) has three resting heights, all in CSS (rule 9): *peek* (its head only: the grabber and the tabs), *half* (the default, 44 % of the screen) and *tall* (78 %, always leaving 160 px of map: for the plan and the Shed). Its button cycles them and names the next state; a tab tap opens a folded sheet; a card over the map folds it to its head while the card is up, and the button and tabs say so. Its foot keeps the bottom safe area, folded or not.
- **The side panel** scrolls inside itself; its head is the tabs. The map takes the rest.
- **The top bar** keeps its parts (the level, the date and time with the temperature, the money, the dial, the speeds) and its container steps (the temperature goes below 600 px, the speeds fold below 700 px now that they're 44 px each); it becomes one 48 px row on phones by giving the level and the date one line at the small size. The speeds are the last part on the right, as a segmented control.
- **Thumb reach on phones.** The goal bar sits at the foot of the map, just above the sheet, and the folded speed button beside it at the map's bottom right corner, both in the map's chrome. The tabs are the sheet's head. Nothing the player taps often is at the top.
- **Fullscreen.** A round button at the map's top right corner (map chrome, like a map's own controls), shown only where `document.fullscreenEnabled` is true and the page isn't already an installed app without chrome (hidden, never greyed). It toggles fullscreen on the page, is pressed while in it, and Esc leaves it as the browser does. The layout is the same in and out; a viewport change re-fits the map. On a phone the notices keep clear of it.

### How the chrome shares the screen

Over the map, from the bottom: the badges and the small rewards (taps go through around them); the goal bar at the foot; the notices at the top; one card. Cards, notices and the goal bar never sit over the thing they talk about:

- **One card at a time** (win W5), docked *away from its place*: the map says whether the place the card is about is in its upper or lower half and docks the card at the other end. A card with no place (the first plan, the year) docks at the bottom. A card takes at most 50 % of a wide map's height and 60 % of a phone's, where it also folds the sheet to its head so the map grows under it; the pulse at the place stays in view unless the place straddles the middle. No notice shows while a card is up; the notices' clocks start again when it closes. On a phone the speed pill moves to the map's top corner under a bottom-docked card, so the clock can always be paused.
- **Notices** are one line at the top of the map, never wider than the map (a bug fixed), wrapping to two lines on touch rather than clipping (rule 11), with their action and close inside the line. A notice about a place is the same. The queue is unchanged: one at a time, with the count waiting.
- **The goal bar** stays while a notice shows (the two never overlap: the notice is at the top, the bar at the foot) and gives way only to a card. A rule change, recorded in the decision. Its button is the one accent button on the map: the obvious next action.
- **The Explain card** keeps its words and sources. Its layout is the card's: kicker, title, what happened, where, "What helps" and "How" as two rows, and the source in the foot.

### The panel's tabs

- **Garden** leads with one headline number: the gardener's hours left today (the meter and the figure, large), then the job in hand, then the plan and the places.
- **Shed** reads as a shop: the purse and "Saving for" at the top as one line with a meter, then each offer as a row: the name and the price on one line (the price tabular, right), what it does under it, and "Saves" and "But" as two short rows; the Buy button on the right or "£x more" in its place. The next thing to save for is the first row.
- **Kitchen** leads with the day's ask and how much of it the garden met (one figure), then the groups, the week and the totals.
- **Empty states** say what to do: "Tap a place on the map, or pick one here" (the places), "Nothing yet: the first pick goes here" (the kitchen), "Nothing to buy yet: the shed fills as the garden needs things" (the shed).

### One visual language (tokens)

All in `src/ui/styles/tokens.css`; nothing else declares a colour or a size.

- **Type scale:** `--text-xs` 12 px (labels only, never a sentence), `--text-sm` 14 px, `--text` 16 px (text, and a section's heading in bold), `--text-lg` 18 px (the Explain card's line), `--text-xl` 22 px (card titles), `--text-2xl` 28 px (the headline numbers). Line height 1.2 for headings, 1.45 for text. Every number is `font-variant-numeric: tabular-nums` and its unit follows it in the same run (`src/ui/format.ts`), a small space before the unit.
- **Spacing:** a 4 px scale: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32.
- **Radii:** `--r-sm` 6 px (chips, inputs), `--r` 10 px (cards, buttons), `--r-lg` 16 px (the sheet's top corners), `--r-pill` 999 px (the goal bar, the notices).
- **Elevation:** `--shadow-1` (the sheet), `--shadow-2` (cards, the goal bar and the map's buttons), `--shadow-3` (a notice). Every other size a rule needs (an icon, a checkbox, a label's tracking and lift, a list's label column, a card's rise) is a token too.
- **Colour roles**, light and dark: `--bg` (the page), `--surface` (the panel, cards), `--surface-2` (an empty state's box, a pressed control), `--ink`, `--soft`, `--line` (hairlines), `--line-strong` (a control's border, at least 3:1 on the surface), `--accent`, `--accent-ink`, `--accent-soft` (the Shed's marked offer), `--warn` (kept for a warning, unused yet), `--focus` (with a halo of surface under it on the map's chrome), `--sink` and `--source` (the dial), `--notice-bg` and `--notice-ink`. The map's `--map-*` tokens are untouched. Contrast: every text role at least 4.5:1 on its surface and every control border at least 3:1, in both schemes, and the dark scheme is the light one's equal (the same roles, no missing states).
- **Controls:** one button style (`--line-strong` border, `--r`), one primary (accent), one quiet (no border: a number, the money, the dial), one chip (a tab, a place); pressed and selected states share `--accent` and `--accent-soft`. Every tap gives feedback: `:active` presses the control (a 3 % scale) and a selected state changes at once.

### Motion

- The sheet's height (between half and tall), a card's and a notice's entrance (a fade and an 8 px rise), a tab's content (a fade) and a pressed control, each 160 ms `ease-out`, never longer than 200 ms.
- `prefers-reduced-motion: reduce`: stills, as the map already does. Nothing waits on a transition.

### Input

- Touch, mouse and keyboard all work; the focus ring stays (`--focus`, 3 px). Every hover-only affordance has a touch equivalent: the prize's words open with the goal bar; the dial's and money's titles are their Explain cards.
- Tap targets: 44 px on touch (`(pointer: coarse)`), 40 px otherwise. Checkboxes 24 px inside a 44 px label row.
- The map's canvas takes `touch-action: none`, so a pinch or a drag on it never scrolls the page (the page never scrolls; only the panel does).

### The fullscreen mode and the home screen

- The Fullscreen API on `document.documentElement`, from the map's button; `fullscreenchange` keeps the button's state true; Esc leaves.
- iPhone Safari has no page fullscreen: `public/manifest.webmanifest` (`name`, `short_name`, `start_url: "./"`, `scope: "./"`, `display: "fullscreen"` with `standalone` behind it, `background_color`, `theme_color`, icons) and the Apple meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: default`, so the clock stays readable over the light top bar, `apple-mobile-web-app-title`, `apple-touch-icon`). Added to the home screen, the game opens without chrome and `viewport-fit=cover` with the safe-area tokens keeps its edges clear: the top bar pads the top, the sheet's foot (or the map's chrome beside a side panel) the bottom, the page the sides.
- **Icons:** `public/icon.svg` drawn from the game's palette (a dug bed with two rows of leaves on the lawn's green, the style of the map), and `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `apple-touch-icon.png` (180 px) rendered from it by `tools/icons.mjs`. Not in the page's bundle.
- No service worker, no offline mode.

## How it works

- No rules of the game change. Fullscreen is a view setting the page reads from the browser each time; nothing is saved.
- Everything unfolds as before. The fullscreen button shows from the start where the API exists.

## Saved state

None.

## Balance

None: `PLAY` identical on seeds 1–3 against `main`.

## Checks

- `layout` extends to the whole device list, phones and tablets with `isMobile`, `hasTouch` and a device scale factor of 2 or 3: no overflow, every part inside the viewport, every tap target 44 px on touch, the map's share above the class's floor, the sheet's three heights, the notice inside the map, a card docked away from its place, and fullscreen in and out where the API exists. One page per size (rule: keep groups cheap).
- `build` checks the manifest, its fields, the icons and the Apple meta tags are in the built page. The safe-area check only reads the stylesheet; a real iPhone confirms the insets.
- A WebKit smoke pass at 390 × 844 and 1024 × 1366 if Playwright's WebKit runs here; if not, the PR says so and lists what only a real iPhone or iPad can confirm (the home-screen install, `black-translucent`, the notch's insets).
- What to look at: the before-and-after page at a phone, a landscape phone, a tablet, a laptop and an ultrawide in both schemes.

## Files

`src/ui/styles/tokens.css` and `page.css`; `src/ui/App.tsx`, `MapView.tsx`, `Panel.tsx`, `ShedTab.tsx`, `KitchenTab.tsx`, `GardenTab.tsx`, `format.ts`; `src/ui/Fullscreen.tsx` (new); `index.html`; `public/manifest.webmanifest` and the icons (new), rendered by `tools/icons.mjs`; `tools/check.mjs` (a device scale factor) and `tools/checks/layout.mjs`, `build.mjs`, `garden.mjs`, `shed.mjs`, `explain.mjs`; the notes. `TopBar.tsx` only once `feature/shorter-garden-year` is in `main`: its own comment still says the speeds fold into one button in the bar, which on a sheet layout now moves to the map's foot.

## Left out

The service worker and offline play; keyboard shortcuts (W16); records and stamps; a legend for the garden (it has no tints to explain yet); the page's own settings card; any change to what the map draws.
