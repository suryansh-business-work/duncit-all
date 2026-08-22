/**
 * Marks the heading you are reading in the "On this page" rail.
 *
 * An IntersectionObserver rather than a scroll handler: a package page is long
 * (utils is 700 lines of MDX) and a scroll listener on a list that size costs
 * more than the rail is worth.
 *
 * The top band is clipped to the sticky header's height so a heading counts as
 * current when it reaches the text, not when it slides under the bar.
 */
const links = new Map<string, HTMLAnchorElement>();
for (const link of document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')) {
  links.set(decodeURIComponent(link.hash.slice(1)), link);
}

const headings = [...document.querySelectorAll<HTMLElement>('.content h2[id], .content h3[id]')].filter((heading) =>
  links.has(heading.id),
);

function markCurrent(id: string): void {
  for (const [key, link] of links) {
    if (key === id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}

if (headings.length > 0) {
  const seen = new Set<string>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target.id);
        else seen.delete(entry.target.id);
      }

      const first = headings.find((heading) => seen.has(heading.id));
      if (first) markCurrent(first.id);
    },
    { rootMargin: '-70px 0px -70% 0px', threshold: 0 },
  );

  for (const heading of headings) observer.observe(heading);
}
