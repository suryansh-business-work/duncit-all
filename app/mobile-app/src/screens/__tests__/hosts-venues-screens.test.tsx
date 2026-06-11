import { fireEvent, screen } from '@testing-library/react-native';

import { HostsVenuesScreen } from '@/screens/HostsVenuesScreen';
import { PublicProfileScreen } from '@/screens/PublicProfileScreen';
import { VenueDetailsScreen } from '@/screens/VenueDetailsScreen';
import { useHostsVenues, useVenueDetails } from '@/hooks/useHostsVenues';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useHostsVenues', () => ({
  useHostsVenues: jest.fn(),
  useVenueDetails: jest.fn(),
}));
jest.mock('@/hooks/usePublicProfile', () => ({ usePublicProfile: jest.fn() }));
jest.mock('@/hooks/useMyMeeting', () => ({
  useMyMeeting: () => ({ meeting: null, isLoading: false }),
}));
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, string> | undefined = { userId: 'h1', venueId: 'v1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedHV = useHostsVenues as jest.Mock;
const mockedVenue = useVenueDetails as jest.Mock;
const mockedProfile = usePublicProfile as jest.Mock;

const toggleFollow = jest.fn();
const hvBase = {
  hosts: [{ id: 'a', user_id: 'h1', full_name: 'Host One', tags: [] }],
  venues: [{ id: 'v1', venue_name: 'Cafe', venue_type: 'CAFE', capacity: 20 }],
  meId: 'me',
  followingIds: new Set<string>(),
  pendingFollow: null,
  isLoading: false,
  error: undefined,
  toggleFollow,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { userId: 'h1', venueId: 'v1' };
  mockedHV.mockReturnValue(hvBase);
});

