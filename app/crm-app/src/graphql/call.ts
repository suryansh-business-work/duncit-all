import { gql } from '@/generated/graphql';

/**
 * The CRM call line — the CRM portal's call window operations: whether a call
 * can be placed and from which numbers, placing it (Twilio rings the agent's
 * phone and joins the lead in, recorded and transcribed), mute / hold / end,
 * the live call with its transcript so far, and a status re-sync from Twilio.
 */
export const CrmAppCallSetupDocument = gql(`
  query CrmAppCallSetup {
    crmCallSetup {
      configured
      missing
      from_number
      agent_number
      agent_source
      recording_enabled
      live_transcription
      can_configure
    }
  }
`);

export const CrmAppStartCallDocument = gql(`
  mutation CrmAppStartCall(
    $entity_type: CommsLogEntity!
    $id: ID!
    $contact_number: String!
    $contact_name: String
  ) {
    startCrmPortalCall(
      entity_type: $entity_type
      id: $id
      contact_number: $contact_number
      contact_name: $contact_name
    ) {
      ok
      message
      code
      log_id
    }
  }
`);

export const CrmAppControlCallDocument = gql(`
  mutation CrmAppControlCall($log_id: ID!, $action: CrmCallAction!) {
    controlCrmCall(log_id: $log_id, action: $action) {
      ok
      message
      status
      muted
      on_hold
    }
  }
`);

export const CrmAppActiveCallDocument = gql(`
  query CrmAppActiveCall {
    myActiveCrmCall {
      id
      entity_type
      entity_id
      status
      answered_at
      muted
      on_hold
      transcript_segments { seq speaker text at }
    }
  }
`);

export const CrmAppReconcileCallDocument = gql(`
  mutation CrmAppReconcileCall($log_id: ID!) {
    reconcileCrmCall(log_id: $log_id) {
      ok
      status
    }
  }
`);
