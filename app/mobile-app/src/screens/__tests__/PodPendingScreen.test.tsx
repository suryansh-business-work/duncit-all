import { screen } from '@testing-library/react-native';

import { PodPendingScreen } from '@/screens/PodPendingScreen';
import { CategoryMediaType, PodVenueApproval } from '@/generated/graphql/graphql';
import { usePodPendingView, type PodPendingView } from '@/hooks/usePodPendingView';
import { renderWithProviders } from '@/utils/test-utils';

let routeParams: { podId: string } | undefined = { podId: 'p1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: routeParams }),
}));
jest.mock('@/hooks/usePodPendingView', () => ({ usePodPendingView: jest.fn() }));
const mockedUse = usePodPendingView as jest.Mock;

const view: PodPendingView = {
  pod: {
    id: 'p1',
    pod_title: 'Sunset Jam',
    pod_images_and_videos: [{ url: 'https://cdn/a.jpg', type: CategoryMediaType.Image }],
    pod_date_time: '2026-08-01T18:30:00.000Z',
    pod_end_date_time: null,
    place_label: 'The Loft',
    place_detail: null,
    venue_approval_status: PodVenueApproval.Pending,
  },
  category_name: 'Music',
  expected_earnings: 900,
  currency_symbol: '₹',
  venue: {
    venue_id: 'v1',
    venue_name: 'The Loft',
    contact_person: 'Asha Rao',
    phone: '+91 9876543210',
    email: 'loft@venues.in',
    address: '12 MG Road',
    lat: null,
    lng: null,
  },
  club_admin: {
    user_id: 'u9',
    name: 'Ravi Kumar',
    profile_photo: null,
    phone: '+91 9000000001',
    whatsapp: null,
    email: null,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  routeParams = { podId: 'p1' };
});

describe('PodPendingScreen', () => {
  it('shows the spinner while the view loads', () => {
    mockedUse.mockReturnValue({ view: null, isLoading: true, error: undefined });
    renderWithProviders(<PodPendingScreen />);
    expect(screen.getByTestId('pod-pending-loading')).toBeOnTheScreen();
  });

  it('surfaces a load error', () => {
    mockedUse.mockReturnValue({ view: null, isLoading: false, error: new Error('forbidden') });
    renderWithProviders(<PodPendingScreen />);
    expect(screen.getByTestId('pod-pending-error')).toHaveTextContent('forbidden');
  });

  it('falls back to the error state when the view is missing without an error', () => {
    mockedUse.mockReturnValue({ view: null, isLoading: false, error: undefined });
    renderWithProviders(<PodPendingScreen />);
    expect(screen.getByTestId('pod-pending-error')).toHaveTextContent('Something went wrong.');
  });

  it('renders the banner and all three cards', () => {
    mockedUse.mockReturnValue({ view, isLoading: false, error: undefined });
    renderWithProviders(<PodPendingScreen />);
    expect(mockedUse).toHaveBeenCalledWith('p1');
    expect(screen.getByTestId('pod-pending-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-pending-summary')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-pending-card')).toBeOnTheScreen();
    expect(screen.getByTestId('club-admin-card')).toBeOnTheScreen();
  });

  it('omits the venue and admin cards when neither is on file', () => {
    routeParams = undefined;
    mockedUse.mockReturnValue({
      view: { ...view, venue: null, club_admin: null },
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<PodPendingScreen />);
    expect(mockedUse).toHaveBeenCalledWith('');
    expect(screen.getByTestId('pod-pending-summary')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-pending-card')).toBeNull();
    expect(screen.queryByTestId('club-admin-card')).toBeNull();
  });
});
