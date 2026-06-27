import { z } from 'zod';
import { contactsSchema, numeric, serviceOfferedSchema, urlish } from '../validation/lead-rules';

export const venueLeadSchema = z
  .object({
    super_category_id: z.string().trim().min(1, 'Super category is required'),
    venue_name: z
      .string()
      .trim()
      .min(1, 'Venue name is required')
      .min(2, 'Venue name is too short')
      .max(120, 'Venue name is too long'),
    venue_types: z.array(z.string()).min(1, 'Select at least one venue type'),
    venue_type_other: z.string(),
    city: z.string().trim().min(1, 'City is required'),
    full_address: z
      .string()
      .trim()
      .min(1, 'Full address is required')
      .min(5, 'Address is too short'),
    capacity_min: numeric('Minimum capacity'),
    capacity_max: numeric('Maximum capacity'),
    expected_charges: numeric('Expected charges'),
    security_deposit: numeric('Security deposit'),
    map_link: z.string().trim().max(2048, 'Map link is too long'),
    website: urlish('Website'),
    services_offered: z.array(serviceOfferedSchema),
    contacts: contactsSchema,
    lead_status: z.string().min(1, 'Lead status is required'),
    priority: z.string().min(1, 'Priority is required'),
  })
  .superRefine((v, ctx) => {
    if (Array.isArray(v.venue_types) && v.venue_types.includes('Other') && !v.venue_type_other.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['venue_type_other'],
        message: 'Please specify the "Other" venue type',
      });
    }
  });
