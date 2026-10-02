import { z } from 'zod';

export const locationSelectFormSchema = z.object({
  city: z
    .string({ error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(80, 'City must be 80 characters or fewer'),
  zone: z
    .string({ error: 'Zone is required' })
    .trim()
    .min(2, 'Zone must be at least 2 characters')
    .max(80, 'Zone must be 80 characters or fewer'),
});

export type LocationSelectFormValues = z.infer<typeof locationSelectFormSchema>;

export const locationSelectInitialValues: LocationSelectFormValues = { city: '', zone: '' };

export function toLocationSelectInput(values: LocationSelectFormValues) {
  return { city: values.city.trim(), zone: values.zone.trim() };
}
