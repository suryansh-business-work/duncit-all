import { z } from 'zod';
import { PACKAGE_TYPES } from '@duncit/utils';
import { listingRules, type ListingTranslate } from './list-products.rules';

const blank = (value: unknown) => value === '' || value === null || value === undefined;

const requiredNumber = (message: string) =>
  z.preprocess((value) => (blank(value) ? Number.NaN : Number(value)), z.number({ error: message }));

/** An optional number input — blank reads 0, "not entered". A variant's blank
 * parcel dimension ships with the product's; the bounds live in listingRules. */
const optionalNumber = z.preprocess((value) => (blank(value) ? 0 : Number(value)), z.number());

const optionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required').max(60, 'Option name is too long'),
  values: z.array(z.string().trim().min(1)).min(1, 'Add at least one value'),
});

const variantSchema = z.object({
  option_label: z.string().trim().max(120, 'Variant name is too long').default(''),
  option_values: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .default([]),
  sku: z.string().trim().max(60).default(''),
  color: z.string().trim().max(80).default(''),
  size_label: z.string().trim().max(120, 'Size label is too long').default(''),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000),
  image_urls: z.array(z.string().trim().url('Use valid image URLs')).min(1, 'Add at least one image'),
  height_cm: optionalNumber,
  weight_kg: optionalNumber,
  length_cm: optionalNumber,
  breadth_cm: optionalNumber,
  unit_cost: requiredNumber('Enter the variant price').pipe(
    z.number().positive('Price must be greater than 0').max(1000000, 'Price cannot exceed ₹10,00,000'),
  ),
  mrp: optionalNumber,
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
  height_cm: optionalNumber,
  weight_kg: optionalNumber,
  length_cm: optionalNumber,
  breadth_cm: optionalNumber,
  package_type: z.enum(PACKAGE_TYPES).default('BOX'),
  hsn_code: z.string().trim().default(''),
  is_fragile: z.boolean().default(false),
  is_liquid: z.boolean().default(false),
  shelf_life_days: z.preprocess((value) => (blank(value) ? null : Number(value)), z.number().nullable()),
  tax_percent: z.coerce.number().min(0).max(28),
  options: z.array(optionSchema).default([]),
  variants: z
    .array(variantSchema)
    .min(1, 'Add at least one variant')
    .refine(hasStock, { message: 'Total stock across variants must be at least 1' }),
  commission_pct: z.number().min(5, 'Commission starts at 5%').max(50, 'Commission cannot exceed 50%'),
  delivery_target: z.literal('SHIPROCKET'),
  pickup_location_id: z.string().min(1, 'Select a warehouse'),
  free_delivery_above: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z
      .number({ error: 'Enter a valid amount' })
      .min(0, 'Amount cannot be negative')
      .max(1000000, 'Amount cannot exceed ₹10,00,000')
      .nullable(),
  ),
});

/**
 * The schema the listing form validates with: the structural
 * `productListingSchema` plus the packaging and MRP rules, whose messages are
 * localized. They run even while another field has a type error (a variant's
 * blank price), so a missing parcel shows on the Product step, not at submit.
 */
export const makeProductListingSchema = (t: ListingTranslate) =>
  productListingSchema.superRefine(listingRules(t), {
    when: (payload) => typeof payload.value === 'object' && payload.value !== null,
  });
