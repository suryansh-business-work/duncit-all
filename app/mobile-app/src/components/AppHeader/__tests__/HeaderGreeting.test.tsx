import { fireEvent, screen } from '@testing-library/react-native';

import { HeaderGreeting } from '@/components/AppHeader/HeaderGreeting';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseLocations = jest.fn();
jest.mock('@/hooks/useLocations', () => ({ useLocations: () => mockUseLocations() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocations.mockReturnValue({ cityLabel: 'Mumbai' });
});

describe('HeaderGreeting', () => {
  it('renders the given tagline and the tappable city', () => {
    renderWithProviders(<HeaderGreeting tagline="Find your people" onOpenLocation={jest.fn()} />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Find your people');
    expect(screen.getByTestId('header-location')).toBeOnTheScreen();
    expect(screen.getByText('Mumbai')).toBeOnTheScreen();
  });

  it('falls back to the default tagline and "Select city" when no city is set', () => {
    mockUseLocations.mockReturnValue({ cityLabel: '' });
    renderWithProviders(<HeaderGreeting tagline="   " onOpenLocation={jest.fn()} />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('It All Starts Here!');
    expect(screen.getByText('Select city')).toBeOnTheScreen();
  });

  it('asks the header to open the picker from the row and the title', () => {
    const onOpenLocation = jest.fn();
    renderWithProviders(<HeaderGreeting tagline={null} onOpenLocation={onOpenLocation} />);
    fireEvent.press(screen.getByTestId('header-location'));
    fireEvent.press(screen.getByTestId('header-greeting-title'));
    expect(onOpenLocation).toHaveBeenCalledTimes(2);
  });

  it('renders only the title (no location row) without an open handler', () => {
    renderWithProviders(<HeaderGreeting tagline="Solo header" />);
    expect(screen.getByTestId('header-greeting-title')).toHaveTextContent('Solo header');
    expect(screen.queryByTestId('header-location')).toBeNull();
  });
});
