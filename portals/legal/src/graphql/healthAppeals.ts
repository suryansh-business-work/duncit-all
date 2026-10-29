import { gql } from '@apollo/client';
import type { HealthAppealReason, HealthAppealStatus } from '@duncit/utils';

export const HEALTH_APPEAL_FIELDS = gql`
  fragment HealthAppealFields on HealthAppeal {
    id
    appeal_no
    subject_type
    subject_label
    appellant_name
    delta
    remark
    reason
    message
    status
    decision_note
    decided_by_name
    decided_at
    created_at
  }
`;

export const HEALTH_APPEALS_TABLE = gql`
  query HealthAppealsTable($query: TableQueryInput) {
    healthAppealsTable(query: $query) {
      total
      rows {
        ...HealthAppealFields
      }
    }
  }
  ${HEALTH_APPEAL_FIELDS}
`;

export const ACCEPT_HEALTH_APPEAL = gql`
  mutation AcceptHealthAppeal($id: ID!, $note: String) {
    acceptHealthAppeal(id: $id, note: $note) {
      ...HealthAppealFields
    }
  }
  ${HEALTH_APPEAL_FIELDS}
`;

export const DENY_HEALTH_APPEAL = gql`
  mutation DenyHealthAppeal($id: ID!, $note: String) {
    denyHealthAppeal(id: $id, note: $note) {
      ...HealthAppealFields
    }
  }
  ${HEALTH_APPEAL_FIELDS}
`;

export interface HealthAppeal {
  id: string;
  appeal_no: string;
  subject_type: 'USER' | 'VENUE';
  subject_label: string;
  appellant_name: string;
  delta: number;
  remark: string;
  reason: HealthAppealReason;
  message: string;
  status: HealthAppealStatus;
  decision_note: string;
  decided_by_name: string;
  decided_at: string | null;
  created_at: string;
}
