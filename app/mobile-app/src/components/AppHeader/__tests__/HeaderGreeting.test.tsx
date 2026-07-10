import { fireEvent, screen } from '@testing-library/react-native';

import { HeaderGreeting } from '@/components/AppHeader/HeaderGreeting';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseLocations = jest.fn();
jest.mock('@/hooks/useLocations', () => ({ useLocations: () => mockUseLocations() }));
jest.mock('@/components/LocationDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require('react-native');
  return {
    LocationDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? <Pressable testID="ld-close" onPress={onClose} /> : null,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocations.mockReturnValue({ cityLabel: 'Mumbai' });
});

describe('HeaderGreeting', () => {
  it('renders the given tagline and the tappable city', () => {
    renderWithProviders(<HeaderGreeting tagline="Find your people" showLocation />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Find your people');
    expect(screen.getByTestId('header-location')).toBeOnTheScreen();
    expect(screen.getByText('Mumbai')).toBeOnTheScreen();
  });

  it('falls back to the default tagline and "Select city" when no city is set', () => {
    mockUseLocations.mockReturnValue({ cityLabel: '' });
    renderWithProviders(<HeaderGreeting tagline="   " showLocation />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('It All Starts Here!');
    expect(screen.getByText('Select city')).toBeOnTheScreen();
  });

  it('opens and closes the location dialog when the row is tapped', () => {
    renderWithProviders(<HeaderGreeting tagline={null} showLocation />);
    expect(screen.queryByTestId('ld-close')).toBeNull();
    fireEvent.press(screen.getByTestId('header-location'));
    expect(screen.getByTestId('ld-close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ld-close'));
    expect(screen.queryByTestId('ld-close')).toBeNull();
  });

  it('renders only the title (no location row) when showLocation is false', () => {
    renderWithProviders(<HeaderGreeting tagline="Solo header" showLocation={false} />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Solo header');
    expect(screen.queryByTestId('header-location')).toBeNull();
  });
});
