/**
 * The light/dark button every site's chrome carries (`site-nav`, `site-header`).
 *
 * The theme itself is applied before first paint by each site's layout, which
 * reads the same storage key; this button only changes and remembers it.
 */

/** Where the chosen theme is remembered — the layouts' pre-paint script reads it. */
export const THEME_STORAGE_KEY = 'duncit-theme';

/** The icon shows what a press GIVES you, not where you are. */
const ICON_CLASS = { dark: 'fa-solid fa-sun text-sm', light: 'fa-solid fa-moon text-sm' } as const;

/** Wire `[data-theme-toggle]` + its `[data-theme-icon]` found under `scope`. */
export function wireThemeToggle(scope: ParentNode): void {
  const toggle = scope.querySelector<HTMLElement>('[data-theme-toggle]');
  const icon = scope.querySelector<HTMLElement>('[data-theme-icon]');
  if (!toggle || !icon) return;
  const paint = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    icon.className = dark ? ICON_CLASS.dark : ICON_CLASS.light;
  };
  paint();
  toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    paint();
  });
}
