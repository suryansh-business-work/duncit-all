import type { MockedResponse } from '@apollo/client/testing';
import type { EcommBrand } from '@duncit/gql-types';
import { MARKETPLACE_BRANDS, type BrandProductRow, type EcommBrandRow } from '../../src/pages/ecomm/queries';
import { makeInventoryProduct } from './inventory.mock';

/**
 * Ecomm-brand mocks. `makeEcommBrand` is a fully-typed `EcommBrand`; the
 * `MARKETPLACE_BRANDS` selection is a subset of it, so the full object always
 * satisfies the query with `__typename` in place.
 */
export const makeEcommBrand = (over: Partial<EcommBrand> = {}): EcommBrand => ({
  __typename: 'EcommBrand',
  id: 'b1',
  brand_name: 'Acme',
  registered_business_name: 'Acme Pvt Ltd',
  tagline: 'Fresh goods',
  description: 'A demo brand.',
  logo_url: '',
  cover_image_url: '',
  status: 'APPROVED',
  approved_product_count: 5,
  product_commission_pct: 10,
  product_categories: [],
  tags: [],
  documents: [],
  contact_person: 'Asha',
  contact_email: 'sales@acme.com',
  contact_phone: '',
  website_url: '',
  instagram_url: '',
  address_line1: '12 MG Rd',
  city: 'Pune',
  state: 'MH',
  postal_code: '411001',
  country: 'India',
  gstin: '27ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  account_holder_name: 'Acme Pvt Ltd',
  account_number: '000111222333',
  ifsc_code: 'HDFC0000001',
  upi_id: 'acme@upi',
  reviewer_notes: '',
  owner_user_id: 'u1',
  is_active: true,
  default_pickup_location_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Table row for the marketplace brands table (nullable projection). */
export const makeEcommBrandRow = (over: Partial<EcommBrandRow> = {}): EcommBrandRow => {
  const b = makeEcommBrand();
  return {
    id: b.id,
    brand_name: b.brand_name,
    logo_url: b.logo_url,
    status: b.status,
    approved_product_count: b.approved_product_count,
    default_pickup_location_id: 'loc1',
    city: b.city,
    state: b.state,
    contact_email: b.contact_email,
    contact_phone: b.contact_phone,
    created_at: b.created_at,
    ...over,
  };
};

/** Table row for a brand's products table (nullable projection). */
export const makeBrandProductRow = (over: Partial<BrandProductRow> = {}): BrandProductRow => {
  const p = makeInventoryProduct();
  return {
    id: p.id,
    product_name: p.product_name,
    sku: p.sku,
    image_url: p.image_url,
    unit_cost: p.unit_cost,
    selling_price: p.selling_price,
    inventory_count: p.inventory_count,
    available_count: p.available_count,
    commission_pct: p.commission_pct,
    height_cm: p.height_cm,
    length_cm: p.length_cm,
    breadth_cm: p.breadth_cm,
    weight_kg: p.weight_kg,
    created_at: p.created_at,
    ...over,
  };
};

export const marketplaceBrandsMock = (brands: EcommBrand[] = [makeEcommBrand()]): MockedResponse => ({
  request: { query: MARKETPLACE_BRANDS },
  variableMatcher: () => true,
  result: { data: { marketplaceBrands: brands } },
  maxUsageCount: 20,
});
