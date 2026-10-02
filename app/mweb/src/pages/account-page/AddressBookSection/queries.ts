import { gql } from '@apollo/client';

const ADDRESS_FIELDS = gql`
  fragment AddressFields on UserAddress {
    id
    label
    name
    phone
    email
    line1
    line2
    landmark
    city
    state
    pincode
    country
    is_default
  }
`;

export const MY_ADDRESSES = gql`
  query MyAddresses {
    myAddresses {
      ...AddressFields
    }
  }
  ${ADDRESS_FIELDS}
`;

export const SAVE_MY_ADDRESS = gql`
  mutation SaveMyAddress($id: ID, $input: UserAddressInput!) {
    saveMyAddress(id: $id, input: $input) {
      ...AddressFields
    }
  }
  ${ADDRESS_FIELDS}
`;

export const DELETE_MY_ADDRESS = gql`
  mutation DeleteMyAddress($id: ID!) {
    deleteMyAddress(id: $id)
  }
`;
