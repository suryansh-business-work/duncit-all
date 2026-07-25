import { fireEvent, screen } from '@testing-library/react-native';

import { ShopFilterBar } from '@/components/shop/ShopFilterBar';
import type { ShopSort } from '@/screens/ShopScreen';
import { renderWithProviders } from '@/utils/test-utils';

const SORT_OPTIONS = [
  ['NAME', 'Name'],
  ['PRICE_ASC', 'Price ↑'],
  ['PRICE_DESC', 'Price ↓'],
] as const satisfies readonly (readonly [ShopSort, string])[];

const setup = (over: Partial<Parameters<typeof ShopFilterBar>[0]> = {}) => {
  const props = {
    query: '',
    onQueryChange: jest.fn(),
    categoryOptions: [
      ['sup1', 'Lifestyle'],
      ['sup2', 'Food'],
    ] as (readonly [string, string])[],
    categoryId: '',
    onCategoryChange: jest.fn(),
    sortOptions: SORT_OPTIONS,
    sort: 'NAME' as ShopSort,
    onSortChange: jest.fn(),
    muted: '#888888',
    ...over,
  };
  renderWithProviders(<ShopFilterBar {...props} />);
  return props;
};

describe('ShopFilterBar', () => {
  it('keeps filters hidden until the filter button is pressed, then hides again', () => {
    setup();
    expect(screen.queryByTestId('shop-filter-count')).toBeNull();
    expect(screen.queryByTestId('shop-cat-all')).toBeNull();

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.getByTestId('shop-cat-all')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-sort-NAME')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.queryByTestId('shop-cat-all')).toBeNull();
  });

  it('shows an active-count badge and forwards search/category/sort changes', () => {
    const props = setup({ categoryId: 'sup1', sort: 'PRICE_ASC' });
    expect(screen.getByTestId('shop-filter-count')).toHaveTextContent('2');

    fireEvent.changeText(screen.getByTestId('shop-search-input'), 'abc');
    expect(props.onQueryChange).toHaveBeenCalledWith('abc');

    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    fireEvent.press(screen.getByTestId('shop-cat-sup2'));
    expect(props.onCategoryChange).toHaveBeenCalledWith('sup2');
    fireEvent.press(screen.getByTestId('shop-sort-PRICE_DESC'));
    expect(props.onSortChange).toHaveBeenCalledWith('PRICE_DESC');
  });

  it('omits the category rail when there are no categories', () => {
    setup({ categoryOptions: [] });
    fireEvent.press(screen.getByTestId('shop-filter-toggle'));
    expect(screen.queryByTestId('shop-cat-all')).toBeNull();
    expect(screen.getByTestId('shop-sort-NAME')).toBeOnTheScreen();
  });
});
