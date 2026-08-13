import { gql } from '@/generated/graphql';

/** Tiers + comparison rows + the caller's own notify state — RN twin of mWeb's
 * MEMBERSHIP_PRICING. */
export const MobileMembershipPricingDocument = gql(`
  query MobileMembershipPricing {
    membershipPricing {
      is_subscribed
      plans {
        id
        key
        name
        tagline
        price_label
        price_note
        badge_label
        accent_color
        cta_label
      }
      benefits {
        id
        group
        label
        values {
          plan_key
          value
        }
      }
    }
  }
`);

/** RN twin of mWeb's SUBSCRIBE_MEMBERSHIP_NEWS. The address is stamped from the
 * profile server-side, so this mutation takes no arguments. */
export const MobileSubscribeMembershipNewsDocument = gql(`
  mutation MobileSubscribeMembershipNews {
    subscribeMembershipNews {
      id
      email
    }
  }
`);
