import { z } from 'zod';

const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
    z.number({ invalid_type_error: message }),
  );

const variantSchema = z.object({
  option_label: z.string().trim().min(1, 'Variant name is required').max(120, 'Variant name is too long'),
  color: z.string().trim().max(80),
  size_label: z.string().trim().max(120),
  unit_cost: requiredNumber('Enter the variant price').pipe(
    z.number().positive('Price must be greater than 0').max(1000000, 'Price cannot exceed ₹10,00,000'),
  ),
  inventory_count: requiredNumber('Enter the variant stock').pipe(
    z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(1000000),
  ),
  image_urls: z.array(z.string().trim().url('Use valid image URLs')),
});

export const productListingSchema = z.object({
  super_category_id: z.string().min(1, 'Select a super category'),
  category_id: z.string().min(1, 'Select a category'),
  sub_category_id: z.string().min(1, 'Select a sub category'),
  product_name: z.string().trim().min(3, 'Product title is too short').max(160).min(1, 'Product title is required'),
  image_urls: z.array(z.string().trim().url('Use valid image URLs')).min(1, 'At least one product image is required'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000),
  size_label: z.string().trim().min(1, 'Size is required').max(120, 'Size label is too long'),
  height_cm: requiredNumber('Enter a valid height in cm').pipe(
    z.number().positive('Height must be greater than 0').max(1000, 'Height cannot exceed 1000 cm'),
  ),
  weight_kg: requiredNumber('Enter a valid weight in kg').pipe(
    z.number().positive('Weight must be greater than 0').max(1000, 'Weight cannot exceed 1000 kg'),
  ),
  color: z.string().trim().min(1, 'Color is required').max(80, 'Color is too long'),
  inventory_count: requiredNumber('Enter the available units').pipe(
    z.number().int('Inventory must be a whole number').min(1, 'At least 1 unit is required').max(1000000, 'Inventory cannot exceed 1,000,000 units'),
  ),
  unit_cost: requiredNumber('Enter the product price').pipe(
    z.number().positive('Price must be greater than 0').max(1000000, 'Price cannot exceed ₹10,00,000'),
  ),
  variants: z.array(variantSchema).default([]),
  commission_pct: z.number().min(5, 'Commission starts at 5%').max(50, 'Commission cannot exceed 50%'),
  delivery_target: z.enum(['HOST', 'VENUE'], { errorMap: () => ({ message: 'Delivery target is required' }) }),
});
