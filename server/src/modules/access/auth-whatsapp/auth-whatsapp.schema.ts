import gql from 'graphql-tag';

export const whatsappTypeDefs = gql`
  type WhatsAppOtpRequestResult {
    ok: Boolean!
    dev_otp: String
  }

  """
  A proven WhatsApp number, on its way to the signup door that spends it.
  """
  type SignupWhatsAppProof {
    ok: Boolean!
    """
    One-shot token naming the number that answered. Passed to the signup door
    that creates the account, which is the only thing that can spend it, and
    only once.
    """
    whatsapp_token: String!
  }

  extend type Mutation {
    """
    Signup step one: send a code to the WhatsApp number joining Duncit.

    Public, because the account this belongs to does not exist yet — proving
    the number is what decides whether it ever will. Refused for a number
    already registered, and for an email already in use, so neither is
    discovered only after a code has been typed.
    """
    requestSignupWhatsAppOtp(
      phone_extension: String!
      phone_number: String!
      "The address the same signup is about to use, checked alongside the number."
      email: String
    ): WhatsAppOtpRequestResult!
    """
    Signup step two: prove the code and receive the token that creates the
    account. Nothing is written — there is no account to write to yet.
    """
    verifySignupWhatsAppOtp(
      phone_extension: String!
      phone_number: String!
      otp: String!
    ): SignupWhatsAppProof!
  }
`;
