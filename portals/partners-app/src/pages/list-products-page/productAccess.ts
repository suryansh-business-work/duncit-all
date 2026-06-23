import { gql } from '@apollo/client';

export const ECOMM_MANAGER_ROLE = 'ECOMM_MANAGER';
export const PRODUCT_ACCESS_MESSAGE = 'You must be an Ecomm Manager to add products.';

export const PRODUCT_LISTING_ACCESS = gql`
  query ProductListingAccess {
    me {
      user_id
      roles
    }
  }
`;

export function canManageProductListings(roles?: string[] | null) {
  return roles?.includes(ECOMM_MANAGER_ROLE) ?? false;
}