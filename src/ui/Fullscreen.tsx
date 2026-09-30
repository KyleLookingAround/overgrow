// The fullscreen button at the map's top right corner (the spec docs/specs/ui-overhaul.md, "The fullscreen mode"): shown
// only where the browser has the Fullscreen API for pages (hidden, never greyed: iPhone Safari has none, and gets the
// home-screen manifest instead). It puts the whole page in fullscreen and takes it out again; Esc leaves as the browser
// does, and the button follows `fullscreenchange` either way. A view setting, nothing saved.
import {useEffect, useState} from 'preact/hooks';

// where the page can go fullscreen, and isn't an installed app without chrome already (read once, when the page opens:
// going fullscreen changes the display mode, and the button must stay to come back out)
const can = () => typeof document !== 'undefined' && !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen &&
  !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;

export function Fullscreen() {
  const [on, setOn] = useState(false);
  const [able] = useState(can);
  useEffect(() => {
    if (!able) return;
    const follow = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', follow);
    return () => document.removeEventListener('fullscreenchange', follow);
  }, [able]);
  if (!able) return null;
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  return (
    <button type="button" class="fullscreen" aria-pressed={on} aria-label="Fullscreen" title={on ? 'Leave fullscreen (Esc)' : 'Fullscreen'} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {on ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
      </svg>
    </button>
  );
}
