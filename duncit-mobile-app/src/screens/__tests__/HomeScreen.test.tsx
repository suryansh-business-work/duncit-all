import { screen } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { renderWithProviders } from '@/utils/test-utils';

// The header pulls in branding/account data; it's unit-tested on its own.
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));

describe('HomeScreen', () => {
  it('renders the post-survey landing', () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('home-title')).toBeOnTheScreen();
  });
});
