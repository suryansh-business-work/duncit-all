import { fireEvent, screen } from '@testing-library/react-native';
import { toursForRoles } from '@duncit/tours';

import { TourGuideScreen } from '@/screens/TourGuideScreen';
import { useMe } from '@/hooks/useMe';
import { useToursStore } from '@/stores/tours.store';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseMe = useMe as jest.Mock;
const asRoles = (roles: string[]) => mockUseMe.mockReturnValue({ data: { me: { roles } } });

beforeEach(() => {
  jest.clearAllMocks();
  asRoles([]);
  useToursStore.setState({ completed: [], activeTourId: null });
});

describe('TourGuideScreen', () => {
  it('lists the tours this viewer may see', () => {
    renderWithProviders(<TourGuideScreen />);
    for (const tour of toursForRoles([])) {
      expect(screen.getByTestId(`tour-row-${tour.id}`)).toBeOnTheScreen();
      expect(screen.getByText(fallbackT(tour.titleKey))).toBeOnTheScreen();
    }
  });

  // Offering Create Pod to a consumer only leads to a screen they cannot open.
  it('hides Create Pod from a non-host and shows it to a host', () => {
    renderWithProviders(<TourGuideScreen />);
    expect(screen.queryByTestId('tour-row-create-pod')).toBeNull();

    screen.unmount();
    asRoles(['HOST']);
    renderWithProviders(<TourGuideScreen />);
    expect(screen.getByTestId('tour-row-create-pod')).toBeOnTheScreen();
  });

  // The viewer query has not resolved on first paint, so the centre must render
  // the ungated tours rather than blow up on a missing `me`.
  it('falls back to no roles while the viewer is still loading', () => {
    mockUseMe.mockReturnValue({ data: undefined });
    renderWithProviders(<TourGuideScreen />);
    expect(screen.getByTestId('tour-row-home')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-row-create-pod')).toBeNull();
  });

  it('arms the tour and lands on a screen that opens without params', () => {
    renderWithProviders(<TourGuideScreen />);
    fireEvent.press(screen.getByTestId('tour-row-booking'));
    expect(useToursStore.getState().activeTourId).toBe('booking');
    expect(mockNavigate).toHaveBeenCalledWith('PodHistory');
  });

  // PodDetails reads route.params.podId, so navigating there with no params
  // crashed. A detail-screen tour lands on the list that leads to it instead.
  it('sends a detail-screen tour to a param-free landing', () => {
    renderWithProviders(<TourGuideScreen />);
    fireEvent.press(screen.getByTestId('tour-row-pod-details'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  // A bottom tab is not a root-stack screen: naming it directly finds nothing
  // and leaves the user where they were, which is how the Club tour used to land
  // on the home feed while mWeb opened /clubs.
  it('opens a tab landing through the tab navigator', () => {
    renderWithProviders(<TourGuideScreen />);
    fireEvent.press(screen.getByTestId('tour-row-club'));
    expect(useToursStore.getState().activeTourId).toBe('club');
    expect(mockNavigate).toHaveBeenCalledWith('Home', { screen: 'Clubs' });
  });

  it('marks a finished tour as completed so it can be restarted', () => {
    useToursStore.setState({ completed: ['home'] });
    renderWithProviders(<TourGuideScreen />);
    expect(screen.getByTestId('tour-done-home')).toBeOnTheScreen();
    expect(screen.queryByTestId('tour-done-club')).toBeNull();
  });
});
