import { gql } from '@apollo/client';

/** A pincode the store delivers to; once any exist, only the active ones are served. */
export interface StoreServiceablePincode {
  id: string;
  pincode: string;
  area: string;
  city: string;
  state: string;
  is_active: boolean;
  created_at: string;
}

const PINCODE_FIELDS = `
  id
  pincode
  area
  city
  state
  is_active
  created_at
`;

export const STORE_SERVICEABLE_PINCODES_TABLE = gql`
  query StoreServiceablePincodesTable($query: TableQueryInput) {
    storeServiceablePincodesTable(query: $query) {
      total
      rows {
        ${PINCODE_FIELDS}
      }
    }
  }
`;

export const SAVE_SERVICEABLE_PINCODE = gql`
  mutation StoreSaveServiceablePincode($id: ID, $input: StoreServiceablePincodeInput!) {
    storeSaveServiceablePincode(id: $id, input: $input) {
      ${PINCODE_FIELDS}
    }
  }
`;

export const DELETE_SERVICEABLE_PINCODE = gql`
  mutation StoreDeleteServiceablePincode($id: ID!) {
    storeDeleteServiceablePincode(id: $id)
  }
`;
