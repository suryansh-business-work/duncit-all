/**
 * Filters the package list in the sidebar as you type.
 *
 * Forty-seven packages is past the point where scanning the list beats
 * searching it, and the whole reason this site exists is that people should
 * find an existing export instead of writing a third copy of it. Matching runs
 * over the package name AND its one-line summary, so "money", "timezone" or
 * "otp" land on the right page even when the name gives nothing away.
 */
const input = document.getElementById('pkg-search') as HTMLInputElement | null;
const sidebar = document.getElementById('sidebar');

function apply(query: string): void {
  if (!sidebar) return;

  const needle = query.trim().toLowerCase();
  const links = sidebar.querySelectorAll<HTMLAnchorElement>('.sidebar__link');
  let shown = 0;

  for (const link of links) {
    const hit = needle === '' || (link.dataset.search ?? '').includes(needle);
    link.hidden = !hit;
    if (hit) shown += 1;
  }

  for (const group of sidebar.querySelectorAll<HTMLElement>('.sidebar__group')) {
    const visible = group.querySelectorAll<HTMLAnchorElement>('.sidebar__link:not([hidden])').length;
    group.hidden = visible === 0;
  }

  sidebar.dataset.empty = String(shown === 0);
}

input?.addEventListener('input', () => apply(input.value));

/** `/` focuses the search the way every docs site a developer already uses does. */
document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

  const active = document.activeElement;
  const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  if (typing || !input) return;

  event.preventDefault();
  input.focus();
  input.select();
});
