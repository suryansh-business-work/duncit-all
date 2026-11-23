import { gql } from '@apollo/client';

/** The delivery side of the gift card policy, as the form reads and writes it. */
export interface GiftCardDeliverySettings {
  max_quantity: number;
  physical_enabled: boolean;
  shipping_fee: number;
  pickup_location: string;
  parcel_weight_kg: number;
  parcel_length_cm: number;
  parcel_breadth_cm: number;
  parcel_height_cm: number;
}

interface DeliveryData {
  publicGiftCardSettings: Pick<GiftCardDeliverySettings, 'max_quantity' | 'physical_enabled' | 'shipping_fee'>;
  giftCardShippingSettings: Omit<GiftCardDeliverySettings, 'max_quantity' | 'physical_enabled' | 'shipping_fee'>;
}

export const GIFT_CARD_DELIVERY_SETTINGS = gql`
  query LoyaltyGiftCardDeliverySettings {
    publicGiftCardSettings {
      max_quantity
      physical_enabled
      shipping_fee
    }
    giftCardShippingSettings {
      pickup_location
      parcel_weight_kg
      parcel_length_cm
      parcel_breadth_cm
      parcel_height_cm
    }
  }
`;

export const UPDATE_GIFT_CARD_DELIVERY_SETTINGS = gql`
  mutation LoyaltyUpdateGiftCardDeliverySettings($input: GiftCardSettingsInput!) {
    updateGiftCardSettings(input: $input) {
      max_quantity
      physical_enabled
      shipping_fee
    }
  }
`;

/** Both halves of the query, as one settings object. */
export const toDeliverySettings = (data: DeliveryData | undefined): GiftCardDeliverySettings | null =>
  data ? { ...data.publicGiftCardSettings, ...data.giftCardShippingSettings } : null;

export type { DeliveryData };
