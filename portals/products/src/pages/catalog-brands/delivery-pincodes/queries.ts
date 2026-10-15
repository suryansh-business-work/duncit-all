import { gql } from '@apollo/client';

/** One pincode of a brand's delivery area. `serviceable` is null until synced. */
export interface BrandDeliveryPincodeRow {
  id: string;
  pincode: string;
  serviceable: boolean | null;
  courier_name: string;
  etd: string;
  checked_at: string | null;
  sync_error: string;
}

export const BRAND_DELIVERY_PINCODES_TABLE = gql`
  query BrandDeliveryPincodesTable($brandId: ID!, $query: TableQueryInput) {
    brandDeliveryPincodesTable(brand_doc_id: $brandId, query: $query) {
      total
      rows {
        id
        pincode
        serviceable
        courier_name
        etd
        checked_at
        sync_error
      }
    }
  }
`;

export const ADD_BRAND_DELIVERY_PINCODES = gql`
  mutation AddBrandDeliveryPincodes($brandId: ID!, $pincodes: [String!]!) {
    addBrandDeliveryPincodes(brand_doc_id: $brandId, pincodes: $pincodes) {
      added
      duplicates
      invalid
    }
  }
`;

export const REMOVE_BRAND_DELIVERY_PINCODES = gql`
  mutation RemoveBrandDeliveryPincodes($brandId: ID!, $ids: [ID!]!) {
    removeBrandDeliveryPincodes(brand_doc_id: $brandId, ids: $ids)
  }
`;

export const SYNC_BRAND_DELIVERY_PINCODES = gql`
  mutation SyncBrandDeliveryPincodes($brandId: ID!) {
    syncBrandDeliveryPincodes(brand_doc_id: $brandId) {
      checked
      serviceable
      unserviceable
      failed
      total
      unchecked
    }
  }
`;
