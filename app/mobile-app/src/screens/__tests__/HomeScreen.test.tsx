import { screen } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { renderWithProviders } from '@/utils/test-utils';

// The header pulls in branding/account data; it's unit-tested on its own.
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
// The status rail has its own data graph + unit tests; stub it in this shell test.
jest.mock('@/components/status/StatusRail', () => ({ StatusRail: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn() }),
}));

// Stub the data hooks so the screen renders deterministically (no network).
jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: undefined }) }));
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: [], loading: false }),
}));
jest.mock('@/hooks/useHomeFeed', () => ({
  useHomeFeed: () => ({
    isLoading: false,
    hasData: true,
    categoryChips: [],
    vibeCategories: [],
    hasContent: false,
    clubsWithPods: [],
    featuredPods: [],
    previousPods: [],
    totalPods: 0,
    refetch: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders the home feed shell', () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('home-feed')).toBeOnTheScreen();
    expect(screen.getByTestId('home-empty')).toBeOnTheScreen();
  });
});
