import type { Translator } from '@duncit/i18n';

import type { AppNavItem, SearchItem } from '../types';

/**
 * Resolve a nav tree's `labelKey`/`captionKey` into plain `label`/`caption`,
 * ONCE, before anything renders it.
 *
 * The same tree feeds the sidebar, the header search, the breadcrumbs and the
 * page title. Translating at each of those is four places to keep in step and
 * four chances to miss one — worse, the search index and the breadcrumb would
 * then disagree with the sidebar about what a page is called, which is exactly
 * the drift rule 40 exists to stop.
 *
 * An item with no key keeps its literal, so a console that has not been swept
 * yet renders exactly as it did. The caller memoises the result, so building a
 * fresh tree here costs one pass per language change rather than one per render.
 */
export function localizeNav(items: AppNavItem[], t: Translator['t']): AppNavItem[] {
  return items.map((item) => ({
    ...item,
    label: item.labelKey ? t(item.labelKey) : item.label,
    caption: item.captionKey ? t(item.captionKey) : item.caption,
    ...(item.children ? { children: localizeNav(item.children, t) } : {}),
  }));
}

/**
 * The same resolution for the header search's own entries.
 *
 * Only the Admin console supplies its own list — every other portal has the
 * header derive one from `nav`, which `localizeNav` has already translated. So
 * this exists for that one case, and it has to: without it Admin would be the
 * single console whose search still answered in English after everything else
 * had been swept.
 */
export function localizeSearchItems(
  items: SearchItem[] | undefined,
  t: Translator['t'],
): SearchItem[] | undefined {
  if (!items) return items;
  return items.map((item) => ({
    ...item,
    label: item.labelKey ? t(item.labelKey) : item.label,
    section: item.sectionKey ? t(item.sectionKey) : item.section,
  }));
}
