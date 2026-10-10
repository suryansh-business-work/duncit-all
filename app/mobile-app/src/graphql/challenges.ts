import { gql } from '@/generated/graphql';

/**
 * Live pod challenges. The same operations mWeb sends (rule 27), re-declared
 * here because codegen only sees documents written inline in this workspace.
 * The server computes every score, rank and permission; these only read them.
 */
export const PodChallengeFieldsFragment = gql(`
  fragment MobilePodChallengeFields on PodChallenge {
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
    result {
      version
      published_at
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
      can_interact
      can_judge
      allowed_actions
      my_votes {
        tool_instance_id
        kind
        candidate_id
        value
      }
    }
  }
`);

export const PodChallengesDocument = gql(`
  query MobilePodChallenges($podId: ID!) {
    podChallenges(pod_id: $podId) {
      ...MobilePodChallengeFields
    }
  }
`);

export const PodChallengeDocument = gql(`
  query MobilePodChallenge($id: ID!) {
    podChallenge(id: $id) {
      ...MobilePodChallengeFields
    }
  }
`);

export const CastPodChallengeVoteDocument = gql(`
  mutation MobileCastPodChallengeVote($id: ID!, $toolInstanceId: String!, $candidateId: String!) {
    castPodChallengeVote(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId) {
      ...MobilePodChallengeFields
    }
  }
`);

export const RatePodChallengeCompetitorDocument = gql(`
  mutation MobileRatePodChallengeCompetitor($id: ID!, $toolInstanceId: String!, $candidateId: String!, $value: Int!) {
    ratePodChallengeCompetitor(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId, value: $value) {
      ...MobilePodChallengeFields
    }
  }
`);

export const JudgePodChallengeCompetitorDocument = gql(`
  mutation MobileJudgePodChallengeCompetitor(
    $id: ID!
    $toolInstanceId: String!
    $candidateId: String!
    $scores: [PodChallengeCriterionInput!]!
  ) {
    judgePodChallengeCompetitor(id: $id, tool_instance_id: $toolInstanceId, candidate_id: $candidateId, scores: $scores) {
      ...MobilePodChallengeFields
    }
  }
`);

export const PodChallengeSetupDocument = gql(`
  query MobilePodChallengeSetup($podId: ID!) {
    podChallengeSetup(pod_id: $podId) {
      enabled
      require_challenge
      default_template_id
      templates {
        id
        name
      }
    }
  }
`);

export const CreatePodChallengeDocument = gql(`
  mutation MobileCreatePodChallenge($input: CreatePodChallengeInput!) {
    createPodChallenge(input: $input) {
      id
    }
  }
`);

export const UpdatePodChallengeSettingsDocument = gql(`
  mutation MobileUpdatePodChallengeSettings($id: ID!, $input: PodChallengeSettingsInput!) {
    updatePodChallengeSettings(id: $id, input: $input) {
      ...MobilePodChallengeFields
    }
  }
`);

export const SetPodChallengeRosterDocument = gql(`
  mutation MobileSetPodChallengeRoster($id: ID!, $input: PodChallengeRosterInput!) {
    setPodChallengeRoster(id: $id, input: $input) {
      ...MobilePodChallengeFields
    }
  }
`);

export const TransitionPodChallengeDocument = gql(`
  mutation MobileTransitionPodChallenge($id: ID!, $action: String!) {
    transitionPodChallenge(id: $id, action: $action) {
      ...MobilePodChallengeFields
    }
  }
`);

export const RecordPodChallengeScoreDocument = gql(`
  mutation MobileRecordPodChallengeScore($input: PodChallengeScoreInput!) {
    recordPodChallengeScore(input: $input) {
      ...MobilePodChallengeFields
    }
  }
`);

export const VoidPodChallengeScoreDocument = gql(`
  mutation MobileVoidPodChallengeScore($eventId: ID!, $reason: String) {
    voidPodChallengeScore(event_id: $eventId, reason: $reason) {
      ...MobilePodChallengeFields
    }
  }
`);

export const ControlPodChallengeClockDocument = gql(`
  mutation MobileControlPodChallengeClock($id: ID!, $toolInstanceId: String!, $action: String!) {
    controlPodChallengeClock(id: $id, tool_instance_id: $toolInstanceId, action: $action) {
      ...MobilePodChallengeFields
    }
  }
`);

export const SetPodChallengeVotingDocument = gql(`
  mutation MobileSetPodChallengeVoting($id: ID!, $toolInstanceId: String!, $open: Boolean!) {
    setPodChallengeVoting(id: $id, tool_instance_id: $toolInstanceId, open: $open) {
      ...MobilePodChallengeFields
    }
  }
`);

export const SetPodChallengeRoundDocument = gql(`
  mutation MobileSetPodChallengeRound($id: ID!, $round: Int!) {
    setPodChallengeRound(id: $id, round: $round) {
      ...MobilePodChallengeFields
    }
  }
`);

export const PublishPodChallengeResultDocument = gql(`
  mutation MobilePublishPodChallengeResult($id: ID!, $reason: String) {
    publishPodChallengeResult(id: $id, reason: $reason) {
      ...MobilePodChallengeFields
    }
  }
`);

export const PodChallengeScoreLogDocument = gql(`
  query MobilePodChallengeScoreLog($id: ID!) {
    podChallengeScoreLog(challenge_id: $id, limit: 30) {
      id
      tool_instance_id
      competitor_id
      value
      voided
      void_reason
      created_at
    }
  }
`);

export const SendPodChallengeNoticeDocument = gql(`
  mutation MobileSendPodChallengeNotice($id: ID!, $kind: String!, $retryFailed: Boolean) {
    sendPodChallengeNotice(id: $id, kind: $kind, retry_failed: $retryFailed)
  }
`);
