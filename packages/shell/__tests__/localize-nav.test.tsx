/**
 * The one pass that turns a nav tree's `labelKey`/`captionKey` into plain
 * text before the sidebar, header search, breadcrumbs and page title each
 * read it — an item with no key keeps its literal untouched.
 */
import { describe, expect, it, vi } from 'vitest';

import { localizeNav, localizeSearchItems } from '../src/i18n/localize-nav';
import type { AppNavItem, SearchItem } from '../src/types';

const t = vi.fn((key: string) => `translated:${key}`);

describe('localizeNav', () => {
  it('translates a keyed label and caption, recursing into children', () => {
    const items: AppNavItem[] = [
      {
        label: 'literal',
        labelKey: 'nav.reports',
        caption: 'literal caption',
        captionKey: 'nav.reports.caption',
        children: [{ label: 'child', labelKey: 'nav.reports.child' }],
      },
    ];

    const [result] = localizeNav(items, t);

    expect(result.label).toBe('translated:nav.reports');
    expect(result.caption).toBe('translated:nav.reports.caption');
    expect(result.children?.[0].label).toBe('translated:nav.reports.child');
  });

  it('keeps the literal label and caption for an item with no keys, and no children key at all', () => {
    const items: AppNavItem[] = [{ label: 'Reports', caption: 'See totals' }];

    const [result] = localizeNav(items, t);

    expect(result.label).toBe('Reports');
    expect(result.caption).toBe('See totals');
    expect(result.children).toBeUndefined();
  });
});

describe('localizeSearchItems', () => {
  it('passes an undefined list straight through', () => {
    expect(localizeSearchItems(undefined, t)).toBeUndefined();
  });

  it('translates a keyed label and section, keeping a literal one untouched', () => {
    const items: SearchItem[] = [
      { label: 'literal', labelKey: 'search.reports', to: '/reports', section: 'literal section', sectionKey: 'search.section' },
      { label: 'Plain', to: '/plain', section: 'Plain section' },
    ];

    const result = localizeSearchItems(items, t) as SearchItem[];

    expect(result[0].label).toBe('translated:search.reports');
    expect(result[0].section).toBe('translated:search.section');
    expect(result[1].label).toBe('Plain');
    expect(result[1].section).toBe('Plain section');
  });
});
