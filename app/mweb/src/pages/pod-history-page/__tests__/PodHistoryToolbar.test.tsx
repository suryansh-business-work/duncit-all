/**
 * The filter and sort controls over a member's pod history.
 *
 * The categories cascade: picking a super narrows what the category menu
 * offers, and only categories UNDER the chosen super are shown. A flat list
 * would offer a member "Badminton" under "Music" and return nothing, which
 * reads as the history being broken rather than the filter being wrong.
 *
 * The count on the Filter button is the other half. A member who narrowed
 * something two visits ago and forgot needs to be told the list is filtered —
 * an empty history with no badge looks like a history with nothing in it.
 * Search is deliberately NOT counted: it has its own visible box.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodHistoryToolbar from '../PodHistoryToolbar';
import {
  DEFAULT_POD_HISTORY_FILTERS,
  activePodHistoryFilterCount,
  categoriesUnder,
  superCategories,
} from '../podHistoryFilter';
import type { PodHistoryCategory } from '../queries';

const testTheme = createTheme();

const CATEGORIES: PodHistoryCategory[] = [
  { id: 'sup-1', name: 'Sports', level: 'SUPER' as never, parent_id: null },
  { id: 'sup-2', name: 'Music', level: 'SUPER' as never, parent_id: null },
  { id: 'cat-1', name: 'Badminton', level: 'CATEGORY' as never, parent_id: 'sup-1' },
  { id: 'cat-2', name: 'Football', level: 'CATEGORY' as never, parent_id: 'sup-1' },
  { id: 'cat-3', name: 'Guitar', level: 'CATEGORY' as never, parent_id: 'sup-2' },
];

const toolbar = (over: Partial<Parameters<typeof PodHistoryToolbar>[0]> = {}) => {
  const spies = { onChange: vi.fn(), onReset: vi.fn() };
  const result = render(
    <ThemeProvider theme={testTheme}>
      <PodHistoryToolbar
        filters={DEFAULT_POD_HISTORY_FILTERS}
        categories={CATEGORIES}
        {...spies}
        {...over}
      />
    </ThemeProvider>
  );
  return { ...result, spies };
};

const openMenus = (container: HTMLElement) => {
  for (const control of container.querySelectorAll<HTMLElement>('button')) {
    fireEvent.click(control);
  }
};

/** The category pickers are MUI Selects inside the filter menu, so their
 * options only exist once the combobox itself has been opened. */
const openSelects = () => {
  for (const box of document.body.querySelectorAll<HTMLElement>('[role="combobox"]')) {
    fireEvent.mouseDown(box);
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('the category helpers', () => {
  it('lists only the supers as supers', () => {
    expect(superCategories(CATEGORIES).map((item) => item.name)).toEqual(['Sports', 'Music']);
  });

  it('offers only the categories UNDER the chosen super', () => {
    expect(categoriesUnder(CATEGORIES, 'sup-1').map((item) => item.name)).toEqual([
      'Badminton',
      'Football',
    ]);
    expect(categoriesUnder(CATEGORIES, 'sup-2').map((item) => item.name)).toEqual(['Guitar']);
  });

  it('offers nothing before a super has been chosen', () => {
    expect(categoriesUnder(CATEGORIES, '')).toEqual([]);
  });

  it('counts the filters a member would want reminding of, and not the search box', () => {
    expect(activePodHistoryFilterCount(DEFAULT_POD_HISTORY_FILTERS)).toBe(0);
    expect(activePodHistoryFilterCount({ ...DEFAULT_POD_HISTORY_FILTERS, superId: 'sup-1' })).toBe(1);
    expect(
      activePodHistoryFilterCount({ ...DEFAULT_POD_HISTORY_FILTERS, superId: 'sup-1', categoryId: 'cat-1' })
    ).toBe(2);
    // The search box is on screen and speaks for itself.
    expect(activePodHistoryFilterCount({ ...DEFAULT_POD_HISTORY_FILTERS, search: 'badminton' })).toBe(0);
  });
});

describe('PodHistoryToolbar', () => {
  it('offers a filter and a sort', () => {
    const { container } = toolbar();

    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });

  it('says how many filters are on, so a narrowed history does not look empty', () => {
    const none = toolbar();
    const narrowed = toolbar({
      filters: { ...DEFAULT_POD_HISTORY_FILTERS, superId: 'sup-1', categoryId: 'cat-1' },
    });

    expect(narrowed.container.textContent).toContain('2');
    expect(none.container.textContent).not.toContain('2');
  });

  it('offers every super to narrow by', () => {
    const { container } = toolbar();

    openMenus(container);
    openSelects();

    expect(document.body.textContent).toContain('Sports');
    expect(document.body.textContent).toContain('Music');
  });

  it('offers only the categories under the chosen super', () => {
    const { container } = toolbar({ filters: { ...DEFAULT_POD_HISTORY_FILTERS, superId: 'sup-2' } });

    openMenus(container);
    openSelects();

    // Offering "Badminton" under "Music" returns nothing and reads as the
    // history being broken rather than the filter being wrong.
    expect(document.body.textContent).toContain('Guitar');
    expect(document.body.textContent).not.toContain('Badminton');
  });

  it('reports a whole filter object back, never a partial one', () => {
    const { container, spies } = toolbar();

    openMenus(container);
    openSelects();
    for (const item of [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"]')].slice(0, 8)) {
      fireEvent.click(item);
    }

    for (const [next] of spies.onChange.mock.calls) {
      expect(next).toHaveProperty('superId');
      expect(next).toHaveProperty('categoryId');
      expect(next).toHaveProperty('sort');
      expect(next).toHaveProperty('search');
    }
  });

  it('offers every sort the list supports', () => {
    const { container } = toolbar();

    openMenus(container);

    expect(document.body.querySelectorAll('[role="menuitem"]').length).toBeGreaterThan(1);
  });

  it('opens on the sort a member already chose', () => {
    const { container } = toolbar({ filters: { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'PRICE_ASC' } });

    expect(container.innerHTML).not.toBe('');
  });


  it('resets through the caller rather than clearing the filters itself', () => {
    const { container, spies } = toolbar({
      filters: { ...DEFAULT_POD_HISTORY_FILTERS, superId: 'sup-1', categoryId: 'cat-1' },
    });

    openMenus(container);
    for (const item of document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
      fireEvent.click(item);
    }

    expect(spies.onReset.mock.calls.every((call) => call.length === 0)).toBe(true);
  });

  it('renders before any categories have arrived', () => {
    const { container } = toolbar({ categories: [] });

    openMenus(container);

    expect(container.innerHTML).not.toBe('');
  });
});
