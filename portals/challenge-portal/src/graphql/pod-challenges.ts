import { gql, type TypedDocumentNode } from '@apollo/client';
import type { ChallengeAuditRow, ChallengeNotificationRow, PodChallengeRow, PodChallengeStats } from '@duncit/gql-types';

export type PodChallengeListRow = PodChallengeRow;
export type AuditRow = ChallengeAuditRow;
export type NotificationRow = ChallengeNotificationRow;

/** Server-side table page for the Pod Challenges list and its Live / Results filters. */
export const POD_CHALLENGES_TABLE = gql`
  query PodChallengesTable($query: TableQueryInput, $statuses: [String!]) {
    podChallengesTable(query: $query, statuses: $statuses) {
      total
      rows {
        id
        pod_id
        pod_title
        name
        live_url
        status
        enabled
        show_on_pod_details
        participant_mode
        tool_count
        competitor_count
        result_version
        winners
        published_at
        started_at
        completed_at
        updated_at
        created_at
      }
    }
  }
`;

export const CHALLENGE_AUDIT_TABLE = gql`
  query ChallengeAuditTable($query: TableQueryInput) {
    challengeAuditTable(query: $query) {
      total
      rows {
        id
        challenge_id
        challenge_name
        action
        actor_name
        reason
        old_value_json
        new_value_json
        created_at
      }
    }
  }
`;

export const CHALLENGE_NOTIFICATIONS: TypedDocumentNode<{ challengeNotifications: NotificationRow[] }> = gql`
  query ChallengeNotifications {
    challengeNotifications {
      id
      challenge_id
      challenge_name
      pod_title
      kind
      version
      recipients
      whatsapp
      email
      last_sent_at
    }
  }
`;

export const POD_CHALLENGE_STATS: TypedDocumentNode<{ podChallengeStats: PodChallengeStats }> = gql`
  query PodChallengeStats {
    podChallengeStats {
      total
      live
      completed
      published
    }
  }
`;
