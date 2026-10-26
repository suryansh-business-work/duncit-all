import { gql } from '@apollo/client';

export const ECOMM_MANAGER_ROLE = 'ECOMM_MANAGER';
/** Shown in place of the listing tools to anyone without ECOMM_MANAGER — render it with `t()`. */
export const PRODUCT_ACCESS_MESSAGE_KEY = 'partners.listProductsPage.ecommManagerRequired';

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