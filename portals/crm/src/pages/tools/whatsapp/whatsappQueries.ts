import { gql } from '@apollo/client';

const CONNECTION_FIELDS = gql`
  fragment WaConnectionFields on WaConnection {
    base_url
    session_id
    has_api_key
    status
    phone
    last_error
    connected_at
  }
`;

export const WA_CONNECTION = gql`
  ${CONNECTION_FIELDS}
  query WaConnection {
    waConnection {
      ...WaConnectionFields
    }
  }
`;

export const WA_STATUS = gql`
  ${CONNECTION_FIELDS}
  query WaStatus {
    waStatus {
      ...WaConnectionFields
    }
  }
`;

export const WA_QR = gql`
  query WaQr {
    waQr {
      qr_code
      status
    }
  }
`;

export const WA_SAVE_CONFIG = gql`
  ${CONNECTION_FIELDS}
  mutation WaSaveConfig($input: WaConfigInput!) {
    waSaveConfig(input: $input) {
      ...WaConnectionFields
    }
  }
`;

export const WA_CONNECT = gql`
  ${CONNECTION_FIELDS}
  mutation WaConnect {
    waConnect {
      ...WaConnectionFields
    }
  }
`;

export const WA_DISCONNECT = gql`
  ${CONNECTION_FIELDS}
  mutation WaDisconnect {
    waDisconnect {
      ...WaConnectionFields
    }
  }
`;

export interface WaConnection {
  base_url: string;
  session_id: string;
  has_api_key: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  phone?: string | null;
  last_error?: string | null;
  connected_at?: string | null;
}
