import gql from 'graphql-tag';

export const waLeadsTypeDefs = gql`
  enum WaStatus {
    DISCONNECTED
    CONNECTING
    CONNECTED
    ERROR
  }

  "Gateway connection config + live session status (the API key is never returned)."
  type WaConnection {
    base_url: String!
    session_id: String!
    has_api_key: Boolean!
    status: WaStatus!
    phone: String
    last_error: String
    connected_at: String
  }

  type WaQr {
    qr_code: String
    status: WaStatus!
  }

  input WaConfigInput {
    base_url: String
    api_key: String
    session_id: String
  }

  extend type Query {
    "Stored gateway config + last-known status (no network call)."
    waConnection: WaConnection!
    "Refreshes the session status from the gateway, then returns it."
    waStatus: WaConnection!
    "Current QR data URL to scan + session status."
    waQr: WaQr!
  }

  extend type Mutation {
    waSaveConfig(input: WaConfigInput!): WaConnection!
    "Create/start the session so a QR can be scanned."
    waConnect: WaConnection!
    waDisconnect: WaConnection!
  }
`;
