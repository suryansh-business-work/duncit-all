import { fireEvent, screen } from '@testing-library/react-native';

import { HomeFilterSheet } from '@/components/home/HomeFilterSheet';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import type { HomeCategory } from '@/hooks/useHomeFeed';
import { DEFAULT_HOME_FILTERS } from '@/utils/home-filters';
import { renderWithProviders } from '@/utils/test-utils';

const categories = [
  { id: 'c1', name: 'Music', slug: 'music', level: 'CATEGORY', parent_id: null },
  { id: 'c2', name: 'Jazz', slug: 'jazz', level: 'SUB', parent_id: 'c1' },
] as unknown as HomeCategory[];

function setup(overrides: Partial<React.ComponentProps<typeof HomeFilterSheet>> = {}) {
  const props = {
    open: true,
    onClose: jest.fn(),
    categoryChips: categories,
    categoryId: '',
    onCategory: jest.fn(),
    filters: DEFAULT_HOME_FILTERS,
    onChange: jest.fn(),
    onReset: jest.fn(),
    ...overrides,
  };
  renderWithProviders(<HomeFilterSheet {...props} />);
  return props;
}

describe('HomeFilterSheet', () => {
  it('selects a price bucket', () => {
    const props = setup();
    fireEvent.press(screen.getByTestId('filter-price-FREE'));
    expect(props.onChange).toHaveBeenCalledWith({ ...DEFAULT_HOME_FILTERS, price: 'FREE' });
  });

  it('selects a date window and a sort order', () => {
    const props = setup();
    fireEvent.press(screen.getByTestId('filter-date-TODAY'));
    expect(props.onChange).toHaveBeenCalledWith({ ...DEFAULT_HOME_FILTERS, date: 'TODAY' });
    fireEvent.press(screen.getByTestId('filter-sort-PRICE_DESC'));
    expect(props.onChange).toHaveBeenCalledWith({ ...DEFAULT_HOME_FILTERS, sort: 'PRICE_DESC' });
  });

  it('selects and toggles a category (sub chips get a # prefix)', () => {
    const props = setup({ categoryId: 'c2' });
    expect(screen.getByText('# Jazz')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('filter-cat-c1'));
    expect(props.onCategory).toHaveBeenCalledWith('c1');
    // Re-tapping the active category clears it.
    fireEvent.press(screen.getByTestId('filter-cat-c2'));
    expect(props.onCategory).toHaveBeenCalledWith('');
  });

  it('clears the category via the All chip', () => {
    const props = setup({ categoryId: 'c1' });
    fireEvent.press(screen.getByTestId('filter-cat-all'));
    expect(props.onCategory).toHaveBeenCalledWith('');
  });

  it('hides the category section when there are no chips', () => {
    setup({ categoryChips: [] });
    expect(screen.queryByTestId('filter-cat-all')).toBeNull();
  });

  it('resets, closes from the X and applies via Done', () => {
    const props = setup({ filters: { price: 'FREE', date: 'TODAY', sort: 'DATE_ASC' } });
    fireEvent.press(screen.getByTestId('home-filter-reset'));
    expect(props.onReset).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('home-filter-close'));
    fireEvent.press(screen.getByTestId('home-filter-done'));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});

describe('OptionChipRow layouts', () => {
  it('renders the wrap layout by default', () => {
    renderWithProviders(
      <OptionChipRow
        testIDPrefix="x"
        options={[['a', 'A'] as const]}
        value="a"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('x-a')).toBeOnTheScreen();
  });
});
