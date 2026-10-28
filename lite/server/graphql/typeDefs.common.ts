import gql from 'graphql-tag';

/**
 * Shared enums and the table contract (DUNCIT TABLE CONTRACT v1, the same
 * shape `@duncit/table` sends every other console) for the Lite API.
 */
export const commonTypeDefs = gql`
  enum LiteEventStatus {
    DRAFT
    PUBLISHED
    CANCELLED
  }

  enum LiteVisibility {
    "Listed on Discover, the city page and the calendar."
    PUBLIC
    "Reachable by link only."
    UNLISTED
    "Only the host and invited guests can open it."
    PRIVATE
  }

  enum LiteLocationType {
    IN_PERSON
    VIRTUAL
  }

  enum LiteRegistrationStatus {
    "The host must approve before the seat is held."
    PENDING_APPROVAL
    "A paid ticket: the seat is held until the host confirms the UPI payment."
    PAYMENT_PENDING
    CONFIRMED
    WAITLISTED
    DECLINED
    CANCELLED
  }

  enum LitePaymentStatus {
    NOT_REQUIRED
    PENDING
    PAID
    REJECTED
  }

  enum LiteQuestionType {
    TEXT
    LONG_TEXT
    CHECKBOX
    SELECT
  }

  enum LiteHostRole {
    HOST
    CO_HOST
  }

  "Which service proved the contact: Lite's own email code, the person's Duncit account, or an SMS."
  enum LiteSignInVia {
    LITE
    DUNCIT
    SMS
  }

  "A contact a signed-in account can add or change, proved by a code."
  enum LiteContactKind {
    EMAIL
    PHONE
  }

  enum LiteDisplayMode {
    SYSTEM
    LIGHT
    DARK
  }

  "The tabs of Discover's Explore local events."
  enum LiteCityRegion {
    ASIA_PACIFIC
    EUROPE
    AFRICA
    NORTH_AMERICA
    SOUTH_AMERICA
  }

  "How an event page dresses itself."
  enum LiteEventThemeKey {
    MINIMAL
    GRADIENT
    AMBIENT
    PATTERN
    CONFETTI
  }

  enum LiteThemeAccent {
    DEFAULT
    RED
    ORANGE
    AMBER
    GREEN
    TEAL
    BLUE
    PURPLE
    PINK
  }

  enum LiteRegistrationAction {
    APPROVE
    DECLINE
    CONFIRM_PAYMENT
    REJECT_PAYMENT
    CHECK_IN
    UNDO_CHECK_IN
    REMOVE
  }

  enum LiteMyEventsScope {
    HOSTING
    ATTENDING
  }

  enum TableSortDir {
    asc
    desc
  }

  enum TableFilterOp {
    eq
    ne
    in
    contains
    gte
    lte
    between
    is_true
    is_false
  }

  input TableFilterInput {
    field: String!
    op: TableFilterOp!
    value: String
    values: [String!]
  }

  input TableQueryInput {
    search: String
    page: Int
    page_size: Int
    sort_by: String
    sort_dir: TableSortDir
    filters: [TableFilterInput!]
  }

  type Query {
    _lite: Boolean
  }

  type Mutation {
    _lite: Boolean
  }
`;
