import gql from 'graphql-tag';

export const communicationLogTypeDefs = gql`
  enum CommsLogType {
    EMAIL
    CALL
  }

  enum CommsLogEntity {
    VENUE_LEAD
    HOST_LEAD
    ECOMM_LEAD
    CREATOR_LEAD
    COMMUNITY_LEAD
  }

  enum CommsLogTranscriptStatus {
    NONE
    PENDING
    READY
    FAILED
  }

  enum CommsCallSpeaker {
    AGENT
    LEAD
  }

  enum CommsSummaryStatus {
    NONE
    PENDING
    READY
    FAILED
  }

  enum CommsCallSentiment {
    POSITIVE
    NEUTRAL
    NEGATIVE
    MIXED
  }

  "One finished utterance from the live call transcription."
  type CommsTranscriptSegment {
    seq: Int!
    speaker: CommsCallSpeaker!
    text: String!
    confidence: Float
    "ISO-8601 time Twilio heard it."
    at: String
  }

  "The AI read of a finished call."
  type CommsCallSummary {
    status: CommsSummaryStatus!
    text: String!
    key_points: [String!]!
    sentiment: CommsCallSentiment
    outcome: String!
    follow_ups: [String!]!
    "The follow-up reminder created from this call, if any."
    reminder_id: ID
    error: String!
    generated_at: String
  }

  type CommunicationLog {
    id: ID!
    type: CommsLogType!
    direction: String!
    entity_type: CommsLogEntity!
    entity_id: ID!
    provider_id: ID
    provider_name: String
    contact_name: String
    contact_value: String!
    subject: String
    body: String
    status: String!
    error_message: String
    duration_seconds: Int!
    recording_url: String
    transcript: String
    transcript_status: CommsLogTranscriptStatus!
    "Live transcription, by speaker, in the order spoken (calls only)."
    transcript_segments: [CommsTranscriptSegment!]!
    summary: CommsCallSummary!
    external_id: String
    "The Twilio caller-ID number the call was placed from."
    from_number: String
    "ISO-8601 time the lead picked up."
    answered_at: String
    "PORTAL or AI for calls."
    mode: String
    muted: Boolean!
    on_hold: Boolean!
    created_by: String
    created_at: String
    updated_at: String
  }

  input CommunicationLogFilter {
    entity_type: CommsLogEntity
    entity_id: ID
    type: CommsLogType
    status: String
    search: String
    """ ISO-8601 inclusive from-date filter. """
    from_date: String
    """ ISO-8601 exclusive to-date filter. """
    to_date: String
  }

  type CommunicationLogPage {
    items: [CommunicationLog!]!
    total: Int!
  }

  extend type Query {
    communicationLogs(
      filter: CommunicationLogFilter
      limit: Int
      offset: Int
    ): CommunicationLogPage!
    communicationLog(id: ID!): CommunicationLog
  }

  extend type Mutation {
    """
    Triggers (or retries) the Servam-AI transcript pipeline for a CALL log.
    Returns the log with transcript_status flipped to PENDING.
    """
    requestCommunicationTranscript(id: ID!): CommunicationLog!
    """
    Generates (or regenerates) the AI summary of a CALL log from its transcript:
    summary, key points, sentiment, outcome and follow-ups. A suggested
    follow-up becomes one reminder, never two.
    """
    summarizeCommunicationLog(id: ID!): CommunicationLog!
  }
`;
