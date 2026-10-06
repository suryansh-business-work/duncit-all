/**
 * CMS widget `policy-reader`: one policy's text, loaded live by slug, so a
 * Legal portal edit is on the page without a rebuild.
 *
 * Root: the body container (its skeleton children are replaced), with
 *   - `data-graphql-url` — where to read `policyBySlug` from;
 *   - `data-copy` — JSON `{ notFound, empty, error }`;
 *   - `data-policy-slug` (optional) — the policy to show. Without it the slug
 *     is the LAST segment of the address (`/policy/<slug>`, `/legal/<slug>/`),
 *     which is how one reader page serves every policy published after a build.
 * Also updates `document.title` and the page heading (`[data-page-heading]`,
 * else the first `<h1>`). No valid slug sends the visitor to /policies.
 */
import { claimRoot, detach, postGraphql, readJson } from './dom';

interface ReaderCopy {
  notFound: string;
  empty: string;
  error: string;
}

interface PolicyText {
  title: string;
  content?: string | null;
}

const POLICY_BY_SLUG =
  'query Policy($slug: String!) { policyBySlug(slug: $slug) { title content updated_at } }';

const isSlugChar = (char: string): boolean => (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');

/** The server's slug rule (policy.service SLUG_RE): lowercase letters and
 * digits in runs joined by single dashes. */
export function isPolicySlug(value: string): boolean {
  if (!value || value.startsWith('-') || value.endsWith('-') || value.includes('--')) return false;
  return [...value].every((char) => char === '-' || isSlugChar(char));
}

/** The address's last segment, when it is a policy slug ('' otherwise). One
 * trailing slash is allowed, like the page server's own routing. */
export function slugFromPath(pathname: string): string {
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const slug = path.slice(path.lastIndexOf('/') + 1);
  return isPolicySlug(slug) ? slug : '';
}

async function load(root: HTMLElement, slug: string, copy: ReaderCopy): Promise<void> {
  try {
    const json = await postGraphql<{ policyBySlug?: PolicyText | null }>(root.dataset.graphqlUrl ?? '', POLICY_BY_SLUG, {
      slug,
    });
    const policy = json?.data?.policyBySlug;
    if (!policy) {
      root.innerHTML = `<p>${copy.notFound}</p>`;
      return;
    }
    document.title = `${policy.title} — Duncit`;
    const heading = document.querySelector('[data-page-heading]') ?? document.querySelector('h1');
    if (heading) heading.textContent = policy.title;
    // Policy content is trusted HTML authored by our own Legal portal editor.
    root.innerHTML = policy.content || `<p>${copy.empty}</p>`;
  } catch {
    root.innerHTML = `<p>${copy.error}</p>`;
  }
}

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  const copy = readJson<ReaderCopy>(root.dataset.copy);
  const slug = root.dataset.policySlug || slugFromPath(window.location.pathname);
  if (!slug) {
    window.location.replace('/policies');
    return;
  }
  detach(load(root, slug, copy), 'policy-reader');
}
