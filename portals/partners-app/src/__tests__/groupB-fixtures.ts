/**
 * Server-shaped fixtures for the brand product (list-products-page) suites.
 *
 * Rows carry EVERY field the listing documents select — Apollo's cache drops a
 * partial row, and the component then sees nothing.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { ADMIN_CATEGORIES } from '@duncit/category';
import { MY_PRODUCT_LISTINGS } from '../pages/list-products-page/queries';
import { PRODUCT_LISTING_ACCESS } from '../pages/list-products-page/productAccess';
import { MY_BRAND_WAREHOUSES } from '../pages/ecomm-brand-page/brand-settings/warehouse.queries';

export const ECOMM_MANAGER = 'ECOMM_MANAGER';

/** One product listing as myProductListings / myProductListingsTable return it. */
export const listingRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'InventoryProduct',
  id: 'p1',
  product_name: 'Alpha Tee',
  description: 'Soft cotton tee for weekend pods.',
  image_url: 'https://cdn.test/alpha.jpg',
  images: ['https://cdn.test/alpha.jpg'],
  size_label: 'M',
  height_cm: 2,
  weight_kg: 0.3,
  length_cm: 30,
  breadth_cm: 25,
  color: 'Blue',
  inventory_count: 12,
  available_count: 12,
  low_stock_alert: 3,
  notify_low_stock: false,
  unit_cost: 499,
  commission_pct: 12,
  delivery_target: 'SHIPROCKET',
  pickup_location_id: 'w1',
  free_delivery_above: null,
  super_category_id: 's1',
  category_id: 'c1',
  sub_category_id: 'sc1',
  categories: [
    {
      __typename: 'ProductCategory',
      super_category_id: 's1',
      category_id: 'c1',
      sub_category_id: 'sc1',
      super_category_name: 'Apparel',
      category_name: 'Tops',
      sub_category_name: 'T-shirts',
    },
  ],
  options: [],
  variants: [],
  listing_review_status: 'APPROVED',
  listing_review_notes: '',
  is_duncit_delivery_partner: false,
  status: 'ACTIVE',
  is_active: true,
  updated_at: '2026-07-01T10:00:00',
  ...over,
});

/** The role check every product screen runs first. */
export const accessMock = (roles: string[]): MockedResponse => ({
  request: { query: PRODUCT_LISTING_ACCESS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { me: { __typename: 'User', user_id: 'user-1', roles } } },
});

/** The brand's full listing list — the fallback fetch when no row came via router state. */
export const listingsMock = (rows: unknown[], brandId = 'b1'): MockedResponse => ({
  request: { query: MY_PRODUCT_LISTINGS, variables: { brand_id: brandId } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myProductListings: rows } },
});

const category = (id: string, name: string, level: 'SUPER' | 'CATEGORY' | 'SUB', parentId: string | null) => ({
  __typename: 'Category',
  id,
  name,
  slug: name.toLowerCase(),
  level,
  parent_id: parentId,
  min_pax: level === 'SUB' ? 2 : null,
});

/** The admin category tree the Super → Category → Sub picker reads. */
export const categoriesMock: MockedResponse = {
  request: { query: ADMIN_CATEGORIES },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      categories: [
        category('s1', 'Apparel', 'SUPER', null),
        category('c1', 'Tops', 'CATEGORY', 's1'),
        category('sc1', 'T-shirts', 'SUB', 'c1'),
      ],
    },
  },
};

/** One brand warehouse (BrandPickupLocation) with every selected field. */
export const warehouseRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'BrandPickupLocation',
  id: 'w1',
  owner_kind: 'BRAND',
  brand_id: 'b1',
  review_status: 'APPROVED',
  nickname: 'Delhi warehouse',
  contact_name: 'Asha Rao',
  phone: '9876543210',
  email: 'asha@duncit.com',
  address_line1: '12 Industrial Area',
  address_line2: 'Phase 2',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110020',
  country: 'India',
  is_default: true,
  shiprocket_registered: true,
  shiprocket_error: '',
  shiprocket_pickup_id: 'SR-1',
  updated_at: '2026-07-01T00:00:00.000Z',
  ...over,
});

/** The brand's warehouses, as the Delivery step and the preview read them. */
export const warehousesMock = (rows: unknown[], brandId = 'b1'): MockedResponse => ({
  request: { query: MY_BRAND_WAREHOUSES, variables: { brand_doc_id: brandId } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { myBrandPickupLocations: rows } },
});
