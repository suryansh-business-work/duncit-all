import { fireEvent, screen } from '@testing-library/react-native';

import { AppHeader } from '@/components/AppHeader';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockFetch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/stores/home.store', () => ({
  useHomeStore: { getState: () => ({ fetch: mockFetch }) },
}));

// Children are unit-tested on their own; here we just assert composition.
jest.mock('@/components/AuthLogo', () => ({ AuthLogo: () => null }));
jest.mock('@/components/Mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/ThemeToggle', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { ThemeToggle: () => <V testID="theme-toggle" /> };
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

describe('AppHeader', () => {
  it('renders the brand row with theme toggle and the account avatar', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('app-header')).toBeOnTheScreen();
    expect(screen.getByTestId('theme-toggle')).toBeOnTheScreen();
    expect(screen.getByTestId('account-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('logout-button')).toBeNull();
  });

  it('falls back to a plain logout button in minimal (survey) mode', () => {
    renderWithProviders(<AppHeader minimal />);
    expect(screen.getByTestId('logout-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('account-button')).toBeNull();
  });

  it('returns to Home and refreshes the feed when the logo is tapped', () => {
    mockNavigate.mockClear();
    mockFetch.mockClear();
    renderWithProviders(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-logo'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
    expect(mockFetch).toHaveBeenCalledWith(true);
  });

  it('opens the Search screen when the search icon is tapped', () => {
    mockNavigate.mockClear();
    renderWithProviders(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-search'));
    expect(mockNavigate).toHaveBeenCalledWith('Search');
  });

  it('hides the search icon in minimal mode', () => {
    renderWithProviders(<AppHeader minimal />);
    expect(screen.queryByTestId('header-search')).toBeNull();
  });
});
