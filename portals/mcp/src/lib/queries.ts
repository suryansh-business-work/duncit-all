import { gql } from '@apollo/client';
import type { McpConnector } from '@duncit/gql-types';

/**
 * The connector list — one document for every page that reads it (Connect,
 * Tools' connector filter, Connections' connector names), so they share one
 * cache entry instead of thrashing it with different selections.
 */
export const MCP_CONNECTORS = gql`
  query McpConnectors {
    mcpConnectors {
      key
      label
      url
      accessible
      tool_count
    }
  }
`;

export type McpConnectorRow = Pick<McpConnector, 'key' | 'label' | 'url' | 'accessible' | 'tool_count'>;

export interface McpConnectorsData {
  mcpConnectors: McpConnectorRow[];
}

/** The gateway's key on the server (GATEWAY_ENDPOINT). */
export const GATEWAY_KEY = 'gateway';
