import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PodChallenge, PodChallengeCriterionInput } from '@duncit/gql-types';

/** One challenge as every mWeb surface renders it (live card, arena, Host Studio). */
export type PodChallengeView = Pick<
  PodChallenge,
  | 'id'
  | 'pod_id'
  | 'pod_title'
  | 'name'
  | 'participant_mode'
  | 'status'
  | 'enabled'
  | 'show_on_pod_details'
  | 'audience_interaction_enabled'
  | 'auto_whatsapp'
  | 'auto_email'
  | 'scheduled_for'
  | 'started_at'
  | 'completed_at'
  | 'updated_at'
  | 'server_now'
  | 'revision'
  | 'current_round'
  | 'tools'
  | 'competitors'
  | 'players'
  | 'judge_user_ids'
  | 'standings'
  | 'live_winner_ids'
  | 'result'
  | 'eligibility_warning'
  | 'viewer'
>;

export const POD_CHALLENGE_FIELDS = gql`
  fragment PodChallengeFields on PodChallenge {
    id
    pod_id
    pod_title
    name
    participant_mode
    status
    enabled
    show_on_pod_details
    audience_interaction_enabled
    auto_whatsapp
    auto_email
    scheduled_for
    started_at
    completed_at
    updated_at
    server_now
    revision
    current_round
    tools {
      instance_id
      tool_type
      input_kind
      label
      config_json
      state_json
      clock_running
      clock_elapsed_ms
      voting_open
    }
    competitors {
      competitor_id
      name
      user_id
    }
    players {
      player_id
      name
      team_id
      user_id
    }
    judge_user_ids
    standings {
      competitor_id
      name
      rank
      total
      metrics_json
    }
    live_winner_ids
    result {
      version
      published_at
      reason
      winner_ids
      standings {
        competitor_id
        name
        rank
        total
        metrics_json
      }
    }
    eligibility_warning
    viewer {
      can_manage
      is_staff
      is_attendee
      is_judge
      my_competitor_id
      can_interact
      can_judge
      allowed_actions
      my_votes {
        tool_instance_id
        kind
        candidate_id
        value
        scope_key
      }
    }
  }
`;

export const POD_CHALLENGES: TypedDocumentNode<{ podChallenges: PodChallengeView[] }, { podId: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  query PodChallenges($podId: ID!) {
    podChallenges(pod_id: $podId) {
      ...PodChallengeFields
    }
  }
`;

export const POD_CHALLENGE: TypedDocumentNode<{ podChallenge: PodChallengeView | null }, { id: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  query PodChallenge($id: ID!) {
    podChallenge(id: $id) {
      ...PodChallengeFields
    }
  }
`;

type ViewResult<K extends string> = Record<K, PodChallengeView>;

export const CAST_POD_CHALLENGE_VOTE: TypedDocumentNode<
  ViewResult<'castPodChallengeVote'>,
  { id: string; toolInstanceId: string; candidateId: string }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation CastPodChallengeVote($id: ID!, $toolInstanceId: String!, $candidateId: String!) {
    castPodChallengeVote(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId) {
      ...PodChallengeFields
    }
  }
`;

export const RATE_POD_CHALLENGE_COMPETITOR: TypedDocumentNode<
  ViewResult<'ratePodChallengeCompetitor'>,
  { id: string; toolInstanceId: string; candidateId: string; value: number }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation RatePodChallengeCompetitor($id: ID!, $toolInstanceId: String!, $candidateId: String!, $value: Int!) {
    ratePodChallengeCompetitor(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId, value: $value) {
      ...PodChallengeFields
    }
  }
`;

export const JUDGE_POD_CHALLENGE_COMPETITOR: TypedDocumentNode<
  ViewResult<'judgePodChallengeCompetitor'>,
  { id: string; toolInstanceId: string; candidateId: string; scores: PodChallengeCriterionInput[] }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation JudgePodChallengeCompetitor(
    $id: ID!
    $toolInstanceId: String!
    $candidateId: String!
    $scores: [PodChallengeCriterionInput!]!
  ) {
    judgePodChallengeCompetitor(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId, scores: $scores) {
      ...PodChallengeFields
    }
  }
`;
