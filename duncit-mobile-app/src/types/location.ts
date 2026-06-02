import { z } from 'zod';

/** Geographic coordinates captured from the device. */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

/** Shape returned by POST /api/location. */
export const sendLocationResponseSchema = z.object({
  id: z.string(),
  receivedAt: z.string(),
});

export type SendLocationResponse = z.infer<typeof sendLocationResponseSchema>;

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';
