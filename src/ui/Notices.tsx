// Notices over the map (the owner's win W27), queued and expiring (src/ui/notices.ts): a refusal, the sign that
// something new has unfolded (one a batch, with its short Explain; W26), and the one "try faster" nudge (W17). One shows
// at a time, in one line: a tap on it opens its Explain line, and the count says how many more are waiting. The strip
// lets taps through to the map; only a notice itself takes them.
import {useState} from 'preact/hooks';
import {shownOf, type Notice} from './notices';

export function Notices({list, onDismiss}: {list: readonly Notice[]; onDismiss: (id: number) => void}) {
  const [open, setOpen] = useState<number | null>(null);
  const shown = shownOf(list), waiting = list.length - shown.length;
  if (!shown.length) return null;
  return (
    <div class="notices" role="status" aria-live="polite">
      {shown.map((n) => (
        <p class={`${n.keys ? 'notice unfold' : n.moment ? 'notice moment' : 'notice'}${open === n.id ? ' open' : ''}`} key={n.id} data-keys={n.keys?.join(' ')} data-moment={n.moment}>
          <button type="button" class="notice-text" aria-expanded={n.more ? open === n.id : undefined} onClick={() => setOpen(open === n.id ? null : n.id)}>
            <span class="notice-line">{n.text}</span>
            {/* a clear break between the title and its line, for the eye and for a screen reader */}
            {n.more && <span class="visually-hidden">. </span>}
            {n.more && <small class="notice-more">{n.more}</small>}
          </button>
          {waiting > 0 && <span class="notice-waiting" aria-label={`${waiting} more waiting`}>+{waiting}</span>}
          {n.actions?.map((a) => (
            <button type="button" class="notice-action" onClick={a.run}>{a.label}</button>
          ))}
          <button type="button" class="notice-close" aria-label="Dismiss" onClick={() => onDismiss(n.id)}>
            <span aria-hidden="true">×</span>
          </button>
        </p>
      ))}
    </div>
  );
}
