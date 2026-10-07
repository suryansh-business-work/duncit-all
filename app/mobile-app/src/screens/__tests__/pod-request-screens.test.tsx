import { fireEvent, screen } from '@testing-library/react-native';

import { useNearbyHosts } from '@/hooks/useNearbyHosts';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { usePodRequestDetail } from '@/hooks/usePodRequestDetail';
import { NearbyHostsScreen } from '@/screens/NearbyHostsScreen';
import { NearbyVenuesScreen } from '@/screens/NearbyVenuesScreen';
import { PodRequestDetailScreen } from '@/screens/PodRequestDetailScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'r1' } }),
}));
jest.mock('@/hooks/useNearbyHosts', () => ({ useNearbyHosts: jest.fn() }));
jest.mock('@/hooks/useNearbyVenues', () => ({ useNearbyVenues: jest.fn() }));
jest.mock('@/hooks/usePodRequestDetail', () => ({ usePodRequestDetail: jest.fn() }));

// The search body and the detail blocks are tested on their own; the screens
// only have to choose what to show and hand the right data down.
const mockBody = jest.fn();
jest.mock('@/components/nearby-partners/NearbySearchBody', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    NearbySearchBody: (props: { kind: string }) => {
      mockBody(props);
      return <V testID={`search-body-${props.kind}`} />;
    },
  };
});
const mockStub = (id: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return <V testID={id} />;
};
jest.mock('@/components/pod-request-detail/CounterpartCard', () => ({
  CounterpartCard: () => mockStub('counterpart-stub'),
}));
jest.mock('@/components/pod-request-detail/SlotSummary', () => ({
  SlotSummary: () => mockStub('slot-stub'),
}));
jest.mock('@/components/pod-request-detail/ActionBlock', () => ({
  ActionBlock: () => mockStub('action-stub'),
}));
jest.mock('@/components/pod-request-detail/ContactBlock', () => ({
  ContactBlock: () => mockStub('contact-stub'),
}));

const mockedHosts = useNearbyHosts as jest.Mock;
const mockedVenues = useNearbyVenues as jest.Mock;
const mockedDetail = usePodRequestDetail as jest.Mock;

const partners = {
  items: [{ id: 'h1' }],
  quota: { limit: 5, remaining: 2 },
  error: null,
  isLoading: false,
  send: jest.fn(),
};
const state = { locationId: 'l1' };

beforeEach(() => jest.clearAllMocks());

describe('NearbyHostsScreen', () => {
  const hosts = (over: Record<string, unknown> = {}) => ({
    state,
    venues: [
      { id: 'v1', venue_name: 'Hall', city: 'Mumbai', status: 'APPROVED' },
      { id: 'v2', venue_name: 'Turf', city: 'Mumbai', status: 'APPROVED' },
    ],
    venue: { id: 'v1', venue_name: 'Hall', city: 'Mumbai', status: 'APPROVED' },
    venuesLoading: false,
    venuesError: null,
    selectVenue: jest.fn(),
    partners,
    send: jest.fn(),
    ...over,
  });

  it('searches hosts for the picked venue, handing the results and send down', () => {
    const value = hosts();
    mockedHosts.mockReturnValue(value);
    renderWithProviders(<NearbyHostsScreen />);
    expect(screen.getByTestId('nearby-hosts-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('search-body-HOST')).toBeOnTheScreen();
    expect(mockBody).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state,
        items: partners.items,
        loading: false,
        error: null,
        quota: partners.quota,
        send: value.send,
      }),
    );
    // An owner of several venues can switch which one searches.
    expect(screen.getByTestId('venue-switcher')).toBeOnTheScreen();
  });

  it('shows the venues loading, then their failure', () => {
    mockedHosts.mockReturnValue(hosts({ venues: [], venue: null, venuesLoading: true }));
    const { rerender } = renderWithProviders(<NearbyHostsScreen />);
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    expect(screen.queryByTestId('nearby-no-venue')).toBeNull();
    expect(screen.queryByTestId('search-body-HOST')).toBeNull();

    mockedHosts.mockReturnValue(hosts({ venues: [], venue: null, venuesError: 'Offline' }));
    rerender(<NearbyHostsScreen />);
    expect(screen.getByTestId('nearby-venues-error')).toHaveTextContent('Offline');
    expect(screen.queryByTestId('nearby-no-venue')).toBeNull();
  });

  it('explains that searching opens once a venue is approved', () => {
    mockedHosts.mockReturnValue(hosts({ venues: [], venue: null }));
    renderWithProviders(<NearbyHostsScreen />);
    expect(screen.getByTestId('nearby-no-venue')).toHaveTextContent(
      'Pod Requests open once one of your venues is approved.',
    );
  });
});