describe('HostsVenuesScreen', () => {
  it('shows loading and error states', () => {
    mockedHV.mockReturnValue({ ...hvBase, hosts: [], venues: [], isLoading: true });
    const { rerender } = renderWithProviders(<HostsVenuesScreen />);
    expect(screen.getByTestId('hosts-venues-loading')).toBeOnTheScreen();

    mockedHV.mockReturnValue({ ...hvBase, hosts: [], venues: [], error: new Error('bad') });
    rerender(<HostsVenuesScreen />);
    expect(screen.getByTestId('hosts-venues-error')).toHaveTextContent('bad');
  });

  it('lists hosts, switches to venues, and opens both detail screens', () => {
    renderWithProviders(<HostsVenuesScreen />);
    fireEvent.press(screen.getByTestId('host-follow-h1'));
    expect(toggleFollow).toHaveBeenCalledWith('h1');
    fireEvent.press(screen.getByTestId('host-card-h1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'h1' });

    fireEvent.press(screen.getByTestId('hv-tab-venues'));
    fireEvent.press(screen.getByTestId('venue-card-v1'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'v1' });
  });

  it('shows the empty states for both tabs', () => {
    mockedHV.mockReturnValue({ ...hvBase, hosts: [], venues: [] });
    renderWithProviders(<HostsVenuesScreen />);
    expect(screen.getByTestId('hosts-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('hv-tab-venues'));
    expect(screen.getByTestId('venues-empty')).toBeOnTheScreen();
  });
});

describe('PublicProfileScreen', () => {
  it('renders loading, error, missing then the owner profile', () => {
    mockedProfile.mockReturnValue({ user: null, isOwner: false, badges: [], isLoading: true });
    const { rerender } = renderWithProviders(<PublicProfileScreen />);
    expect(screen.getByTestId('public-profile-loading')).toBeOnTheScreen();

    mockedProfile.mockReturnValue({
      user: null,
      isOwner: false,
      badges: [],
      isLoading: false,
      error: new Error('x'),
    });
    rerender(<PublicProfileScreen />);
    expect(screen.getByTestId('public-profile-error')).toBeOnTheScreen();

    mockedProfile.mockReturnValue({ user: null, isOwner: false, badges: [], isLoading: false });
    rerender(<PublicProfileScreen />);
    expect(screen.getByTestId('public-profile-missing')).toBeOnTheScreen();

    mockedProfile.mockReturnValue({
      user: { user_id: 'me', full_name: 'Me', city: 'Pune', zone: 'K' },
      isOwner: true,
      badges: [],
      isLoading: false,
    });
    rerender(<PublicProfileScreen />);
    fireEvent.press(screen.getByTestId('public-profile-edit'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });

  it('renders a non-owner profile without the edit action (and no route params)', () => {
    mockRouteParams = undefined;
    mockedProfile.mockReturnValue({
      user: { user_id: 'h1', full_name: 'Riya', city: 'Pune', zone: 'K' },
      isOwner: false,
      badges: [],
      isLoading: false,
    });
    renderWithProviders(<PublicProfileScreen />);
    expect(screen.getByText('Riya')).toBeOnTheScreen();
    expect(screen.queryByTestId('public-profile-edit')).toBeNull();
  });
});

describe('VenueDetailsScreen', () => {
  it('shows loading then missing', () => {
    mockedVenue.mockReturnValue({ venue: null, isLoading: true });
    const { rerender } = renderWithProviders(<VenueDetailsScreen />);
    expect(screen.getByTestId('venue-details-loading')).toBeOnTheScreen();

    mockedVenue.mockReturnValue({ venue: null, isLoading: false });
    rerender(<VenueDetailsScreen />);
    expect(screen.getByTestId('venue-details-missing')).toBeOnTheScreen();
  });

  it('renders the loaded venue with address, amenities and gallery', () => {
    mockedVenue.mockReturnValue({
      venue: {
        id: 'v1',
        venue_name: 'Sunset Cafe',
        venue_type: 'CAFE',
        capacity: 40,
        description: 'Cosy spot',
        cover_image_url: 'http://cover',
        gallery: ['http://g1'],
        address_line1: '12 Main St',
        city: 'Pune',
        state: 'MH',
        postal_code: '411001',
        country: 'India',
        amenities: ['Wifi', 'Parking'],
        tags: ['Rooftop'],
      },
      isLoading: false,
    });
    renderWithProviders(<VenueDetailsScreen />);
    // Name appears in both the header title and the body.
    expect(screen.getAllByText('Sunset Cafe').length).toBeGreaterThan(0);
    expect(screen.getByTestId('venue-address')).toHaveTextContent(/12 Main St/);
    expect(screen.getByText('Wifi')).toBeOnTheScreen();
    expect(screen.getAllByTestId('venue-gallery-image').length).toBe(1);
  });

  it('renders a minimal venue (no type/capacity/description/amenities/gallery/address)', () => {
    mockedVenue.mockReturnValue({
      venue: {
        id: 'v9',
        venue_name: 'Bare Venue',
        venue_type: null,
        capacity: null,
        description: null,
        cover_image_url: null,
        gallery: [],
        amenities: [],
        tags: [],
      },
      isLoading: false,
    });
    renderWithProviders(<VenueDetailsScreen />);
    expect(screen.getByTestId('venue-address')).toHaveTextContent('Address not provided');
    expect(screen.queryAllByTestId('venue-gallery-image').length).toBe(0);
  });

  it('coalesces absent gallery/tags and a missing venue id', () => {
    mockRouteParams = undefined; // route.params?.venueId ?? ''
    mockedVenue.mockReturnValue({
      venue: {
        id: 'v9',
        venue_name: 'Sparse Venue',
        venue_type: 'HALL',
        capacity: null,
        cover_image_url: 'http://cover',
        // gallery + tags intentionally undefined → `?? []`
        amenities: undefined,
      },
      isLoading: false,
    });
    renderWithProviders(<VenueDetailsScreen />);
    expect(mockedVenue).toHaveBeenCalledWith('');
    expect(screen.getAllByText('Sparse Venue').length).toBeGreaterThan(0);
  });
});
