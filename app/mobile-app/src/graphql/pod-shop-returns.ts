import { gql } from '@/generated/graphql';

/** The signed-in buyer's pod-shop returns, listed under the order each one is
 * for — RN twin of mWeb's MY_POD_SHOP_RETURNS. */
export const MyPodShopReturnsDocument = gql(`
  query MobileMyPodShopReturns {
    myPodShopReturns {
      id
      return_no
      order_id
      status
      decision_note
      items {
        product_id
        variant_id
        name
        variant_label
        qty
      }
      pickup {
        awb
        courier_name
      }
      refund {
        status
        amount
        coins
        refunded_at
      }
      created_at
    }
  }
`);

/** Ask to send items back; the server splits it per brand. Twin of REQUEST_POD_SHOP_RETURN. */
export const RequestPodShopReturnDocument = gql(`
  mutation MobileRequestPodShopReturn($input: RequestPodShopReturnInput!) {
    requestPodShopReturn(input: $input) {
      id
      return_no
    }
  }
`);

/** Withdraw a return nobody has decided yet. Twin of CANCEL_MY_POD_SHOP_RETURN. */
export const CancelMyPodShopReturnDocument = gql(`
  mutation MobileCancelMyPodShopReturn($id: ID!) {
    cancelMyPodShopReturn(id: $id) {
      id
      status
    }
  }
`);