describe('NearbyVenuesScreen', () => {
  const venues = (over: Record<string, unknown> = {}) => ({
    state,
    hostLoading: false,
    hostError: null,
    partners,
    send: jest.fn(),
    ...over,
  });

  it('searches venues with the results and send', () => {
    const value = venues();
    mockedVenues.mockReturnValue(value);
    renderWithProviders(<NearbyVenuesScreen />);
    expect(screen.getByTestId('search-body-VENUE')).toBeOnTheScreen();
    expect(mockBody).toHaveBeenLastCalledWith(
      expect.objectContaining({ loading: false, error: null, send: value.send }),
    );
  });

  it("stays loading while the host's categories load, and shows their failure first", () => {
    mockedVenues.mockReturnValue(venues({ hostLoading: true }));
    const { rerender } = renderWithProviders(<NearbyVenuesScreen />);
    expect(mockBody).toHaveBeenLastCalledWith(expect.objectContaining({ loading: true }));

    mockedVenues.mockReturnValue(
      venues({ hostError: 'No host', partners: { ...partners, error: 'Search down' } }),
    );
    rerender(<NearbyVenuesScreen />);
    expect(mockBody).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'No host' }));

    mockedVenues.mockReturnValue(venues({ partners: { ...partners, error: 'Search down' } }));
    rerender(<NearbyVenuesScreen />);
    expect(mockBody).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'Search down' }));
  });
});

describe('PodRequestDetailScreen', () => {
  const actions = { error: '', clearError: jest.fn() };
  const request = { id: 'r1', slot: null };

  it('reads the request named in the route', () => {
    mockedDetail.mockReturnValue({
      request: null,
      pod: null,
      error: null,
      isLoading: true,
      actions,
    });
    renderWithProviders(<PodRequestDetailScreen />);
    expect(mockedDetail).toHaveBeenCalledWith('r1');
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-request-not-found')).toBeNull();
  });

  it("shows the server's refusal, or not-found when there is none", () => {
    mockedDetail.mockReturnValue({
      request: null,
      pod: null,
      error: 'Forbidden',
      isLoading: false,
      actions,
    });
    const { rerender } = renderWithProviders(<PodRequestDetailScreen />);
    expect(screen.getByTestId('pod-request-not-found')).toHaveTextContent('Forbidden');

    mockedDetail.mockReturnValue({
      request: null,
      pod: null,
      error: null,
      isLoading: false,
      actions,
    });
    rerender(<PodRequestDetailScreen />);
    expect(screen.getByTestId('pod-request-not-found')).toHaveTextContent(
      'This Pod Request could not be found.',
    );
  });

  it('draws the request: counterpart, next move and contact — the slot only once picked', () => {
    mockedDetail.mockReturnValue({ request, pod: null, error: null, isLoading: false, actions });
    const { rerender } = renderWithProviders(<PodRequestDetailScreen />);
    ['counterpart-stub', 'action-stub', 'contact-stub'].forEach((id) =>
      expect(screen.getByTestId(id)).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId('slot-stub')).toBeNull();
    expect(screen.queryByTestId('pod-request-action-error')).toBeNull();

    mockedDetail.mockReturnValue({
      request: { ...request, slot: { id: 's1' } },
      pod: null,
      error: null,
      // A background refetch keeps the request on screen.
      isLoading: true,
      actions,
    });
    rerender(<PodRequestDetailScreen />);
    expect(screen.getByTestId('slot-stub')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading…')).toBeNull();
  });

  it("shows a refused move's message, cleared by tapping it", () => {
    const clearError = jest.fn();
    mockedDetail.mockReturnValue({
      request,
      pod: null,
      error: null,
      isLoading: false,
      actions: { error: 'CONFLICT: already answered', clearError },
    });
    renderWithProviders(<PodRequestDetailScreen />);
    fireEvent.press(screen.getByTestId('pod-request-action-error'));
    expect(screen.getByTestId('pod-request-action-error')).toHaveTextContent(
      'CONFLICT: already answered',
    );
    expect(clearError).toHaveBeenCalledTimes(1);
  });
});
