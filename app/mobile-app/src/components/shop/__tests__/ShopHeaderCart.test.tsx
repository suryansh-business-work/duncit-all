import { fireEvent, screen } from '@testing-library/react-native';

import { ShopHeaderCart } from '@/components/shop/ShopHeaderCart';
import { renderWithProviders } from '@/utils/test-utils';

describe('ShopHeaderCart', () => {
  it('shows the unit-count badge and opens the cart on press', () => {
    const onPress = jest.fn();
    renderWithProviders(<ShopHeaderCart count={3} tint="#000000" onPress={onPress} />);
    expect(screen.getByTestId('shop-header-cart-count')).toHaveTextContent('3');
    fireEvent.press(screen.getByTestId('shop-header-cart'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('caps the badge at 99+', () => {
    renderWithProviders(<ShopHeaderCart count={150} tint="#000000" onPress={jest.fn()} />);
    expect(screen.getByTestId('shop-header-cart-count')).toHaveTextContent('99+');
  });

  it('hides the badge when the cart is empty', () => {
    renderWithProviders(<ShopHeaderCart count={0} tint="#000000" onPress={jest.fn()} />);
    expect(screen.queryByTestId('shop-header-cart-count')).toBeNull();
    expect(screen.getByTestId('shop-header-cart')).toBeOnTheScreen();
  });
});
