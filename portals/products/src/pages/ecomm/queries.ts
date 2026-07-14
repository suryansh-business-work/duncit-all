import { gql } from '@apollo/client';

export const MARKETPLACE_BRANDS = gql`
  query MarketplaceBrands($status: EcommBrandStatus) {
    marketplaceBrands(status: $status) {
      id
      brand_name
      logo_url
      status
      approved_product_count
      default_pickup_location_id
      city
      state
      contact_email
      contact_phone
    }
  }
`;

export const MARKETPLACE_BRAND_PRODUCTS = gql`
  query MarketplaceBrandProducts($brand_doc_id: ID!) {
    marketplaceBrandProducts(brand_doc_id: $brand_doc_id) {
      id
      product_name
      sku
      image_url
      unit_cost
      selling_price
      inventory_count
      available_count
      status
      commission_pct
      height_cm
      length_cm
      breadth_cm
      weight_kg
    }
  }
`;

/** Row shape consumed by the marketplace brands table columns. */
export interface EcommBrandRow {
  id: string;
  brand_name: string;
  logo_url?: string | null;
  status: string;
  approved_product_count: number;
  default_pickup_location_id?: string | null;
  city?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
}

/** Same selection as MARKETPLACE_BRANDS rows (+ created_at for the Created filter column). */
const ECOMM_BRAND_ROW_FIELDS = gql`
  fragment EcommBrandRowFields on EcommBrand {
    id
    brand_name
    logo_url
    status
    approved_product_count
    default_pickup_location_id
    city
    state
    contact_email
    contact_phone
    created_at
  }
`;

export const MARKETPLACE_BRANDS_TABLE = gql`
  query MarketplaceBrandsTable($query: TableQueryInput) {
    marketplaceBrandsTable(query: $query) {
      total
      rows {
        ...EcommBrandRowFields
      }
    }
  }
  ${ECOMM_BRAND_ROW_FIELDS}
`;

/** Row shape consumed by the brand products table columns. */
export interface BrandProductRow {
  id: string;
  product_name: string;
  sku: string;
  image_url?: string | null;
  unit_cost: number;
  selling_price?: number | null;
  inventory_count: number;
  available_count?: number | null;
  commission_pct: number;
  height_cm: number;
  length_cm: number;
  breadth_cm: number;
  weight_kg: number;
  created_at?: string | null;
}

/** Same selection as MARKETPLACE_BRAND_PRODUCTS rows (+ created_at for the Added filter column). */
const BRAND_PRODUCT_ROW_FIELDS = gql`
  fragment BrandProductRowFields on InventoryProduct {
    id
    product_name
    sku
    image_url
    unit_cost
    selling_price
    inventory_count
    available_count
    commission_pct
    height_cm
    length_cm
    breadth_cm
    weight_kg
    created_at
  }
`;

export const MARKETPLACE_BRAND_PRODUCTS_TABLE = gql`
  query MarketplaceBrandProductsTable($brand_doc_id: ID!, $query: TableQueryInput) {
    marketplaceBrandProductsTable(brand_doc_id: $brand_doc_id, query: $query) {
      total
      rows {
        ...BrandProductRowFields
      }
    }
  }
  ${BRAND_PRODUCT_ROW_FIELDS}
`;

export const BRAND_PICKUP_LOCATIONS = gql`
  query BrandPickupLocations($owner_kind: PickupOwnerKind, $brand_doc_id: ID) {
    brandPickupLocations(owner_kind: $owner_kind, brand_doc_id: $brand_doc_id) {
      id
      owner_kind
      brand_id
      nickname
      contact_name
      phone
      email
      address_line1
      address_line2
      city
      state
      pincode
      country
      is_default
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;

export const SAVE_BRAND_PICKUP_LOCATION = gql`
  mutation SaveBrandPickupLocation($id: ID, $input: BrandPickupLocationInput!) {
    saveBrandPickupLocation(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_BRAND_PICKUP_LOCATION = gql`
  mutation DeleteBrandPickupLocation($id: ID!) {
    deleteBrandPickupLocation(id: $id)
  }
`;

export const SET_DEFAULT_BRAND_PICKUP_LOCATION = gql`
  mutation SetDefaultBrandPickupLocation($id: ID!) {
    setDefaultBrandPickupLocation(id: $id) {
      id
      is_default
    }
  }
`;

export const REGISTER_BRAND_PICKUP_WITH_SHIPROCKET = gql`
  mutation RegisterBrandPickupWithShiprocket($id: ID!) {
    registerBrandPickupWithShiprocket(id: $id) {
      id
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;
