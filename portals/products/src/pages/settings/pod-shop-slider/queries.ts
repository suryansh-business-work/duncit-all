import { gql } from '@apollo/client';

/** The global Pod Shop slider media (image/video), read from the shared Branding
 * singleton the buyer apps also consume. */
const SLIDER_FIELDS = `
  url
  type
  order
  heading
  subheading
  cta_label
  cta_url
`;

export const POD_SHOP_SLIDER = gql`
  query PodShopSliderAdmin {
    branding {
      pod_shop_slider {
        ${SLIDER_FIELDS}
      }
    }
  }
`;

/** Replace the whole slider media list (order comes from array position). */
export const UPDATE_POD_SHOP_SLIDER = gql`
  mutation UpdatePodShopSlider($input: [PodShopSliderMediaInput!]!) {
    updatePodShopSlider(input: $input) {
      ${SLIDER_FIELDS}
    }
  }
`;

export interface SliderMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  heading?: string;
  subheading?: string;
  cta_label?: string;
  cta_url?: string;
}
