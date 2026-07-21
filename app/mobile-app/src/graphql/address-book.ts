import { gql } from '@/generated/graphql';

/** The signed-in user's saved addresses (Profile Settings › Address Book). */
export const MyAddressesDocument = gql(`
  query MobileMyAddresses {
    myAddresses {
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
  }
`);

export const SaveMyAddressDocument = gql(`
  mutation MobileSaveMyAddress($id: ID, $input: UserAddressInput!) {
    saveMyAddress(id: $id, input: $input) {
      id
      label
      line1
      city
      is_default
    }
  }
`);

export const DeleteMyAddressDocument = gql(`
  mutation MobileDeleteMyAddress($id: ID!) {
    deleteMyAddress(id: $id)
  }
`);
