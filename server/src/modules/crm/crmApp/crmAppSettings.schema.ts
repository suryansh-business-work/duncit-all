export const crmAppSettingsTypeDefs = /* GraphQL */ `
  "How the Duncit CRM app behaves, set from CRM › CRM Mobile App › Settings (or the app's own Settings)."
  type CrmAppSettings {
    """
    Whether a sign-in to the Duncit CRM app goes through the Security
    Verification screen (location and consent) first. On unless a CRM manager
    turned it off. The CRM web portal always asks.
    """
    security_verification: Boolean!
  }

  input UpdateCrmAppSettingsInput {
    "Off lets a Duncit CRM app sign-in through straight away, without the Security Verification screen."
    security_verification: Boolean!
  }

  extend type Query {
    "The Duncit CRM app's settings. CRM managers only."
    crmAppSettings: CrmAppSettings!
  }

  extend type Mutation {
    "Turn the Duncit CRM app's Security Verification screen on or off for new sign-ins. CRM managers only."
    updateCrmAppSettings(input: UpdateCrmAppSettingsInput!): CrmAppSettings!
  }
`;
