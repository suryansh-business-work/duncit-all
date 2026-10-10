import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  CreatePodChallengeInput,
  PodChallengeRosterInput,
  PodChallengeScoreEntry,
  PodChallengeScoreInput,
  PodChallengeSettingsInput,
  PodChallengeSetup,
} from '@duncit/gql-types';
import { POD_CHALLENGE_FIELDS, type PodChallengeView } from '../../components/pod-challenge/queries';

type View<K extends string> = Record<K, PodChallengeView>;
type Setup = Pick<PodChallengeSetup, 'pod_id' | 'enabled' | 'require_challenge' | 'allow_host_customization' | 'default_template_id'> & {
  templates: { id: string; name: string; description?: string | null }[];
};

export const POD_CHALLENGE_SETUP: TypedDocumentNode<{ podChallengeSetup: Setup }, { podId: string }> = gql`
  query PodChallengeSetup($podId: ID!) {
    podChallengeSetup(pod_id: $podId) {
      pod_id
      enabled
      require_challenge
      allow_host_customization
      default_template_id
      templates {
        id
        name
        description
      }
    }
  }
`;

export const CREATE_POD_CHALLENGE: TypedDocumentNode<View<'createPodChallenge'>, { input: CreatePodChallengeInput }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation CreatePodChallenge($input: CreatePodChallengeInput!) {
    createPodChallenge(input: $input) {
      ...PodChallengeFields
    }
  }
`;

export const UPDATE_POD_CHALLENGE_SETTINGS: TypedDocumentNode<
  View<'updatePodChallengeSettings'>,
  { id: string; input: PodChallengeSettingsInput }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation UpdatePodChallengeSettings($id: ID!, $input: PodChallengeSettingsInput!) {
    updatePodChallengeSettings(id: $id, input: $input) {
      ...PodChallengeFields
    }
  }
`;

export const SET_POD_CHALLENGE_ROSTER: TypedDocumentNode<View<'setPodChallengeRoster'>, { id: string; input: PodChallengeRosterInput }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation SetPodChallengeRoster($id: ID!, $input: PodChallengeRosterInput!) {
    setPodChallengeRoster(id: $id, input: $input) {
      ...PodChallengeFields
    }
  }
`;

export const TRANSITION_POD_CHALLENGE: TypedDocumentNode<View<'transitionPodChallenge'>, { id: string; action: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation TransitionPodChallenge($id: ID!, $action: String!) {
    transitionPodChallenge(id: $id, action: $action) {
      ...PodChallengeFields
    }
  }
`;

export const RECORD_POD_CHALLENGE_SCORE: TypedDocumentNode<View<'recordPodChallengeScore'>, { input: PodChallengeScoreInput }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation RecordPodChallengeScore($input: PodChallengeScoreInput!) {
    recordPodChallengeScore(input: $input) {
      ...PodChallengeFields
    }
  }
`;

export const VOID_POD_CHALLENGE_SCORE: TypedDocumentNode<View<'voidPodChallengeScore'>, { eventId: string; reason?: string | null }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation VoidPodChallengeScore($eventId: ID!, $reason: String) {
    voidPodChallengeScore(event_id: $eventId, reason: $reason) {
      ...PodChallengeFields
    }
  }
`;

export const CONTROL_POD_CHALLENGE_CLOCK: TypedDocumentNode<
  View<'controlPodChallengeClock'>,
  { id: string; toolInstanceId: string; action: string }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation ControlPodChallengeClock($id: ID!, $toolInstanceId: String!, $action: String!) {
    controlPodChallengeClock(id: $id, tool_instance_id: $toolInstanceId, action: $action) {
      ...PodChallengeFields
    }
  }
`;

export const SET_POD_CHALLENGE_VOTING: TypedDocumentNode<
  View<'setPodChallengeVoting'>,
  { id: string; toolInstanceId: string; open: boolean }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation SetPodChallengeVoting($id: ID!, $toolInstanceId: String!, $open: Boolean!) {
    setPodChallengeVoting(id: $id, tool_instance_id: $toolInstanceId, open: $open) {
      ...PodChallengeFields
    }
  }
`;

export const SET_POD_CHALLENGE_ROUND: TypedDocumentNode<View<'setPodChallengeRound'>, { id: string; round: number }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation SetPodChallengeRound($id: ID!, $round: Int!) {
    setPodChallengeRound(id: $id, round: $round) {
      ...PodChallengeFields
    }
  }
`;

export const PUBLISH_POD_CHALLENGE_RESULT: TypedDocumentNode<View<'publishPodChallengeResult'>, { id: string; reason?: string | null }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation PublishPodChallengeResult($id: ID!, $reason: String) {
    publishPodChallengeResult(id: $id, reason: $reason) {
      ...PodChallengeFields
    }
  }
`;

export type ScoreEntry = Pick<
  PodChallengeScoreEntry,
  'id' | 'tool_instance_id' | 'competitor_id' | 'event_type' | 'value' | 'round' | 'voided' | 'void_reason' | 'created_at'
>;

export const POD_CHALLENGE_SCORE_LOG: TypedDocumentNode<{ podChallengeScoreLog: ScoreEntry[] }, { id: string }> = gql`
  query PodChallengeScoreLog($id: ID!) {
    podChallengeScoreLog(challenge_id: $id, limit: 30) {
      id
      tool_instance_id
      competitor_id
      event_type
      value
      round
      voided
      void_reason
      created_at
    }
  }
`;
