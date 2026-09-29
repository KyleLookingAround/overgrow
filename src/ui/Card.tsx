// The one overlay card (the owner's win W13): a title, a body, a footer and a close button, with safe-area padding, for
// the Explain card and every card after it (the step-up card, What's new, help). Styled from the tokens in page.css.
import type {ComponentChildren} from 'preact';
import {useEffect, useRef} from 'preact/hooks';

export function Card({title, kicker, footer, onClose, children, label}: {
  title: string; kicker?: string; footer?: ComponentChildren; onClose: () => void; children: ComponentChildren; label?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  // Escape closes it, and the close button takes the focus when it opens, so the keyboard can reach it at once
  useEffect(() => {
    close.current?.focus({preventScroll: true});
    const key = (e: KeyboardEvent) => void (e.key === 'Escape' && onClose());
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [title]);
  return (
    <section class="card-overlay" role="dialog" aria-modal="false" aria-label={label ?? title}>
      <header class="card-head">
        <div>
          {kicker && <p class="card-kicker">{kicker}</p>}
          <h2 class="card-title">{title}</h2>
        </div>
        <button type="button" class="card-close" ref={close} aria-label="Close" onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div class="card-body">{children}</div>
      {footer && <footer class="card-foot">{footer}</footer>}
    </section>
  );
}
