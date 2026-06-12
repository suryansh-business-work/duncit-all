import { fireEvent, screen } from '@testing-library/react-native';

import { AppHeader } from '@/components/AppHeader';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockFetch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate }),
}));
jest.mock('@/stores/home.store', () => ({
  useHomeStore: { getState: () => ({ fetch: mockFetch }) },
}));
const mockUseMe = jest.fn();
jest.mock('@/hooks/useMe', () => ({ useMe: () => mockUseMe() }));

// Children are unit-tested on their own; here we just assert composition.
jest.mock('@/components/AuthLogo', () => ({ AuthLogo: () => null }));
jest.mock('@/components/Mascot', () => ({ Mascot: () => null }));
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
  it('renders the brand row with the account avatar and no studio badge in User mode', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('app-header')).toBeOnTheScreen();
    expect(screen.getByTestId('account-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('logout-button')).toBeNull();
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
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

  it('returns to the Home tab and refreshes the feed when the logo is tapped', () => {
    renderWithProviders(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-logo'));
    expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'HomeTab' });
    expect(mockFetch).toHaveBeenCalledWith(true);
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
    expect(screen.queryByTestId('location-button')).toBeNull();
    expect(screen.getByTestId('header-studio-badge')).toBeOnTheScreen();
  });

  it('treats a missing user as no roles, so any persisted studio falls back to User', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    useStudioModeStore.setState({ mode: 'HOST' });
    renderWithProviders(<AppHeader />);
    expect(screen.queryByTestId('header-studio-badge')).toBeNull();
  });
});
