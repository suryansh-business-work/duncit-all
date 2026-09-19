/**
 * The filter behind the strip's search box: which tabs a typed word leaves
 * standing, and what each tab is matched on.
 */
import { describe, expect, it } from 'vitest';

import { filterTabItems, tabSearchText } from '../src/tabSearch';
import type { DuncitTabItem } from '../src/types';

const upcoming: DuncitTabItem<string> = { value: 'upcoming', label: 'Upcoming' };
const previous: DuncitTabItem<string> = { value: 'previous', label: 'Previous' };
const cancelled: DuncitTabItem<string> = { value: 'cancelled', label: <span>Cancelled</span> };
const drafts: DuncitTabItem<string> = {
  value: 'drafts',
  label: <span>Drafts</span>,
  searchText: 'Unpublished',
};
const ITEMS = [upcoming, previous, cancelled, drafts];

const values = (items: readonly DuncitTabItem<string>[]) => items.map((item) => item.value);

describe('tabSearchText', () => {
  it('reads a plain string label as the text to match', () => {
    expect(tabSearchText(upcoming)).toBe('Upcoming');
  });

  it('falls back to the value when the label is richer than a string', () => {
    expect(tabSearchText(cancelled)).toBe('cancelled');
  });

  it('prefers an explicit searchText over either', () => {
    expect(tabSearchText(drafts)).toBe('Unpublished');
  });
});

describe('filterTabItems', () => {
  it('leaves every tab standing while nothing is typed', () => {
    expect(filterTabItems(ITEMS, '   ', 'upcoming')).toEqual({ visible: ITEMS, matches: 4, needle: '' });
  });

  it('narrows to the tabs the word matches, ignoring case and padding', () => {
    const { visible, matches, needle } = filterTabItems(ITEMS, ' PREV ', 'previous');
    expect(values(visible)).toEqual(['previous']);
    expect(matches).toBe(1);
    expect(needle).toBe('PREV');
  });

  it('keeps the open tab even when the word does not match it, without counting it', () => {
    const { visible, matches } = filterTabItems(ITEMS, 'unpub', 'upcoming');
    expect(values(visible)).toEqual(['upcoming', 'drafts']);
    expect(matches).toBe(1);
  });

  it('reports zero matches, with only the open tab left, for a word nothing carries', () => {
    const { visible, matches } = filterTabItems(ITEMS, 'zzz', 'cancelled');
    expect(values(visible)).toEqual(['cancelled']);
    expect(matches).toBe(0);
  });
});
