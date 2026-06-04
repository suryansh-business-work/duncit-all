import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { LocationButton } from '@/components/LocationButton';
import { LocationDialog } from '@/components/LocationDialog';
import { SuperCategoryTabs } from '@/components/SuperCategoryTabs';
import { useLocations } from '@/hooks/useLocations';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSuperCategories');
jest.mock('@/hooks/useLocations');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 1, longitude: 1 } }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([{ city: 'Mumbai' }]),
}));

const mockedSuper = useSuperCategories as jest.Mock;
const mockedLoc = useLocations as jest.Mock;

const city = {
  id: 'l1',
  location_name: 'Mumbai',
  city: 'Mumbai',
  state: 'MH',
  location_image: '',
  location_zones: [],
};

beforeEach(() => {
  mockedSuper.mockReturnValue({
    superCats: [{ id: 's1', slug: 'music', name: 'Music', icon: '🎵' }],
    selectedSlug: '',
    select: jest.fn(),
    isLoading: false,
  });
  mockedLoc.mockReturnValue({
    locations: [city],
    select: jest.fn(),
    selectedId: '',
    cityLabel: '',
  });
});

describe('SuperCategoryTabs', () => {
  it('renders tabs and selects one', () => {
    const select = jest.fn();
    mockedSuper.mockReturnValue({
      superCats: [{ id: 's1', slug: 'music', name: 'Music', icon: '🎵' }],
      selectedSlug: 'music',
      select,
      isLoading: false,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.getByTestId('super-cat-all')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('super-cat-all'));
    expect(select).toHaveBeenCalledWith('');
  });

  it('renders a skeleton (no tabs) while loading', () => {
    mockedSuper.mockReturnValue({
      superCats: [],
      selectedSlug: '',
      select: jest.fn(),
      isLoading: true,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.queryByTestId('super-cat-all')).toBeNull();
  });
});

describe('LocationButton + LocationDialog', () => {
  it('opens the dialog and picks a city', () => {
    const select = jest.fn();
    mockedLoc.mockReturnValue({ locations: [city], select, selectedId: '', cityLabel: '' });
    renderWithProviders(<LocationButton />);
    fireEvent.press(screen.getByTestId('location-button'));
    expect(screen.getByTestId('location-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('location-l1'));
    expect(select).toHaveBeenCalled();
  });

  it('closes via the backdrop', () => {
    const onClose = jest.fn();
    renderWithProviders(<LocationDialog open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('location-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('GPS detect selects a matching city', async () => {
    const select = jest.fn();
    const onClose = jest.fn();
    mockedLoc.mockReturnValue({ locations: [city], select, selectedId: '', cityLabel: '' });
    renderWithProviders(<LocationDialog open onClose={onClose} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(select).toHaveBeenCalled());
  });

  it('GPS shows an error when permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-error')).toBeOnTheScreen());
  });

  it('GPS shows an error when the city is unsupported', async () => {
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValueOnce([{ city: 'Nowhere' }]);
    mockedLoc.mockReturnValue({
      locations: [city],
      select: jest.fn(),
      selectedId: '',
      cityLabel: '',
    });
    renderWithProviders(<LocationDialog open onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('location-gps'));
    await waitFor(() => expect(screen.getByTestId('location-error')).toBeOnTheScreen());
  });
});
