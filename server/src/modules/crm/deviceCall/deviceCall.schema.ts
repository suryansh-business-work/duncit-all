import gql from 'graphql-tag';

export const deviceCallTypeDefs = gql`
  "Who placed a call made or taken on a phone's own SIM."
  enum CrmDeviceCallDirection {
    INBOUND
    OUTBOUND
  }

  "How a phone call ended, as the phone's call log records it."
  enum CrmDeviceCallOutcome {
    COMPLETED
    NO_ANSWER
    BUSY
    FAILED
  }

  "A CRM lead holding a phone number, for the Duncit CRM app's caller ID and dialer."
  type CrmPhoneMatch {
    entity_type: CommsLogEntity!
    lead_id: ID!
    lead_name: String!
    "The contact on the lead the number belongs to."
    contact_name: String
    contact_role: String
    city: String
    lead_status: String
    priority: String
    assigned_to: String
    next_follow_up_date: String
    "The newest entry on the lead's timeline."
    last_activity_summary: String
    last_activity_at: String
  }

  type CrmPhoneLookup {
    "The last ten digits the number was compared by; empty when it has too few digits to identify anyone."
    phone_key: String!
    matches: [CrmPhoneMatch!]!
  }

  "One phone number of one lead, as the Duncit CRM app stores it on the device for offline caller ID."
  type CrmPhoneDirectoryEntry {
    phone_key: String!
    entity_type: CommsLogEntity!
    lead_id: ID!
    lead_name: String!
    contact_name: String
    city: String
    lead_status: String
    assigned_to: String
  }

  type CrmPhoneDirectoryPage {
    items: [CrmPhoneDirectoryEntry!]!
    "Pass back for the next page; null once every lead kind has been walked."
    next_cursor: String
    generated_at: String!
  }

  input CrmDeviceCallInput {
    "The app's own id for this call (device id + call log row). Re-sending the same id returns the log already made."
    client_call_id: String!
    entity_type: CommsLogEntity!
    entity_id: ID!
    contact_number: String!
    contact_name: String
    direction: CrmDeviceCallDirection!
    outcome: CrmDeviceCallOutcome!
    "ISO 8601 with offset; within the last 31 days."
    started_at: String!
    duration_seconds: Int!
    "What the caller noted after the call; also written to the lead's timeline."
    note: String
  }

  input CrmDeviceCallRecordingInput {
    log_id: ID!
    "The phone's own recording, uploaded through Duncit (getImagekitAuth, folder call-recordings)."
    recording_url: String!
    file_name: String
    "An audio/* type."
    content_type: String
  }

  extend type Query {
    "Every CRM lead (any kind) whose contact holds this number. CRM staff only."
    crmPhoneLookup(phone: String!): CrmPhoneLookup!
    "One page of the offline caller-ID directory (limit 1-1000, default 500). CRM staff only."
    crmPhoneDirectory(cursor: String, limit: Int): CrmPhoneDirectoryPage!
  }

  extend type Mutation {
    "Record a call made or taken on the phone's own SIM against a lead, once per client_call_id. CRM staff only."
    logCrmDeviceCall(input: CrmDeviceCallInput!): CommunicationLog!
    "Attach the phone's recording of a device call; it is transcribed and summarised in the background. The caller or a super admin only."
    attachCrmDeviceCallRecording(input: CrmDeviceCallRecordingInput!): CommunicationLog!
  }
`;
