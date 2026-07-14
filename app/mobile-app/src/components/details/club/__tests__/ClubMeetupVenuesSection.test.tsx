import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { ClubMeetupVenuesSection } from '../ClubMeetupVenuesSection';
import { ClubTotalMembersSection } from '../ClubTotalMembersSection';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/constants/config', () => ({ config: { googleMapApiKey: 'KEY' } }));

// The global mock denies permission and returns a non-promise position; this
// section needs a granted-by-default flow it can override per test.
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: jest
    .fn()
    .mockResolvedValue({ coords: { latitude: 19.076, longitude: 72.8777 } }),
}));

const turf = {
  id: 'v1',
  venue_name: 'Turf Arena',
  address_line1: 'Plot 4',
  address_line2: '',
  locality: 'Andheri',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  postal_code: '400053',
  lat: 19.12,
  lng: 72.85,
};
const clubhouse = {
  id: 'v2',
  venue_name: 'Club House',
  address_line1: 'Lane 9',
  address_line2: 'Wing B',
  locality: 'Bandra',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  postal_code: '400050',
  lat: null,
  lng: null,
};

const venues = [turf, clubhouse];

beforeEach(() => {
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 19.076, longitude: 72.8777 },
  });
});

const locate = async () => {
  fireEvent.press(screen.getByTestId('club-venues-locate'));
  expect(screen.getByText('Locating…')).toBeOnTheScreen();
  await act(async () => {});
};

describe('ClubMeetupVenuesSection', () => {
  it('renders nothing without venues', () => {
    renderWithProviders(<ClubMeetupVenuesSection venues={[]} onOpenVenue={jest.fn()} />);
    expect(screen.queryByTestId('club-venues')).toBeNull();
  });

  it('lists the venues and shows the first one address + map', () => {
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={jest.fn()} />);
    expect(screen.getByText('We usually meet')).toBeOnTheScreen();
    expect(screen.getByTestId('club-venue-v1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-venue-v2')).toBeOnTheScreen();
    expect(screen.getByTestId('club-venue-address')).toHaveTextContent(
      'Turf Arena, Plot 4, Andheri, Mumbai, Maharashtra, 400053, India',
    );
    expect(screen.getByTestId('pod-map')).toBeOnTheScreen();
    // No origin yet → no distance chips.
    expect(screen.queryByTestId('club-venue-distance-v1')).toBeNull();
  });

  it('shows a distance chip only for venues with coordinates once located', async () => {
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={jest.fn()} />);
    await locate();
    expect(screen.getByTestId('club-venue-distance-v1')).toHaveTextContent(/away/);
    expect(screen.queryByTestId('club-venue-distance-v2')).toBeNull();
    // The locate control disappears once an origin is known.
    expect(screen.queryByTestId('club-venues-locate')).toBeNull();
  });

  it('stays idle when location permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={jest.fn()} />);
    await locate();
    expect(screen.queryByTestId('club-venue-distance-v1')).toBeNull();
    expect(screen.getByText('Show distance')).toBeOnTheScreen();
  });

  it('stays idle when the position lookup fails', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('gps'));
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={jest.fn()} />);
    await locate();
    expect(screen.queryByTestId('club-venue-distance-v1')).toBeNull();
    expect(screen.getByText('Show distance')).toBeOnTheScreen();
  });

  it('swaps the address line when another venue is selected', () => {
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={jest.fn()} />);
    fireEvent.press(screen.getByTestId('club-venue-v2'));
    expect(screen.getByTestId('club-venue-address')).toHaveTextContent(
      'Club House, Lane 9, Wing B, Bandra, Mumbai, Maharashtra, 400050, India',
    );
    expect(screen.getByTestId('pod-map')).toBeOnTheScreen();
  });

  it('opens a venue from the card and from the selected-venue link', () => {
    const onOpenVenue = jest.fn();
    renderWithProviders(<ClubMeetupVenuesSection venues={venues} onOpenVenue={onOpenVenue} />);
    fireEvent.press(screen.getByTestId('club-venue-open-v2'));
    expect(onOpenVenue).toHaveBeenCalledWith('v2');
    fireEvent.press(screen.getByTestId('club-venue-open-selected'));
    expect(onOpenVenue).toHaveBeenLastCalledWith('v1');
  });
});

describe('ClubTotalMembersSection', () => {
  it('renders the follower count as the club total members', () => {
    renderWithProviders(<ClubTotalMembersSection count={128} />);
    expect(screen.getByTestId('club-total-members')).toBeOnTheScreen();
    expect(screen.getByText('Total Members')).toBeOnTheScreen();
    expect(screen.getByText('People following this club')).toBeOnTheScreen();
    expect(screen.getByText('128')).toBeOnTheScreen();
  });

  it('still renders at zero', () => {
    renderWithProviders(<ClubTotalMembersSection count={0} />);
    expect(screen.getByTestId('club-total-members')).toBeOnTheScreen();
    expect(screen.getByText('0')).toBeOnTheScreen();
  });
});
