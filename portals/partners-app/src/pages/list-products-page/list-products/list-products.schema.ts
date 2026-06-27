import { z } from 'zod';

const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
    z.number({ invalid_type_error: message }),
  );

export const productListingSchema = z.object({
  is_duncit_delivery_partner: z.boolean({ required_error: 'Delivery partner status is required' }),
  super_category_id: z.string().min(1, 'Select a super category'),
  category_id: z.string().min(1, 'Select a category'),
  sub_category_id: z.string().min(1, 'Select a sub category'),
  product_name: z.string().trim().min(3, 'Product title is too short').max(160).min(1, 'Product title is required'),
  image_urls: z.array(z.string().trim().url('Use valid image URLs')).min(1, 'At least one product image is required'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000),
  size_label: z.string().trim().max(120).min(1, 'Size is required'),
  height_cm: requiredNumber('Height is required').pipe(z.number().min(0.1).max(1000)),
  weight_kg: requiredNumber('Weight is required').pipe(z.number().min(0.01).max(1000)),
  color: z.string().trim().max(80).min(1, 'Color is required'),
  inventory_count: requiredNumber('Inventory is required').pipe(z.number().int().min(1)),
  unit_cost: requiredNumber('Price is required').pipe(z.number().min(1)),
  commission_pct: z.number().min(5, 'Commission starts at 5%').max(50, 'Commission cannot exceed 50%'),
  delivery_target: z.enum(['HOST', 'VENUE'], { errorMap: () => ({ message: 'Delivery target is required' }) }),
});
