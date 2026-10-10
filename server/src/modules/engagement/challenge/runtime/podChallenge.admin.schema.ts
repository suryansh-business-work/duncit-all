import gql from 'graphql-tag';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { CHALLENGE_STAFF } from './podChallenge.access';
import { podChallengeAdmin } from './podChallenge.admin';

/** Challenge Portal's staff views. Staff only — hosts see their own pod's challenges in Host Studio. */
export const podChallengeAdminTypeDefs = gql`
  "One pod challenge as the Challenge Portal lists it."
  type PodChallengeRow {
    id: ID!
    pod_id: ID!
    pod_title: String!
    name: String!
    "The public arena link for this challenge."
    live_url: String!
    status: String!
    enabled: Boolean!
    show_on_pod_details: Boolean!
    participant_mode: String!
    tool_count: Int!
    competitor_count: Int!
    "0 until a result is published."
    result_version: Int!
    "Winner name(s) of the current published result."
    winners: String!
    published_at: String
    started_at: String
    completed_at: String
    updated_at: String!
    created_at: String!
  }

  type PodChallengeTablePage {
    rows: [PodChallengeRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ChallengeAuditRow {
    id: ID!
    challenge_id: ID!
    challenge_name: String!
    action: String!
    actor_name: String!
    reason: String!
    old_value_json: String!
    new_value_json: String!
    created_at: String!
  }

  type ChallengeAuditTablePage {
    rows: [ChallengeAuditRow!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type ChallengeNotificationRow {
    id: ID!
    challenge_id: ID!
    challenge_name: String!
    pod_title: String!
    kind: String!
    version: Int!
    recipients: Int!
    whatsapp: Int!
    email: Int!
    last_sent_at: String!
  }

  type PodChallengeStats {
    total: Int!
    live: Int!
    completed: Int!
    published: Int!
  }

  extend type Query {
    "Every pod challenge; statuses narrows it (Live Monitor, Results)."
    podChallengesTable(query: TableQueryInput, statuses: [String!]): PodChallengeTablePage!
    challengeAuditTable(query: TableQueryInput, challenge_id: ID): ChallengeAuditTablePage!
    challengeNotifications(limit: Int): [ChallengeNotificationRow!]!
    podChallengeStats: PodChallengeStats!
  }
`;

export const podChallengeAdminResolvers = {
  Query: {
    podChallengesTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null; statuses?: string[] | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CHALLENGE_STAFF);
      return podChallengeAdmin.table(args.query, args.statuses);
    },
    challengeAuditTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null; challenge_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, CHALLENGE_STAFF);
      return podChallengeAdmin.auditTable(args.query, args.challenge_id);
    },
    challengeNotifications: (_p: unknown, args: { limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, CHALLENGE_STAFF);
      return podChallengeAdmin.notifications(args.limit ?? 200);
    },
    podChallengeStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, CHALLENGE_STAFF);
      return podChallengeAdmin.stats();
    },
  },
};
