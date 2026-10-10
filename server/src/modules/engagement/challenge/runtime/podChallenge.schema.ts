import gql from 'graphql-tag';

export const podChallengeTypeDefs = gql`
  "One tool of a running challenge, with its live state."
  type PodChallengeTool {
    instance_id: String!
    tool_type: String!
    "How an operator feeds this tool: INCREMENT, SET_VALUE, VOTE, RATE, JUDGE, CLOCK, ROUND or NONE."
    input_kind: String!
    label: String!
    config_json: String!
    clock_running: Boolean!
    "Elapsed clock time at server_now; add (now - server_now) while running."
    clock_elapsed_ms: Float!
    voting_open: Boolean!
  }

  "A ranked player (INDIVIDUAL) or team (TEAM)."
  type PodChallengeCompetitor {
    competitor_id: String!
    name: String!
    user_id: ID
  }

  type PodChallengePlayer {
    player_id: String!
    name: String!
    team_id: String!
    user_id: ID
  }

  type PodChallengeStanding {
    competitor_id: String!
    name: String!
    rank: Int!
    total: Float!
    "Per tool instance metric, as a JSON object { instance_id: number | null }."
    metrics_json: String!
  }

  "A published, immutable result version."
  type PodChallengeResult {
    version: Int!
    published_at: String!
    "Why a corrected version was published (empty for the first)."
    reason: String!
    winner_ids: [String!]!
    standings: [PodChallengeStanding!]!
  }

  type PodChallengeBallot {
    tool_instance_id: String!
    kind: String!
    candidate_id: String!
    value: Float!
  }

  "What the current viewer may do — decided on the server."
  type PodChallengeViewer {
    can_manage: Boolean!
    is_staff: Boolean!
    is_attendee: Boolean!
    is_judge: Boolean!
    can_interact: Boolean!
    can_judge: Boolean!
    "Lifecycle actions available to a manager right now."
    allowed_actions: [String!]!
    "The viewer's ballots in the current round."
    my_votes: [PodChallengeBallot!]!
  }

  type PodChallenge {
    id: ID!
    pod_id: ID!
    pod_title: String!
    template_id: ID!
    name: String!
    participant_mode: String!
    "DRAFT, SCHEDULED, LIVE, PAUSED, COMPLETED, CANCELLED or ARCHIVED."
    status: String!
    enabled: Boolean!
    show_on_pod_details: Boolean!
    audience_interaction_enabled: Boolean!
    auto_whatsapp: Boolean!
    auto_email: Boolean!
    scheduled_for: String
    started_at: String
    completed_at: String
    updated_at: String!
    server_now: String!
    "Bumps on every change; compare with challenge:changed socket signals."
    revision: Int!
    current_round: Int!
    tools: [PodChallengeTool!]!
    competitors: [PodChallengeCompetitor!]!
    players: [PodChallengePlayer!]!
    "Managers only."
    judge_user_ids: [ID!]!
    "Live standings (empty for non-managers once the challenge has ended)."
    standings: [PodChallengeStanding!]!
    live_winner_ids: [String!]!
    "The current published result, if any."
    result: PodChallengeResult
    "Managers only: the pod's category no longer allows this challenge's tools."
    eligibility_warning: Boolean!
    viewer: PodChallengeViewer!
  }

  "What a host may set up on a pod (from its category mapping)."
  type PodChallengeSetup {
    pod_id: ID!
    enabled: Boolean!
    require_challenge: Boolean!
    allow_host_customization: Boolean!
    default_template_id: ID
    "Templates whose every tool this pod's category allows."
    templates: [Challenge!]!
  }

  type PodChallengeScoreEntry {
    id: ID!
    tool_instance_id: String!
    competitor_id: String!
    event_type: String!
    value: Float!
    round: Int!
    voided: Boolean!
    void_reason: String!
    created_at: String!
  }

  input PodChallengeToolOverrideInput {
    instance_id: String!
    config_json: String!
  }

  input CreatePodChallengeInput {
    pod_id: ID!
    template_id: ID!
    name: String
    "Only when the category allows host customisation."
    tool_overrides: [PodChallengeToolOverrideInput!]
  }

  input PodChallengeSettingsInput {
    name: String
    enabled: Boolean
    show_on_pod_details: Boolean
    audience_interaction_enabled: Boolean
    auto_whatsapp: Boolean
    auto_email: Boolean
    scheduled_for: String
  }

  input PodChallengeCompetitorInput {
    competitor_id: String
    name: String!
    user_id: ID
  }

  input PodChallengePlayerInput {
    player_id: String
    name: String!
    user_id: ID
    team_id: String!
  }

  input PodChallengeRosterInput {
    competitors: [PodChallengeCompetitorInput!]!
    players: [PodChallengePlayerInput!]
    judge_user_ids: [ID!]
  }

  input PodChallengeScoreInput {
    challenge_id: ID!
    tool_instance_id: String!
    competitor_id: String!
    value: Float!
    "Client-generated id; a retried request is recorded once."
    client_event_id: String!
    "Required for corrections after the challenge has ended."
    reason: String
  }

  input PodChallengeCriterionInput {
    key: String!
    value: Float!
  }

  extend type Query {
    "Challenges on a pod the viewer may see (managers see drafts too)."
    podChallenges(pod_id: ID!): [PodChallenge!]!
    podChallenge(id: ID!): PodChallenge
    podChallengeSetup(pod_id: ID!): PodChallengeSetup!
    podChallengeScoreLog(challenge_id: ID!, limit: Int): [PodChallengeScoreEntry!]!
  }

  extend type Mutation {
    createPodChallenge(input: CreatePodChallengeInput!): PodChallenge!
    updatePodChallengeSettings(id: ID!, input: PodChallengeSettingsInput!): PodChallenge!
    setPodChallengeRoster(id: ID!, input: PodChallengeRosterInput!): PodChallenge!
    "SCHEDULE, UNSCHEDULE, START, PAUSE, RESUME, COMPLETE, CANCEL or ARCHIVE."
    transitionPodChallenge(id: ID!, action: String!): PodChallenge!
    recordPodChallengeScore(input: PodChallengeScoreInput!): PodChallenge!
    voidPodChallengeScore(event_id: ID!, reason: String): PodChallenge!
    "START, STOP or RESET a timer tool."
    controlPodChallengeClock(id: ID!, tool_instance_id: String!, action: String!): PodChallenge!
    setPodChallengeVoting(id: ID!, tool_instance_id: String!, open: Boolean!): PodChallenge!
    setPodChallengeRound(id: ID!, round: Int!): PodChallenge!
    castPodChallengeVote(id: ID!, tool_instance_id: String!, candidate_id: String!): PodChallenge!
    ratePodChallengeCompetitor(id: ID!, tool_instance_id: String!, candidate_id: String!, value: Int!): PodChallenge!
    judgePodChallengeCompetitor(
      id: ID!
      tool_instance_id: String!
      candidate_id: String!
      scores: [PodChallengeCriterionInput!]!
    ): PodChallenge!
    "Finalize & Publish. Republishing is a staff-only correction and needs a reason."
    publishPodChallengeResult(id: ID!, reason: String): PodChallenge!
  }
`;
