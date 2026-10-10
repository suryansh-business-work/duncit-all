import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PodChallengeCheckpointLink } from '@duncit/gql-types';
import { POD_CHALLENGE_FIELDS, type PodChallengeView } from '../../components/pod-challenge/queries';

/** Host controls for the tools that are run rather than scored by hand. */

type View<K extends string> = Record<K, PodChallengeView>;
interface ToolVars {
  id: string;
  toolInstanceId: string;
}

export const SET_POD_CHALLENGE_ITEM: TypedDocumentNode<
  View<'setPodChallengeItem'>,
  ToolVars & { competitorId: string; itemKey: string; done: boolean }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation SetPodChallengeItem($id: ID!, $toolInstanceId: String!, $competitorId: String!, $itemKey: String!, $done: Boolean!) {
    setPodChallengeItem(id: $id, tool_instance_id: $toolInstanceId, competitor_id: $competitorId, item_key: $itemKey, done: $done) {
      ...PodChallengeFields
    }
  }
`;

export const CONTROL_POD_CHALLENGE_QUIZ: TypedDocumentNode<View<'controlPodChallengeQuiz'>, ToolVars & { questionKey: string | null }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation ControlPodChallengeQuiz($id: ID!, $toolInstanceId: String!, $questionKey: String) {
    controlPodChallengeQuiz(id: $id, tool_instance_id: $toolInstanceId, question_key: $questionKey) {
      ...PodChallengeFields
    }
  }
`;

export const CONTROL_POD_CHALLENGE_BUZZER: TypedDocumentNode<View<'controlPodChallengeBuzzer'>, ToolVars & { arm: boolean }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation ControlPodChallengeBuzzer($id: ID!, $toolInstanceId: String!, $arm: Boolean!) {
    controlPodChallengeBuzzer(id: $id, tool_instance_id: $toolInstanceId, arm: $arm) {
      ...PodChallengeFields
    }
  }
`;

export const PICK_POD_CHALLENGE_RANDOM: TypedDocumentNode<View<'pickPodChallengeRandom'>, ToolVars & { reset: boolean }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation PickPodChallengeRandom($id: ID!, $toolInstanceId: String!, $reset: Boolean) {
    pickPodChallengeRandom(id: $id, tool_instance_id: $toolInstanceId, reset: $reset) {
      ...PodChallengeFields
    }
  }
`;

export type CheckpointLink = Pick<PodChallengeCheckpointLink, 'item_key' | 'label' | 'url' | 'qr_data_url'>;

export const POD_CHALLENGE_CHECKPOINT_LINKS: TypedDocumentNode<{ podChallengeCheckpointLinks: CheckpointLink[] }, ToolVars> = gql`
  query PodChallengeCheckpointLinks($id: ID!, $toolInstanceId: String!) {
    podChallengeCheckpointLinks(id: $id, tool_instance_id: $toolInstanceId) {
      item_key
      label
      url
      qr_data_url
    }
  }
`;
