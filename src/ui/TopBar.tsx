// The top bar: the level, the date and time with the air's temperature, the money, the carbon dial, and pause with the
// three speeds. The temperature, the money and the dial each show once they've unfolded (src/data/unfold.ts: the first
// frost on a crop, the first sale or purchase, the first carbon choice), or all at once with "Show all details". The speed is a command through the sim like any other change to the game. The money and the dial open
// their Explain cards. When the bar is narrow (a container query on its own width, the owner's wins W2 and W11) the four
// speeds fold into one button that shows the speed and cycles it, a tap on a paused game resuming it.
import {LEVELS, SPEEDS, START, type Speed} from '../data/ladder';
import {shows} from '../data/unfold';
import {calendar} from '../sim/clock';
import {hourOf, type WeatherDay} from '../sim/models/weather';
import type {Snapshot} from '../sim/state';
import {clockTime, dayName, money, num} from './format';

/** kg CO₂e as a needle angle: log-scaled so a garden's few kg and a nation's millions both read, ±90° at the ends. */
const needle = (kg: number) => Math.sign(kg) * Math.min(1, Math.log10(1 + Math.abs(kg)) / 4) * 90;

function CarbonDial({kg, onExplain}: {kg: number; onExplain: () => void}) {
  const label = kg > 0 ? `${num(kg)} kg CO₂e put into the air` : kg < 0 ? `${num(-kg)} kg CO₂e taken out of the air` : 'No carbon put into the air yet';
  return (
    <button type="button" class="dial plain" aria-label={`Carbon: ${label}. Explain`} title={label} onClick={onExplain}>
      <svg viewBox="-22 -22 44 26" aria-hidden="true">
        <path class="dial-sink" d="M -18 0 A 18 18 0 0 1 0 -18" />
        <path class="dial-source" d="M 0 -18 A 18 18 0 0 1 18 0" />
        <line class="dial-needle" x1="0" y1="0" x2="0" y2="-15" transform={`rotate(${needle(kg)})`} />
      </svg>
      <span class="dial-kg">{kg > 0 ? '+' : kg < 0 ? '−' : ''}{num(Math.abs(kg))} kg</span>
    </button>
  );
}

const SPEED_LABEL: Record<Speed, string> = {0: 'Pause', 1: '1×', 2: '2×', 4: '4×'};
/** The folded speed button's next speed: pause to 1× (a tap resumes), then up through the speeds and back to pause. */
export const nextSpeed = (s: Speed): Speed => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!;

/** The snapshot the map is showing, its hour, and the speed last set (which can be a step ahead of the map). */
export function TopBar({snap, hours, speed, onSpeed, onExplain}: {snap: Snapshot; hours: number; speed: Speed; onSpeed: (s: Speed) => void; onExplain: (cause: string, at: string | null) => void}) {
  const d = calendar(hours), level = LEVELS[snap.level - 1]!;
  const day = snap.nodes.find((n) => n.kind === 'atmosphere')?.levers.weather as unknown as WeatherDay | null | undefined;
  const all = snap.settings.details === true, see = (k: string) => shows(snap.seen, k, all);
  const temp = see('garden.weather') && day && day.day === d.dayIndex ? Math.round(hourOf(day, (hours + START.hour) % 24).temp) : null;
  return (
    <header class="topbar">
      <span class="level">{level.name}</span>
      <span class="date" data-hours={Math.floor(hours)}>
        <time>{dayName(d)}</time> <span class="time">{clockTime(d)}</span>
        {temp !== null && <span class="temp" title="Air temperature"> {temp < 0 ? '−' : ''}{Math.abs(temp)} °C</span>}
        {d.year > 1 && <span class="year"> · year {d.year}</span>}
      </span>
      {see('garden.money') && <button type="button" class="money plain" title="Money" aria-label={`Money: ${money(snap.money)}. Explain`} onClick={() => onExplain('money', 'gate')}>{money(snap.money)}</button>}
      {see('garden.carbon') && <CarbonDial kg={snap.carbon} onExplain={() => onExplain('carbon', 'heap')} />}
      <span class="speeds" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button type="button" class={s === 0 ? 'speed pause' : 'speed'} aria-pressed={speed === s} aria-label={s === 0 ? 'Pause' : `Speed ${s}×`} onClick={() => onSpeed(s)}>
            {s === 0 ? <span aria-hidden="true">❚❚</span> : SPEED_LABEL[s]}
          </button>
        ))}
      </span>
      <button type="button" class="speed-cycle" aria-label={`Speed: ${speed === 0 ? 'paused' : SPEED_LABEL[speed]}. Tap for ${nextSpeed(speed) === 0 ? 'pause' : SPEED_LABEL[nextSpeed(speed)]}`}
        onClick={() => onSpeed(nextSpeed(speed))}>
        {speed === 0 ? <span aria-hidden="true" class="pause">❚❚</span> : SPEED_LABEL[speed]}
      </button>
    </header>
  );
}
