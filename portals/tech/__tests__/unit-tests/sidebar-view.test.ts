import { describe, expect, it } from 'vitest';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import {
  applySidebarView,
  countBadge,
  countLabel,
  emptyMessage,
  sortOptionsFor,
  statusOptionsFor,
  type SidebarItem,
} from '../../src/components/EmailSidebarList/sidebar-view';

/**
 * The REAL shipped copy, not a stub: these helpers exist to turn keys into
 * words, and a fake table would only prove the fake. It also fails loudly if
 * a key is missing from the bundle, which is the mistake worth catching.
 */
const t = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() }).t;

const items: SidebarItem[] = [
  {
    key: 'welcome',
    primary: 'Welcome',
    secondary: 'welcome',
    count: 4,
    updatedAt: '2026-01-02T00:00:00.000Z',
    group: 'transactional',
  },
  {
    key: 'receipt',
    primary: 'Receipt',
    secondary: 'payment-receipt',
    off: true,
    count: 40,
    updatedAt: '2026-03-04T00:00:00.000Z',
    group: 'billing',
  },
  {
    key: 'digest',
    primary: 'Digest',
    secondary: 'weekly-digest',
    count: 0,
    updatedAt: '2025-12-01T00:00:00.000Z',
    group: 'transactional',
  },
];

const view = (over: Partial<Parameters<typeof applySidebarView>[0]> = {}) =>
  applySidebarView({ items, search: '', sort: 'list', status: 'all', group: '', ...over }).map(
    (item) => item.key
  );

describe('sortOptionsFor', () => {
  it('offers only the sorts the rows can actually answer', () => {
    const bare = sortOptionsFor(t, [{ key: 'a', primary: 'A' }]);
    expect(bare.map((o) => o.value)).toEqual(['list', 'name-asc', 'name-desc']);
  });

  it('adds Most used and Recently updated once the rows carry them', () => {
    expect(sortOptionsFor(t, items).map((o) => o.value)).toEqual([
      'list',
      'name-asc',
      'name-desc',
      'used',
      'recent',
    ]);
  });

  it('names the three statuses', () => {
    expect(statusOptionsFor(t).map((o) => o.label)).toEqual([
      'Any status',
      'Active only',
      'Switched off only',
    ]);
  });
});

describe('applySidebarView', () => {
  it('keeps the server order by default', () => {
    expect(view()).toEqual(['welcome', 'receipt', 'digest']);
  });

  it('sorts by name in both directions', () => {
    expect(view({ sort: 'name-asc' })).toEqual(['digest', 'receipt', 'welcome']);
    expect(view({ sort: 'name-desc' })).toEqual(['welcome', 'receipt', 'digest']);
  });

  it('sorts the busiest row to the top, and the never-used one to the bottom', () => {
    expect(view({ sort: 'used' })).toEqual(['receipt', 'welcome', 'digest']);
  });

  it('sorts the most recently edited row to the top', () => {
    expect(view({ sort: 'recent' })).toEqual(['receipt', 'welcome', 'digest']);
  });

  it('treats a row with no count or timestamp as the smallest', () => {
    const withGaps: SidebarItem[] = [{ key: 'bare', primary: 'Bare' }, ...items];
    const sorted = applySidebarView({
      items: withGaps,
      search: '',
      sort: 'used',
      status: 'all',
      group: '',
    });
    // The two zeroes keep the order they arrived in: the sort is stable, so
    // a tie never shuffles rows an operator has just read.
    expect(sorted.map((i) => i.key)).toEqual(['receipt', 'welcome', 'bare', 'digest']);
    const byDate = applySidebarView({
      items: withGaps,
      search: '',
      sort: 'recent',
      status: 'all',
      group: '',
    });
    expect(byDate.at(-1)?.key).toBe('bare');
  });

  it('does not reorder the caller’s array', () => {
    view({ sort: 'name-asc' });
    expect(items.map((i) => i.key)).toEqual(['welcome', 'receipt', 'digest']);
  });

  it('searches the title and the slug', () => {
    expect(view({ search: '  PAYMENT ' })).toEqual(['receipt']);
    expect(view({ search: 'digest' })).toEqual(['digest']);
  });

  it('filters by status', () => {
    expect(view({ status: 'active' })).toEqual(['welcome', 'digest']);
    expect(view({ status: 'off' })).toEqual(['receipt']);
  });

  it('filters by group — how the Fragments page asks "where is this used?"', () => {
    expect(view({ group: 'transactional' })).toEqual(['welcome', 'digest']);
    expect(view({ group: 'billing' })).toEqual(['receipt']);
  });

  it('combines every narrowing at once', () => {
    expect(view({ search: 'e', status: 'active', group: 'transactional', sort: 'name-asc' })).toEqual(
      ['digest', 'welcome']
    );
  });
});

describe('emptyMessage', () => {
  it('names the search term, which says the rows are hidden rather than absent', () => {
    expect(emptyMessage(t, { search: ' zzz ', filtered: false, emptyText: 'No templates yet.' })).toBe(
      'Nothing matches “zzz”.'
    );
  });

  it('blames the filters when there is no search term', () => {
    expect(emptyMessage(t, { search: '', filtered: true, emptyText: 'No templates yet.' })).toBe(
      'Nothing matches the filters above.'
    );
  });

  it('falls back to the page’s own empty text when nothing is narrowing', () => {
    expect(emptyMessage(t, { search: '', filtered: false, emptyText: 'No templates yet.' })).toBe(
      'No templates yet.'
    );
  });
});

describe('countLabel and countBadge', () => {
  it('says the total until something is hidden', () => {
    expect(countLabel(t, 3, 3)).toBe('3 total');
    expect(countLabel(t, 1, 3)).toBe('1 of 3');
  });

  it('mutes a zero rather than hiding it', () => {
    expect(countBadge(0, 'never used')).toEqual({ label: '0', title: 'never used', muted: true });
    expect(countBadge(7, 'seven')).toEqual({ label: '7', title: 'seven', muted: false });
  });
});
