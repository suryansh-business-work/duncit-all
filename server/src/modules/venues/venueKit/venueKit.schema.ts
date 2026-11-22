export const venueKitTypeDefs = /* GraphQL */ `
  "The Venue Kit's one annual plan, as duncit.com/venue-kit and the Venues console show it. Money is in paise."
  type VenueKitOffer {
    annual_price_paise: Int!
    "Table QR labels included in the kit."
    included_table_labels: Int!
    "Price of each label beyond the included ones."
    extra_label_price_paise: Int!
    "How long the Smart POS activation coupon in the kit lasts."
    pos_activation_months: Int!
    "Free Duncit gift cards in the kit, and the value of each."
    gift_card_count: Int!
    gift_card_value_paise: Int!
    "Discount on additional venue collaboration gift cards."
    collab_gift_card_discount_pct: Float!
    "Share of every order Duncit funds back to the venue."
    order_benefit_pct: Float!
    "When an admin last changed the offer; null while the shipped defaults apply."
    updated_at: String
  }

  input VenueKitOfferInput {
    annual_price_paise: Int!
    included_table_labels: Int!
    extra_label_price_paise: Int!
    pos_activation_months: Int!
    gift_card_count: Int!
    gift_card_value_paise: Int!
    collab_gift_card_discount_pct: Float!
    order_benefit_pct: Float!
  }

  "Where an interested venue came from."
  enum VenueKitSource {
    WEBSITE
    VENUES_PORTAL
  }

  "How far the venues team has taken an interested venue."
  enum VenueKitInterestStatus {
    NEW
    CONTACTED
    CONVERTED
    NOT_INTERESTED
  }

  "A venue that registered interest in the Venue Kit. The email is always verified; the phone may not be."
  type VenueKitInterest {
    id: ID!
    name: String!
    email: String!
    email_verified_at: String!
    phone_extension: String!
    phone_number: String!
    phone_verified: Boolean!
    phone_verified_at: String
    source: VenueKitSource!
    status: VenueKitInterestStatus!
    note: String!
    "How many times this mailbox has submitted the form."
    submission_count: Int!
    last_submitted_at: String!
    created_at: String!
  }

  type VenueKitInterestTablePage {
    rows: [VenueKitInterest!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type VenueKitStatusCount {
    status: VenueKitInterestStatus!
    count: Int!
  }

  type VenueKitInterestSummary {
    total: Int!
    phone_verified: Int!
    by_status: [VenueKitStatusCount!]!
  }

  "A Venue Kit code that was issued. Named apart from PhoneOtpRequestResult: this flow returns no challenge id."
  type VenueKitOtpRequest {
    "ISO instant the code stops working."
    expires_at: String!
    resend_after_seconds: Int!
    expires_in_minutes: Int!
    "Whether a provider really carried the code."
    sent: Boolean!
    "The code itself, ONLY while no provider is configured. Null whenever a real send happened."
    test_code: String
  }

  "The one-shot proof a verified code earns, spent by submitVenueKitInterest."
  type VenueKitOtpProof {
    token: String!
  }

  type VenueKitSubmitResult {
    ok: Boolean!
    "True when this mailbox had already registered; the row was refreshed, not duplicated."
    already_registered: Boolean!
    interest: VenueKitInterest!
  }

  input VenueKitEmailOtpInput {
    name: String!
    email: String!
    "Human check, required only when nobody is signed in. See the captchaChallenge query."
    captcha_token: String
    captcha_answer: String
  }

  input VenueKitEmailVerifyInput {
    email: String!
    code: String!
  }

  input VenueKitPhoneOtpInput {
    "The token verifyVenueKitEmailOtp returned — the phone code needs a proved email first."
    email_token: String!
    "Only +91: the SMS code reaches Indian mobiles."
    phone_extension: String!
    phone_number: String!
  }

  input VenueKitPhoneVerifyInput {
    phone_extension: String!
    phone_number: String!
    code: String!
  }

  input VenueKitInterestInput {
    name: String!
    email_token: String!
    phone_extension: String!
    phone_number: String!
    "Optional: present only when the phone was verified."
    phone_token: String
  }

  input VenueKitInterestStatusInput {
    id: ID!
    status: VenueKitInterestStatus!
    note: String
  }

  extend type Query {
    "Public. The Venue Kit plan the website and the Venues console show."
    venueKitOffer: VenueKitOffer!
    "Venues console: every venue that registered interest."
    venueKitInterestsTable(query: TableQueryInput): VenueKitInterestTablePage!
    "Venues console: the counts above the table."
    venueKitInterestSummary: VenueKitInterestSummary!
  }

  extend type Mutation {
    "Public, captcha-gated when signed out. Emails a 6-digit code to the address on the Venue Kit form."
    requestVenueKitEmailOtp(input: VenueKitEmailOtpInput!): VenueKitOtpRequest!
    "Public. Checks the emailed code and returns the proof the submit spends."
    verifyVenueKitEmailOtp(input: VenueKitEmailVerifyInput!): VenueKitOtpProof!
    "Public, needs a live email proof. Texts a 6-digit code to a +91 mobile (optional step)."
    requestVenueKitPhoneOtp(input: VenueKitPhoneOtpInput!): VenueKitOtpRequest!
    "Public. Checks the texted code and returns the phone proof."
    verifyVenueKitPhoneOtp(input: VenueKitPhoneVerifyInput!): VenueKitOtpProof!
    "Public. Registers (or refreshes) the venue's interest; spends the email proof and, when given, the phone proof."
    submitVenueKitInterest(input: VenueKitInterestInput!): VenueKitSubmitResult!
    "Venues console: move an interested venue along (contacted, converted…) with an optional note."
    setVenueKitInterestStatus(input: VenueKitInterestStatusInput!): VenueKitInterest!
    "Super Admin: change the Venue Kit plan every surface shows."
    updateVenueKitOffer(input: VenueKitOfferInput!): VenueKitOffer!
  }
`;
