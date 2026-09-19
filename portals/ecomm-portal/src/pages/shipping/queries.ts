import { gql, type TypedDocumentNode } from '@apollo/client';

export interface ShiprocketStatus {
  configured: boolean;
  login_refused: boolean;
  login_message: string;
  wallet_balance: number | null;
  webhook_key_set: boolean;
  default_pickup: string;
  webhook_path: string;
}

export const STORE_SHIPROCKET_STATUS: TypedDocumentNode<{ storeShiprocketStatus: ShiprocketStatus }> = gql`
  query StoreShiprocketStatus {
    storeShiprocketStatus {
      configured
      login_refused
      login_message
      wallet_balance
      webhook_key_set
      default_pickup
      webhook_path
    }
  }
`;

/** READY, AWAITING_VERIFICATION or NOT_IN_SHIPROCKET. */
export type PickupState = 'READY' | 'AWAITING_VERIFICATION' | 'NOT_IN_SHIPROCKET';

export interface PickupSyncRow {
  warehouse_id: string;
  nickname: string;
  owner_kind: string;
  city: string;
  pincode: string;
  state: PickupState;
  shiprocket_id: string;
}

export interface ShiprocketOnlyPickup {
  nickname: string;
  city: string;
  pincode: string;
  verified: boolean;
}

export interface PickupSync {
  warehouses: PickupSyncRow[];
  shiprocket_only: ShiprocketOnlyPickup[];
  synced_at: string;
}

export const SYNC_PICKUP_LOCATIONS: TypedDocumentNode<{ storeSyncPickupLocations: PickupSync }> = gql`
  mutation StoreSyncPickupLocations {
    storeSyncPickupLocations {
      synced_at
      warehouses {
        warehouse_id
        nickname
        owner_kind
        city
        pincode
        state
        shiprocket_id
      }
      shiprocket_only {
        nickname
        city
        pincode
        verified
      }
    }
  }
`;

export interface CodLedgerRow {
  order_id: string;
  order_no: string;
  buyer_name: string;
  cod_amount: number;
  status: string;
  awb: string;
  delivered_at: string | null;
  collected_at: string | null;
}

export interface CodLedger {
  rows: CodLedgerRow[];
  total_cod: number;
  collected: number;
  outstanding: number;
}

export const STORE_COD_LEDGER: TypedDocumentNode<{ storeCodLedger: CodLedger }, { days: number }> = gql`
  query StoreCodLedger($days: Int) {
    storeCodLedger(days: $days) {
      total_cod
      collected
      outstanding
      rows {
        order_id
        order_no
        buyer_name
        cod_amount
        status
        awb
        delivered_at
        collected_at
      }
    }
  }
`;
