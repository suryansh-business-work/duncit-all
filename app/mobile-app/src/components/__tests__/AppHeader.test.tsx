import { fireEvent, screen } from '@testing-library/react-native';

import { AppHeader } from '@/components/AppHeader';
import { useCartStore, type CartLine } from '@/stores/cart.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
const mockUseMe = jest.fn();
jest.mock('@/hooks/useMe', () => ({ useMe: () => mockUseMe() }));
jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { home_header_tagline: 'It All Starts Here!' } } }),
}));
jest.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({ cityLabel: 'Mumbai', countryCode: 'IN' }),
}));

// Children are unit-tested on their own; here we just assert composition.
jest.mock('@/components/LocationDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    LocationDialog: ({ open }: { open: boolean }) => (open ? <V testID="location-dialog" /> : null),
  };
});
jest.mock('@/components/LogoutButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { LogoutButton: () => <V testID="logout-button" /> };
});
jest.mock('@/components/AccountButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AccountButton: () => <V testID="account-button" /> };
});

/** The header now carries the cart entry point (it used to float over content). */
const seedCart = (quantity: number) => {
  const line: CartLine = {
    pod_id: 'p1',
    pod_title: 'Sunset Jam',
    club_slug: 'club-one',
    product_id: 'a',
    variant_id: '',
    variant_label: '',
    product_name: 'Alpha Tee',
    image_url: '',
    unit_cost: 100,
    quantity,
    max_quantity: 10,
  };
  useCartStore.setState({ lines: [line], hydrated: true });
};

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER' });
  useCartStore.setState({ lines: [], hydrated: true });
  mockUseMe.mockReturnValue({ data: { me: { roles: ['HOST'] } } });
});

describe('AppHeader', () => {
  it('renders the greeting tagline + account avatar and no studio badge in User mode', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('app-header')).toBeOnTheScreen();
    expect(screen.getByTestId('account-button')).toBeOnTheScreen();
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('It All Starts Here!');
    expect(screen.queryByTestId('logout-button')).toBeNull();
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
  });

  it('shows the tappable location in User mode and opens the picker on press', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-location')).toBeOnTheScreen();
    expect(screen.queryByTestId('location-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('header-location'));
    expect(screen.getByTestId('location-dialog')).toBeOnTheScreen();
  });

  it('shows the studio badge, closes via backdrop, and switches mode back to User', () => {
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-studio-badge')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('header-studio-badge'));
    fireEvent.press(screen.getByTestId('studio-switch-backdrop'));
    // Reopen and switch back to User.
    fireEvent.press(screen.getByTestId('header-studio-badge'));
    fireEvent.press(screen.getByTestId('studio-switch-USER'));
    fireEvent.press(screen.getByTestId('studio-switch-confirm'));
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
  });

  it('falls back to a plain logout button in minimal (survey) mode', () => {
    renderWithProviders(<AppHeader minimal />);
    expect(screen.getByTestId('logout-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('account-button')).toBeNull();
  });

  it('shows the greeting title but no location row in minimal mode', () => {
    renderWithProviders(<AppHeader minimal />);
    expect(screen.getByTestId('header-greeting-title')).toBeOnTheScreen();
    expect(screen.queryByTestId('header-location')).toBeNull();
  });

  it('opens the Search screen when the search icon is tapped', () => {
    renderWithProviders(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-search'));
    expect(mockNavigate).toHaveBeenCalledWith('Search');
  });

  it('hides the search icon in minimal mode', () => {
    renderWithProviders(<AppHeader minimal />);
    expect(screen.queryByTestId('header-search')).toBeNull();
  });

  it('hides search but keeps the location switcher in a studio mode', () => {
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-search')).toBeNull();
    expect(screen.getByTestId('header-studio-badge')).toBeOnTheScreen();
    expect(screen.getByTestId('header-location')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('header-location'));
    expect(screen.getByTestId('location-dialog')).toBeOnTheScreen();
  });

  it('carries the cart entry point once the cart has items', () => {
    seedCart(3);
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('3');
    expect(screen.getByLabelText('Open cart (3 items)')).toBeOnTheScreen();
  });

  it('shows no cart entry point while the cart is empty', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });

  it('keeps the cart entry point in a studio mode, where the fab used to float', () => {
    seedCart(2);
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-cart')).toBeOnTheScreen();
  });

  it('hides the cart entry point in minimal (survey) mode', () => {
    seedCart(2);
    renderWithProviders(<AppHeader minimal />);
    expect(screen.queryByTestId('header-cart')).toBeNull();
  });

  it('treats a missing user as no roles, so any persisted studio falls back to User', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
  });
});
