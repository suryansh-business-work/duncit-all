import { gql } from '@apollo/client';
import type { McpAuthorizationRequest } from '@duncit/gql-types';
import { firstGraphQLError } from '@duncit/utils';

/** What the consent screen shows before the person answers an AI app. */
export const MCP_AUTHORIZATION_REQUEST = gql`
  query McpAuthorizationRequest($id: ID!) {
    mcpAuthorizationRequest(id: $id) {
      id
      client_name
      client_uri
      redirect_host
      trusted
      requests_write
      endpoint_label
      expires_at
      can_approve
    }
  }
`;

export const APPROVE_MCP_AUTHORIZATION = gql`
  mutation ApproveMcpAuthorization($id: ID!, $allow_write: Boolean!) {
    approveMcpAuthorization(id: $id, allow_write: $allow_write) {
      redirect_url
    }
  }
`;

export const DENY_MCP_AUTHORIZATION = gql`
  mutation DenyMcpAuthorization($id: ID!) {
    denyMcpAuthorization(id: $id) {
      redirect_url
    }
  }
`;

export type AuthorizationRequest = Omit<McpAuthorizationRequest, '__typename' | 'resource'>;

export interface AuthorizationRequestData {
  mcpAuthorizationRequest: AuthorizationRequest;
}

export interface ApproveData {
  approveMcpAuthorization: { redirect_url: string };
}

export interface DenyData {
  denyMcpAuthorization: { redirect_url: string };
}

/**
 * The friendly sentence for the ways a consent request can no longer be
 * answered (consent.service): it ran out (NOT_FOUND), someone already answered
 * it (CONFLICT), or this account may not approve (FORBIDDEN). Anything else is
 * the caller's to word.
 */
export function consentErrorKey(error: unknown): string | null {
  const code = firstGraphQLError(error)?.extensions?.code;
  if (code === 'NOT_FOUND') return 'mcp.consent.expired';
  if (code === 'CONFLICT') return 'mcp.consent.answered';
  if (code === 'FORBIDDEN') return 'mcp.consent.cannotApprove';
  return null;
}
