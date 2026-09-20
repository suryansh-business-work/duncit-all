import gql from 'graphql-tag';

/** Everything the web app at lite.duncit.com reads and writes. */
export const publicTypeDefs = gql`
  type LiteUser {
    id: ID!
    email: String!
    name: String!
    "The public @handle, what /u/<handle> carries."
    handle: String!
    avatar_url: String
    bio: String
    "The host's default UPI ID, copied onto new paid events."
    upi_id: String
    "The name shown beside the UPI ID (the payee name in the UPI app)."
    upi_name: String
    locale: String
    is_admin: Boolean!
    is_blocked: Boolean!
    "True when this account signed in through a Duncit account."
    duncit_linked: Boolean!
    events_hosted: Int!
    created_at: String!
  }

  type LiteCategory {
    id: ID!
    name: String!
    slug: String!
    "An @mui/icons-material icon name the app maps to a glyph, e.g. MusicNote."
    icon: String
    sort_order: Int!
    is_active: Boolean!
    events_count: Int!
  }

  type LiteCity {
    id: ID!
    name: String!
    slug: String!
    country: String!
    cover_url: String
    featured: Boolean!
    sort_order: Int!
    is_active: Boolean!
    events_count: Int!
  }

  type LiteCalendarOwner {
    id: ID!
    name: String!
    handle: String!
    avatar_url: String
  }

  type LiteCalendar {
    id: ID!
    slug: String!
    name: String!
    description: String
    avatar_url: String
    cover_url: String
    city_slug: String
    city_name: String
    owner: LiteCalendarOwner!
    featured: Boolean!
    subscriber_count: Int!
    upcoming_count: Int!
    viewer_subscribed: Boolean!
    viewer_is_owner: Boolean!
    created_at: String!
  }

  type LiteTicketType {
    id: ID!
    name: String!
    description: String
    "Whole rupees; 0 is a free ticket."
    price: Int!
    "Seats on this ticket; null means unlimited."
    quantity: Int
    sold: Int!
    is_active: Boolean!
  }

  type LiteQuestion {
    id: ID!
    label: String!
    type: LiteQuestionType!
    required: Boolean!
    options: [String!]!
  }

  type LiteHost {
    user_id: ID!
    name: String!
    handle: String!
    avatar_url: String
    role: LiteHostRole!
  }

  type LiteEventStats {
    going: Int!
    waitlisted: Int!
    pending: Int!
    payment_pending: Int!
    checked_in: Int!
    "Rupees confirmed as paid by the host."
    revenue_confirmed: Int!
  }

  type LiteAnswer {
    question_id: ID!
    label: String!
    answer: String!
  }

  type LiteRegistrationTicket {
    id: ID!
    name: String!
    price: Int!
  }

  type LiteRegistrationUser {
    id: ID!
    name: String!
    email: String!
    handle: String!
    avatar_url: String
  }

  type LiteRegistration {
    id: ID!
    "The short check-in code printed on the ticket."
    code: String!
    event: LiteEvent!
    ticket: LiteRegistrationTicket!
    quantity: Int!
    "Rupees the guest owes: ticket price x quantity."
    amount_due: Int!
    status: LiteRegistrationStatus!
    payment_status: LitePaymentStatus!
    "The UPI transaction reference (UTR) the guest typed after paying."
    payment_reference: String
    payment_note: String
    payment_confirmed_at: String
    answers: [LiteAnswer!]!
    checked_in_at: String
    waitlist_position: Int
    user: LiteRegistrationUser!
    created_at: String!
  }

  type LiteEvent {
    id: ID!
    slug: String!
    title: String!
    "Plain text with line breaks; rendered as paragraphs."
    description: String!
    cover_url: String
    start_at: String!
    end_at: String!
    "IANA zone the times are shown in, e.g. Asia/Kolkata."
    timezone: String!
    location_type: LiteLocationType!
    address: String
    venue_name: String
    map_url: String
    city_slug: String
    city_name: String
    "Only answered for the host and for a confirmed guest; null otherwise."
    virtual_link: String
    category: LiteCategory
    calendar: LiteCalendar
    hosts: [LiteHost!]!
    visibility: LiteVisibility!
    status: LiteEventStatus!
    "Total seats; null means unlimited."
    capacity: Int
    require_approval: Boolean!
    tickets: [LiteTicketType!]!
    questions: [LiteQuestion!]!
    "Where a paid ticket is paid: the host's UPI ID. Only set when a ticket costs money."
    upi_id: String
    upi_name: String
    featured: Boolean!
    "Hidden by an admin: only the host can still open it."
    hidden: Boolean!
    stats: LiteEventStats!
    viewer_registration: LiteRegistration
    viewer_is_host: Boolean!
    created_at: String!
    updated_at: String!
    published_at: String
    cancelled_at: String
    cancel_reason: String
  }

  type LiteEventPage {
    rows: [LiteEvent!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteDiscover {
    categories: [LiteCategory!]!
    cities: [LiteCity!]!
    featured_calendars: [LiteCalendar!]!
    popular_events: [LiteEvent!]!
    upcoming_events: [LiteEvent!]!
  }

  type LitePublicSettings {
    site_name: String!
    support_email: String!
    default_timezone: String!
    currency: String!
    "Blank hides Continue with Google."
    google_client_id: String!
    sign_in_with_duncit: Boolean!
    "Shown to a guest beside the host's UPI details."
    upi_help_text: String!
    "The main Duncit app, for the Sign in with Duncit copy."
    duncit_app_url: String!
  }

  type LiteSignInRequest {
    ok: Boolean!
    via: LiteSignInVia!
    expires_in_minutes: Int!
    resend_after_seconds: Int!
    "Set only while no mailbox is configured, so a fresh install can still sign in."
    test_code: String
  }

  type LiteAuthPayload {
    token: String!
    user: LiteUser!
  }

  type LiteUpiQr {
    "A PNG data URL of the upi:// deep link, to show beside the ID."
    data_url: String!
    upi_link: String!
  }

  type LiteSendResult {
    sent: Int!
  }

  type LiteUploadTicket {
    "Where to POST the multipart 'file' field, with the Bearer token."
    upload_url: String!
    max_mb: Int!
  }

  input LiteTicketInput {
    "Omit for a new ticket; pass the existing id to keep its sales."
    id: ID
    name: String!
    description: String
    price: Int!
    quantity: Int
    is_active: Boolean
  }

  input LiteQuestionInput {
    id: ID
    label: String!
    type: LiteQuestionType!
    required: Boolean
    options: [String!]
  }

  input LiteEventInput {
    title: String!
    description: String!
    cover_url: String
    start_at: String!
    end_at: String!
    timezone: String!
    location_type: LiteLocationType!
    address: String
    venue_name: String
    map_url: String
    city_slug: String
    virtual_link: String
    category_id: ID
    calendar_id: ID
    visibility: LiteVisibility!
    capacity: Int
    require_approval: Boolean
    tickets: [LiteTicketInput!]!
    questions: [LiteQuestionInput!]
    upi_id: String
    upi_name: String
  }

  input LiteEventFilter {
    search: String
    city_slug: String
    category_slug: String
    calendar_slug: String
    host_handle: String
    "ISO instant; defaults to now for upcoming listings."
    from: String
    to: String
    featured: Boolean
    "Include events that already ended (default false)."
    past: Boolean
  }

  input LiteAnswerInput {
    question_id: ID!
    answer: String!
  }

  input LiteRegisterInput {
    ticket_id: ID!
    quantity: Int
    answers: [LiteAnswerInput!]
  }

  input LiteProfileInput {
    name: String
    handle: String
    bio: String
    avatar_url: String
    upi_id: String
    upi_name: String
  }

  input LiteCalendarInput {
    name: String!
    slug: String
    description: String
    avatar_url: String
    cover_url: String
    city_slug: String
  }

  extend type Query {
    liteSettings: LitePublicSettings!
    liteMe: LiteUser
    liteDiscover(city_slug: String): LiteDiscover!
    liteEvents(filter: LiteEventFilter, page: Int, page_size: Int): LiteEventPage!
    liteEvent(slug: String!): LiteEvent
    liteMyEvents(scope: LiteMyEventsScope!, past: Boolean): [LiteEvent!]!
    liteMyRegistrations(past: Boolean): [LiteRegistration!]!
    liteRegistration(id: ID!): LiteRegistration
    "The guest list, for the event's hosts."
    liteEventRegistrations(event_id: ID!, status: LiteRegistrationStatus, search: String): [LiteRegistration!]!
    liteCalendar(slug: String!): LiteCalendar
    liteCalendarEvents(slug: String!, past: Boolean): [LiteEvent!]!
    liteMyCalendars: [LiteCalendar!]!
    liteCategories(include_inactive: Boolean): [LiteCategory!]!
    liteCities(include_inactive: Boolean): [LiteCity!]!
    liteCity(slug: String!): LiteCity
    liteUserProfile(handle: String!): LiteUser
    liteUserEvents(handle: String!, past: Boolean): [LiteEvent!]!
    liteUpiQr(upi_id: String!, name: String, amount: Int, note: String): LiteUpiQr!
    liteUploadTicket: LiteUploadTicket!
  }

  extend type Mutation {
    liteRequestSignInCode(email: String!): LiteSignInRequest!
    liteVerifySignInCode(email: String!, code: String!, name: String): LiteAuthPayload!
    liteSignInWithGoogle(id_token: String!): LiteAuthPayload!
    liteUpdateProfile(input: LiteProfileInput!): LiteUser!
    liteSetMyLocale(locale: String!): LiteUser!

    liteCreateEvent(input: LiteEventInput!): LiteEvent!
    liteUpdateEvent(id: ID!, input: LiteEventInput!): LiteEvent!
    litePublishEvent(id: ID!): LiteEvent!
    liteCancelEvent(id: ID!, reason: String): LiteEvent!
    liteDuplicateEvent(id: ID!): LiteEvent!
    liteAddCoHost(event_id: ID!, email: String!): LiteEvent!
    liteRemoveCoHost(event_id: ID!, user_id: ID!): LiteEvent!
    "Email every confirmed guest; the subject and body are the host's own words."
    liteSendEventUpdate(event_id: ID!, subject: String!, body: String!): LiteSendResult!

    liteRegister(event_id: ID!, input: LiteRegisterInput!): LiteRegistration!
    liteSubmitPaymentReference(registration_id: ID!, reference: String!, note: String): LiteRegistration!
    liteCancelRegistration(id: ID!): LiteRegistration!
    liteHostRegistrationAction(id: ID!, action: LiteRegistrationAction!): LiteRegistration!
    liteHostCheckInByCode(event_id: ID!, code: String!): LiteRegistration!

    liteCreateCalendar(input: LiteCalendarInput!): LiteCalendar!
    liteUpdateCalendar(id: ID!, input: LiteCalendarInput!): LiteCalendar!
    liteSubscribeCalendar(id: ID!): LiteCalendar!
    liteUnsubscribeCalendar(id: ID!): LiteCalendar!
  }
`;
