import { gql } from '@apollo/client';

/** The global Pod Shop slider media (image/video), read from the shared Branding
 * singleton the buyer apps also consume. */
export const POD_SHOP_SLIDER = gql`
  query PodShopSliderAdmin {
    branding {
      pod_shop_slider {
        url
        type
        order
      }
    }
  }
`;

/** Replace the whole slider media list (order comes from array position). */
export const UPDATE_POD_SHOP_SLIDER = gql`
  mutation UpdatePodShopSlider($input: [PodShopSliderMediaInput!]!) {
    updatePodShopSlider(input: $input) {
      url
      type
      order
    }
  }
`;

export interface SliderMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}
