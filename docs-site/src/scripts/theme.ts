/**
 * The light/dark switch.
 *
 * `data-theme` is already correct on <html> before this runs — the inline
 * script in DocsLayout's head sets it, so the page never flashes the wrong
 * palette. All this module does is flip it, remember the choice, and announce
 * it, because Monaco cannot be restyled by CSS the way Shiki's output can.
 */
const STORAGE_KEY = 'duncit-docs-theme';

type Theme = 'light' | 'dark';

function current(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function remember(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // A browser with site data blocked still gets the toggle, just not the memory.
    console.debug('docs: theme preference not stored', error);
  }
}

function label(theme: Theme): void {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  button.textContent = theme === 'dark' ? 'Light' : 'Dark';
  button.setAttribute('aria-label', theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
}

/*
 * Only a real press writes to storage. Persisting on load would pin whatever
 * the OS happened to prefer on a reader's first visit, and their machine
 * switching to dark at sunset would stop being followed.
 */
label(current());

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const next: Theme = current() === 'dark' ? 'light' : 'dark';

  document.documentElement.dataset.theme = next;
  remember(next);
  label(next);
  globalThis.dispatchEvent(new CustomEvent<Theme>('duncit-docs:theme', { detail: next }));
});
