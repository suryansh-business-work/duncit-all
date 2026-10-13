import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import {
  formatFoodMoney,
  priceFoodCartLines,
  type FoodCartLine,
  type VenueFoodItem,
} from '@duncit/utils';

import { FoodCartBar } from '@/components/details/venue-food/FoodCartBar';
import { VenueFoodOrderingScope } from '@/components/details/venue-food/VenueFoodOrderingScope';
import type { FoodOrdering } from '@/hooks/useFoodOrdering';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { renderWithProviders } from '@/utils/test-utils';

let mockOrdering: FoodOrdering;
jest.mock('@/hooks/useFoodOrdering', () => ({ useFoodOrdering: () => mockOrdering }));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ gstPct: 0, currency: '₹' }),
}));
// The sheet brings the checkout form and the payment web view; the scope only places it.
jest.mock('@/components/details/venue-food/FoodCartSheet', () => ({
  FoodCartSheet: () => null,
}));

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: '',
  category: 'Drinks',
  price: 120,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const priceOf = (lines: FoodCartLine[]) => priceFoodCartLines(lines, 0);

describe('FoodCartBar (floating cart button)', () => {
  it('is not drawn while the cart is empty', () => {
    renderWithProviders(<FoodCartBar price={priceOf([])} currency="₹" onOpen={jest.fn()} />);
    expect(screen.queryByTestId('food-cart-bar')).toBeNull();
    expect(screen.queryByTestId('food-cart-bar-open')).toBeNull();
  });

  it('shows one item and its total, names itself with both, and opens the cart', () => {
    const onOpen = jest.fn();
    const price = priceOf([{ item: dish(), quantity: 1 }]);
    renderWithProviders(<FoodCartBar price={price} currency="₹" onOpen={onOpen} />);

    const total = formatFoodMoney(120, '₹');
    expect(screen.getByTestId('food-cart-bar-summary')).toHaveTextContent('1 item');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent(total);
    const button = screen.getByTestId('food-cart-bar-open');
    expect(button.props['aria-label']).toBe(`View cart, 1 item, ${total}`);

    fireEvent.press(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('counts every unit across dishes and totals them', () => {
    const price = priceOf([
      { item: dish(), quantity: 2 },
      { item: dish({ id: 'samosa', name: 'Samosa', price: 40 }), quantity: 3 },
    ]);
    renderWithProviders(<FoodCartBar price={price} currency="₹" onOpen={jest.fn()} />);

    const total = formatFoodMoney(360, '₹');
    expect(screen.getByTestId('food-cart-bar-summary')).toHaveTextContent('5 items');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent(total);
    expect(screen.getByTestId('food-cart-bar-open').props['aria-label']).toBe(
      `View cart, 5 items, ${total}`,
    );
  });

  it('floats in the bottom-right corner rather than spanning the screen', () => {
    const price = priceOf([{ item: dish(), quantity: 1 }]);
    renderWithProviders(<FoodCartBar price={price} currency="₹" onOpen={jest.fn()} />);
    expect(screen.getByTestId('food-cart-bar').props.style).toMatchObject({
      position: 'absolute',
      right: 16,
      bottom: 16,
    });
    expect(screen.getByTestId('food-cart-bar').props.style.left).toBeUndefined();
  });
});

describe('VenueFoodOrderingScope', () => {
  const venue = {
    id: 'v1',
    offers_food: true,
    food_menu: [dish()],
    food_ordering: { enabled: true, discount_pct: 0 },
  } as unknown as PublicVenueDetails;

  const ordering = (lines: FoodCartLine[], canOrder = true) =>
    ({
      cart: { lines, price: priceOf(lines) },
      canOrder,
      openSheet: jest.fn(),
    }) as unknown as FoodOrdering;

  const renderScope = () =>
    renderWithProviders(
      <VenueFoodOrderingScope venue={venue} onRefresh={jest.fn()}>
        <Text>menu</Text>
      </VenueFoodOrderingScope>,
    );

  it('opens the cart sheet from the floating button', () => {
    mockOrdering = ordering([{ item: dish(), quantity: 2 }]);
    renderScope();
    expect(screen.getByText('menu')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('food-cart-bar-open'));
    expect(mockOrdering.openSheet).toHaveBeenCalledTimes(1);
  });

  it('keeps the button away while the cart is empty or the venue is not taking orders', () => {
    mockOrdering = ordering([]);
    const first = renderScope();
    expect(screen.queryByTestId('food-cart-bar')).toBeNull();
    first.unmount();

    mockOrdering = ordering([{ item: dish(), quantity: 1 }], false);
    renderScope();
    expect(screen.queryByTestId('food-cart-bar')).toBeNull();
  });
});
