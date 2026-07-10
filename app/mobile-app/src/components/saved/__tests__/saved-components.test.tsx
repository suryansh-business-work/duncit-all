import { fireEvent, screen } from '@testing-library/react-native';

import { SavedFilterSheet } from '@/components/saved/SavedFilterSheet';
import { SavedSortSheet } from '@/components/saved/SavedSortSheet';
import { SavedToolbar } from '@/components/saved/SavedToolbar';
import { SavedPodSort } from '@/generated/graphql/graphql';
import { DEFAULT_SAVED_FILTERS, type SavedCategory, type SavedFilters } from '@/utils/saved-filter';
import { renderWithProviders } from '@/utils/test-utils';

const catsTree: SavedCategory[] = [
  { id: 's1', name: 'For You', level: 'SUPER', parent_id: null },
  { id: 's2', name: 'Pets', level: 'SUPER', parent_id: null },
  { id: 'c1', name: 'Sports', level: 'CATEGORY', parent_id: 's1' },
  { id: 'sub1', name: 'Cricket', level: 'SUB', parent_id: 'c1' },
];

describe('SavedToolbar', () => {
  it('fires filter + sort and hides the badge when no filter is active', () => {
    const onFilter = jest.fn();
    const onSort = jest.fn();
    renderWithProviders(<SavedToolbar filterCount={0} onFilter={onFilter} onSort={onSort} />);
    fireEvent.press(screen.getByTestId('saved-filter-button'));
    fireEvent.press(screen.getByTestId('saved-sort-button'));
    expect(onFilter).toHaveBeenCalled();
    expect(onSort).toHaveBeenCalled();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows the active count badge', () => {
    renderWithProviders(<SavedToolbar filterCount={2} onFilter={jest.fn()} onSort={jest.fn()} />);
    expect(screen.getByText('2')).toBeOnTheScreen();
  });
});

const renderFilter = (over: Partial<Parameters<typeof SavedFilterSheet>[0]> = {}) => {
  const props = {
    open: true,
    filters: DEFAULT_SAVED_FILTERS as SavedFilters,
    categories: catsTree,
    onChange: jest.fn(),
    onReset: jest.fn(),
    onClose: jest.fn(),
    ...over,
  };
  renderWithProviders(<SavedFilterSheet {...props} />);
  return props;
};

describe('SavedFilterSheet', () => {
  it('does not render its body when closed', () => {
    renderFilter({ open: false });
    expect(screen.queryByTestId('saved-filter-sheet')).toBeNull();
  });

  it('gates Category behind Super and Sub behind Category', () => {
    renderFilter();
    expect(screen.getByTestId('saved-cat-hint')).toBeOnTheScreen();
    expect(screen.getByTestId('saved-sub-hint')).toBeOnTheScreen();
  });

  it('selects a Super and clears its children', () => {
    const { onChange } = renderFilter({ filters: { ...DEFAULT_SAVED_FILTERS, subId: 'x' } });
    fireEvent.press(screen.getByTestId('saved-super-s1'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ superId: 's1', categoryId: '', subId: '' }),
    );
  });

  it('toggles a selected Super off', () => {
    const { onChange } = renderFilter({ filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1' } });
    fireEvent.press(screen.getByTestId('saved-super-s1'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ superId: '' }));
  });

  it('selects a Category and clears the sub', () => {
    const { onChange } = renderFilter({
      filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1', subId: 'x' },
    });
    fireEvent.press(screen.getByTestId('saved-cat-c1'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c1', subId: '' }));
  });

  it('toggles a selected Category off', () => {
    const { onChange } = renderFilter({
      filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1', categoryId: 'c1' },
    });
    fireEvent.press(screen.getByTestId('saved-cat-c1'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: '' }));
  });

  it('selects a Sub category', () => {
    const { onChange } = renderFilter({
      filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1', categoryId: 'c1' },
    });
    fireEvent.press(screen.getByTestId('saved-sub-sub1'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subId: 'sub1' }));
  });

  it('toggles a selected Sub off', () => {
    const { onChange } = renderFilter({
      filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1', categoryId: 'c1', subId: 'sub1' },
    });
    fireEvent.press(screen.getByTestId('saved-sub-sub1'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subId: '' }));
  });

  it('resets and closes via its controls', () => {
    const { onReset, onClose } = renderFilter({
      filters: { ...DEFAULT_SAVED_FILTERS, superId: 's1' },
    });
    fireEvent.press(screen.getByTestId('saved-filter-reset'));
    fireEvent.press(screen.getByTestId('saved-filter-close'));
    fireEvent.press(screen.getByTestId('saved-filter-done'));
    expect(onReset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('SavedSortSheet', () => {
  it('does not render its body when closed', () => {
    renderWithProviders(
      <SavedSortSheet
        open={false}
        value={SavedPodSort.Recent}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('saved-sort-sheet')).toBeNull();
  });

  it('selects a sort (closing the sheet) and closes from the X button', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <SavedSortSheet open value={SavedPodSort.Recent} onClose={onClose} onSelect={onSelect} />,
    );
    fireEvent.press(screen.getByTestId('saved-sort-PRICE_HIGH'));
    expect(onSelect).toHaveBeenCalledWith(SavedPodSort.PriceHigh);
    fireEvent.press(screen.getByTestId('saved-sort-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
