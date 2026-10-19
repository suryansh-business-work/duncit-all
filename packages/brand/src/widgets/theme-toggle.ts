/**
 * The light/dark button every site's chrome carries (`site-nav`, `site-header`,
 * and the always-visible one in each site's top bar).
 *
 * The theme itself is applied before first paint by each site's layout, which
 * reads the same storage key; these buttons only change and remember it. A
 * page can carry several (the top bar and the menu drawer) — pressing one
 * repaints them all.
 */

/** Where the chosen theme is remembered — the layouts' pre-paint script reads it. */
export const THEME_STORAGE_KEY = 'duncit-theme';

/** Fired on `document` whenever a button changes the theme. */
const THEME_EVENT = 'duncit-theme-change';

/** The icon shows what a press GIVES you, not where you are. */
const ICON_CLASS = { dark: 'fa-solid fa-sun text-sm', light: 'fa-solid fa-moon text-sm' } as const;

function paint(toggle: HTMLElement, icon: HTMLElement): void {
  const dark = document.documentElement.dataset.theme === 'dark';
  toggle.setAttribute('aria-pressed', String(dark));
  icon.className = dark ? ICON_CLASS.dark : ICON_CLASS.light;
}

function remember(theme: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Storage blocked (private mode): the theme still changes for this page view.
    console.warn('[theme-toggle] choice not remembered', error);
  }
}

/** Wire every `[data-theme-toggle]` (and the `[data-theme-icon]` inside it) found under `scope`. */
export function wireThemeToggle(scope: ParentNode): void {
  for (const toggle of scope.querySelectorAll<HTMLElement>('[data-theme-toggle]')) {
    if (toggle.dataset.themeWired) continue;
    const icon = toggle.querySelector<HTMLElement>('[data-theme-icon]') ?? scope.querySelector<HTMLElement>('[data-theme-icon]');
    if (!icon) continue;
    toggle.dataset.themeWired = 'true';
    paint(toggle, icon);
    document.addEventListener(THEME_EVENT, () => paint(toggle, icon));
    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      remember(next);
      document.dispatchEvent(new Event(THEME_EVENT));
    });
  }
}
