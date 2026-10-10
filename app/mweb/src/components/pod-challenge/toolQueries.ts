import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PodChallengeEntryInput } from '@duncit/gql-types';
import { POD_CHALLENGE_FIELDS, type PodChallengeView } from './queries';

/**
 * What attendees and competitors do themselves in the tools a challenge runs:
 * check in at a checkpoint, vote in a poll, answer the open quiz question,
 * buzz and submit their piece. Every one returns the challenge, so the Apollo
 * cache — and with it every panel — updates from the server's own answer.
 */

type View<K extends string> = Record<K, PodChallengeView>;
interface ToolVars {
  id: string;
  toolInstanceId: string;
}

export const REACH_POD_CHALLENGE_CHECKPOINT: TypedDocumentNode<View<'reachPodChallengeCheckpoint'>, ToolVars & { code: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation ReachPodChallengeCheckpoint($id: ID!, $toolInstanceId: String!, $code: String!) {
    reachPodChallengeCheckpoint(id: $id, tool_instance_id: $toolInstanceId, code: $code) {
      ...PodChallengeFields
    }
  }
`;

export const CAST_POD_CHALLENGE_POLL: TypedDocumentNode<View<'castPodChallengePoll'>, ToolVars & { optionKey: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation CastPodChallengePoll($id: ID!, $toolInstanceId: String!, $optionKey: String!) {
    castPodChallengePoll(id: $id, tool_instance_id: $toolInstanceId, option_key: $optionKey) {
      ...PodChallengeFields
    }
  }
`;

export const ANSWER_POD_CHALLENGE_QUIZ: TypedDocumentNode<View<'answerPodChallengeQuiz'>, ToolVars & { optionIndex: number }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation AnswerPodChallengeQuiz($id: ID!, $toolInstanceId: String!, $optionIndex: Int!) {
    answerPodChallengeQuiz(id: $id, tool_instance_id: $toolInstanceId, option_index: $optionIndex) {
      ...PodChallengeFields
    }
  }
`;

export const BUZZ_POD_CHALLENGE: TypedDocumentNode<View<'buzzPodChallenge'>, ToolVars> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation BuzzPodChallenge($id: ID!, $toolInstanceId: String!) {
    buzzPodChallenge(id: $id, tool_instance_id: $toolInstanceId) {
      ...PodChallengeFields
    }
  }
`;

export const SUBMIT_POD_CHALLENGE_ENTRY: TypedDocumentNode<
  View<'submitPodChallengeEntry'>,
  ToolVars & { input: PodChallengeEntryInput }
> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation SubmitPodChallengeEntry($id: ID!, $toolInstanceId: String!, $input: PodChallengeEntryInput!) {
    submitPodChallengeEntry(id: $id, tool_instance_id: $toolInstanceId, input: $input) {
      ...PodChallengeFields
    }
  }
`;

export const REMOVE_POD_CHALLENGE_ENTRY: TypedDocumentNode<View<'removePodChallengeEntry'>, { entryId: string }> = gql`
  ${POD_CHALLENGE_FIELDS}
  mutation RemovePodChallengeEntry($entryId: ID!) {
    removePodChallengeEntry(entry_id: $entryId) {
      ...PodChallengeFields
    }
  }
`;
