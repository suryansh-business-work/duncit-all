/**
 * CMS widget `policy-list`: every active policy from the Legal portal, live,
 * as a card grid with a type-to-filter search.
 *
 * Root: the card grid, with
 *   - `data-graphql-url` — where to read `publicPolicies` from;
 *   - `data-copy` — JSON `{ readCurrent, showAll, empty, error, matchOne,
 *     matchMany, nothingMatches }`.
 * The search sits above the grid, outside the root, anywhere on the page:
 *   - `[data-policy-search-wrap]` — hidden (class `hidden`) until the list loads;
 *   - `input[data-policy-search]` — the filter field;
 *   - `[data-policy-count]` — the live "n matches" line.
 */
import { claimRoot, detach, escapeHtml, postGraphql, readJson } from './dom';

interface PolicyCopy {
  readCurrent: string;
  showAll: string;
  empty: string;
  error: string;
  matchOne: string;
  matchMany: string;
  nothingMatches: string;
}

interface Policy {
  slug: string;
  title: string;
}

const PUBLIC_POLICIES = 'query { publicPolicies { id slug title } }';

const card = (policy: Policy, copy: PolicyCopy): string => `
      <a href="/policy/${encodeURIComponent(policy.slug)}"
         class="glass rounded-2xl p-5 flex items-center justify-between gap-3 hover:-translate-y-0.5 transition">
        <span>
          <span class="block font-head font-extrabold text-lg text-ink">${escapeHtml(policy.title)}</span>
          <span class="block text-xs text-ink-soft mt-1">${copy.readCurrent}</span>
        </span>
        <i class="fa-solid fa-arrow-right text-primary" aria-hidden="true"></i>
      </a>`;

// The slug is searched as well as the title: someone who arrived with "data
// deletion" in mind types that, and the policy is called something longer.
const matchesNeedle = (policy: Policy, needle: string): boolean =>
  policy.title.toLowerCase().includes(needle) || policy.slug.toLowerCase().replaceAll('-', ' ').includes(needle);

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  const copy = readJson<PolicyCopy>(root.dataset.copy);
  const searchWrap = document.querySelector('[data-policy-search-wrap]');
  const search = document.querySelector<HTMLInputElement>('input[data-policy-search]');
  const count = document.querySelector('[data-policy-count]');
  let policies: Policy[] = [];

  const render = (query: string) => {
    const trimmed = query.trim();
    const needle = trimmed.toLowerCase();
    const matches = needle ? policies.filter((policy) => matchesNeedle(policy, needle)) : policies;
    if (count) {
      const noun = matches.length === 1 ? copy.matchOne : copy.matchMany;
      count.textContent = needle ? `${matches.length} ${noun} “${trimmed}”` : '';
    }
    root.innerHTML = matches.length
      ? matches.map((policy) => card(policy, copy)).join('')
      : `<p class="text-ink-soft col-span-full">${copy.nothingMatches} “${escapeHtml(trimmed)}”. <button type="button" data-clear-search class="font-bold text-primary underline">${copy.showAll}</button></p>`;
  };

  const load = async () => {
    try {
      const json = await postGraphql<{ publicPolicies?: Policy[] }>(root.dataset.graphqlUrl ?? '', PUBLIC_POLICIES);
      policies = json?.data?.publicPolicies ?? [];
      if (!policies.length) {
        root.innerHTML = `<p class="text-ink-soft col-span-full">${copy.empty}</p>`;
        return;
      }
      searchWrap?.classList.remove('hidden');
      render('');
    } catch {
      root.innerHTML = `<p class="text-ink-soft col-span-full">${copy.error}</p>`;
    }
  };

  search?.addEventListener('input', () => render(search.value));
  // The empty-state's own way out, wired once by delegation because the button
  // is re-created on every render.
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-clear-search]')) return;
    if (search) search.value = '';
    render('');
    search?.focus();
  });

  detach(load(), 'policy-list');
}
