import { fireEvent, screen } from '@testing-library/react-native';
import { TOURS } from '@duncit/tours';

import { TourGuideScreen } from '@/screens/TourGuideScreen';
import { useToursStore } from '@/stores/tours.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useToursStore.setState({ completed: [], activeTourId: null });
});

describe('TourGuideScreen', () => {
  it('lists every tour in the shared registry', () => {
    renderWithProviders(<TourGuideScreen />);
    for (const tour of TOURS) {
      expect(screen.getByTestId(`tour-row-${tour.id}`)).toBeOnTheScreen();
      expect(screen.getByText(tour.title)).toBeOnTheScreen();
    }
  });

  it('arms the tour and navigates to the screen it runs on', () => {
    renderWithProviders(<TourGuideScreen />);
    fireEvent.press(screen.getByTestId('tour-row-club'));
    expect(useToursStore.getState().activeTourId).toBe('club');
    expect(mockNavigate).toHaveBeenCalledWith('Clubs');
  });

  it('marks a finished tour as completed so it can be restarted', () => {
    useToursStore.setState({ completed: ['home'] });
    renderWithProviders(<TourGuideScreen />);
    expect(screen.getByTestId('tour-done-home')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-done-club')).toBeNull();
  });
});
