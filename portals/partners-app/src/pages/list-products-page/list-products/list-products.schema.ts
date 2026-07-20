import { z } from 'zod';

const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? Number.NaN : Number(value)),
    z.number({ invalid_type_error: message }),
  );

const positiveDimension = (message: string) =>
  requiredNumber(message).pipe(z.number().positive(message).max(1000, 'Value cannot exceed 1000'));

const optionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required').max(60, 'Option name is too long'),
  values: z.array(z.string().trim().min(1)).min(1, 'Add at least one value'),
});

const variantSchema = z.object({
  option_label: z.string().trim().max(120, 'Variant name is too long').default(''),
  option_values: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .default([]),
  color: z.string().trim().max(80).default(''),
  size_label: z.string().trim().max(120, 'Size label is too long').default(''),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000),
  image_urls: z.array(z.string().trim().url('Use valid image URLs')).min(1, 'Add at least one image'),
  height_cm: positiveDimension('Enter a valid height in cm'),
  weight_kg: positiveDimension('Enter a valid weight in kg'),
  length_cm: positiveDimension('Enter a valid length in cm'),
  breadth_cm: positiveDimension('Enter a valid breadth in cm'),
  unit_cost: requiredNumber('Enter the variant price').pipe(
    z.number().positive('Price must be greater than 0').max(1000000, 'Price cannot exceed ₹10,00,000'),
  ),
  inventory_count: requiredNumber('Enter the variant stock').pipe(
    z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(1000000),
  ),
});

const categoryRowSchema = z
  .object({
    super_id: z.string(),
    super_name: z.string(),
    category_id: z.string(),
    category_name: z.string(),
    sub_id: z.string(),
    sub_name: z.string(),
  })
  .refine((value) => Boolean(value.super_id && value.category_id && value.sub_id), {
    message: 'Select a Super category, Category and Sub category',
  });

const hasStock = (variants: { inventory_count: number }[]) =>
  variants.reduce((sum, variant) => sum + (Number(variant.inventory_count) || 0), 0) >= 1;

export const productListingSchema = z.object({
  categories: z.array(categoryRowSchema).min(1, 'Add at least one category'),
  product_name: z.string().trim().min(3, 'Product title is too short').max(160).min(1, 'Product title is required'),
  options: z.array(optionSchema).default([]),
  variants: z
    .array(variantSchema)
    .min(1, 'Add at least one variant')
    .refine(hasStock, { message: 'Total stock across variants must be at least 1' }),
  commission_pct: z.number().min(5, 'Commission starts at 5%').max(50, 'Commission cannot exceed 50%'),
  delivery_target: z.literal('SHIPROCKET'),
});
