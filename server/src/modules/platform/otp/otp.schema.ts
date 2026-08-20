export const otpTypeDefs = /* GraphQL */ `
  "How a one-time code is carried to the person it proves."
  enum OtpMedium {
    SMS
    WHATSAPP
  }

  "What happened when one medium was asked to carry a code."
  enum OtpDeliveryStatus {
    "Genuinely handed to a provider."
    SENT
    "No transport is wired for this medium yet — the test code is returned instead."
    STUBBED
    "The provider refused it."
    FAILED
  }

  type PhoneOtpDelivery {
    medium: OtpMedium!
    status: OtpDeliveryStatus!
    "Why it was not really sent. Blank on a genuine send."
    reason: String!
  }

  """
  An issued one-time code.

  Named PhoneOtp... rather than Otp... because OtpRequestResult is already
  taken by the EMAIL code flows in auth.schema.ts, and two types sharing one
  name are folded into one by the schema builder — a caller then selects a
  field from the other definition and always reads null.

  There is no generic \`requestOtp\` mutation on purpose: every flow that needs a
  number proved authorises the request itself (the pod's host for attendance,
  the signed-in account for a WhatsApp number) and then calls the ONE shared
  otpService underneath. A generic entry point would be an open relay for
  sending codes to arbitrary numbers.
  """
  type PhoneOtpRequestResult {
    challenge_id: ID!
    "ISO instant the code stops working."
    expires_at: String!
    "Every medium that was asked, with what actually happened to it."
    deliveries: [PhoneOtpDelivery!]!
    "Seconds to wait before another code can be requested."
    resend_after_seconds: Int!
    """
    The code itself, echoed back ONLY while no medium could really carry it —
    which is the case for both SMS and WhatsApp today. Null the moment a real
    transport is wired, so no client may depend on reading it.
    """
    test_code: String
  }
`;
