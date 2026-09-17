import * as Location from 'expo-location';

import { detectDeviceLocation } from '@/utils/device-location';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const permission = Location.requestForegroundPermissionsAsync as jest.Mock;
const position = Location.getCurrentPositionAsync as jest.Mock;
const reverse = Location.reverseGeocodeAsync as jest.Mock;

const lucknow = {
  id: 'loc-lucknow',
  location_name: 'Lucknow',
  city: 'Lucknow',
  location_pincode: '226001',
  location_zones: [
    { zone_name: 'Gomti Nagar', pincode: '226010' },
    { zone_name: 'Hazratganj', pincode: '226001' },
  ],
};
const pune = {
  id: 'loc-pune',
  location_name: 'Pune',
  city: 'Pune',
  location_pincode: '411001',
  location_zones: [],
};
const locations = [lucknow, pune];

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ status: 'granted' });
  position.mockResolvedValue({ coords: { latitude: 26.8567, longitude: 81.0069 } });
});

describe('detectDeviceLocation', () => {
  it('stops at a refused permission without asking for a fix', async () => {
    permission.mockResolvedValue({ status: 'denied' });

    await expect(detectDeviceLocation(locations)).resolves.toEqual({ status: 'DENIED' });
    expect(position).not.toHaveBeenCalled();
  });

  it('matches the city and names the area its postcode belongs to', async () => {
    reverse.mockResolvedValue([{ city: 'Lucknow', postalCode: '226010' }]);

    await expect(detectDeviceLocation(locations)).resolves.toEqual({
      status: 'FOUND',
      city: 'Lucknow',
      location: lucknow,
      zone: 'Gomti Nagar',
    });
    expect(reverse).toHaveBeenCalledWith({ latitude: 26.8567, longitude: 81.0069 });
  });

  it('finds the city by its subregion with no area when there is no postcode', async () => {
    reverse.mockResolvedValue([{ subregion: 'Pune' }]);

    await expect(detectDeviceLocation(locations)).resolves.toEqual({
      status: 'FOUND',
      city: 'Pune',
      location: pune,
      zone: '',
    });
  });

  it('reports a city Duncit does not serve yet', async () => {
    reverse.mockResolvedValue([{ city: 'Kanpur', postalCode: '208001' }]);

    await expect(detectDeviceLocation(locations)).resolves.toEqual({
      status: 'UNSERVED',
      city: 'Kanpur',
    });
  });

  it('treats an empty geocode as an unnamed, unserved place', async () => {
    reverse.mockResolvedValue([]);

    await expect(detectDeviceLocation(locations)).resolves.toEqual({
      status: 'UNSERVED',
      city: '',
    });
  });

  it('lets a failed fix throw to the caller', async () => {
    position.mockRejectedValue(new Error('Location request timed out'));

    await expect(detectDeviceLocation(locations)).rejects.toThrow('Location request timed out');
  });
});
