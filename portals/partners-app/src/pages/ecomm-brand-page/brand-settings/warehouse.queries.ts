import { gql } from '@apollo/client';

const WAREHOUSE_FIELDS = `
  id
  owner_kind
  brand_id
  review_status
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
  shiprocket_error
  shiprocket_pickup_id
  updated_at
`;

/** Warehouses of one of the caller's OWN brands (Brand Settings + Delivery step). */
export const MY_BRAND_WAREHOUSES = gql`
  query MyBrandPickupLocations($brand_doc_id: ID!) {
    myBrandPickupLocations(brand_doc_id: $brand_doc_id) { ${WAREHOUSE_FIELDS} }
  }
`;

export const SAVE_MY_WAREHOUSE = gql`
  mutation SaveMyBrandPickupLocation($brand_doc_id: ID!, $id: ID, $input: BrandPickupLocationInput!) {
    saveMyBrandPickupLocation(brand_doc_id: $brand_doc_id, id: $id, input: $input) { ${WAREHOUSE_FIELDS} }
  }
`;

export const DELETE_MY_WAREHOUSE = gql`
  mutation DeleteMyBrandPickupLocation($brand_doc_id: ID!, $id: ID!) {
    deleteMyBrandPickupLocation(brand_doc_id: $brand_doc_id, id: $id)
  }
`;

export const SET_DEFAULT_MY_WAREHOUSE = gql`
  mutation SetDefaultMyBrandPickupLocation($brand_doc_id: ID!, $id: ID!) {
    setDefaultMyBrandPickupLocation(brand_doc_id: $brand_doc_id, id: $id) { ${WAREHOUSE_FIELDS} }
  }
`;

/** Products-portal review state. A warehouse can only be used for shipping — and
 * so only be picked on a product — once it is APPROVED. */
export type WarehouseReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const isWarehouseUsable = (warehouse: BrandWarehouse) => warehouse.review_status === 'APPROVED';

/** One brand warehouse (BrandPickupLocation) as listed in Brand Settings. */
export interface BrandWarehouse {
  id: string;
  owner_kind: 'DUNCIT' | 'BRAND';
  brand_id: string | null;
  review_status: WarehouseReviewStatus;
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  shiprocket_registered: boolean;
  shiprocket_error: string;
  shiprocket_pickup_id: string;
  updated_at: string;
}
