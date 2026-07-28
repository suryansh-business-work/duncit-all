import { fireEvent, screen } from '@testing-library/react-native';

import { CartScreen } from '@/screens/CartScreen';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/cart', () => ({
  ...jest.requireActual('@/services/cart'),
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
// CartScreen navigates via the useNavigation hook.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: mockNavigate }),
}));
// The StackScreen back-bar carries the header cart, which reads the active
// route (and navigates) through the container ref — parked on Cart here, which
// is where the cart screen actually runs, so the entry point stays hidden.
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'Cart' }),
    navigate: jest.fn(),
    addListener: () => () => undefined,
  },
}));

const line = (over: Partial<CartLine> = {}): CartLine => ({
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_slug: 'club-one',
  product_id: 'a',
  variant_id: '',
  variant_label: '',
  product_name: 'Alpha Tee',
  image_url: 'http://x/a.jpg',
  unit_cost: 100,
  quantity: 2,
  max_quantity: 3,
  ...over,
});

beforeEach(() => {
  mockNavigate.mockClear();
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('CartScreen', () => {
  it('shows the empty state and routes to Home from its CTA', () => {
    renderWithProviders(<CartScreen />);
    expect(screen.getByTestId('cart-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('cart-find-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('groups lines by pod, steps quantities, removes lines and clears the cart', () => {
    useCartStore.setState({
      lines: [
        line(),
        line({
          product_id: 'a',
          variant_id: 'v1',
          variant_label: 'L / Blue',
          unit_cost: 120,
          quantity: 1,
        }),
        line({
          pod_id: 'p2',
          pod_title: 'Beach Bash',
          product_id: 'b',
          product_name: 'Beta Mug',
          quantity: 1,
        }),
      ],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    expect(screen.getByTestId('cart-pod-p1')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-pod-p2')).toBeOnTheScreen();
    expect(screen.getByText('Alpha Tee — L / Blue')).toBeOnTheScreen();

    // + on the base line (2 → 3), then + again is blocked at max (3).
    fireEvent.press(screen.getByTestId('cart-plus-a'));
    expect(
      useCartStore.getState().lines.find((l) => l.pod_id === 'p1' && !l.variant_id)?.quantity,
    ).toBe(3);
    fireEvent.press(screen.getByTestId('cart-plus-a'));
    expect(
      useCartStore.getState().lines.find((l) => l.pod_id === 'p1' && !l.variant_id)?.quantity,
    ).toBe(3);

    // − on the variant line (1 → 0) removes it.
    fireEvent.press(screen.getByTestId('cart-minus-a::v1'));
    expect(useCartStore.getState().lines.some((l) => l.variant_id === 'v1')).toBe(false);

    // Remove the p2 line via its delete icon.
    fireEvent.press(screen.getByTestId('cart-remove-b'));
    expect(useCartStore.getState().lines.some((l) => l.pod_id === 'p2')).toBe(false);
  });

  it('starts ONE cart-wide product checkout with the grand total', () => {
    useCartStore.setState({
      lines: [
        line(),
        line({
          pod_id: 'p2',
          pod_title: 'Beach Bash',
          product_id: 'b',
          unit_cost: 120,
          quantity: 1,
        }),
      ],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    // Grand total across every pod: 2×100 + 1×120.
    expect(screen.getByTestId('cart-total')).toHaveTextContent('₹320');
    fireEvent.press(screen.getByTestId('cart-checkout'));
    // Every line checks out together via the standalone product engine (no
    // per-pod param), never the pod-membership Checkout.
    expect(mockNavigate).toHaveBeenCalledWith('ProductCheckout');
  });

  it('shows the free-delivery badge only on lines that reach their threshold', () => {
    useCartStore.setState({
      lines: [
        line({ free_delivery_above: 200 }),
        line({ product_id: 'b', product_name: 'Beta Mug', quantity: 1, free_delivery_above: 500 }),
      ],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    // 2×100 ≥ 200 qualifies; 1×100 < 500 does not.
    expect(screen.getByTestId('cart-free-delivery-a')).toBeOnTheScreen();
    expect(screen.queryByTestId('cart-free-delivery-b')).toBeNull();
  });

  it('empties the whole cart from the Clear cart action', () => {
    useCartStore.setState({
      lines: [line(), line({ pod_id: 'p2', product_id: 'b' })],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    fireEvent.press(screen.getByTestId('cart-clear'));
    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe('the cart screen carries no cart entry point of its own', () => {
  it('keeps the header cart hidden on Cart, however full the cart is', () => {
    useCartStore.setState({ lines: [line({ quantity: 4 })], hydrated: true });
    renderWithProviders(<CartScreen />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });
});

describe('CartPodGroup line rendering', () => {
  it('renders an image-less line with the placeholder box', () => {
    useCartStore.setState({ lines: [line({ image_url: '' })], hydrated: true });
    renderWithProviders(<CartScreen />);
    expect(screen.getByText('Alpha Tee')).toBeOnTheScreen();
  });
});
