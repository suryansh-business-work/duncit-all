export const venueTypeDefs = /* GraphQL */ `
  enum VenueStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  type VenueDocument {
    type: String!
    url: String!
    uploaded_at: String!
  }

  input VenueDocumentInput {
    type: String!
    url: String!
  }

  "Category the venue wants to host pods in (shared pods Category taxonomy)."
  type VenueCategory {
    super_category_id: ID
    category_id: ID
    sub_category_id: ID
    super_category_name: String!
    category_name: String!
    sub_category_name: String!
  }

  input VenueCategoryInput {
    super_category_id: ID!
    category_id: ID!
    sub_category_id: ID!
  }

  "One named capacity the venue offers (e.g. 'Banquet hall' seats 120)."
  type VenueCapacityItem {
    label: String!
    capacity: Int!
  }

  input VenueCapacityItemInput {
    label: String!
    capacity: Int!
  }

  enum VenueFoodDiet {
    VEG
    NON_VEG
    EGG
    VEGAN
  }

  enum VenueFoodSpiceLevel {
    NONE
    MILD
    MEDIUM
    HOT
    EXTRA_HOT
  }

  "How a dish's saving against its struck-through original price reads: 20% off (PERCENT) or an amount off (AMOUNT)."
  enum VenueFoodSavingDisplay {
    PERCENT
    AMOUNT
  }

  "One dish on a venue's food menu."
  type VenueFoodItem {
    id: ID!
    name: String!
    description: String!
    "The owner's own menu heading, e.g. 'Starters'. Blank lists under no heading."
    category: String!
    "Rupees for one, taxes included."
    price: Float!
    images: [String!]!
    diet: VenueFoodDiet!
    spice_level: VenueFoodSpiceLevel!
    "Off = shown as unavailable and refused at checkout."
    is_available: Boolean!
    "Uploaded video clips or YouTube video links."
    videos: [String!]!
    "The MRP shown struck through beside price. Display only: the guest is always charged price. Null = no strikethrough."
    original_price: Float
    "How the saving against original_price reads."
    saving_display: VenueFoodSavingDisplay!
  }

  "The licences a venue that serves food shows. On publicVenue only the numbers are filled; the documents are always empty there."
  type VenueFoodLicences {
    "14 digits. Printed at the foot of the public menu and on food invoices."
    fssai_number: String!
    fssai_document_url: String!
    liquor_licence_number: String!
    liquor_document_url: String!
  }

  "A field left out (or null) keeps what is stored; an empty string clears it."
  input VenueFoodLicencesInput {
    "Exactly 14 digits, or empty."
    fssai_number: String
    fssai_document_url: String
    liquor_licence_number: String
    liquor_document_url: String
  }

  input VenueFoodItemInput {
    "The id of a dish the venue already lists; leave out for a new dish."
    id: ID
    name: String!
    description: String
    category: String
    price: Float!
    images: [String!]
    diet: VenueFoodDiet
    spice_level: VenueFoodSpiceLevel
    is_available: Boolean
    "At most venueRegistrationConfig.food_video_limit links: YouTube video links or uploaded clips. Omitted = none."
    videos: [String!]
    "Display only, never charged. Must be above price; null or 0 = no strikethrough."
    original_price: Float
    saving_display: VenueFoodSavingDisplay
  }

  "Scan-and-order. Guests pay the venue's OWN Razorpay account."
  type VenueFoodOrdering {
    enabled: Boolean!
    "The owner's saved Razorpay connection. Always null on the public venue."
    razorpay_integration_id: ID
    "Whether the owner has linked a Razorpay account — what the venues console reads instead of the id."
    razorpay_linked: Boolean!
    "Percent the venue takes off every QR order."
    discount_pct: Int!
    "True while the venue sets its own GST; false follows Finance's food default (foodTaxDefaults)."
    tax_override: Boolean!
    "What the venue's orders are priced with right now — its own while tax_override, otherwise Finance's default."
    tax_mode: FoodTaxMode!
    "The GST percent the venue's orders are priced with right now, resolved the same way as tax_mode."
    gst_pct: Int!
  }

  "How a rented item's rate is charged: once for the pod's slot, or per hour of the pod."
  enum VenueRentalUnit {
    SLOT
    HOUR
  }

  "One item a venue rents out to pod guests (a racket, court shoes)."
  type VenueRentalItem {
    id: ID!
    name: String!
    description: String!
    images: [String!]!
    unit: VenueRentalUnit!
    "Rupees per unit, for the slot or for each hour."
    rate: Int!
    "Refundable deposit per unit, rupees. 0 = none."
    deposit: Int!
    "Units available for one pod."
    stock: Int!
    per_guest_limit: Int!
    is_available: Boolean!
  }

  input VenueRentalItemInput {
    "An existing item's id keeps it (and its bookings); omitted = a new item."
    id: ID
    name: String!
    description: String
    images: [String!]
    unit: VenueRentalUnit
    rate: Int!
    deposit: Int
    stock: Int!
    per_guest_limit: Int
    is_available: Boolean
  }

  input VenueFoodOrderingInput {
    enabled: Boolean
    "One of the venue owner's own myPartnerIntegrations(provider: RAZORPAY) that passed its check; null unlinks."
    razorpay_integration_id: ID
    discount_pct: Int
    "On: tax_mode and gst_pct below price the venue's orders. Off: Finance's default does."
    tax_override: Boolean
    tax_mode: FoodTaxMode
    "A whole percent from 0 to 28."
    gst_pct: Int
  }

  "Registration option catalogs — clients render these instead of hardcoding."
  type VenueRegistrationConfig {
    venue_types: [String!]!
    doc_types: [String!]!
    "The doc_types entry uploaded beside a GSTIN, not from the general list."
    gstin_doc_type: String!
    "The doc_types entry uploaded beside a PAN, not from the general list."
    pan_doc_type: String!
    capacity_item_limit: Int!
    "The most categories one venue may belong to (venue_categories)."
    category_limit: Int!
    amenities: [String!]!
    facilities: [String!]!
    security: [String!]!
    food_diets: [VenueFoodDiet!]!
    food_spice_levels: [VenueFoodSpiceLevel!]!
    food_menu_limit: Int!
    food_image_limit: Int!
    food_price_max: Int!
    food_discount_max_pct: Int!
    "Videos one dish may carry."
    food_video_limit: Int!
    "Videos the venue page may carry."
    venue_video_limit: Int!
    "Tables a venue may print per-table QR stickers for."
    food_table_limit: Int!
    rental_units: [VenueRentalUnit!]!
    rental_item_limit: Int!
    rental_image_limit: Int!
    rental_rate_max: Int!
    rental_deposit_max: Int!
    rental_stock_max: Int!
    rental_per_guest_max: Int!
    rental_terms_max: Int!
  }

  type VenueOperatingHours {
    open: String!
    close: String!
  }

  type VenueRules {
    buffer_minutes: Int!
    min_notice_minutes: Int!
    max_advance_days: Int!
    max_bookings_per_slot: Int!
    allow_instant_booking: Boolean!
    allow_waitlist: Boolean!
    booking_approval_required: Boolean!
    allow_multiple_bookings: Boolean!
  }

  type VenueAutoExtend {
    enabled: Boolean!
    template_id: ID
    horizon_days: Int!
    until: String!
  }

  enum VenueCancellationChargeType {
    PERCENT
    AMOUNT
  }

  "One band of a venue's cancellation policy — cancelling INSIDE hours_before of the slot start costs this much."
  type VenueCancellationTier {
    "Hours before the slot start this band covers. The tightest matching band wins."
    hours_before: Int!
    charge_type: VenueCancellationChargeType!
    "A percent of the slot price (0-100), or a flat amount."
    value: Float!
  }

  "One refund band of the venue's auto-cancellation ladder — a pod cancelled with MORE than hours_before hours still to run refunds this share of the ticket money."
  type VenueCancellationRefundTier {
    "Notice, in hours, this band needs. The widest matching band wins, so more notice never refunds less."
    hours_before: Int!
    "Share of the attendee's ticket money returned (0-100)."
    refund_pct: Float!
  }

  "What a venue owner charges for a late cancellation, or whether they take one at all."
  type VenueCancellationPolicy {
    "Bookings may only be rescheduled, never cancelled. The bands do not apply while this is on."
    reschedule_only: Boolean!
    "Ordered widest window first."
    tiers: [VenueCancellationTier!]!
    "Hours before a pod starts within which a pod at this venue is auto-cancelled while its finance stays negative against the venue's potential earnings. Defaults to 6."
    trigger_hours: Int!
    "The refund every enrolled attendee gets when that auto-cancel fires, widest window first. Empty refunds in full."
    refund_tiers: [VenueCancellationRefundTier!]!
  }

  type VenueSettings {
    operating_hours: VenueOperatingHours!
    weekly_off_days: [Int!]!
    holidays: [String!]!
    rules: VenueRules!
    auto_extend: VenueAutoExtend!
    cancellation: VenueCancellationPolicy!
  }

  input VenueOperatingHoursInput {
    open: String!
    close: String!
  }

  input VenueRulesInput {
    buffer_minutes: Int
    min_notice_minutes: Int
    max_advance_days: Int
    max_bookings_per_slot: Int
    allow_instant_booking: Boolean
    allow_waitlist: Boolean
    booking_approval_required: Boolean
    allow_multiple_bookings: Boolean
  }

  input VenueAutoExtendInput {
    enabled: Boolean
    template_id: ID
    horizon_days: Int
    until: String
  }

  input VenueCancellationTierInput {
    hours_before: Int!
    charge_type: VenueCancellationChargeType!
    value: Float!
  }

  input VenueCancellationRefundTierInput {
    hours_before: Int!
    refund_pct: Float!
  }

  input VenueCancellationPolicyInput {
    reschedule_only: Boolean
    tiers: [VenueCancellationTierInput!]
    trigger_hours: Int
    refund_tiers: [VenueCancellationRefundTierInput!]
  }

  input VenueSettingsInput {
    operating_hours: VenueOperatingHoursInput
    weekly_off_days: [Int!]
    holidays: [String!]
    rules: VenueRulesInput
    auto_extend: VenueAutoExtendInput
    cancellation: VenueCancellationPolicyInput
  }

  type Venue {
    id: ID!
    owner_user_id: ID!
    venue_name: String!
    venue_type: String!
    capacity: Int!
    capacity_items: [VenueCapacityItem!]!
    "The venue serves food. On publicVenue the menu is empty unless this is on."
    offers_food: Boolean!
    food_menu: [VenueFoodItem!]!
    food_ordering: VenueFoodOrdering!
    food_licences: VenueFoodLicences!
    "The venue's table labels, one per-table QR sticker each. Always empty on publicVenue."
    food_tables: [String!]!
    "The venue rents items out. On publicVenue the list is empty unless this is on, and shows available items only."
    offers_rentals: Boolean!
    rental_items: [VenueRentalItem!]!
    "The venue's own rental terms (rich-text HTML), shown to guests with Duncit's."
    rental_terms_html: String!
    "Whether a refundable deposit is taxed with the rent. Set in the Venues console."
    rental_deposit_gst: Boolean!
    "Every category the venue belongs to, primary first. Empty only while the venue has none."
    venue_categories: [VenueCategory!]!
    "The primary category — always venue_categories[0]. Kept for clients that read one."
    venue_category: VenueCategory!
    "Super/Category/Sub the owner picked in the venue onboarding survey (from their OnboardingMeeting). Pre-fills Edit Venue when the venue has none; null when there is no survey scope."
    survey_category: VenueCategory
    description: String!
    amenities: [String!]!
    facilities: [String!]!
    security: [String!]!
    cover_image_url: String!
    gallery: [String!]!
    "Venue videos: uploaded clips or YouTube video links."
    videos: [String!]!
    location_id: ID
    country: String!
    country_code: String!
    address_line1: String!
    address_line2: String!
    city: String!
    state: String!
    state_code: String!
    locality: String!
    postal_code: String!
    lat: Float
    lng: Float
    documents: [VenueDocument!]!
    gstin: String!
    pan: String!
    bank_account: BankAccountVerification!
    owner_name: String!
    owner_email: String!
    owner_phone: String!
    owner_dob: String
    owner_address: String!
    tags: [String!]!
    venue_share_pct: Float!
    venue_commission_pct: Float!
    "Admin-set cap on monthly host Pod Requests; null = the default of 10."
    host_requests_limit_override: Int
    settings: VenueSettings!
    step_completed: Int!
    "Permanent human id (VEN-000001) — Onboarded Venues table."
    venue_no: String
    status: VenueStatus!
    is_active: Boolean!
    "Count of live (non-deleted) pods hosted at this venue (resolved)."
    pod_count: Int!
    reviewer_notes: String!
    submitted_at: String
    approved_at: String
    rejected_at: String
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (venuesTable / myVenuesTable)."
  type VenueTablePage {
    rows: [Venue!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input VenueStep1Input {
    venue_name: String!
    venue_type: String!
    capacity: Int!
    capacity_items: [VenueCapacityItemInput!]
    offers_food: Boolean
    food_menu: [VenueFoodItemInput!]
    food_ordering: VenueFoodOrderingInput
    food_licences: VenueFoodLicencesInput
    "The venue's table labels (at most venueRegistrationConfig.food_table_limit). Omitted keeps the stored list."
    food_tables: [String!]
    offers_rentals: Boolean
    "The whole list of rented items (at most venueRegistrationConfig.rental_item_limit). Omitted keeps the stored list."
    rental_items: [VenueRentalItemInput!]
    "The venue's own rental terms (rich-text HTML). Omitted keeps the stored terms."
    rental_terms_html: String
    """
    Every category the venue belongs to, primary first (at most
    venueRegistrationConfig.category_limit; a repeated sub category is dropped).
    Wins over venue_category when both are sent. Omitted or empty leaves the
    venue's categories to venue_category.
    """
    venue_categories: [VenueCategoryInput!]
    "Single-category clients: the primary. Ignored when venue_categories is sent."
    venue_category: VenueCategoryInput
    description: String
    amenities: [String!]
    facilities: [String!]
    security: [String!]
    cover_image_url: String
    gallery: [String!]
    "At most venueRegistrationConfig.venue_video_limit YouTube video links or uploaded clips. Omitted keeps the stored list."
    videos: [String!]
    location_id: ID
    country: String
    country_code: String
    address_line1: String!
    address_line2: String
    city: String!
    state: String!
    state_code: String
    locality: String
    postal_code: String!
    lat: Float
    lng: Float
    tags: [String!]
  }

  input VenueStep2Input {
    documents: [VenueDocumentInput!]!
    gstin: String
    pan: String
  }

  input VenueStep3Input {
    owner_name: String!
    owner_email: String!
    owner_phone: String!
    owner_dob: String
    owner_address: String
    bank_account: BankAccountVerificationInput
  }

  """
  The only fields an owner may change on an APPROVED venue: description,
  images, capacity list, food menu and ordering, owner contact details, and appended (never replaced)
  documents. Everything else is locked after approval.
  """
  input UpdateApprovedVenueInput {
    description: String
    cover_image_url: String
    gallery: [String!]
    "Omitted keeps the stored list."
    videos: [String!]
    capacity_items: [VenueCapacityItemInput!]
    offers_food: Boolean
    food_menu: [VenueFoodItemInput!]
    food_ordering: VenueFoodOrderingInput
    food_licences: VenueFoodLicencesInput
    "Omitted keeps the stored list."
    food_tables: [String!]
    offers_rentals: Boolean
    "Omitted keeps the stored list."
    rental_items: [VenueRentalItemInput!]
    "The venue's own rental terms (rich-text HTML). Omitted keeps the stored terms."
    rental_terms_html: String
    """
    The venue's GST number, printed on its food invoices. Accepted only while the
    venue has none: once one is saved, only the venues console (adminUpdateVenue)
    may change it. Sending the saved number again is a no-op; empty is ignored.
    """
    gstin: String
    add_documents: [VenueDocumentInput!]
    owner_name: String
    owner_phone: String
    owner_dob: String
    owner_address: String
  }

  "Derived lifecycle bucket of a pod at a venue."
  enum VenuePodBucket {
    UPCOMING
    ONGOING
    COMPLETED
    CANCELLED
  }

  "One pod booked at a venue the caller owns (Partners → Venues → Pods)."
  type VenuePod {
    id: ID!
    pod_slug: String!
    pod_title: String!
    pod_date_time: String!
    pod_end_date_time: String
    pod_amount: Int!
    pod_type: PodType!
    no_of_spots: Int!
    attendee_count: Int!
    "Attendee user ids — resolve names via publicUsersByIds."
    pod_attendees: [ID!]!
    host_names: [String!]!
    venue_id: ID!
    venue_name: String!
    bucket: VenuePodBucket!
    is_active: Boolean!
    completed_at: String
    "Set when the pod was cancelled (soft-deleted)."
    cancelled_at: String
    created_at: String!
  }


  "Roll-up figures for exactly the venuePods scope, over every pod in it."
  type VenuePodSummary {
    "Venues the figures cover."
    scope_count: Int!
    total: Int!
    upcoming: Int!
    ongoing: Int!
    completed: Int!
    cancelled: Int!
    total_spots: Int!
    filled_spots: Int!
    total_attendees: Int!
    fill_rate: Float!
    next_pod_date_time: String
    total_revenue: Float!
    currency_symbol: String!
  }

  "Outcome of a venue owner cancelling a pod booked at their venue."
  type VenueCancelPodResult {
    "The cancelled pod's id."
    pod_id: ID!
    "Account Health points deducted from the venue for this cancellation."
    health_penalty: Int!
    "The venue's Account Health score after the deduction."
    venue_health_score: Int!
    "Attendee payments refunded by this cancellation."
    refunded_count: Int!
  }

  extend type Query {
    "Without venue_id: the owner's current application. With venue_id: that venue (must be the owner's)."
    myVenue(venue_id: ID): Venue
    myVenues: [Venue!]!
    "Pods at the caller's venues, all states incl. cancelled. venue_id narrows to one owned venue."
    venuePods(venue_id: ID): [VenuePod!]!
    """
    Header figures for Venue Studio, over EVERY approved booking at the caller's
    venues — the list is capped at 500 rows, these numbers are not.
    """
    venuePodsSummary(venue_id: ID): VenuePodSummary!
    "Owner-scoped table page over the caller's venues (shared table engine)."
    myVenuesTable(query: TableQueryInput): VenueTablePage!
    venues(status: VenueStatus): [Venue!]!
    "Admin/onboarding table page over all venues (shared table engine)."
    venuesTable(query: TableQueryInput): VenueTablePage!
    venue(venue_doc_id: ID!): Venue
    "APPROVED, active venues for the consumer Venues page — optionally scoped to a location, with server-side search + Super→Cat→Sub category filter (a venue matches when ANY one of its categories carries every level given). No args = every public venue (legacy callers)."
    publicVenues(location_id: ID, search: String, super_category_id: ID, category_id: ID, sub_category_id: ID): [Venue!]!
    "Public single-venue detail (APPROVED + active only)."
    publicVenue(venue_id: ID!): Venue
    "APPROVED, active venues that auto-match a club by location (+ locality) + Super/Sub category on ANY of the venue's categories (admin Club form). Empty when no location is given."
    matchingVenues(location_id: ID!, locality: String, super_category_id: ID, category_id: ID): [Venue!]!
    venueRegistrationConfig: VenueRegistrationConfig!
  }

  extend type Mutation {
    "venue_id targets a specific editable (DRAFT/REJECTED) venue of the owner; omitted = current draft (created if needed)."
    submitVenueStep1(input: VenueStep1Input!, venue_id: ID): Venue!
    submitVenueStep2(input: VenueStep2Input!, venue_id: ID): Venue!
    submitVenueStep3(input: VenueStep3Input!, venue_id: ID): Venue!
    submitVenueFinal(venue_id: ID): Venue!
    "Owner edits the editable subset of an APPROVED venue (documents append-only)."
    updateApprovedVenue(venue_id: ID!, input: UpdateApprovedVenueInput!): Venue!
    approveVenue(venue_doc_id: ID!, notes: String, tags: [String!]): Venue!
    rejectVenue(venue_doc_id: ID!, notes: String!): Venue!
    adminCreateVenue(
      owner_user_id: ID!
      step1: VenueStep1Input!
      step2: VenueStep2Input!
      step3: VenueStep3Input!
      submit: Boolean
    ): Venue!
    adminUpdateVenue(
      venue_doc_id: ID!
      step1: VenueStep1Input!
      step2: VenueStep2Input!
      step3: VenueStep3Input!
      status: VenueStatus
    ): Venue!
    setVenueActive(venue_doc_id: ID!, active: Boolean!): Venue!
    setVenueDeductions(venue_doc_id: ID!, venue_share_pct: Float!, venue_commission_pct: Float!): Venue!
    "Admin-only: the venue's monthly host Pod Request limit (null = the default of 10)."
    setVenueHostRequestLimit(venue_doc_id: ID!, limit: Int): Venue!
    "Onboarding review: how long before a pod starts a finance-negative pod at this venue is auto-cancelled, and what its attendees are refunded."
    setVenueCancellationTrigger(venue_doc_id: ID!, trigger_hours: Int!, refund_tiers: [VenueCancellationRefundTierInput!]!): Venue!
    "Owner (or admin) updates operating hours, weekly-off, holidays + booking rules."
    updateVenueSettings(venue_doc_id: ID!, input: VenueSettingsInput!): Venue!
    "Venue owner cancels an UPCOMING pod booked at their venue: refunds every successful attendee payment, emails the audience and deducts the Account Health penalty configured in Admin > Pods > Pod Settings."
    venueCancelPod(pod_id: ID!, reason: String!): VenueCancelPodResult!
    "Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the venue still has live pods/booked slots."
    deleteVenue(venue_doc_id: ID!, email: String!, password: String!): Boolean!
  }
`;
