import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationDecidePortalSecurityExceptionArgs,
  PortalSecurityException,
  QueryPortalSecurityExceptionsTableArgs,
} from '@duncit/gql-types';

/** One request from somebody who could not, or would not, share a location. */
export type RequestRow = Pick<
  PortalSecurityException,
  | 'id'
  | 'user_name'
  | 'portal_key'
  | 'reason'
  | 'location_error'
  | 'status'
  | 'decided_by_name'
  | 'decided_at'
  | 'decision_note'
  | 'created_at'
>;

export const PORTAL_SECURITY_EXCEPTIONS_TABLE: TypedDocumentNode<
  { portalSecurityExceptionsTable: { rows: RequestRow[]; total: number } },
  QueryPortalSecurityExceptionsTableArgs
> = gql`
  query PortalSecurityExceptionsTable($query: TableQueryInput) {
    portalSecurityExceptionsTable(query: $query) {
      rows {
        id
        user_name
        portal_key
        reason
        location_error
        status
        decided_by_name
        decided_at
        decision_note
        created_at
      }
      total
    }
  }
`;

/**
 * Approve or reject one request. The server decides a request once: a second
 * decision, or a second reviewer racing the first, is refused with CONFLICT,
 * and nobody can decide their own (FORBIDDEN).
 */
export const DECIDE_PORTAL_SECURITY_EXCEPTION: TypedDocumentNode<
  { decidePortalSecurityException: Pick<PortalSecurityException, 'id' | 'status'> },
  MutationDecidePortalSecurityExceptionArgs
> = gql`
  mutation DecidePortalSecurityException($input: PortalSecurityExceptionDecisionInput!) {
    decidePortalSecurityException(input: $input) {
      id
      status
    }
  }
`;
