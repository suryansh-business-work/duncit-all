import { gql, type TypedDocumentNode } from '@apollo/client';

export interface ShiprocketStatus {
  configured: boolean;
  account_email: string;
  login_refused: boolean;
  login_message: string;
  wallet_balance: number | null;
  wallet_error: string;
  webhook_key_set: boolean;
  default_pickup: string;
  webhook_path: string;
}

const STATUS_FIELDS = `
  configured
  account_email
  login_refused
  login_message
  wallet_balance
  wallet_error
  webhook_key_set
  default_pickup
  webhook_path
`;

export const STORE_SHIPROCKET_STATUS: TypedDocumentNode<{ storeShiprocketStatus: ShiprocketStatus }> = gql`
  query StoreShiprocketStatus {
    storeShiprocketStatus {
      ${STATUS_FIELDS}
    }
  }
`;

export const SHIPROCKET_RECONNECT: TypedDocumentNode<{ storeShiprocketReconnect: ShiprocketStatus }> = gql`
  mutation StoreShiprocketReconnect {
    storeShiprocketReconnect {
      ${STATUS_FIELDS}
    }
  }
`;

/** UNKNOWN: ShipRocket could not be read, so nothing is said about it. */
export type PickupState = 'READY' | 'AWAITING_VERIFICATION' | 'NOT_IN_SHIPROCKET' | 'UNKNOWN';

export interface Warehouse {
  id: string;
  owner_kind: 'DUNCIT' | 'BRAND';
  review_status: string;
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  shiprocket_registered: boolean;
  shiprocket_error: string;
}

export interface PickupRow {
  warehouse: Warehouse;
  shiprocket_state: PickupState;
  product_count: number;
}

export interface ShiprocketOnlyPickup {
  nickname: string;
  city: string;
  pincode: string;
  verified: boolean;
}

export interface PickupLocations {
  warehouses: PickupRow[];
  shiprocket_only: ShiprocketOnlyPickup[];
  shiprocket_error: string;
  synced_at: string;
}

const WAREHOUSE_FIELDS = `
  id
  owner_kind
  review_status
  nickname
  contact_name
  phone
  email
  address_line1
  address_line2
  city
  state
  pincode
  is_default
  shiprocket_registered
  shiprocket_error
`;

export const STORE_PICKUP_LOCATIONS: TypedDocumentNode<{ storePickupLocations: PickupLocations }> = gql`
  query StorePickupLocations {
    storePickupLocations {
      synced_at
      shiprocket_error
      warehouses {
        shiprocket_state
        product_count
        warehouse {
          ${WAREHOUSE_FIELDS}
        }
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

export interface WarehouseInput {
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export const SAVE_WAREHOUSE: TypedDocumentNode<
  { storeSaveWarehouse: Warehouse },
  { id: string | null; input: WarehouseInput }
> = gql`
  mutation StoreSaveWarehouse($id: ID, $input: StoreWarehouseInput!) {
    storeSaveWarehouse(id: $id, input: $input) {
      ${WAREHOUSE_FIELDS}
    }
  }
`;

export const DELETE_WAREHOUSE: TypedDocumentNode<{ storeDeleteWarehouse: boolean }, { id: string }> = gql`
  mutation StoreDeleteWarehouse($id: ID!) {
    storeDeleteWarehouse(id: $id)
  }
`;

export const REGISTER_WAREHOUSE: TypedDocumentNode<{ storeRegisterWarehouse: Warehouse }, { id: string }> = gql`
  mutation StoreRegisterWarehouse($id: ID!) {
    storeRegisterWarehouse(id: $id) {
      ${WAREHOUSE_FIELDS}
    }
  }
`;

export const IMPORT_PICKUP: TypedDocumentNode<{ storeImportPickup: Warehouse }, { nickname: string }> = gql`
  mutation StoreImportPickup($nickname: String!) {
    storeImportPickup(nickname: $nickname) {
      ${WAREHOUSE_FIELDS}
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
