// A number in a panel that has an Explain card: a button that opens it (the founding spec: tap any effect, badge or
// number). A value with no card is plain text.
import {explain} from '../data/explain';

/** A value that opens its Explain card, or plain text where there's none. */
export function Num({v, cause, at, onExplain, label}: {v: string; cause?: string; at: string | null; onExplain: (cause: string, at: string | null) => void; label: string}) {
  const e = cause ? explain(cause) : undefined;
  if (!cause || !e) return <>{v}</>;
  return (
    <button type="button" class="num" data-cause={cause} data-kind={e.kind} aria-label={`${label}: ${v}. Explain`} onClick={() => onExplain(cause, at)}>{v}</button>
  );
}
