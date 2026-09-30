// The top bar: where you are (the level, and the place the camera has zoomed into as a breadcrumb step back out), the
// date and time with the air's temperature, the money, the carbon dial with the shop food's footprint beside it (a
// consumption figure, never added to the dial: the founding spec's two carbon numbers), and pause, a moon on it while a
// quiet night passes quickly (src/ui/quiet-night.ts). There are no speeds: the zoom sets the pace
// (docs/decisions/ADR-2026-09-30-zoom-is-the-speed.md). The
// temperature, the money, the dial and the footprint each show once they've unfolded
// (src/data/unfold.ts: the first frost on a crop, the first payday, sale or purchase, the first carbon choice), or all
// at once with "Show all details". Pause is a command through the sim like any other change to the game. The money
// and the dial open their Explain cards. On a phone pause leaves the bar for the map's corner (src/ui/App.tsx), and the
// breadcrumb keeps only its step back out and the place you're looking at.
// The money flashes once at the first sale (src/ui/moments.ts).
import {LEVELS, START, type Speed} from '../data/ladder';
import {shows} from '../data/unfold';
import {calendar} from '../sim/clock';
import {HOUSEHOLD} from '../sim/models/kitchen';
import {hourOf, type WeatherDay} from '../sim/models/weather';
import type {Snapshot} from '../sim/state';
import {clockTime, dayName, money, num} from './format';

/** kg CO₂e as a needle angle: log-scaled so a garden's few kg and a nation's millions both read, ±90° at the ends. */
const needle = (kg: number) => Math.sign(kg) * Math.min(1, Math.log10(1 + Math.abs(kg)) / 4) * 90;

/** The dial, and under its figure the shop food's footprint once that has unfolded: a bag and the kg CO₂e the household's
 *  shopping has carried since the start, beside the dial and never added to it. One button, so the bar keeps its row. */
function CarbonDial({kg, shop, onExplain}: {kg: number; shop: number | null; onExplain: () => void}) {
  const air = kg > 0 ? `${num(kg)} kg CO₂e put into the air` : kg < 0 ? `${num(-kg)} kg CO₂e taken out of the air` : 'No carbon put into the air yet';
  const label = shop === null ? air : `${air}; the shop’s food carried ${num(shop)} kg CO₂e more, never added to the dial`;
  return (
    <button type="button" class="dial plain" aria-label={`Carbon: ${label}. Explain`} title={label} onClick={onExplain}>
      <svg viewBox="-22 -22 44 26" aria-hidden="true">
        <path class="dial-sink" d="M -18 0 A 18 18 0 0 1 0 -18" />
        <path class="dial-source" d="M 0 -18 A 18 18 0 0 1 18 0" />
        <line class="dial-needle" x1="0" y1="0" x2="0" y2="-15" transform={`rotate(${needle(kg)})`} />
      </svg>
      <span class="dial-text">
        <span class="dial-kg">{kg > 0 ? '+' : kg < 0 ? '−' : ''}{num(Math.abs(kg))} kg<span class="dial-name"> CO₂e</span></span>
        {shop !== null && (
          <span class="dial-shop">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path class="bag" d="M 3 6 H 13 L 12 15 H 4 Z" />
              <path class="bag-handle" d="M 6 6 V 4 A 2 2 0 0 1 10 4 V 6" />
            </svg>
            {num(shop)} kg
          </span>
        )}
      </span>
    </button>
  );
}

/** Pause's other state: a paused game runs, a running one pauses. */
export const nextSpeed = (s: Speed): Speed => (s === 0 ? 1 : 0);

/** The snapshot the map is showing, its hour, the speed last set (which can be a step ahead of the map), and the place the
 *  camera has zoomed into, if any, with the step back out to the level's widest view. */
export function TopBar({snap, hours, speed, flash = false, quiet = false, place = null, onSpeed, onOut, onExplain}: {
  snap: Snapshot; hours: number; speed: Speed; flash?: boolean; quiet?: boolean; place?: string | null; onSpeed: (s: Speed) => void; onOut?: () => void;
  onExplain: (cause: string, at: string | null) => void;
}) {
  const d = calendar(hours), level = LEVELS[snap.level - 1]!;
  const day = snap.nodes.find((n) => n.kind === 'atmosphere')?.levers.weather as unknown as WeatherDay | null | undefined;
  const all = snap.settings.details === true, see = (k: string) => shows(snap.seen, k, all);
  // the quiet night's moon, a small badge on the pressed speed's corner so it takes no room in the bar
  const moon = quiet && (
    <span class="quiet-night" title="Quiet night: passing quickly">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M 10.5 2 A 6 6 0 1 0 14 11.5 A 5 5 0 0 1 10.5 2 Z" /></svg>
    </span>
  );
  const night = (on: boolean) => (quiet && on ? ', quiet night: passing quickly' : '');
  const temp = see('garden.weather') && day && day.day === d.dayIndex ? Math.round(hourOf(day, (hours + START.hour) % 24).temp) : null;
  return (
    <header class="topbar">
      <span class="level">
        {place ? (
          <>
            <button type="button" class="crumb-up plain" aria-label={`Out to the whole ${level.name.toLowerCase()}`} onClick={onOut}>
              <span aria-hidden="true" class="crumb-back">‹</span><span class="crumb-name">{level.name}</span>
            </button>
            <span class="crumb-sep" aria-hidden="true">›</span>
            <span class="crumb-here">{place}</span>
          </>
        ) : level.name}
      </span>
      <span class="date" data-hours={Math.floor(hours)}>
        <time>{dayName(d)}</time> <span class="time">{clockTime(d)}</span>
        {temp !== null && <span class="temp" title="Air temperature"> {temp < 0 ? '−' : ''}{Math.abs(temp)} °C</span>}
        {d.year > 1 && <span class="year"> · year {d.year}</span>}
      </span>
      {see('garden.money') && <button type="button" class={flash ? 'money plain flash' : 'money plain'} title="Money" aria-label={`Money: ${money(snap.money)}. Explain`} onClick={() => onExplain('money', 'gate')}>{money(snap.money)}</button>}
      {see('garden.carbon') && (
        <CarbonDial kg={snap.carbon} shop={see('household.footprint') ? snap.nodes.find((n) => n.id === HOUSEHOLD)?.stocks.carbon?.amount ?? 0 : null} onExplain={() => onExplain('carbon', 'heap')} />
      )}
      <span class="speeds">
        <button type="button" class="speed pause" aria-pressed={speed === 0} aria-label={`Pause${night(speed > 0)}`} onClick={() => onSpeed(nextSpeed(speed))}>
          <span aria-hidden="true">{speed === 0 ? '▶' : '❚❚'}</span>
          {moon}
        </button>
      </span>
    </header>
  );
}
