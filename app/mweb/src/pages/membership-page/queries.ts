import { gql } from '@apollo/client';
import type { MembershipBenefitRow } from '@duncit/utils';

export interface MembershipPlanData {
  id: string;
  key: string;
  name: string;
  tagline: string;
  price_label: string;
  price_note: string;
  badge_label: string;
  accent_color: string;
  cta_label: string;
}

export interface MembershipPricingData {
  plans: MembershipPlanData[];
  benefits: MembershipBenefitRow[];
  is_subscribed: boolean;
}

export const MEMBERSHIP_PRICING = gql`
  query MembershipPricing {
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
`;

export const SUBSCRIBE_MEMBERSHIP_NEWS = gql`
  mutation SubscribeMembershipNews {
    subscribeMembershipNews {
      id
      email
    }
  }
`;
