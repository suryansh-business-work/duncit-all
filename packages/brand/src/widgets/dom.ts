/**
 * Small DOM helpers every CMS widget shares (see ./index.ts).
 *
 * A widget reads everything it needs from the markup under its root — no
 * Astro props, no site config — so the same module drives a legacy Astro page
 * and a CMS page that is only that page's HTML snapshot.
 */

/** Claim a widget root once. False when this root was already mounted. */
export function claimRoot(root: HTMLElement): boolean {
  if (root.dataset.cmsMounted !== undefined) return false;
  root.dataset.cmsMounted = 'true';
  return true;
}

/** Parse a JSON data attribute the page rendered (copy, config). */
export function readJson<T>(raw: string | undefined): T {
  return JSON.parse(raw ?? '{}');
}

/** Text as HTML-safe markup, for strings that land in an innerHTML template. */
export function escapeHtml(value: unknown): string {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

/** A form field's trimmed text value ('' when absent). */
export function formText(data: FormData, name: string): string {
  return String(data.get(name) || '').trim();
}

export interface GraphqlError {
  message: string;
}

export interface GraphqlResponse<T> {
  data?: T | null;
  errors?: GraphqlError[];
}

/** POST one GraphQL operation and return the parsed body. */
export async function postGraphql<T>(
  url: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphqlResponse<T>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variables ? { query, variables } : { query }),
  });
  return res.json();
}

/** Show a message in a form's error line, or hide and empty it. */
export function showError(box: HTMLElement | null, text: string | null): void {
  if (!box) return;
  box.classList.toggle('hidden', text === null);
  box.textContent = text ?? '';
}

/**
 * Starts a widget's async work without awaiting it. Each widget shows its own
 * user-facing errors, so a rejection reaching here is a bug: it is logged with
 * the widget's name, never silently dropped.
 */
export function detach(work: Promise<unknown>, widget: string): void {
  work.catch((error: unknown) => {
    console.error('cms widget failed', { widget, error });
  });
}
