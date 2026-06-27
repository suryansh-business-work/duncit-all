import { z } from 'zod';
import { contactsSchema, serviceOfferedSchema, urlish } from '../validation/lead-rules';

export const ecommLeadSchema = z.object({
  super_category_id: z.string().trim().min(1, 'Super category is required'),
  seller_name: z
    .string()
    .trim()
    .min(1, 'Seller name is required')
    .min(2, 'Seller name is too short')
    .max(120, 'Seller name is too long'),
  brand_name: z.string().trim().max(120, 'Brand name is too long'),
  gst_number: z.string().trim().max(20, 'GST number is too long'),
  website: urlish('Website'),
  instagram_link: z.string().trim().max(2048, 'Instagram link is too long'),
  services_offered: z.array(serviceOfferedSchema),
  contacts: contactsSchema,
  lead_status: z.string().min(1, 'Lead status is required'),
  priority: z.string().min(1, 'Priority is required'),
});
