import { fireEvent, screen } from '@testing-library/react-native';

import { AppHeader } from '@/components/AppHeader';
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

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER' });
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

  it('hides search + location in a studio mode (focused header)', () => {
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-search')).toBeNull();
    expect(screen.queryByTestId('header-location')).toBeNull();
    expect(screen.getByTestId('header-studio-badge')).toBeOnTheScreen();
  });

  it('treats a missing user as no roles, so any persisted studio falls back to User', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
  });
});
