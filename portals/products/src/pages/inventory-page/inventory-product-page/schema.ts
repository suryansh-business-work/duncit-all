import { z } from 'zod';

const SKU_PATTERN = /^[A-Z0-9-]*$/;

const intField = (max?: number, min = 0) => {
  let schema = z
    .number({ invalid_type_error: 'Number required' })
    .int()
    .min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
};

const moneyField = z
  .number({ invalid_type_error: 'Number required' })
  .min(0)
  .max(1000000);

export const productSchema = z
  .object({
    id: z.string().optional(),

    product_name: z
      .string()
      .trim()
      .max(200)
      .superRefine((value, ctx) => {
        if (value.length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Product name is required' });
          return;
        }
        if (value.length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least 2 characters' });
        }
      }),
    sku: z
      .string()
      .trim()
      .regex(SKU_PATTERN, 'SKU may contain only uppercase letters, digits and hyphens')
      .max(50),
    barcode: z.string().trim().max(80),
    short_description: z.string().max(280, 'Keep under 280 chars'),
    description: z.string().max(4000, 'Keep under 4000 chars'),

    category_id: z.string(),
    brand_name: z.string().max(120),
    product_type: z.enum(['CONSUMABLE', 'MERCHANDISE', 'EQUIPMENT']),
    unit_type: z.enum(['BOTTLE', 'PIECE', 'PACKET', 'BOX', 'KG', 'LITRE', 'METER', 'OTHER']),

    image_url: z.string().url('Must be a valid URL').or(z.literal('')),
    images: z.array(z.string().url('Image must be a valid URL')),

    min_order_qty: intField(100000),
    max_order_qty: intField(1000000, 1),
    low_stock_alert: intField(100000),
    inventory_count: intField(),
    reserved_count: intField(),
    damaged_count: intField(),

    vendor_name: z.string().max(120),
    supplier_contact: z.string().max(120),

    unit_cost: z
      .number({ invalid_type_error: 'Cost is required' })
      .min(0)
      .max(1000000),
    purchase_price: moneyField,
    selling_price: moneyField,
    tax_percent: z.number({ invalid_type_error: 'Number required' }).min(0).max(100),
    discount_percent: z.number({ invalid_type_error: 'Number required' }).min(0).max(100),

    weight_volume: z.string().max(60),
    expiry_date: z.string(),
    manufacturing_date: z.string(),
    batch_number: z.string().max(60),
    storage_instructions: z.string().max(500),

    status: z.enum(['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED']),
    visibility: z.enum(['PUBLIC', 'INTERNAL']),
    tags: z.array(z.string().max(40)).max(20, 'At most 20 tags'),

    pod_available: z.boolean(),
    host_request_allowed: z.boolean(),
    delivery_available: z.boolean(),
    delivery_charge: z.number({ invalid_type_error: 'Number required' }).min(0).max(100000),
  })
  .superRefine((values, ctx) => {
    if (Number(values.max_order_qty ?? 0) < Number(values.min_order_qty ?? 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_order_qty'],
        message: 'Max order qty must be ≥ min order qty',
      });
    }
  });
