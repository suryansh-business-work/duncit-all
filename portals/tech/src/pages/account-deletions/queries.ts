import { gql } from '@apollo/client';

export interface AccountDeletionRow {
  id: string;
  request_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  surface: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  note: string;
}

export interface TraceGroup {
  model_name: string;
  collection_name: string;
  field_path: string;
  id_kind: string;
  count: number;
  /** DELETE_DOCUMENTS | REMOVE_FROM_DOCUMENTS — see the server schema. */
  purge_kind: string;
}

export interface PurgeLogEntry {
  model_name: string;
  collection_name: string;
  field_path: string;
  removed: number;
  purged_at: string;
}

export interface DeletionDetail {
  request: AccountDeletionRow & { purge_log: PurgeLogEntry[] };
  account_exists: boolean;
  trace: TraceGroup[];
}

const REQUEST_FIELDS = `
  id
  request_id
  user_id
  name
  email
  phone
  reason
  surface
  status
  requested_at
  reviewed_at
  note
`;

const DETAIL_FIELDS = `
  request {
    ${REQUEST_FIELDS}
    purge_log {
      model_name
      collection_name
      field_path
      removed
      purged_at
    }
  }
  account_exists
  trace {
    model_name
    collection_name
    field_path
    id_kind
    count
    purge_kind
  }
`;

export const ACCOUNT_DELETIONS_TABLE = gql`
  query AccountDeletionRequestsTable($query: TableQueryInput) {
    accountDeletionRequestsTable(query: $query) {
      rows {
        ${REQUEST_FIELDS}
      }
      total
      page
      page_size
    }
  }
`;

export const ACCOUNT_DELETION_DETAIL = gql`
  query AccountDeletionRequest($request_doc_id: ID!) {
    accountDeletionRequest(request_doc_id: $request_doc_id) {
      ${DETAIL_FIELDS}
    }
  }
`;

export const PURGE_ACCOUNT_TRACE = gql`
  mutation PurgeAccountTrace($input: PurgeAccountTraceInput!) {
    purgeAccountTrace(input: $input) {
      ${DETAIL_FIELDS}
    }
  }
`;

export const PURGE_ACCOUNT_COMPLETELY = gql`
  mutation PurgeAccountCompletely($request_doc_id: ID!) {
    purgeAccountCompletely(request_doc_id: $request_doc_id) {
      ${DETAIL_FIELDS}
    }
  }
`;

export const REJECT_ACCOUNT_DELETION = gql`
  mutation RejectAccountDeletionRequest($request_doc_id: ID!, $note: String!) {
    rejectAccountDeletionRequest(request_doc_id: $request_doc_id, note: $note) {
      ${DETAIL_FIELDS}
    }
  }
`;
