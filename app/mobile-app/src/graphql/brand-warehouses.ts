import { gql } from '@/generated/graphql';

/**
 * Brand Studio → ShipRocket Warehouses: the partner's brands, one brand's
 * pickup addresses, and the check against ShipRocket. RN twin of mWeb's
 * pages/brand-warehouses-page/queries.
 */

/** Just the names — what the brand picker needs. */
export const MyBrandOptionsDocument = gql(`
  query MobileBrandOptions {
    myEcommBrands {
      id
      brand_name
    }
  }
`);

export const BrandWarehouseFieldsFragment = gql(`
  fragment MobileBrandWarehouse on BrandPickupLocation {
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
  }
`);

export const MyBrandWarehousesDocument = gql(`
  query MobileBrandWarehouses($brandId: ID!) {
    myBrandPickupLocations(brand_doc_id: $brandId) {
      ...MobileBrandWarehouse
    }
  }
`);

export const SyncMyBrandWarehousesDocument = gql(`
  mutation MobileSyncBrandWarehouses($brandId: ID!) {
    syncMyBrandPickupLocations(brand_doc_id: $brandId) {
      shiprocket_error
      adopted
      synced_at
      warehouses {
        ...MobileBrandWarehouse
      }
    }
  }
`);
