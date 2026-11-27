import { gql } from '@/generated/graphql';

/**
 * The CRM call line's Twilio settings, edited from the app with the Tech
 * portal's own operations: the same TWILIO environment entry, the same
 * server-side checks (SUPER_ADMIN / TECH_MANAGER, and this session unlocked
 * with the root admin's emailed code), the same registry validation.
 */

export const CrmAppEnvAccessStatusDocument = gql(`
  query CrmAppEnvAccessStatus {
    envAccessStatus { unlocked expires_at sent_to }
  }
`);

export const CrmAppRequestEnvAccessCodeDocument = gql(`
  mutation CrmAppRequestEnvAccessCode {
    requestEnvAccessCode { challenge_id expires_at resend_after_seconds sent_to }
  }
`);

export const CrmAppVerifyEnvAccessCodeDocument = gql(`
  mutation CrmAppVerifyEnvAccessCode($challengeId: ID!, $code: String!) {
    verifyEnvAccessCode(challengeId: $challengeId, code: $code) { unlocked expires_at sent_to }
  }
`);

export const CrmAppTwilioEntriesDocument = gql(`
  query CrmAppTwilioEntries {
    envEntries(filter: { category: TWILIO }) {
      id
      name
      is_default
      is_active
      config { key value }
      secrets { key present }
      last_test_ok
    }
  }
`);

export const CrmAppCreateTwilioEntryDocument = gql(`
  mutation CrmAppCreateTwilioEntry($input: CreateEnvEntryInput!) {
    createEnvEntry(input: $input) { id }
  }
`);

export const CrmAppUpdateTwilioEntryDocument = gql(`
  mutation CrmAppUpdateTwilioEntry($id: ID!, $input: UpdateEnvEntryInput!) {
    updateEnvEntry(id: $id, input: $input) { id }
  }
`);

export const CrmAppTestTwilioEntryDocument = gql(`
  mutation CrmAppTestTwilioEntry($id: ID!) {
    testEnvEntry(id: $id) { ok message }
  }
`);
