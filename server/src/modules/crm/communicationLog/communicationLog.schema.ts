import gql from 'graphql-tag';

export const communicationLogTypeDefs = gql`
  enum CommsLogType {
    EMAIL
    CALL
  }

  enum CommsLogEntity {
    VENUE_LEAD
    HOST_LEAD
  }

  enum CommsLogTranscriptStatus {
    NONE
    PENDING
    READY
    FAILED
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
    external_id: String
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
  }
`;
