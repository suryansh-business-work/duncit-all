import { gql } from '@/generated/graphql';

/**
 * The tools a challenge runs rather than scores by hand — checklist,
 * checkpoint, poll, quiz, buzzer, random picker and submissions. The same
 * operations mWeb sends (rule 27); every one returns the challenge, so the
 * screen updates from the server's own answer.
 */

export const ReachPodChallengeCheckpointDocument = gql(`
  mutation MobileReachPodChallengeCheckpoint($id: ID!, $toolInstanceId: String!, $code: String!) {
    reachPodChallengeCheckpoint(id: $id, tool_instance_id: $toolInstanceId, code: $code) {
      ...MobilePodChallengeFields
    }
  }
`);

export const CastPodChallengePollDocument = gql(`
  mutation MobileCastPodChallengePoll($id: ID!, $toolInstanceId: String!, $optionKey: String!) {
    castPodChallengePoll(id: $id, tool_instance_id: $toolInstanceId, option_key: $optionKey) {
      ...MobilePodChallengeFields
    }
  }
`);

export const AnswerPodChallengeQuizDocument = gql(`
  mutation MobileAnswerPodChallengeQuiz($id: ID!, $toolInstanceId: String!, $optionIndex: Int!) {
    answerPodChallengeQuiz(id: $id, tool_instance_id: $toolInstanceId, option_index: $optionIndex) {
      ...MobilePodChallengeFields
    }
  }
`);

export const BuzzPodChallengeDocument = gql(`
  mutation MobileBuzzPodChallenge($id: ID!, $toolInstanceId: String!) {
    buzzPodChallenge(id: $id, tool_instance_id: $toolInstanceId) {
      ...MobilePodChallengeFields
    }
  }
`);

export const SubmitPodChallengeEntryDocument = gql(`
  mutation MobileSubmitPodChallengeEntry($id: ID!, $toolInstanceId: String!, $input: PodChallengeEntryInput!) {
    submitPodChallengeEntry(id: $id, tool_instance_id: $toolInstanceId, input: $input) {
      ...MobilePodChallengeFields
    }
  }
`);

export const RemovePodChallengeEntryDocument = gql(`
  mutation MobileRemovePodChallengeEntry($entryId: ID!) {
    removePodChallengeEntry(entry_id: $entryId) {
      ...MobilePodChallengeFields
    }
  }
`);

export const SetPodChallengeItemDocument = gql(`
  mutation MobileSetPodChallengeItem($id: ID!, $toolInstanceId: String!, $competitorId: String!, $itemKey: String!, $done: Boolean!) {
    setPodChallengeItem(id: $id, tool_instance_id: $toolInstanceId, competitor_id: $competitorId, item_key: $itemKey, done: $done) {
      ...MobilePodChallengeFields
    }
  }
`);

export const ControlPodChallengeQuizDocument = gql(`
  mutation MobileControlPodChallengeQuiz($id: ID!, $toolInstanceId: String!, $questionKey: String) {
    controlPodChallengeQuiz(id: $id, tool_instance_id: $toolInstanceId, question_key: $questionKey) {
      ...MobilePodChallengeFields
    }
  }
`);

export const ControlPodChallengeBuzzerDocument = gql(`
  mutation MobileControlPodChallengeBuzzer($id: ID!, $toolInstanceId: String!, $arm: Boolean!) {
    controlPodChallengeBuzzer(id: $id, tool_instance_id: $toolInstanceId, arm: $arm) {
      ...MobilePodChallengeFields
    }
  }
`);

export const PickPodChallengeRandomDocument = gql(`
  mutation MobilePickPodChallengeRandom($id: ID!, $toolInstanceId: String!, $reset: Boolean) {
    pickPodChallengeRandom(id: $id, tool_instance_id: $toolInstanceId, reset: $reset) {
      ...MobilePodChallengeFields
    }
  }
`);

/** Hosts only: the link and QR image to post at each checkpoint. */
export const PodChallengeCheckpointLinksDocument = gql(`
  query MobilePodChallengeCheckpointLinks($id: ID!, $toolInstanceId: String!) {
    podChallengeCheckpointLinks(id: $id, tool_instance_id: $toolInstanceId) {
      item_key
      label
      url
      qr_data_url
    }
  }
`);
