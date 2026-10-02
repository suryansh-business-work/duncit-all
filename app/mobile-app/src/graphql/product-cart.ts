import { gql } from '@/generated/graphql';

/** Products portal > Cart Settings — the nudge half only. Twin of mWeb's
 * components/cart/cart-reminder/queries.ts (rule 27). Public. */
export const MobileProductCartNudgeSettingsDocument = gql(`
  query MobileProductCartNudgeSettings {
    productCartSettings {
      nudge_enabled
      nudge_delay_minutes
      nudge_auto_hide_seconds
    }
  }
`);

/** Mirror the signed-in member's cart (ids + quantities) for the reminder email. */
export const MobileSyncMyProductCartDocument = gql(`
  mutation MobileSyncMyProductCart($lines: [ProductCartLineInput!]!) {
    syncMyProductCart(lines: $lines)
  }
`);
