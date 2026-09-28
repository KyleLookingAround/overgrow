# Placeholder page

Until the first slice, the page says "Overgrow" and proves the pieces fit: `src/sim/index.ts` is a seeded clock (with `src/sim/random.ts`, the generator every later system draws from), `src/app/sim.worker.ts` runs it in a Web Worker and `src/app/sim-client.ts` is the page's end of it, `src/ui/App.tsx` mounts the panel and `src/ui/MapCanvas.tsx` the canvas, and `src/ui/styles/tokens.css` holds every colour and size. The first slice replaces this file with its own systems' notes.
