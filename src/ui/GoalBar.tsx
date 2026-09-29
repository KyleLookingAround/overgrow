// The goal bar (the founding spec, "What makes the jump feel earned"; win W18): one slim line at the foot of the map with
// a progress ring, the one thing to do as a verb, and the prize as an icon (a plot at the allotment). Tapping it opens the
// three requirements in plain words (how well the garden fed the household, how steadily, the soil), each with its
// meter and its value against the target (src/ui/goal.ts). Before the first harvest the ring is the first crop's growth.
// It gives way to any card or notice over the map (win W5).
import {useState} from 'preact/hooks';
import type {Snapshot} from '../sim/state';
import {goalLine, PLAIN, PRIZE, PRIZE_SHORT, valueText} from './goal';

/** The ring: a circle's stroke filled to a share, drawn with the tokens' colours (page.css). */
function Ring({value}: {value: number}) {
  const r = 9, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg class="goal-ring" viewBox="0 0 24 24" aria-hidden="true">
      <circle class="goal-ring-track" cx="12" cy="12" r={r} />
      <circle class="goal-ring-fill" cx="12" cy="12" r={r} stroke-dasharray={`${c * v} ${c}`} transform="rotate(-90 12 12)" />
    </svg>
  );
}

/** The prize's icon: a plot with its rows, beside its few words. */
function Prize() {
  return (
    <span class="goal-prize" title={PRIZE}>
      <svg class="goal-prize-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M6 9h12M6 12h12M6 15h12" />
      </svg>
      <span class="goal-prize-text">{PRIZE_SHORT}</span>
    </span>
  );
}

export function GoalBar({snap}: {snap: Snapshot}) {
  const [open, setOpen] = useState(false);
  const g = goalLine(snap), pct = Math.round(100 * g.ring);
  return (
    <section class={open ? 'goal-bar open' : 'goal-bar'} aria-label="The goal">
      <button type="button" class="goal-open" aria-expanded={open} aria-controls="goal-rows" onClick={() => setOpen(!open)}
        aria-label={`${g.verb}. ${pct} % of the way to ${PRIZE_SHORT.toLowerCase()}. ${open ? 'Close' : 'Open'} the three requirements.`}>
        <Ring value={g.ring} />
        <span class="goal-text" data-text={g.text}>{g.verb}</span>
        <Prize />
      </button>
      {open && (
        <div class="goal-rows" id="goal-rows">
          <p class="soft goal-why">{g.rows ? 'The committee looks at the garden’s whole year, from its first day:' : g.text}</p>
          {g.rows?.map((r) => (
            <div class={r.met ? 'goal-row met' : 'goal-row'} data-key={r.key} key={r.key}>
              <span class="goal-row-name">{PLAIN[r.key]}</span>
              <meter min={0} max={1} value={Math.min(1, r.progress)} aria-label={valueText(r)} />
              <span class="goal-row-value soft">{valueText(r)}{r.met ? ', met' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
