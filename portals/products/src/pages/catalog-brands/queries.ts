import { gql } from '@apollo/client';

/**
 * Catalog > Brands documents — the catalogue view of non-Duncit seller brands
 * and their products. Approvals are NOT here: approve/reject live in
 * Brands & Products Review (`../ecomm`), so this module deliberately exports no
 * approveEcommBrand / rejectEcommBrand document.
 *
 * `ecommBrandsTable` (not `marketplaceBrandsTable`) is the source: it is
 * unscoped, so every status — DRAFT/SUBMITTED/APPROVED/REJECTED — and
 * deactivated brands are all listed.
 */

/** Row shape consumed by the catalog brands table columns. */
export interface CatalogBrandRow {
  id: string;
  brand_no?: string | null;
  brand_name: string;
  logo_url?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  is_active: boolean;
  approved_product_count: number;
  product_commission_pct: number;
  created_at?: string | null;
}

const CATALOG_BRAND_ROW_FIELDS = gql`
  fragment CatalogBrandRowFields on EcommBrand {
    id
    brand_no
    brand_name
    logo_url
    contact_person
    contact_email
    contact_phone
    city
    state
    status
    is_active
    approved_product_count
    product_commission_pct
    created_at
  }
`;

export const CATALOG_BRANDS_TABLE = gql`
  query CatalogBrandsTable($query: TableQueryInput) {
    ecommBrandsTable(query: $query) {
      total
      rows {
        ...CatalogBrandRowFields
      }
    }
  }
  ${CATALOG_BRAND_ROW_FIELDS}
`;

/** Full brand record behind the Manage screen (every EcommBrandInput field). */
export interface CatalogBrandDetail extends CatalogBrandRow {
  cover_image_url?: string | null;
  tagline?: string | null;
  description?: string | null;
  product_categories?: string[] | null;
  website_url?: string | null;
  instagram_url?: string | null;
  registered_business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  established_year?: number | null;
  address_line1?: string | null;
  postal_code?: string | null;
  country?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
  documents?: { type: string; url: string }[] | null;
  reviewer_notes?: string | null;
  submitted_at?: string | null;
}

export const CATALOG_BRAND = gql`
  query CatalogBrand($id: ID!) {
    ecommBrand(brand_doc_id: $id) {
      ...CatalogBrandRowFields
      cover_image_url
      tagline
      description
      product_categories
      website_url
      instagram_url
      registered_business_name
      gstin
      pan
      established_year
      address_line1
      postal_code
      country
      account_holder_name
      account_number
      ifsc_code
      upi_id
      documents {
        type
        url
      }
      reviewer_notes
      submitted_at
    }
  }
  ${CATALOG_BRAND_ROW_FIELDS}
`;

/**
 * Manage-screen mutations. `status` is intentionally omitted from the
 * adminUpdateEcommBrand variables: passing status: APPROVED there grants the
 * owner the E-commerce Manager role, i.e. a back-door approve inside Catalog.
 */
export const ADMIN_UPDATE_ECOMM_BRAND = gql`
  mutation AdminUpdateEcommBrand($id: ID!, $input: EcommBrandInput!) {
    adminUpdateEcommBrand(brand_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const SET_BRAND_COMMISSION = gql`
  mutation SetBrandCommission($id: ID!, $product_commission_pct: Float!) {
    setBrandCommission(brand_doc_id: $id, product_commission_pct: $product_commission_pct) {
      id
      product_commission_pct
    }
  }
`;

export const SET_ECOMM_BRAND_ACTIVE = gql`
  mutation SetEcommBrandActive($id: ID!, $active: Boolean!) {
    setEcommBrandActive(brand_doc_id: $id, active: $active) {
      id
      is_active
    }
  }
`;

/** Row shape consumed by a brand's products table columns. */
export interface CatalogBrandProductRow {
  id: string;
  product_name: string;
  sku: string;
  image_url?: string | null;
  unit_cost: number;
  selling_price?: number | null;
  inventory_count: number;
  available_count: number;
  listing_review_status: string;
  commission_pct: number;
  status: string;
  is_active: boolean;
  created_at?: string | null;
}

const CATALOG_BRAND_PRODUCT_ROW_FIELDS = gql`
  fragment CatalogBrandProductRowFields on InventoryProduct {
    id
    product_name
    sku
    image_url
    unit_cost
    selling_price
    inventory_count
    available_count
    listing_review_status
    commission_pct
    status
    is_active
    created_at
  }
`;

/**
 * Every product of one brand — approved listings included, but also PENDING and
 * DENIED ones, which `marketplaceBrandProductsTable` deliberately hides. Scope
 * it with `extraFilters: [{ownership eq BRAND}, {brand_id eq <brandId>}]`;
 * `brand_id` is an ObjectId path, so only `op: 'eq'` is safe (a `contains`
 * regex CastErrors server-side).
 */
export const CATALOG_BRAND_PRODUCTS_TABLE = gql`
  query CatalogBrandProductsTable($query: TableQueryInput) {
    inventoryProductsTable(query: $query) {
      total
      rows {
        ...CatalogBrandProductRowFields
      }
    }
  }
  ${CATALOG_BRAND_PRODUCT_ROW_FIELDS}
`;

// Archive / restore / duplicate already exist for the Duncit catalogue and are
// ownership-agnostic server-side — re-exported rather than re-declared (rule 34).
export {
  ARCHIVE_INVENTORY_PRODUCT,
  DUPLICATE_INVENTORY_PRODUCT,
  RESTORE_INVENTORY_PRODUCT,
} from '../inventory-page/inventory-product-page/productQueries';
