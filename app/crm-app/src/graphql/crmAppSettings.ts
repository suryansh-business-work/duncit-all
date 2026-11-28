import { gql } from '@/generated/graphql';

/**
 * CRM › CRM Mobile App › Settings — the portal's switch for whether a sign-in
 * to this app goes through Security Verification, read and saved with the same
 * operations.
 */
export const CrmAppSecuritySettingsDocument = gql(`
  query CrmAppSecuritySettings {
    crmAppSettings { security_verification }
  }
`);

export const CrmAppUpdateSecuritySettingsDocument = gql(`
  mutation CrmAppUpdateSecuritySettings($input: UpdateCrmAppSettingsInput!) {
    updateCrmAppSettings(input: $input) { security_verification }
  }
`);
