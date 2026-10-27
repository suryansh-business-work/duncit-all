import gql from 'graphql-tag';

/** Everything the web app at lite.duncit.com reads and writes. */
export const publicTypeDefs = gql`
  "Profile links: a handle for each network (no @), a full link for the website; '' when unset."
  type LiteSocialLinks {
    instagram: String!
    x: String!
    youtube: String!
    tiktok: String!
    linkedin: String!
    website: String!
  }

  type LiteUser {
    id: ID!
    "'' for a phone-only account, and for anyone but the owner or an admin."
    email: String!
    "E.164, only for the owner and admins."
    phone: String
    name: String!
    "The public @handle, what /u/<handle> carries."
    handle: String!
    avatar_url: String
    bio: String
    social: LiteSocialLinks!
    "The host's default UPI ID, copied onto new paid events."
    upi_id: String
    "The name shown beside the UPI ID (the payee name in the UPI app)."
    upi_name: String
    locale: String
    "Light, dark, or follow the device."
    display_mode: LiteDisplayMode!
    is_admin: Boolean!
    is_blocked: Boolean!
    "True when this account signed in through a Duncit account."
    duncit_linked: Boolean!
    events_hosted: Int!
    "Events this person had a confirmed seat at, that have already started."
    events_attended: Int!
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
    region: LiteCityRegion!
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
    "Shown to the guest, the event's hosts and admins; set for a phone-only guest."
    phone: String
    handle: String!
    avatar_url: String
  }

  type LiteRegistration {
    id: ID!
    "The short check-in code printed on the ticket."
    code: String!
    event_id: ID!
    "A PNG data URL of the check-in QR (event + code) the host scans at the door; null until the ticket is confirmed."
    qr_data_url: String
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

  type LiteEventTheme {
    key: LiteEventThemeKey!
    accent: LiteThemeAccent!
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
    "The Google place picked in the event form; with lat/lng it draws the map."
    place_id: String
    lat: Float
    lng: Float
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
    "False once the host closed registration; the page stays up."
    registration_open: Boolean!
    theme: LiteEventTheme!
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
    "Events an admin featured, in every city: the Upcoming major events row."
    featured_events: [LiteEvent!]!
  }

  type LiteInsightDay {
    "yyyy-MM-dd in the event's time zone."
    day: String!
    views: Int!
    registrations: Int!
  }

  type LiteEventInsights {
    days: Int!
    total_views: Int!
    total_registrations: Int!
    series: [LiteInsightDay!]!
  }

  type LitePublicSettings {
    site_name: String!
    support_email: String!
    default_timezone: String!
    currency: String!
    "Blank hides Continue with Google."
    google_client_id: String!
    sign_in_with_duncit: Boolean!
    "A browser key (restricted by referrer) for place search and the event map; blank turns both off."
    maps_api_key: String!
    maps_map_id: String!
    "True when Use phone number is offered on sign-in."
    phone_sign_in: Boolean!
    "Digits, e.g. 91; the prefix a phone number typed without one gets."
    default_country_code: String!
    "Rupee ceiling on a ticket price; 0 means no ceiling."
    max_ticket_price: Int!
    max_event_capacity: Int!
    max_seats_per_registration: Int!
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

  input LiteEventThemeInput {
    key: LiteEventThemeKey
    accent: LiteThemeAccent
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
    place_id: String
    lat: Float
    lng: Float
    registration_open: Boolean
    theme: LiteEventThemeInput
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

  input LiteSocialLinksInput {
    instagram: String
    x: String
    youtube: String
    tiktok: String
    linkedin: String
    website: String
  }

  input LiteProfileInput {
    name: String
    handle: String
    bio: String
    avatar_url: String
    upi_id: String
    upi_name: String
    social: LiteSocialLinksInput
    display_mode: LiteDisplayMode
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
    "Page views and registrations per day, for the event's hosts (days: 1-90, default 7)."
    liteEventInsights(event_id: ID!, days: Int): LiteEventInsights!
  }

  extend type Mutation {
    liteRequestSignInCode(email: String!): LiteSignInRequest!
    liteVerifySignInCode(email: String!, code: String!, name: String): LiteAuthPayload!
    liteSignInWithGoogle(id_token: String!): LiteAuthPayload!
    "Text a sign-in code to a phone (E.164, or national with the default country code)."
    liteRequestPhoneSignInCode(phone: String!): LiteSignInRequest!
    liteVerifyPhoneSignInCode(phone: String!, code: String!, name: String): LiteAuthPayload!
    "Send a code to a new email or phone for the signed-in account."
    liteRequestContactCode(kind: LiteContactKind!, value: String!): LiteSignInRequest!
    liteVerifyContact(kind: LiteContactKind!, value: String!, code: String!): LiteUser!
    "Count one page view of an event (hosts are not counted). Fire and forget."
    liteTrackEventView(slug: String!): Boolean!
    liteUpdateProfile(input: LiteProfileInput!): LiteUser!
    liteSetMyLocale(locale: String!): LiteUser!

    liteCreateEvent(input: LiteEventInput!): LiteEvent!
    liteUpdateEvent(id: ID!, input: LiteEventInput!): LiteEvent!
    litePublishEvent(id: ID!): LiteEvent!
    liteCancelEvent(id: ID!, reason: String): LiteEvent!
    liteDuplicateEvent(id: ID!): LiteEvent!
    liteSetRegistrationOpen(id: ID!, open: Boolean!): LiteEvent!
    "A new public link for the event; the old link stops working."
    liteChangeEventSlug(id: ID!, slug: String!): LiteEvent!
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
