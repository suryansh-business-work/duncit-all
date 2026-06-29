import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { LocationButton } from '@/components/LocationButton';
import { LocationDialog } from '@/components/LocationDialog';
import { useLocations } from '@/hooks/useLocations';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLocations');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 1, longitude: 1 } }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([{ city: 'Mumbai', postalCode: '400053' }]),
}));

const mockedLoc = useLocations as jest.Mock;

const mumbai = {
  id: 'l1',
  location_name: 'Mumbai',
  city: 'Mumbai',
  state: 'Maharashtra',
  state_code: 'MH',
  country: 'India',
  country_code: 'IN',
  location_image: '',
  location_pincode: '400001',
  active_club_count: 128,
  location_zones: [
    { zone_name: 'Andheri', pincode: '400053' },
    { zone_name: 'Bandra', pincode: '400050' },
  ],
};
const delhi = {
  id: 'l2',
  location_name: 'New Delhi',
  city: 'New Delhi',
  state: 'Delhi',
  state_code: 'DL',
  country: 'India',
  country_code: 'IN',
  location_image: 'https://img/x.png',
  location_pincode: '110001',
  active_club_count: 1,
  location_zones: [],
};
const dubai = {
  id: 'l3',
  location_name: 'Dubai',
  city: 'Dubai',
  state: 'Dubai',
  state_code: 'DU',
  country: 'UAE',
  country_code: 'AE',
  location_image: '',
  location_pincode: '00000',
  active_club_count: 0,
  location_zones: [],
};

const setup = (over: Record<string, unknown> = {}) => {
  const value = {
    locations: [mumbai, delhi, dubai],
    select: jest.fn(),
    selectedId: '',
    cityLabel: '',
    countryCode: '',
    ...over,
  };
  mockedLoc.mockReturnValue(value);
  return value;
};

beforeEach(() => {
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'granted',
  });
  (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
    { city: 'Mumbai', postalCode: '400053' },
  ]);
});

describe('LocationButton', () => {
  it('shows the flag and opens the dialog', () => {
    setup({ cityLabel: 'Mumbai', countryCode: 'IN' });
    renderWithProviders(<LocationButton />);
    fireEvent.press(screen.getByTestId('location-button'));
    expect(screen.getByTestId('location-dialog')).toBeOnTheScreen();
  });

  it('falls back to the place icon without a country', () => {
    setup({ cityLabel: '', countryCode: '' });
    renderWithProviders(<LocationButton />);
    expect(screen.getByTestId('location-button')).toBeOnTheScreen();
  });
});

describe('LocationDialog drilldown', () => {
  it('drills country → state → city → area and applies', () => {
    const value = setup();
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    // Defaults to India / Delhi.
    expect(screen.getByTestId('country-IN')).toBeOnTheScreen();
    expect(screen.getByTestId('location-l2')).toBeOnTheScreen();
    // Switch to Maharashtra → Mumbai appears.
    fireEvent.press(screen.getByTestId('state-MH'));
    fireEvent.press(screen.getByTestId('location-l1'));
    fireEvent.press(screen.getByTestId('area-Andheri'));
    fireEvent.press(screen.getByTestId('location-apply'));
    expect(value.select).toHaveBeenCalledWith(mumbai, 'Andheri');
  });

  it('switches country to UAE', () => {
    setup();
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('country-AE'));
    expect(screen.getByTestId('location-l3')).toBeOnTheScreen();
  });

  it('shows the active club count under each city', () => {
    setup();
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    // Default India/Delhi → Delhi has 1 club.
    expect(screen.getByText('1 Club')).toBeOnTheScreen();
    // Maharashtra → Mumbai has 128.
    fireEvent.press(screen.getByTestId('state-MH'));
    expect(screen.getByText('128 Clubs')).toBeOnTheScreen();
    // UAE → Dubai has none.
    fireEvent.press(screen.getByTestId('country-AE'));
    expect(screen.getByText('No Clubs Operating Yet')).toBeOnTheScreen();
  });

  it('filters areas and shows the empty state', () => {
    setup({ selectedId: 'l1' });
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('area-search'), 'zzz');
    expect(screen.getByText('No matching areas.')).toBeOnTheScreen();
  });

  it('does not apply without a draft selection', () => {
    const value = setup();
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    // Default draft is empty (selectedId ''), so apply is a no-op.
    fireEvent.press(screen.getByTestId('location-apply'));
    expect(value.select).not.toHaveBeenCalled();
  });

  it('closes via cancel, close button and backdrop', () => {
    setup();
    const onClose = jest.fn();
    renderWithProviders(<LocationDialog open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('location-cancel'));
    fireEvent.press(screen.getByTestId('location-close'));
    fireEvent.press(screen.getByTestId('location-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('LocationDialog GPS', () => {
  it('detects a city and applies the matched zone', async () => {
    const value = setup();
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-l1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('location-apply'));
    expect(value.select).toHaveBeenCalledWith(mumbai, 'Andheri');
  });

  it('errors when permission is denied', async () => {
    setup();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-error')).toBeOnTheScreen());
  });

  it('errors when the city is unsupported', async () => {
    setup();
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValueOnce([{ city: 'Nowhere' }]);
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-error')).toBeOnTheScreen());
  });

  it('errors when geocoding throws', async () => {
    setup();
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('gps'));
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-error')).toBeOnTheScreen());
  });
});
