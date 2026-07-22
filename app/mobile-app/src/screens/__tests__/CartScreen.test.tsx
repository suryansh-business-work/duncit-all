import { fireEvent, screen } from '@testing-library/react-native';

import { CartScreen } from '@/screens/CartScreen';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { FloatingCartButton } from '@/components/cart/FloatingCartButton';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/cart', () => ({
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
let mockRouteName: string | null = 'Home';
// CartScreen navigates via the useNavigation hook.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: mockNavigate }),
}));
// FloatingCartButton lives outside the navigator and navigates via the container ref.
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    getCurrentRoute: () => (mockRouteName === null ? undefined : { name: mockRouteName }),
    // Lazy: the factory is hoisted above `mockNavigate`, so read it at call time.
    navigate: (name: string) => mockNavigate(name),
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
  mockRouteName = 'Home';
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

  it('proceeds to checkout for one pod group with the variant-aware lines', () => {
    useCartStore.setState({
      lines: [
        line(),
        line({
          product_id: 'a',
          variant_id: 'v1',
          unit_cost: 120,
          quantity: 1,
          variant_label: 'L',
        }),
      ],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    fireEvent.press(screen.getByTestId('cart-checkout-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('Checkout', {
      podId: 'p1',
      selectedProducts: [
        { product_id: 'a', variant_id: '', quantity: 2, unit_cost: 100 },
        { product_id: 'a', variant_id: 'v1', quantity: 1, unit_cost: 120 },
      ],
    });
  });

  it('clears every pod group from the Clear cart action', () => {
    useCartStore.setState({
      lines: [line(), line({ pod_id: 'p2', product_id: 'b' })],
      hydrated: true,
    });
    renderWithProviders(<CartScreen />);
    fireEvent.press(screen.getByTestId('cart-clear'));
    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe('FloatingCartButton', () => {
  it('hides when the cart is empty and on the Cart/Checkout screens', () => {
    renderWithProviders(<FloatingCartButton />);
    expect(screen.queryByTestId('floating-cart-button')).toBeNull();

    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = 'Cart';
    renderWithProviders(<FloatingCartButton />);
    expect(screen.queryByTestId('floating-cart-button')).toBeNull();
  });

  it('shows the badge count and opens the cart', () => {
    useCartStore.setState({ lines: [line({ quantity: 2 })], hydrated: true });
    renderWithProviders(<FloatingCartButton />);
    expect(screen.getByTestId('floating-cart-count')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('floating-cart-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Cart');
  });

  it('caps the badge at 99+', () => {
    useCartStore.setState({ lines: [line({ quantity: 120, max_quantity: 200 })], hydrated: true });
    renderWithProviders(<FloatingCartButton />);
    expect(screen.getByTestId('floating-cart-count')).toHaveTextContent('99+');
  });

  it('still renders while the navigation state has not settled yet', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = null; // navigation state undefined during container start-up
    renderWithProviders(<FloatingCartButton />);
    expect(screen.getByTestId('floating-cart-button')).toBeOnTheScreen();
  });
});

describe('CartPodGroup line rendering', () => {
  it('renders an image-less line with the placeholder box', () => {
    useCartStore.setState({ lines: [line({ image_url: '' })], hydrated: true });
    renderWithProviders(<CartScreen />);
    expect(screen.getByText('Alpha Tee')).toBeOnTheScreen();
  });
});
