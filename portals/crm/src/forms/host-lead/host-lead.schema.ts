import { z } from 'zod';
import { contactsSchema, numeric, serviceOfferedSchema, urlish } from '../validation/lead-rules';

export const hostLeadSchema = z.object({
  super_category_id: z.string().trim().min(1, 'Super category is required'),
  host_name: z
    .string()
    .trim()
    .min(1, 'Host name is required')
    .min(2, 'Host name is too short')
    .max(120, 'Host name is too long'),
  community_size: numeric('Community size'),
  past_attendees: numeric('Past attendees'),
  instagram_link: z.string().trim().max(2048, 'Instagram link is too long'),
  community_link: z.string().trim().max(2048, 'Community link is too long'),
  website: urlish('Website'),
  services_offered: z.array(serviceOfferedSchema),
  contacts: contactsSchema,
  lead_status: z.string().min(1, 'Lead status is required'),
  priority: z.string().min(1, 'Priority is required'),
});
