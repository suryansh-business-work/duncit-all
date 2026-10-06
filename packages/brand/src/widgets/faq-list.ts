/**
 * The FAQ groups half of the `faq` widget: every published FAQ, grouped by
 * its super category, loaded live from the Support portal.
 */
import { escapeHtml, postGraphql, readJson } from './dom';

interface FaqCopy {
  empty: string;
  error: string;
}

interface Faq {
  question: string;
  answer: string;
}

interface FaqGroup {
  super_category?: { name: string; slug: string } | null;
  faqs?: Faq[] | null;
}

const FAQ_GROUPS = 'query { publicFaqGroups { super_category { id name slug } faqs { id question answer } } }';

const faqCard = (faq: Faq, open: boolean): string => {
  const openAttr = open ? ' open' : '';
  return `
    <details class="group bg-surface rounded-2xl p-5 sticker"${openAttr}>
      <summary class="flex items-center justify-between cursor-pointer list-none gap-4">
        <span class="font-head font-bold text-ink">${escapeHtml(faq.question)}</span>
        <i class="fa-solid fa-plus text-primary transition group-open:rotate-45" aria-hidden="true"></i>
      </summary>
      <p class="mt-3 text-ink-soft whitespace-pre-line">${escapeHtml(faq.answer)}</p>
    </details>`;
};

const groupHeading = (group: FaqGroup): string => {
  const category = group.super_category;
  if (!category) return '';
  return `<h2 id="${escapeHtml(category.slug)}" class="font-head font-extrabold text-2xl mt-8 mb-3 text-primary scroll-mt-24">${escapeHtml(category.name)}</h2>`;
};

const groupSection = (group: FaqGroup): string => {
  const cards = (group.faqs ?? []).map((faq, index) => faqCard(faq, index === 0)).join('');
  return `<section class="my-6">${groupHeading(group)}<div class="space-y-3">${cards}</div></section>`;
};

/** Load the groups into `root` (its `data-copy` holds `{ empty, error }`). */
export async function loadFaqGroups(root: HTMLElement): Promise<void> {
  const copy = readJson<FaqCopy>(root.dataset.copy);
  try {
    const json = await postGraphql<{ publicFaqGroups?: FaqGroup[] }>(root.dataset.graphqlUrl ?? '', FAQ_GROUPS);
    const groups = (json?.data?.publicFaqGroups ?? []).filter((group) => group.faqs?.length);
    if (!groups.length) {
      root.innerHTML = `<p class="text-ink-soft">${copy.empty}</p>`;
      return;
    }
    root.innerHTML = groups.map(groupSection).join('');
    // Honour a #slug deep-link (e.g. from the Help Center topic cards) now
    // that the anchored headings exist in the DOM.
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ behavior: 'smooth' });
  } catch {
    root.innerHTML = `<p class="text-ink-soft">${copy.error}</p>`;
  }
}
