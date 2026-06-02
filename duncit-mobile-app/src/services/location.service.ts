import * as Location from 'expo-location';

import { config } from '@/constants/config';
import { apiRequest } from '@/services/api.client';
import {
  coordinatesSchema,
  sendLocationResponseSchema,
  type Coordinates,
  type LocationPermissionStatus,
  type SendLocationResponse,
} from '@/types/location';
import { ApiError } from '@/utils/errors';

/**
 * Requests permission and resolves the device's current coordinates.
 * Throws an ApiError when permission is denied or the fix cannot be obtained.
 */
export async function getCurrentLocation(): Promise<{
  permission: LocationPermissionStatus;
  coordinates: Coordinates;
}> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new ApiError('Location permission was denied.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const coordinates = coordinatesSchema.parse({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });

  return { permission: 'granted', coordinates };
}

/** Sends the captured coordinates to the backend. */
export async function sendLocation(coordinates: Coordinates): Promise<SendLocationResponse> {
  const payload = coordinatesSchema.parse(coordinates);

  const data = await apiRequest<SendLocationResponse>(config.endpoints.location, {
    method: 'POST',
    body: payload,
  });

  return sendLocationResponseSchema.parse(data);
}
