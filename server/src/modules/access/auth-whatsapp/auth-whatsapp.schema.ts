import gql from 'graphql-tag';

export const whatsappTypeDefs = gql`
  type WhatsAppOtpRequestResult {
    ok: Boolean!
    dev_otp: String
  }

  extend type Mutation {
    requestWhatsAppOtp(phone_extension: String!, phone_number: String!): WhatsAppOtpRequestResult!
    """
    Prove the WhatsApp number, and write it where signup said it belongs.

    also_mobile is the signup tick box: true writes the proven number to the
    account's phone as well, false leaves that blank on purpose. It defaults to
    false so a shipped build that predates the box never fills in a number the
    person did not agree to — the email door has already written its own phone
    by the time this runs.
    """
    verifyWhatsAppOtp(
      phone_extension: String!
      phone_number: String!
      otp: String!
      also_mobile: Boolean = false
    ): User!
    skipWhatsAppOtp: User!
  }
`;
