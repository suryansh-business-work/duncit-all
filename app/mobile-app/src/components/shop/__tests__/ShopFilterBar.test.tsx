import { fireEvent, screen } from '@testing-library/react-native';

import { ShopFilterBar } from '@/components/shop/ShopFilterBar';
import type { ShopFilters } from '@/hooks/useShopFilters';
import type { ShopSort } from '@/screens/ShopScreen';
import { renderWithProviders } from '@/utils/test-utils';

const SORT_OPTIONS = [
  ['NAME', 'Name'],
  ['PRICE_ASC', 'Price ↑'],
  ['PRICE_DESC', 'Price ↓'],
] as const satisfies readonly (readonly [ShopSort, string])[];

const makeFilters = (over: Partial<ShopFilters> = {}): ShopFilters => ({
  query: '',
  setQuery: jest.fn(),
  superId: '',
  selectSuper: jest.fn(),
  categoryId: '',
  selectCategory: jest.fn(),
  subId: '',
  setSubId: jest.fn(),
  minRating: '0',
  setMinRating: jest.fn(),
  includeOutOfStock: false,
  setIncludeOutOfStock: jest.fn(),
  sort: 'NAME',
  setSort: jest.fn(),
  superOptions: [['s1', 'Lifestyle']],
  categoryOptions: [['c1', 'Apparel']],
  subOptions: [['b1', 'Tees']],
  activeCount: 0,
  visible: [],
  ...over,
});

const render = (filters: ShopFilters) =>
  renderWithProviders(
    <ShopFilterBar filters={filters} sortOptions={SORT_OPTIONS} muted="#888888" />,
  );

describe('ShopFilterBar', () => {
  it('reveals the cascade + rating + stock + sort and forwards every change', () => {
    const filters = makeFilters();
    render(filters);
    expect(screen.queryByTestId('shop-filter-count')).toBeNull();
    expect(screen.queryByTestId('shop-super-all')).toBeNull();

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.getByTestId('shop-super-all')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-cat-all')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-sub-all')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-rating-0')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-sort-NAME')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('shop-search-input'), 'abc');
    expect(filters.setQuery).toHaveBeenCalledWith('abc');
    fireEvent.press(screen.getByTestId('shop-super-s1'));
    expect(filters.selectSuper).toHaveBeenCalledWith('s1');
    fireEvent.press(screen.getByTestId('shop-cat-c1'));
    expect(filters.selectCategory).toHaveBeenCalledWith('c1');
    fireEvent.press(screen.getByTestId('shop-sub-b1'));
    expect(filters.setSubId).toHaveBeenCalledWith('b1');
    fireEvent.press(screen.getByTestId('shop-rating-4'));
    expect(filters.setMinRating).toHaveBeenCalledWith('4');
    fireEvent.press(screen.getByTestId('shop-sort-PRICE_ASC'));
    expect(filters.setSort).toHaveBeenCalledWith('PRICE_ASC');
    fireEvent.press(screen.getByTestId('shop-oos-toggle'));
    expect(filters.setIncludeOutOfStock).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.queryByTestId('shop-super-all')).toBeNull();
  });

  it('shows the active-count badge, a checked out-of-stock box, and hides empty cascades', () => {
    const filters = makeFilters({
      activeCount: 3,
      includeOutOfStock: true,
      superOptions: [],
      categoryOptions: [],
      subOptions: [],
    });
    render(filters);
    expect(screen.getByTestId('shop-filter-count')).toHaveTextContent('3');

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.queryByTestId('shop-super-all')).toBeNull();
    expect(screen.queryByTestId('shop-cat-all')).toBeNull();
    expect(screen.queryByTestId('shop-sub-all')).toBeNull();
    expect(screen.getByTestId('shop-sort-NAME')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('shop-oos-toggle'));
    expect(filters.setIncludeOutOfStock).toHaveBeenCalledWith(false);
  });
});
