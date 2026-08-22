export const commPreferenceTypeDefs = /* GraphQL */ `
  "A way Duncit can reach a person. Channel and kind are different axes."
  enum CommChannel {
    EMAIL
    WHATSAPP
    SMS
  }

  """
  One channel on the Communication Preferences section of Profile Settings.

  The marketing side of each channel lives on its own screen — Mail Preference,
  WhatsApp Preference, SMS Preference — because there are nine categories with
  a sentence each and inlining them would push the account's own information
  off the first screen. What IS inline is the switch below: whether this
  channel may carry a one-time code.
  """
  type CommChannelPreference {
    channel: CommChannel!
    """
    Whether a message could reach this person here at all — an address for
    EMAIL, a WhatsApp number, a phone number for SMS. Both apps render an
    "add your number" state off this rather than re-deriving it.
    """
    reachable: Boolean!
    "The address or number, for the screen to name. Blank when unreachable."
    destination: String!
    "Whether one-time codes may be carried on this channel."
    otp_enabled: Boolean!
    """
    False when the switch must stay on: this is the last channel that both
    accepts codes AND can be reached, and an account with nowhere to receive a
    code cannot sign in. Enabling is never blocked, only disabling.
    """
    otp_can_disable: Boolean!
  }

  type CommPreference {
    channels: [CommChannelPreference!]!
    "ISO instant the OTP switches last moved. Null while they are all default."
    updated_at: String
  }

  extend type Query {
    "Every channel, whether it can reach this account, and its code switch."
    myCommunicationPreference: CommPreference!
  }

  extend type Mutation {
    """
    Turn one-time codes on or off for one channel.

    Refuses the write that would leave the account with no reachable channel
    for a code — that is a lockout, not a preference.
    """
    setMyOtpChannel(channel: CommChannel!, enabled: Boolean!): CommPreference!
  }
`;
