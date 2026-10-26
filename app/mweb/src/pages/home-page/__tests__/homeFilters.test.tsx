import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ReactNode } from 'react';

import FilterBar from '../FilterBar';
import FilterMenu from '../FilterMenu';
import HomeSearch from '../HomeSearch';
import PreviousPodsRail from '../PreviousPodsRail';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ openPod: vi.fn() }));

vi.mock('../../../lib/open-pod', () => ({ openPod: h.openPod }));
vi.mock('../PodCard', () => ({
  default: (p: { pod: { id: string }; hostName: string | null; onOpen: () => void }) => (
    <button data-testid={`pod-${p.pod.id}`} data-host={p.hostName ?? ''} onClick={p.onOpen} />
  ),
}));

const Where = () => {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
};
const inRouter = (ui: ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const chips = [
  { id: 'cat1', name: 'Sports', level: 'CATEGORY' },
  { id: 'sub1', name: 'Yoga', level: 'SUB' },
];
const barProps = (over: Record<string, unknown> = {}) => ({
  categoryChips: chips,
  categoryId: '',
  setCategoryId: vi.fn(),
  priceFilter: 'ALL' as const,
  setPriceFilter: vi.fn(),
  dateFilter: 'ALL' as const,
  setDateFilter: vi.fn(),
  sortBy: 'DATE_ASC' as const,
  setSortBy: vi.fn(),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('FilterBar', () => {
  it('lists the categories with sub-categories hash-marked, and selects one', () => {
    const props = barProps();
    render(<FilterBar {...props} />);
    expect(screen.getByTestId('filter-cat-cat1')).toHaveTextContent('Sports');
    expect(screen.getByTestId('filter-cat-sub1')).toHaveTextContent('# Yoga');
    fireEvent.click(screen.getByTestId('filter-cat-sub1'));
    expect(props.setCategoryId).toHaveBeenCalledWith('sub1');
  });

  it('clears the category from All, and deselects a selected category by tapping it again', () => {
    const props = barProps({ categoryId: 'cat1' });
    render(<FilterBar {...props} />);
    fireEvent.click(screen.getByTestId('filter-cat-all'));
    expect(props.setCategoryId).toHaveBeenLastCalledWith('');
    fireEvent.click(screen.getByTestId('filter-cat-cat1'));
    expect(props.setCategoryId).toHaveBeenLastCalledWith('');
  });

  it('keeps a selected sub-category in the solid style', () => {
    render(<FilterBar {...barProps({ categoryId: 'sub1' })} />);
    expect(screen.getByTestId('filter-cat-sub1')).toHaveClass('MuiChip-filled');
    expect(screen.getByTestId('filter-cat-all')).toHaveClass('MuiChip-outlined');
  });

  it('shows no category row when there are no categories', () => {
    render(<FilterBar {...barProps({ categoryChips: [] })} />);
    expect(screen.queryByTestId('filter-cat-all')).not.toBeInTheDocument();
  });

  it('sets the price and date filters', () => {
    const props = barProps({ priceFilter: 'FREE', dateFilter: 'WEEK' });
    render(<FilterBar {...props} />);
    expect(screen.getByTestId('filter-price-FREE')).toHaveClass('MuiChip-filled');
    expect(screen.getByTestId('filter-price-ALL')).toHaveClass('MuiChip-outlined');
    expect(screen.getByTestId('filter-date-WEEK')).toHaveClass('MuiChip-filled');
    fireEvent.click(screen.getByTestId('filter-price-PAID'));
    fireEvent.click(screen.getByTestId('filter-date-TOMORROW'));
    expect(props.setPriceFilter).toHaveBeenCalledWith('PAID');
    expect(props.setDateFilter).toHaveBeenCalledWith('TOMORROW');
  });

  it('changes the sort order, and hides the sort control where the order is fixed', async () => {
    const props = barProps();
    const { unmount } = render(<FilterBar {...props} />);
    fireEvent.mouseDown(screen.getByTestId('filter-sort').querySelector('[role="combobox"]') as HTMLElement);
    fireEvent.click(await screen.findByTestId('filter-sort-PRICE_DESC'));
    expect(props.setSortBy).toHaveBeenCalledWith('PRICE_DESC');
    unmount();
    render(<FilterBar {...barProps()} showSort={false} />);
    expect(screen.queryByTestId('filter-sort')).not.toBeInTheDocument();
  });
});

describe('FilterMenu', () => {
  it('opens a sheet from the pill trigger and closes it with Done', async () => {
    render(<FilterMenu {...barProps()} />);
    expect(screen.getByTestId('home-filter-button')).toHaveAccessibleName(fallbackT('mweb.explore.openFilters'));
    fireEvent.click(screen.getByTestId('home-filter-button'));
    expect(await screen.findByTestId('filter-bar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('home-filter-done'));
    await waitFor(() => expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument());
  });

  it('counts the active filters in the trigger name and resets them all', async () => {
    const props = barProps({ categoryId: 'cat1', priceFilter: 'PAID', dateFilter: 'TODAY', sortBy: 'PRICE_ASC' });
    render(<FilterMenu {...props} round />);
    expect(screen.getByTestId('home-filter-button')).toHaveAccessibleName(fallbackT('mweb.a11y.openFiltersActive', { vars: { count: 4 } }));
    fireEvent.click(screen.getByTestId('home-filter-button'));
    fireEvent.click(await screen.findByTestId('home-filter-reset'));
    expect(props.setCategoryId).toHaveBeenCalledWith('');
    expect(props.setPriceFilter).toHaveBeenCalledWith('ALL');
    expect(props.setDateFilter).toHaveBeenCalledWith('ALL');
    expect(props.setSortBy).toHaveBeenCalledWith('DATE_ASC');
  });

  it('has nothing to reset when no filter is active', async () => {
    render(<FilterMenu {...barProps()} />);
    fireEvent.click(screen.getByTestId('home-filter-button'));
    expect(await screen.findByTestId('home-filter-reset')).toBeDisabled();
  });

  it('is controlled by the page when it passes open state', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<FilterMenu {...barProps()} open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('home-filter-button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument();
    rerender(<FilterMenu {...barProps()} open onOpenChange={onOpenChange} />);
    fireEvent.click(await screen.findByTestId('home-filter-done'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('cannot be opened when disabled, for either trigger', () => {
    const { unmount } = render(<FilterMenu {...barProps()} disabled />);
    expect(screen.getByTestId('home-filter-button')).toBeDisabled();
    unmount();
    render(<FilterMenu {...barProps()} disabled round />);
    expect(screen.getByTestId('home-filter-button')).toBeDisabled();
  });
});

describe('HomeSearch', () => {
  it('opens the search page on tap, Enter or Space, but not other keys or focus', () => {
    inRouter(<HomeSearch />);
    const input = screen.getByTestId('home-search-input');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'a' });
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('where')).toHaveTextContent('/search');
  });

  it('opens on tap and on Space', () => {
    const { unmount } = inRouter(<HomeSearch />);
    fireEvent.click(screen.getByTestId('home-search'));
    expect(screen.getByTestId('where')).toHaveTextContent('/search');
    unmount();
    inRouter(<HomeSearch />);
    fireEvent.keyDown(screen.getByTestId('home-search-input'), { key: ' ' });
    expect(screen.getByTestId('where')).toHaveTextContent('/search');
  });

  it('does nothing when disabled', () => {
    inRouter(<HomeSearch disabled />);
    fireEvent.click(screen.getByTestId('home-search'));
    fireEvent.keyDown(screen.getByTestId('home-search-input'), { key: 'Enter' });
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });
});

describe('PreviousPodsRail', () => {
  const pods = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, pod_id: `s${i}`, club_slug: 'c' }));

  it('is hidden with no past pods', () => {
    const { container } = inRouter(<PreviousPodsRail pods={[]} hostNameOf={() => null} filtered={false} />);
    expect(container.querySelector('[data-testid="previous-pods-rail"]')).toBeNull();
  });

  it('lists the pods with their hosts, opens one, and links to the full page', () => {
    inRouter(<PreviousPodsRail pods={pods(2)} hostNameOf={(p) => (p.id === 'p0' ? 'Asha' : null)} filtered={false} />);
    expect(screen.getByTestId('pod-p0')).toHaveAttribute('data-host', 'Asha');
    expect(screen.getByTestId('pod-p1')).toHaveAttribute('data-host', '');
    fireEvent.click(screen.getByTestId('pod-p1'));
    expect(h.openPod).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ id: 'p1' }));
    expect(screen.queryByTestId('see-all-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('previous-pods-see-all'));
    expect(screen.getByTestId('where')).toHaveTextContent('/previous-pods');
  });

  it('caps the rail at ten and continues on the full page right after the last pod', () => {
    inRouter(<PreviousPodsRail pods={pods(13)} hostNameOf={() => null} filtered={false} />);
    expect(screen.getAllByTestId(/^pod-p/)).toHaveLength(10);
    expect(screen.getByTestId('see-all-card')).toHaveTextContent('3');
    fireEvent.click(screen.getByTestId('see-all-card'));
    expect(screen.getByTestId('where')).toHaveTextContent('/previous-pods?from=10');
  });

  it('drops the count and the jump when a filter narrows the rail', () => {
    inRouter(<PreviousPodsRail pods={pods(13)} hostNameOf={() => null} filtered />);
    fireEvent.click(screen.getByTestId('see-all-card'));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/previous-pods$/);
  });
});
