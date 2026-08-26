export const contactChangeTypeDefs = /* GraphQL */ `
  "Which number on the account a one-time code is being asked to move."
  enum ContactPhoneField {
    "The contact number — auth.phone."
    PHONE
    "The WhatsApp number — communication.whatsapp."
    WHATSAPP
  }

  # Changing the email address, contact number or WhatsApp number of the
  # account that is signed in.
  #
  # Every one of them is gated by a one-time code sent to the NEW value,
  # because that is the only thing a code can actually prove: that the person
  # typing it can receive mail at the address, or messages at the number, they
  # are asking us to start using. Proving the OLD one proves nothing about the
  # new one.
  #
  # This is deliberately the only way these three fields move from mWeb and the
  # native app — updateMyProfile refuses to move them. An admin editing
  # somebody else's record through updateUser needs no code: they have already
  # been authorised by their role, and have no access to that person's inbox to
  # answer one with.
  #
  # There is no generic request mutation here (rule 41): each entry point below
  # authorises its own request from the session, so none of them can be used to
  # send a code to an address or number the caller has nothing to do with.
  extend type Mutation {
    """
    Send a one-time code to a number this account wants to start using.

    The code goes to the NEW number over the mediums that number's owner
    accepts, and it is refused if the number already belongs to another
    account — a number is how somebody signs in, so two accounts may not share
    one.
    """
    requestContactPhoneChangeOtp(
      field: ContactPhoneField!
      phone_extension: String!
      phone_number: String!
    ): PhoneOtpRequestResult!

    "Spend the code from requestContactPhoneChangeOtp and store the number."
    confirmContactPhoneChange(
      field: ContactPhoneField!
      phone_extension: String!
      phone_number: String!
      otp: String!
    ): User!

    """
    Email a one-time code to an address this account wants to start using.

    Refused when the address already belongs to another account, and when it is
    the address already on this one — there is nothing to prove in that case.
    """
    requestEmailChangeOtp(email: String!): OtpRequestResult!

    """
    Spend the emailed code and store the address.

    The new address arrives already verified: the code proved it, which is the
    whole reason it was sent there rather than to the address being replaced.
    """
    confirmEmailChange(email: String!, otp: String!): User!
  }
`;
