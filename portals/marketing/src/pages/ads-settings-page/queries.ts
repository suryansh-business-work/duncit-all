import { gql } from '@apollo/client';

const AD_PRICING_FIELDS = gql`
  fragment AdPricingFields on AdPricing {
    auto_per_day
    home_bottom_per_day
    sidebar_per_day
    explore_scroll_per_day
    status_per_day
    venue_list_per_day
    club_list_per_day
    pod_list_per_day
    pod_details_per_day
    currency_symbol
  }
`;

export const AD_PRICING = gql`
  query AdPricing {
    adPricing {
      ...AdPricingFields
    }
  }
  ${AD_PRICING_FIELDS}
`;

export const UPDATE_AD_PRICING = gql`
  mutation UpdateAdPricing($input: UpdateAdPricingInput!) {
    updateAdPricing(input: $input) {
      ...AdPricingFields
    }
  }
  ${AD_PRICING_FIELDS}
`;
