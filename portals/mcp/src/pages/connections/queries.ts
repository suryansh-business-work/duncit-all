import { gql } from '@apollo/client';
import type { McpConnection } from '@duncit/gql-types';

/** Connections: one row per approved AI app (DUNCIT TABLE CONTRACT). */
export const MCP_CONNECTIONS_TABLE = gql`
  query McpConnectionsTable($query: TableQueryInput) {
    mcpConnectionsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        user_email
        client_name
        scopes
        resource
        status
        created_at
        last_used_at
        last_ip
      }
    }
  }
`;

export const REVOKE_MCP_CONNECTION = gql`
  mutation RevokeMcpConnection($id: ID!) {
    revokeMcpConnection(id: $id) {
      id
      status
    }
  }
`;

export type ConnectionRow = Pick<
  McpConnection,
  'id' | 'user_email' | 'client_name' | 'scopes' | 'resource' | 'status' | 'created_at' | 'last_used_at' | 'last_ip'
>;
