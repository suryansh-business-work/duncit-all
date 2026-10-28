import { gql } from '@apollo/client';
import type { CoinCredit } from '../../../components/detail/CoinCreditSection';

export type PhysicalCardStatus = 'ACTIVE' | 'REDEEMED' | 'VOID' | 'EXPIRED';

export interface PhysicalCardRow {
  id: string;
  card_number: string;
  passcode_last4: string;
  coins: number;
  status: PhysicalCardStatus;
  batch_id: string;
  batch_label: string;
  assigned_user_id: string | null;
  assigned_user_name: string;
  assigned_user_email: string;
  redeemed_by_user_id: string | null;
  redeemer_name: string;
  redeemer_email: string;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
  created_by_name: string;
  voided_at: string | null;
  voided_by_name: string;
  void_reason: string;
}

export interface PhysicalBatchRow {
  id: string;
  label: string;
  coins: number;
  quantity: number;
  total_coins: number;
  assigned: boolean;
  expires_at: string;
  created_at: string;
  created_by_name: string;
  created_by_email: string;
  redeemed_count: number;
  redeemed_coins: number;
  voided_count: number;
}

export interface PhysicalEventRow {
  id: string;
  card_id: string | null;
  card_number: string;
  batch_id: string | null;
  batch_label: string;
  type: string;
  coins: number;
  note: string;
  actor_user_id: string;
  actor_name: string;
  actor_email: string;
  created_at: string;
}

export interface PhysicalMonthBucket {
  month: string;
  generated: number;
  redeemed: number;
}

export interface PhysicalStats {
  generated_count: number;
  generated_coins: number;
  redeemed_count: number;
  redeemed_coins: number;
  outstanding_count: number;
  outstanding_coins: number;
  expired_count: number;
  expired_coins: number;
  voided_count: number;
  voided_coins: number;
  mapped_count: number;
  batch_count: number;
  monthly: PhysicalMonthBucket[];
}

export interface PhysicalCardDetail {
  card: PhysicalCardRow;
  batch: PhysicalBatchRow | null;
  events: PhysicalEventRow[];
  coin_credit: CoinCredit | null;
}

export interface PhysicalPasscodeRow {
  card_number: string;
  passcode: string;
  coins: number;
  status: PhysicalCardStatus;
  assigned_user_name: string;
  assigned_user_email: string;
  expires_at: string;
}

const CARD_FIELDS = gql`
  fragment LoyaltyPhysicalCardFields on PhysicalGiftCardAdminCard {
    id
    card_number
    passcode_last4
    coins
    status
    batch_id
    batch_label
    assigned_user_id
    assigned_user_name
    assigned_user_email
    redeemed_by_user_id
    redeemer_name
    redeemer_email
    redeemed_at
    expires_at
    created_at
    created_by_name
    voided_at
    voided_by_name
    void_reason
  }
`;

const BATCH_FIELDS = gql`
  fragment LoyaltyPhysicalBatchFields on PhysicalGiftCardBatch {
    id
    label
    coins
    quantity
    total_coins
    assigned
    expires_at
    created_at
    created_by_name
    created_by_email
    redeemed_count
    redeemed_coins
    voided_count
  }
`;

const EVENT_FIELDS = gql`
  fragment LoyaltyPhysicalEventFields on PhysicalGiftCardEvent {
    id
    card_id
    card_number
    batch_id
    batch_label
    type
    coins
    note
    actor_user_id
    actor_name
    actor_email
    created_at
  }
`;

export const PHYSICAL_STATS = gql`
  query LoyaltyPhysicalGiftCardStats($months: Int) {
    physicalGiftCardAdminStats(months: $months) {
      generated_count
      generated_coins
      redeemed_count
      redeemed_coins
      outstanding_count
      outstanding_coins
      expired_count
      expired_coins
      voided_count
      voided_coins
      mapped_count
      batch_count
      monthly {
        month
        generated
        redeemed
      }
    }
  }
`;

export const PHYSICAL_CARDS_TABLE = gql`
  query LoyaltyPhysicalGiftCardsTable($query: TableQueryInput, $batch_id: ID) {
    physicalGiftCardsTable(query: $query, batch_id: $batch_id) {
      rows {
        ...LoyaltyPhysicalCardFields
      }
      total
      page
      page_size
    }
  }
  ${CARD_FIELDS}
`;

export const PHYSICAL_BATCHES_TABLE = gql`
  query LoyaltyPhysicalGiftCardBatchesTable($query: TableQueryInput) {
    physicalGiftCardBatchesTable(query: $query) {
      rows {
        ...LoyaltyPhysicalBatchFields
      }
      total
      page
      page_size
    }
  }
  ${BATCH_FIELDS}
`;

export const PHYSICAL_BATCH = gql`
  query LoyaltyPhysicalGiftCardBatch($id: ID!) {
    physicalGiftCardBatch(id: $id) {
      ...LoyaltyPhysicalBatchFields
    }
  }
  ${BATCH_FIELDS}
`;

export const PHYSICAL_EVENTS_TABLE = gql`
  query LoyaltyPhysicalGiftCardEventsTable($query: TableQueryInput) {
    physicalGiftCardEventsTable(query: $query) {
      rows {
        ...LoyaltyPhysicalEventFields
      }
      total
      page
      page_size
    }
  }
  ${EVENT_FIELDS}
`;

export const PHYSICAL_CARD_DETAIL = gql`
  query LoyaltyPhysicalGiftCardDetail($id: ID!) {
    physicalGiftCardAdminDetail(id: $id) {
      card {
        ...LoyaltyPhysicalCardFields
      }
      batch {
        ...LoyaltyPhysicalBatchFields
      }
      events {
        ...LoyaltyPhysicalEventFields
      }
      coin_credit {
        id
        user_id
        amount
        balance_after
        reason
        created_at
      }
    }
  }
  ${CARD_FIELDS}
  ${BATCH_FIELDS}
  ${EVENT_FIELDS}
`;

export const PHYSICAL_CARD_PASSCODE = gql`
  query LoyaltyPhysicalGiftCardPasscode($id: ID!) {
    physicalGiftCardPasscode(id: $id)
  }
`;

export const PHYSICAL_BATCH_PASSCODES = gql`
  query LoyaltyPhysicalGiftCardBatchPasscodes($batch_id: ID!) {
    physicalGiftCardBatchPasscodes(batch_id: $batch_id) {
      card_number
      passcode
      coins
      status
      assigned_user_name
      assigned_user_email
      expires_at
    }
  }
`;

export const GENERATE_PHYSICAL_CARDS = gql`
  mutation LoyaltyGeneratePhysicalGiftCards($input: GeneratePhysicalGiftCardsInput!) {
    generatePhysicalGiftCards(input: $input) {
      ...LoyaltyPhysicalBatchFields
    }
  }
  ${BATCH_FIELDS}
`;

export const VOID_PHYSICAL_CARD = gql`
  mutation LoyaltyVoidPhysicalGiftCard($id: ID!, $reason: String!) {
    voidPhysicalGiftCard(id: $id, reason: $reason) {
      ...LoyaltyPhysicalCardFields
    }
  }
  ${CARD_FIELDS}
`;

/** The limits a new batch is checked against, read from the server. */
export interface PhysicalPolicy {
  max_coins_per_card: number;
  max_cards_per_batch: number;
  validity_months: number;
}

export const PHYSICAL_POLICY = gql`
  query LoyaltyPhysicalGiftCardPolicy {
    physicalGiftCardPolicy {
      max_coins_per_card
      max_cards_per_batch
      validity_months
    }
  }
`;
