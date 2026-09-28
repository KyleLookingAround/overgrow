/* ===== The seeded random generator: rnd() for anything that can change the game ===== */
// mulberry32, seeded from window.__seed (the checks and the bot set it) or the clock. The only file allowed Math.random().
let seed=(typeof window!=='undefined'&&window.__seed)|0||(Date.now()^(Math.random()*1e9))>>>0;
function rnd(){seed=(seed+0x6D2B79F5)|0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
