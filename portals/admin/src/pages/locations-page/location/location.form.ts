import { z } from 'zod';
import { POSTAL_CODE_PATTERN, optionalText } from '@duncit/forms';

/** A missing value and a blank one are refused with the same message. */
const requiredString = (message: string) => z.string({ error: message }).trim().min(1, message);

export const locationZoneSchema = z.object({
  zone_name: optionalText('Zone name', 80, { defaultEmpty: true }),
  zone_code: optionalText('Zone code', 20, { defaultEmpty: true }),
  pincode: z
    .string()
    .trim()
    .refine((value) => !value || POSTAL_CODE_PATTERN.test(value), 'Enter a valid PIN code (3–12 alphanumerics)')
    .default(''),
});

export const locationFormSchema = z.object({
  country: requiredString('Country is required'),
  state: requiredString('State is required'),
  location_name: z
    .string({ error: 'Location name is required' })
    .trim()
    .min(2, 'Location name must be at least 2 characters')
    .max(120, 'Location name must be 120 characters or fewer'),
  location_pincode: z
    .string({ error: 'Primary PIN code is required' })
    .trim()
    .regex(POSTAL_CODE_PATTERN, 'Enter a valid primary PIN code (3–12 alphanumerics)'),
  is_active: z.boolean().default(true),
  // Piped so the length cap reports its own message rather than the required one.
  location_image: requiredString('Location image is required').pipe(z.string().max(1000)),
  zones: z.array(locationZoneSchema).default([]),
});

export type LocationZoneValues = z.infer<typeof locationZoneSchema>;
export type LocationFormValues = z.infer<typeof locationFormSchema>;

const toZone = (zone: z.input<typeof locationZoneSchema>): LocationZoneValues => ({
  zone_name: (zone.zone_name ?? '').trim(),
  zone_code: (zone.zone_code ?? '').trim(),
  pincode: (zone.pincode ?? '').trim(),
});

/** Normalises like the schema does (trim + defaults) without validating. */
export function toLocationInput(values: z.input<typeof locationFormSchema>) {
  return {
    country: values.country.trim(),
    state: values.state.trim(),
    location_name: values.location_name.trim(),
    location_pincode: values.location_pincode.trim(),
    is_active: values.is_active ?? true,
    location_image: values.location_image.trim(),
    location_zones: (values.zones ?? [])
      .map(toZone)
      .filter((zone) => zone.zone_name || zone.zone_code || zone.pincode),
  };
}
