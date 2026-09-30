// The zoom back in over the map (part 9): at the allotment, while the slug outbreak runs unfixed, a card with Go down and
// Send someone, the fee and the reward on it; down in the garden, the deadline strip across the top with the plot's
// shortfall still counting and Back up; and back at the allotment, one line on how it ended. Commands only.
import {ADVISERS, OUTBREAK, RESCUE} from '../data/zoom';
import type {ZoomView} from '../sim/zoom';
import {num} from './format';

const H = 24;
const days = (d: number) => `${Math.max(0, Math.ceil(d - 1e-9))} ${Math.ceil(d - 1e-9) === 1 ? 'day' : 'days'}`;

/** Go down or Send someone: the outbreak open at the allotment. */
export function ZoomCard({z, hours, onDown, onSend, onExplain}: {z: ZoomView; hours: number; onDown: () => void; onSend: (id: string) => void; onExplain: () => void}) {
  const a = ADVISERS.slugs!, left = (z.deadline - hours) / H;
  return (
    <section class="goal-bar zoom-card" aria-label="Slugs in your garden">
      <p class="zoom-text">
        <button type="button" class="link" onClick={onExplain}>Slugs from {z.holder}’s plot</button> are in your garden: your plot gives {Math.round(z.event.size * 100)} % less. {days(left)} to fix it.
      </p>
      <p class="zoom-terms soft">Goodwill with the neighbours, more the sooner. {a.name}: £{a.fee}, half of it.</p>
      <div class="zoom-actions">
        <button type="button" class="primary zoom-down" onClick={onDown}>Go down</button>
        <button type="button" class="zoom-send" onClick={() => onSend(a.id)}>Send {a.name.split(' ')[0]} · £{a.fee}</button>
      </div>
    </section>
  );
}

/** The deadline strip while down in the garden: one line, and Back up. */
export function ZoomStrip({z, hours, onUp}: {z: ZoomView; hours: number; onUp: () => void}) {
  const text = z.rescued ? `Rescued in ${num((z.rescued.at - z.event.from) / H)} days: the beds are clear.`
    : z.missed ? 'Too late: the slugs will run their course.'
    : `${days((z.deadline - hours) / H)} left · plot ${num(z.kg)} kg short`;
  return (
    <section class={`zoom-strip${z.rescued ? ' done' : z.missed ? ' missed' : ''}`} aria-label="The rescue’s deadline" role="status">
      <p>{text}</p>
      <button type="button" class={z.rescued ? 'primary zoom-up' : 'zoom-up'} onClick={onUp}>Back up</button>
    </section>
  );
}

/** How it ended, in a line for the plot's panel. */
export function zoomOutcome(z: ZoomView): string | null {
  if (z.rescued?.by === 'adviser') return `${ADVISERS[z.sent?.adviser ?? 'slugs']?.name ?? 'The adviser'} ${ADVISERS[z.sent?.adviser ?? 'slugs']?.did ?? 'sorted it'}: rescued, for a fee.`;
  if (z.rescued) return `Rescued in ${num((z.rescued.at - z.event.from) / H)} garden days: Reliability +${RESCUE.reliability}, and the neighbours noticed.`;
  if (z.missed) return `The slugs ran their course: ${num(z.kg)} kg lost over ${OUTBREAK.days} days.`;
  return null;
}
