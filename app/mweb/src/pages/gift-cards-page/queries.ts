import { gql } from '@apollo/client';

/** The card's theme — SHOP is the global Pod Shop; the other three name one
 * category of that level. Decides the design, never where value is spent. */
export type GiftCardScopeType = 'SHOP' | 'SUPER' | 'CATEGORY' | 'SUB';

export type GiftCardStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';

export interface GiftCardSettings {
  denominations: number[];
  min_amount: number;
  max_amount: number;
  validity_months: number;
  updated_at: string;
}

export interface GiftCard {
  id: string;
  code: string;
  scope_type: GiftCardScopeType;
  scope_category_id: string | null;
  /** Snapshot of the category name — empty for SHOP cards (clients localize it). */
  scope_name: string;
  scope_image_url: string;
  /** The category's uploaded card artwork, frozen at purchase. Empty means the
   * category shipped none, and the gradient card renders instead. */
  scope_image_front_url: string;
  scope_image_back_url: string;
  initial_amount: number;
  balance: number;
  status: GiftCardStatus;
  recipient_email: string;
  recipient_name: string;
  message: string;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
  /** Filled on the code-lookup view so the claim page can say who sent it. */
  sender_name: string | null;
}

export interface MyGiftCards {
  owned: GiftCard[];
  gifted: GiftCard[];
}

export interface GiftCardRedeemResult {
  /** Coins credited by THIS call — 0 when the card had already paid out. */
  coins_added: number;
  coin_balance: number;
  card: GiftCard;
}

export interface GiftCardCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  level: 'SUPER' | 'CATEGORY' | 'SUB';
  parent_id: string | null;
  /** Admin-uploaded gift card faces for this category; empty when unset. */
  gift_card_image_front: string;
  gift_card_image_back: string;
}

/** What the buy tab hands the checkout page via router state. */
export interface GiftCardSelection {
  scope_type: GiftCardScopeType;
  scope_category_id: string | null;
  scope_name: string;
  scope_image_url: string;
  scope_image_front_url: string;
  scope_image_back_url: string;
  amount: number;
  gift: boolean;
  recipient_email: string;
  recipient_name: string;
  message: string;
}

export const GIFT_CARD_SETTINGS = gql`
  query PublicGiftCardSettings {
    publicGiftCardSettings {
      denominations
      min_amount
      max_amount
      validity_months
      updated_at
    }
  }
`;

/** The category tree powering the theme picker — filtered by level client-side. */
export const GIFT_CARD_CATEGORIES = gql`
  query GiftCardCategories {
    categories {
      id
      name
      slug
      icon
      level
      parent_id
      gift_card_image_front
      gift_card_image_back
    }
  }
`;

export const MY_GIFT_CARDS = gql`
  query MyGiftCards {
    myGiftCards {
      owned {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        scope_image_front_url
        scope_image_back_url
        initial_amount
        balance
        status
        recipient_email
        recipient_name
        message
        redeemed
        redeemed_at
        expires_at
        created_at
        sender_name
      }
      gifted {
        id
        code
        scope_type
        scope_category_id
        scope_name
        scope_image_url
        scope_image_front_url
        scope_image_back_url
        initial_amount
        balance
        status
        recipient_email
        recipient_name
        message
        redeemed
        redeemed_at
        expires_at
        created_at
        sender_name
      }
    }
  }
`;

export const GIFT_CARD_BY_CODE = gql`
  query GiftCardByCode($code: String!) {
    giftCardByCode(code: $code) {
      id
      code
      scope_type
      scope_category_id
      scope_name
      scope_image_url
      scope_image_front_url
      scope_image_back_url
      initial_amount
      balance
      status
      recipient_email
      recipient_name
      message
      redeemed
      redeemed_at
      expires_at
      created_at
      sender_name
    }
  }
`;

export const REDEEM_GIFT_CARD = gql`
  mutation RedeemGiftCard($code: String!) {
    redeemGiftCard(code: $code) {
      coins_added
      coin_balance
      card {
        id
        code
        status
        balance
        redeemed
        redeemed_at
      }
    }
  }
`;
