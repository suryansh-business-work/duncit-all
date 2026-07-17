import type { MockedResponse } from '@apollo/client/testing';
import type {
  Category,
  InventoryActivityLog,
  InventoryAnalyticsPoint,
  InventoryLinkedPod,
  InventoryProduct,
  InventoryStockMovement,
} from '@duncit/gql-types';
import {
  CREATE_PRODUCT,
  DELETE_PRODUCT,
  INVENTORY_PRODUCTS,
  UPDATE_PRODUCT,
  type InventoryProductRow,
} from '../../src/pages/inventory-page/queries';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  DUPLICATE_INVENTORY_PRODUCT,
  GENERATE_INVENTORY_SKU,
  INVENTORY_ACTIVITY_LOGS,
  INVENTORY_ANALYTICS,
  INVENTORY_CATEGORIES,
  INVENTORY_LINKED_PODS,
  INVENTORY_PRODUCT_DETAIL,
  INVENTORY_STOCK_MOVEMENTS,
  PERMANENT_DELETE_INVENTORY_PRODUCT,
  RESTORE_INVENTORY_PRODUCT,
} from '../../src/pages/inventory-page/inventory-product-page/productQueries';

/**
 * Inventory-domain mocks. `makeInventoryProduct` returns a fully-typed
 * `InventoryProduct` (every required field + `__typename`) so the detail query
 * satisfies Apollo's cache with no missing-field warnings; the query builders
 * and table-row factory below all derive from it, keeping the data bound to the
 * generated schema.
 */
