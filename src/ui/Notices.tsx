// Notices over the map (the owner's win W27), capped and expiring (src/ui/notices.ts). The strip lets taps through to
// the map; only a notice itself takes them.
import type {Notice} from './notices';

export function Notices({list, onDismiss}: {list: readonly Notice[]; onDismiss: (id: number) => void}) {
  if (!list.length) return null;
  return (
    <div class="notices" role="status" aria-live="polite">
      {list.map((n) => (
        <p class="notice" key={n.id}>
          <span>{n.text}</span>
          <button type="button" class="notice-close" aria-label="Dismiss" onClick={() => onDismiss(n.id)}>
            <span aria-hidden="true">×</span>
          </button>
        </p>
      ))}
    </div>
  );
}
