import gql from 'graphql-tag';

export const crmCallTypeDefs = gql`
  "Whether CRM calls can be placed right now, and from which numbers."
  type CrmCallSetup {
    "All three required TWILIO keys (account SID, auth token, phone number) are set."
    configured: Boolean!
    "Required TWILIO fields that are still empty, by their Tech portal field name."
    missing: [String!]!
    "The caller-ID (Call From) number, or null when none is configured."
    from_number: String
    "The agent phone Twilio rings for a portal call, or null when there is none."
    agent_number: String
    "CONFIG (TWILIO entry) or PROFILE (the agent's own profile phone)."
    agent_source: String
    recording_enabled: Boolean!
    live_transcription: Boolean!
    "The signed-in user may change the TWILIO entry in the Tech portal."
    can_configure: Boolean!
  }

  enum CrmCallAction {
    MUTE
    UNMUTE
    HOLD
    RESUME
    END
  }

  type CrmCallControlResult {
    ok: Boolean!
    message: String!
    log_id: ID!
    status: String
    muted: Boolean!
    on_hold: Boolean!
  }

  extend type Query {
    crmCallSetup: CrmCallSetup!
    "The signed-in agent's call that is still live, to restore the call window after a reload."
    myActiveCrmCall: CommunicationLog
  }

  extend type Mutation {
    "Mute or unmute yourself, hold or resume the lead, or end the call. Only the agent who placed the call may."
    controlCrmCall(log_id: ID!, action: CrmCallAction!): CrmCallControlResult!
  }
`;
