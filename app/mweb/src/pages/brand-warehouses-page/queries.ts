import { gql, type TypedDocumentNode } from '@apollo/client';

/**
 * Brand Studio → ShipRocket Warehouses: the partner's brands, one brand's
 * pickup addresses, and the check against ShipRocket. Native twin:
 * graphql/brand-warehouses.
 */

export interface BrandOption {
  id: string;
  brand_name: string;
}

export interface BrandWarehouse {
  id: string;
  nickname: string;
  contact_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  review_status: string;
  shiprocket_registered: boolean;
  shiprocket_error: string;
}

export interface BrandPickupSync {
  warehouses: BrandWarehouse[];
  shiprocket_error: string;
  adopted: number;
  synced_at: string;
}

/** Just the names — what the brand picker needs. */
export const MY_BRAND_OPTIONS: TypedDocumentNode<{ myEcommBrands: BrandOption[] }> = gql`
  query MwebBrandOptions {
    myEcommBrands {
      id
      brand_name
    }
  }
`;

const WAREHOUSE_FIELDS = `
  id
  nickname
  contact_name
  phone
  address_line1
  address_line2
  city
  state
  pincode
  is_default
  review_status
  shiprocket_registered
  shiprocket_error
`;

export const MY_BRAND_WAREHOUSES: TypedDocumentNode<
  { myBrandPickupLocations: BrandWarehouse[] },
  { brandId: string }
> = gql`
  query MwebBrandWarehouses($brandId: ID!) {
    myBrandPickupLocations(brand_doc_id: $brandId) {
      ${WAREHOUSE_FIELDS}
    }
  }
`;

export const SYNC_MY_BRAND_WAREHOUSES: TypedDocumentNode<
  { syncMyBrandPickupLocations: BrandPickupSync },
  { brandId: string }
> = gql`
  mutation MwebSyncBrandWarehouses($brandId: ID!) {
    syncMyBrandPickupLocations(brand_doc_id: $brandId) {
      shiprocket_error
      adopted
      synced_at
      warehouses {
        ${WAREHOUSE_FIELDS}
      }
    }
  }
`;
