import * as Location from 'expo-location';

import { getCurrentLocation, sendLocation } from '@/services/location.service';
import { ApiError } from '@/utils/errors';

jest.mock('expo-location');

const mockedLocation = jest.mocked(Location);

describe('location.service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getCurrentLocation', () => {
    it('returns coordinates when permission is granted', async () => {
      mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      } as never);
      mockedLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 10, longitude: 20 },
      } as never);

      const result = await getCurrentLocation();

      expect(result.permission).toBe('granted');
      expect(result.coordinates).toEqual({ latitude: 10, longitude: 20 });
    });

    it('throws when permission is denied', async () => {
      mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      } as never);

      await expect(getCurrentLocation()).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('sendLocation', () => {
    afterEach(() => jest.restoreAllMocks());

    it('posts coordinates and parses the response', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'loc_1', receivedAt: '2026-06-02T00:00:00Z' }),
      } as Response);

      const response = await sendLocation({ latitude: 1, longitude: 2 });

      expect(response.id).toBe('loc_1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/location'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws an ApiError on a failure response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(sendLocation({ latitude: 1, longitude: 2 })).rejects.toBeInstanceOf(ApiError);
    });

    it('throws an ApiError on a network error', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

      await expect(sendLocation({ latitude: 1, longitude: 2 })).rejects.toBeInstanceOf(ApiError);
    });
  });
});
