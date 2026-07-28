import { fireEvent, screen } from '@testing-library/react-native';

import { HeaderCartButton } from '@/components/cart/HeaderCartButton';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/cart', () => ({
  ...jest.requireActual('@/services/cart'),
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
let mockReady = true;
let mockRouteName: string | null = 'Home';
// The button reads the active route (and navigates) through the container ref.
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockReady,
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
  mockReady = true;
  mockRouteName = 'Home';
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('HeaderCartButton', () => {
  it('renders nothing when the cart is empty', () => {
    renderWithProviders(<HeaderCartButton />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });

  it('renders nothing on the Cart screen even with items', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = 'Cart';
    renderWithProviders(<HeaderCartButton />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });

  it('renders nothing on either checkout even with items', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = 'Checkout';
    renderWithProviders(<HeaderCartButton />);
    expect(screen.queryByTestId('header-cart')).toBeNull();

    mockRouteName = 'ProductCheckout';
    renderWithProviders(<HeaderCartButton />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });

  it('shows the aggregated badge count with an accessible name, and opens the cart', () => {
    useCartStore.setState({
      lines: [line({ quantity: 2 }), line({ product_id: 'b', quantity: 3, max_quantity: 5 })],
      hydrated: true,
    });
    renderWithProviders(<HeaderCartButton />);
    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('5');
    expect(screen.getByLabelText('Open cart (5 items)')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('header-cart'));
    expect(mockNavigate).toHaveBeenCalledWith('Cart');
  });

  it('caps the badge at 99+', () => {
    useCartStore.setState({ lines: [line({ quantity: 120, max_quantity: 200 })], hydrated: true });
    renderWithProviders(<HeaderCartButton />);
    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('99+');
  });

  it('now also shows on the Shop screen, which no longer owns a cart of its own', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = 'Shop';
    renderWithProviders(<HeaderCartButton />);
    expect(screen.getByTestId('header-cart')).toBeOnTheScreen();
  });

  it('still renders while the navigation state has not settled yet', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockRouteName = null; // container ready, but no current route yet
    renderWithProviders(<HeaderCartButton />);
    expect(screen.getByTestId('header-cart')).toBeOnTheScreen();
  });

  it('still renders before the navigation container is ready at all', () => {
    useCartStore.setState({ lines: [line()], hydrated: true });
    mockReady = false;
    renderWithProviders(<HeaderCartButton />);
    expect(screen.getByTestId('header-cart')).toBeOnTheScreen();
  });
});
