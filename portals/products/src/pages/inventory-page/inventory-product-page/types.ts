export type ProductType = 'CONSUMABLE' | 'MERCHANDISE' | 'EQUIPMENT';
export type UnitType =
  | 'BOTTLE'
  | 'PIECE'
  | 'PACKET'
  | 'BOX'
  | 'KG'
  | 'LITRE'
  | 'METER'
  | 'OTHER';
export type InventoryStatus = 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK' | 'ARCHIVED';
export type InventoryVisibility = 'PUBLIC' | 'INTERNAL';
export type StockMovementType =
  | 'IN'
  | 'OUT'
  | 'RESERVE'
  | 'RELEASE'
  | 'DAMAGE'
  | 'ADJUST';

export interface InventoryProductFormValues {
  id?: string;

  product_name: string;
  sku: string;
  barcode: string;
  short_description: string;
  description: string;

  category_id: string;
  brand_name: string;
  product_type: ProductType;
  unit_type: UnitType;

  image_url: string;
  images: string[];

  min_order_qty: number;
  max_order_qty: number;
  low_stock_alert: number;
  inventory_count: number;
  reserved_count: number;
  damaged_count: number;

  vendor_name: string;
  supplier_contact: string;

  unit_cost: number;
  purchase_price: number;
  selling_price: number;
  tax_percent: number;
  discount_percent: number;

  weight_volume: string;
  expiry_date: string;
  manufacturing_date: string;
  batch_number: string;
  storage_instructions: string;

  status: InventoryStatus;
  visibility: InventoryVisibility;
  tags: string[];

  pod_available: boolean;
  host_request_allowed: boolean;
  delivery_available: boolean;
  delivery_charge: number;

  height_cm: number;
  length_cm: number;
  breadth_cm: number;
  weight_kg: number;
}

export const blankProductForm: InventoryProductFormValues = {
  product_name: '',
  sku: '',
  barcode: '',
  short_description: '',
  description: '',
  category_id: '',
  brand_name: '',
  product_type: 'CONSUMABLE',
  unit_type: 'PIECE',
  image_url: '',
  images: [],
  min_order_qty: 1,
  max_order_qty: 100,
  low_stock_alert: 5,
  inventory_count: 0,
  reserved_count: 0,
  damaged_count: 0,
  vendor_name: '',
  supplier_contact: '',
  unit_cost: 0,
  purchase_price: 0,
  selling_price: 0,
  tax_percent: 0,
  discount_percent: 0,
  weight_volume: '',
  expiry_date: '',
  manufacturing_date: '',
  batch_number: '',
  storage_instructions: '',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  tags: [],
  pod_available: true,
  host_request_allowed: true,
  delivery_available: false,
  delivery_charge: 0,
  height_cm: 0,
  length_cm: 0,
  breadth_cm: 0,
  weight_kg: 0,
};

export function toFormValues(product: any): InventoryProductFormValues {
  if (!product) return blankProductForm;
  const dateOnly = (iso: string | null | undefined) =>
    iso ? new Date(iso).toISOString().slice(0, 10) : '';
  return {
    id: product.id,
    product_name: product.product_name ?? '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    short_description: product.short_description ?? '',
    description: product.description ?? '',
    category_id: product.category_id ?? '',
    brand_name: product.brand_name ?? '',
    product_type: (product.product_type as ProductType) ?? 'CONSUMABLE',
    unit_type: (product.unit_type as UnitType) ?? 'PIECE',
    image_url: product.image_url ?? '',
    images: Array.isArray(product.images) ? product.images : [],
    min_order_qty: product.min_order_qty ?? 1,
    max_order_qty: product.max_order_qty ?? 100,
    low_stock_alert: product.low_stock_alert ?? 5,
    inventory_count: product.inventory_count ?? 0,
    reserved_count: product.reserved_count ?? 0,
    damaged_count: product.damaged_count ?? 0,
    vendor_name: product.vendor_name ?? '',
    supplier_contact: product.supplier_contact ?? '',
    unit_cost: product.unit_cost ?? 0,
    purchase_price: product.purchase_price ?? 0,
    selling_price: product.selling_price ?? 0,
    tax_percent: product.tax_percent ?? 0,
    discount_percent: product.discount_percent ?? 0,
    weight_volume: product.weight_volume ?? '',
    expiry_date: dateOnly(product.expiry_date),
    manufacturing_date: dateOnly(product.manufacturing_date),
    batch_number: product.batch_number ?? '',
    storage_instructions: product.storage_instructions ?? '',
    status: (product.status as InventoryStatus) ?? 'ACTIVE',
    visibility: (product.visibility as InventoryVisibility) ?? 'PUBLIC',
    tags: Array.isArray(product.tags) ? product.tags : [],
    pod_available: product.pod_available ?? true,
    host_request_allowed: product.host_request_allowed ?? true,
    delivery_available: product.delivery_available ?? false,
    delivery_charge: product.delivery_charge ?? 0,
    height_cm: product.height_cm ?? 0,
    length_cm: product.length_cm ?? 0,
    breadth_cm: product.breadth_cm ?? 0,
    weight_kg: product.weight_kg ?? 0,
  };
}

export function toSubmitInput(values: InventoryProductFormValues) {
  const { id: _id, ...rest } = values;
  return {
    ...rest,
    sku: rest.sku.trim().toUpperCase(),
    category_id: rest.category_id || null,
    expiry_date: rest.expiry_date || null,
    manufacturing_date: rest.manufacturing_date || null,
    images: rest.images.filter(Boolean),
  };
}
