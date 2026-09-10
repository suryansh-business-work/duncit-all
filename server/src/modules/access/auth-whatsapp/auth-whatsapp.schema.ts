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

  """
  Whether an email address or a WhatsApp number is still free to join with.

  Answered while the contact step is being typed, so a taken address or number
  is a correction beside the box that asked for it rather than a refusal on
  the code step. Each half is null when that contact was not asked about.
  """
  type SignupContactAvailability {
    "Null when no email was passed."
    email_available: Boolean
    "Null when no number was passed."
    phone_available: Boolean
  }

  extend type Query {
    """
    Signup step two, as it is typed: is this email / this WhatsApp number free
    to join with? Public, because there is no account yet. A hint for the form,
    not the gate — requestSignupWhatsAppOtp and register refuse a taken contact
    again, because two people can be typing the same one at once.
    """
    signupContactAvailability(
      email: String
      phone_extension: String
      phone_number: String
    ): SignupContactAvailability!
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
