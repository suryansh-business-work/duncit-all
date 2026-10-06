/**
 * CMS widget `help-center`: one card per FAQ topic (the Support portal's FAQ
 * groups, live), each linking to that group on /faq, plus a search field that
 * filters the cards as you type.
 *
 * Root: the topic grid, with
 *   - `data-graphql-url` — where to read `publicFaqGroups` from;
 *   - `data-copy` — JSON `{ empty, error, general, one, many }` (`one`/`many`
 *     follow the question count on each card).
 * The search field is an `<input>` anywhere on the page marked
 * `[data-help-search]` — it sits above the grid, outside the root.
 */
import { claimRoot, detach, escapeHtml, postGraphql, readJson } from './dom';

interface HelpCopy {
  empty: string;
  error: string;
  general: string;
  one: string;
  many: string;
}

interface TopicGroup {
  super_category?: { name: string; slug: string } | null;
  faqs?: unknown[] | null;
}

const TOPIC_ICONS = ['fa-heart', 'fa-comments', 'fa-shield-heart', 'fa-user', 'fa-mobile', 'fa-credit-card'];

const FAQ_TOPICS = 'query { publicFaqGroups { super_category { id name slug } faqs { id question } } }';

const topicCard = (group: TopicGroup, index: number, copy: HelpCopy): string => {
  const name = group.super_category?.name ?? copy.general;
  const slug = group.super_category?.slug ?? '';
  const href = slug ? `/faq#${encodeURIComponent(slug)}` : '/faq';
  const icon = TOPIC_ICONS[index % TOPIC_ICONS.length];
  const count = group.faqs?.length ?? 0;
  const noun = count === 1 ? copy.one : copy.many;
  return `
            <a href="${href}" data-topic-card data-topic-name="${escapeHtml(name.toLowerCase())}" class="block p-5 rounded-2xl glass hover:-translate-y-0.5 transition">
              <div class="flex items-start gap-4">
                <div class="w-11 h-11 rounded-xl bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
                  <i class="fa-solid ${icon} text-lg" aria-hidden="true"></i>
                </div>
                <div>
                  <div class="font-head font-bold text-ink mb-0.5">${escapeHtml(name)}</div>
                  <div class="text-sm text-ink-soft">${count} ${noun}</div>
                </div>
              </div>
            </a>`;
};

async function loadTopics(root: HTMLElement, copy: HelpCopy): Promise<void> {
  try {
    const json = await postGraphql<{ publicFaqGroups?: TopicGroup[] }>(root.dataset.graphqlUrl ?? '', FAQ_TOPICS);
    const groups = (json?.data?.publicFaqGroups ?? []).filter((group) => group.faqs?.length);
    if (!groups.length) {
      root.innerHTML = `<p class="text-ink-soft sm:col-span-2">${copy.empty}</p>`;
      return;
    }
    root.innerHTML = groups.map((group, index) => topicCard(group, index, copy)).join('');
  } catch {
    root.innerHTML = `<p class="text-ink-soft sm:col-span-2">${copy.error}</p>`;
  }
}

export function mount(root: HTMLElement): void {
  if (!claimRoot(root)) return;
  const copy = readJson<HelpCopy>(root.dataset.copy);
  const search = document.querySelector<HTMLInputElement>('input[data-help-search]');

  search?.addEventListener('input', () => {
    const term = search.value.trim().toLowerCase();
    for (const card of root.querySelectorAll<HTMLElement>('[data-topic-card]')) {
      const matches = !term || (card.dataset.topicName ?? '').includes(term);
      card.style.display = matches ? '' : 'none';
    }
  });

  detach(loadTopics(root, copy), 'help-center');
}
