import { gql } from '@apollo/client';
import type { McpToolCall } from '@duncit/gql-types';

/** The Activity table: one row per tool call, newest first (DUNCIT TABLE CONTRACT). */
export const MCP_TOOL_CALLS_TABLE = gql`
  query McpToolCallsTable($query: TableQueryInput) {
    mcpToolCallsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        created_at
        user_email
        client_name
        endpoint
        tool
        category
        risk
        status
        reason
        duration_ms
        input_tokens
        output_tokens
        cost
        currency
      }
    }
  }
`;

/** What the details drawer adds to a row: the arguments, the failure and where the call came from. */
export const MCP_TOOL_CALL = gql`
  query McpToolCall($id: ID!) {
    mcpToolCall(id: $id) {
      id
      kind
      args_preview
      error_code
      error_message
      injection_flags
      guard_mode
      user_agent
      ip
      connection_id
    }
  }
`;

export type ToolCallRow = Pick<
  McpToolCall,
  | 'id'
  | 'created_at'
  | 'user_email'
  | 'client_name'
  | 'endpoint'
  | 'tool'
  | 'category'
  | 'risk'
  | 'status'
  | 'reason'
  | 'duration_ms'
  | 'input_tokens'
  | 'output_tokens'
  | 'cost'
  | 'currency'
>;

export type ToolCallDetail = Pick<
  McpToolCall,
  | 'id'
  | 'kind'
  | 'args_preview'
  | 'error_code'
  | 'error_message'
  | 'injection_flags'
  | 'guard_mode'
  | 'user_agent'
  | 'ip'
  | 'connection_id'
>;

export interface ToolCallData {
  mcpToolCall: ToolCallDetail | null;
}
