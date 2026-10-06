/**
 * CMS widget `site-header`: the sticky header of the ads and earnwith sites.
 *
 * Root: the `<header>`. The widget keeps class `at-top` on it while the page
 * is within SCROLL_TOP_PX of the top (the header's own CSS reads it, together
 * with `data-overlay`, to go transparent over a banner and to drop its shadow),
 * and wires the `[data-theme-toggle]` + `[data-theme-icon]` button inside it.
 */
import { claimRoot } from './dom';
import { wireThemeToggle } from './theme-toggle';

/** Scrolled less than this, the page is still "at the top". */
const SCROLL_TOP_PX = 24;

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  // Transparent while the banner is behind it, solid once the page scrolls.
  const sync = () => root.classList.toggle('at-top', window.scrollY <= SCROLL_TOP_PX);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
  wireThemeToggle(root);
}