export const makeInventoryProduct = (
  over: Partial<InventoryProduct> = {},
): InventoryProduct => ({
  __typename: 'InventoryProduct',
  id: 'i1',
  product_name: 'Cold Brew',
  sku: 'CB-1',
  barcode: '',
  short_description: 'Chilled coffee',
  description: 'Small-batch cold brew.',
  brand_name: 'Duncit',
  brand_id: null,
  category_id: 'c1',
  sub_category_id: null,
  super_category_id: null,
  product_type: 'CONSUMABLE',
  unit_type: 'BOTTLE',
  image_url: '',
  images: [],
  min_order_qty: 1,
  max_order_qty: 100,
  low_stock_alert: 5,
  inventory_count: 3,
  reserved_count: 0,
  damaged_count: 0,
  requested_count: 0,
  available_count: 2,
  vendor_name: 'Acme Supply',
  supplier_contact: 'supplier@acme.com',
  unit_cost: 90,
  purchase_price: 80,
  selling_price: 120,
  tax_percent: 5,
  discount_percent: 0,
  weight_volume: '250ml',
  expiry_date: null,
  manufacturing_date: null,
  batch_number: '',
  storage_instructions: '',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  tags: [],
  pod_available: true,
  host_request_allowed: true,
  delivery_available: true,
  delivery_charge: 0,
  delivery_target: 'HOST',
  height_cm: 10,
  length_cm: 10,
  breadth_cm: 5,
  weight_kg: 1,
  color: 'Black',
  commission_pct: 10,
  size_label: 'M',
  ownership: 'DUNCIT',
  is_active: true,
  is_duncit_delivery_partner: true,
  listing_review_status: 'PENDING',
  listing_review_notes: '',
  listing_reviewed_by_name: '',
  listing_reviewed_by_id: null,
  listing_submitted_by_name: 'Ravi',
  listing_submitted_by_id: null,
  last_updated_by_name: 'Asha',
  last_updated_by_id: null,
  variants: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Table row consumed by the inventory table columns (nullable projection). */
export const makeInventoryProductRow = (
  over: Partial<InventoryProductRow> = {},
): InventoryProductRow => {
  const p = makeInventoryProduct();
  return {
    id: p.id,
    product_name: p.product_name,
    sku: p.sku,
    brand_name: p.brand_name,
    image_url: p.image_url,
    unit_cost: p.unit_cost,
    selling_price: p.selling_price,
    inventory_count: p.inventory_count,
    available_count: p.available_count,
    low_stock_alert: p.low_stock_alert,
    status: p.status,
    created_at: p.created_at,
    ...over,
  };
};

/** `categories { id name level }` — only the queried fields are modelled. */
export type CategoryMock = Pick<Category, 'id' | 'name' | 'level'> & { __typename?: 'Category' };
export const makeCategory = (over: Partial<CategoryMock> = {}): CategoryMock => ({
  __typename: 'Category',
  id: 'c1',
  name: 'Beverages',
  level: 'CATEGORY',
  ...over,
});

export const makeInventoryActivityLog = (
  over: Partial<InventoryActivityLog> = {},
): InventoryActivityLog => ({
  __typename: 'InventoryActivityLog',
  id: 'log1',
  product_id: 'i1',
  user_id: null,
  user_name: 'Asha',
  action: 'UPDATE',
  changed_fields: ['selling_price'],
  notes: '',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const makeInventoryStockMovement = (
  over: Partial<InventoryStockMovement> = {},
): InventoryStockMovement => ({
  __typename: 'InventoryStockMovement',
  id: 'mv1',
  product_id: 'i1',
  user_id: null,
  user_name: 'Asha',
  type: 'IN',
  quantity: 10,
  reason: 'Restock',
  balance_after: 13,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const makeInventoryAnalyticsPoint = (
  over: Partial<InventoryAnalyticsPoint> = {},
): InventoryAnalyticsPoint => ({
  __typename: 'InventoryAnalyticsPoint',
  date: '2026-01-01',
  in_qty: 10,
  out_qty: 4,
  net_qty: 6,
  ...over,
});

/** `inventoryProductLinkedPods { id pod_id pod_title is_active }`. */
export type InventoryLinkedPodMock = Pick<
  InventoryLinkedPod,
  'id' | 'pod_id' | 'pod_title' | 'is_active'
> & { __typename?: 'InventoryLinkedPod' };
export const makeInventoryLinkedPod = (
  over: Partial<InventoryLinkedPodMock> = {},
): InventoryLinkedPodMock => ({
  __typename: 'InventoryLinkedPod',
  id: 'pod1',
  pod_id: 'POD-1',
  pod_title: 'Sunset',
  is_active: true,
  ...over,
});

/* ---- Query builders ---- */

export const inventoryProductDetailMock = (
  product: InventoryProduct | null = makeInventoryProduct({ id: 'p1' }),
  id = 'p1',
): MockedResponse => ({
  request: { query: INVENTORY_PRODUCT_DETAIL, variables: { id } },
  result: { data: { inventoryProduct: product } },
  maxUsageCount: 20,
});

export const inventoryCategoriesMock = (
  categories: CategoryMock[] = [makeCategory(), makeCategory({ id: 'super', name: 'All', level: 'SUPER' })],
): MockedResponse => ({
  request: { query: INVENTORY_CATEGORIES },
  result: { data: { categories } },
  maxUsageCount: 20,
});

export const inventoryActivityLogsMock = (
  rows: InventoryActivityLog[] = [],
  id = 'p1',
): MockedResponse => ({
  request: { query: INVENTORY_ACTIVITY_LOGS, variables: { id } },
  result: { data: { inventoryActivityLogs: rows } },
  maxUsageCount: 20,
});

export const inventoryStockMovementsMock = (
  rows: InventoryStockMovement[] = [],
  id = 'p1',
): MockedResponse => ({
  request: { query: INVENTORY_STOCK_MOVEMENTS, variables: { id } },
  result: { data: { inventoryStockMovements: rows } },
  maxUsageCount: 20,
});

export const inventoryAnalyticsMock = (
  rows: InventoryAnalyticsPoint[] = [],
  id = 'p1',
): MockedResponse => ({
  request: { query: INVENTORY_ANALYTICS, variables: { id } },
  result: { data: { inventoryAnalytics: rows } },
  maxUsageCount: 20,
});

export const inventoryLinkedPodsMock = (
  rows: InventoryLinkedPodMock[] = [],
  id = 'p1',
): MockedResponse => ({
  request: { query: INVENTORY_LINKED_PODS, variables: { id } },
  result: { data: { inventoryProductLinkedPods: rows } },
  maxUsageCount: 20,
});

/** Every query the product editor fires when loading an existing product. */
export const inventoryEditQueryMocks = (product: InventoryProduct | null): MockedResponse[] => [
  inventoryProductDetailMock(product),
  inventoryCategoriesMock(),
  inventoryActivityLogsMock(),
  inventoryStockMovementsMock(),
  inventoryAnalyticsMock(),
];

export const inventoryProductsListMock = (
  products: InventoryProduct[] = [],
  over: { error?: boolean } = {},
): MockedResponse => ({
  request: { query: INVENTORY_PRODUCTS },
  variableMatcher: () => true,
  result: over.error
    ? { errors: [{ message: 'boom' }] }
    : { data: { inventoryProducts: products } },
  maxUsageCount: 20,
});

/* ---- Mutation builders ---- */

export const createProductMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: CREATE_PRODUCT },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: 'save failed' }] }
    : { data: { createInventoryProduct: { __typename: 'InventoryProduct', id: 'new-1' } } },
  maxUsageCount: 20,
});

