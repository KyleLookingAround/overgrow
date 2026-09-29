// Notices over the map (the owner's win W27), capped and expiring (src/ui/notices.ts): a refusal, the sign that
// something new has unfolded (one a batch, with its short Explain; W26), and the one "try faster" nudge (W17). The strip lets taps through to
// the map; only a notice itself takes them.
import type {Notice} from './notices';

export function Notices({list, onDismiss}: {list: readonly Notice[]; onDismiss: (id: number) => void}) {
  if (!list.length) return null;
  return (
    <div class="notices" role="status" aria-live="polite">
      {list.map((n) => (
        <p class={n.keys ? 'notice unfold' : 'notice'} key={n.id} data-keys={n.keys?.join(' ')}>
          <span>
            {n.text}
            {n.more && <small class="notice-more">{n.more}</small>}
          </span>
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
