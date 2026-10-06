/**
 * CMS widget `site-nav`: the main site's side drawer and the theme button in it.
 *
 * Root: the drawer element (starts closed: class `-translate-x-full`,
 * `aria-hidden="true"`). Inside it:
 *   - `[data-nav-close]` — closes it;
 *   - `[data-theme-toggle]` + `[data-theme-icon]` — the light/dark button.
 * Anywhere on the page:
 *   - `[data-nav-toggle]` — any number of openers (hero, sub-page headers);
 *   - `[data-nav-backdrop]` — the dimmed backdrop; clicking it closes the drawer.
 * Escape closes it too.
 */
import { claimRoot } from './dom';
import { wireThemeToggle } from './theme-toggle';

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  const nav = root;
  const backdrop = document.querySelector<HTMLElement>('[data-nav-backdrop]');

  const open = () => {
    nav.classList.remove('-translate-x-full');
    nav.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100');
    }
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    nav.classList.add('-translate-x-full');
    nav.setAttribute('aria-hidden', 'true');
    if (backdrop) {
      backdrop.classList.add('opacity-0', 'pointer-events-none');
      backdrop.classList.remove('opacity-100');
    }
    document.body.style.overflow = '';
  };

  // Delegated, so an opener rendered anywhere on the page works.
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-nav-toggle]')) {
      event.preventDefault();
      open();
    } else if (target.closest('[data-nav-close]') || target === backdrop) {
      close();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  wireThemeToggle(nav);
}