export const updateProductMock = (): MockedResponse => ({
  request: { query: UPDATE_PRODUCT },
  variableMatcher: () => true,
  result: { data: { updateInventoryProduct: { __typename: 'InventoryProduct', id: 'p1' } } },
  maxUsageCount: 20,
});

export const deleteProductMock = (id = 'p1'): MockedResponse => ({
  request: { query: DELETE_PRODUCT, variables: { id } },
  result: { data: { deleteInventoryProduct: true } },
  maxUsageCount: 20,
});

export const archiveProductMock = (over: { id?: string; fail?: boolean } = {}): MockedResponse => {
  const id = over.id ?? 'p1';
  return {
    request: { query: ARCHIVE_INVENTORY_PRODUCT, variables: { id } },
    result: over.fail
      ? { errors: [{ message: 'no archive' }] }
      : {
          data: {
            archiveInventoryProduct: {
              __typename: 'InventoryProduct',
              id,
              status: 'ARCHIVED',
              is_active: false,
            },
          },
        },
    maxUsageCount: 20,
  };
};

export const permanentDeleteProductMock = (id = 'p1'): MockedResponse => ({
  request: { query: PERMANENT_DELETE_INVENTORY_PRODUCT, variables: { id } },
  result: { data: { permanentlyDeleteInventoryProduct: true } },
  maxUsageCount: 20,
});

export const restoreProductMock = (id = 'p1'): MockedResponse => ({
  request: { query: RESTORE_INVENTORY_PRODUCT, variables: { id } },
  result: {
    data: {
      restoreInventoryProduct: {
        __typename: 'InventoryProduct',
        id,
        status: 'ACTIVE',
        is_active: true,
      },
    },
  },
  maxUsageCount: 20,
});

export const duplicateProductMock = (id = 'p1', newId = 'p2'): MockedResponse => ({
  request: { query: DUPLICATE_INVENTORY_PRODUCT, variables: { id } },
  result: { data: { duplicateInventoryProduct: { __typename: 'InventoryProduct', id: newId } } },
  maxUsageCount: 20,
});

export const generateSkuMock = (over: { value?: string; fail?: boolean } = {}): MockedResponse => ({
  request: { query: GENERATE_INVENTORY_SKU },
  result: over.fail
    ? { errors: [{ message: 'rate limited' }] }
    : { data: { generateInventorySku: over.value ?? 'GEN-0001' } },
  maxUsageCount: 20,
});
