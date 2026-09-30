# A beautiful map: the garden's art pass

Issue: #71 · Status: Approved (the owner's brief, `docs/briefs/map-art.md`, approves it in advance) · PRs: #72

## What the player gets

A garden they can read at a glance. The ground looks like ground, the soil like soil, the plants like the crop they are at the stage they're at, and the light like the hour and the season. Nothing new to do: every impact the sim already has is easier to see (a wilting bed, a soaked path, a steaming heap, a sparse winter). The same kit draws the allotment's plots and every level above.

## The mechanism

There is no new mechanism: this is how the sim's existing state is drawn. What each drawing follows is named beside it below, and each is the same effect the Explain card names (`docs/systems/explain.md`). Two cosmetic timings are taken from the calendar and the weather alone, as the day length already is (`src/ui/map/daylight.ts`): the fallen leaves lie from mid-October to November (the leaves card's season, `leavesOpen()`), and rain is drawn as snow while the air is at or below 1 °C (the Met Office's rule of thumb for the boundary).

## Where it sits on the ladder

Level 1's map, and the style kit (`src/ui/map/kit.ts`, `src/ui/map/plants.ts`) every level's map draws with: each piece takes a rectangle in pixels and a scale in pixels per metre, so a plot at the allotment or a field at the smallholding is the same ground, tints and shadows drawn smaller. A sealed node's tile uses the same pieces.

## The palette

Every colour is a `--map-*` token in `src/ui/styles/tokens.css`, light and dark. The light scheme is a bright afternoon; the dark scheme is the same garden a stop darker and less saturated, never grey. Light comes from the top left: every raised thing casts a soft shadow down and to the right (`--map-shadow`, offset 0.06 × 0.09 m), and its lit side is up and left.

| Role | Tokens | Light | Dark |
| --- | --- | --- | --- |
| The hedge around the garden | `edge`, `hedge-leaf` | mid green, darker leaf dabs | dusk green |
| The lawn | `lawn`, `lawn-stripe`, `lawn-tuft`, `lawn-wet` | fresh green, a paler mowing stripe, darker tufts, a wet darkening | deeper green |
| Dug soil | `bed-dug`, `bed-wet`, `bed-dry`, `soil-rim`, `tilth` | warm brown, dark when wet, pale when dry; a darker rim; dark crumbs | the same, darker |
| Paths | `path`, `path-edge`, `pebble`, `puddle` | warm gravel, a darker edge, pale pebbles, a blue-grey puddle | the same, dimmer |
| The house | `house`, `house-edge`, `door`, `window`, `step` | cream render, the eave's shadow, a green door, a pale window, a stone step | the same, dimmer |
| The fence and the shed | `fence`, `fence-post`, `shed`, `shed-roof`, `roof-lit` | timber panels and posts; the shed's two roof slopes, one lit | darker timber |
| Water and kit | `butt`, `butt-rim`, `water`, `tap`, `tank`, `heap`, `heap-rim`, `heap-crumb` | as today, with a rim highlight on the butt and crumbs on the heap | as today |
| Leaves | `leaf`, `leaf-light`, `leaf-dark`, `leaf-ripe`, `sheen`, `seedling`, `cane` | three greens, a fuller green when ready, a pale sheen, a seedling's pale green, a cane's tan | the same |
| Stress | `wilt`, `blackened`, `blight` | yellow, near black, brown | the same |
| Light | `night`, `dawn`, `night-max`, `dawn-max` | a blue night at most 0.35, a warm amber at most 0.16 at twilight | the same |
| Weather and seasons | `frost`, `frost-max`, `rain`, `snow`, `autumn-leaf`, `autumn-leaf-2`, `blossom` | rime, drops, flakes, two leaf browns, a pale pink | the same |
| Life and delights | `person`, `person-2`, `skin`, `hat`, `foot`, `wing`, `eye`, `butterfly`, `robin`, `robin-breast`, `steam` | the gardener in blue, the household in rust; feet, wings, eyes; a butterfly, a robin, steam | the same |

Readability first: the beds' tints and the badges that carry information (the UI overhaul's, #68) stay clear. Nothing here restyles them; the tints share the same tokens.

## How each thing is drawn

- **Ground.** The lawn is a flat green with mowing stripes (bands 0.6 m wide, alternate ones a paler overlay) and a sparse scatter of tufts (seeded from the game's seed), drawn once into the ground layer. Wet, it darkens a little with the surface film. A hedge of leaf dabs runs round the outside. A fence of timber panels with posts every 1.8 m runs along the left, right and bottom of the lawn, with a gap at the side gate by the honesty box.
- **Soil.** A dug bed is rounded soil with a darker rim inside its edge (the dug edge), crumbs of tilth over it (a static layer above the soil's colour, so the colour changes under them), and its soft shadow. The colour follows the water balance as today (`wetness()`, `surfaceWet()`).
- **Paths.** Warm gravel with a darker soft edge and a few pale pebbles. Puddles (blue-grey ellipses) appear on the path while rain lies on the surface and dry over the three hours after.
- **The house.** A rendered wall along the top with the eave's shadow at its foot, a back door in the middle with a stone step, and two windows. The tank, the tap and the butt stand against it as today.
- **Structures.** The shed's roof has two slopes with a ridge, the left one lit; the heap has a timber rim and crumbs; the butt has a rim highlight; the hen house, the greenhouse, the cage and the raised beds keep their drawings with the shared shadow.
- **Plants** (`src/ui/map/plants.ts`). Each crop has a silhouette: a rosette (salad, lettuce, winter salad, kale, radish), an upright fan of blades (leeks, garlic, onions), a bush (potatoes, broad beans), a climber on a cane (beans, tomatoes), a flowering rosette (marigolds) or a fine sward (green manure). Stages: drills when sown; two seed leaves as a seedling (the first quarter of its growth); the silhouette growing to its size; a fuller green and a small pale sheen when ready to pick, with its produce showing (tomatoes, radishes, pods) as today. Stress shows as today, with more of it: leaves go towards `wilt` and shrink as the water stress coefficient falls, and towards yellow when short of nitrogen (the crop's nitrogen limit); frost blackens; blight browns; pests bite. Plants are redrawn once a snapshot, not every frame.
- **Light.** The night layer follows the sun as today. A warm layer (`dawn`) peaks at sunrise and sunset and fades within the hour of twilight either side. The quiet-night dim from the shorter garden year stacks on the night layer.
- **Weather.** Rain falls as today; when the air is at or below 1 °C the same particles are drawn as flakes, falling slower. Frost lies over the lawn as a rime and rimes the beds' rims, the shed's roof and the kit's edges. Fallen leaves lie on the lawn from mid-October to November, more each week, gone once raked (the leaves card answered with "rake") or with December.
- **Seasons.** Blossom on the cordons in April (pale pink dots on each cordon planted), berries as today from July.
- **Life.** The gardener and the household are drawn from an atlas of three frames (standing, left foot forward, right foot forward), switching with the distance walked, and bob a little on the move; the household wears rust, the gardener blue with a hat. Slugs have eye stalks; bees have wings; ladybirds have a head; hens have a tail and step in a two-frame walk. All as before from the sim's activities and populations.
- **Delights.** A butterfly over the flowers in June to August; a robin on the fence on a winter day; steam off the heap on a cold morning while it holds fresh waste; the box's coin as today. Each cheap, rare and never over a badge.
- **Reduced motion.** Every animation takes its time from the tick's hour, so it stands still between ticks.

## Before and after

`docs/specs/map-art/before.png` and `after.png`: the same seeded scene (seed 1, 18 July, 13:00, 1440 × 900, light) from `main` and from this PR.

## Saved state

None. Nothing drawn is saved.

## Balance

None: `PLAY` is identical on seeds 1–3 against `main`.

## Checks

The `scene` check keeps its assertions and gains: each dug bed's crop is drawn with a silhouette of its kind (the stats name the shape drawn), the dawn layer is up at sunrise and down at midday, and puddles show in the rain and not on a dry afternoon. Its screenshots are looked at at every size and scheme.

## Files

`src/ui/map/kit.ts` and `src/ui/map/plants.ts` (new), `src/ui/map/draw.ts`, `life.ts`, `daylight.ts`, `palette.ts`, `renderer.ts`, `src/ui/styles/tokens.css`, `tools/checks/scene.mjs`, `docs/systems/map.md`.

## Left out

The page's layout and the information on it (the UI overhaul, #68); the allotment's content (part 7), which moves onto this kit; sound; snow as a model of its own; a zoom.
