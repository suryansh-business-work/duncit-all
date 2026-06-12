import { fireEvent, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockBack }),
}));

afterEach(() => jest.clearAllMocks());

describe('PlaceholderScreen', () => {
  it('renders the title and the provided subtitle', () => {
    renderWithProviders(<PlaceholderScreen title="Profile" subtitle="Your details" />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
    expect(screen.getByText('Your details')).toBeOnTheScreen();
  });

  it('shows the default subtitle and goes back when tapped', () => {
    renderWithProviders(<PlaceholderScreen title="Saved" />);
    expect(screen.getByText('This space is coming soon.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('placeholder-back'));
    expect(mockBack).toHaveBeenCalled();
  });
});
