import { gql } from '@apollo/client';

/** One design of the gift card catalogue, as the console reads it. */
export interface GiftCardDesignRow {
  id: string;
  name: string;
  category: string;
  front_image_url: string;
  back_image_url: string;
  is_default: boolean;
  is_active: boolean;
  physical_stock: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GiftCardDesignInput {
  name?: string;
  category?: string;
  front_image_url?: string;
  back_image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

const DESIGN_FIELDS = `
  id
  name
  category
  front_image_url
  back_image_url
  is_default
  is_active
  physical_stock
  sort_order
  created_at
  updated_at
`;

export const GIFT_CARD_DESIGNS_TABLE = gql`
  query LoyaltyGiftCardDesignsTable($query: TableQueryInput) {
    giftCardDesignsTable(query: $query) {
      total
      page
      page_size
      rows {
        ${DESIGN_FIELDS}
      }
    }
  }
`;

export const GIFT_CARD_DESIGN = gql`
  query LoyaltyGiftCardDesign($id: ID!) {
    giftCardDesign(id: $id) {
      ${DESIGN_FIELDS}
    }
  }
`;

export const GIFT_CARD_DESIGN_CATEGORIES = gql`
  query LoyaltyGiftCardDesignCategories {
    giftCardDesignCategories
  }
`;

export const CREATE_GIFT_CARD_DESIGN = gql`
  mutation LoyaltyCreateGiftCardDesign($input: GiftCardDesignInput!) {
    createGiftCardDesign(input: $input) {
      ${DESIGN_FIELDS}
    }
  }
`;

export const UPDATE_GIFT_CARD_DESIGN = gql`
  mutation LoyaltyUpdateGiftCardDesign($id: ID!, $input: GiftCardDesignInput!) {
    updateGiftCardDesign(id: $id, input: $input) {
      ${DESIGN_FIELDS}
    }
  }
`;

export const SET_DEFAULT_GIFT_CARD_DESIGN = gql`
  mutation LoyaltySetDefaultGiftCardDesign($id: ID!) {
    setDefaultGiftCardDesign(id: $id) {
      ${DESIGN_FIELDS}
    }
  }
`;

export const ADJUST_GIFT_CARD_DESIGN_STOCK = gql`
  mutation LoyaltyAdjustGiftCardDesignStock($id: ID!, $delta: Int!, $reason: String!) {
    adjustGiftCardDesignStock(id: $id, delta: $delta, reason: $reason) {
      ${DESIGN_FIELDS}
    }
  }
`;
