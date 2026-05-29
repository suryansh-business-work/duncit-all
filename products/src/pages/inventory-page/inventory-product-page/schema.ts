import * as yup from 'yup';
import type { InventoryProductFormValues } from './types';

export const productSchema: yup.ObjectSchema<InventoryProductFormValues> = yup.object({
  id: yup.string().optional(),

  product_name: yup.string().trim().min(2, 'At least 2 characters').max(200).required('Product name is required'),
  sku: yup
    .string()
    .trim()
    .matches(/^[A-Z0-9-]*$/, 'SKU may contain only uppercase letters, digits and hyphens')
    .max(50)
    .default(''),
  barcode: yup.string().trim().max(80).default(''),
  short_description: yup.string().max(280, 'Keep under 280 chars').default(''),
  description: yup.string().max(4000, 'Keep under 4000 chars').default(''),

  category_id: yup.string().default(''),
  brand_name: yup.string().max(120).default(''),
  product_type: yup
    .mixed<'CONSUMABLE' | 'MERCHANDISE' | 'EQUIPMENT'>()
    .oneOf(['CONSUMABLE', 'MERCHANDISE', 'EQUIPMENT'])
    .required(),
  unit_type: yup
    .mixed<'BOTTLE' | 'PIECE' | 'PACKET' | 'BOX' | 'KG' | 'LITRE' | 'METER' | 'OTHER'>()
    .oneOf(['BOTTLE', 'PIECE', 'PACKET', 'BOX', 'KG', 'LITRE', 'METER', 'OTHER'])
    .required(),

  image_url: yup.string().url('Must be a valid URL').default(''),
  images: yup.array().of(yup.string().url('Image must be a valid URL').required()).default([]),

  min_order_qty: yup.number().typeError('Number required').integer().min(0).max(100000).required(),
  max_order_qty: yup
    .number()
    .typeError('Number required')
    .integer()
    .min(1)
    .max(1000000)
    .required()
    .test('gte-min', 'Max order qty must be ≥ min order qty', function (value) {
      const { min_order_qty } = this.parent as InventoryProductFormValues;
      return Number(value ?? 0) >= Number(min_order_qty ?? 0);
    }),
  low_stock_alert: yup.number().typeError('Number required').integer().min(0).max(100000).required(),
  inventory_count: yup.number().typeError('Number required').integer().min(0).required(),
  reserved_count: yup.number().typeError('Number required').integer().min(0).required(),
  damaged_count: yup.number().typeError('Number required').integer().min(0).required(),

  vendor_name: yup.string().max(120).default(''),
  supplier_contact: yup.string().max(120).default(''),

  unit_cost: yup.number().typeError('Cost is required').min(0).max(1000000).required(),
  purchase_price: yup.number().typeError('Number required').min(0).max(1000000).required(),
  selling_price: yup.number().typeError('Number required').min(0).max(1000000).required(),
  tax_percent: yup.number().typeError('Number required').min(0).max(100).required(),
  discount_percent: yup.number().typeError('Number required').min(0).max(100).required(),

  weight_volume: yup.string().max(60).default(''),
  expiry_date: yup.string().default(''),
  manufacturing_date: yup.string().default(''),
  batch_number: yup.string().max(60).default(''),
  storage_instructions: yup.string().max(500).default(''),

  status: yup
    .mixed<'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'ARCHIVED'>()
    .oneOf(['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED'])
    .required(),
  visibility: yup
    .mixed<'PUBLIC' | 'INTERNAL'>()
    .oneOf(['PUBLIC', 'INTERNAL'])
    .required(),
  tags: yup.array().of(yup.string().required().max(40)).max(20, 'At most 20 tags').default([]),

  pod_available: yup.boolean().required(),
  host_request_allowed: yup.boolean().required(),
  delivery_available: yup.boolean().required(),
  delivery_charge: yup.number().typeError('Number required').min(0).max(100000).required(),
});
