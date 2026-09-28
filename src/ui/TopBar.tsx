// The top bar: the level, the date and time, the money, the carbon dial, and pause with the three speeds. The speed is a
// command through the sim like any other change to the game.
import {LEVELS, SPEEDS, type Speed} from '../data/ladder';
import {calendar} from '../sim/clock';
import type {Snapshot} from '../sim/state';
import {clockTime, dayName, money, num} from './format';

/** kg CO₂e as a needle angle: log-scaled so a garden's few kg and a nation's millions both read, ±90° at the ends. */
const needle = (kg: number) => Math.sign(kg) * Math.min(1, Math.log10(1 + Math.abs(kg)) / 4) * 90;

function CarbonDial({kg}: {kg: number}) {
  const label = kg > 0 ? `${num(kg)} kg CO₂e put into the air` : kg < 0 ? `${num(-kg)} kg CO₂e taken out of the air` : 'No carbon put into the air yet';
  return (
    <span class="dial" role="img" aria-label={`Carbon: ${label}`} title={label}>
      <svg viewBox="-22 -22 44 26" aria-hidden="true">
        <path class="dial-sink" d="M -18 0 A 18 18 0 0 1 0 -18" />
        <path class="dial-source" d="M 0 -18 A 18 18 0 0 1 18 0" />
        <line class="dial-needle" x1="0" y1="0" x2="0" y2="-15" transform={`rotate(${needle(kg)})`} />
      </svg>
      <span class="dial-kg">{kg > 0 ? '+' : kg < 0 ? '−' : ''}{num(Math.abs(kg))} kg</span>
    </span>
  );
}

const SPEED_LABEL: Record<Speed, string> = {0: 'Pause', 1: '1×', 2: '2×', 4: '4×'};

/** The snapshot the map is showing, its hour, and the speed last set (which can be a step ahead of the map). */
export function TopBar({snap, hours, speed, onSpeed}: {snap: Snapshot; hours: number; speed: Speed; onSpeed: (s: Speed) => void}) {
  const d = calendar(hours), level = LEVELS[snap.level - 1]!;
  return (
    <header class="topbar">
      <span class="level">{level.name}</span>
      <span class="date" data-hours={Math.floor(hours)}>
        <time>{dayName(d)}</time> <span class="time">{clockTime(d)}</span>
        {d.year > 1 && <span class="year"> · year {d.year}</span>}
      </span>
      <span class="money" aria-label={`Money: ${money(snap.money)}`}>{money(snap.money)}</span>
      <CarbonDial kg={snap.carbon} />
      <span class="speeds" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button type="button" class={s === 0 ? 'speed pause' : 'speed'} aria-pressed={speed === s} aria-label={s === 0 ? 'Pause' : `Speed ${s}×`} onClick={() => onSpeed(s)}>
            {s === 0 ? <span aria-hidden="true">❚❚</span> : SPEED_LABEL[s]}
          </button>
        ))}
      </span>
    </header>
  );
}
