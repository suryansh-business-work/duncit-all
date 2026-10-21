/**
 * The DocToc side nav (components/page/DocToc.astro). Its document's text
 * arrives after the page loads — a widget swaps the skeleton for it — so the
 * list is rebuilt whenever the target's children change, and the section in
 * view is marked `aria-current` as the reader scrolls.
 */

const LINK_CLASS =
  '-ml-0.5 block border-l-2 border-transparent py-1.5 pl-4 text-sm leading-snug font-semibold text-ink-soft transition hover:text-ink aria-[current=true]:border-primary aria-[current=true]:text-ink';

/** The band of the viewport a heading must cross to count as "being read". */
const READING_BAND = '-15% 0px -70% 0px';

function tocItem(heading: HTMLElement, index: number): HTMLLIElement {
  // A heading the author left without an id still needs one to be linked to.
  if (!heading.id) heading.id = `section-${index + 1}`;
  heading.style.scrollMarginTop = '7rem';
  const link = document.createElement('a');
  link.href = `#${encodeURIComponent(heading.id)}`;
  link.className = LINK_CLASS;
  link.textContent = heading.textContent?.trim() ?? '';
  const item = document.createElement('li');
  item.append(link);
  return item;
}

function markCurrent(list: HTMLElement, id: string): void {
  for (const link of list.querySelectorAll('a')) {
    if (link.hash === `#${encodeURIComponent(id)}`) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}

function watchReading(headings: HTMLElement[], list: HTMLElement): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) markCurrent(list, visible.target.id);
    },
    { rootMargin: READING_BAND }
  );
  for (const heading of headings) observer.observe(heading);
  return observer;
}

export function startDocToc(nav: HTMLElement): void {
  const target = document.querySelector<HTMLElement>(nav.dataset.tocTarget ?? '');
  const list = nav.querySelector<HTMLElement>('[data-toc-list]');
  if (!target || !list) return;
  const selector = nav.dataset.tocHeadings || 'h2';
  let reading: IntersectionObserver | null = null;

  const build = () => {
    const headings = [...target.querySelectorAll<HTMLElement>(selector)].filter((h) => h.textContent?.trim());
    reading?.disconnect();
    list.replaceChildren(...headings.map((heading, index) => tocItem(heading, index)));
    nav.classList.toggle('hidden', headings.length < 2);
    reading = typeof IntersectionObserver === 'undefined' ? null : watchReading(headings, list);
  };

  new MutationObserver(build).observe(target, { childList: true });
  build();
}
