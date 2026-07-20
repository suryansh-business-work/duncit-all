export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type ActiveUserBucket = {
  __typename?: 'ActiveUserBucket';
  bucket: Scalars['String']['output'];
  unique_devices: Scalars['Int']['output'];
  unique_users: Scalars['Int']['output'];
};

export type ActiveUserStats = {
  __typename?: 'ActiveUserStats';
  buckets: Array<ActiveUserBucket>;
  from: Scalars['String']['output'];
  granularity: AnalyticsGranularity;
  to: Scalars['String']['output'];
  total_unique_devices: Scalars['Int']['output'];
  total_unique_users: Scalars['Int']['output'];
};

/** PLACEMENT = generic advertiser slot; PRODUCT_AD / BRAND_AD = brand promotes a product / storefront. */
export type AdKind =
  | 'BRAND_AD'
  | 'PLACEMENT'
  | 'PRODUCT_AD';

export type AdMediaType =
  | 'IMAGE'
  | 'VIDEO';

/** Where the ad renders in the apps. AUTO is eligible for every position. */
export type AdPosition =
  | 'AUTO'
  | 'CLUB_LIST'
  | 'EXPLORE_SCROLL'
  | 'HOME_BOTTOM'
  | 'POD_DETAILS'
  | 'POD_LIST'
  | 'SIDEBAR'
  | 'STATUS'
  | 'VENUE_LIST';

/** Per-position per-day pricing, editable by Marketing without code changes. */
export type AdPricing = {
  __typename?: 'AdPricing';
  auto_per_day: Scalars['Float']['output'];
  club_list_per_day: Scalars['Float']['output'];
  currency_symbol: Scalars['String']['output'];
  explore_scroll_per_day: Scalars['Float']['output'];
  home_bottom_per_day: Scalars['Float']['output'];
  pod_details_per_day: Scalars['Float']['output'];
  pod_list_per_day: Scalars['Float']['output'];
  sidebar_per_day: Scalars['Float']['output'];
  status_per_day: Scalars['Float']['output'];
  venue_list_per_day: Scalars['Float']['output'];
};

export type AdRequest = {
  __typename?: 'AdRequest';
  ad_description: Scalars['String']['output'];
  ad_kind: AdKind;
  ad_title: Scalars['String']['output'];
  ad_type: AdMediaType;
  approved_cost?: Maybe<Scalars['Float']['output']>;
  brand_id?: Maybe<Scalars['ID']['output']>;
  brand_name?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  duration_days: Scalars['Int']['output'];
  end_at: Scalars['String']['output'];
  estimated_cost: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  marketing_remarks?: Maybe<Scalars['String']['output']>;
  media_url: Scalars['String']['output'];
  position: AdPosition;
  product_id?: Maybe<Scalars['ID']['output']>;
  product_image?: Maybe<Scalars['String']['output']>;
  product_name?: Maybe<Scalars['String']['output']>;
  redirect_url?: Maybe<Scalars['String']['output']>;
  reviewed_at?: Maybe<Scalars['String']['output']>;
  start_at: Scalars['String']['output'];
  status: AdRequestStatus;
  submitted_by: Scalars['ID']['output'];
  submitted_by_name: Scalars['String']['output'];
  target_audience?: Maybe<Scalars['String']['output']>;
  trace_id: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

/** PENDING/APPROVED/REJECTED are stored; LIVE/EXPIRED derive from the approved ad's date window. */
export type AdRequestStatus =
  | 'APPROVED'
  | 'EXPIRED'
  | 'LIVE'
  | 'PENDING'
  | 'REJECTED';

export type AdRequestTablePage = {
  __typename?: 'AdRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AdRequest>;
  total: Scalars['Int']['output'];
};

export type AddExpenseRefundInput = {
  amount: Scalars['Float']['input'];
  date: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};

export type AddMeetingHolidayInput = {
  date: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<HolidayType>;
};

export type Address = {
  __typename?: 'Address';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  line1?: Maybe<Scalars['String']['output']>;
  line2?: Maybe<Scalars['String']['output']>;
  pincode?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
};

export type AdjustHealthInput = {
  delta: Scalars['Int']['input'];
  remark?: InputMaybe<Scalars['String']['input']>;
  subject_id: Scalars['ID']['input'];
  subject_type: HealthSubjectType;
};

export type AdminContactActionType =
  | 'CALL'
  | 'EMAIL';

export type AdminReferral = {
  __typename?: 'AdminReferral';
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  referred_name?: Maybe<Scalars['String']['output']>;
  referred_user_id: Scalars['ID']['output'];
  referrer_name?: Maybe<Scalars['String']['output']>;
  referrer_user_id: Scalars['ID']['output'];
};

/** Server-side table page for the shared table engine (referralsTable). */
export type AdminReferralTablePage = {
  __typename?: 'AdminReferralTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AdminReferral>;
  total: Scalars['Int']['output'];
};

/** Advertiser KPIs for the Ads portal dashboard. Counts bucket every ad by its DERIVED status. */
export type AdsDashboard = {
  __typename?: 'AdsDashboard';
  /** Approved but not started yet. */
  approved: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  expired: Scalars['Int']['output'];
  live: Scalars['Int']['output'];
  /** Sum of approved costs of the ads that are live right now. */
  live_spend: Scalars['Float']['output'];
  /** Start of the soonest approved ad that has not gone live yet. */
  next_start_at?: Maybe<Scalars['String']['output']>;
  next_start_title?: Maybe<Scalars['String']['output']>;
  pending: Scalars['Int']['output'];
  rejected: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  /** Sum of frozen approved costs across all approved ads (incl. live + expired). */
  total_approved_cost: Scalars['Float']['output'];
  /** Sum of quoted costs across every request. */
  total_estimated_cost: Scalars['Float']['output'];
};

export type AiDummyEntity =
  | 'CLUB'
  | 'INVENTORY_PRODUCT'
  | 'POD';

export type AiLocationAreasInput = {
  city: Scalars['String']['input'];
  country: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type AiMjmlTemplateInput = {
  current_mjml?: InputMaybe<Scalars['String']['input']>;
  prompt: Scalars['String']['input'];
};

export type AiProductDescribeInput = {
  brand_name?: InputMaybe<Scalars['String']['input']>;
  product_name: Scalars['String']['input'];
  product_type?: InputMaybe<Scalars['String']['input']>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  tone?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A reusable prompt in the AI Prompt Library. `token_count` is derived from
 * `content` on every read, so it stays in sync with edits.
 */
export type AiPrompt = {
  __typename?: 'AiPrompt';
  category: Scalars['String']['output'];
  content: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  created_by?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  target_model: Scalars['String']['output'];
  token_count: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type AiPromptFilter = {
  category?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AnalyticsGranularity =
  | 'DAY'
  | 'MONTH'
  | 'WEEK';

/** A developer API key for the public venue REST API. Only a hash is stored. */
export type ApiKey = {
  __typename?: 'ApiKey';
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** First characters of the raw key, for display — the full key is never stored. */
  key_prefix: Scalars['String']['output'];
  last_used_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  owner_user_id: Scalars['ID']['output'];
  revoked_at?: Maybe<Scalars['String']['output']>;
  scopes: Array<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (myApiKeysTable). */
export type ApiKeyTablePage = {
  __typename?: 'ApiKeyTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ApiKey>;
  total: Scalars['Int']['output'];
};

export type AppAnalyticsEvent = {
  __typename?: 'AppAnalyticsEvent';
  checkout_url: Scalars['String']['output'];
  client_event_id: Scalars['String']['output'];
  device_id: Scalars['String']['output'];
  event_type: AppAnalyticsEventType;
  id: Scalars['ID']['output'];
  metadata_json: Scalars['String']['output'];
  occurred_at: Scalars['String']['output'];
  path: Scalars['String']['output'];
  pod_id?: Maybe<Scalars['ID']['output']>;
  route: Scalars['String']['output'];
  super_category_slug?: Maybe<Scalars['String']['output']>;
  target_href: Scalars['String']['output'];
  target_label: Scalars['String']['output'];
  target_role: Scalars['String']['output'];
  target_tag: Scalars['String']['output'];
  target_text: Scalars['String']['output'];
  title: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type AppAnalyticsEventType =
  | 'CLICK'
  | 'IMPRESSION'
  | 'PAGE_VIEW'
  | 'TOUCH';

export type AppReleaseCommitInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  hash: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};

export type AppReleaseEmailResult = {
  __typename?: 'AppReleaseEmailResult';
  changelog_html?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  message_id?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  recipients: Array<Scalars['String']['output']>;
};

export type AppSettings = {
  __typename?: 'AppSettings';
  date_format: Scalars['String']['output'];
  /** Days a Create-Pod draft is kept (from last save) before auto-deletion. */
  draft_retention_days: Scalars['Int']['output'];
  jwt_expires_in?: Maybe<Scalars['String']['output']>;
  jwt_no_expiry: Scalars['Boolean']['output'];
  /** Latest allowed signup birth year (inclusive). */
  max_birth_year: Scalars['Int']['output'];
  /** Earliest allowed signup birth year (inclusive). */
  min_birth_year: Scalars['Int']['output'];
  time_format: Scalars['String']['output'];
  /** IANA timezone (e.g. Asia/Kolkata) used to display all dates & times. */
  time_zone: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type AppVersionInfo = {
  __typename?: 'AppVersionInfo';
  android_store_url: Scalars['String']['output'];
  ios_store_url: Scalars['String']['output'];
  latest_version: Scalars['String']['output'];
};

/** A single label → value row the admin inbox renders (survey answers, feedback…). */
export type ApprovalDetail = {
  __typename?: 'ApprovalDetail';
  label: Scalars['String']['output'];
  value?: Maybe<Scalars['String']['output']>;
};

/** A proposed label → value change row shown to the reviewer. */
export type ApprovalDetailInput = {
  label: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

/** A request raised by a portal for the Admin console to approve or deny. */
export type ApprovalRequest = {
  __typename?: 'ApprovalRequest';
  created_at?: Maybe<Scalars['String']['output']>;
  details: Array<ApprovalDetail>;
  id: Scalars['ID']['output'];
  kind?: Maybe<SurveyKind>;
  meeting_id?: Maybe<Scalars['ID']['output']>;
  payload?: Maybe<Scalars['String']['output']>;
  requested_by_name?: Maybe<Scalars['String']['output']>;
  review_notes?: Maybe<Scalars['String']['output']>;
  reviewed_at?: Maybe<Scalars['String']['output']>;
  reviewed_by_name?: Maybe<Scalars['String']['output']>;
  source_portal?: Maybe<Scalars['String']['output']>;
  status: ApprovalStatus;
  subject_email?: Maybe<Scalars['String']['output']>;
  subject_name?: Maybe<Scalars['String']['output']>;
  subject_phone?: Maybe<Scalars['String']['output']>;
  subject_user_id?: Maybe<Scalars['ID']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  /** Ecomm change-request: the target brand/product id + JSON payload of proposed changes. */
  target_id?: Maybe<Scalars['ID']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (approvalRequestsTable). */
export type ApprovalRequestTablePage = {
  __typename?: 'ApprovalRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ApprovalRequest>;
  total: Scalars['Int']['output'];
};

export type ApprovalStatus =
  | 'APPROVED'
  | 'DENIED'
  | 'PENDING';

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type AuthProvider =
  | 'EMAIL'
  | 'GOOGLE';

/** A member who has backed out of a pod — powers the Finance 'Backout Refunds' list + detail. */
export type BackoutRefundRequest = {
  __typename?: 'BackoutRefundRequest';
  backed_out_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joined_at: Scalars['String']['output'];
  payment_amount?: Maybe<Scalars['Float']['output']>;
  payment_currency?: Maybe<Scalars['String']['output']>;
  payment_id?: Maybe<Scalars['ID']['output']>;
  payment_status?: Maybe<Scalars['String']['output']>;
  pod?: Maybe<Pod>;
  pod_id: Scalars['ID']['output'];
  refund_status: RefundStatus;
  refund_threshold_pct: Scalars['Int']['output'];
  status: MembershipStatus;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  user_name?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (backoutRefundRequestsTable). */
export type BackoutRefundRequestTablePage = {
  __typename?: 'BackoutRefundRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<BackoutRefundRequest>;
  total: Scalars['Int']['output'];
};

export type Badge = {
  __typename?: 'Badge';
  badge_id: Scalars['String']['output'];
  condition_type: BadgeConditionType;
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  threshold: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type BadgeConditionType =
  | 'CLUB_JOIN_COUNT'
  | 'MANUAL'
  | 'POD_HOST_COUNT'
  | 'POD_JOIN_COUNT'
  | 'POD_REFERRAL_COUNT';

export type BankAccountVerification = {
  __typename?: 'BankAccountVerification';
  account_holder_name: Scalars['String']['output'];
  account_number: Scalars['String']['output'];
  ifsc_code: Scalars['String']['output'];
  payout_method?: Maybe<BankPayoutMethod>;
  upi_id: Scalars['String']['output'];
};

export type BankAccountVerificationInput = {
  account_holder_name?: InputMaybe<Scalars['String']['input']>;
  account_number?: InputMaybe<Scalars['String']['input']>;
  ifsc_code?: InputMaybe<Scalars['String']['input']>;
  payout_method?: InputMaybe<BankPayoutMethod>;
  upi_id?: InputMaybe<Scalars['String']['input']>;
};

export type BankPayoutMethod =
  | 'IMPS'
  | 'NEFT'
  | 'UPI';

/** Structured billing block snapshotted on a payment (drives the invoice bill-to). */
export type BillingDetails = {
  __typename?: 'BillingDetails';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  email: Scalars['String']['output'];
  gstin: Scalars['String']['output'];
  landmark: Scalars['String']['output'];
  line1: Scalars['String']['output'];
  line2: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  pincode: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

export type BouncerActor = {
  __typename?: 'BouncerActor';
  avatar_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
};

export type BouncerCallbackRequest = {
  __typename?: 'BouncerCallbackRequest';
  /** How the call concluded, recorded by the agent. */
  conclusion?: Maybe<Scalars['String']['output']>;
  contact_phone: Scalars['String']['output'];
  contacted_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  /** Call length in seconds, recorded by the agent. */
  duration_seconds?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  pod?: Maybe<BouncerPodInfo>;
  reason: Scalars['String']['output'];
  status: BouncerCallbackStatus;
  /** Human-readable reference, e.g. CB-A1B2C3. */
  ticket_no: Scalars['String']['output'];
  user: BouncerActor;
};

/** A page of callback requests for the agent list (server-side pagination + sort + search). */
export type BouncerCallbackRequestPage = {
  __typename?: 'BouncerCallbackRequestPage';
  items: Array<BouncerCallbackRequest>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type BouncerCallbackStatus =
  | 'CLOSED'
  | 'CONTACTED'
  | 'PENDING';

export type BouncerFeedback = {
  __typename?: 'BouncerFeedback';
  category: BouncerFeedbackCategory;
  created_at: Scalars['String']['output'];
  host?: Maybe<BouncerActor>;
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  pod: BouncerPodInfo;
  rating: Scalars['Int']['output'];
  user: BouncerActor;
};

export type BouncerFeedbackCategory =
  | 'FOOD'
  | 'HOST'
  | 'OTHER'
  | 'SAFETY'
  | 'VENUE';

export type BouncerGeo = {
  __typename?: 'BouncerGeo';
  accuracy?: Maybe<Scalars['Float']['output']>;
  lat: Scalars['Float']['output'];
  lng: Scalars['Float']['output'];
};

export type BouncerGeoInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>;
  lat: Scalars['Float']['input'];
  lng: Scalars['Float']['input'];
};

export type BouncerPodInfo = {
  __typename?: 'BouncerPodInfo';
  club_id?: Maybe<Scalars['ID']['output']>;
  club_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  starts_at?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  venue_id?: Maybe<Scalars['ID']['output']>;
  venue_name?: Maybe<Scalars['String']['output']>;
};

export type BouncerSosAlert = {
  __typename?: 'BouncerSosAlert';
  acknowledged_at?: Maybe<Scalars['String']['output']>;
  acknowledged_by_id?: Maybe<Scalars['ID']['output']>;
  contact_phone: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  host?: Maybe<BouncerActor>;
  id: Scalars['ID']['output'];
  location?: Maybe<BouncerGeo>;
  message: Scalars['String']['output'];
  pod: BouncerPodInfo;
  resolved_at?: Maybe<Scalars['String']['output']>;
  status: BouncerSosStatus;
  /** Human-readable reference, e.g. SOS-A1B2C3. */
  ticket_no: Scalars['String']['output'];
  user: BouncerActor;
};

/** A page of SOS alerts for the agent list (server-side pagination + sort + search). */
export type BouncerSosAlertPage = {
  __typename?: 'BouncerSosAlertPage';
  items: Array<BouncerSosAlert>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type BouncerSosStatus =
  | 'ACKNOWLEDGED'
  | 'ACTIVE'
  | 'RESOLVED';

export type BouncerSupportTarget = {
  __typename?: 'BouncerSupportTarget';
  available: Scalars['Boolean']['output'];
  phone: Scalars['String']['output'];
};

export type BrandPickupLocation = {
  __typename?: 'BrandPickupLocation';
  address_line1: Scalars['String']['output'];
  address_line2: Scalars['String']['output'];
  brand_id?: Maybe<Scalars['ID']['output']>;
  city: Scalars['String']['output'];
  contact_name: Scalars['String']['output'];
  country: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_default: Scalars['Boolean']['output'];
  nickname: Scalars['String']['output'];
  owner_kind: PickupOwnerKind;
  phone: Scalars['String']['output'];
  pincode: Scalars['String']['output'];
  shiprocket_pickup_id: Scalars['String']['output'];
  shiprocket_registered: Scalars['Boolean']['output'];
  state: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type BrandPickupLocationInput = {
  address_line1?: InputMaybe<Scalars['String']['input']>;
  address_line2?: InputMaybe<Scalars['String']['input']>;
  brand_id?: InputMaybe<Scalars['ID']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  contact_name?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  nickname: Scalars['String']['input'];
  owner_kind: PickupOwnerKind;
  phone?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
};

export type Branding = {
  __typename?: 'Branding';
  android_app_url: Scalars['String']['output'];
  app_latest_version: Scalars['String']['output'];
  app_name: Scalars['String']['output'];
  home_all_vibe_icon_url: Scalars['String']['output'];
  home_header_tagline: Scalars['String']['output'];
  ios_app_url: Scalars['String']['output'];
  logo_url: Scalars['String']['output'];
  mobile_favicon_url: Scalars['String']['output'];
  mobile_font_family: Scalars['String']['output'];
  mobile_logo_url: Scalars['String']['output'];
  mobile_splash_type: Scalars['String']['output'];
  mobile_splash_url: Scalars['String']['output'];
  mweb_favicon_url: Scalars['String']['output'];
  mweb_font_family: Scalars['String']['output'];
  mweb_logo_url: Scalars['String']['output'];
  mweb_splash_type: Scalars['String']['output'];
  mweb_splash_url: Scalars['String']['output'];
  portals_favicon_url: Scalars['String']['output'];
  portals_font_family: Scalars['String']['output'];
  portals_logo_url: Scalars['String']['output'];
  portals_splash_type: Scalars['String']['output'];
  portals_splash_url: Scalars['String']['output'];
  primary_color: Scalars['String']['output'];
  support_email: Scalars['String']['output'];
  support_phone: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  venues_card_video_url: Scalars['String']['output'];
  website_favicon_url: Scalars['String']['output'];
  website_footer_logo_url: Scalars['String']['output'];
  website_header_logo_url: Scalars['String']['output'];
};

export type BulkCreateVenueSlotsInput = {
  slots: Array<CreateVenueSlotInput>;
  venue_id: Scalars['ID']['input'];
};

/** Filter for bulk slot ops — only non-booked slots; from defaults to now so history is never touched. */
export type BulkDeleteVenueSlotsInput = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
  weekdays?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type BulkSlotResult = {
  __typename?: 'BulkSlotResult';
  affected: Scalars['Int']['output'];
  matched: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

export type BulkUpdateVenueSlotsInput = {
  block?: InputMaybe<Scalars['Boolean']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  set_duration_minutes?: InputMaybe<Scalars['Int']['input']>;
  set_price?: InputMaybe<Scalars['Int']['input']>;
  shift_minutes?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
  weekdays?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type Category = {
  __typename?: 'Category';
  /** SUB level only: may a host invite co-hosts to a pod in this sub-category? */
  allow_co_hosts: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_system: Scalars['Boolean']['output'];
  level: CategoryLevel;
  /** SUB level only: how many co-hosts one pod may carry (1-5). */
  max_co_hosts: Scalars['Int']['output'];
  media: Array<CategoryMedia>;
  name: Scalars['String']['output'];
  parent_id?: Maybe<Scalars['ID']['output']>;
  slug: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
};

export type CategoryFilterInput = {
  level?: InputMaybe<CategoryLevel>;
  parent_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type CategoryLevel =
  | 'CATEGORY'
  | 'SUB'
  | 'SUPER';

export type CategoryMedia = {
  __typename?: 'CategoryMedia';
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

export type CategoryMediaInput = {
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

export type CategoryMediaType =
  | 'IMAGE'
  | 'VIDEO';

/** A challenge scoped to the Super → Category → Sub category hierarchy. */
export type Challenge = {
  __typename?: 'Challenge';
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name?: Maybe<Scalars['String']['output']>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
};

/** Dashboard counters for the Challenges console. */
export type ChallengeStats = {
  __typename?: 'ChallengeStats';
  active: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (challengesTable). */
export type ChallengeTablePage = {
  __typename?: 'ChallengeTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Challenge>;
  total: Scalars['Int']['output'];
};

export type ChangePasswordInput = {
  new_password: Scalars['String']['input'];
  otp: Scalars['String']['input'];
};

export type ChatRoom = {
  __typename?: 'ChatRoom';
  club_id?: Maybe<Scalars['ID']['output']>;
  cover_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  no_of_spots?: Maybe<Scalars['Int']['output']>;
  pod_attendees: Array<Scalars['ID']['output']>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  pod_title: Scalars['String']['output'];
};

export type CheckInEventTicketInput = {
  ticket_doc_id?: InputMaybe<Scalars['ID']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
};

/** Structured billing address entered at checkout (may differ from the main address). */
export type CheckoutBillingInput = {
  city: Scalars['String']['input'];
  country?: InputMaybe<Scalars['String']['input']>;
  /** Billing contact email — may differ from the main contact email; both print on the invoice. */
  email?: InputMaybe<Scalars['String']['input']>;
  gstin?: InputMaybe<Scalars['String']['input']>;
  landmark?: InputMaybe<Scalars['String']['input']>;
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  pincode: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type CheckoutProductSelectionInput = {
  /** Optional per-product fulfilment override; falls back to the checkout-level method. */
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  product_id: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type CheckoutQuote = {
  __typename?: 'CheckoutQuote';
  currency_symbol: Scalars['String']['output'];
  dummy_mode: Scalars['Boolean']['output'];
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  platform_fee_amount: Scalars['Float']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

export type CheckoutQuoteInput = {
  amount: Scalars['Float']['input'];
  pod_id?: InputMaybe<Scalars['ID']['input']>;
};

export type Club = {
  __typename?: 'Club';
  /** Users who administer this club (assigned by an admin) — the CLUB_ADMIN scope. */
  admin_user_ids: Array<Scalars['ID']['output']>;
  category_id?: Maybe<Scalars['ID']['output']>;
  /** Resolved profiles of the club's assigned admins. */
  club_admins: Array<ClubActor>;
  club_description?: Maybe<Scalars['String']['output']>;
  club_feature_images_and_videos: Array<ClubMedia>;
  club_id: Scalars['String']['output'];
  club_moments: Array<ClubMedia>;
  club_name: Scalars['String']['output'];
  club_whats_app_announcement_link?: Maybe<Scalars['String']['output']>;
  club_whats_app_community_link?: Maybe<Scalars['String']['output']>;
  club_whats_app_group_link?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  faqs: Array<ClubFaq>;
  /** How many users follow this club. */
  followers_count: Scalars['Int']['output'];
  /** Hosts explicitly linked by an admin (Bug 5). */
  host_ids: Array<Scalars['ID']['output']>;
  /** Resolved host profiles — linked hosts, or the hosts of the club's pods as a fallback. */
  hosts: Array<ClubActor>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  /** Verified badge for official clubs (explore item 15). */
  is_verified: Scalars['Boolean']['output'];
  /** Optional locality/zone within the club's city. */
  locality: Scalars['String']['output'];
  /** City the club operates in (ref Location). */
  location_id?: Maybe<Scalars['ID']['output']>;
  /** APPROVED, active venues that match this club by location + Super/Sub category. */
  matched_venues: Array<Venue>;
  /** How many venues auto-match this club (location + category). */
  matched_venues_count: Scalars['Int']['output'];
  /** Deprecated hand-picked venue links; venues now auto-match by location + category. */
  meetup_venues_id: Array<Scalars['String']['output']>;
  perks: Array<Scalars['String']['output']>;
  /** Average star rating (1-5) across all user ratings. 0 when no ratings yet. */
  rating: Scalars['Float']['output'];
  /** Total number of user ratings submitted. */
  ratings_count: Scalars['Int']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  updated_at: Scalars['String']['output'];
  values: Array<Scalars['String']['output']>;
  what_we_do: Array<Scalars['String']['output']>;
  /** Admin-authored Club Detail page content, each rendered as bullets. */
  who_we_are: Array<Scalars['String']['output']>;
};

export type ClubActor = {
  __typename?: 'ClubActor';
  avatar_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Max-info per-club row for the Club Admin 'Your Clubs' table (myAdminClubsTable). */
export type ClubAdminClubInfoRow = {
  __typename?: 'ClubAdminClubInfoRow';
  category?: Maybe<Scalars['String']['output']>;
  club_name: Scalars['String']['output'];
  /** First feature image of the club, for the table thumbnail. */
  cover_image_url?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  followers_count: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_verified: Scalars['Boolean']['output'];
  locality?: Maybe<Scalars['String']['output']>;
  /** City the club operates in (resolved Location label). */
  location_label?: Maybe<Scalars['String']['output']>;
  /** Venues that auto-match the club (location + category). */
  matched_venues_count: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  super_category?: Maybe<Scalars['String']['output']>;
  total_pods: Scalars['Int']['output'];
  /** Active pods dated now or later. */
  upcoming_pods: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (myAdminClubsTable). */
export type ClubAdminClubInfoTablePage = {
  __typename?: 'ClubAdminClubInfoTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ClubAdminClubInfoRow>;
  total: Scalars['Int']['output'];
};

/** Per-club breakdown row on the Club Admin dashboard. */
export type ClubAdminClubRow = {
  __typename?: 'ClubAdminClubRow';
  club_id: Scalars['ID']['output'];
  club_name: Scalars['String']['output'];
  club_slug: Scalars['String']['output'];
  completed_pods: Scalars['Int']['output'];
  followers: Scalars['Int']['output'];
  rating: Scalars['Float']['output'];
  revenue: Scalars['Float']['output'];
  total_pods: Scalars['Int']['output'];
  upcoming_pods: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (clubAdminDashboardTable). */
export type ClubAdminClubRowTablePage = {
  __typename?: 'ClubAdminClubRowTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ClubAdminClubRow>;
  total: Scalars['Int']['output'];
};

export type ClubAdminClubsPage = {
  __typename?: 'ClubAdminClubsPage';
  items: Array<Club>;
  total: Scalars['Int']['output'];
};

export type ClubAdminDashboard = {
  __typename?: 'ClubAdminDashboard';
  clubs: Array<ClubAdminClubRow>;
  kpis: ClubAdminKpis;
  trend: Array<ClubAdminTrendPoint>;
};

/** A host a Club Admin can assign to a pod (approved hosts only). */
export type ClubAdminHostOption = {
  __typename?: 'ClubAdminHostOption';
  email?: Maybe<Scalars['String']['output']>;
  full_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** Headline metrics for a Club Admin across all their assigned clubs. */
export type ClubAdminKpis = {
  __typename?: 'ClubAdminKpis';
  /** Distinct hosts running pods across the clubs. */
  active_hosts: Scalars['Int']['output'];
  assigned_clubs: Scalars['Int']['output'];
  avg_rating: Scalars['Float']['output'];
  /** Backed-out memberships across the clubs' pods. */
  backed_out: Scalars['Int']['output'];
  completed_pods: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  /** Occupancy: attendees / spots (0..1). */
  fill_rate: Scalars['Float']['output'];
  /** New followers within the selected date range. */
  new_followers: Scalars['Int']['output'];
  ratings_count: Scalars['Int']['output'];
  total_attendees: Scalars['Int']['output'];
  /** Confirmed bookings (JOINED memberships) across the clubs' pods. */
  total_bookings: Scalars['Int']['output'];
  total_followers: Scalars['Int']['output'];
  total_pods: Scalars['Int']['output'];
  /** Total collected from SUCCESS payments on the clubs' pods. */
  total_revenue: Scalars['Float']['output'];
  total_spots: Scalars['Int']['output'];
  upcoming_pods: Scalars['Int']['output'];
};

/** One month of the dashboard trend chart. */
export type ClubAdminTrendPoint = {
  __typename?: 'ClubAdminTrendPoint';
  bookings: Scalars['Int']['output'];
  followers: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  pods: Scalars['Int']['output'];
  revenue: Scalars['Float']['output'];
};

export type ClubFaq = {
  __typename?: 'ClubFaq';
  answer: Scalars['String']['output'];
  question: Scalars['String']['output'];
};

export type ClubFaqInput = {
  answer: Scalars['String']['input'];
  question: Scalars['String']['input'];
};

export type ClubFilterInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_verified?: InputMaybe<Scalars['Boolean']['input']>;
  /** Narrow to a locality/zone within the city. */
  locality?: InputMaybe<Scalars['String']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type ClubMedia = {
  __typename?: 'ClubMedia';
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

export type ClubMediaInput = {
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

export type ClubRating = {
  __typename?: 'ClubRating';
  comment?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  stars: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
  user_name?: Maybe<Scalars['String']['output']>;
  user_photo?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (clubsTable). */
export type ClubTablePage = {
  __typename?: 'ClubTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Club>;
  total: Scalars['Int']['output'];
};

/** A host who can be invited as a co-host. Carries ONLY what the picker needs — never onboarding PII. */
export type CoHostCandidate = {
  __typename?: 'CoHostCandidate';
  name: Scalars['String']['output'];
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
};

export type CoHostStatus =
  | 'ACCEPTED'
  | 'DECLINED'
  | 'PENDING';

export type CommsLogEntity =
  | 'ECOMM_LEAD'
  | 'HOST_LEAD'
  | 'VENUE_LEAD';

export type CommsLogTranscriptStatus =
  | 'FAILED'
  | 'NONE'
  | 'PENDING'
  | 'READY';

export type CommsLogType =
  | 'CALL'
  | 'EMAIL';

export type CommsProvider = {
  __typename?: 'CommsProvider';
  config: CommsProviderConfig;
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_default: Scalars['Boolean']['output'];
  last_used_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  type: CommsProviderType;
  updated_at?: Maybe<Scalars['String']['output']>;
};

/**
 * Shared shape for email (SMTP) and call (Twilio) providers. SMTP uses host/
 * port/user/pass/from_address/from_name. Fields that don't apply for a given
 * type are simply ignored — the server only reads the keys relevant to the
 * provider type.
 */
export type CommsProviderConfig = {
  __typename?: 'CommsProviderConfig';
  base_url?: Maybe<Scalars['String']['output']>;
  caller_id?: Maybe<Scalars['String']['output']>;
  from_address?: Maybe<Scalars['String']['output']>;
  from_name?: Maybe<Scalars['String']['output']>;
  has_api_key: Scalars['Boolean']['output'];
  has_password: Scalars['Boolean']['output'];
  host?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  reply_to?: Maybe<Scalars['String']['output']>;
  secure?: Maybe<Scalars['Boolean']['output']>;
  sender_email?: Maybe<Scalars['String']['output']>;
  sender_name?: Maybe<Scalars['String']['output']>;
  user?: Maybe<Scalars['String']['output']>;
};

export type CommsProviderConfigInput = {
  api_key?: InputMaybe<Scalars['String']['input']>;
  base_url?: InputMaybe<Scalars['String']['input']>;
  caller_id?: InputMaybe<Scalars['String']['input']>;
  from_address?: InputMaybe<Scalars['String']['input']>;
  from_name?: InputMaybe<Scalars['String']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
  reply_to?: InputMaybe<Scalars['String']['input']>;
  secure?: InputMaybe<Scalars['Boolean']['input']>;
  sender_email?: InputMaybe<Scalars['String']['input']>;
  sender_name?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<Scalars['String']['input']>;
};

export type CommsProviderFilter = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<CommsProviderType>;
};

export type CommsProviderTestResult = {
  __typename?: 'CommsProviderTestResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

export type CommsProviderType =
  | 'SMTP'
  | 'TWILIO_CALL';

export type CommunicationLog = {
  __typename?: 'CommunicationLog';
  body?: Maybe<Scalars['String']['output']>;
  contact_name?: Maybe<Scalars['String']['output']>;
  contact_value: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  created_by?: Maybe<Scalars['String']['output']>;
  direction: Scalars['String']['output'];
  duration_seconds: Scalars['Int']['output'];
  entity_id: Scalars['ID']['output'];
  entity_type: CommsLogEntity;
  error_message?: Maybe<Scalars['String']['output']>;
  external_id?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  provider_id?: Maybe<Scalars['ID']['output']>;
  provider_name?: Maybe<Scalars['String']['output']>;
  recording_url?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject?: Maybe<Scalars['String']['output']>;
  transcript?: Maybe<Scalars['String']['output']>;
  transcript_status: CommsLogTranscriptStatus;
  type: CommsLogType;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CommunicationLogFilter = {
  entity_id?: InputMaybe<Scalars['ID']['input']>;
  entity_type?: InputMaybe<CommsLogEntity>;
  /**  ISO-8601 inclusive from-date filter.  */
  from_date?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  /**  ISO-8601 exclusive to-date filter.  */
  to_date?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<CommsLogType>;
};

export type CommunicationLogPage = {
  __typename?: 'CommunicationLogPage';
  items: Array<CommunicationLog>;
  total: Scalars['Int']['output'];
};

export type CompletePodInput = {
  bill_url?: InputMaybe<Scalars['String']['input']>;
  evidence_media?: InputMaybe<Array<PaymentReleaseMediaInput>>;
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
  venue_bill_amount: Scalars['Float']['input'];
};

export type ContactStatus =
  | 'ARCHIVED'
  | 'IN_PROGRESS'
  | 'NEW'
  | 'RESOLVED';

export type ContactSubmission = {
  __typename?: 'ContactSubmission';
  attachments: Array<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: ContactStatus;
  subject: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (contactSubmissionsTable). */
export type ContactSubmissionTablePage = {
  __typename?: 'ContactSubmissionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ContactSubmission>;
  total: Scalars['Int']['output'];
};

export type ContactSubmitResult = {
  __typename?: 'ContactSubmitResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

export type Coupon = {
  __typename?: 'Coupon';
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  discount_pct: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  max_uses?: Maybe<Scalars['Int']['output']>;
  min_order_amount: Scalars['Float']['output'];
  per_user_limit?: Maybe<Scalars['Int']['output']>;
  pod?: Maybe<Pod>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  scope: CouponScope;
  updated_at: Scalars['String']['output'];
  used_count: Scalars['Int']['output'];
  valid_from?: Maybe<Scalars['String']['output']>;
  valid_until?: Maybe<Scalars['String']['output']>;
};

export type CouponFilterInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  scope?: InputMaybe<CouponScope>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Result of evaluating a coupon against an order — drives the strikethrough UI. */
export type CouponPreview = {
  __typename?: 'CouponPreview';
  code?: Maybe<Scalars['String']['output']>;
  currency_symbol: Scalars['String']['output'];
  discount_amount: Scalars['Float']['output'];
  discount_pct?: Maybe<Scalars['Float']['output']>;
  final_total: Scalars['Float']['output'];
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  original_total: Scalars['Float']['output'];
};

export type CouponPreviewInput = {
  amount: Scalars['Float']['input'];
  code: Scalars['String']['input'];
  pod_id?: InputMaybe<Scalars['ID']['input']>;
};

export type CouponScope =
  | 'GLOBAL'
  | 'POD';

/** Server-side table page for the shared table engine (couponsTable / couponsForPodTable). */
export type CouponTablePage = {
  __typename?: 'CouponTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Coupon>;
  total: Scalars['Int']['output'];
};

export type CreateAiPromptInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  target_model?: InputMaybe<Scalars['String']['input']>;
};

export type CreateBadgeInput = {
  badge_id?: InputMaybe<Scalars['String']['input']>;
  condition_type: BadgeConditionType;
  description?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateCategoryInput = {
  allow_co_hosts?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  level: CategoryLevel;
  max_co_hosts?: InputMaybe<Scalars['Int']['input']>;
  media?: InputMaybe<Array<CategoryMediaInput>>;
  name: Scalars['String']['input'];
  parent_id?: InputMaybe<Scalars['ID']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateChallengeInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateClubInput = {
  admin_user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  club_description?: InputMaybe<Scalars['String']['input']>;
  club_feature_images_and_videos?: InputMaybe<Array<ClubMediaInput>>;
  club_id?: InputMaybe<Scalars['String']['input']>;
  club_moments?: InputMaybe<Array<ClubMediaInput>>;
  club_name: Scalars['String']['input'];
  club_whats_app_announcement_link?: InputMaybe<Scalars['String']['input']>;
  club_whats_app_community_link?: InputMaybe<Scalars['String']['input']>;
  club_whats_app_group_link?: InputMaybe<Scalars['String']['input']>;
  faqs?: InputMaybe<Array<ClubFaqInput>>;
  host_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_verified?: InputMaybe<Scalars['Boolean']['input']>;
  locality?: InputMaybe<Scalars['String']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  meetup_venues_id?: InputMaybe<Array<Scalars['String']['input']>>;
  perks?: InputMaybe<Array<Scalars['String']['input']>>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
  what_we_do?: InputMaybe<Array<Scalars['String']['input']>>;
  who_we_are?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateCommsProviderInput = {
  config: CommsProviderConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  type: CommsProviderType;
};

export type CreateCouponInput = {
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  discount_pct: Scalars['Float']['input'];
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  max_uses?: InputMaybe<Scalars['Int']['input']>;
  min_order_amount?: InputMaybe<Scalars['Float']['input']>;
  per_user_limit?: InputMaybe<Scalars['Int']['input']>;
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  scope: CouponScope;
  valid_from?: InputMaybe<Scalars['String']['input']>;
  valid_until?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCrmCallPromptInput = {
  context: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateCrmEmailTemplateInput = {
  attachments?: InputMaybe<Array<CrmEmailAssetInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<CrmEmailAssetInput>>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  mjml: Scalars['String']['input'];
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  subject: Scalars['String']['input'];
  target?: InputMaybe<CrmEmailTemplateTarget>;
  variables?: InputMaybe<Array<CrmEmailTemplateVariableInput>>;
};

export type CreateCrmManagedOptionInput = {
  group: CrmManagedOptionGroup;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateCrmReminderInput = {
  assigned_to?: InputMaybe<Scalars['String']['input']>;
  due_at: Scalars['String']['input'];
  entity_type?: InputMaybe<CrmReminderEntity>;
  lead_id?: InputMaybe<Scalars['ID']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateCrmServiceOfferedInput = {
  applies_to_ecomm?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_host?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_venue?: InputMaybe<Scalars['Boolean']['input']>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id: Scalars['ID']['input'];
  titles: Array<Scalars['String']['input']>;
};

export type CreateEmailTemplateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  mjml: Scalars['String']['input'];
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  subject: Scalars['String']['input'];
  variables?: InputMaybe<Array<EmailTemplateVariableInput>>;
};

export type CreateEnvEntryInput = {
  assigned_portals?: InputMaybe<Array<Scalars['String']['input']>>;
  category: EnvCategory;
  config?: InputMaybe<Array<EnvConfigPairInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CreateExpenseInput = {
  amount: Scalars['Float']['input'];
  attachment_url?: InputMaybe<Scalars['String']['input']>;
  category: Scalars['String']['input'];
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  payment_method?: InputMaybe<Scalars['String']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  vendor_name?: InputMaybe<Scalars['String']['input']>;
};

export type CreateFaqInput = {
  answer: Scalars['String']['input'];
  audience?: InputMaybe<FaqAudience>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  partner_topic?: InputMaybe<PartnerFaqTopic>;
  question: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateFeatureFlagInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateInterviewInput = {
  about: Scalars['String']['input'];
  applicant_email: Scalars['String']['input'];
  applicant_name: Scalars['String']['input'];
  applicant_phone: Scalars['String']['input'];
  business_address?: InputMaybe<Scalars['String']['input']>;
  business_name?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  preferred_slots: Array<InterviewSlotInput>;
  type: InterviewType;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLegalDocumentInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  document_type: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateLocationInput = {
  city: Scalars['String']['input'];
  country: Scalars['String']['input'];
  country_code: Scalars['String']['input'];
  location_id?: InputMaybe<Scalars['String']['input']>;
  location_image: Scalars['String']['input'];
  location_name: Scalars['String']['input'];
  location_pincode: Scalars['String']['input'];
  location_zones?: InputMaybe<Array<LocationZoneInput>>;
  state: Scalars['String']['input'];
  state_code: Scalars['String']['input'];
};

export type CreateNotificationInput = {
  body: Scalars['String']['input'];
  image_url?: InputMaybe<Scalars['String']['input']>;
  link_url?: InputMaybe<Scalars['String']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  scope: NotificationScope;
  silent?: InputMaybe<Scalars['Boolean']['input']>;
  target_user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  title: Scalars['String']['input'];
  zone_name?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePaymentReleaseInput = {
  amount_requested: Scalars['Float']['input'];
  bill_url?: InputMaybe<Scalars['String']['input']>;
  evidence_media?: InputMaybe<Array<PaymentReleaseMediaInput>>;
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  kind: PaymentReleaseKind;
  notes?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
};

export type CreatePodIdeaInput = {
  description: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreatePodInput = {
  available_perks?: InputMaybe<Array<Scalars['String']['input']>>;
  club_id: Scalars['ID']['input'];
  /** Users to invite as co-hosts. Capped by the sub-category's max_co_hosts. */
  co_host_user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  meeting_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_platform?: InputMaybe<Scalars['String']['input']>;
  meeting_url?: InputMaybe<Scalars['String']['input']>;
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  payment_terms?: InputMaybe<Scalars['String']['input']>;
  place_charges?: InputMaybe<Array<PodPlaceChargeInput>>;
  pod_amount?: InputMaybe<Scalars['Int']['input']>;
  pod_attendees?: InputMaybe<Array<Scalars['ID']['input']>>;
  pod_date_time: Scalars['String']['input'];
  pod_description: Scalars['String']['input'];
  pod_end_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_hosts_id: Array<Scalars['ID']['input']>;
  pod_id?: InputMaybe<Scalars['String']['input']>;
  pod_images_and_videos?: InputMaybe<Array<PodMediaInput>>;
  pod_info?: InputMaybe<Scalars['String']['input']>;
  pod_mode?: InputMaybe<PodMode>;
  pod_occurrence?: InputMaybe<PodOccurrence>;
  pod_title: Scalars['String']['input'];
  pod_type: PodType;
  product_requests?: InputMaybe<Array<PodProductRequestInput>>;
  products_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  reel_url?: InputMaybe<Scalars['String']['input']>;
  /** The sub-category the host picked in step 2. Required to enforce the co-host cap. */
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
  venue_slot_id?: InputMaybe<Scalars['ID']['input']>;
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
  zone_name?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePolicyInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  slug: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreatePostInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  /** Attach a STORY to a club so it shows on the Club Detail page (Bug 6). */
  club_id?: InputMaybe<Scalars['ID']['input']>;
  image_url: Scalars['String']['input'];
  kind?: InputMaybe<Scalars['String']['input']>;
  media_type?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProductReviewInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  product_id: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateSlotTemplateInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  config: SlotTemplateConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  venue_id?: InputMaybe<Scalars['ID']['input']>;
  visibility?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSurveyInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  kind: SurveyKind;
  questions: Array<SurveyQuestionInput>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTicketInput = {
  attachments?: InputMaybe<Array<Scalars['String']['input']>>;
  body_html?: InputMaybe<Scalars['String']['input']>;
  body_text: Scalars['String']['input'];
  category?: InputMaybe<TicketCategory>;
  /** Attach the pod this ticket is about (from Contact Support on a pod). */
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  pod_title?: InputMaybe<Scalars['String']['input']>;
  subject: Scalars['String']['input'];
};

export type CreateUserInput = {
  assigned_city?: InputMaybe<Scalars['String']['input']>;
  assigned_zones?: InputMaybe<Array<Scalars['String']['input']>>;
  city?: InputMaybe<Scalars['String']['input']>;
  dob: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  first_name: Scalars['String']['input'];
  last_name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
  roles: Array<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateVenueSlotInput = {
  /** Guests this slot holds (defaults to 0). */
  capacity?: InputMaybe<Scalars['Int']['input']>;
  end_at: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  /** The venue space this slot is for ('' = whole venue). Slots in different spaces may share a time. */
  space_label?: InputMaybe<Scalars['String']['input']>;
  start_at: Scalars['String']['input'];
};

export type CreatedApiKey = {
  __typename?: 'CreatedApiKey';
  api_key: ApiKey;
  /** The full key — shown exactly once at creation; it cannot be recovered later. */
  raw_key: Scalars['String']['output'];
};

export type CrmActivity = {
  __typename?: 'CrmActivity';
  body_html?: Maybe<Scalars['String']['output']>;
  body_text?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  created_by?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  target?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

/** Result of placing a CRM call (AI or portal/agent-bridge). */
export type CrmAiCallResult = {
  __typename?: 'CrmAiCallResult';
  external_id?: Maybe<Scalars['String']['output']>;
  log_id?: Maybe<Scalars['ID']['output']>;
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  status?: Maybe<Scalars['String']['output']>;
};

export type CrmAiEntity =
  | 'ECOMM_LEAD'
  | 'HOST_LEAD'
  | 'VENUE_LEAD';

/**
 * A reusable Static Content block for AI Calls. The agent picks one when placing
 * an "AI Call" and the Servam AI speaks in this context.
 */
export type CrmCallPrompt = {
  __typename?: 'CrmCallPrompt';
  context: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  created_by?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  language: Scalars['String']['output'];
  name: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmCallPromptFilter = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (crmCallPromptsTable). */
export type CrmCallPromptTablePage = {
  __typename?: 'CrmCallPromptTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CrmCallPrompt>;
  total: Scalars['Int']['output'];
};

export type CrmChatMessageInput = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type CrmContact = {
  __typename?: 'CrmContact';
  email?: Maybe<Scalars['String']['output']>;
  mobile_number?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  whatsapp_number?: Maybe<Scalars['String']['output']>;
};

export type CrmContactInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  mobile_number?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  whatsapp_number?: InputMaybe<Scalars['String']['input']>;
};

export type CrmDynamicField = {
  __typename?: 'CrmDynamicField';
  applies_to_ecomm: Scalars['Boolean']['output'];
  applies_to_host: Scalars['Boolean']['output'];
  applies_to_venue: Scalars['Boolean']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  default_value: Scalars['String']['output'];
  hint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  kind: CrmDynamicFieldKind;
  label: Scalars['String']['output'];
  multi: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  options: Array<CrmDynamicFieldOption>;
  placeholder: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmDynamicFieldInput = {
  applies_to_ecomm?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_host?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_venue?: InputMaybe<Scalars['Boolean']['input']>;
  default_value?: InputMaybe<Scalars['String']['input']>;
  hint?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  kind: CrmDynamicFieldKind;
  label: Scalars['String']['input'];
  multi?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  options?: InputMaybe<Array<CrmDynamicFieldOptionInput>>;
  placeholder?: InputMaybe<Scalars['String']['input']>;
  required?: InputMaybe<Scalars['Boolean']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type CrmDynamicFieldKind =
  | 'boolean'
  | 'date'
  | 'number'
  | 'select'
  | 'text'
  | 'textarea';

export type CrmDynamicFieldOption = {
  __typename?: 'CrmDynamicFieldOption';
  label: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type CrmDynamicFieldOptionInput = {
  label: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** An uploaded asset (image-library entry or send attachment) addressed by URL. */
export type CrmEmailAsset = {
  __typename?: 'CrmEmailAsset';
  name?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type CrmEmailAssetInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

/** A CRM-owned email template (separate store from core/admin templates). */
export type CrmEmailTemplate = {
  __typename?: 'CrmEmailTemplate';
  attachments: Array<CrmEmailAsset>;
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  images: Array<CrmEmailAsset>;
  is_active: Scalars['Boolean']['output'];
  mjml: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  target: CrmEmailTemplateTarget;
  template_id: Scalars['ID']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  variables: Array<CrmEmailTemplateVariable>;
};

export type CrmEmailTemplateRender = {
  __typename?: 'CrmEmailTemplateRender';
  detected_variables: Array<Scalars['String']['output']>;
  errors: Array<Scalars['String']['output']>;
  html: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (crmEmailTemplatesTable). */
export type CrmEmailTemplateTablePage = {
  __typename?: 'CrmEmailTemplateTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CrmEmailTemplate>;
  total: Scalars['Int']['output'];
};

export type CrmEmailTemplateTarget =
  | 'ECOMM'
  | 'HOST'
  | 'STATIC'
  | 'VENUE';

export type CrmEmailTemplateVariable = {
  __typename?: 'CrmEmailTemplateVariable';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  sample?: Maybe<Scalars['String']['output']>;
};

export type CrmEmailTemplateVariableInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  sample?: InputMaybe<Scalars['String']['input']>;
};

export type CrmEmailTestResult = {
  __typename?: 'CrmEmailTestResult';
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type CrmEntityType =
  | 'ECOMM_LEAD'
  | 'HOST_LEAD'
  | 'VENUE_LEAD';

export type CrmExcelFile = {
  __typename?: 'CrmExcelFile';
  content_base64: Scalars['String']['output'];
  filename: Scalars['String']['output'];
};

export type CrmExcelImportError = {
  __typename?: 'CrmExcelImportError';
  message: Scalars['String']['output'];
  row: Scalars['Int']['output'];
};

export type CrmExcelImportResult = {
  __typename?: 'CrmExcelImportResult';
  errors: Array<CrmExcelImportError>;
  failed: Scalars['Int']['output'];
  inserted: Scalars['Int']['output'];
};

export type CrmExcelInspectResult = {
  __typename?: 'CrmExcelInspectResult';
  headers: Array<Scalars['String']['output']>;
  /** First few rows as JSON strings (for the mapping preview). */
  sample_rows: Array<Scalars['String']['output']>;
};

export type CrmImportMappingInput = {
  field: Scalars['String']['input'];
  header: Scalars['String']['input'];
};

export type CrmLeadFilter = {
  city?: InputMaybe<Scalars['String']['input']>;
  lead_status?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type CrmLinkedHost = {
  __typename?: 'CrmLinkedHost';
  city?: Maybe<Scalars['String']['output']>;
  host_name: Scalars['String']['output'];
  host_type?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lead_status?: Maybe<Scalars['String']['output']>;
  priority?: Maybe<Scalars['String']['output']>;
};

/** A flat, admin-managed CRM option (venue Amenity or Event Suitability). */
export type CrmManagedOption = {
  __typename?: 'CrmManagedOption';
  created_at?: Maybe<Scalars['String']['output']>;
  group: CrmManagedOptionGroup;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmManagedOptionGroup =
  | 'AMENITY'
  | 'EVENT_SUITABILITY';

/** Server-side table page for the shared table engine (crmManagedOptionsTable). */
export type CrmManagedOptionTablePage = {
  __typename?: 'CrmManagedOptionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CrmManagedOption>;
  total: Scalars['Int']['output'];
};

/** A Duncit user whose email/phone matches one of the lead's contacts (computed live). */
export type CrmMatchedUser = {
  __typename?: 'CrmMatchedUser';
  email?: Maybe<Scalars['String']['output']>;
  full_name?: Maybe<Scalars['String']['output']>;
  matched_on: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
};

export type CrmOptionGroup = {
  __typename?: 'CrmOptionGroup';
  amenities: Array<Scalars['String']['output']>;
  audience_sizes: Array<Scalars['String']['output']>;
  booking_notices: Array<Scalars['String']['output']>;
  frequencies: Array<Scalars['String']['output']>;
  host_intent_scores: Array<Scalars['String']['output']>;
  host_interests: Array<Scalars['String']['output']>;
  host_lead_statuses: Array<Scalars['String']['output']>;
  host_services_offered_options: Array<Scalars['String']['output']>;
  host_types: Array<Scalars['String']['output']>;
  lead_sources: Array<Scalars['String']['output']>;
  pricing_models: Array<Scalars['String']['output']>;
  priorities: Array<Scalars['String']['output']>;
  revenue_models: Array<Scalars['String']['output']>;
  services_offered_options: Array<Scalars['String']['output']>;
  space_types: Array<Scalars['String']['output']>;
  venue_event_suitability: Array<Scalars['String']['output']>;
  venue_lead_statuses: Array<Scalars['String']['output']>;
  venue_services_offered_options: Array<Scalars['String']['output']>;
  venue_types: Array<Scalars['String']['output']>;
  week_days: Array<Scalars['String']['output']>;
};

export type CrmReminder = {
  __typename?: 'CrmReminder';
  assigned_to?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  due_at: Scalars['String']['output'];
  entity_type: CrmReminderEntity;
  id: Scalars['ID']['output'];
  lead_id?: Maybe<Scalars['ID']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  status: CrmReminderStatus;
  title: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmReminderEntity =
  | 'GENERAL'
  | 'HOST_LEAD'
  | 'VENUE_LEAD';

export type CrmReminderFilter = {
  entity_type?: InputMaybe<CrmReminderEntity>;
  from?: InputMaybe<Scalars['String']['input']>;
  lead_id?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<CrmReminderStatus>;
  to?: InputMaybe<Scalars['String']['input']>;
};

export type CrmReminderStatus =
  | 'DONE'
  | 'PENDING';

export type CrmService = {
  __typename?: 'CrmService';
  created_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  kind: CrmServiceKind;
  name: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmServiceInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  kind: CrmServiceKind;
  name: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type CrmServiceKind =
  | 'ECOMM'
  | 'HOST'
  | 'VENUE';

/** A Service Offered title scoped to the Super → Category → Sub taxonomy. */
export type CrmServiceOffered = {
  __typename?: 'CrmServiceOffered';
  applies_to_ecomm: Scalars['Boolean']['output'];
  applies_to_host: Scalars['Boolean']['output'];
  applies_to_venue: Scalars['Boolean']['output'];
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  custom_name?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  service: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name?: Maybe<Scalars['String']['output']>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type CrmServiceOfferedFilter = {
  applies_to_ecomm?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_host?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_venue?: InputMaybe<Scalars['Boolean']['input']>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type CrmServiceOfferedInput = {
  custom_name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  service: Scalars['String']['input'];
};

/** Server-side table page for the shared table engine (crmServicesOfferedTable). */
export type CrmServiceOfferedTablePage = {
  __typename?: 'CrmServiceOfferedTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CrmServiceOffered>;
  total: Scalars['Int']['output'];
};

export type CrmSuperCategoryRef = {
  __typename?: 'CrmSuperCategoryRef';
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

/** A page discovered from a CRM lead's website (with optional fetched content). */
export type CrmWebsitePage = {
  __typename?: 'CrmWebsitePage';
  content_chars: Scalars['Int']['output'];
  content_text?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  entity_type: CrmEntityType;
  error?: Maybe<Scalars['String']['output']>;
  fetched_at?: Maybe<Scalars['String']['output']>;
  http_status?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  lead_id: Scalars['ID']['output'];
  status: CrmWebsitePageStatus;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type CrmWebsitePageStatus =
  | 'DISCOVERED'
  | 'ERROR'
  | 'FETCHED';

/** Server-side table page for the shared table engine (crmWebsitePagesTable). */
export type CrmWebsitePageTablePage = {
  __typename?: 'CrmWebsitePageTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CrmWebsitePage>;
  total: Scalars['Int']['output'];
};

export type CrmWebsiteScrapeResult = {
  __typename?: 'CrmWebsiteScrapeResult';
  discovered: Scalars['Int']['output'];
  pages: Array<CrmWebsitePage>;
  saved: Scalars['Int']['output'];
};

export type DashboardTotals = {
  __typename?: 'DashboardTotals';
  clubs: Array<SuperCategoryCount>;
  clubs_total: Scalars['Int']['output'];
  hosts_total: Scalars['Int']['output'];
  pods: Array<SuperCategoryCount>;
  pods_total: Scalars['Int']['output'];
  support_tickets_by_status: Array<StatusCount>;
  support_tickets_open: Scalars['Int']['output'];
  support_tickets_total: Scalars['Int']['output'];
  users_total: Scalars['Int']['output'];
  venues_total: Scalars['Int']['output'];
};

export type DeleteMyAccountInput = {
  otp: Scalars['String']['input'];
};

export type DummyCheckoutInput = {
  amount: Scalars['Float']['input'];
  /** Structured billing address (preferred). Legacy free-text still accepted. */
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  /** Buyer's full name for the invoice bill-to (falls back to the profile name). */
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  coupon_code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** How the add-on products are delivered (default PICKUP). */
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  selected_products?: InputMaybe<Array<CheckoutProductSelectionInput>>;
  /** Delivery address, required when any product ships. */
  shipping_address?: InputMaybe<OrderShippingAddressInput>;
  simulate_failure?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EarningsSummary = {
  __typename?: 'EarningsSummary';
  currency_symbol: Scalars['String']['output'];
  lifetime_earnings: Scalars['Float']['output'];
  pending_amount: Scalars['Float']['output'];
  pods_completed: Scalars['Int']['output'];
  this_month_earnings: Scalars['Float']['output'];
};

export type EcommBrand = {
  __typename?: 'EcommBrand';
  account_holder_name: Scalars['String']['output'];
  account_number: Scalars['String']['output'];
  address_line1: Scalars['String']['output'];
  approved_at?: Maybe<Scalars['String']['output']>;
  approved_product_count: Scalars['Int']['output'];
  brand_name: Scalars['String']['output'];
  /** Permanent human id (BRD-000001) — Onboarded Brands table. */
  brand_no?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  contact_email: Scalars['String']['output'];
  contact_person: Scalars['String']['output'];
  contact_phone: Scalars['String']['output'];
  country: Scalars['String']['output'];
  cover_image_url: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  default_pickup_location_id?: Maybe<Scalars['ID']['output']>;
  description: Scalars['String']['output'];
  documents: Array<EcommBrandDocument>;
  established_year?: Maybe<Scalars['Int']['output']>;
  gstin: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  ifsc_code: Scalars['String']['output'];
  instagram_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  logo_url: Scalars['String']['output'];
  owner_user_id: Scalars['ID']['output'];
  pan: Scalars['String']['output'];
  postal_code: Scalars['String']['output'];
  product_categories: Array<Scalars['String']['output']>;
  product_commission_pct: Scalars['Float']['output'];
  registered_business_name: Scalars['String']['output'];
  rejected_at?: Maybe<Scalars['String']['output']>;
  reviewer_notes: Scalars['String']['output'];
  state: Scalars['String']['output'];
  status: EcommBrandStatus;
  submitted_at?: Maybe<Scalars['String']['output']>;
  tagline: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  upi_id: Scalars['String']['output'];
  website_url: Scalars['String']['output'];
};

export type EcommBrandDocument = {
  __typename?: 'EcommBrandDocument';
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type EcommBrandDocumentInput = {
  type: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type EcommBrandInput = {
  account_holder_name?: InputMaybe<Scalars['String']['input']>;
  account_number?: InputMaybe<Scalars['String']['input']>;
  address_line1?: InputMaybe<Scalars['String']['input']>;
  brand_name?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  contact_email?: InputMaybe<Scalars['String']['input']>;
  contact_person?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  cover_image_url?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  documents?: InputMaybe<Array<EcommBrandDocumentInput>>;
  established_year?: InputMaybe<Scalars['Int']['input']>;
  gstin?: InputMaybe<Scalars['String']['input']>;
  ifsc_code?: InputMaybe<Scalars['String']['input']>;
  instagram_url?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  pan?: InputMaybe<Scalars['String']['input']>;
  postal_code?: InputMaybe<Scalars['String']['input']>;
  product_categories?: InputMaybe<Array<Scalars['String']['input']>>;
  registered_business_name?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  tagline?: InputMaybe<Scalars['String']['input']>;
  upi_id?: InputMaybe<Scalars['String']['input']>;
  website_url?: InputMaybe<Scalars['String']['input']>;
};

export type EcommBrandStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'SUBMITTED';

/** Server-side table page for the shared table engine (DUNCIT TABLE CONTRACT v1). */
export type EcommBrandTablePage = {
  __typename?: 'EcommBrandTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<EcommBrand>;
  total: Scalars['Int']['output'];
};

/** Products portal: submit an edit to a brand or product for admin approval (Task B item 2). */
export type EcommChangeRequestInput = {
  /** Human-readable proposed changes for the reviewer. */
  details: Array<ApprovalDetailInput>;
  /** BRAND or PRODUCT. */
  kind: Scalars['String']['input'];
  /** JSON object of the fields to apply to the entity on approval. */
  payload: Scalars['String']['input'];
  summary?: InputMaybe<Scalars['String']['input']>;
  target_id: Scalars['ID']['input'];
  target_name: Scalars['String']['input'];
};

export type EcommLead = {
  __typename?: 'EcommLead';
  activity_log: Array<CrmActivity>;
  area?: Maybe<Scalars['String']['output']>;
  assigned_to?: Maybe<Scalars['String']['output']>;
  brand_name?: Maybe<Scalars['String']['output']>;
  business_type?: Maybe<Scalars['String']['output']>;
  catalog_size?: Maybe<Scalars['String']['output']>;
  category_ids: Array<Scalars['ID']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  contacts: Array<CrmContact>;
  created_at?: Maybe<Scalars['String']['output']>;
  dynamic_values_json: Scalars['String']['output'];
  fulfilment_mode?: Maybe<Scalars['String']['output']>;
  gst_applicable: Scalars['Boolean']['output'];
  gst_number?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  instagram_link?: Maybe<Scalars['String']['output']>;
  lead_source?: Maybe<Scalars['String']['output']>;
  lead_status: Scalars['String']['output'];
  marketplace_links: Array<Scalars['String']['output']>;
  matched_user?: Maybe<CrmMatchedUser>;
  monthly_orders?: Maybe<Scalars['String']['output']>;
  next_follow_up_date?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  price_range?: Maybe<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  product_categories: Array<Scalars['String']['output']>;
  profile_photo_url?: Maybe<Scalars['String']['output']>;
  seller_name: Scalars['String']['output'];
  services_offered: Array<CrmServiceOffered>;
  sub_category_ids: Array<Scalars['ID']['output']>;
  super_category?: Maybe<CrmSuperCategoryRef>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  tags: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type EcommLeadInput = {
  area?: InputMaybe<Scalars['String']['input']>;
  assigned_to?: InputMaybe<Scalars['String']['input']>;
  brand_name?: InputMaybe<Scalars['String']['input']>;
  business_type?: InputMaybe<Scalars['String']['input']>;
  catalog_size?: InputMaybe<Scalars['String']['input']>;
  category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  city?: InputMaybe<Scalars['String']['input']>;
  contacts?: InputMaybe<Array<CrmContactInput>>;
  dynamic_values_json?: InputMaybe<Scalars['String']['input']>;
  fulfilment_mode?: InputMaybe<Scalars['String']['input']>;
  gst_applicable?: InputMaybe<Scalars['Boolean']['input']>;
  gst_number?: InputMaybe<Scalars['String']['input']>;
  instagram_link?: InputMaybe<Scalars['String']['input']>;
  lead_source?: InputMaybe<Scalars['String']['input']>;
  lead_status?: InputMaybe<Scalars['String']['input']>;
  marketplace_links?: InputMaybe<Array<Scalars['String']['input']>>;
  monthly_orders?: InputMaybe<Scalars['String']['input']>;
  next_follow_up_date?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  price_range?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  product_categories?: InputMaybe<Array<Scalars['String']['input']>>;
  profile_photo_url?: InputMaybe<Scalars['String']['input']>;
  seller_name: Scalars['String']['input'];
  services_offered?: InputMaybe<Array<CrmServiceOfferedInput>>;
  sub_category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (ecommLeadsTable). */
export type EcommLeadTablePage = {
  __typename?: 'EcommLeadTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<EcommLead>;
  total: Scalars['Int']['output'];
};

export type EditAdjustmentInput = {
  delta: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  remark?: InputMaybe<Scalars['String']['input']>;
};

export type EmailTemplate = {
  __typename?: 'EmailTemplate';
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  is_active: Scalars['Boolean']['output'];
  mjml: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  template_id: Scalars['ID']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  variables: Array<EmailTemplateVariable>;
};

export type EmailTemplateRender = {
  __typename?: 'EmailTemplateRender';
  detected_variables: Array<Scalars['String']['output']>;
  errors: Array<Scalars['String']['output']>;
  html: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type EmailTemplateVariable = {
  __typename?: 'EmailTemplateVariable';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  sample?: Maybe<Scalars['String']['output']>;
};

export type EmailTemplateVariableInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  sample?: InputMaybe<Scalars['String']['input']>;
};

export type EmailTestResult = {
  __typename?: 'EmailTestResult';
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type EnvCategory =
  | 'EMAIL'
  | 'GEMINI'
  | 'GOOGLE_MAPS'
  | 'GOOGLE_OAUTH'
  | 'IMAGEKIT'
  | 'OPENAI'
  | 'PEXELS'
  | 'RAZORPAY'
  | 'SERVAM'
  | 'SHIPROCKET'
  | 'TWILIO';

export type EnvCategoryDef = {
  __typename?: 'EnvCategoryDef';
  category: EnvCategory;
  /** Link to where an operator obtains these credentials. */
  docUrl?: Maybe<Scalars['String']['output']>;
  fields: Array<EnvFieldDef>;
  label: Scalars['String']['output'];
};

export type EnvConfigPair = {
  __typename?: 'EnvConfigPair';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type EnvConfigPairInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type EnvEntry = {
  __typename?: 'EnvEntry';
  assigned_portals: Array<Scalars['String']['output']>;
  category: EnvCategory;
  config: Array<EnvConfigPair>;
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_default: Scalars['Boolean']['output'];
  last_test_ok?: Maybe<Scalars['Boolean']['output']>;
  last_tested_at?: Maybe<Scalars['String']['output']>;
  last_used_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  secrets: Array<EnvSecretFlag>;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type EnvEntryFilter = {
  category?: InputMaybe<EnvCategory>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Server-side table page for the shared table engine (envEntriesTable). */
export type EnvEntryTablePage = {
  __typename?: 'EnvEntryTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<EnvEntry>;
  total: Scalars['Int']['output'];
};

/** A category field definition so the UI can render the right inputs dynamically. */
export type EnvFieldDef = {
  __typename?: 'EnvFieldDef';
  bool: Scalars['Boolean']['output'];
  hint?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['Boolean']['output'];
  phone: Scalars['Boolean']['output'];
  secret: Scalars['Boolean']['output'];
};

export type EnvSecretFlag = {
  __typename?: 'EnvSecretFlag';
  key: Scalars['String']['output'];
  present: Scalars['Boolean']['output'];
};

export type EnvTestResult = {
  __typename?: 'EnvTestResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

/** Richer result for the interactive per-category tests (returns a URL or data payload). */
export type EnvTestRichResult = {
  __typename?: 'EnvTestRichResult';
  data?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type EventTicket = {
  __typename?: 'EventTicket';
  checked_in_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  meeting_platform?: Maybe<Scalars['String']['output']>;
  membership_id: Scalars['ID']['output'];
  payment_id?: Maybe<Scalars['ID']['output']>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  pod_mode: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  qr_token: Scalars['String']['output'];
  status: EventTicketStatus;
  ticket_code: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  user_name: Scalars['String']['output'];
  venue_address?: Maybe<Scalars['String']['output']>;
  venue_name?: Maybe<Scalars['String']['output']>;
  zone_name?: Maybe<Scalars['String']['output']>;
};

export type EventTicketFilterInput = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EventTicketStatus>;
};

export type EventTicketStatus =
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'VALID';

/** Server-side table page for the shared table engine (eventTicketsTable). */
export type EventTicketTablePage = {
  __typename?: 'EventTicketTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<EventTicket>;
  total: Scalars['Int']['output'];
};

export type EventTicketVerifyResult = {
  __typename?: 'EventTicketVerifyResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  ticket?: Maybe<EventTicket>;
};

export type Expense = {
  __typename?: 'Expense';
  amount: Scalars['Float']['output'];
  attachment_url: Scalars['String']['output'];
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  created_by?: Maybe<Scalars['ID']['output']>;
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  expense_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  net_amount: Scalars['Float']['output'];
  payment_method: Scalars['String']['output'];
  reference: Scalars['String']['output'];
  refund_total: Scalars['Float']['output'];
  refunds: Array<ExpenseRefund>;
  updated_at: Scalars['String']['output'];
  vendor_name: Scalars['String']['output'];
};

export type ExpenseCategoryTotal = {
  __typename?: 'ExpenseCategoryTotal';
  category: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

export type ExpenseFilterInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  max_amount?: InputMaybe<Scalars['Float']['input']>;
  min_amount?: InputMaybe<Scalars['Float']['input']>;
  payment_method?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};

export type ExpenseRefund = {
  __typename?: 'ExpenseRefund';
  amount: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  date: Scalars['String']['output'];
  note: Scalars['String']['output'];
  refund_id: Scalars['String']['output'];
};

export type ExpenseSummary = {
  __typename?: 'ExpenseSummary';
  by_category: Array<ExpenseCategoryTotal>;
  count: Scalars['Int']['output'];
  gross_total: Scalars['Float']['output'];
  refund_total: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

/** Server-side table page for the shared table engine (expensesTable). */
export type ExpenseTablePage = {
  __typename?: 'ExpenseTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Expense>;
  total: Scalars['Int']['output'];
};

export type Faq = {
  __typename?: 'Faq';
  answer: Scalars['String']['output'];
  audience: FaqAudience;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  partner_topic?: Maybe<PartnerFaqTopic>;
  question: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  super_category?: Maybe<Category>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  updated_at: Scalars['String']['output'];
};

export type FaqAudience =
  | 'APP'
  | 'PARTNERS';

export type FaqFilterInput = {
  audience?: InputMaybe<FaqAudience>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  partner_topic?: InputMaybe<PartnerFaqTopic>;
  search?: InputMaybe<Scalars['String']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type FaqGroup = {
  __typename?: 'FaqGroup';
  faqs: Array<Faq>;
  super_category?: Maybe<Category>;
};

export type FaqSubmission = {
  __typename?: 'FaqSubmission';
  converted_faq_id?: Maybe<Scalars['ID']['output']>;
  created_at: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  question: Scalars['String']['output'];
  status: FaqSubmissionStatus;
  super_category_slug?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
};

export type FaqSubmissionStatus =
  | 'CONVERTED'
  | 'IGNORED'
  | 'NEW';

/** Server-side table page for the shared table engine (faqSubmissionsTable). */
export type FaqSubmissionTablePage = {
  __typename?: 'FaqSubmissionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<FaqSubmission>;
  total: Scalars['Int']['output'];
};

export type FaqSubmitResult = {
  __typename?: 'FaqSubmitResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

/** Server-side table page for the shared table engine (faqsTable). */
export type FaqTablePage = {
  __typename?: 'FaqTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Faq>;
  total: Scalars['Int']['output'];
};

export type FeatureFlag = {
  __typename?: 'FeatureFlag';
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  is_system: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (featureFlagsTable). */
export type FeatureFlagTablePage = {
  __typename?: 'FeatureFlagTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<FeatureFlag>;
  total: Scalars['Int']['output'];
};

export type FinanceDashboardStats = {
  __typename?: 'FinanceDashboardStats';
  completed_payouts: FinanceStat;
  currency_symbol: Scalars['String']['output'];
  duncit_revenue: FinanceStat;
  gst_collected: FinanceStat;
  pending_payouts: FinanceStat;
  total_revenue: FinanceStat;
};

export type FinanceSettings = {
  __typename?: 'FinanceSettings';
  business_address: Scalars['String']['output'];
  business_gstin: Scalars['String']['output'];
  business_name: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  default_backout_deduction_pct: Scalars['Float']['output'];
  default_club_admin_pct: Scalars['Float']['output'];
  default_host_commission_pct: Scalars['Float']['output'];
  default_host_share_pct: Scalars['Float']['output'];
  default_product_commission_pct: Scalars['Float']['output'];
  default_venue_commission_pct: Scalars['Float']['output'];
  default_venue_share_pct: Scalars['Float']['output'];
  dummy_mode: Scalars['Boolean']['output'];
  gst_pct: Scalars['Float']['output'];
  host_payout_mode: PayoutMode;
  invoice_footer_note: Scalars['String']['output'];
  invoice_label: Scalars['String']['output'];
  invoice_logo_url: Scalars['String']['output'];
  invoice_prefix: Scalars['String']['output'];
  invoice_support_email: Scalars['String']['output'];
  invoice_support_phone: Scalars['String']['output'];
  invoice_templates: InvoiceTemplates;
  invoice_terms: Scalars['String']['output'];
  payout_day_of_week: Scalars['Int']['output'];
  payout_time: Scalars['String']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  updated_at: Scalars['String']['output'];
  venue_payout_mode: PayoutMode;
};

export type FinanceStat = {
  __typename?: 'FinanceStat';
  last_month: Scalars['Float']['output'];
  mom_change_pct: Scalars['Float']['output'];
  this_month: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

export type FollowingFeedSource =
  | 'CLUBS'
  | 'PEOPLE';

export type FounderCategory = {
  __typename?: 'FounderCategory';
  icon: Scalars['String']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  metrics: Array<FounderMetric>;
};

export type FounderDashboard = {
  __typename?: 'FounderDashboard';
  categories: Array<FounderCategory>;
  from: Scalars['String']['output'];
  settings: Array<FounderSettingKv>;
  to: Scalars['String']['output'];
  /** The 12 headline founder KPI cards. */
  top: Array<FounderMetric>;
};

export type FounderMetric = {
  __typename?: 'FounderMetric';
  category: Scalars['String']['output'];
  definition: Scalars['String']['output'];
  delta_pct?: Maybe<Scalars['Float']['output']>;
  formula: Scalars['String']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  series: Array<FounderPoint>;
  /** Setting keys the formula reads (editable in the settings drawer). */
  setting_keys: Array<Scalars['String']['output']>;
  /** computed (derived from the database) or manual (founder-entered value). */
  source: Scalars['String']['output'];
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type FounderPoint = {
  __typename?: 'FounderPoint';
  label: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type FounderSettingInput = {
  key: Scalars['String']['input'];
  value: Scalars['Float']['input'];
};

export type FounderSettingKv = {
  __typename?: 'FounderSettingKV';
  key: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type FulfilmentMethod =
  | 'PICKUP'
  | 'SHIP';

export type FulfilmentStatus =
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'CANCELLED'
  | 'DELIVERED'
  | 'FAILED'
  | 'OUT_FOR_DELIVERY'
  | 'PENDING'
  | 'PICKED_UP'
  | 'PICKUP_SCHEDULED'
  | 'READY_FOR_PICKUP'
  | 'RTO'
  | 'SHIPPED';

export type GoogleAuthInput = {
  id_token: Scalars['String']['input'];
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type GoogleSignupInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  id_token: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type HealthAdjustment = {
  __typename?: 'HealthAdjustment';
  created_at: Scalars['String']['output'];
  created_by_id?: Maybe<Scalars['ID']['output']>;
  created_by_name: Scalars['String']['output'];
  delta: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  remark: Scalars['String']['output'];
};

export type HealthBand =
  | 'GREEN'
  | 'RED'
  | 'YELLOW';

export type HealthScore = {
  __typename?: 'HealthScore';
  adjustments: Array<HealthAdjustment>;
  band: HealthBand;
  base_score: Scalars['Int']['output'];
  delta_sum: Scalars['Int']['output'];
  subject_id: Scalars['ID']['output'];
  subject_label: Scalars['String']['output'];
  subject_type: HealthSubjectType;
  total_score: Scalars['Int']['output'];
};

export type HealthSubjectType =
  | 'USER'
  | 'VENUE';

export type HolidayType =
  | 'OFFICE_HOLIDAY'
  | 'OFFICIAL_LEAVE'
  | 'PUBLIC_HOLIDAY';

export type Host = {
  __typename?: 'Host';
  aadhar_number: Scalars['String']['output'];
  approved_at?: Maybe<Scalars['String']['output']>;
  bank_account: BankAccountVerification;
  created_at: Scalars['String']['output'];
  dob?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  full_address: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  host_categories: Array<HostCategory>;
  host_commission_pct?: Maybe<Scalars['Float']['output']>;
  /** Permanent human id (HOST-000001) — Onboarded Hosts table. */
  host_no?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  pan_number: Scalars['String']['output'];
  passport_photo_url: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  police_verification_url: Scalars['String']['output'];
  rejected_at?: Maybe<Scalars['String']['output']>;
  reviewer_notes: Scalars['String']['output'];
  status: HostStatus;
  step_completed: Scalars['Int']['output'];
  submitted_at?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type HostCategory = {
  __typename?: 'HostCategory';
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name: Scalars['String']['output'];
  request_no: Scalars['String']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name: Scalars['String']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name: Scalars['String']['output'];
};

/** A Super → Category → Sub triple a host is approved to operate in. */
export type HostCategoryInput = {
  category_id: Scalars['ID']['input'];
  sub_category_id: Scalars['ID']['input'];
  super_category_id: Scalars['ID']['input'];
};

/** Host Studio insights: pod-status distribution + monthly payout series. */
export type HostInsights = {
  __typename?: 'HostInsights';
  monthly_earnings: Array<HostMonthlyEarning>;
  status_counts: HostStatusCounts;
};

export type HostLead = {
  __typename?: 'HostLead';
  activity_log: Array<CrmActivity>;
  area?: Maybe<Scalars['String']['output']>;
  assigned_to?: Maybe<Scalars['String']['output']>;
  budget_range?: Maybe<Scalars['String']['output']>;
  category_ids: Array<Scalars['ID']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  community_link?: Maybe<Scalars['String']['output']>;
  community_size?: Maybe<Scalars['Int']['output']>;
  contacts: Array<CrmContact>;
  created_at?: Maybe<Scalars['String']['output']>;
  dynamic_values_json: Scalars['String']['output'];
  expected_audience_size?: Maybe<Scalars['String']['output']>;
  frequency?: Maybe<Scalars['String']['output']>;
  host_intent_scores: Array<Scalars['String']['output']>;
  host_name: Scalars['String']['output'];
  host_type?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  instagram_link?: Maybe<Scalars['String']['output']>;
  interests: Array<Scalars['String']['output']>;
  lead_source?: Maybe<Scalars['String']['output']>;
  lead_status: Scalars['String']['output'];
  matched_user?: Maybe<CrmMatchedUser>;
  need_vendor: Scalars['Boolean']['output'];
  need_venue: Scalars['Boolean']['output'];
  next_follow_up_date?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  organization_name?: Maybe<Scalars['String']['output']>;
  past_attendees?: Maybe<Scalars['Int']['output']>;
  preferred_day?: Maybe<Scalars['String']['output']>;
  preferred_event_date?: Maybe<Scalars['String']['output']>;
  preferred_time_slot?: Maybe<Scalars['String']['output']>;
  previous_events_hosted: Scalars['Boolean']['output'];
  priority: Scalars['String']['output'];
  profile_photo_url?: Maybe<Scalars['String']['output']>;
  revenue_models: Array<Scalars['String']['output']>;
  services_offered: Array<CrmServiceOffered>;
  sub_category_ids: Array<Scalars['ID']['output']>;
  super_category?: Maybe<CrmSuperCategoryRef>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  tags: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type HostLeadInput = {
  area?: InputMaybe<Scalars['String']['input']>;
  assigned_to?: InputMaybe<Scalars['String']['input']>;
  budget_range?: InputMaybe<Scalars['String']['input']>;
  category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  city?: InputMaybe<Scalars['String']['input']>;
  community_link?: InputMaybe<Scalars['String']['input']>;
  community_size?: InputMaybe<Scalars['Int']['input']>;
  contacts?: InputMaybe<Array<CrmContactInput>>;
  dynamic_values_json?: InputMaybe<Scalars['String']['input']>;
  expected_audience_size?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<Scalars['String']['input']>;
  host_intent_scores?: InputMaybe<Array<Scalars['String']['input']>>;
  host_name: Scalars['String']['input'];
  host_type?: InputMaybe<Scalars['String']['input']>;
  instagram_link?: InputMaybe<Scalars['String']['input']>;
  interests?: InputMaybe<Array<Scalars['String']['input']>>;
  lead_source?: InputMaybe<Scalars['String']['input']>;
  lead_status?: InputMaybe<Scalars['String']['input']>;
  need_vendor?: InputMaybe<Scalars['Boolean']['input']>;
  need_venue?: InputMaybe<Scalars['Boolean']['input']>;
  next_follow_up_date?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  organization_name?: InputMaybe<Scalars['String']['input']>;
  past_attendees?: InputMaybe<Scalars['Int']['input']>;
  preferred_day?: InputMaybe<Scalars['String']['input']>;
  preferred_event_date?: InputMaybe<Scalars['String']['input']>;
  preferred_time_slot?: InputMaybe<Scalars['String']['input']>;
  previous_events_hosted?: InputMaybe<Scalars['Boolean']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  profile_photo_url?: InputMaybe<Scalars['String']['input']>;
  revenue_models?: InputMaybe<Array<Scalars['String']['input']>>;
  services_offered?: InputMaybe<Array<CrmServiceOfferedInput>>;
  sub_category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (hostLeadsTable). */
export type HostLeadTablePage = {
  __typename?: 'HostLeadTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<HostLead>;
  total: Scalars['Int']['output'];
};

/** One month's host payout total (bucket = 'YYYY-MM'). */
export type HostMonthlyEarning = {
  __typename?: 'HostMonthlyEarning';
  month: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

/** What deleting a pod means for its audience — shown in the host's delete dialog. */
export type HostPodDeleteImpact = {
  __typename?: 'HostPodDeleteImpact';
  currency_symbol: Scalars['String']['output'];
  /** Attendees other than the pod's hosts. */
  other_attendee_count: Scalars['Int']['output'];
  refund_total: Scalars['Float']['output'];
  /** SUCCESS payments that will be marked for refund on delete. */
  refundable_payment_count: Scalars['Int']['output'];
};

export type HostRequest = {
  __typename?: 'HostRequest';
  audit_log: Array<HostRequestAudit>;
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  host_email: Scalars['String']['output'];
  host_name: Scalars['String']['output'];
  host_phone: Scalars['String']['output'];
  host_user_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  request_no: Scalars['String']['output'];
  reviewer_notes: Scalars['String']['output'];
  status: HostRequestStatus;
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name: Scalars['String']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name: Scalars['String']['output'];
  survey_id?: Maybe<Scalars['ID']['output']>;
  updated_at: Scalars['String']['output'];
};

export type HostRequestAudit = {
  __typename?: 'HostRequestAudit';
  at: Scalars['String']['output'];
  by_id?: Maybe<Scalars['ID']['output']>;
  by_name: Scalars['String']['output'];
  note: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type HostRequestStatus =
  | 'ACKNOWLEDGED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUESTED';

export type HostRequestSurveyAnswer = {
  qid: Scalars['ID']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Server-side table page for the shared table engine (hostRequestsTable). */
export type HostRequestTablePage = {
  __typename?: 'HostRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<HostRequest>;
  total: Scalars['Int']['output'];
};

export type HostStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'SUBMITTED';

/** Host Studio pod-status distribution (donut) — cancelled = soft-deleted pods. */
export type HostStatusCounts = {
  __typename?: 'HostStatusCounts';
  cancelled: Scalars['Int']['output'];
  completed: Scalars['Int']['output'];
  ongoing: Scalars['Int']['output'];
  upcoming: Scalars['Int']['output'];
};

export type HostStep1Input = {
  dob?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  full_name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};

export type HostStep2Input = {
  aadhar_number: Scalars['String']['input'];
  pan_number: Scalars['String']['input'];
  passport_photo_url: Scalars['String']['input'];
};

export type HostStep3Input = {
  bank_account?: InputMaybe<BankAccountVerificationInput>;
  full_address: Scalars['String']['input'];
  police_verification_url: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Server-side table page for the shared table engine (hostsTable). */
export type HostTablePage = {
  __typename?: 'HostTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Host>;
  total: Scalars['Int']['output'];
};

/** The only fields a host may edit on their own pod. */
export type HostUpdatePodInput = {
  pod_description: Scalars['String']['input'];
  pod_images_and_videos: Array<PodMediaInput>;
  pod_title: Scalars['String']['input'];
  reel_url?: InputMaybe<Scalars['String']['input']>;
};

export type ImagekitAuth = {
  __typename?: 'ImagekitAuth';
  expire: Scalars['Int']['output'];
  publicKey: Scalars['String']['output'];
  signature: Scalars['String']['output'];
  token: Scalars['String']['output'];
  urlEndpoint: Scalars['String']['output'];
};

export type Interview = {
  __typename?: 'Interview';
  about: Scalars['String']['output'];
  admin_notes?: Maybe<Scalars['String']['output']>;
  applicant_email: Scalars['String']['output'];
  applicant_name: Scalars['String']['output'];
  applicant_phone: Scalars['String']['output'];
  applicant_user_id: Scalars['ID']['output'];
  business_address?: Maybe<Scalars['String']['output']>;
  business_name?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  meeting_link?: Maybe<Scalars['String']['output']>;
  preferred_slots: Array<InterviewSlot>;
  scheduled_slot?: Maybe<InterviewSlot>;
  status: InterviewStatus;
  type: InterviewType;
  updated_at: Scalars['String']['output'];
  zone?: Maybe<Scalars['String']['output']>;
};

export type InterviewFilterInput = {
  status?: InputMaybe<InterviewStatus>;
  type?: InputMaybe<InterviewType>;
};

export type InterviewSlot = {
  __typename?: 'InterviewSlot';
  end: Scalars['String']['output'];
  start: Scalars['String']['output'];
};

export type InterviewSlotInput = {
  end: Scalars['String']['input'];
  start: Scalars['String']['input'];
};

export type InterviewStatus =
  | 'APPROVED'
  | 'CANCELLED'
  | 'PENDING'
  | 'REJECTED'
  | 'SCHEDULED';

export type InterviewType =
  | 'HOST'
  | 'VENUE';

export type InventoryActivityAction =
  | 'ARCHIVE'
  | 'CREATE'
  | 'DELETE'
  | 'DUPLICATE'
  | 'RESTORE'
  | 'UPDATE';

export type InventoryActivityLog = {
  __typename?: 'InventoryActivityLog';
  action: InventoryActivityAction;
  changed_fields: Array<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes: Scalars['String']['output'];
  product_id: Scalars['ID']['output'];
  user_id?: Maybe<Scalars['String']['output']>;
  user_name: Scalars['String']['output'];
};

export type InventoryAnalyticsPoint = {
  __typename?: 'InventoryAnalyticsPoint';
  date: Scalars['String']['output'];
  in_qty: Scalars['Int']['output'];
  net_qty: Scalars['Int']['output'];
  out_qty: Scalars['Int']['output'];
};

export type InventoryLinkedPod = {
  __typename?: 'InventoryLinkedPod';
  club_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  pod_id: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
};

export type InventoryProduct = {
  __typename?: 'InventoryProduct';
  available_count: Scalars['Int']['output'];
  barcode: Scalars['String']['output'];
  batch_number: Scalars['String']['output'];
  brand_id?: Maybe<Scalars['ID']['output']>;
  brand_name: Scalars['String']['output'];
  breadth_cm: Scalars['Float']['output'];
  categories: Array<ProductCategory>;
  category_id?: Maybe<Scalars['ID']['output']>;
  color: Scalars['String']['output'];
  commission_pct: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  damaged_count: Scalars['Int']['output'];
  delivery_available: Scalars['Boolean']['output'];
  delivery_charge: Scalars['Float']['output'];
  delivery_target: ProductListingDeliveryTarget;
  description: Scalars['String']['output'];
  discount_percent: Scalars['Float']['output'];
  expiry_date?: Maybe<Scalars['String']['output']>;
  height_cm: Scalars['Float']['output'];
  host_request_allowed: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  images: Array<Scalars['String']['output']>;
  inventory_count: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  is_duncit_delivery_partner: Scalars['Boolean']['output'];
  last_updated_by_id?: Maybe<Scalars['String']['output']>;
  last_updated_by_name: Scalars['String']['output'];
  length_cm: Scalars['Float']['output'];
  listing_review_notes: Scalars['String']['output'];
  listing_review_status: ProductListingReviewStatus;
  listing_reviewed_by_id?: Maybe<Scalars['String']['output']>;
  listing_reviewed_by_name: Scalars['String']['output'];
  listing_submitted_by_id?: Maybe<Scalars['String']['output']>;
  listing_submitted_by_name: Scalars['String']['output'];
  low_stock_alert: Scalars['Int']['output'];
  manufacturing_date?: Maybe<Scalars['String']['output']>;
  max_order_qty: Scalars['Int']['output'];
  min_order_qty: Scalars['Int']['output'];
  notify_low_stock: Scalars['Boolean']['output'];
  options: Array<ProductOption>;
  ownership: ProductOwnership;
  pod_available: Scalars['Boolean']['output'];
  product_name: Scalars['String']['output'];
  product_type: ProductType;
  purchase_price: Scalars['Float']['output'];
  requested_count: Scalars['Int']['output'];
  reserved_count: Scalars['Int']['output'];
  selling_price: Scalars['Float']['output'];
  short_description: Scalars['String']['output'];
  size_label: Scalars['String']['output'];
  sku: Scalars['String']['output'];
  status: InventoryStatus;
  storage_instructions: Scalars['String']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  supplier_contact: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  tax_percent: Scalars['Float']['output'];
  unit_cost: Scalars['Float']['output'];
  unit_type: UnitType;
  updated_at: Scalars['String']['output'];
  variants: Array<ProductVariant>;
  vendor_name: Scalars['String']['output'];
  visibility: InventoryVisibility;
  weight_kg: Scalars['Float']['output'];
  weight_volume: Scalars['String']['output'];
};

export type InventoryProductInput = {
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch_number?: InputMaybe<Scalars['String']['input']>;
  brand_name?: InputMaybe<Scalars['String']['input']>;
  breadth_cm?: InputMaybe<Scalars['Float']['input']>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  damaged_count?: InputMaybe<Scalars['Int']['input']>;
  delivery_available?: InputMaybe<Scalars['Boolean']['input']>;
  delivery_charge?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discount_percent?: InputMaybe<Scalars['Float']['input']>;
  expiry_date?: InputMaybe<Scalars['String']['input']>;
  height_cm?: InputMaybe<Scalars['Float']['input']>;
  host_request_allowed?: InputMaybe<Scalars['Boolean']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  inventory_count?: InputMaybe<Scalars['Int']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  length_cm?: InputMaybe<Scalars['Float']['input']>;
  low_stock_alert?: InputMaybe<Scalars['Int']['input']>;
  manufacturing_date?: InputMaybe<Scalars['String']['input']>;
  max_order_qty?: InputMaybe<Scalars['Int']['input']>;
  min_order_qty?: InputMaybe<Scalars['Int']['input']>;
  pod_available?: InputMaybe<Scalars['Boolean']['input']>;
  product_name: Scalars['String']['input'];
  product_type?: InputMaybe<ProductType>;
  purchase_price?: InputMaybe<Scalars['Float']['input']>;
  reserved_count?: InputMaybe<Scalars['Int']['input']>;
  selling_price?: InputMaybe<Scalars['Float']['input']>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InventoryStatus>;
  storage_instructions?: InputMaybe<Scalars['String']['input']>;
  supplier_contact?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  tax_percent?: InputMaybe<Scalars['Float']['input']>;
  unit_cost: Scalars['Float']['input'];
  unit_type?: InputMaybe<UnitType>;
  vendor_name?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<InventoryVisibility>;
  weight_kg?: InputMaybe<Scalars['Float']['input']>;
  weight_volume?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (DUNCIT TABLE CONTRACT v1). */
export type InventoryProductTablePage = {
  __typename?: 'InventoryProductTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<InventoryProduct>;
  total: Scalars['Int']['output'];
};

export type InventoryStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DRAFT'
  | 'OUT_OF_STOCK';

export type InventoryStockMovement = {
  __typename?: 'InventoryStockMovement';
  balance_after: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  product_id: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  reason: Scalars['String']['output'];
  type: StockMovementType;
  user_id?: Maybe<Scalars['String']['output']>;
  user_name: Scalars['String']['output'];
};

export type InventoryVisibility =
  | 'INTERNAL'
  | 'PUBLIC';

export type InvoiceTemplates = {
  __typename?: 'InvoiceTemplates';
  host: PartyInvoiceTemplate;
  product: PartyInvoiceTemplate;
  venue: PartyInvoiceTemplate;
};

export type InvoiceTemplatesInput = {
  host?: InputMaybe<PartyInvoiceTemplateInput>;
  product?: InputMaybe<PartyInvoiceTemplateInput>;
  venue?: InputMaybe<PartyInvoiceTemplateInput>;
};

/** A public careers-page application, triaged in the Website portal. */
export type JobApplication = {
  __typename?: 'JobApplication';
  cover_note: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  portfolio_url: Scalars['String']['output'];
  resume_url: Scalars['String']['output'];
  role_content_id?: Maybe<Scalars['ID']['output']>;
  role_title: Scalars['String']['output'];
  status: JobApplicationStatus;
  updated_at: Scalars['String']['output'];
};

export type JobApplicationResult = {
  __typename?: 'JobApplicationResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

export type JobApplicationStatus =
  | 'HIRED'
  | 'NEW'
  | 'REJECTED'
  | 'SHORTLISTED';

/** Server-side table page for the shared table engine (jobApplicationsTable). */
export type JobApplicationTablePage = {
  __typename?: 'JobApplicationTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<JobApplication>;
  total: Scalars['Int']['output'];
};

export type JoinSource =
  | 'DIRECT'
  | 'FREE'
  | 'HOST_ADD'
  | 'PAID'
  | 'REFERRAL';

export type LeadContactActionResult = {
  __typename?: 'LeadContactActionResult';
  external_id?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  provider: Scalars['String']['output'];
  provider_id?: Maybe<Scalars['ID']['output']>;
  recording_url?: Maybe<Scalars['String']['output']>;
};

/** The survey matched to a lead's taxonomy + the full generation/response log. */
export type LeadSurvey = {
  __typename?: 'LeadSurvey';
  /** The lead's category / sub-category options — for the 'which one?' picker. */
  categories: Array<LeadSurveyCategoryRef>;
  entries: Array<LeadSurveyEntry>;
  sub_categories: Array<LeadSurveyCategoryRef>;
  survey?: Maybe<Survey>;
};

export type LeadSurveyCategoryRef = {
  __typename?: 'LeadSurveyCategoryRef';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type LeadSurveyEntity =
  | 'HOST_LEAD'
  | 'VENUE_LEAD';

export type LeadSurveyEntry = {
  __typename?: 'LeadSurveyEntry';
  answers: Array<SurveyAnswer>;
  created_at?: Maybe<Scalars['String']['output']>;
  filled: Scalars['Boolean']['output'];
  generated_by?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  source: LeadSurveySource;
  submitted_at?: Maybe<Scalars['String']['output']>;
  submitted_by?: Maybe<Scalars['String']['output']>;
  survey_id?: Maybe<Scalars['ID']['output']>;
  token?: Maybe<Scalars['String']['output']>;
  token_revoked: Scalars['Boolean']['output'];
};

/** Server-side table page for the shared table engine (leadSurveyEntriesTable). */
export type LeadSurveyEntryTablePage = {
  __typename?: 'LeadSurveyEntryTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<LeadSurveyEntry>;
  total: Scalars['Int']['output'];
};

export type LeadSurveySource =
  | 'APP'
  | 'LINK'
  | 'MANUAL';

export type LegalDocument = {
  __typename?: 'LegalDocument';
  content: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  created_by_name: Scalars['String']['output'];
  description: Scalars['String']['output'];
  document_type: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  updated_by_name: Scalars['String']['output'];
  version_count: Scalars['Int']['output'];
  versions: Array<LegalDocumentVersion>;
};

export type LegalDocumentFilterInput = {
  document_type?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LegalDocumentStats = {
  __typename?: 'LegalDocumentStats';
  by_type: Array<LegalDocumentTypeCount>;
  total: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (legalDocumentsTable). */
export type LegalDocumentTablePage = {
  __typename?: 'LegalDocumentTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<LegalDocument>;
  total: Scalars['Int']['output'];
};

export type LegalDocumentTypeCount = {
  __typename?: 'LegalDocumentTypeCount';
  count: Scalars['Int']['output'];
  document_type: Scalars['String']['output'];
};

/** Server-side table page over the by-type aggregate (legalDocumentStatsTable). */
export type LegalDocumentTypeCountTablePage = {
  __typename?: 'LegalDocumentTypeCountTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<LegalDocumentTypeCount>;
  total: Scalars['Int']['output'];
};

export type LegalDocumentVersion = {
  __typename?: 'LegalDocumentVersion';
  content: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  document_type: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updated_by?: Maybe<Scalars['ID']['output']>;
  updated_by_name: Scalars['String']['output'];
};

export type Location = {
  __typename?: 'Location';
  /** Count of active clubs currently operating in this city (Home location selector). */
  active_club_count: Scalars['Int']['output'];
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  country_code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  location_id: Scalars['String']['output'];
  location_image: Scalars['String']['output'];
  location_name: Scalars['String']['output'];
  location_pincode: Scalars['String']['output'];
  location_zones: Array<LocationZone>;
  state: Scalars['String']['output'];
  state_code: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type LocationFilterInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (locationsTable). */
export type LocationTablePage = {
  __typename?: 'LocationTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Location>;
  total: Scalars['Int']['output'];
};

export type LocationZone = {
  __typename?: 'LocationZone';
  /** Count of active clubs whose locality matches this zone in the parent city. */
  active_club_count: Scalars['Int']['output'];
  pincode?: Maybe<Scalars['String']['output']>;
  zone_code?: Maybe<Scalars['String']['output']>;
  zone_name: Scalars['String']['output'];
};

export type LocationZoneInput = {
  pincode?: InputMaybe<Scalars['String']['input']>;
  zone_code?: InputMaybe<Scalars['String']['input']>;
  zone_name: Scalars['String']['input'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type ManualLogInput = {
  body_html: Scalars['String']['input'];
  body_text?: InputMaybe<Scalars['String']['input']>;
  entity_id: Scalars['ID']['input'];
  entity_type: CrmEntityType;
  summary?: InputMaybe<Scalars['String']['input']>;
};

export type MarketingCampaign = {
  __typename?: 'MarketingCampaign';
  audience: MarketingCampaignAudience;
  campaign_id: Scalars['ID']['output'];
  card?: Maybe<MarketingCampaignCard>;
  channel: MarketingCampaignChannel;
  created_at: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  mjml: Scalars['String']['output'];
  name: Scalars['String']['output'];
  recipient_count: Scalars['Int']['output'];
  rendered_html?: Maybe<Scalars['String']['output']>;
  scheduled_at?: Maybe<Scalars['String']['output']>;
  sent_at?: Maybe<Scalars['String']['output']>;
  status: MarketingCampaignStatus;
  subject: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type MarketingCampaignAudience =
  | 'ALL_USERS'
  | 'NEWSLETTER_SUBSCRIBERS';

export type MarketingCampaignCard = {
  __typename?: 'MarketingCampaignCard';
  cta_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  image_url?: Maybe<Scalars['String']['output']>;
  ref_id?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  type?: Maybe<MarketingCampaignCardType>;
};

export type MarketingCampaignCardType =
  | 'CLUB'
  | 'POD';

export type MarketingCampaignChannel =
  | 'EMAIL'
  | 'WHATSAPP';

export type MarketingCampaignInput = {
  audience: MarketingCampaignAudience;
  card_ref_id?: InputMaybe<Scalars['ID']['input']>;
  card_type?: InputMaybe<MarketingCampaignCardType>;
  channel: MarketingCampaignChannel;
  mjml: Scalars['String']['input'];
  name: Scalars['String']['input'];
  scheduled_at?: InputMaybe<Scalars['String']['input']>;
  send_now?: InputMaybe<Scalars['Boolean']['input']>;
  subject: Scalars['String']['input'];
};

export type MarketingCampaignPreviewCard = {
  __typename?: 'MarketingCampaignPreviewCard';
  cta_url?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image_url?: Maybe<Scalars['String']['output']>;
  meta?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: MarketingCampaignCardType;
};

export type MarketingCampaignPreviewInput = {
  card_ref_id?: InputMaybe<Scalars['ID']['input']>;
  card_type?: InputMaybe<MarketingCampaignCardType>;
  mjml: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};

export type MarketingCampaignRender = {
  __typename?: 'MarketingCampaignRender';
  detected_variables: Array<Scalars['String']['output']>;
  errors: Array<Scalars['String']['output']>;
  html: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type MarketingCampaignStatus =
  | 'DRAFT'
  | 'FAILED'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT';

/** Server-side table page for the shared table engine (marketingCampaignsTable). */
export type MarketingCampaignTablePage = {
  __typename?: 'MarketingCampaignTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<MarketingCampaign>;
  total: Scalars['Int']['output'];
};

/** Global onboarding-meeting availability (edited from the Onboarding portal). */
export type MeetingAvailability = {
  __typename?: 'MeetingAvailability';
  end_time: Scalars['String']['output'];
  horizon_days: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  slot_minutes: Scalars['Int']['output'];
  start_time: Scalars['String']['output'];
  timezone_offset_minutes: Scalars['Int']['output'];
  /** Working days, JS getDay() numbering: 0=Sun … 6=Sat. */
  week_days: Array<Scalars['Int']['output']>;
};

export type MeetingAvailabilityInput = {
  end_time?: InputMaybe<Scalars['String']['input']>;
  horizon_days?: InputMaybe<Scalars['Int']['input']>;
  slot_minutes?: InputMaybe<Scalars['Int']['input']>;
  start_time?: InputMaybe<Scalars['String']['input']>;
  timezone_offset_minutes?: InputMaybe<Scalars['Int']['input']>;
  week_days?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Onboarding staff's decision on a DONE meeting. */
export type MeetingDecision =
  | 'APPROVED'
  | 'DENIED';

export type MeetingFilter = {
  from?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<SurveyKind>;
  status?: InputMaybe<MeetingStatus>;
  to?: InputMaybe<Scalars['String']['input']>;
};

/** An onboarding-team holiday / leave day — blocks bookable slots and shows on the calendar. */
export type MeetingHoliday = {
  __typename?: 'MeetingHoliday';
  /** Wall-clock (IST) calendar day as 'YYYY-MM-DD'. */
  date: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  type: HolidayType;
};

export type MeetingLinkResult = {
  __typename?: 'MeetingLinkResult';
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  requires_oauth?: Maybe<Scalars['Boolean']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

/** A bookable onboarding-meeting slot; unavailable when another user holds it. */
export type MeetingSlot = {
  __typename?: 'MeetingSlot';
  available: Scalars['Boolean']['output'];
  end_at: Scalars['String']['output'];
  start_at: Scalars['String']['output'];
};

export type MeetingStatus =
  | 'CANCELLED'
  | 'DONE'
  | 'REQUESTED'
  | 'SCHEDULED';

export type MembershipStatus =
  | 'BACKED_OUT'
  | 'JOINED';

export type ModeratePodContentInput = {
  /** Uploaded cover-image URLs, screened by GPT-4o for nudity / unwanted imagery. */
  image_urls?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_description: Scalars['String']['input'];
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_info?: InputMaybe<Scalars['String']['input']>;
  pod_title: Scalars['String']['input'];
};

export type ModerateProductContentInput = {
  /** Union of every variant's image URLs, screened by GPT-4o. */
  image_urls?: InputMaybe<Array<Scalars['String']['input']>>;
  product_name: Scalars['String']['input'];
  variants?: InputMaybe<Array<ModerateProductVariantInput>>;
};

/** One variant's moderatable text (labels + description). */
export type ModerateProductVariantInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  option_label?: InputMaybe<Scalars['String']['input']>;
  size_label?: InputMaybe<Scalars['String']['input']>;
};

export type ModerationResult = {
  __typename?: 'ModerationResult';
  /** True only when the pod is clean and safe to publish. */
  allowed: Scalars['Boolean']['output'];
  violations: Array<ModerationViolation>;
};

/** Which layer flagged a violation — the deterministic regex pass or the GPT-4o pass. */
export type ModerationStep =
  | 'AI'
  | 'REGEX';

export type ModerationViolation = {
  __typename?: 'ModerationViolation';
  /** The offending snippet (or image URL), when available. */
  evidence?: Maybe<Scalars['String']['output']>;
  /** The pod field that broke a rule: pod_title, pod_description, pod_info, pod_hashtag or image. */
  field: Scalars['String']['output'];
  /** Host-facing explanation of what to fix. */
  message: Scalars['String']['output'];
  step: ModerationStep;
  /** Short machine code, e.g. PHONE, EMAIL, LINK, PAYMENT, ABUSE, NUDITY. */
  type: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acknowledgeBouncerSos: BouncerSosAlert;
  acknowledgeHostRequest: HostRequest;
  /** Submit or update a star rating (1-5) on a club. Requires authentication. */
  addClubRating: Club;
  /** Append an uploaded image to the template's library (persists immediately). */
  addCrmEmailTemplateImage: CrmEmailTemplate;
  addCrmManualLog: CrmActivity;
  addExpenseRefund: Expense;
  /** Onboarding staff add (or update) a holiday / leave day. */
  addMeetingHoliday: MeetingHoliday;
  addPodComment: PodComment;
  addPodIdeaComment: PodIdea;
  addPodStatus: Pod;
  addPostComment: Post;
  addUserRole: User;
  /**  Admin-only: append a delta with an optional remark. Returns the updated score.  */
  adjustHealth: HealthScore;
  /** Admin assistant chat backed by OpenAI with limited internal lookup context. */
  adminAiChat: Scalars['String']['output'];
  adminCreateHost: Host;
  adminCreateVenue: Venue;
  /** Onboarding/admin slot management for any venue (role-gated). */
  adminCreateVenueSlots: Array<VenueSlot>;
  adminDeleteVenueSlot: Scalars['Boolean']['output'];
  /** Onboarding/admin: edit any brand (e.g. complete an approval-created draft) and optionally set its status. */
  adminUpdateEcommBrand: EcommBrand;
  adminUpdateHost: Host;
  adminUpdateVenue: Venue;
  adminUpdateVenueSlot: VenueSlot;
  /** Ops: advance an order's fulfilment status (manual). */
  advanceProductOrderStatus: ProductOrder;
  /** Creates or updates MJML source from an admin prompt. Returns MJML only. */
  aiCreateOrUpdateMjml: Scalars['String']['output'];
  /**
   * Writes a marketing-friendly description for an inventory product given its name and
   * optional brand/type/tags context. Returns a single JSON string with
   * { short_description, description }.
   */
  aiDescribeInventoryProduct: Scalars['String']['output'];
  /**
   * Generates dummy data for a Club / Pod / Inventory Product form using OpenAI.
   * Returns a JSON string that the admin client parses and merges into the form.
   */
  aiFillDummyData: Scalars['String']['output'];
  /**
   * Generates locality / area names with PIN codes for a selected city.
   * Returns JSON with { zones: [{ zone_name, pincode }] }.
   */
  aiFillLocationAreas: Scalars['String']['output'];
  aiParseCrmLead: Scalars['String']['output'];
  /** Extract multiple leads from text — returns JSON { records: [...] }. */
  aiParseCrmLeads: Scalars['String']['output'];
  /** Redeem someone's referral code (once per account, not your own). */
  applyReferralCode: MyReferral;
  /** Onboarding/admin: approve a brand (grants the owner the E-commerce Manager role). */
  approveEcommBrand: EcommBrand;
  approveHost: Host;
  approveHostRequest: HostRequest;
  /** Admin approves a request — runs the request type's side effect (e.g. drafts the onboarded host/venue/seller, or applies an ecomm change). */
  approveRequest: ApprovalRequest;
  approveVenue: Venue;
  /** Owner approves a pending booking request — the pod goes live. */
  approveVenueSlotRequest: VenueSlot;
  archiveInventoryProduct: InventoryProduct;
  assignTicket: Ticket;
  assignUserRoles: User;
  awardBadgeManually: UserBadge;
  backoutPod: PodMember;
  /** Bulk-manage a venue's upcoming non-booked slots (owner-scoped). */
  bulkDeleteVenueSlots: BulkSlotResult;
  bulkUpdateVenueSlots: BulkSlotResult;
  callEcommLeadContact: LeadContactActionResult;
  callHostLeadContact: LeadContactActionResult;
  callVenueLeadContact: LeadContactActionResult;
  /** Onboarding staff cancel a meeting with a reason — the applicant is emailed and asked to fill the survey again. */
  cancelMeeting: OnboardingMeeting;
  /** Cancel the caller's own pending meeting (with a reason). */
  cancelMyMeeting: OnboardingMeeting;
  /** Auth-required: confirm the OTP and set the new password. */
  changePasswordWithOtp: Scalars['Boolean']['output'];
  checkInEventTicket: EventTicket;
  /** Agent picks up an unassigned chat — announced as a SYSTEM bubble. */
  claimSupportChat: SupportChatSession;
  cloneLegalDocument: LegalDocument;
  closeBouncerCallback: BouncerCallbackRequest;
  closeSupportChat: SupportChatSession;
  /** Create a pod under a club the signed-in user administers. */
  clubAdminCreatePod: Pod;
  /** Soft-delete a pod in one of the signed-in user's clubs. */
  clubAdminDeletePod: Scalars['Boolean']['output'];
  /** Edit a club the signed-in user administers (governance fields are ignored). */
  clubAdminUpdateClub: Club;
  /** Edit any field of a pod in one of the signed-in user's clubs. */
  clubAdminUpdatePod: Pod;
  completePodSettlement: PodSettlementResult;
  createAiPrompt: AiPrompt;
  createApiKey: CreatedApiKey;
  createBadge: Badge;
  createCategory: Category;
  createChallenge: Challenge;
  createClub: Club;
  createCommsProvider: CommsProvider;
  createCoupon: Coupon;
  createCrmCallPrompt: CrmCallPrompt;
  createCrmDynamicField: CrmDynamicField;
  createCrmEmailTemplate: CrmEmailTemplate;
  createCrmManagedOption: CrmManagedOption;
  createCrmReminder: CrmReminder;
  createCrmService: CrmService;
  createCrmServicesOffered: Array<CrmServiceOffered>;
  createEcommLead: EcommLead;
  createEmailTemplate: EmailTemplate;
  createEnvEntry: EnvEntry;
  createExpense: Expense;
  createFaq: Faq;
  createFeatureFlag: FeatureFlag;
  createHostLead: HostLead;
  createInterview: Interview;
  createInventoryProduct: InventoryProduct;
  createLegalDocument: LegalDocument;
  createLocation: Location;
  createMarketingCampaign: MarketingCampaign;
  createNotification: Notification;
  createPartnerPod: Pod;
  createPaymentReleaseRequest: PaymentReleaseRequest;
  createPod: Pod;
  createPodIdea: PodIdea;
  createPodPlan: PodPlan;
  createPolicy: Policy;
  createPost: Post;
  /** Ops: create/retry the ShipRocket shipment for a SHIP order. */
  createProductOrderShipment: ProductOrder;
  /** Create or update the caller's review of a product. */
  createProductReview: ProductReview;
  createRazorpayOrder: RazorpayOrder;
  createRole: Role;
  createSlotTemplate: SlotTemplate;
  createSurvey: Survey;
  createTicket: Ticket;
  createUser: User;
  createVenueLead: VenueLead;
  createVenueSlots: Array<VenueSlot>;
  createWebsiteContent: WebsiteContentItem;
  createWebsiteNavItem: WebsiteNavItem;
  crmDeleteWebsitePage: Scalars['Boolean']['output'];
  crmExcelImport: CrmExcelImportResult;
  /** Fetch + extract readable content for a single discovered page. */
  crmFetchWebsitePageContent: CrmWebsitePage;
  /** Chat about one lead, grounded in its CRM data + scraped website content. Returns HTML. */
  crmLeadAiChat: Scalars['String']['output'];
  /** Discover up to `limit` pages from the lead's website and save them. */
  crmScrapeWebsitePages: CrmWebsiteScrapeResult;
  /** Onboarding staff approve or deny a DONE meeting themselves — approval drafts the onboarded host/venue/seller (or grants the club-admin role). No admin round-trip. */
  decideMeeting: OnboardingMeeting;
  /** Owner declines a pending booking request — the slot frees up again. */
  declineVenueSlotRequest: VenueSlot;
  /**  Admin-only: delete an adjustment. Returns the recomputed score.  */
  deleteAdjustment: HealthScore;
  deleteAiPrompt: Scalars['Boolean']['output'];
  deleteBadge: Scalars['Boolean']['output'];
  deleteBrandPickupLocation: Scalars['Boolean']['output'];
  deleteCategory: Scalars['Boolean']['output'];
  deleteChallenge: Scalars['Boolean']['output'];
  deleteClub: Scalars['Boolean']['output'];
  deleteCommsProvider: Scalars['Boolean']['output'];
  deleteCoupon: Scalars['Boolean']['output'];
  deleteCrmCallPrompt: Scalars['Boolean']['output'];
  deleteCrmDynamicField: Scalars['Boolean']['output'];
  deleteCrmEmailTemplate: Scalars['Boolean']['output'];
  deleteCrmManagedOption: Scalars['Boolean']['output'];
  deleteCrmReminder: Scalars['Boolean']['output'];
  deleteCrmService: Scalars['Boolean']['output'];
  deleteCrmServiceOffered: Scalars['Boolean']['output'];
  /** Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the brand still has products. */
  deleteEcommBrand: Scalars['Boolean']['output'];
  deleteEcommLead: Scalars['Boolean']['output'];
  deleteEmailTemplate: Scalars['Boolean']['output'];
  deleteEnvEntry: Scalars['Boolean']['output'];
  deleteExpense: Scalars['Boolean']['output'];
  deleteExpoPushToken: Scalars['Boolean']['output'];
  deleteFaq: Scalars['Boolean']['output'];
  deleteFeatureFlag: Scalars['Boolean']['output'];
  /** Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the host still has live pods. */
  deleteHost: Scalars['Boolean']['output'];
  deleteHostLead: Scalars['Boolean']['output'];
  /** Onboarding: permanently remove a host request record. */
  deleteHostRequest: Scalars['Boolean']['output'];
  deleteInterview: Scalars['Boolean']['output'];
  deleteInventoryProduct: Scalars['Boolean']['output'];
  deleteJobApplication: Scalars['Boolean']['output'];
  deleteLeadSurveyEntry: Scalars['Boolean']['output'];
  deleteLegalDocument: Scalars['Boolean']['output'];
  deleteLocation: Scalars['Boolean']['output'];
  /** Auth-required: confirm the OTP and soft-delete (and anonymize) the account. */
  deleteMyAccount: Scalars['Boolean']['output'];
  deleteMyProductListing: Scalars['Boolean']['output'];
  deleteNotification: Scalars['Boolean']['output'];
  deletePod: Scalars['Boolean']['output'];
  deletePodComment: Scalars['Boolean']['output'];
  deletePodDraft: Scalars['Boolean']['output'];
  deletePodIdea: Scalars['Boolean']['output'];
  deletePodIdeaComment: PodIdea;
  deletePodMessage?: Maybe<PodMessage>;
  deletePodPlan: Scalars['Boolean']['output'];
  deletePolicy: Scalars['Boolean']['output'];
  deletePost: Scalars['Boolean']['output'];
  deletePostComment: Post;
  deletePushSubscription: Scalars['Boolean']['output'];
  deleteRole: Scalars['Boolean']['output'];
  deleteSlotTemplate: Scalars['Boolean']['output'];
  deleteSurvey: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  deleteUserActivityDay: Scalars['Boolean']['output'];
  deleteUserActivityYear: Scalars['Boolean']['output'];
  deleteUserContactAction: Scalars['Boolean']['output'];
  /** Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the venue still has live pods/booked slots. */
  deleteVenue: Scalars['Boolean']['output'];
  deleteVenueLead: Scalars['Boolean']['output'];
  deleteVenueSlot: Scalars['Boolean']['output'];
  deleteWebsiteContent: Scalars['Boolean']['output'];
  deleteWebsiteNavItem: Scalars['Boolean']['output'];
  /** Admin denies a request. */
  denyRequest: ApprovalRequest;
  /** Onboarding staff remove a cancelled meeting from the calendar (kept for audit). */
  dismissMeeting: OnboardingMeeting;
  dummyCheckout: Payment;
  duplicateInventoryProduct: InventoryProduct;
  /**  Admin-only: edit an existing adjustment's delta/remark in place. Returns the recomputed score.  */
  editAdjustment: HealthScore;
  emailEcommLeadContact: LeadContactActionResult;
  emailHostLeadContact: LeadContactActionResult;
  /** Email the chat transcript to an address (defaults to a .docx attachment). */
  emailSupportChatTranscript: Scalars['Boolean']['output'];
  /** Email the ticket transcript to an address (defaults to a .docx attachment). */
  emailTicketTranscript: Scalars['Boolean']['output'];
  emailVenueLeadContact: LeadContactActionResult;
  followClub: User;
  followPod: User;
  followUser: User;
  generateInventorySku: Scalars['String']['output'];
  generateLeadSurveyLink: LeadSurveyEntry;
  generateMeetingLink: MeetingLinkResult;
  /**
   * Returns short-lived auth params so the browser can upload directly to
   * ImageKit using the official upload widget. The private key never leaves
   * the server.
   */
  getImagekitAuth: ImagekitAuth;
  grantAdminAccess: User;
  hostDeletePod: Scalars['Boolean']['output'];
  hostUpdatePod: Pod;
  /**
   * Server-side import of a remote image (e.g. a Pexels stock photo) into our
   * own ImageKit account. Returns the final ImageKit URL.
   */
  importRemoteImageToImagekit: UploadedImage;
  /**
   * Server-side import of a remote image OR video (e.g. Pexels stock video).
   * Returns the final ImageKit URL.
   */
  importRemoteMediaToImagekit: UploadedImage;
  incrementPodHits: Pod;
  /** Primary host invites a co-host. Enforces the sub-category's allow_co_hosts + max_co_hosts. */
  inviteCoHost: Pod;
  joinFreePod: PodMember;
  login: AuthPayload;
  loginWithGoogle: AuthPayload;
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markBouncerCallbackContacted: BouncerCallbackRequest;
  markNotificationRead: Scalars['Boolean']['output'];
  markSupportChatRead: SupportChatSession;
  /** Mark a ticket thread read (owner or agent) — updates the side's last-read so the other side's ticks turn 'Seen' (B12). */
  markTicketRead: Ticket;
  /** Deep-analyses a pod's content against community guidelines before publishing. */
  moderatePodContent: ModerationResult;
  /** Deep-analyses a product listing's content against community guidelines before submit. */
  moderateProductContent: ModerationResult;
  permanentlyDeleteInventoryProduct: Scalars['Boolean']['output'];
  publishPodDraft: Pod;
  raiseBouncerSos: BouncerSosAlert;
  reactToPodMessage: PodMessage;
  /** Re-sync a non-terminal call's status from Twilio (fallback when the async callback is missed). */
  reconcileCrmCall: CrmAiCallResult;
  recordActivePing: Scalars['Boolean']['output'];
  recordAppEvent: Scalars['Boolean']['output'];
  recordInventoryStockMovement: InventoryProduct;
  /** Record that the signed-in viewer opened this story; idempotent (Bugs 2 & 4). */
  recordStoryView: Post;
  recordUserContactAction: UserContactAction;
  redeemPodReferral: PodMember;
  /** Ops: pull the latest tracking from ShipRocket. */
  refreshProductOrderTracking: ProductOrder;
  refundPayment: Payment;
  register: AuthPayload;
  /** Register the location with ShipRocket so SHIP orders can pick up from it. */
  registerBrandPickupWithShiprocket: BrandPickupLocation;
  /** Onboarding/admin: reject a brand with notes. */
  rejectEcommBrand: EcommBrand;
  rejectHost: Host;
  rejectHostRequest: HostRequest;
  rejectVenue: Venue;
  /** Rejoin a pod the caller previously backed out of — no payment, until the pod completes. */
  rejoinPod: PodMember;
  /** Primary host withdraws an invite / removes a co-host. */
  removeCoHost: Pod;
  removeCrmEmailTemplateImage: CrmEmailTemplate;
  removeExpenseRefund: Expense;
  /** Onboarding staff remove a holiday / leave day. */
  removeMeetingHoliday: Scalars['Boolean']['output'];
  removeUserRole: User;
  /** Re-open a resolved/closed chat (user within 3 days, or an agent). Reason logged to the thread. */
  reopenSupportChat: SupportChatSession;
  /** Re-open a resolved/closed ticket (owner within 3 days, or an agent). Reason logged to the thread. */
  reopenTicket: Ticket;
  reorderCrmDynamicFields: Array<CrmDynamicField>;
  /** Seller reply to a review of their own product (single reply). */
  replyToProductReview: ProductReview;
  replyToTicket: Ticket;
  /** Auth-required: email a confirmation OTP before self-serve account deletion. */
  requestAccountDeletionOtp: OtpRequestResult;
  requestBouncerCallback: BouncerCallbackRequest;
  /**
   * Triggers (or retries) the Servam-AI transcript pipeline for a CALL log.
   * Returns the log with transcript_status flipped to PENDING.
   */
  requestCommunicationTranscript: CommunicationLog;
  requestEmailVerificationOtp: OtpRequestResult;
  requestMeeting: OnboardingMeeting;
  /** Auth-required: verify the current password and email a change-confirmation OTP. */
  requestPasswordChangeOtp: OtpRequestResult;
  requestPasswordResetOtp: OtpRequestResult;
  requestWhatsAppOtp: WhatsAppOtpRequestResult;
  requestWithdrawal: WalletWithdrawal;
  /** Move the caller's own meeting to a new open slot (one-time; keeps contact details, resets staff scheduling). */
  rescheduleMyMeeting: OnboardingMeeting;
  resetPasswordWithOtp: Scalars['Boolean']['output'];
  resolveBouncerSos: BouncerSosAlert;
  /** The user (or an agent) marks the chat resolved — same as close, owner-allowed. */
  resolveSupportChat: SupportChatSession;
  /** Mark a ticket resolved (owner OR an agent) — appends a SYSTEM timeline bubble. */
  resolveTicket: Ticket;
  /** The invited user accepts or declines. */
  respondToCoHostInvite: Pod;
  restoreInventoryProduct: InventoryProduct;
  /** Marketing approves (freezes cost) or rejects, with remarks. */
  reviewAdRequest: AdRequest;
  reviewPaymentReleaseRequest: PaymentReleaseRequest;
  reviewProductListing: InventoryProduct;
  /** Approve or reject a user's IDENTITY/ADDRESS verification — admin only. */
  reviewVerification: Verification;
  reviewWithdrawal: WalletWithdrawal;
  revokeAdminAccess: User;
  revokeApiKey: ApiKey;
  revokeBadge: Scalars['Boolean']['output'];
  revokeLeadSurveyLink: Scalars['Boolean']['output'];
  saveBrandPickupLocation: BrandPickupLocation;
  /** Partner: create a new brand (omit brand_doc_id) or update an owned draft. */
  saveEcommBrand: EcommBrand;
  /** Register a native (Expo) push token for the signed-in device. */
  saveExpoPushToken: Scalars['Boolean']['output'];
  /** Save a founder setting (constant / manual metric value). */
  saveFounderSetting: FounderSettingKv;
  saveLeadSurveyResponse: LeadSurveyEntry;
  savePodDraft: PodDraft;
  savePushSubscription: Scalars['Boolean']['output'];
  seedSuperAdmin: SeedAdminResult;
  /**
   * Emails the mobile-app release distribution list an APK download link plus an
   * OpenAI-summarised changelog built from the supplied git commits. Tech/Super
   * admin only; SMTP + OpenAI credentials come from the Tech portal env entries.
   */
  sendAppReleaseEmail: AppReleaseEmailResult;
  sendCrmTestEmail: CrmEmailTestResult;
  sendMarketingCampaign: MarketingCampaign;
  sendPodMessage: PodMessage;
  sendSupportChatMessage: SupportChatMessage;
  sendTestEmail: EmailTestResult;
  /** Onboarding/finance: brand-level Duncit commission %% override on product sales (0 = inherit). */
  setBrandCommission: EcommBrand;
  setDefaultBrandPickupLocation: BrandPickupLocation;
  setDefaultCommsProvider: CommsProvider;
  setDefaultEnvEntry: EnvEntry;
  setDefaultSlotTemplate: SlotTemplate;
  /** Onboarding/admin: deactivate/reactivate a brand — hides it + its products from the marketplace and pod product picker (reversible). */
  setEcommBrandActive: EcommBrand;
  setFeatureFlag: FeatureFlag;
  setHostActive: Host;
  setHostDeductions: Scalars['Boolean']['output'];
  /** Persist the user's selected header location (pass null to clear). */
  setMySelectedLocation: User;
  setPodIdeaStatus: PodIdea;
  /** Replace the full set of entries assigned to a portal. */
  setPortalEnvEntries: Array<EnvEntry>;
  setPortalMode: PortalMode;
  /** Ops: switch an order between SHIP and PICKUP. */
  setProductOrderFulfilmentMethod: ProductOrder;
  setVenueActive: Venue;
  setVenueDeductions: Venue;
  sharePodIdea: PodIdea;
  signupWithGoogle: AuthPayload;
  skipWhatsAppOtp: User;
  /** Place an outbound AI call (Servam-driven) using a Static Content prompt and Servam voice. */
  startCrmAiCall: CrmAiCallResult;
  /** Place a portal call: Twilio rings the agent leg (agent_number, else the user's profile phone), then bridges to the customer. */
  startCrmPortalCall: CrmAiCallResult;
  startRecordedUserCall: UserContactAction;
  startSupportChat: SupportChatSession;
  /** Advertiser submits a request; server quotes the cost and assigns the trace id. */
  submitAdRequest: AdRequest;
  /** Submit a structured address for ADDRESS verification — moves it to PENDING. */
  submitAddressVerification: Verification;
  submitBouncerFeedback: BouncerFeedback;
  submitContactForm: ContactSubmitResult;
  /** Partner: submit an owned brand for onboarding review. */
  submitEcommBrand: EcommBrand;
  /** Products portal: raise a brand/product change request for admin approval (Task B item 2). */
  submitEcommChangeRequest: ApprovalRequest;
  submitFaqQuestion: FaqSubmitResult;
  submitHostFinal: Host;
  submitHostRequest: HostRequest;
  submitHostStep1: Host;
  submitHostStep2: Host;
  submitHostStep3: Host;
  /** Public: apply to an open role from the careers page. */
  submitJobApplication: JobApplicationResult;
  /** Public — submit answers via a share token (no auth). */
  submitLeadSurveyByToken: Scalars['Boolean']['output'];
  submitProductListing: InventoryProduct;
  /** Leave a 1-5 satisfaction rating + optional comment on a chat. */
  submitSupportChatFeedback: SupportChatSession;
  submitSurveyResponse: SurveyResponse;
  /** Leave a 1-5 satisfaction rating + optional comment on a resolved/closed ticket (owner-only, one-time). */
  submitTicketFeedback: Ticket;
  submitVenueFinal: Venue;
  /** venue_id targets a specific editable (DRAFT/REJECTED) venue of the owner; omitted = current draft (created if needed). */
  submitVenueStep1: Venue;
  submitVenueStep2: Venue;
  submitVenueStep3: Venue;
  /** Submit/replace an IDENTITY document — moves it to PENDING. */
  submitVerification: Verification;
  subscribeNewsletter: NewsletterSubscribeResult;
  /** Support agents can create a user account on a caller's behalf. */
  supportCreateUser: User;
  testCommsProvider: CommsProviderTestResult;
  /** Interactive tests — these perform REAL actions (send email, place calls, upload, AI calls). */
  testEnvEmail: EnvTestRichResult;
  testEnvEntry: EnvTestResult;
  testEnvGemini: EnvTestRichResult;
  testEnvImagekitUpload: EnvTestRichResult;
  testEnvOpenai: EnvTestRichResult;
  testEnvPexels: EnvTestRichResult;
  testEnvTwilioCall: EnvTestRichResult;
  toggleCrmReminderDone: CrmReminder;
  /** Like/unlike a pod comment — returns the updated comment (explore item 4). */
  togglePodCommentLike: PodComment;
  togglePodIdeaLike: PodIdea;
  togglePodLike: Pod;
  togglePostLike: Post;
  toggleSavedPod: SavedPodState;
  unfollowClub: User;
  unfollowPod: User;
  unfollowUser: User;
  unsubscribeNewsletter: Scalars['Boolean']['output'];
  /** Marketing edits per-position per-day pricing. */
  updateAdPricing: AdPricing;
  updateAiPrompt: AiPrompt;
  updateAppSettings: AppSettings;
  /** Owner edits the editable subset of an APPROVED venue (documents append-only). */
  updateApprovedVenue: Venue;
  updateBadge: Badge;
  updateBranding: Branding;
  updateCategory: Category;
  updateChallenge: Challenge;
  updateClub: Club;
  updateCommsProvider: CommsProvider;
  updateContactStatus: ContactSubmission;
  updateCoupon: Coupon;
  updateCrmCallPrompt: CrmCallPrompt;
  updateCrmDynamicField: CrmDynamicField;
  updateCrmEmailTemplate: CrmEmailTemplate;
  updateCrmManagedOption: CrmManagedOption;
  updateCrmReminder: CrmReminder;
  updateCrmService: CrmService;
  updateCrmServiceOffered: CrmServiceOffered;
  updateEcommLead: EcommLead;
  updateEmailTemplate: EmailTemplate;
  updateEnvEntry: EnvEntry;
  updateExpense: Expense;
  updateFaq: Faq;
  updateFaqSubmissionStatus: FaqSubmission;
  updateFeatureFlag: FeatureFlag;
  updateFinanceSettings: FinanceSettings;
  updateHostLead: HostLead;
  updateInterview: Interview;
  updateInventoryProduct: InventoryProduct;
  updateJobApplicationStatus: JobApplication;
  updateLegalDocument: LegalDocument;
  updateLocation: Location;
  updateMeeting: OnboardingMeeting;
  updateMeetingAvailability: MeetingAvailability;
  updateMyInterests: User;
  updateMyPetProfile: User;
  updateMyProductListing: InventoryProduct;
  updateMyProductListingQuantity: InventoryProduct;
  /** Update a listing's low-stock threshold + notify toggle without re-triggering approval. */
  updateMyProductSettings: InventoryProduct;
  updateMyProfile: User;
  updateMyProfileVisibility: User;
  updatePod: Pod;
  updatePodIdea: PodIdea;
  updatePodPlan: PodPlan;
  updatePolicy: Policy;
  /** Admin: set the gift shown to users for referring friends. */
  updateReferralGift: ReferralSettings;
  updateRole: Role;
  updateSurvey: Survey;
  /** Set a ticket's priority flag (High/Medium/Low) — support agents only. */
  updateTicketPriority: Ticket;
  updateTicketStatus: Ticket;
  updateUser: User;
  updateVenueLead: VenueLead;
  /** Owner (or admin) updates operating hours, weekly-off, holidays + booking rules. */
  updateVenueSettings: Venue;
  updateVenueSlot: VenueSlot;
  updateWebsiteContent: WebsiteContentItem;
  updateWebsiteNavItem: WebsiteNavItem;
  /**
   * Server-side ImageKit upload for admin/device files. This avoids browser
   * signature failures by keeping the private-key upload on the API server.
   */
  uploadImageToImagekit: UploadedImage;
  verifyEmailVerificationOtp: User;
  verifyEventTicketQr: EventTicketVerifyResult;
  verifyRazorpayPayment: Payment;
  verifyWhatsAppOtp: User;
  /** Thumbs up/down a review. vote: 1 up, -1 down, 0 clears. */
  voteProductReview: ProductReview;
  /** Cancel the running extraction job. */
  waCancelExtraction?: Maybe<WaExtraction>;
  /** Database cleanup: drop invalid-phone records + de-duplicate leads. */
  waCleanData: WaCleanResult;
  /** Create/start the session so a QR can be scanned. */
  waConnect: WaConnection;
  /** Manually create (or upsert) a single user lead. */
  waCreateUserLead: WaUserLead;
  /** Delete a single user lead. */
  waDeleteUserLead: Scalars['Boolean']['output'];
  /** Bulk-delete user leads by id; returns the number removed. */
  waDeleteUserLeads: Scalars['Int']['output'];
  waDisconnect: WaConnection;
  /** Mint a dedicated gateway API key from your master/admin key and save it. */
  waGenerateApiKey: WaGeneratedKey;
  /** Import user leads from an uploaded .xlsx/.csv (base64). */
  waImportUserLeads: WaImportResult;
  /** Synchronous pull of latest communities/groups/contacts into the cache. */
  waRefresh: WaSyncResult;
  waSaveConfig: WaConnection;
  /** Start a non-blocking background extraction; poll waExtraction for progress. */
  waStartExtraction: WaExtraction;
  /** Edit a single user lead's name and/or phone. */
  waUpdateUserLead?: Maybe<WaUserLead>;
  /** Partner: pull a submitted brand back to draft for edits. */
  withdrawEcommBrand: EcommBrand;
  withdrawHostApplication: Host;
};


export type MutationAcknowledgeBouncerSosArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAcknowledgeHostRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddClubRatingArgs = {
  club_doc_id: Scalars['ID']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  stars: Scalars['Int']['input'];
};


export type MutationAddCrmEmailTemplateImageArgs = {
  image: CrmEmailAssetInput;
  template_id: Scalars['ID']['input'];
};


export type MutationAddCrmManualLogArgs = {
  input: ManualLogInput;
};


export type MutationAddExpenseRefundArgs = {
  expense_doc_id: Scalars['ID']['input'];
  input: AddExpenseRefundInput;
};


export type MutationAddMeetingHolidayArgs = {
  input: AddMeetingHolidayInput;
};


export type MutationAddPodCommentArgs = {
  pod_doc_id: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationAddPodIdeaCommentArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationAddPodStatusArgs = {
  media: PodMediaInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationAddPostCommentArgs = {
  post_doc_id: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationAddUserRoleArgs = {
  role_key: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationAdjustHealthArgs = {
  input: AdjustHealthInput;
};


export type MutationAdminAiChatArgs = {
  prompt: Scalars['String']['input'];
};


export type MutationAdminCreateHostArgs = {
  step1: HostStep1Input;
  step2: HostStep2Input;
  step3: HostStep3Input;
  submit?: InputMaybe<Scalars['Boolean']['input']>;
  target_user_id: Scalars['ID']['input'];
};


export type MutationAdminCreateVenueArgs = {
  owner_user_id: Scalars['ID']['input'];
  step1: VenueStep1Input;
  step2: VenueStep2Input;
  step3: VenueStep3Input;
  submit?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationAdminCreateVenueSlotsArgs = {
  input: BulkCreateVenueSlotsInput;
};


export type MutationAdminDeleteVenueSlotArgs = {
  slot_id: Scalars['ID']['input'];
};


export type MutationAdminUpdateEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
  input: EcommBrandInput;
  status?: InputMaybe<EcommBrandStatus>;
};


export type MutationAdminUpdateHostArgs = {
  categories?: InputMaybe<Array<HostCategoryInput>>;
  host_doc_id: Scalars['ID']['input'];
  status?: InputMaybe<HostStatus>;
  step1: HostStep1Input;
  step2: HostStep2Input;
  step3: HostStep3Input;
};


export type MutationAdminUpdateVenueArgs = {
  status?: InputMaybe<VenueStatus>;
  step1: VenueStep1Input;
  step2: VenueStep2Input;
  step3: VenueStep3Input;
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationAdminUpdateVenueSlotArgs = {
  input: UpdateVenueSlotInput;
  slot_id: Scalars['ID']['input'];
};


export type MutationAdvanceProductOrderStatusArgs = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  status: FulfilmentStatus;
};


export type MutationAiCreateOrUpdateMjmlArgs = {
  input: AiMjmlTemplateInput;
};


export type MutationAiDescribeInventoryProductArgs = {
  input: AiProductDescribeInput;
};


export type MutationAiFillDummyDataArgs = {
  entity: AiDummyEntity;
  prompt?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAiFillLocationAreasArgs = {
  input: AiLocationAreasInput;
};


export type MutationAiParseCrmLeadArgs = {
  entity: CrmAiEntity;
  text: Scalars['String']['input'];
};


export type MutationAiParseCrmLeadsArgs = {
  entity: CrmAiEntity;
  text: Scalars['String']['input'];
};


export type MutationApplyReferralCodeArgs = {
  code: Scalars['String']['input'];
};


export type MutationApproveEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationApproveHostArgs = {
  host_doc_id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationApproveHostRequestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveRequestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveVenueArgs = {
  notes?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationApproveVenueSlotRequestArgs = {
  slot_id: Scalars['ID']['input'];
};


export type MutationArchiveInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationAssignTicketArgs = {
  assignee_id?: InputMaybe<Scalars['ID']['input']>;
  ticket_id: Scalars['ID']['input'];
};


export type MutationAssignUserRolesArgs = {
  role_keys: Array<Scalars['String']['input']>;
  user_id: Scalars['ID']['input'];
};


export type MutationAwardBadgeManuallyArgs = {
  badge_doc_id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  user_id: Scalars['ID']['input'];
};


export type MutationBackoutPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationBulkDeleteVenueSlotsArgs = {
  input: BulkDeleteVenueSlotsInput;
};


export type MutationBulkUpdateVenueSlotsArgs = {
  input: BulkUpdateVenueSlotsInput;
};


export type MutationCallEcommLeadContactArgs = {
  contact_number: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCallHostLeadContactArgs = {
  contact_number: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCallVenueLeadContactArgs = {
  contact_number: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCancelMeetingArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationCancelMyMeetingArgs = {
  kind: SurveyKind;
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationChangePasswordWithOtpArgs = {
  input: ChangePasswordInput;
};


export type MutationCheckInEventTicketArgs = {
  input: CheckInEventTicketInput;
};


export type MutationClaimSupportChatArgs = {
  session_id: Scalars['ID']['input'];
};


export type MutationCloneLegalDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCloseBouncerCallbackArgs = {
  conclusion?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationCloseSupportChatArgs = {
  session_id: Scalars['ID']['input'];
};


export type MutationClubAdminCreatePodArgs = {
  input: CreatePodInput;
};


export type MutationClubAdminDeletePodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationClubAdminUpdateClubArgs = {
  club_doc_id: Scalars['ID']['input'];
  input: UpdateClubInput;
};


export type MutationClubAdminUpdatePodArgs = {
  input: UpdatePodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationCompletePodSettlementArgs = {
  input: CompletePodInput;
};


export type MutationCreateAiPromptArgs = {
  input: CreateAiPromptInput;
};


export type MutationCreateApiKeyArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreateBadgeArgs = {
  input: CreateBadgeInput;
};


export type MutationCreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationCreateChallengeArgs = {
  input: CreateChallengeInput;
};


export type MutationCreateClubArgs = {
  input: CreateClubInput;
};


export type MutationCreateCommsProviderArgs = {
  input: CreateCommsProviderInput;
};


export type MutationCreateCouponArgs = {
  input: CreateCouponInput;
};


export type MutationCreateCrmCallPromptArgs = {
  input: CreateCrmCallPromptInput;
};


export type MutationCreateCrmDynamicFieldArgs = {
  input: CrmDynamicFieldInput;
};


export type MutationCreateCrmEmailTemplateArgs = {
  input: CreateCrmEmailTemplateInput;
};


export type MutationCreateCrmManagedOptionArgs = {
  input: CreateCrmManagedOptionInput;
};


export type MutationCreateCrmReminderArgs = {
  input: CreateCrmReminderInput;
};


export type MutationCreateCrmServiceArgs = {
  input: CrmServiceInput;
};


export type MutationCreateCrmServicesOfferedArgs = {
  input: CreateCrmServiceOfferedInput;
};


export type MutationCreateEcommLeadArgs = {
  input: EcommLeadInput;
};


export type MutationCreateEmailTemplateArgs = {
  input: CreateEmailTemplateInput;
};


export type MutationCreateEnvEntryArgs = {
  input: CreateEnvEntryInput;
};


export type MutationCreateExpenseArgs = {
  input: CreateExpenseInput;
};


export type MutationCreateFaqArgs = {
  input: CreateFaqInput;
};


export type MutationCreateFeatureFlagArgs = {
  input: CreateFeatureFlagInput;
};


export type MutationCreateHostLeadArgs = {
  input: HostLeadInput;
};


export type MutationCreateInterviewArgs = {
  input: CreateInterviewInput;
};


export type MutationCreateInventoryProductArgs = {
  input: InventoryProductInput;
};


export type MutationCreateLegalDocumentArgs = {
  input: CreateLegalDocumentInput;
};


export type MutationCreateLocationArgs = {
  input: CreateLocationInput;
};


export type MutationCreateMarketingCampaignArgs = {
  input: MarketingCampaignInput;
};


export type MutationCreateNotificationArgs = {
  input: CreateNotificationInput;
};


export type MutationCreatePartnerPodArgs = {
  input: CreatePodInput;
};


export type MutationCreatePaymentReleaseRequestArgs = {
  input: CreatePaymentReleaseInput;
};


export type MutationCreatePodArgs = {
  input: CreatePodInput;
};


export type MutationCreatePodIdeaArgs = {
  input: CreatePodIdeaInput;
};


export type MutationCreatePodPlanArgs = {
  input: PodPlanInput;
};


export type MutationCreatePolicyArgs = {
  input: CreatePolicyInput;
};


export type MutationCreatePostArgs = {
  input: CreatePostInput;
};


export type MutationCreateProductOrderShipmentArgs = {
  id: Scalars['ID']['input'];
  pickup_location?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateProductReviewArgs = {
  input: CreateProductReviewInput;
};


export type MutationCreateRazorpayOrderArgs = {
  input: RazorpayOrderInput;
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


export type MutationCreateSlotTemplateArgs = {
  input: CreateSlotTemplateInput;
};


export type MutationCreateSurveyArgs = {
  input: CreateSurveyInput;
};


export type MutationCreateTicketArgs = {
  input: CreateTicketInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationCreateVenueLeadArgs = {
  input: VenueLeadInput;
};


export type MutationCreateVenueSlotsArgs = {
  input: BulkCreateVenueSlotsInput;
};


export type MutationCreateWebsiteContentArgs = {
  input: WebsiteContentInput;
};


export type MutationCreateWebsiteNavItemArgs = {
  input: WebsiteNavItemInput;
};


export type MutationCrmDeleteWebsitePageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCrmExcelImportArgs = {
  content_base64: Scalars['String']['input'];
  entity: CrmAiEntity;
  mapping?: InputMaybe<Array<CrmImportMappingInput>>;
};


export type MutationCrmFetchWebsitePageContentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCrmLeadAiChatArgs = {
  entity: CrmAiEntity;
  lead_id: Scalars['ID']['input'];
  messages: Array<CrmChatMessageInput>;
};


export type MutationCrmScrapeWebsitePagesArgs = {
  entity_type: CrmEntityType;
  lead_id: Scalars['ID']['input'];
  limit: Scalars['Int']['input'];
};


export type MutationDecideMeetingArgs = {
  decision: MeetingDecision;
  feedback: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDeclineVenueSlotRequestArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  slot_id: Scalars['ID']['input'];
};


export type MutationDeleteAdjustmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAiPromptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteBrandPickupLocationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  category_id: Scalars['ID']['input'];
};


export type MutationDeleteChallengeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteClubArgs = {
  club_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteCommsProviderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCouponArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmCallPromptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmDynamicFieldArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmEmailTemplateArgs = {
  template_id: Scalars['ID']['input'];
};


export type MutationDeleteCrmManagedOptionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmReminderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmServiceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCrmServiceOfferedArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationDeleteEcommLeadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEmailTemplateArgs = {
  template_id: Scalars['ID']['input'];
};


export type MutationDeleteEnvEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteExpenseArgs = {
  expense_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteExpoPushTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationDeleteFaqArgs = {
  faq_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteFeatureFlagArgs = {
  flag_id: Scalars['ID']['input'];
};


export type MutationDeleteHostArgs = {
  email: Scalars['String']['input'];
  host_doc_id: Scalars['ID']['input'];
  password: Scalars['String']['input'];
};


export type MutationDeleteHostLeadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteHostRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteInterviewArgs = {
  interview_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteJobApplicationArgs = {
  application_id: Scalars['ID']['input'];
};


export type MutationDeleteLeadSurveyEntryArgs = {
  entry_id: Scalars['ID']['input'];
};


export type MutationDeleteLegalDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLocationArgs = {
  location_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteMyAccountArgs = {
  input: DeleteMyAccountInput;
};


export type MutationDeleteMyProductListingArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteNotificationArgs = {
  notification_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePodCommentArgs = {
  comment_id: Scalars['ID']['input'];
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePodDraftArgs = {
  draft_id: Scalars['ID']['input'];
};


export type MutationDeletePodIdeaArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePodIdeaCommentArgs = {
  comment_id: Scalars['ID']['input'];
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePodMessageArgs = {
  message_id: Scalars['ID']['input'];
};


export type MutationDeletePodPlanArgs = {
  plan_id: Scalars['ID']['input'];
};


export type MutationDeletePolicyArgs = {
  policy_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePostArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePostCommentArgs = {
  comment_id: Scalars['ID']['input'];
  post_doc_id: Scalars['ID']['input'];
};


export type MutationDeletePushSubscriptionArgs = {
  endpoint: Scalars['String']['input'];
};


export type MutationDeleteRoleArgs = {
  role_id: Scalars['ID']['input'];
};


export type MutationDeleteSlotTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationDeleteUserActivityDayArgs = {
  date: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationDeleteUserActivityYearArgs = {
  user_id: Scalars['ID']['input'];
  year: Scalars['Int']['input'];
};


export type MutationDeleteUserContactActionArgs = {
  action_id: Scalars['ID']['input'];
};


export type MutationDeleteVenueArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteVenueLeadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVenueSlotArgs = {
  slot_id: Scalars['ID']['input'];
};


export type MutationDeleteWebsiteContentArgs = {
  content_id: Scalars['ID']['input'];
};


export type MutationDeleteWebsiteNavItemArgs = {
  item_id: Scalars['ID']['input'];
};


export type MutationDenyRequestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDismissMeetingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDummyCheckoutArgs = {
  input: DummyCheckoutInput;
};


export type MutationDuplicateInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationEditAdjustmentArgs = {
  input: EditAdjustmentInput;
};


export type MutationEmailEcommLeadContactArgs = {
  attachments?: InputMaybe<Array<CrmEmailAssetInput>>;
  body: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
  subject: Scalars['String']['input'];
};


export type MutationEmailHostLeadContactArgs = {
  attachments?: InputMaybe<Array<CrmEmailAssetInput>>;
  body: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
  subject: Scalars['String']['input'];
};


export type MutationEmailSupportChatTranscriptArgs = {
  email: Scalars['String']['input'];
  format?: InputMaybe<TranscriptFormat>;
  session_id: Scalars['ID']['input'];
};


export type MutationEmailTicketTranscriptArgs = {
  email: Scalars['String']['input'];
  format?: InputMaybe<TranscriptFormat>;
  ticket_id: Scalars['ID']['input'];
};


export type MutationEmailVenueLeadContactArgs = {
  attachments?: InputMaybe<Array<CrmEmailAssetInput>>;
  body: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  provider_id?: InputMaybe<Scalars['ID']['input']>;
  subject: Scalars['String']['input'];
};


export type MutationFollowClubArgs = {
  club_id: Scalars['ID']['input'];
};


export type MutationFollowPodArgs = {
  pod_id: Scalars['ID']['input'];
};


export type MutationFollowUserArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationGenerateLeadSurveyLinkArgs = {
  entity: LeadSurveyEntity;
  lead_id: Scalars['ID']['input'];
  survey_id: Scalars['ID']['input'];
};


export type MutationGenerateMeetingLinkArgs = {
  end?: InputMaybe<Scalars['String']['input']>;
  platform: Scalars['String']['input'];
  start: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationGrantAdminAccessArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationHostDeletePodArgs = {
  pod_doc_id: Scalars['ID']['input'];
  reason_note?: InputMaybe<Scalars['String']['input']>;
  reason_subject: Scalars['String']['input'];
};


export type MutationHostUpdatePodArgs = {
  input: HostUpdatePodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationImportRemoteImageToImagekitArgs = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  remoteUrl: Scalars['String']['input'];
};


export type MutationImportRemoteMediaToImagekitArgs = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  remoteUrl: Scalars['String']['input'];
};


export type MutationIncrementPodHitsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationInviteCoHostArgs = {
  pod_doc_id: Scalars['ID']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationJoinFreePodArgs = {
  pod_doc_id: Scalars['ID']['input'];
  referral_token?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationLoginWithGoogleArgs = {
  input: GoogleAuthInput;
};


export type MutationMarkBouncerCallbackContactedArgs = {
  conclusion?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  user_notification_doc_id: Scalars['ID']['input'];
};


export type MutationMarkSupportChatReadArgs = {
  session_id: Scalars['ID']['input'];
};


export type MutationMarkTicketReadArgs = {
  ticket_id: Scalars['ID']['input'];
};


export type MutationModeratePodContentArgs = {
  input: ModeratePodContentInput;
};


export type MutationModerateProductContentArgs = {
  input: ModerateProductContentInput;
};


export type MutationPermanentlyDeleteInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationPublishPodDraftArgs = {
  draft_id: Scalars['ID']['input'];
  input: CreatePodInput;
};


export type MutationRaiseBouncerSosArgs = {
  input: RaiseSosInput;
};


export type MutationReactToPodMessageArgs = {
  emoji: Scalars['String']['input'];
  message_id: Scalars['ID']['input'];
};


export type MutationReconcileCrmCallArgs = {
  log_id: Scalars['ID']['input'];
};


export type MutationRecordActivePingArgs = {
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRecordAppEventArgs = {
  input: RecordAppEventInput;
};


export type MutationRecordInventoryStockMovementArgs = {
  input: StockMovementInput;
  product_doc_id: Scalars['ID']['input'];
};


export type MutationRecordStoryViewArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type MutationRecordUserContactActionArgs = {
  input: RecordUserContactActionInput;
};


export type MutationRedeemPodReferralArgs = {
  token: Scalars['String']['input'];
};


export type MutationRefreshProductOrderTrackingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRefundPaymentArgs = {
  payment_doc_id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRegisterBrandPickupWithShiprocketArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRejectEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type MutationRejectHostArgs = {
  host_doc_id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type MutationRejectHostRequestArgs = {
  id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type MutationRejectVenueArgs = {
  notes: Scalars['String']['input'];
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationRejoinPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationRemoveCoHostArgs = {
  pod_doc_id: Scalars['ID']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationRemoveCrmEmailTemplateImageArgs = {
  template_id: Scalars['ID']['input'];
  url: Scalars['String']['input'];
};


export type MutationRemoveExpenseRefundArgs = {
  expense_doc_id: Scalars['ID']['input'];
  refund_id: Scalars['String']['input'];
};


export type MutationRemoveMeetingHolidayArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveUserRoleArgs = {
  role_key: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationReopenSupportChatArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  session_id: Scalars['ID']['input'];
};


export type MutationReopenTicketArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  ticket_id: Scalars['ID']['input'];
};


export type MutationReorderCrmDynamicFieldsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationReplyToProductReviewArgs = {
  reply: Scalars['String']['input'];
  review_id: Scalars['ID']['input'];
};


export type MutationReplyToTicketArgs = {
  attachments?: InputMaybe<Array<Scalars['String']['input']>>;
  body_html?: InputMaybe<Scalars['String']['input']>;
  body_text: Scalars['String']['input'];
  ticket_id: Scalars['ID']['input'];
};


export type MutationRequestBouncerCallbackArgs = {
  input: RequestCallbackInput;
};


export type MutationRequestCommunicationTranscriptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestMeetingArgs = {
  input: RequestMeetingInput;
  kind: SurveyKind;
};


export type MutationRequestPasswordChangeOtpArgs = {
  input: RequestPasswordChangeInput;
};


export type MutationRequestPasswordResetOtpArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestWhatsAppOtpArgs = {
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
};


export type MutationRequestWithdrawalArgs = {
  input: RequestWithdrawalInput;
};


export type MutationRescheduleMyMeetingArgs = {
  kind: SurveyKind;
  reason?: InputMaybe<Scalars['String']['input']>;
  requested_at: Scalars['String']['input'];
};


export type MutationResetPasswordWithOtpArgs = {
  input: ResetPasswordInput;
};


export type MutationResolveBouncerSosArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResolveSupportChatArgs = {
  session_id: Scalars['ID']['input'];
};


export type MutationResolveTicketArgs = {
  ticket_id: Scalars['ID']['input'];
};


export type MutationRespondToCoHostInviteArgs = {
  accept: Scalars['Boolean']['input'];
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationRestoreInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationReviewAdRequestArgs = {
  approve: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  remarks?: InputMaybe<Scalars['String']['input']>;
};


export type MutationReviewPaymentReleaseRequestArgs = {
  input: ReviewPaymentReleaseInput;
  request_id: Scalars['ID']['input'];
};


export type MutationReviewProductListingArgs = {
  commission_pct?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  product_doc_id: Scalars['ID']['input'];
  status: ProductListingReviewStatus;
};


export type MutationReviewVerificationArgs = {
  reject_reason?: InputMaybe<Scalars['String']['input']>;
  status: VerificationStatus;
  type: VerificationType;
  user_id: Scalars['ID']['input'];
};


export type MutationReviewWithdrawalArgs = {
  input: ReviewWithdrawalInput;
  withdrawal_id: Scalars['ID']['input'];
};


export type MutationRevokeAdminAccessArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationRevokeApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationRevokeLeadSurveyLinkArgs = {
  entry_id: Scalars['ID']['input'];
};


export type MutationSaveBrandPickupLocationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  input: BrandPickupLocationInput;
};


export type MutationSaveEcommBrandArgs = {
  brand_doc_id?: InputMaybe<Scalars['ID']['input']>;
  input: EcommBrandInput;
};


export type MutationSaveExpoPushTokenArgs = {
  platform?: InputMaybe<Scalars['String']['input']>;
  token: Scalars['String']['input'];
};


export type MutationSaveFounderSettingArgs = {
  input: FounderSettingInput;
};


export type MutationSaveLeadSurveyResponseArgs = {
  answers: Array<SurveyAnswerInput>;
  entity: LeadSurveyEntity;
  lead_id: Scalars['ID']['input'];
  survey_id: Scalars['ID']['input'];
};


export type MutationSavePodDraftArgs = {
  draft_id?: InputMaybe<Scalars['ID']['input']>;
  input: PodDraftInput;
};


export type MutationSavePushSubscriptionArgs = {
  input: PushSubscriptionInput;
};


export type MutationSendAppReleaseEmailArgs = {
  input: SendAppReleaseEmailInput;
};


export type MutationSendCrmTestEmailArgs = {
  template_id: Scalars['ID']['input'];
  to: Scalars['String']['input'];
  vars?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSendMarketingCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type MutationSendPodMessageArgs = {
  image_url?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<PodMessageType>;
};


export type MutationSendSupportChatMessageArgs = {
  attachments?: InputMaybe<Array<Scalars['String']['input']>>;
  session_id: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSendTestEmailArgs = {
  template_id: Scalars['ID']['input'];
  to: Scalars['String']['input'];
  vars?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetBrandCommissionArgs = {
  brand_doc_id: Scalars['ID']['input'];
  product_commission_pct: Scalars['Float']['input'];
};


export type MutationSetDefaultBrandPickupLocationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDefaultCommsProviderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDefaultEnvEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDefaultSlotTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetEcommBrandActiveArgs = {
  active: Scalars['Boolean']['input'];
  brand_doc_id: Scalars['ID']['input'];
};


export type MutationSetFeatureFlagArgs = {
  enabled: Scalars['Boolean']['input'];
  flag_id: Scalars['ID']['input'];
};


export type MutationSetHostActiveArgs = {
  active: Scalars['Boolean']['input'];
  host_doc_id: Scalars['ID']['input'];
};


export type MutationSetHostDeductionsArgs = {
  host_commission_pct: Scalars['Float']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationSetMySelectedLocationArgs = {
  location_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSetPodIdeaStatusArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
  status: PodIdeaStatus;
};


export type MutationSetPortalEnvEntriesArgs = {
  entryIds: Array<Scalars['ID']['input']>;
  portalKey: Scalars['String']['input'];
};


export type MutationSetPortalModeArgs = {
  key: Scalars['String']['input'];
  mode: PortalModeState;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSetProductOrderFulfilmentMethodArgs = {
  id: Scalars['ID']['input'];
  method: FulfilmentMethod;
};


export type MutationSetVenueActiveArgs = {
  active: Scalars['Boolean']['input'];
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationSetVenueDeductionsArgs = {
  venue_commission_pct: Scalars['Float']['input'];
  venue_doc_id: Scalars['ID']['input'];
  venue_share_pct: Scalars['Float']['input'];
};


export type MutationSharePodIdeaArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationSignupWithGoogleArgs = {
  input: GoogleSignupInput;
};


export type MutationStartCrmAiCallArgs = {
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_number: Scalars['String']['input'];
  entity: CrmAiEntity;
  id: Scalars['ID']['input'];
  prompt_id: Scalars['ID']['input'];
  voice?: InputMaybe<Scalars['String']['input']>;
};


export type MutationStartCrmPortalCallArgs = {
  agent_number?: InputMaybe<Scalars['String']['input']>;
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_number: Scalars['String']['input'];
  entity: CrmAiEntity;
  id: Scalars['ID']['input'];
};


export type MutationStartRecordedUserCallArgs = {
  input: StartRecordedUserCallInput;
};


export type MutationStartSupportChatArgs = {
  text?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSubmitAdRequestArgs = {
  input: SubmitAdRequestInput;
};


export type MutationSubmitAddressVerificationArgs = {
  city: Scalars['String']['input'];
  country?: InputMaybe<Scalars['String']['input']>;
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  pincode: Scalars['String']['input'];
  state: Scalars['String']['input'];
};


export type MutationSubmitBouncerFeedbackArgs = {
  input: SubmitBouncerFeedbackInput;
};


export type MutationSubmitContactFormArgs = {
  input: SubmitContactInput;
};


export type MutationSubmitEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
};


export type MutationSubmitEcommChangeRequestArgs = {
  input: EcommChangeRequestInput;
};


export type MutationSubmitFaqQuestionArgs = {
  input: SubmitFaqQuestionInput;
};


export type MutationSubmitHostRequestArgs = {
  input: SubmitHostRequestInput;
};


export type MutationSubmitHostStep1Args = {
  input: HostStep1Input;
};


export type MutationSubmitHostStep2Args = {
  input: HostStep2Input;
};


export type MutationSubmitHostStep3Args = {
  input: HostStep3Input;
};


export type MutationSubmitJobApplicationArgs = {
  input: SubmitJobApplicationInput;
};


export type MutationSubmitLeadSurveyByTokenArgs = {
  answers: Array<SurveyAnswerInput>;
  token: Scalars['String']['input'];
};


export type MutationSubmitProductListingArgs = {
  input: ProductListingInput;
};


export type MutationSubmitSupportChatFeedbackArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  rating: Scalars['Int']['input'];
  session_id: Scalars['ID']['input'];
};


export type MutationSubmitSurveyResponseArgs = {
  answers: Array<SurveyAnswerInput>;
  survey_id: Scalars['ID']['input'];
};


export type MutationSubmitTicketFeedbackArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  rating: Scalars['Int']['input'];
  ticket_id: Scalars['ID']['input'];
};


export type MutationSubmitVenueFinalArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSubmitVenueStep1Args = {
  input: VenueStep1Input;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSubmitVenueStep2Args = {
  input: VenueStep2Input;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSubmitVenueStep3Args = {
  input: VenueStep3Input;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSubmitVerificationArgs = {
  document_url: Scalars['String']['input'];
  type: VerificationType;
};


export type MutationSubscribeNewsletterArgs = {
  input: SubscribeNewsletterInput;
};


export type MutationSupportCreateUserArgs = {
  input: SupportCreateUserInput;
};


export type MutationTestCommsProviderArgs = {
  id: Scalars['ID']['input'];
  recipient: Scalars['String']['input'];
};


export type MutationTestEnvEmailArgs = {
  id: Scalars['ID']['input'];
  to: Scalars['String']['input'];
};


export type MutationTestEnvEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTestEnvGeminiArgs = {
  id: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
};


export type MutationTestEnvImagekitUploadArgs = {
  fileBase64: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationTestEnvOpenaiArgs = {
  id: Scalars['ID']['input'];
  prompt: Scalars['String']['input'];
};


export type MutationTestEnvPexelsArgs = {
  id: Scalars['ID']['input'];
  query: Scalars['String']['input'];
};


export type MutationTestEnvTwilioCallArgs = {
  id: Scalars['ID']['input'];
  to: Scalars['String']['input'];
};


export type MutationToggleCrmReminderDoneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTogglePodCommentLikeArgs = {
  comment_id: Scalars['ID']['input'];
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationTogglePodIdeaLikeArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationTogglePodLikeArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationTogglePostLikeArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type MutationToggleSavedPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationUnfollowClubArgs = {
  club_id: Scalars['ID']['input'];
};


export type MutationUnfollowPodArgs = {
  pod_id: Scalars['ID']['input'];
};


export type MutationUnfollowUserArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationUnsubscribeNewsletterArgs = {
  email: Scalars['String']['input'];
};


export type MutationUpdateAdPricingArgs = {
  input: UpdateAdPricingInput;
};


export type MutationUpdateAiPromptArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAiPromptInput;
};


export type MutationUpdateAppSettingsArgs = {
  input: UpdateAppSettingsInput;
};


export type MutationUpdateApprovedVenueArgs = {
  input: UpdateApprovedVenueInput;
  venue_id: Scalars['ID']['input'];
};


export type MutationUpdateBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
  input: UpdateBadgeInput;
};


export type MutationUpdateBrandingArgs = {
  input: UpdateBrandingInput;
};


export type MutationUpdateCategoryArgs = {
  category_id: Scalars['ID']['input'];
  input: UpdateCategoryInput;
};


export type MutationUpdateChallengeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateChallengeInput;
};


export type MutationUpdateClubArgs = {
  club_doc_id: Scalars['ID']['input'];
  input: UpdateClubInput;
};


export type MutationUpdateCommsProviderArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommsProviderInput;
};


export type MutationUpdateContactStatusArgs = {
  contact_id: Scalars['ID']['input'];
  status: ContactStatus;
};


export type MutationUpdateCouponArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCouponInput;
};


export type MutationUpdateCrmCallPromptArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCrmCallPromptInput;
};


export type MutationUpdateCrmDynamicFieldArgs = {
  id: Scalars['ID']['input'];
  input: CrmDynamicFieldInput;
};


export type MutationUpdateCrmEmailTemplateArgs = {
  input: UpdateCrmEmailTemplateInput;
  template_id: Scalars['ID']['input'];
};


export type MutationUpdateCrmManagedOptionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCrmManagedOptionInput;
};


export type MutationUpdateCrmReminderArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCrmReminderInput;
};


export type MutationUpdateCrmServiceArgs = {
  id: Scalars['ID']['input'];
  input: CrmServiceInput;
};


export type MutationUpdateCrmServiceOfferedArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCrmServiceOfferedInput;
};


export type MutationUpdateEcommLeadArgs = {
  id: Scalars['ID']['input'];
  input: EcommLeadInput;
};


export type MutationUpdateEmailTemplateArgs = {
  input: UpdateEmailTemplateInput;
  template_id: Scalars['ID']['input'];
};


export type MutationUpdateEnvEntryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEnvEntryInput;
};


export type MutationUpdateExpenseArgs = {
  expense_doc_id: Scalars['ID']['input'];
  input: CreateExpenseInput;
};


export type MutationUpdateFaqArgs = {
  faq_doc_id: Scalars['ID']['input'];
  input: UpdateFaqInput;
};


export type MutationUpdateFaqSubmissionStatusArgs = {
  converted_faq_id?: InputMaybe<Scalars['ID']['input']>;
  faq_submission_id: Scalars['ID']['input'];
  status: FaqSubmissionStatus;
};


export type MutationUpdateFeatureFlagArgs = {
  flag_id: Scalars['ID']['input'];
  input: UpdateFeatureFlagInput;
};


export type MutationUpdateFinanceSettingsArgs = {
  input: UpdateFinanceSettingsInput;
};


export type MutationUpdateHostLeadArgs = {
  id: Scalars['ID']['input'];
  input: HostLeadInput;
};


export type MutationUpdateInterviewArgs = {
  input: UpdateInterviewInput;
  interview_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateInventoryProductArgs = {
  input: UpdateInventoryProductInput;
  product_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateJobApplicationStatusArgs = {
  application_id: Scalars['ID']['input'];
  status: JobApplicationStatus;
};


export type MutationUpdateLegalDocumentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLegalDocumentInput;
};


export type MutationUpdateLocationArgs = {
  input: UpdateLocationInput;
  location_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateMeetingArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMeetingInput;
};


export type MutationUpdateMeetingAvailabilityArgs = {
  input: MeetingAvailabilityInput;
};


export type MutationUpdateMyInterestsArgs = {
  category_ids: Array<Scalars['ID']['input']>;
};


export type MutationUpdateMyPetProfileArgs = {
  input: PetProfileInput;
};


export type MutationUpdateMyProductListingArgs = {
  input: ProductListingInput;
  product_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateMyProductListingQuantityArgs = {
  inventory_count: Scalars['Int']['input'];
  product_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateMyProductSettingsArgs = {
  low_stock_alert: Scalars['Int']['input'];
  notify_low_stock: Scalars['Boolean']['input'];
  product_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateMyProfileArgs = {
  input: UpdateMyProfileInput;
};


export type MutationUpdateMyProfileVisibilityArgs = {
  visibility: ProfileVisibility;
};


export type MutationUpdatePodArgs = {
  input: UpdatePodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationUpdatePodIdeaArgs = {
  input: UpdatePodIdeaInput;
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationUpdatePodPlanArgs = {
  input: PodPlanUpdateInput;
  plan_id: Scalars['ID']['input'];
};


export type MutationUpdatePolicyArgs = {
  input: UpdatePolicyInput;
  policy_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateReferralGiftArgs = {
  gift_description: Scalars['String']['input'];
};


export type MutationUpdateRoleArgs = {
  input: UpdateRoleInput;
  role_id: Scalars['ID']['input'];
};


export type MutationUpdateSurveyArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSurveyInput;
};


export type MutationUpdateTicketPriorityArgs = {
  priority: TicketPriority;
  ticket_id: Scalars['ID']['input'];
};


export type MutationUpdateTicketStatusArgs = {
  status: TicketStatus;
  ticket_id: Scalars['ID']['input'];
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
  user_id: Scalars['ID']['input'];
};


export type MutationUpdateVenueLeadArgs = {
  id: Scalars['ID']['input'];
  input: VenueLeadInput;
};


export type MutationUpdateVenueSettingsArgs = {
  input: VenueSettingsInput;
  venue_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateVenueSlotArgs = {
  input: UpdateVenueSlotInput;
  slot_id: Scalars['ID']['input'];
};


export type MutationUpdateWebsiteContentArgs = {
  content_id: Scalars['ID']['input'];
  input: WebsiteContentInput;
};


export type MutationUpdateWebsiteNavItemArgs = {
  input: WebsiteNavItemInput;
  item_id: Scalars['ID']['input'];
};


export type MutationUploadImageToImagekitArgs = {
  allow_documents?: InputMaybe<Scalars['Boolean']['input']>;
  fileBase64: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVerifyEmailVerificationOtpArgs = {
  otp: Scalars['String']['input'];
};


export type MutationVerifyEventTicketQrArgs = {
  token: Scalars['String']['input'];
};


export type MutationVerifyRazorpayPaymentArgs = {
  input: VerifyRazorpayInput;
};


export type MutationVerifyWhatsAppOtpArgs = {
  otp: Scalars['String']['input'];
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
};


export type MutationVoteProductReviewArgs = {
  review_id: Scalars['ID']['input'];
  vote: Scalars['Int']['input'];
};


export type MutationWaCreateUserLeadArgs = {
  input: WaCreateUserLeadInput;
};


export type MutationWaDeleteUserLeadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationWaDeleteUserLeadsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationWaGenerateApiKeyArgs = {
  base_url: Scalars['String']['input'];
  master_key: Scalars['String']['input'];
};


export type MutationWaImportUserLeadsArgs = {
  file_base64: Scalars['String']['input'];
};


export type MutationWaSaveConfigArgs = {
  input: WaConfigInput;
};


export type MutationWaUpdateUserLeadArgs = {
  id: Scalars['ID']['input'];
  input: WaUpdateUserLeadInput;
};


export type MutationWithdrawEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
};

/** Search + category + pagination filter for the Club Admin 'Your Clubs' list. */
export type MyAdminClubsFilter = {
  /** Middle category — matches clubs whose sub-category sits under it. */
  category_id?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** Matches club name or slug (case-insensitive). */
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

/** The signed-in user's referral state — code, gift on offer and redemptions. */
export type MyReferral = {
  __typename?: 'MyReferral';
  code: Scalars['String']['output'];
  gift_description: Scalars['String']['output'];
  referred: Array<ReferralEntry>;
  /** Name of whoever referred this user; null when nobody has. */
  referred_by_name?: Maybe<Scalars['String']['output']>;
};

export type NewsletterSource =
  | 'ADMIN'
  | 'MWEB'
  | 'OTHER'
  | 'WEBSITE_FOOTER'
  | 'WEBSITE_PAGE';

export type NewsletterSubscribeResult = {
  __typename?: 'NewsletterSubscribeResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
};

export type NewsletterSubscriber = {
  __typename?: 'NewsletterSubscriber';
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  source: NewsletterSource;
  unsubscribed_at?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (newsletterSubscribersTable). */
export type NewsletterSubscriberTablePage = {
  __typename?: 'NewsletterSubscriberTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<NewsletterSubscriber>;
  total: Scalars['Int']['output'];
};

export type Notification = {
  __typename?: 'Notification';
  body: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  delivered_count: Scalars['Int']['output'];
  failed_count: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  image_url?: Maybe<Scalars['String']['output']>;
  link_url?: Maybe<Scalars['String']['output']>;
  location_id?: Maybe<Scalars['ID']['output']>;
  scope: NotificationScope;
  sent_by?: Maybe<Scalars['ID']['output']>;
  silent: Scalars['Boolean']['output'];
  target_user_ids: Array<Scalars['ID']['output']>;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  zone_name?: Maybe<Scalars['String']['output']>;
};

export type NotificationScope =
  | 'GLOBAL'
  | 'LOCATION'
  | 'USER'
  | 'ZONE';

/** Server-side table page for the shared table engine (notificationsTable). */
export type NotificationTablePage = {
  __typename?: 'NotificationTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Notification>;
  total: Scalars['Int']['output'];
};

export type OnboardingMeeting = {
  __typename?: 'OnboardingMeeting';
  /** Onboarding decision on the interviewer's feedback: NONE (not yet decided) | APPROVED | DENIED. */
  approval_status?: Maybe<Scalars['String']['output']>;
  /** Why onboarding staff cancelled it (null for self-cancels). */
  cancel_reason?: Maybe<Scalars['String']['output']>;
  category_name?: Maybe<Scalars['String']['output']>;
  contact_name?: Maybe<Scalars['String']['output']>;
  contact_phone?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  /** Hidden from the onboarding calendar (cancelled meeting removed by staff). */
  dismissed?: Maybe<Scalars['Boolean']['output']>;
  /** The interviewer's post-meeting feedback (set when the meeting is approved / denied). */
  feedback?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: SurveyKind;
  meeting_link?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  /** Human-readable request id, e.g. DUN-VEN-000001. */
  request_no?: Maybe<Scalars['String']['output']>;
  requested_at: Scalars['String']['output'];
  /** Times the user has rescheduled (reschedule is one-time). */
  reschedule_count?: Maybe<Scalars['Int']['output']>;
  scheduled_at?: Maybe<Scalars['String']['output']>;
  status: MeetingStatus;
  sub_category_name?: Maybe<Scalars['String']['output']>;
  /** Taxonomy the applicant chose in the gate. */
  super_category_name?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  user_name?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (onboardingMeetingsTable). */
export type OnboardingMeetingTablePage = {
  __typename?: 'OnboardingMeetingTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<OnboardingMeeting>;
  total: Scalars['Int']['output'];
};

export type OrderLineItem = {
  __typename?: 'OrderLineItem';
  brand_id?: Maybe<Scalars['ID']['output']>;
  breadth_cm: Scalars['Float']['output'];
  gross: Scalars['Float']['output'];
  height_cm: Scalars['Float']['output'];
  image_url: Scalars['String']['output'];
  length_cm: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  ownership: ProductOwnership;
  product_id: Scalars['ID']['output'];
  qty: Scalars['Int']['output'];
  sku: Scalars['String']['output'];
  unit_cost: Scalars['Float']['output'];
  weight_kg: Scalars['Float']['output'];
};

export type OrderShippingAddress = {
  __typename?: 'OrderShippingAddress';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  email: Scalars['String']['output'];
  landmark: Scalars['String']['output'];
  line1: Scalars['String']['output'];
  line2: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  pincode: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

export type OrderShippingAddressInput = {
  city: Scalars['String']['input'];
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  landmark?: InputMaybe<Scalars['String']['input']>;
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  pincode: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type OrderTracking = {
  __typename?: 'OrderTracking';
  awb: Scalars['String']['output'];
  courier_name: Scalars['String']['output'];
  events: Array<OrderTrackingEvent>;
  fulfilment_method: FulfilmentMethod;
  fulfilment_status: FulfilmentStatus;
  label_url: Scalars['String']['output'];
  order_no: Scalars['String']['output'];
  tracking_status: Scalars['String']['output'];
};

export type OrderTrackingEvent = {
  __typename?: 'OrderTrackingEvent';
  at: Scalars['String']['output'];
  code: Scalars['Int']['output'];
  location: Scalars['String']['output'];
  note: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type OtpRequestResult = {
  __typename?: 'OtpRequestResult';
  dev_otp?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  /** Password-reset only: false when the email is not a registered account (no OTP is sent). */
  registered?: Maybe<Scalars['Boolean']['output']>;
};

export type PartnerDashboard = {
  __typename?: 'PartnerDashboard';
  from: Scalars['String']['output'];
  host: PartnerDashboardMetrics;
  products: PartnerDashboardMetrics;
  summary: PartnerDashboardMetrics;
  to: Scalars['String']['output'];
  venue: PartnerDashboardMetrics;
};

export type PartnerDashboardMetrics = {
  __typename?: 'PartnerDashboardMetrics';
  /** Count of upcoming availability slots the venue owner has published (venue section). */
  added_slots: Scalars['Int']['output'];
  host_earning: Scalars['Float']['output'];
  number_of_pods: Scalars['Int']['output'];
  pods_earning: Scalars['Float']['output'];
  product_earning: Scalars['Float']['output'];
  total_earning: Scalars['Float']['output'];
  venue_earning: Scalars['Float']['output'];
};

export type PartnerFaqTopic =
  | 'HOST'
  | 'PRODUCTS'
  | 'VENUE';

export type PartyInvoiceTemplate = {
  __typename?: 'PartyInvoiceTemplate';
  footer: Scalars['String']['output'];
  label: Scalars['String']['output'];
  note: Scalars['String']['output'];
  terms: Scalars['String']['output'];
};

export type PartyInvoiceTemplateInput = {
  footer?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  terms?: InputMaybe<Scalars['String']['input']>;
};

export type Payment = {
  __typename?: 'Payment';
  billing: BillingDetails;
  /** Legacy one-line billing address, composed from the structured billing block. */
  billing_address: Scalars['String']['output'];
  checkout_url: Scalars['String']['output'];
  coupon_code?: Maybe<Scalars['String']['output']>;
  coupon_discount: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  description: Scalars['String']['output'];
  gateway: Scalars['String']['output'];
  gateway_ref?: Maybe<Scalars['String']['output']>;
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  invoice_no?: Maybe<Scalars['String']['output']>;
  paid_at?: Maybe<Scalars['String']['output']>;
  payment_id: Scalars['String']['output'];
  platform_fee_amount: Scalars['Float']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  pod?: Maybe<Pod>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  status: PaymentStatus;
  subtotal: Scalars['Float']['output'];
  target_type: PaymentTargetType;
  total: Scalars['Float']['output'];
  updated_at: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  user_name: Scalars['String']['output'];
  user_phone?: Maybe<Scalars['String']['output']>;
};

export type PaymentFilterInput = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PaymentStatus>;
  user_id?: InputMaybe<Scalars['ID']['input']>;
};

export type PaymentReleaseApprovalType =
  | 'FULL'
  | 'PARTIAL';

export type PaymentReleaseBreakdown = {
  __typename?: 'PaymentReleaseBreakdown';
  collected_total: Scalars['Float']['output'];
  commission_amount: Scalars['Float']['output'];
  commission_pct: Scalars['Float']['output'];
  duncit_amount: Scalars['Float']['output'];
  duncit_pct: Scalars['Float']['output'];
  duncit_revenue: Scalars['Float']['output'];
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  net_amount: Scalars['Float']['output'];
  payout_amount: Scalars['Float']['output'];
  payout_pct: Scalars['Float']['output'];
  platform_fee_amount: Scalars['Float']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  pool_amount: Scalars['Float']['output'];
  share_amount: Scalars['Float']['output'];
  share_pct: Scalars['Float']['output'];
  venue_bill: Scalars['Float']['output'];
  version: Scalars['Int']['output'];
};

export type PaymentReleaseFilterInput = {
  kind?: InputMaybe<PaymentReleaseKind>;
  status?: InputMaybe<PaymentReleaseStatus>;
};

export type PaymentReleaseKind =
  | 'HOST_PAYMENT'
  | 'VENUE_BILLING';

export type PaymentReleaseMedia = {
  __typename?: 'PaymentReleaseMedia';
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

export type PaymentReleaseMediaInput = {
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

export type PaymentReleaseRequest = {
  __typename?: 'PaymentReleaseRequest';
  amount_requested: Scalars['Float']['output'];
  approval_reason: Scalars['String']['output'];
  approval_type?: Maybe<PaymentReleaseApprovalType>;
  approved_amount?: Maybe<Scalars['Float']['output']>;
  beneficiary_email: Scalars['String']['output'];
  beneficiary_name: Scalars['String']['output'];
  bill_url: Scalars['String']['output'];
  breakdown?: Maybe<PaymentReleaseBreakdown>;
  created_at: Scalars['String']['output'];
  evidence_media: Array<PaymentReleaseMedia>;
  host_user_id?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  kind: PaymentReleaseKind;
  notes: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  release_id: Scalars['String']['output'];
  requested_at: Scalars['String']['output'];
  requested_by?: Maybe<Scalars['ID']['output']>;
  reviewed_at?: Maybe<Scalars['String']['output']>;
  reviewed_by?: Maybe<Scalars['ID']['output']>;
  status: PaymentReleaseStatus;
  updated_at: Scalars['String']['output'];
  venue_id?: Maybe<Scalars['ID']['output']>;
};

/** Server-side table page for the shared table engine (paymentReleaseRequestsTable). */
export type PaymentReleaseRequestTablePage = {
  __typename?: 'PaymentReleaseRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PaymentReleaseRequest>;
  total: Scalars['Int']['output'];
};

export type PaymentReleaseStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED';

export type PaymentStatus =
  | 'FAILED'
  | 'PENDING'
  | 'REFUNDED'
  | 'SUCCESS';

/** Server-side table page for the shared table engine (paymentsTable). */
export type PaymentTablePage = {
  __typename?: 'PaymentTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Payment>;
  total: Scalars['Int']['output'];
};

export type PaymentTargetType =
  | 'OTHER'
  | 'POD';

export type PayoutMode =
  | 'IMMEDIATE'
  | 'MONTH_END'
  | 'WEEKLY';

export type PetProfile = {
  __typename?: 'PetProfile';
  age?: Maybe<Scalars['Int']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  breed?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  photo_url?: Maybe<Scalars['String']['output']>;
  species?: Maybe<Scalars['String']['output']>;
};

export type PetProfileInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  breed?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  photo_url?: InputMaybe<Scalars['String']['input']>;
  species?: InputMaybe<Scalars['String']['input']>;
};

export type PexelsPhoto = {
  __typename?: 'PexelsPhoto';
  alt?: Maybe<Scalars['String']['output']>;
  avg_color?: Maybe<Scalars['String']['output']>;
  height: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  photographer: Scalars['String']['output'];
  photographer_url?: Maybe<Scalars['String']['output']>;
  src_large: Scalars['String']['output'];
  src_medium: Scalars['String']['output'];
  src_original: Scalars['String']['output'];
  src_tiny: Scalars['String']['output'];
  url: Scalars['String']['output'];
  width: Scalars['Int']['output'];
};

export type PexelsSearchResult = {
  __typename?: 'PexelsSearchResult';
  next_page?: Maybe<Scalars['String']['output']>;
  page: Scalars['Int']['output'];
  per_page: Scalars['Int']['output'];
  photos: Array<PexelsPhoto>;
  total_results: Scalars['Int']['output'];
};

export type PexelsVideo = {
  __typename?: 'PexelsVideo';
  duration: Scalars['Int']['output'];
  height: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  preview: Scalars['String']['output'];
  url: Scalars['String']['output'];
  user_name: Scalars['String']['output'];
  user_url?: Maybe<Scalars['String']['output']>;
  video_files: Array<PexelsVideoFile>;
  width: Scalars['Int']['output'];
};

export type PexelsVideoFile = {
  __typename?: 'PexelsVideoFile';
  height: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  link: Scalars['String']['output'];
  quality: Scalars['String']['output'];
  width: Scalars['Int']['output'];
};

export type PexelsVideoSearchResult = {
  __typename?: 'PexelsVideoSearchResult';
  next_page?: Maybe<Scalars['String']['output']>;
  page: Scalars['Int']['output'];
  per_page: Scalars['Int']['output'];
  total_results: Scalars['Int']['output'];
  videos: Array<PexelsVideo>;
};

export type PickupOwnerKind =
  | 'BRAND'
  | 'DUNCIT';

export type Pod = {
  __typename?: 'Pod';
  available_perks: Array<Scalars['String']['output']>;
  club?: Maybe<Club>;
  club_id: Scalars['ID']['output'];
  club_slug: Scalars['String']['output'];
  /** Invited co-hosts (view-only). Empty unless the pod's sub-category allows co-hosting. */
  co_hosts: Array<PodCoHost>;
  comment_count: Scalars['Int']['output'];
  completed_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  deleted_at?: Maybe<Scalars['String']['output']>;
  host_names: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_deleted: Scalars['Boolean']['output'];
  like_count: Scalars['Int']['output'];
  liked_by_me: Scalars['Boolean']['output'];
  /** Users who liked this pod — powers the 'who liked' list (explore item 8). */
  liked_user_ids: Array<Scalars['ID']['output']>;
  location_id?: Maybe<Scalars['ID']['output']>;
  meeting_notes?: Maybe<Scalars['String']['output']>;
  meeting_platform?: Maybe<Scalars['String']['output']>;
  meeting_url?: Maybe<Scalars['String']['output']>;
  no_of_spots: Scalars['Int']['output'];
  payment_terms?: Maybe<Scalars['String']['output']>;
  place_charges: Array<PodPlaceCharge>;
  place_detail?: Maybe<Scalars['String']['output']>;
  place_label?: Maybe<Scalars['String']['output']>;
  pod_amount: Scalars['Int']['output'];
  pod_attendees: Array<Scalars['ID']['output']>;
  pod_date_time: Scalars['String']['output'];
  pod_description: Scalars['String']['output'];
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_hashtag: Array<Scalars['String']['output']>;
  pod_hits: Scalars['Int']['output'];
  pod_hosts_id: Array<Scalars['ID']['output']>;
  pod_id: Scalars['String']['output'];
  pod_images_and_videos: Array<PodMedia>;
  pod_info?: Maybe<Scalars['String']['output']>;
  pod_mode: PodMode;
  pod_occurrence: PodOccurrence;
  pod_title: Scalars['String']['output'];
  pod_type: PodType;
  product_cost_total: Scalars['Float']['output'];
  product_requests: Array<PodProductRequest>;
  products_enabled: Scalars['Boolean']['output'];
  /** Explore reel video URL. Set = reel enabled; live pods with a reel appear in Explore. */
  reel_url?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  venue_approval_status: PodVenueApproval;
  venue_id?: Maybe<Scalars['ID']['output']>;
  venue_slot_id?: Maybe<Scalars['ID']['output']>;
  what_this_pod_offers: Array<Scalars['String']['output']>;
  zone_name?: Maybe<Scalars['String']['output']>;
};

/** A co-host on a pod. View-only: they cannot edit, complete or delete it, and the pod's earnings are unaffected. */
export type PodCoHost = {
  __typename?: 'PodCoHost';
  invited_at: Scalars['String']['output'];
  name: Scalars['String']['output'];
  profile_photo?: Maybe<Scalars['String']['output']>;
  responded_at?: Maybe<Scalars['String']['output']>;
  status: CoHostStatus;
  user_id: Scalars['ID']['output'];
};

export type PodComment = {
  __typename?: 'PodComment';
  author_id: Scalars['ID']['output'];
  author_name?: Maybe<Scalars['String']['output']>;
  author_photo?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** How many users liked this comment (explore item 4 — comment reactions). */
  like_count: Scalars['Int']['output'];
  /** Whether the signed-in viewer liked this comment. */
  liked_by_me: Scalars['Boolean']['output'];
  text: Scalars['String']['output'];
};

export type PodDraft = {
  __typename?: 'PodDraft';
  created_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  payload: Scalars['String']['output'];
  pod_mode: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  step: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type PodDraftInput = {
  payload: Scalars['String']['input'];
  pod_mode?: InputMaybe<Scalars['String']['input']>;
  pod_title?: InputMaybe<Scalars['String']['input']>;
  step?: InputMaybe<Scalars['Int']['input']>;
};

export type PodFilterInput = {
  club_id?: InputMaybe<Scalars['ID']['input']>;
  /** Only pods with an uploaded reel video (Explore feed). */
  has_reel?: InputMaybe<Scalars['Boolean']['input']>;
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
  zone_name?: InputMaybe<Scalars['String']['input']>;
};

export type PodFinanceBreakdown = {
  __typename?: 'PodFinanceBreakdown';
  bookings_count: Scalars['Int']['output'];
  collected_total: Scalars['Float']['output'];
  completed_at?: Maybe<Scalars['String']['output']>;
  currency_symbol: Scalars['String']['output'];
  frozen: Scalars['Boolean']['output'];
  has_venue: Scalars['Boolean']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  settlement_status: PodSettlementStatus;
  waterfall: PodFinanceWaterfall;
};

export type PodFinanceWaterfall = {
  __typename?: 'PodFinanceWaterfall';
  amount: Scalars['Float']['output'];
  club_admin_amount: Scalars['Float']['output'];
  club_admin_pct: Scalars['Float']['output'];
  duncit_revenue: Scalars['Float']['output'];
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  host_amount: Scalars['Float']['output'];
  host_commission_amount: Scalars['Float']['output'];
  host_commission_pct: Scalars['Float']['output'];
  host_earn_pct: Scalars['Float']['output'];
  host_receives: Scalars['Float']['output'];
  net_amount: Scalars['Float']['output'];
  platform_fee_amount: Scalars['Float']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  pool_amount: Scalars['Float']['output'];
  venue_amount: Scalars['Float']['output'];
  venue_commission_amount: Scalars['Float']['output'];
  venue_commission_pct: Scalars['Float']['output'];
  venue_receives: Scalars['Float']['output'];
  version: Scalars['Int']['output'];
};

export type PodIdea = {
  __typename?: 'PodIdea';
  author?: Maybe<User>;
  author_id: Scalars['ID']['output'];
  comments: Array<PodIdeaComment>;
  comments_count: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  liked_by_me: Scalars['Boolean']['output'];
  likes: Array<Scalars['ID']['output']>;
  likes_count: Scalars['Int']['output'];
  shares_count: Scalars['Int']['output'];
  status: PodIdeaStatus;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type PodIdeaComment = {
  __typename?: 'PodIdeaComment';
  author?: Maybe<User>;
  author_id: Scalars['ID']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

export type PodIdeaFilterInput = {
  author_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PodIdeaStatus>;
};

export type PodIdeaStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED';

/** Server-side table page for the shared table engine (podIdeasTable). */
export type PodIdeaTablePage = {
  __typename?: 'PodIdeaTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodIdea>;
  total: Scalars['Int']['output'];
};

export type PodMedia = {
  __typename?: 'PodMedia';
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

export type PodMediaInput = {
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

export type PodMember = {
  __typename?: 'PodMember';
  backed_out_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joined_at: Scalars['String']['output'];
  payment_id?: Maybe<Scalars['ID']['output']>;
  pod?: Maybe<Pod>;
  pod_id: Scalars['ID']['output'];
  referral_token?: Maybe<Scalars['String']['output']>;
  referred_by?: Maybe<Scalars['ID']['output']>;
  refund_payment_id?: Maybe<Scalars['ID']['output']>;
  refund_status: RefundStatus;
  source: JoinSource;
  status: MembershipStatus;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type PodMembershipState = {
  __typename?: 'PodMembershipState';
  can_backout: Scalars['Boolean']['output'];
  can_join: Scalars['Boolean']['output'];
  is_member: Scalars['Boolean']['output'];
  membership?: Maybe<PodMember>;
  pod_id: Scalars['ID']['output'];
  refund_threshold_pct: Scalars['Int']['output'];
  spots_taken: Scalars['Int']['output'];
  spots_total: Scalars['Int']['output'];
  status?: Maybe<MembershipStatus>;
};

export type PodMessage = {
  __typename?: 'PodMessage';
  createdAt: Scalars['String']['output'];
  deleted: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  image_url?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  reactions: Array<PodMessageReaction>;
  text?: Maybe<Scalars['String']['output']>;
  type: PodMessageType;
  user_id: Scalars['ID']['output'];
  user_name?: Maybe<Scalars['String']['output']>;
  user_photo?: Maybe<Scalars['String']['output']>;
};

export type PodMessageReaction = {
  __typename?: 'PodMessageReaction';
  emoji: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type PodMessageType =
  | 'IMAGE'
  | 'STICKER'
  | 'SYSTEM'
  | 'TEXT';

export type PodMode =
  | 'PHYSICAL'
  | 'VIRTUAL';

export type PodOccurrence =
  | 'ALTERNATE_DAY'
  | 'DAILY'
  | 'MONTHLY'
  | 'ONE_TIME'
  | 'WEEKENDS_ONLY'
  | 'WEEKLY';

export type PodPlaceCharge = {
  __typename?: 'PodPlaceCharge';
  amount: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
};

export type PodPlaceChargeInput = {
  amount: Scalars['Int']['input'];
  label: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};

export type PodPlan = {
  __typename?: 'PodPlan';
  created_at?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  features: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  is_coming_soon: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price_label: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type PodPlanInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  features?: InputMaybe<Array<Scalars['String']['input']>>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_coming_soon?: InputMaybe<Scalars['Boolean']['input']>;
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price_label?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

/** Server-side table page for the shared table engine (podPlansTable). */
export type PodPlanTablePage = {
  __typename?: 'PodPlanTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodPlan>;
  total: Scalars['Int']['output'];
};

export type PodPlanUpdateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  features?: InputMaybe<Array<Scalars['String']['input']>>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_coming_soon?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price_label?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type PodProductRequest = {
  __typename?: 'PodProductRequest';
  available_count: Scalars['Int']['output'];
  image_url: Scalars['String']['output'];
  images: Array<Scalars['String']['output']>;
  product_id: Scalars['ID']['output'];
  product_name: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  total_cost: Scalars['Float']['output'];
  unit_cost: Scalars['Float']['output'];
};

export type PodProductRequestInput = {
  product_id: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type PodSettlement = {
  __typename?: 'PodSettlement';
  collected_total: Scalars['Float']['output'];
  currency_symbol: Scalars['String']['output'];
  gst_pct: Scalars['Float']['output'];
  has_venue: Scalars['Boolean']['output'];
  host: PodSettlementParty;
  host_commission_pct: Scalars['Float']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  venue?: Maybe<PodSettlementParty>;
  venue_bill: Scalars['Float']['output'];
  venue_commission_pct: Scalars['Float']['output'];
  waterfall: PodFinanceWaterfall;
};

export type PodSettlementParty = {
  __typename?: 'PodSettlementParty';
  collected_total: Scalars['Float']['output'];
  duncit_amount: Scalars['Float']['output'];
  duncit_pct: Scalars['Float']['output'];
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  payout_amount: Scalars['Float']['output'];
  payout_pct: Scalars['Float']['output'];
  venue_bill: Scalars['Float']['output'];
};

export type PodSettlementResult = {
  __typename?: 'PodSettlementResult';
  releases: Array<PaymentReleaseRequest>;
  settlement: PodSettlement;
};

export type PodSettlementStatus =
  | 'LIVE'
  | 'PENDING_APPROVAL'
  | 'SETTLED';

/** Server-side table page for the shared table engine (podsTable / myHostPodsTable). */
export type PodTablePage = {
  __typename?: 'PodTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Pod>;
  total: Scalars['Int']['output'];
};

export type PodType =
  | 'NATIVE_FREE'
  | 'NATIVE_PAID'
  | 'NATIVE_PAID_PREMIUM'
  | 'NON_NATIVE_FREE'
  | 'NON_NATIVE_PAID';

/** Venue's decision on the pod's slot request — PENDING pods are offline until APPROVED. */
export type PodVenueApproval =
  | 'APPROVED'
  | 'DECLINED'
  | 'NONE'
  | 'PENDING';

export type Policy = {
  __typename?: 'Policy';
  content: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type PolicyFilterInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (policiesTable). */
export type PolicyTablePage = {
  __typename?: 'PolicyTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Policy>;
  total: Scalars['Int']['output'];
};

export type PortalMode = {
  __typename?: 'PortalMode';
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  kind: PortalModeKind;
  mode: PortalModeState;
  name: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type PortalModeKind =
  | 'APP'
  | 'PORTAL'
  | 'WEBSITE';

/** Minimal shape every app polls publicly on load. */
export type PortalModePublic = {
  __typename?: 'PortalModePublic';
  key: Scalars['String']['output'];
  mode: PortalModeState;
};

export type PortalModeState =
  | 'DEVELOPMENT'
  | 'LIVE'
  | 'MAINTENANCE';

/** Server-side table page for the shared table engine (portalModesTable). */
export type PortalModeTablePage = {
  __typename?: 'PortalModeTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PortalMode>;
  total: Scalars['Int']['output'];
};

export type Post = {
  __typename?: 'Post';
  author?: Maybe<User>;
  author_id: Scalars['ID']['output'];
  caption: Scalars['String']['output'];
  club_id?: Maybe<Scalars['ID']['output']>;
  comments: Array<PostComment>;
  comments_count: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  expires_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  liked_by_me: Scalars['Boolean']['output'];
  likes: Array<Scalars['ID']['output']>;
  likes_count: Scalars['Int']['output'];
  media_type: Scalars['String']['output'];
  /** Has the signed-in viewer opened this story? Drives the seen/unseen ring (Bug 2). */
  seen_by_me: Scalars['Boolean']['output'];
  updated_at: Scalars['String']['output'];
  /** How many distinct viewers have opened this story (Bug 4). */
  views_count: Scalars['Int']['output'];
};

export type PostComment = {
  __typename?: 'PostComment';
  author?: Maybe<User>;
  author_id: Scalars['ID']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

/** A structured postal address — the user's saved main address / order billing address. */
export type PostalAddress = {
  __typename?: 'PostalAddress';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  landmark: Scalars['String']['output'];
  line1: Scalars['String']['output'];
  line2: Scalars['String']['output'];
  pincode: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

export type PostalAddressInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  landmark?: InputMaybe<Scalars['String']['input']>;
  line1?: InputMaybe<Scalars['String']['input']>;
  line2?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
};

/** One Super/Category/Sub taxonomy row a product is sold in (a product may have several). */
export type ProductCategory = {
  __typename?: 'ProductCategory';
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name: Scalars['String']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name: Scalars['String']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name: Scalars['String']['output'];
};

export type ProductCategoryInput = {
  category_id: Scalars['ID']['input'];
  category_name?: InputMaybe<Scalars['String']['input']>;
  sub_category_id: Scalars['ID']['input'];
  sub_category_name?: InputMaybe<Scalars['String']['input']>;
  super_category_id: Scalars['ID']['input'];
  super_category_name?: InputMaybe<Scalars['String']['input']>;
};

export type ProductListingDeliveryTarget =
  | 'HOST'
  | 'SHIPROCKET'
  | 'VENUE';

export type ProductListingInput = {
  brand_id: Scalars['ID']['input'];
  breadth_cm?: InputMaybe<Scalars['Float']['input']>;
  /** Full list of Super/Category/Sub rows the product is sold in. When present, categories[0] backfills the single fields above. */
  categories?: InputMaybe<Array<ProductCategoryInput>>;
  category_id: Scalars['ID']['input'];
  color?: InputMaybe<Scalars['String']['input']>;
  commission_pct: Scalars['Float']['input'];
  delivery_target: ProductListingDeliveryTarget;
  description: Scalars['String']['input'];
  height_cm?: InputMaybe<Scalars['Float']['input']>;
  image_url: Scalars['String']['input'];
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  inventory_count: Scalars['Int']['input'];
  /** Legacy delivery-partner flag. No longer collected from brands (defaults to false); kept optional for backward compatibility. */
  is_duncit_delivery_partner?: InputMaybe<Scalars['Boolean']['input']>;
  length_cm?: InputMaybe<Scalars['Float']['input']>;
  /** Product-level option definitions (e.g. Size, Colour); variants are their combinations. */
  options?: InputMaybe<Array<ProductOptionInput>>;
  product_name: Scalars['String']['input'];
  size_label?: InputMaybe<Scalars['String']['input']>;
  sub_category_id: Scalars['ID']['input'];
  /** Primary category triple (kept for back-compat; mirrors categories[0]). */
  super_category_id: Scalars['ID']['input'];
  unit_cost: Scalars['Float']['input'];
  /** Optional per-variant rows (colour/size/etc.). The flat fields above stay the product default/primary variant. */
  variants?: InputMaybe<Array<ProductVariantInput>>;
  weight_kg?: InputMaybe<Scalars['Float']['input']>;
};

export type ProductListingReviewStatus =
  | 'APPROVED'
  | 'DENIED'
  | 'PENDING';

/** A product-level option definition, e.g. { name: 'Size', values: ['S','M','L'] }. */
export type ProductOption = {
  __typename?: 'ProductOption';
  name: Scalars['String']['output'];
  values: Array<Scalars['String']['output']>;
};

export type ProductOptionInput = {
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

export type ProductOrder = {
  __typename?: 'ProductOrder';
  buyer_email: Scalars['String']['output'];
  buyer_id: Scalars['ID']['output'];
  buyer_name: Scalars['String']['output'];
  buyer_phone?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  fulfilment_method: FulfilmentMethod;
  fulfilment_status: FulfilmentStatus;
  id: Scalars['ID']['output'];
  items_total: Scalars['Float']['output'];
  last_error: Scalars['String']['output'];
  line_items: Array<OrderLineItem>;
  order_no: Scalars['String']['output'];
  payment_id: Scalars['ID']['output'];
  payment_ref: Scalars['String']['output'];
  pickup_location_id: Scalars['String']['output'];
  pickup_ref: Scalars['String']['output'];
  pickup_venue_id?: Maybe<Scalars['ID']['output']>;
  pod?: Maybe<Pod>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  shipping_address?: Maybe<OrderShippingAddress>;
  shipping_charge: Scalars['Float']['output'];
  shiprocket: ShipRocketInfo;
  total: Scalars['Float']['output'];
  tracking_events: Array<OrderTrackingEvent>;
  updated_at: Scalars['String']['output'];
};

export type ProductOrderFilter = {
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  fulfilment_status?: InputMaybe<FulfilmentStatus>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (productOrdersTable). */
export type ProductOrderTablePage = {
  __typename?: 'ProductOrderTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ProductOrder>;
  total: Scalars['Int']['output'];
};

export type ProductOwnership =
  | 'BRAND'
  | 'DUNCIT';

export type ProductReview = {
  __typename?: 'ProductReview';
  comment: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  down_votes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  images: Array<Scalars['String']['output']>;
  /** The viewer's vote on this review: -1 (down), 0 (none) or 1 (up). */
  my_vote: Scalars['Int']['output'];
  product_id: Scalars['ID']['output'];
  rating: Scalars['Int']['output'];
  seller_reply: Scalars['String']['output'];
  seller_reply_at?: Maybe<Scalars['String']['output']>;
  up_votes: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
  user_name: Scalars['String']['output'];
};

export type ProductReviewSummary = {
  __typename?: 'ProductReviewSummary';
  average_rating: Scalars['Float']['output'];
  product_id: Scalars['ID']['output'];
  /** Count of reviews per star, index 0 = 1★ … index 4 = 5★. */
  star_counts: Array<Scalars['Int']['output']>;
  total: Scalars['Int']['output'];
};

export type ProductType =
  | 'CONSUMABLE'
  | 'EQUIPMENT'
  | 'MERCHANDISE';

export type ProductVariant = {
  __typename?: 'ProductVariant';
  breadth_cm: Scalars['Float']['output'];
  color: Scalars['String']['output'];
  description: Scalars['String']['output'];
  height_cm: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  images: Array<Scalars['String']['output']>;
  inventory_count: Scalars['Int']['output'];
  length_cm: Scalars['Float']['output'];
  option_label: Scalars['String']['output'];
  option_values: Array<VariantOptionValue>;
  size_label: Scalars['String']['output'];
  sku: Scalars['String']['output'];
  unit_cost: Scalars['Float']['output'];
  weight_kg: Scalars['Float']['output'];
};

export type ProductVariantInput = {
  breadth_cm?: InputMaybe<Scalars['Float']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  height_cm?: InputMaybe<Scalars['Float']['input']>;
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  inventory_count?: InputMaybe<Scalars['Int']['input']>;
  length_cm?: InputMaybe<Scalars['Float']['input']>;
  option_label?: InputMaybe<Scalars['String']['input']>;
  option_values?: InputMaybe<Array<VariantOptionValueInput>>;
  size_label?: InputMaybe<Scalars['String']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  unit_cost?: InputMaybe<Scalars['Float']['input']>;
  weight_kg?: InputMaybe<Scalars['Float']['input']>;
};

export type ProfileLink = {
  __typename?: 'ProfileLink';
  label: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type ProfileLinkInput = {
  label: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type ProfileVisibility =
  | 'PRIVATE'
  | 'PUBLIC';

/** The lean shape the apps render in ad slots. */
export type PublicAd = {
  __typename?: 'PublicAd';
  ad_title: Scalars['String']['output'];
  ad_type: AdMediaType;
  id: Scalars['ID']['output'];
  media_url: Scalars['String']['output'];
  position: AdPosition;
  redirect_url?: Maybe<Scalars['String']['output']>;
};

export type PublicAppSettings = {
  __typename?: 'PublicAppSettings';
  date_format: Scalars['String']['output'];
  /** Days a Create-Pod draft is kept (from last save) before auto-deletion. */
  draft_retention_days: Scalars['Int']['output'];
  max_birth_year: Scalars['Int']['output'];
  min_birth_year: Scalars['Int']['output'];
  time_format: Scalars['String']['output'];
  /** IANA timezone (e.g. Asia/Kolkata) used to display all dates & times. */
  time_zone: Scalars['String']['output'];
};

export type PublicClientConfig = {
  __typename?: 'PublicClientConfig';
  google_client_id: Scalars['String']['output'];
  google_maps_api_key: Scalars['String']['output'];
};

export type PublicFeatureFlag = {
  __typename?: 'PublicFeatureFlag';
  enabled: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
};

export type PublicFinanceSettings = {
  __typename?: 'PublicFinanceSettings';
  currency_symbol: Scalars['String']['output'];
  /** Global backout deduction % applied to a refund when a replacement fills the spot (Default Deductions → Backouts). */
  default_backout_deduction_pct: Scalars['Float']['output'];
  dummy_mode: Scalars['Boolean']['output'];
  gst_pct: Scalars['Float']['output'];
  platform_fee_pct: Scalars['Float']['output'];
  razorpay_enabled: Scalars['Boolean']['output'];
};

/** Public payload for the mWeb /s/:token fill page. */
export type PublicLeadSurvey = {
  __typename?: 'PublicLeadSurvey';
  already_filled: Scalars['Boolean']['output'];
  lead_name: Scalars['String']['output'];
  survey?: Maybe<Survey>;
};

export type PublicProfile = {
  __typename?: 'PublicProfile';
  bio?: Maybe<Scalars['String']['output']>;
  /** True when the viewer may see this user's posts/stories (owner, public, or follower). */
  can_view_content: Scalars['Boolean']['output'];
  city?: Maybe<Scalars['String']['output']>;
  first_name?: Maybe<Scalars['String']['output']>;
  followers_count: Scalars['Int']['output'];
  following_count: Scalars['Int']['output'];
  full_name?: Maybe<Scalars['String']['output']>;
  /** Whether the signed-in viewer follows this user. */
  is_following: Scalars['Boolean']['output'];
  /** PRIVATE when this profile hides its posts/stories from non-followers. */
  is_private: Scalars['Boolean']['output'];
  last_name?: Maybe<Scalars['String']['output']>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  /** Derived @handle (no real username field exists yet) for the follow lists. */
  username: Scalars['String']['output'];
  zone?: Maybe<Scalars['String']['output']>;
};

export type PublicRole = {
  __typename?: 'PublicRole';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type PushConfig = {
  __typename?: 'PushConfig';
  publicKey: Scalars['String']['output'];
};

export type PushSubscriptionInput = {
  auth: Scalars['String']['input'];
  endpoint: Scalars['String']['input'];
  p256dh: Scalars['String']['input'];
  user_agent?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /** Live ads for a placement (includes AUTO ads). Public — powers the app ad slots. */
  activeAds: Array<PublicAd>;
  /** Location ids that currently have at least one live (active, not-yet-passed) pod. */
  activePodLocationIds: Array<Scalars['ID']['output']>;
  /** Kind-level default survey (all scope null) — back-compat. */
  activeSurvey?: Maybe<Survey>;
  /** Most-specific active survey for a chosen taxonomy slot — null when none. */
  activeSurveyFor?: Maybe<Survey>;
  activeUserStats: ActiveUserStats;
  /** Current per-day prices — powers the cost estimate in the Ads portal and Marketing settings. */
  adPricing: AdPricing;
  /** One request — owner or Marketing. */
  adRequest: AdRequest;
  /** All requests, for the Marketing approval queue. */
  adRequestsTable: AdRequestTablePage;
  /** Onboarding/admin: all slots for any venue (role-gated, no owner check). */
  adminVenueSlots: Array<VenueSlot>;
  aiPrompt?: Maybe<AiPrompt>;
  aiPrompts: Array<AiPrompt>;
  appSettings: AppSettings;
  appVersionInfo: AppVersionInfo;
  /** Admin inbox of approval requests (defaults to all; filter by status/type). */
  approvalRequests: Array<ApprovalRequest>;
  /** Server-side table page (search/filter/sort/paginate) over the admin approval inbox. */
  approvalRequestsTable: ApprovalRequestTablePage;
  /** Active, currently-valid coupons a shopper can apply (global + this pod). */
  availableCouponsForPod: Array<Coupon>;
  availablePodProducts: Array<InventoryProduct>;
  backoutRefundRequest?: Maybe<BackoutRefundRequest>;
  /** Finance-only: every currently backed-out member (rejoined members drop off). */
  backoutRefundRequests: Array<BackoutRefundRequest>;
  backoutRefundRequestsTable: BackoutRefundRequestTablePage;
  badge?: Maybe<Badge>;
  badges: Array<Badge>;
  /** A single callback request by id — backs the agent callback detail page (deep-linkable). */
  bouncerCallbackRequest?: Maybe<BouncerCallbackRequest>;
  bouncerCallbackRequests: BouncerCallbackRequestPage;
  bouncerFeedback: Array<BouncerFeedback>;
  /** A single SOS alert by id — backs the agent SOS detail page (deep-linkable). */
  bouncerSosAlert?: Maybe<BouncerSosAlert>;
  bouncerSosAlerts: BouncerSosAlertPage;
  bouncerSupportTarget: BouncerSupportTarget;
  /** Pickup/warehouse locations for a Duncit or brand owner (Products portal). */
  brandPickupLocations: Array<BrandPickupLocation>;
  branding: Branding;
  categories: Array<Category>;
  category?: Maybe<Category>;
  categoryTree: Array<Category>;
  /** A single challenge by id. */
  challenge?: Maybe<Challenge>;
  /** Total + active challenge counts for the dashboard. */
  challengeStats: ChallengeStats;
  /** All challenges (optionally filtered by a name search). */
  challenges: Array<Challenge>;
  challengesTable: ChallengeTablePage;
  checkoutQuote: CheckoutQuote;
  club?: Maybe<Club>;
  /** Aggregated metrics for the signed-in Club Admin's clubs. */
  clubAdminDashboard: ClubAdminDashboard;
  /** Table page over the dashboard's computed per-club breakdown rows. */
  clubAdminDashboardTable: ClubAdminClubRowTablePage;
  /** Approved hosts matching the search, for the assign-host picker. Club-admin scoped. */
  clubAdminHostSearch: Array<ClubAdminHostOption>;
  clubBySlug?: Maybe<Club>;
  clubRatings: Array<ClubRating>;
  /** Active (non-expired) stories attached to a club, newest first (Bug 6). */
  clubStories: Array<Post>;
  clubs: Array<Club>;
  clubsTable: ClubTablePage;
  /** Approved hosts in the same sub-category who can be invited as co-hosts. Excludes the caller and anyone already invited. */
  coHostCandidates: Array<CoHostCandidate>;
  commsProvider?: Maybe<CommsProvider>;
  /**
   * Lightweight selector for portals that need to pick a provider when
   * sending an email or making a call. Includes only id, name, type,
   * is_default and is_active so the dropdown stays compact.
   */
  commsProviderOptions: Array<CommsProvider>;
  commsProviders: Array<CommsProvider>;
  communicationLog?: Maybe<CommunicationLog>;
  communicationLogs: CommunicationLogPage;
  contactSubmissions: Array<ContactSubmission>;
  contactSubmissionsTable: ContactSubmissionTablePage;
  coupon?: Maybe<Coupon>;
  coupons: Array<Coupon>;
  couponsForPod: Array<Coupon>;
  /** Table sibling of couponsForPod — this pod's coupons plus every GLOBAL coupon. */
  couponsForPodTable: CouponTablePage;
  couponsTable: CouponTablePage;
  /** The configured Twilio caller-ID (From) number, shown on call dialogs. */
  crmCallFromNumber?: Maybe<Scalars['String']['output']>;
  crmCallPrompt?: Maybe<CrmCallPrompt>;
  crmCallPrompts: Array<CrmCallPrompt>;
  crmCallPromptsTable: CrmCallPromptTablePage;
  crmDynamicFields: Array<CrmDynamicField>;
  crmEmailTemplate?: Maybe<CrmEmailTemplate>;
  crmEmailTemplates: Array<CrmEmailTemplate>;
  crmEmailTemplatesTable: CrmEmailTemplateTablePage;
  crmExcelExport: CrmExcelFile;
  /** Read an uploaded spreadsheet's headers + sample rows for column mapping. */
  crmExcelInspect: CrmExcelInspectResult;
  crmExcelTemplate: CrmExcelFile;
  crmLeadConfig: CrmOptionGroup;
  crmManagedOptions: Array<CrmManagedOption>;
  crmManagedOptionsTable: CrmManagedOptionTablePage;
  crmReminders: Array<CrmReminder>;
  crmServices: Array<CrmService>;
  crmServicesOffered: Array<CrmServiceOffered>;
  crmServicesOfferedTable: CrmServiceOfferedTablePage;
  crmWebsitePages: Array<CrmWebsitePage>;
  crmWebsitePagesTable: CrmWebsitePageTablePage;
  dashboardTotals: DashboardTotals;
  /** Onboarding/admin: a single brand by id. */
  ecommBrand?: Maybe<EcommBrand>;
  /** Onboarding/admin: all brands, optionally filtered by status. */
  ecommBrands: Array<EcommBrand>;
  /** Server-side table sibling of ecommBrands (shared table engine). */
  ecommBrandsTable: EcommBrandTablePage;
  ecommLead?: Maybe<EcommLead>;
  ecommLeads: Array<EcommLead>;
  ecommLeadsTable: EcommLeadTablePage;
  emailTemplate?: Maybe<EmailTemplate>;
  emailTemplateBySlug?: Maybe<EmailTemplate>;
  emailTemplates: Array<EmailTemplate>;
  envCategories: Array<EnvCategoryDef>;
  envEntries: Array<EnvEntry>;
  /** Entries currently assigned to a portal (by portal key). */
  envEntriesForPortal: Array<EnvEntry>;
  envEntriesTable: EnvEntryTablePage;
  envEntry?: Maybe<EnvEntry>;
  eventTicket?: Maybe<EventTicket>;
  eventTicketPdfBase64: Scalars['String']['output'];
  eventTickets: Array<EventTicket>;
  eventTicketsTable: EventTicketTablePage;
  expenseSummary: ExpenseSummary;
  expenses: Array<Expense>;
  expensesTable: ExpenseTablePage;
  faq?: Maybe<Faq>;
  faqSubmissions: Array<FaqSubmission>;
  /** Server-side table page (search/filter/sort/paginate) over FAQ submissions. */
  faqSubmissionsTable: FaqSubmissionTablePage;
  faqs: Array<Faq>;
  /** Server-side table page (search/filter/sort/paginate) over faqs. */
  faqsTable: FaqTablePage;
  featureFlag?: Maybe<FeatureFlag>;
  featureFlags: Array<FeatureFlag>;
  featureFlagsTable: FeatureFlagTablePage;
  financeDashboardStats: FinanceDashboardStats;
  financeSettings: FinanceSettings;
  /** People who follow the given user (their public profiles). */
  followersOf: Array<PublicProfile>;
  /** Posts + active stories from the people/clubs the viewer follows, newest first. */
  followingFeed: Array<Post>;
  /** People the given user follows (their public profiles). */
  followingOf: Array<PublicProfile>;
  /** Founder/Startup dashboard: every KPI for the date range, computed + manual. */
  founderDashboard: FounderDashboard;
  host?: Maybe<Host>;
  hostInsights: HostInsights;
  hostLead?: Maybe<HostLead>;
  hostLeads: Array<HostLead>;
  hostLeadsTable: HostLeadTablePage;
  hostPodDeleteImpact: HostPodDeleteImpact;
  hostRequest?: Maybe<HostRequest>;
  hostRequests: Array<HostRequest>;
  hostRequestsTable: HostRequestTablePage;
  hosts: Array<Host>;
  /** Admin/onboarding table page over all hosts (shared table engine). */
  hostsTable: HostTablePage;
  interview?: Maybe<Interview>;
  interviews: Array<Interview>;
  inventoryActivityLogs: Array<InventoryActivityLog>;
  inventoryAnalytics: Array<InventoryAnalyticsPoint>;
  inventoryProduct?: Maybe<InventoryProduct>;
  inventoryProductLinkedPods: Array<InventoryLinkedPod>;
  inventoryProducts: Array<InventoryProduct>;
  /** Server-side table sibling of inventoryProducts (shared table engine). */
  inventoryProductsTable: InventoryProductTablePage;
  inventoryStockMovements: Array<InventoryStockMovement>;
  jobApplications: Array<JobApplication>;
  jobApplicationsTable: JobApplicationTablePage;
  /** Optional category_id/sub_category_id resolve the survey for a chosen scope (multi-category leads). */
  leadSurvey: LeadSurvey;
  /** Public — resolve a survey from a share token (no auth). */
  leadSurveyByToken: PublicLeadSurvey;
  /** Server-side table page (filter/sort/paginate) over one lead's survey entries. */
  leadSurveyEntriesTable: LeadSurveyEntryTablePage;
  legalDocument?: Maybe<LegalDocument>;
  legalDocumentStats: LegalDocumentStats;
  legalDocumentStatsTable: LegalDocumentTypeCountTablePage;
  legalDocuments: Array<LegalDocument>;
  legalDocumentsTable: LegalDocumentTablePage;
  location?: Maybe<Location>;
  locations: Array<Location>;
  locationsTable: LocationTablePage;
  marketingCampaignPreviewCards: Array<MarketingCampaignPreviewCard>;
  marketingCampaigns: Array<MarketingCampaign>;
  marketingCampaignsTable: MarketingCampaignTablePage;
  /** Approved products of one external brand — the e-commerce marketplace list. */
  marketplaceBrandProducts: Array<InventoryProduct>;
  /** Server-side table sibling of marketplaceBrandProducts (shared table engine). */
  marketplaceBrandProductsTable: InventoryProductTablePage;
  /** Products portal e-commerce: external brands (default APPROVED) + approved-product counts. */
  marketplaceBrands: Array<EcommBrand>;
  /** Server-side table sibling of marketplaceBrands (shared table engine; active brands only). */
  marketplaceBrandsTable: EcommBrandTablePage;
  /** APPROVED, active venues that auto-match a club by location (+ locality) + Super/Sub category (admin Club form). Empty when no location is given. */
  matchingVenues: Array<Venue>;
  me?: Maybe<User>;
  /** Global slot-availability config. */
  meetingAvailability: MeetingAvailability;
  /** Onboarding-team holidays / leave days (block slots; shown on the calendar). */
  meetingHolidays: Array<MeetingHoliday>;
  /** Bookable slots (others' bookings disabled). Pass kind so the user's own other-flow bookings show unavailable; staff pass exclude_meeting_id to keep the meeting being scheduled selectable. */
  meetingSlots: Array<MeetingSlot>;
  /**  Account health for the signed-in user. Always returns a record (default base = 100).  */
  myAccountHealth: HealthScore;
  myActiveBouncerSos?: Maybe<BouncerSosAlert>;
  /** The signed-in advertiser's own requests (Ads portal). */
  myAdRequestsTable: AdRequestTablePage;
  /** Clubs the signed-in user administers (CLUB_ADMIN scope). */
  myAdminClubs: Array<Club>;
  /** Paginated + filtered 'Your Clubs' list for the signed-in Club Admin. */
  myAdminClubsPage: ClubAdminClubsPage;
  /** Max-info table page over the signed-in Club Admin's clubs ('Your Clubs' table). */
  myAdminClubsTable: ClubAdminClubInfoTablePage;
  /** The signed-in advertiser's dashboard KPIs (Ads portal home). */
  myAdsDashboard: AdsDashboard;
  myApiKeys: Array<ApiKey>;
  myApiKeysTable: ApiKeyTablePage;
  myBadges: Array<UserBadge>;
  /** The signed-in user's own callback request history, newest first. */
  myCallbackRequests: Array<BouncerCallbackRequest>;
  myChatRooms: Array<ChatRoom>;
  /** Pods where I am a co-host. status defaults to ACCEPTED; pass PENDING for my invites. */
  myCoHostedPods: Array<Pod>;
  /** The signed-in partner's e-commerce brands (a partner may run several). */
  myEcommBrands: Array<EcommBrand>;
  /** Server-side table sibling of myEcommBrands — always scoped to the caller's own brands. */
  myEcommBrandsTable: EcommBrandTablePage;
  /** Products portal: brand/product change requests raised from this portal (kind = BRAND | PRODUCT). */
  myEcommChangeRequests: Array<ApprovalRequest>;
  myEventTicketForPod?: Maybe<EventTicket>;
  myEventTickets: Array<EventTicket>;
  myHost?: Maybe<Host>;
  myHostEarningsSummary: EarningsSummary;
  myHostPayouts: Array<PaymentReleaseRequest>;
  myHostPods: Array<Pod>;
  /** Table page over the caller's own hosted pods (myHostPods rows). */
  myHostPodsTable: PodTablePage;
  myHostRequest?: Maybe<HostRequest>;
  myHostRequests: Array<HostRequest>;
  myHostTakenCategoryIds: Array<Scalars['ID']['output']>;
  myInterviews: Array<Interview>;
  /** Current user's meeting request for a kind. */
  myMeeting?: Maybe<OnboardingMeeting>;
  /** All of the current user's onboarding meetings (one per kind). */
  myMeetings: Array<OnboardingMeeting>;
  myNotifications: Array<UserNotification>;
  myPayments: Array<Payment>;
  /** An attended (past) pod the user has not yet rated — drives the post-pod feedback pop-up. */
  myPendingPodFeedback?: Maybe<BouncerPodInfo>;
  myPodDraft?: Maybe<PodDraft>;
  myPodDrafts: Array<PodDraft>;
  myPodIdeas: Array<PodIdea>;
  myPodMemberships: Array<PodMember>;
  /** My own pods that carry at least one co-host. */
  myPodsWithCoHosts: Array<Pod>;
  myPosts: Array<Post>;
  myProductListings: Array<InventoryProduct>;
  /** Server-side table sibling of myProductListings — always scoped to the caller's own listings. */
  myProductListingsTable: InventoryProductTablePage;
  /** The signed-in buyer's product orders (optionally scoped to one pod). */
  myProductOrders: Array<ProductOrder>;
  myProductOrdersForPod: Array<ProductOrder>;
  /** My code + everyone I brought in (generates the code on first read). */
  myReferral: MyReferral;
  /** The viewer's saved pods, with optional server-side search, category filter (matches the selected category and its sub-categories) and sort. */
  mySavedPods: Array<Pod>;
  /** The signed-in owner's saved recurring-slot templates (optionally scoped to a venue). */
  mySlotTemplates: Array<SlotTemplate>;
  /** The signed-in user's own active stories, newest first. */
  myStories: Array<Post>;
  mySupportChat?: Maybe<SupportChatSession>;
  /** Current user's submitted response for a survey (drives 'asked once'). */
  mySurveyResponse?: Maybe<SurveyResponse>;
  myTickets: Array<Ticket>;
  /** All of the signed-in user's support items (tickets, SOS, callbacks, chats). */
  myUnifiedSupportTickets: Array<UnifiedSupportTicket>;
  myUnreadNotificationCount: Scalars['Int']['output'];
  /** Without venue_id: the owner's current application. With venue_id: that venue (must be the owner's). */
  myVenue?: Maybe<Venue>;
  myVenueEarningsSummary: EarningsSummary;
  /**  Venue health for a venue owned by the signed-in user.  */
  myVenueHealth?: Maybe<HealthScore>;
  myVenuePayouts: Array<PaymentReleaseRequest>;
  myVenues: Array<Venue>;
  /** Owner-scoped table page over the caller's venues (shared table engine). */
  myVenuesTable: VenueTablePage;
  /** All verification types for the signed-in user (NOT_SUBMITTED when absent). */
  myVerifications: Array<Verification>;
  myWallet: Wallet;
  myWalletTransactions: Array<WalletTransaction>;
  myWithdrawals: Array<WalletWithdrawal>;
  newsletterSubscribers: Array<NewsletterSubscriber>;
  newsletterSubscribersTable: NewsletterSubscriberTablePage;
  notifications: Array<Notification>;
  notificationsTable: NotificationTablePage;
  /** Onboarding list of meetings (calendar + tables). */
  onboardingMeetings: Array<OnboardingMeeting>;
  /** Server-side table page (search/filter/sort/paginate) over onboarding meetings. */
  onboardingMeetingsTable: OnboardingMeetingTablePage;
  partnerDashboard: PartnerDashboard;
  /** Admin Partners list — users holding a partner-portal role (Host / Venue Partner / Product Seller / Club Admin). */
  partnersTable: UserTablePage;
  payment?: Maybe<Payment>;
  paymentInvoicePdfBase64: Scalars['String']['output'];
  paymentReleaseRequests: Array<PaymentReleaseRequest>;
  paymentReleaseRequestsTable: PaymentReleaseRequestTablePage;
  payments: Array<Payment>;
  paymentsTable: PaymentTablePage;
  pexelsSearch: PexelsSearchResult;
  pexelsSearchVideos: PexelsVideoSearchResult;
  pod?: Maybe<Pod>;
  podBySlugs?: Maybe<Pod>;
  podComments: Array<PodComment>;
  podFinanceBreakdown: PodFinanceBreakdown;
  podIdea?: Maybe<PodIdea>;
  podIdeas: Array<PodIdea>;
  podIdeasTable: PodIdeaTablePage;
  podMembers: Array<PodMember>;
  podMembershipState: PodMembershipState;
  podMessages: Array<PodMessage>;
  podPlans: Array<PodPlan>;
  podPlansTable: PodPlanTablePage;
  podSettlementPreview: PodSettlement;
  pods: Array<Pod>;
  podsTable: PodTablePage;
  policies: Array<Policy>;
  policiesTable: PolicyTablePage;
  policy?: Maybe<Policy>;
  policyBySlug?: Maybe<Policy>;
  /** The policy rendered as a downloadable PDF (base64). */
  policyPdfBase64: Scalars['String']['output'];
  portalMode: PortalModePublic;
  portalModes: Array<PortalMode>;
  portalModesTable: PortalModeTablePage;
  post?: Maybe<Post>;
  posts: Array<Post>;
  potentialPodEarnings: PodFinanceWaterfall;
  previewCoupon: CouponPreview;
  productListingRequests: Array<InventoryProduct>;
  /** Server-side table sibling of productListingRequests (shared table engine). */
  productListingRequestsTable: InventoryProductTablePage;
  productOrder?: Maybe<ProductOrder>;
  productOrderTracking?: Maybe<OrderTracking>;
  /** Ops: all pod-placed product orders (Products portal). */
  productOrders: Array<ProductOrder>;
  productOrdersTable: ProductOrderTablePage;
  productReviewSummary: ProductReviewSummary;
  productReviews: Array<ProductReview>;
  publicAppSettings: PublicAppSettings;
  publicClientConfig: PublicClientConfig;
  /** Public brand card for the pod product-detail brand dialog (any signed-in user; select only non-sensitive fields client-side). */
  publicEcommBrand?: Maybe<EcommBrand>;
  publicFaqGroups: Array<FaqGroup>;
  publicFeatureFlags: Array<PublicFeatureFlag>;
  publicFinanceSettings: PublicFinanceSettings;
  publicHosts: Array<Host>;
  /** Public read of a single product (any signed-in user) — powers the product-detail view on a pod's shop. */
  publicInventoryProduct?: Maybe<InventoryProduct>;
  publicPartnerFaqs: Array<Faq>;
  publicPodPlans: Array<PodPlan>;
  publicPolicies: Array<Policy>;
  publicRoles: Array<PublicRole>;
  publicUserProfile?: Maybe<PublicProfile>;
  publicUsersByIds: Array<PublicProfile>;
  /** Public single-venue detail (APPROVED + active only). */
  publicVenue?: Maybe<Venue>;
  /** APPROVED, active venues for the consumer Venues page — optionally scoped to a location, with server-side search + Super→Cat→Sub category filter. No args = every public venue (legacy callers). */
  publicVenues: Array<Venue>;
  publicWebsiteContent: Array<WebsiteContentItem>;
  /** Public: a site's active navigation, ordered by group + sort order. */
  publicWebsiteNav: Array<WebsiteNavItem>;
  pushConfig: PushConfig;
  referralLookup?: Maybe<PodMember>;
  referralSettings: ReferralSettings;
  /** Admin: every redeemed referral, newest first. */
  referrals: Array<AdminReferral>;
  referralsTable: AdminReferralTablePage;
  /** Render MJML with sample vars for the editor preview (CRM store). */
  renderCrmEmailTemplate: CrmEmailTemplateRender;
  /**
   * Render the given MJML with sample variables, returning the HTML and any
   * MJML compile errors. Used for the right-hand preview in the editor.
   */
  renderEmailTemplate: EmailTemplateRender;
  renderMarketingCampaign: MarketingCampaignRender;
  role?: Maybe<Role>;
  roles: Array<Role>;
  rolesTable: RoleTablePage;
  /** Club-centric discovery search grouped by upcoming-pod availability. */
  searchDiscovery: SearchResults;
  /** Type-ahead suggestions across clubs, categories, pods and activities. */
  searchSuggestions: Array<SearchSuggestion>;
  /** Active (non-expired) stories, newest first. Optionally scoped to one author. */
  stories: Array<Post>;
  /** Owner-only list of who viewed a story, newest first (Bug 4). */
  storyViewers: Array<StoryView>;
  supportChatMessages: Array<SupportChatMessage>;
  supportChatSessions: SupportChatSessionPage;
  /** Transcript of a chat (.txt or .docx) — accessible to its owner or a support agent. */
  supportChatTranscript: SupportChatTranscript;
  /** Builder read of a single survey by id. */
  surveyById?: Maybe<Survey>;
  /** Onboarding list — surveys for a kind, optionally narrowed by taxonomy/search. */
  surveys: Array<Survey>;
  /** Server-side table page (search/filter/sort/paginate) over surveys. */
  surveysTable: SurveyTablePage;
  /** Paged/searchable view over techDockerInfo.containers for the shared table engine. */
  techDockerContainersTable: TechDockerContainerTablePage;
  /** Docker daemon + container status (requires the docker socket mounted into the API container). */
  techDockerInfo: TechDockerInfo;
  /** Live host metrics for the Tech portal Server > Info page. Pass sslHost to include that domain's TLS certificate. */
  techServerInfo: TechServerInfo;
  ticket?: Maybe<Ticket>;
  /** Transcript of a ticket (.txt or .docx) — accessible to its owner or a support agent. */
  ticketTranscript: SupportChatTranscript;
  tickets: TicketPage;
  user?: Maybe<User>;
  /**  Admin-only: account health for any user.  */
  userAccountHealth: HealthScore;
  userActivityYear: UserActivityYear;
  userBadges: Array<UserBadge>;
  userClickstream: Array<AppAnalyticsEvent>;
  userContactActions: Array<UserContactAction>;
  userContactActionsTable: UserContactActionTablePage;
  /** All survey responses for a user (admin). */
  userSurveyResponses: Array<UserSurveyResponse>;
  /** A user's verifications — admin review (user details). */
  userVerifications: Array<Verification>;
  /** Server-side table page over a user's verifications — admin review (user details). */
  userVerificationsTable: VerificationTablePage;
  users: Array<User>;
  usersTable: UserTablePage;
  venue?: Maybe<Venue>;
  venueAvailableSlots: Array<VenueSlot>;
  /**  Admin-only: health for a specific venue.  */
  venueHealth?: Maybe<HealthScore>;
  venueLead?: Maybe<VenueLead>;
  venueLeads: Array<VenueLead>;
  venueLeadsTable: VenueLeadTablePage;
  venueOwnerStats: VenueOwnerStats;
  venueRegistrationConfig: VenueRegistrationConfig;
  /** Owner: pending booking requests across their venues (or one venue). */
  venueSlotRequests: Array<VenueSlotRequest>;
  venueSlots: Array<VenueSlot>;
  venues: Array<Venue>;
  /** Admin/onboarding table page over all venues (shared table engine). */
  venuesTable: VenueTablePage;
  /** Cached communities (paginated + searchable). */
  waCommunities: WaCommunityPage;
  /** Stored gateway config + last-known status (no network call). */
  waConnection: WaConnection;
  /** Cached contacts (paginated + searchable). */
  waContacts: WaContactPage;
  /** Export user leads as a base64 .xlsx (optionally filtered by search). */
  waExportUserLeads: Scalars['String']['output'];
  /** Latest background extraction job (for progress polling). */
  waExtraction?: Maybe<WaExtraction>;
  /** Live-fetch a group's members (also imports them as leads). */
  waGroupMembers: Array<WaMember>;
  /** Cached groups (paginated, searchable, filterable by community). */
  waGroups: WaGroupPage;
  /** Dashboard counters (leads / communities / groups / contacts). */
  waLeadStats: WaLeadStats;
  /** Current QR data URL to scan + session status. */
  waQr: WaQr;
  /** Refreshes the session status from the gateway, then returns it. */
  waStatus: WaConnection;
  waUserLead?: Maybe<WaUserLead>;
  /** Generated user leads (paginated, searchable, sortable). */
  waUserLeads: WaUserLeadPage;
  websiteContent: Array<WebsiteContentItem>;
  websiteContentTable: WebsiteContentItemTablePage;
  websiteNav: Array<WebsiteNavItem>;
  websiteNavTable: WebsiteNavItemTablePage;
  withdrawalRequests: Array<WalletWithdrawal>;
  withdrawalRequestsTable: WalletWithdrawalTablePage;
};


export type QueryActiveAdsArgs = {
  position: AdPosition;
};


export type QueryActiveSurveyArgs = {
  kind: SurveyKind;
};


export type QueryActiveSurveyForArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  kind: SurveyKind;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryActiveUserStatsArgs = {
  from: Scalars['String']['input'];
  granularity?: InputMaybe<AnalyticsGranularity>;
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};


export type QueryAdRequestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAdRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAdminVenueSlotsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
};


export type QueryAiPromptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAiPromptsArgs = {
  filter?: InputMaybe<AiPromptFilter>;
};


export type QueryApprovalRequestsArgs = {
  status?: InputMaybe<ApprovalStatus>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryApprovalRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAvailableCouponsForPodArgs = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAvailablePodProductsArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryBackoutRefundRequestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBackoutRefundRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
};


export type QueryBadgesArgs = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryBouncerCallbackRequestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBouncerCallbackRequestsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BouncerCallbackStatus>;
};


export type QueryBouncerFeedbackArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBouncerSosAlertArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBouncerSosAlertsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BouncerSosStatus>;
};


export type QueryBrandPickupLocationsArgs = {
  brand_doc_id?: InputMaybe<Scalars['ID']['input']>;
  owner_kind?: InputMaybe<PickupOwnerKind>;
};


export type QueryCategoriesArgs = {
  filter?: InputMaybe<CategoryFilterInput>;
};


export type QueryCategoryArgs = {
  category_id: Scalars['ID']['input'];
};


export type QueryChallengeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryChallengesArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryChallengesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCheckoutQuoteArgs = {
  input: CheckoutQuoteInput;
};


export type QueryClubArgs = {
  club_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminDashboardArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryClubAdminDashboardTableArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<TableQueryInput>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryClubAdminHostSearchArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryClubBySlugArgs = {
  club_slug: Scalars['String']['input'];
};


export type QueryClubRatingsArgs = {
  club_doc_id: Scalars['ID']['input'];
};


export type QueryClubStoriesArgs = {
  club_id: Scalars['ID']['input'];
};


export type QueryClubsArgs = {
  filter?: InputMaybe<ClubFilterInput>;
};


export type QueryClubsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCoHostCandidatesArgs = {
  pod_doc_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id: Scalars['ID']['input'];
};


export type QueryCommsProviderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommsProviderOptionsArgs = {
  type: CommsProviderType;
};


export type QueryCommsProvidersArgs = {
  filter?: InputMaybe<CommsProviderFilter>;
};


export type QueryCommunicationLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommunicationLogsArgs = {
  filter?: InputMaybe<CommunicationLogFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryContactSubmissionsArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ContactStatus>;
};


export type QueryContactSubmissionsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCouponArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCouponsArgs = {
  filter?: InputMaybe<CouponFilterInput>;
};


export type QueryCouponsForPodArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryCouponsForPodTableArgs = {
  pod_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCouponsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCrmCallPromptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCrmCallPromptsArgs = {
  filter?: InputMaybe<CrmCallPromptFilter>;
};


export type QueryCrmCallPromptsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCrmDynamicFieldsArgs = {
  entity?: InputMaybe<CrmEntityType>;
  include_inactive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCrmEmailTemplateArgs = {
  template_id: Scalars['ID']['input'];
};


export type QueryCrmEmailTemplatesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCrmExcelExportArgs = {
  entity: CrmAiEntity;
};


export type QueryCrmExcelInspectArgs = {
  content_base64: Scalars['String']['input'];
};


export type QueryCrmExcelTemplateArgs = {
  entity: CrmAiEntity;
};


export type QueryCrmManagedOptionsArgs = {
  group: CrmManagedOptionGroup;
  include_inactive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCrmManagedOptionsTableArgs = {
  group: CrmManagedOptionGroup;
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCrmRemindersArgs = {
  filter?: InputMaybe<CrmReminderFilter>;
};


export type QueryCrmServicesArgs = {
  include_inactive?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<CrmServiceKind>;
};


export type QueryCrmServicesOfferedArgs = {
  filter?: InputMaybe<CrmServiceOfferedFilter>;
};


export type QueryCrmServicesOfferedTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCrmWebsitePagesArgs = {
  entity_type: CrmEntityType;
  lead_id: Scalars['ID']['input'];
};


export type QueryCrmWebsitePagesTableArgs = {
  entity_type: CrmEntityType;
  lead_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryDashboardTotalsArgs = {
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
};


export type QueryEcommBrandsArgs = {
  status?: InputMaybe<EcommBrandStatus>;
};


export type QueryEcommBrandsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryEcommLeadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEcommLeadsArgs = {
  filter?: InputMaybe<CrmLeadFilter>;
};


export type QueryEcommLeadsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryEmailTemplateArgs = {
  template_id: Scalars['ID']['input'];
};


export type QueryEmailTemplateBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryEnvEntriesArgs = {
  filter?: InputMaybe<EnvEntryFilter>;
};


export type QueryEnvEntriesForPortalArgs = {
  portalKey: Scalars['String']['input'];
};


export type QueryEnvEntriesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryEnvEntryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventTicketArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventTicketPdfBase64Args = {
  ticket_doc_id: Scalars['ID']['input'];
};


export type QueryEventTicketsArgs = {
  filter?: InputMaybe<EventTicketFilterInput>;
};


export type QueryEventTicketsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryExpenseSummaryArgs = {
  filter?: InputMaybe<ExpenseFilterInput>;
};


export type QueryExpensesArgs = {
  filter?: InputMaybe<ExpenseFilterInput>;
};


export type QueryExpensesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryFaqArgs = {
  faq_doc_id: Scalars['ID']['input'];
};


export type QueryFaqSubmissionsArgs = {
  status?: InputMaybe<FaqSubmissionStatus>;
};


export type QueryFaqSubmissionsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryFaqsArgs = {
  filter?: InputMaybe<FaqFilterInput>;
};


export type QueryFaqsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryFeatureFlagArgs = {
  key: Scalars['String']['input'];
};


export type QueryFeatureFlagsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryFollowersOfArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryFollowingFeedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  source: FollowingFeedSource;
};


export type QueryFollowingOfArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryFounderDashboardArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHostArgs = {
  host_doc_id: Scalars['ID']['input'];
};


export type QueryHostInsightsArgs = {
  months?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryHostLeadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHostLeadsArgs = {
  filter?: InputMaybe<CrmLeadFilter>;
};


export type QueryHostLeadsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryHostPodDeleteImpactArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryHostRequestArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHostRequestsArgs = {
  status?: InputMaybe<HostRequestStatus>;
};


export type QueryHostRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryHostsArgs = {
  status?: InputMaybe<HostStatus>;
};


export type QueryHostsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryInterviewArgs = {
  interview_doc_id: Scalars['ID']['input'];
};


export type QueryInterviewsArgs = {
  filter?: InputMaybe<InterviewFilterInput>;
};


export type QueryInventoryActivityLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  product_doc_id: Scalars['ID']['input'];
};


export type QueryInventoryAnalyticsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
  product_doc_id: Scalars['ID']['input'];
};


export type QueryInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type QueryInventoryProductLinkedPodsArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type QueryInventoryProductsArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  ownership?: InputMaybe<ProductOwnership>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InventoryStatus>;
};


export type QueryInventoryProductsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryInventoryStockMovementsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  product_doc_id: Scalars['ID']['input'];
};


export type QueryJobApplicationsArgs = {
  status?: InputMaybe<JobApplicationStatus>;
};


export type QueryJobApplicationsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryLeadSurveyArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  entity: LeadSurveyEntity;
  lead_id: Scalars['ID']['input'];
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryLeadSurveyByTokenArgs = {
  token: Scalars['String']['input'];
};


export type QueryLeadSurveyEntriesTableArgs = {
  entity: LeadSurveyEntity;
  lead_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryLegalDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLegalDocumentStatsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryLegalDocumentsArgs = {
  filter?: InputMaybe<LegalDocumentFilterInput>;
};


export type QueryLegalDocumentsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryLocationArgs = {
  location_doc_id: Scalars['ID']['input'];
};


export type QueryLocationsArgs = {
  filter?: InputMaybe<LocationFilterInput>;
};


export type QueryLocationsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMarketingCampaignPreviewCardsArgs = {
  type: MarketingCampaignCardType;
};


export type QueryMarketingCampaignsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMarketplaceBrandProductsArgs = {
  brand_doc_id: Scalars['ID']['input'];
};


export type QueryMarketplaceBrandProductsTableArgs = {
  brand_doc_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMarketplaceBrandsArgs = {
  status?: InputMaybe<EcommBrandStatus>;
};


export type QueryMarketplaceBrandsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMatchingVenuesArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  locality?: InputMaybe<Scalars['String']['input']>;
  location_id: Scalars['ID']['input'];
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMeetingSlotsArgs = {
  exclude_meeting_id?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<SurveyKind>;
};


export type QueryMyActiveBouncerSosArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryMyAdRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyAdminClubsPageArgs = {
  filter?: InputMaybe<MyAdminClubsFilter>;
};


export type QueryMyAdminClubsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyApiKeysTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyCallbackRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyCoHostedPodsArgs = {
  status?: InputMaybe<CoHostStatus>;
};


export type QueryMyEcommBrandsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyEcommChangeRequestsArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyEventTicketForPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryMyHostPodsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyHostPodsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyMeetingArgs = {
  kind: SurveyKind;
};


export type QueryMyNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryMyPodDraftArgs = {
  draft_id: Scalars['ID']['input'];
};


export type QueryMyPodMembershipsArgs = {
  status?: InputMaybe<MembershipStatus>;
};


export type QueryMyProductListingsArgs = {
  brand_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyProductListingsTableArgs = {
  brand_id?: InputMaybe<Scalars['ID']['input']>;
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMyProductOrdersForPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryMySavedPodsArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<SavedPodSort>;
};


export type QueryMySlotTemplatesArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMySurveyResponseArgs = {
  survey_id: Scalars['ID']['input'];
};


export type QueryMyVenueArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyVenueHealthArgs = {
  venue_id: Scalars['ID']['input'];
};


export type QueryMyVenuesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryNewsletterSubscribersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryNotificationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryOnboardingMeetingsArgs = {
  filter?: InputMaybe<MeetingFilter>;
};


export type QueryOnboardingMeetingsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPartnerDashboardArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryPartnersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPaymentArgs = {
  payment_doc_id: Scalars['ID']['input'];
};


export type QueryPaymentInvoicePdfBase64Args = {
  payment_doc_id: Scalars['ID']['input'];
};


export type QueryPaymentReleaseRequestsArgs = {
  filter?: InputMaybe<PaymentReleaseFilterInput>;
};


export type QueryPaymentReleaseRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPaymentsArgs = {
  filter?: InputMaybe<PaymentFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPaymentsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPexelsSearchArgs = {
  orientation?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPexelsSearchVideosArgs = {
  orientation?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  perPage?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodBySlugsArgs = {
  club_slug: Scalars['String']['input'];
  pod_slug: Scalars['String']['input'];
};


export type QueryPodCommentsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodFinanceBreakdownArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryPodIdeaArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type QueryPodIdeasArgs = {
  filter?: InputMaybe<PodIdeaFilterInput>;
};


export type QueryPodIdeasTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodMembersArgs = {
  pod_doc_id: Scalars['ID']['input'];
  status?: InputMaybe<MembershipStatus>;
};


export type QueryPodMembershipStateArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodMessagesArgs = {
  before?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  pod_id: Scalars['ID']['input'];
};


export type QueryPodPlansTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodSettlementPreviewArgs = {
  pod_id: Scalars['ID']['input'];
  venue_bill_amount: Scalars['Float']['input'];
};


export type QueryPodsArgs = {
  filter?: InputMaybe<PodFilterInput>;
};


export type QueryPodsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPoliciesArgs = {
  filter?: InputMaybe<PolicyFilterInput>;
};


export type QueryPoliciesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPolicyArgs = {
  policy_doc_id: Scalars['ID']['input'];
};


export type QueryPolicyBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryPolicyPdfBase64Args = {
  slug: Scalars['String']['input'];
};


export type QueryPortalModeArgs = {
  key: Scalars['String']['input'];
};


export type QueryPortalModesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPostArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type QueryPostsArgs = {
  author_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPotentialPodEarningsArgs = {
  amount: Scalars['Float']['input'];
  venue_amount?: InputMaybe<Scalars['Float']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPreviewCouponArgs = {
  input: CouponPreviewInput;
};


export type QueryProductListingRequestsArgs = {
  status?: InputMaybe<ProductListingReviewStatus>;
};


export type QueryProductListingRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryProductOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductOrderTrackingArgs = {
  order_no: Scalars['String']['input'];
};


export type QueryProductOrdersArgs = {
  filter?: InputMaybe<ProductOrderFilter>;
};


export type QueryProductOrdersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryProductReviewSummaryArgs = {
  product_id: Scalars['ID']['input'];
};


export type QueryProductReviewsArgs = {
  product_id: Scalars['ID']['input'];
};


export type QueryPublicEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
};


export type QueryPublicInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type QueryPublicPartnerFaqsArgs = {
  topic?: InputMaybe<PartnerFaqTopic>;
};


export type QueryPublicUserProfileArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryPublicUsersByIdsArgs = {
  user_ids: Array<Scalars['ID']['input']>;
};


export type QueryPublicVenueArgs = {
  venue_id: Scalars['ID']['input'];
};


export type QueryPublicVenuesArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPublicWebsiteContentArgs = {
  type: WebsitePageType;
};


export type QueryPublicWebsiteNavArgs = {
  site: WebsiteNavSite;
};


export type QueryReferralLookupArgs = {
  token: Scalars['String']['input'];
};


export type QueryReferralsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryRenderCrmEmailTemplateArgs = {
  mjml: Scalars['String']['input'];
  vars?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRenderEmailTemplateArgs = {
  mjml: Scalars['String']['input'];
  vars?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRenderMarketingCampaignArgs = {
  input: MarketingCampaignPreviewInput;
};


export type QueryRoleArgs = {
  role_id: Scalars['ID']['input'];
};


export type QueryRolesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QuerySearchDiscoveryArgs = {
  input?: InputMaybe<SearchDiscoveryInput>;
};


export type QuerySearchSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryStoriesArgs = {
  author_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryStoryViewersArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type QuerySupportChatMessagesArgs = {
  before?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  session_id: Scalars['ID']['input'];
};


export type QuerySupportChatSessionsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SupportChatStatus>;
};


export type QuerySupportChatTranscriptArgs = {
  format?: InputMaybe<TranscriptFormat>;
  session_id: Scalars['ID']['input'];
};


export type QuerySurveyByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySurveysArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<SurveyKind>;
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySurveysTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryTechDockerContainersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryTechServerInfoArgs = {
  sslHost?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTicketArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTicketTranscriptArgs = {
  format?: InputMaybe<TranscriptFormat>;
  ticket_id: Scalars['ID']['input'];
};


export type QueryTicketsArgs = {
  assignee_id?: InputMaybe<Scalars['ID']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TicketStatus>;
};


export type QueryUserArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserAccountHealthArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserActivityYearArgs = {
  user_id: Scalars['ID']['input'];
  year?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserBadgesArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserClickstreamArgs = {
  date: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  user_id: Scalars['ID']['input'];
};


export type QueryUserContactActionsArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserContactActionsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
  user_id: Scalars['ID']['input'];
};


export type QueryUserSurveyResponsesArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserVerificationsArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserVerificationsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
  user_id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  filter?: InputMaybe<UsersFilter>;
};


export type QueryUsersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryVenueArgs = {
  venue_doc_id: Scalars['ID']['input'];
};


export type QueryVenueAvailableSlotsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
};


export type QueryVenueHealthArgs = {
  venue_id: Scalars['ID']['input'];
};


export type QueryVenueLeadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVenueLeadsArgs = {
  filter?: InputMaybe<CrmLeadFilter>;
};


export type QueryVenueLeadsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryVenueOwnerStatsArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryVenueSlotRequestsArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryVenueSlotsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
};


export type QueryVenuesArgs = {
  status?: InputMaybe<VenueStatus>;
};


export type QueryVenuesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryWaCommunitiesArgs = {
  input?: InputMaybe<WaPageInput>;
};


export type QueryWaContactsArgs = {
  input?: InputMaybe<WaPageInput>;
};


export type QueryWaExportUserLeadsArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWaGroupMembersArgs = {
  group_jid: Scalars['String']['input'];
};


export type QueryWaGroupsArgs = {
  input?: InputMaybe<WaPageInput>;
};


export type QueryWaUserLeadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWaUserLeadsArgs = {
  input?: InputMaybe<WaPageInput>;
};


export type QueryWebsiteContentArgs = {
  type?: InputMaybe<WebsitePageType>;
};


export type QueryWebsiteContentTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryWebsiteNavArgs = {
  site?: InputMaybe<WebsiteNavSite>;
};


export type QueryWebsiteNavTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryWithdrawalRequestsArgs = {
  status?: InputMaybe<WithdrawalStatus>;
};


export type QueryWithdrawalRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};

export type RaiseSosInput = {
  location?: InputMaybe<BouncerGeoInput>;
  message?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
};

/**
 * Everything the client needs to open the Razorpay checkout sheet. When a coupon
 * makes the total zero, free=true + payment is the completed (free) booking and the
 * sheet is skipped.
 */
export type RazorpayOrder = {
  __typename?: 'RazorpayOrder';
  amount: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  description: Scalars['String']['output'];
  free: Scalars['Boolean']['output'];
  key_id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  payment?: Maybe<Payment>;
  payment_doc_id: Scalars['ID']['output'];
  prefill_contact: Scalars['String']['output'];
  prefill_email: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

/** Live checkout — same contact/billing fields as the dummy flow (no simulate_failure). */
export type RazorpayOrderInput = {
  amount: Scalars['Float']['input'];
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  coupon_code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  selected_products?: InputMaybe<Array<CheckoutProductSelectionInput>>;
  shipping_address?: InputMaybe<OrderShippingAddressInput>;
};

export type RecordAppEventInput = {
  checkout_url?: InputMaybe<Scalars['String']['input']>;
  client_event_id?: InputMaybe<Scalars['String']['input']>;
  event_type: AppAnalyticsEventType;
  metadata_json?: InputMaybe<Scalars['String']['input']>;
  occurred_at?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  route?: InputMaybe<Scalars['String']['input']>;
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
  target_href?: InputMaybe<Scalars['String']['input']>;
  target_label?: InputMaybe<Scalars['String']['input']>;
  target_role?: InputMaybe<Scalars['String']['input']>;
  target_tag?: InputMaybe<Scalars['String']['input']>;
  target_text?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type RecordUserContactActionInput = {
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  recording_url?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
  target: Scalars['String']['input'];
  type: AdminContactActionType;
  user_id: Scalars['ID']['input'];
};

export type ReferralEntry = {
  __typename?: 'ReferralEntry';
  full_name?: Maybe<Scalars['String']['output']>;
  referred_at: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type ReferralSettings = {
  __typename?: 'ReferralSettings';
  gift_description: Scalars['String']['output'];
};

export type RefundStatus =
  | 'NONE'
  | 'NOT_ELIGIBLE'
  | 'PENDING'
  | 'PROCESSED';

export type RegisterInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  dob: Scalars['String']['input'];
  email: Scalars['String']['input'];
  first_name: Scalars['String']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type RequestCallbackInput = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type RequestMeetingInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  requested_at: Scalars['String']['input'];
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type RequestPasswordChangeInput = {
  current_password: Scalars['String']['input'];
};

export type RequestWithdrawalInput = {
  account_holder_name?: InputMaybe<Scalars['String']['input']>;
  account_number?: InputMaybe<Scalars['String']['input']>;
  amount: Scalars['Float']['input'];
  ifsc_code?: InputMaybe<Scalars['String']['input']>;
  payout_method: WithdrawalMethod;
  upi_id?: InputMaybe<Scalars['String']['input']>;
};

export type ResetPasswordInput = {
  email: Scalars['String']['input'];
  new_password: Scalars['String']['input'];
  otp: Scalars['String']['input'];
};

export type ReviewPaymentReleaseInput = {
  approval_reason?: InputMaybe<Scalars['String']['input']>;
  approval_type?: InputMaybe<PaymentReleaseApprovalType>;
  approved_amount?: InputMaybe<Scalars['Float']['input']>;
  status: PaymentReleaseStatus;
};

export type ReviewWithdrawalInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  status: WithdrawalStatus;
};

export type Role = {
  __typename?: 'Role';
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_system: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (rolesTable). */
export type RoleTablePage = {
  __typename?: 'RoleTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Role>;
  total: Scalars['Int']['output'];
};

/** Sort order for the viewer's saved pods. RECENT = most recently saved first. */
export type SavedPodSort =
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'PRICE_HIGH'
  | 'PRICE_LOW'
  | 'RECENT';

export type SavedPodState = {
  __typename?: 'SavedPodState';
  pod_id: Scalars['ID']['output'];
  saved: Scalars['Boolean']['output'];
  saved_pod_ids: Array<Scalars['ID']['output']>;
};

/** A club surfaced by search, with its next-7-day pods and the viewer's follow state. */
export type SearchClubResult = {
  __typename?: 'SearchClubResult';
  club: Club;
  /** Whether the signed-in viewer already follows this club. */
  is_following: Scalars['Boolean']['output'];
  /** ISO date of the soonest upcoming pod, or null when there are none. */
  next_pod_date?: Maybe<Scalars['String']['output']>;
  /** Total attendees across the club's upcoming pods (drives the 'Most Participants' sort). */
  participant_count: Scalars['Int']['output'];
  /** Pods scheduled within the next 7 days, soonest first. Empty for 'more clubs'. */
  upcoming_pods: Array<Pod>;
};

export type SearchDiscoveryInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};

export type SearchResults = {
  __typename?: 'SearchResults';
  /** Clubs hosting pods in the next 7 days — 'Happening This Week'. */
  happening: Array<SearchClubResult>;
  /** Matching clubs without an upcoming pod — 'More Clubs Worth Exploring'. */
  more_clubs: Array<SearchClubResult>;
  /** The trimmed query that produced these results. */
  query: Scalars['String']['output'];
};

export type SearchSuggestion = {
  __typename?: 'SearchSuggestion';
  kind: SearchSuggestionKind;
  text: Scalars['String']['output'];
};

export type SearchSuggestionKind =
  | 'ACTIVITY'
  | 'CATEGORY'
  | 'CLUB'
  | 'POD';

export type SeedAdminResult = {
  __typename?: 'SeedAdminResult';
  created: Scalars['Boolean']['output'];
  email: Scalars['String']['output'];
  emailed: Scalars['Boolean']['output'];
};

export type SendAppReleaseEmailInput = {
  apk_size_mb: Scalars['Float']['input'];
  apk_url: Scalars['String']['input'];
  build_name: Scalars['String']['input'];
  commits: Array<AppReleaseCommitInput>;
  deletions?: InputMaybe<Scalars['Int']['input']>;
  files_changed?: InputMaybe<Scalars['Int']['input']>;
  insertions?: InputMaybe<Scalars['Int']['input']>;
  range_label?: InputMaybe<Scalars['String']['input']>;
  /** Optional override; defaults to the built-in release distribution list. */
  recipients?: InputMaybe<Array<Scalars['String']['input']>>;
  version: Scalars['String']['input'];
};

export type ShipRocketInfo = {
  __typename?: 'ShipRocketInfo';
  awb: Scalars['String']['output'];
  courier_name: Scalars['String']['output'];
  label_url: Scalars['String']['output'];
  last_synced_at?: Maybe<Scalars['String']['output']>;
  order_id: Scalars['String']['output'];
  shipment_id: Scalars['String']['output'];
  tracking_status: Scalars['String']['output'];
};

export type SlotTemplate = {
  __typename?: 'SlotTemplate';
  category: Scalars['String']['output'];
  config: SlotTemplateConfig;
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_default: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  venue_id?: Maybe<Scalars['ID']['output']>;
  visibility: Scalars['String']['output'];
};

export type SlotTemplateConfig = {
  __typename?: 'SlotTemplateConfig';
  default_price: Scalars['Int']['output'];
  end_time: Scalars['String']['output'];
  per_day_price: Array<SlotTemplatePerDayPrice>;
  skip_holidays: Scalars['Boolean']['output'];
  skip_weekly_off: Scalars['Boolean']['output'];
  start_time: Scalars['String']['output'];
  weekdays: Array<Scalars['Int']['output']>;
};

export type SlotTemplateConfigInput = {
  default_price?: InputMaybe<Scalars['Int']['input']>;
  end_time: Scalars['String']['input'];
  per_day_price?: InputMaybe<Array<SlotTemplatePerDayPriceInput>>;
  skip_holidays?: InputMaybe<Scalars['Boolean']['input']>;
  skip_weekly_off?: InputMaybe<Scalars['Boolean']['input']>;
  start_time: Scalars['String']['input'];
  weekdays: Array<Scalars['Int']['input']>;
};

export type SlotTemplatePerDayPrice = {
  __typename?: 'SlotTemplatePerDayPrice';
  price: Scalars['Int']['output'];
  weekday: Scalars['Int']['output'];
};

export type SlotTemplatePerDayPriceInput = {
  price: Scalars['Int']['input'];
  weekday: Scalars['Int']['input'];
};

export type StartRecordedUserCallInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  target: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};

export type StatusCount = {
  __typename?: 'StatusCount';
  count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

export type StockMovementInput = {
  quantity: Scalars['Int']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  type: StockMovementType;
};

export type StockMovementType =
  | 'ADJUST'
  | 'DAMAGE'
  | 'IN'
  | 'OUT'
  | 'RELEASE'
  | 'RESERVE';

/** One viewer of a STORY (Bugs 2 & 4). */
export type StoryView = {
  __typename?: 'StoryView';
  user?: Maybe<User>;
  user_id: Scalars['ID']['output'];
  viewed_at: Scalars['String']['output'];
};

export type SubmitAdRequestInput = {
  ad_description: Scalars['String']['input'];
  /** PLACEMENT (default) for the Ads portal; PRODUCT_AD / BRAND_AD from the Partner portal (requires product_id). */
  ad_kind?: InputMaybe<AdKind>;
  ad_title: Scalars['String']['input'];
  ad_type: AdMediaType;
  /** 1 day to 1 month. */
  duration_days: Scalars['Int']['input'];
  media_url: Scalars['String']['input'];
  position: AdPosition;
  /** The brand's product this ad promotes (required for PRODUCT_AD / BRAND_AD). Brand + names + image are derived server-side. */
  product_id?: InputMaybe<Scalars['ID']['input']>;
  redirect_url?: InputMaybe<Scalars['String']['input']>;
  /** ISO date-time; today or later. */
  start_at: Scalars['String']['input'];
  target_audience?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitBouncerFeedbackInput = {
  category: BouncerFeedbackCategory;
  message?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
};

export type SubmitContactInput = {
  attachments?: InputMaybe<Array<Scalars['String']['input']>>;
  email: Scalars['String']['input'];
  message: Scalars['String']['input'];
  name: Scalars['String']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitFaqQuestionInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  question: Scalars['String']['input'];
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitHostRequestInput = {
  answers?: InputMaybe<Array<HostRequestSurveyAnswer>>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  survey_id?: InputMaybe<Scalars['ID']['input']>;
};

export type SubmitJobApplicationInput = {
  cover_note?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  portfolio_url?: InputMaybe<Scalars['String']['input']>;
  resume_url?: InputMaybe<Scalars['String']['input']>;
  role_content_id?: InputMaybe<Scalars['ID']['input']>;
  role_title: Scalars['String']['input'];
};

export type SubscribeNewsletterInput = {
  email: Scalars['String']['input'];
  source?: InputMaybe<NewsletterSource>;
};

export type SuperCategoryCount = {
  __typename?: 'SuperCategoryCount';
  count: Scalars['Int']['output'];
  super_category_name?: Maybe<Scalars['String']['output']>;
  super_category_slug?: Maybe<Scalars['String']['output']>;
};

export type SupportChatMessage = {
  __typename?: 'SupportChatMessage';
  attachments: Array<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** AGENT message authored by the AI assistant rather than a human. */
  is_ai: Scalars['Boolean']['output'];
  sender_id: Scalars['ID']['output'];
  sender_name: Scalars['String']['output'];
  sender_photo?: Maybe<Scalars['String']['output']>;
  sender_role: SupportChatSenderRole;
  session_id: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

export type SupportChatSenderRole =
  | 'AGENT'
  | 'SYSTEM'
  | 'USER';

export type SupportChatSession = {
  __typename?: 'SupportChatSession';
  agent_id?: Maybe<Scalars['ID']['output']>;
  agent_last_read_at?: Maybe<Scalars['String']['output']>;
  /** True while the AI assistant is answering; false once a human takes over. */
  ai_active: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  feedback_at?: Maybe<Scalars['String']['output']>;
  feedback_comment?: Maybe<Scalars['String']['output']>;
  handed_off: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  last_message_at: Scalars['String']['output'];
  last_message_preview: Scalars['String']['output'];
  rating?: Maybe<Scalars['Int']['output']>;
  /** User can reopen the chat until this instant (null if not resolved/closed). */
  reopen_deadline?: Maybe<Scalars['String']['output']>;
  /** When the chat was resolved/closed (drives the reopen window). */
  resolved_at?: Maybe<Scalars['String']['output']>;
  status: SupportChatStatus;
  /** Per-chat support ticket number, e.g. CH-A1B2C3. */
  ticket_no: Scalars['String']['output'];
  unread_for_agent: Scalars['Int']['output'];
  unread_for_user: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  user: SupportChatUser;
  /** When each side last opened the chat (drives Seen / blue-tick state). */
  user_last_read_at?: Maybe<Scalars['String']['output']>;
};

/** A page of support chat sessions for the agent list (server-side pagination + sort + search). */
export type SupportChatSessionPage = {
  __typename?: 'SupportChatSessionPage';
  items: Array<SupportChatSession>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type SupportChatStatus =
  | 'CLOSED'
  | 'OPEN';

/** A server-generated export of a chat or ticket (filename + base64 content). */
export type SupportChatTranscript = {
  __typename?: 'SupportChatTranscript';
  /** Base64-encoded file for the requested format (.txt utf-8 or .docx binary). */
  content_base64: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  /** Plain-text rendering (always present, regardless of the chosen format). */
  text: Scalars['String']['output'];
};

export type SupportChatUser = {
  __typename?: 'SupportChatUser';
  avatar_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
};

export type SupportCreateUserInput = {
  email: Scalars['String']['input'];
  first_name: Scalars['String']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
};

export type Survey = {
  __typename?: 'Survey';
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  kind: SurveyKind;
  questions: Array<SurveyQuestion>;
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name?: Maybe<Scalars['String']['output']>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type SurveyAnswer = {
  __typename?: 'SurveyAnswer';
  qid: Scalars['ID']['output'];
  value?: Maybe<Scalars['String']['output']>;
  values: Array<Scalars['String']['output']>;
};

export type SurveyAnswerInput = {
  qid: Scalars['ID']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SurveyKind =
  | 'CLUB_ADMIN'
  | 'ECOMM'
  | 'HOST'
  | 'VENUE';

export type SurveyQuestion = {
  __typename?: 'SurveyQuestion';
  help?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  multi: Scalars['Boolean']['output'];
  options: Array<Scalars['String']['output']>;
  qid: Scalars['ID']['output'];
  required: Scalars['Boolean']['output'];
  sort_order: Scalars['Int']['output'];
  type: SurveyQuestionType;
};

export type SurveyQuestionInput = {
  help?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
  multi?: InputMaybe<Scalars['Boolean']['input']>;
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  qid?: InputMaybe<Scalars['ID']['input']>;
  required?: InputMaybe<Scalars['Boolean']['input']>;
  type: SurveyQuestionType;
};

export type SurveyQuestionType =
  | 'MCQ'
  | 'SECTION'
  | 'TEXT'
  | 'TEXTAREA';

export type SurveyResponse = {
  __typename?: 'SurveyResponse';
  answers: Array<SurveyAnswer>;
  kind: SurveyKind;
  submitted_at?: Maybe<Scalars['String']['output']>;
  survey_id?: Maybe<Scalars['ID']['output']>;
};

/** A user's response joined with the survey's question labels (for admin display). */
export type SurveyResponseItem = {
  __typename?: 'SurveyResponseItem';
  answer: Scalars['String']['output'];
  label: Scalars['String']['output'];
  qid: Scalars['ID']['output'];
  type: SurveyQuestionType;
};

/** Server-side table page for the shared table engine (surveysTable). */
export type SurveyTablePage = {
  __typename?: 'SurveyTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Survey>;
  total: Scalars['Int']['output'];
};

export type TableFilterInput = {
  field: Scalars['String']['input'];
  op: TableFilterOp;
  value?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type TableFilterOp =
  | 'between'
  | 'contains'
  | 'eq'
  | 'gte'
  | 'in'
  | 'is_false'
  | 'is_true'
  | 'lte'
  | 'ne';

export type TableQueryInput = {
  filters?: InputMaybe<Array<TableFilterInput>>;
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<TableSortDir>;
};

export type TableSortDir =
  | 'asc'
  | 'desc';

export type TechBytesInfo = {
  __typename?: 'TechBytesInfo';
  freeBytes: Scalars['Float']['output'];
  totalBytes: Scalars['Float']['output'];
  usagePercent: Scalars['Float']['output'];
  usedBytes: Scalars['Float']['output'];
};

export type TechCpuInfo = {
  __typename?: 'TechCpuInfo';
  cores: Scalars['Int']['output'];
  loadAvg1: Scalars['Float']['output'];
  loadAvg5: Scalars['Float']['output'];
  loadAvg15: Scalars['Float']['output'];
  model: Scalars['String']['output'];
  speedMhz: Scalars['Int']['output'];
  usagePercent: Scalars['Float']['output'];
};

export type TechDiskInfo = {
  __typename?: 'TechDiskInfo';
  freeBytes: Scalars['Float']['output'];
  path: Scalars['String']['output'];
  totalBytes: Scalars['Float']['output'];
  usagePercent: Scalars['Float']['output'];
  usedBytes: Scalars['Float']['output'];
};

export type TechDockerContainer = {
  __typename?: 'TechDockerContainer';
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  state: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (techDockerContainersTable). */
export type TechDockerContainerTablePage = {
  __typename?: 'TechDockerContainerTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<TechDockerContainer>;
  total: Scalars['Int']['output'];
};

export type TechDockerInfo = {
  __typename?: 'TechDockerInfo';
  available: Scalars['Boolean']['output'];
  containers: Array<TechDockerContainer>;
  containersRunning: Scalars['Int']['output'];
  containersTotal: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type TechNetworkInterface = {
  __typename?: 'TechNetworkInterface';
  address: Scalars['String']['output'];
  family: Scalars['String']['output'];
  internal: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type TechOsInfo = {
  __typename?: 'TechOsInfo';
  arch: Scalars['String']['output'];
  distro: Scalars['String']['output'];
  hostname: Scalars['String']['output'];
  kernelUptimeSeconds: Scalars['Float']['output'];
  nodeVersion: Scalars['String']['output'];
  platform: Scalars['String']['output'];
  processUptimeSeconds: Scalars['Float']['output'];
  release: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type TechServerInfo = {
  __typename?: 'TechServerInfo';
  collectedAt: Scalars['String']['output'];
  cpu: TechCpuInfo;
  disk: TechDiskInfo;
  memory: TechBytesInfo;
  network: Array<TechNetworkInterface>;
  os: TechOsInfo;
  sshPort: Scalars['Int']['output'];
  ssl?: Maybe<TechSslInfo>;
};

export type TechSslInfo = {
  __typename?: 'TechSslInfo';
  daysRemaining?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  host: Scalars['String']['output'];
  issuer?: Maybe<Scalars['String']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
  subject?: Maybe<Scalars['String']['output']>;
  valid: Scalars['Boolean']['output'];
  validFrom?: Maybe<Scalars['String']['output']>;
  validTo?: Maybe<Scalars['String']['output']>;
};

export type Ticket = {
  __typename?: 'Ticket';
  agent_last_read_at?: Maybe<Scalars['String']['output']>;
  assignee_id?: Maybe<Scalars['ID']['output']>;
  assignee_name?: Maybe<Scalars['String']['output']>;
  category: TicketCategory;
  created_at: Scalars['String']['output'];
  feedback_at?: Maybe<Scalars['String']['output']>;
  feedback_comment?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  last_message_at: Scalars['String']['output'];
  message_count: Scalars['Int']['output'];
  messages: Array<TicketMessage>;
  /** The pod this ticket is about, if it was raised from a pod. */
  pod_id?: Maybe<Scalars['ID']['output']>;
  pod_title: Scalars['String']['output'];
  priority: TicketPriority;
  /** Satisfaction rating (1-5) left by the owner after resolution; null if none. */
  rating?: Maybe<Scalars['Int']['output']>;
  /** Reopen is allowed by the user until this instant (null if not resolved/closed). */
  reopen_deadline?: Maybe<Scalars['String']['output']>;
  /** When the ticket was resolved/closed (drives the reopen window). */
  resolved_at?: Maybe<Scalars['String']['output']>;
  status: TicketStatus;
  subject: Scalars['String']['output'];
  /** Human-readable support ticket number, e.g. ST-A1B2C3 (derived from the id). */
  ticket_no: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  user: TicketActor;
  /** When each side last opened the thread — drives the Sent/Seen ticks (B12). */
  user_last_read_at?: Maybe<Scalars['String']['output']>;
};

export type TicketActor = {
  __typename?: 'TicketActor';
  avatar_url?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_email_verified: Scalars['Boolean']['output'];
  is_phone_verified: Scalars['Boolean']['output'];
  /** When the user joined Duncit (ISO). */
  joined_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
};

export type TicketAuthorRole =
  | 'AGENT'
  /** Automated timeline entry (resolve / reopen), no human author. */
  | 'SYSTEM'
  | 'USER';

export type TicketCategory =
  | 'BOOKING'
  | 'GENERAL'
  | 'OTHER'
  | 'PAYMENT'
  | 'SAFETY'
  | 'TECHNICAL';

export type TicketMessage = {
  __typename?: 'TicketMessage';
  attachments: Array<Scalars['String']['output']>;
  author_id: Scalars['ID']['output'];
  author_name: Scalars['String']['output'];
  author_photo?: Maybe<Scalars['String']['output']>;
  author_role: TicketAuthorRole;
  body_html: Scalars['String']['output'];
  body_text: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** A page of tickets for the agent list (server-side pagination + sort + search). */
export type TicketPage = {
  __typename?: 'TicketPage';
  items: Array<Ticket>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type TicketPriority =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM';

export type TicketStatus =
  | 'CLOSED'
  | 'OPEN'
  | 'PENDING'
  | 'RESOLVED';

/** Export format for support chat / ticket transcripts. */
export type TranscriptFormat =
  | 'DOCX'
  | 'TXT';

/** One row of the user's unified support history (every category in one list). */
export type UnifiedSupportTicket = {
  __typename?: 'UnifiedSupportTicket';
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** TICKET | SOS | CALLBACK | CHAT */
  source: Scalars['String']['output'];
  status: Scalars['String']['output'];
  /** Prefixed human ticket number — ST- (ticket), SOS-, CB- (callback), CH- (chat). */
  ticket_no: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type UnitType =
  | 'BOTTLE'
  | 'BOX'
  | 'KG'
  | 'LITRE'
  | 'METER'
  | 'OTHER'
  | 'PACKET'
  | 'PIECE';

export type UpdateAdPricingInput = {
  auto_per_day?: InputMaybe<Scalars['Float']['input']>;
  club_list_per_day?: InputMaybe<Scalars['Float']['input']>;
  currency_symbol?: InputMaybe<Scalars['String']['input']>;
  explore_scroll_per_day?: InputMaybe<Scalars['Float']['input']>;
  home_bottom_per_day?: InputMaybe<Scalars['Float']['input']>;
  pod_details_per_day?: InputMaybe<Scalars['Float']['input']>;
  pod_list_per_day?: InputMaybe<Scalars['Float']['input']>;
  sidebar_per_day?: InputMaybe<Scalars['Float']['input']>;
  status_per_day?: InputMaybe<Scalars['Float']['input']>;
  venue_list_per_day?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateAiPromptInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  target_model?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAppSettingsInput = {
  date_format?: InputMaybe<Scalars['String']['input']>;
  /** Days a Create-Pod draft is kept before auto-deletion (min 1). */
  draft_retention_days?: InputMaybe<Scalars['Int']['input']>;
  jwt_expires_in?: InputMaybe<Scalars['String']['input']>;
  jwt_no_expiry?: InputMaybe<Scalars['Boolean']['input']>;
  max_birth_year?: InputMaybe<Scalars['Int']['input']>;
  min_birth_year?: InputMaybe<Scalars['Int']['input']>;
  time_format?: InputMaybe<Scalars['String']['input']>;
  time_zone?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The only fields an owner may change on an APPROVED venue: description,
 * images, capacity list, owner contact details, and appended (never replaced)
 * documents. Everything else is locked after approval.
 */
export type UpdateApprovedVenueInput = {
  add_documents?: InputMaybe<Array<VenueDocumentInput>>;
  capacity_items?: InputMaybe<Array<VenueCapacityItemInput>>;
  cover_image_url?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gallery?: InputMaybe<Array<Scalars['String']['input']>>;
  owner_address?: InputMaybe<Scalars['String']['input']>;
  owner_dob?: InputMaybe<Scalars['String']['input']>;
  owner_name?: InputMaybe<Scalars['String']['input']>;
  owner_phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBadgeInput = {
  condition_type?: InputMaybe<BadgeConditionType>;
  description?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBrandingInput = {
  android_app_url?: InputMaybe<Scalars['String']['input']>;
  app_latest_version?: InputMaybe<Scalars['String']['input']>;
  app_name?: InputMaybe<Scalars['String']['input']>;
  home_all_vibe_icon_url?: InputMaybe<Scalars['String']['input']>;
  home_header_tagline?: InputMaybe<Scalars['String']['input']>;
  ios_app_url?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  mobile_favicon_url?: InputMaybe<Scalars['String']['input']>;
  mobile_font_family?: InputMaybe<Scalars['String']['input']>;
  mobile_logo_url?: InputMaybe<Scalars['String']['input']>;
  mobile_splash_type?: InputMaybe<Scalars['String']['input']>;
  mobile_splash_url?: InputMaybe<Scalars['String']['input']>;
  mweb_favicon_url?: InputMaybe<Scalars['String']['input']>;
  mweb_font_family?: InputMaybe<Scalars['String']['input']>;
  mweb_logo_url?: InputMaybe<Scalars['String']['input']>;
  mweb_splash_type?: InputMaybe<Scalars['String']['input']>;
  mweb_splash_url?: InputMaybe<Scalars['String']['input']>;
  portals_favicon_url?: InputMaybe<Scalars['String']['input']>;
  portals_font_family?: InputMaybe<Scalars['String']['input']>;
  portals_logo_url?: InputMaybe<Scalars['String']['input']>;
  portals_splash_type?: InputMaybe<Scalars['String']['input']>;
  portals_splash_url?: InputMaybe<Scalars['String']['input']>;
  primary_color?: InputMaybe<Scalars['String']['input']>;
  support_email?: InputMaybe<Scalars['String']['input']>;
  support_phone?: InputMaybe<Scalars['String']['input']>;
  venues_card_video_url?: InputMaybe<Scalars['String']['input']>;
  website_favicon_url?: InputMaybe<Scalars['String']['input']>;
  website_footer_logo_url?: InputMaybe<Scalars['String']['input']>;
  website_header_logo_url?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCategoryInput = {
  allow_co_hosts?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  max_co_hosts?: InputMaybe<Scalars['Int']['input']>;
  media?: InputMaybe<Array<CategoryMediaInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateChallengeInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateClubInput = {
  admin_user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  club_description?: InputMaybe<Scalars['String']['input']>;
  club_feature_images_and_videos?: InputMaybe<Array<ClubMediaInput>>;
  club_moments?: InputMaybe<Array<ClubMediaInput>>;
  club_name?: InputMaybe<Scalars['String']['input']>;
  club_whats_app_announcement_link?: InputMaybe<Scalars['String']['input']>;
  club_whats_app_community_link?: InputMaybe<Scalars['String']['input']>;
  club_whats_app_group_link?: InputMaybe<Scalars['String']['input']>;
  faqs?: InputMaybe<Array<ClubFaqInput>>;
  host_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_verified?: InputMaybe<Scalars['Boolean']['input']>;
  locality?: InputMaybe<Scalars['String']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  meetup_venues_id?: InputMaybe<Array<Scalars['String']['input']>>;
  perks?: InputMaybe<Array<Scalars['String']['input']>>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
  what_we_do?: InputMaybe<Array<Scalars['String']['input']>>;
  who_we_are?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateCommsProviderInput = {
  config?: InputMaybe<CommsProviderConfigInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCouponInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discount_pct?: InputMaybe<Scalars['Float']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  max_uses?: InputMaybe<Scalars['Int']['input']>;
  min_order_amount?: InputMaybe<Scalars['Float']['input']>;
  per_user_limit?: InputMaybe<Scalars['Int']['input']>;
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  scope?: InputMaybe<CouponScope>;
  valid_from?: InputMaybe<Scalars['String']['input']>;
  valid_until?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCrmCallPromptInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCrmEmailTemplateInput = {
  attachments?: InputMaybe<Array<CrmEmailAssetInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<CrmEmailAssetInput>>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  mjml?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
  target?: InputMaybe<CrmEmailTemplateTarget>;
  variables?: InputMaybe<Array<CrmEmailTemplateVariableInput>>;
};

export type UpdateCrmManagedOptionInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCrmReminderInput = {
  assigned_to?: InputMaybe<Scalars['String']['input']>;
  due_at?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CrmReminderStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCrmServiceOfferedInput = {
  applies_to_ecomm?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_host?: InputMaybe<Scalars['Boolean']['input']>;
  applies_to_venue?: InputMaybe<Scalars['Boolean']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEmailTemplateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  mjml?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
  variables?: InputMaybe<Array<EmailTemplateVariableInput>>;
};

export type UpdateEnvEntryInput = {
  assigned_portals?: InputMaybe<Array<Scalars['String']['input']>>;
  config?: InputMaybe<Array<EnvConfigPairInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFaqInput = {
  answer?: InputMaybe<Scalars['String']['input']>;
  audience?: InputMaybe<FaqAudience>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  partner_topic?: InputMaybe<PartnerFaqTopic>;
  question?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateFeatureFlagInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFinanceSettingsInput = {
  business_address?: InputMaybe<Scalars['String']['input']>;
  business_gstin?: InputMaybe<Scalars['String']['input']>;
  business_name?: InputMaybe<Scalars['String']['input']>;
  currency_symbol?: InputMaybe<Scalars['String']['input']>;
  default_backout_deduction_pct?: InputMaybe<Scalars['Float']['input']>;
  default_club_admin_pct?: InputMaybe<Scalars['Float']['input']>;
  default_host_commission_pct?: InputMaybe<Scalars['Float']['input']>;
  default_host_share_pct?: InputMaybe<Scalars['Float']['input']>;
  default_product_commission_pct?: InputMaybe<Scalars['Float']['input']>;
  default_venue_commission_pct?: InputMaybe<Scalars['Float']['input']>;
  default_venue_share_pct?: InputMaybe<Scalars['Float']['input']>;
  dummy_mode?: InputMaybe<Scalars['Boolean']['input']>;
  gst_pct?: InputMaybe<Scalars['Float']['input']>;
  host_payout_mode?: InputMaybe<PayoutMode>;
  invoice_footer_note?: InputMaybe<Scalars['String']['input']>;
  invoice_label?: InputMaybe<Scalars['String']['input']>;
  invoice_logo_url?: InputMaybe<Scalars['String']['input']>;
  invoice_prefix?: InputMaybe<Scalars['String']['input']>;
  invoice_support_email?: InputMaybe<Scalars['String']['input']>;
  invoice_support_phone?: InputMaybe<Scalars['String']['input']>;
  invoice_templates?: InputMaybe<InvoiceTemplatesInput>;
  invoice_terms?: InputMaybe<Scalars['String']['input']>;
  payout_day_of_week?: InputMaybe<Scalars['Int']['input']>;
  payout_time?: InputMaybe<Scalars['String']['input']>;
  platform_fee_pct?: InputMaybe<Scalars['Float']['input']>;
  venue_payout_mode?: InputMaybe<PayoutMode>;
};

export type UpdateInterviewInput = {
  admin_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_link?: InputMaybe<Scalars['String']['input']>;
  scheduled_slot?: InputMaybe<InterviewSlotInput>;
  status?: InputMaybe<InterviewStatus>;
};

export type UpdateInventoryProductInput = {
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch_number?: InputMaybe<Scalars['String']['input']>;
  brand_name?: InputMaybe<Scalars['String']['input']>;
  breadth_cm?: InputMaybe<Scalars['Float']['input']>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  damaged_count?: InputMaybe<Scalars['Int']['input']>;
  delivery_available?: InputMaybe<Scalars['Boolean']['input']>;
  delivery_charge?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discount_percent?: InputMaybe<Scalars['Float']['input']>;
  expiry_date?: InputMaybe<Scalars['String']['input']>;
  height_cm?: InputMaybe<Scalars['Float']['input']>;
  host_request_allowed?: InputMaybe<Scalars['Boolean']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  inventory_count?: InputMaybe<Scalars['Int']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  length_cm?: InputMaybe<Scalars['Float']['input']>;
  low_stock_alert?: InputMaybe<Scalars['Int']['input']>;
  manufacturing_date?: InputMaybe<Scalars['String']['input']>;
  max_order_qty?: InputMaybe<Scalars['Int']['input']>;
  min_order_qty?: InputMaybe<Scalars['Int']['input']>;
  pod_available?: InputMaybe<Scalars['Boolean']['input']>;
  product_name?: InputMaybe<Scalars['String']['input']>;
  product_type?: InputMaybe<ProductType>;
  purchase_price?: InputMaybe<Scalars['Float']['input']>;
  reserved_count?: InputMaybe<Scalars['Int']['input']>;
  selling_price?: InputMaybe<Scalars['Float']['input']>;
  short_description?: InputMaybe<Scalars['String']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InventoryStatus>;
  storage_instructions?: InputMaybe<Scalars['String']['input']>;
  supplier_contact?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  tax_percent?: InputMaybe<Scalars['Float']['input']>;
  unit_cost?: InputMaybe<Scalars['Float']['input']>;
  unit_type?: InputMaybe<UnitType>;
  vendor_name?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<InventoryVisibility>;
  weight_kg?: InputMaybe<Scalars['Float']['input']>;
  weight_volume?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLegalDocumentInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  document_type?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLocationInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  country_code?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  location_image?: InputMaybe<Scalars['String']['input']>;
  location_name?: InputMaybe<Scalars['String']['input']>;
  location_pincode?: InputMaybe<Scalars['String']['input']>;
  location_zones?: InputMaybe<Array<LocationZoneInput>>;
  state?: InputMaybe<Scalars['String']['input']>;
  state_code?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMeetingInput = {
  meeting_link?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  scheduled_at?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<MeetingStatus>;
};

export type UpdateMyProfileInput = {
  /** The user's saved main postal address. */
  address?: InputMaybe<PostalAddressInput>;
  bio?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  profile_links?: InputMaybe<Array<ProfileLinkInput>>;
  profile_photo?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  whatsapp_extension?: InputMaybe<Scalars['String']['input']>;
  whatsapp_number?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePodIdeaInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePodInput = {
  available_perks?: InputMaybe<Array<Scalars['String']['input']>>;
  club_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  meeting_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_platform?: InputMaybe<Scalars['String']['input']>;
  meeting_url?: InputMaybe<Scalars['String']['input']>;
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  payment_terms?: InputMaybe<Scalars['String']['input']>;
  place_charges?: InputMaybe<Array<PodPlaceChargeInput>>;
  pod_amount?: InputMaybe<Scalars['Int']['input']>;
  pod_attendees?: InputMaybe<Array<Scalars['ID']['input']>>;
  pod_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_description?: InputMaybe<Scalars['String']['input']>;
  pod_end_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_hosts_id?: InputMaybe<Array<Scalars['ID']['input']>>;
  pod_images_and_videos?: InputMaybe<Array<PodMediaInput>>;
  pod_info?: InputMaybe<Scalars['String']['input']>;
  pod_mode?: InputMaybe<PodMode>;
  pod_occurrence?: InputMaybe<PodOccurrence>;
  pod_title?: InputMaybe<Scalars['String']['input']>;
  pod_type?: InputMaybe<PodType>;
  product_requests?: InputMaybe<Array<PodProductRequestInput>>;
  products_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  reel_url?: InputMaybe<Scalars['String']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
  zone_name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePolicyInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSurveyInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  questions: Array<SurveyQuestionInput>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  assigned_city?: InputMaybe<Scalars['String']['input']>;
  assigned_zones?: InputMaybe<Array<Scalars['String']['input']>>;
  bio?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  host_commission_pct?: InputMaybe<Scalars['Float']['input']>;
  host_share_pct?: InputMaybe<Scalars['Float']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  profile_photo?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
  state?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVenueSlotInput = {
  block?: InputMaybe<Scalars['Boolean']['input']>;
  end_at?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  start_at?: InputMaybe<Scalars['String']['input']>;
};

export type UploadedImage = {
  __typename?: 'UploadedImage';
  fileId: Scalars['String']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  /** The saved main postal address (prefills checkout billing). */
  address: PostalAddress;
  assigned_city?: Maybe<Scalars['String']['output']>;
  assigned_zones?: Maybe<Array<Scalars['String']['output']>>;
  auth_providers: Array<AuthProvider>;
  bio?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  dob: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  first_name: Scalars['String']['output'];
  followers_count: Scalars['Int']['output'];
  following_club_ids: Array<Scalars['ID']['output']>;
  following_count: Scalars['Int']['output'];
  following_pod_ids: Array<Scalars['ID']['output']>;
  following_user_ids: Array<Scalars['ID']['output']>;
  full_name?: Maybe<Scalars['String']['output']>;
  host_commission_pct: Scalars['Float']['output'];
  host_share_pct: Scalars['Float']['output'];
  interest_categories: Array<Category>;
  interest_category_ids: Array<Scalars['ID']['output']>;
  is_email_verified?: Maybe<Scalars['Boolean']['output']>;
  is_first_time_user: Scalars['Boolean']['output'];
  is_phone_verified?: Maybe<Scalars['Boolean']['output']>;
  last_login_at?: Maybe<Scalars['String']['output']>;
  last_login_provider?: Maybe<AuthProvider>;
  last_name: Scalars['String']['output'];
  onboarding_survey_completed: Scalars['Boolean']['output'];
  pet_profile?: Maybe<PetProfile>;
  phone_extension: Scalars['String']['output'];
  phone_number: Scalars['String']['output'];
  pincode?: Maybe<Scalars['String']['output']>;
  profile_links: Array<ProfileLink>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  profile_visibility?: Maybe<ProfileVisibility>;
  roles: Array<Scalars['String']['output']>;
  saved_pod_ids: Array<Scalars['ID']['output']>;
  /** The location the user last selected in the header (persisted choice). */
  selected_location_id?: Maybe<Scalars['ID']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  status?: Maybe<UserStatus>;
  updated_at?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  whatsapp_extension?: Maybe<Scalars['String']['output']>;
  whatsapp_number?: Maybe<Scalars['String']['output']>;
  whatsapp_verified_at?: Maybe<Scalars['String']['output']>;
  zone?: Maybe<Scalars['String']['output']>;
};

export type UserActivityDay = {
  __typename?: 'UserActivityDay';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
  level: Scalars['Int']['output'];
};

export type UserActivityYear = {
  __typename?: 'UserActivityYear';
  available_years: Array<Scalars['Int']['output']>;
  days: Array<UserActivityDay>;
  total_visits: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
  year: Scalars['Int']['output'];
};

export type UserBadge = {
  __typename?: 'UserBadge';
  awarded_at: Scalars['String']['output'];
  awarded_reason: Scalars['String']['output'];
  badge?: Maybe<Badge>;
  badge_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  user_id: Scalars['ID']['output'];
};

export type UserContactAction = {
  __typename?: 'UserContactAction';
  created_at: Scalars['String']['output'];
  created_by?: Maybe<Scalars['ID']['output']>;
  duration_seconds: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  notes: Scalars['String']['output'];
  recording_sid: Scalars['String']['output'];
  recording_url: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  target: Scalars['String']['output'];
  twilio_call_sid: Scalars['String']['output'];
  type: AdminContactActionType;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** Server-side table page for the shared table engine (userContactActionsTable). */
export type UserContactActionTablePage = {
  __typename?: 'UserContactActionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<UserContactAction>;
  total: Scalars['Int']['output'];
};

export type UserNotification = {
  __typename?: 'UserNotification';
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notification: Notification;
  read_at?: Maybe<Scalars['String']['output']>;
};

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED';

export type UserSurveyResponse = {
  __typename?: 'UserSurveyResponse';
  items: Array<SurveyResponseItem>;
  kind: SurveyKind;
  submitted_at?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (usersTable). */
export type UserTablePage = {
  __typename?: 'UserTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<User>;
  total: Scalars['Int']['output'];
};

export type UsersFilter = {
  city?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

/** One resolved option value on a variant, e.g. { name: 'Size', value: 'M' }. */
export type VariantOptionValue = {
  __typename?: 'VariantOptionValue';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type VariantOptionValueInput = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Venue = {
  __typename?: 'Venue';
  address_line1: Scalars['String']['output'];
  address_line2: Scalars['String']['output'];
  amenities: Array<Scalars['String']['output']>;
  approved_at?: Maybe<Scalars['String']['output']>;
  bank_account: BankAccountVerification;
  capacity: Scalars['Int']['output'];
  capacity_items: Array<VenueCapacityItem>;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  country_code: Scalars['String']['output'];
  cover_image_url: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  documents: Array<VenueDocument>;
  facilities: Array<Scalars['String']['output']>;
  gallery: Array<Scalars['String']['output']>;
  gstin: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  locality: Scalars['String']['output'];
  location_id?: Maybe<Scalars['ID']['output']>;
  owner_address: Scalars['String']['output'];
  owner_dob?: Maybe<Scalars['String']['output']>;
  owner_email: Scalars['String']['output'];
  owner_name: Scalars['String']['output'];
  owner_phone: Scalars['String']['output'];
  owner_user_id: Scalars['ID']['output'];
  pan: Scalars['String']['output'];
  /** Count of live (non-deleted) pods hosted at this venue (resolved). */
  pod_count: Scalars['Int']['output'];
  postal_code: Scalars['String']['output'];
  rejected_at?: Maybe<Scalars['String']['output']>;
  reviewer_notes: Scalars['String']['output'];
  security: Array<Scalars['String']['output']>;
  settings: VenueSettings;
  state: Scalars['String']['output'];
  state_code: Scalars['String']['output'];
  status: VenueStatus;
  step_completed: Scalars['Int']['output'];
  submitted_at?: Maybe<Scalars['String']['output']>;
  /** Super/Category/Sub the owner picked in the venue onboarding survey (from their OnboardingMeeting). Pre-fills Edit Venue when the venue has none; null when there is no survey scope. */
  survey_category?: Maybe<VenueCategory>;
  tags: Array<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  venue_category: VenueCategory;
  venue_commission_pct: Scalars['Float']['output'];
  venue_name: Scalars['String']['output'];
  /** Permanent human id (VEN-000001) — Onboarded Venues table. */
  venue_no?: Maybe<Scalars['String']['output']>;
  venue_share_pct: Scalars['Float']['output'];
  venue_type: Scalars['String']['output'];
};

export type VenueAutoExtend = {
  __typename?: 'VenueAutoExtend';
  enabled: Scalars['Boolean']['output'];
  horizon_days: Scalars['Int']['output'];
  template_id?: Maybe<Scalars['ID']['output']>;
  until: Scalars['String']['output'];
};

export type VenueAutoExtendInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  horizon_days?: InputMaybe<Scalars['Int']['input']>;
  template_id?: InputMaybe<Scalars['ID']['input']>;
  until?: InputMaybe<Scalars['String']['input']>;
};

/** One named capacity the venue offers (e.g. 'Banquet hall' seats 120). */
export type VenueCapacityItem = {
  __typename?: 'VenueCapacityItem';
  capacity: Scalars['Int']['output'];
  label: Scalars['String']['output'];
};

export type VenueCapacityItemInput = {
  capacity: Scalars['Int']['input'];
  label: Scalars['String']['input'];
};

/** Category the venue wants to host pods in (shared pods Category taxonomy). */
export type VenueCategory = {
  __typename?: 'VenueCategory';
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name: Scalars['String']['output'];
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name: Scalars['String']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name: Scalars['String']['output'];
};

export type VenueCategoryInput = {
  category_id: Scalars['ID']['input'];
  sub_category_id: Scalars['ID']['input'];
  super_category_id: Scalars['ID']['input'];
};

export type VenueDocument = {
  __typename?: 'VenueDocument';
  type: Scalars['String']['output'];
  uploaded_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type VenueDocumentInput = {
  type: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type VenueLead = {
  __typename?: 'VenueLead';
  activity_log: Array<CrmActivity>;
  amenities: Array<Scalars['String']['output']>;
  area?: Maybe<Scalars['String']['output']>;
  assigned_to?: Maybe<Scalars['String']['output']>;
  available_days: Array<Scalars['String']['output']>;
  available_time_slots?: Maybe<Scalars['String']['output']>;
  booking_notice?: Maybe<Scalars['String']['output']>;
  brochure_url?: Maybe<Scalars['String']['output']>;
  capacity_max?: Maybe<Scalars['Int']['output']>;
  capacity_min?: Maybe<Scalars['Int']['output']>;
  category_ids: Array<Scalars['ID']['output']>;
  city: Scalars['String']['output'];
  contacts: Array<CrmContact>;
  created_at?: Maybe<Scalars['String']['output']>;
  /** Stringified JSON map of dynamic field values. Empty object when none set. */
  dynamic_values_json: Scalars['String']['output'];
  event_suitability: Array<Scalars['String']['output']>;
  expected_charges?: Maybe<Scalars['Float']['output']>;
  full_address: Scalars['String']['output'];
  gst_applicable: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  invoice_available: Scalars['Boolean']['output'];
  landmark?: Maybe<Scalars['String']['output']>;
  lead_source?: Maybe<Scalars['String']['output']>;
  lead_status: Scalars['String']['output'];
  linked_host_ids: Array<Scalars['ID']['output']>;
  linked_hosts: Array<CrmLinkedHost>;
  logo_url?: Maybe<Scalars['String']['output']>;
  map_link?: Maybe<Scalars['String']['output']>;
  matched_user?: Maybe<CrmMatchedUser>;
  next_follow_up_date?: Maybe<Scalars['String']['output']>;
  photos: Array<Scalars['String']['output']>;
  pricing_models: Array<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  remarks?: Maybe<Scalars['String']['output']>;
  security_deposit?: Maybe<Scalars['Float']['output']>;
  services_offered: Array<CrmServiceOffered>;
  space_type?: Maybe<Scalars['String']['output']>;
  sub_category_ids: Array<Scalars['ID']['output']>;
  super_category?: Maybe<CrmSuperCategoryRef>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  tags: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  venue_description?: Maybe<Scalars['String']['output']>;
  venue_name: Scalars['String']['output'];
  venue_type_other?: Maybe<Scalars['String']['output']>;
  venue_types: Array<Scalars['String']['output']>;
  videos: Array<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type VenueLeadInput = {
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
  area?: InputMaybe<Scalars['String']['input']>;
  assigned_to?: InputMaybe<Scalars['String']['input']>;
  available_days?: InputMaybe<Array<Scalars['String']['input']>>;
  available_time_slots?: InputMaybe<Scalars['String']['input']>;
  booking_notice?: InputMaybe<Scalars['String']['input']>;
  brochure_url?: InputMaybe<Scalars['String']['input']>;
  capacity_max?: InputMaybe<Scalars['Int']['input']>;
  capacity_min?: InputMaybe<Scalars['Int']['input']>;
  category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  city: Scalars['String']['input'];
  contacts?: InputMaybe<Array<CrmContactInput>>;
  dynamic_values_json?: InputMaybe<Scalars['String']['input']>;
  event_suitability?: InputMaybe<Array<Scalars['String']['input']>>;
  expected_charges?: InputMaybe<Scalars['Float']['input']>;
  full_address: Scalars['String']['input'];
  gst_applicable?: InputMaybe<Scalars['Boolean']['input']>;
  invoice_available?: InputMaybe<Scalars['Boolean']['input']>;
  landmark?: InputMaybe<Scalars['String']['input']>;
  lead_source?: InputMaybe<Scalars['String']['input']>;
  lead_status?: InputMaybe<Scalars['String']['input']>;
  linked_host_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  map_link?: InputMaybe<Scalars['String']['input']>;
  next_follow_up_date?: InputMaybe<Scalars['String']['input']>;
  photos?: InputMaybe<Array<Scalars['String']['input']>>;
  pricing_models?: InputMaybe<Array<Scalars['String']['input']>>;
  priority?: InputMaybe<Scalars['String']['input']>;
  remarks?: InputMaybe<Scalars['String']['input']>;
  security_deposit?: InputMaybe<Scalars['Float']['input']>;
  services_offered?: InputMaybe<Array<CrmServiceOfferedInput>>;
  space_type?: InputMaybe<Scalars['String']['input']>;
  sub_category_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  venue_description?: InputMaybe<Scalars['String']['input']>;
  venue_name: Scalars['String']['input'];
  venue_type_other?: InputMaybe<Scalars['String']['input']>;
  venue_types?: InputMaybe<Array<Scalars['String']['input']>>;
  videos?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (venueLeadsTable). */
export type VenueLeadTablePage = {
  __typename?: 'VenueLeadTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<VenueLead>;
  total: Scalars['Int']['output'];
};

export type VenueOperatingHours = {
  __typename?: 'VenueOperatingHours';
  close: Scalars['String']['output'];
  open: Scalars['String']['output'];
};

export type VenueOperatingHoursInput = {
  close: Scalars['String']['input'];
  open: Scalars['String']['input'];
};

/** Owner-scoped venue KPIs. venue_id narrows to one venue; omitted = all venues. */
export type VenueOwnerStats = {
  __typename?: 'VenueOwnerStats';
  approved_venues: Scalars['Int']['output'];
  /** Value of upcoming slots already booked by pods. */
  booked_earning: Scalars['Int']['output'];
  booked_slots: Scalars['Int']['output'];
  pending_requests: Scalars['Int']['output'];
  /** Value of the whole upcoming published calendar (all future slot prices). */
  potential_earning: Scalars['Int']['output'];
  /** Sum of every capacity entry across the scoped venues. */
  total_capacity: Scalars['Int']['output'];
  total_venues: Scalars['Int']['output'];
  upcoming_slots: Scalars['Int']['output'];
};

/** Registration option catalogs — clients render these instead of hardcoding. */
export type VenueRegistrationConfig = {
  __typename?: 'VenueRegistrationConfig';
  amenities: Array<Scalars['String']['output']>;
  capacity_item_limit: Scalars['Int']['output'];
  doc_types: Array<Scalars['String']['output']>;
  facilities: Array<Scalars['String']['output']>;
  security: Array<Scalars['String']['output']>;
  venue_types: Array<Scalars['String']['output']>;
};

export type VenueRules = {
  __typename?: 'VenueRules';
  allow_instant_booking: Scalars['Boolean']['output'];
  allow_multiple_bookings: Scalars['Boolean']['output'];
  allow_waitlist: Scalars['Boolean']['output'];
  booking_approval_required: Scalars['Boolean']['output'];
  buffer_minutes: Scalars['Int']['output'];
  max_advance_days: Scalars['Int']['output'];
  max_bookings_per_slot: Scalars['Int']['output'];
  min_notice_minutes: Scalars['Int']['output'];
};

export type VenueRulesInput = {
  allow_instant_booking?: InputMaybe<Scalars['Boolean']['input']>;
  allow_multiple_bookings?: InputMaybe<Scalars['Boolean']['input']>;
  allow_waitlist?: InputMaybe<Scalars['Boolean']['input']>;
  booking_approval_required?: InputMaybe<Scalars['Boolean']['input']>;
  buffer_minutes?: InputMaybe<Scalars['Int']['input']>;
  max_advance_days?: InputMaybe<Scalars['Int']['input']>;
  max_bookings_per_slot?: InputMaybe<Scalars['Int']['input']>;
  min_notice_minutes?: InputMaybe<Scalars['Int']['input']>;
};

export type VenueSettings = {
  __typename?: 'VenueSettings';
  auto_extend: VenueAutoExtend;
  holidays: Array<Scalars['String']['output']>;
  operating_hours: VenueOperatingHours;
  rules: VenueRules;
  weekly_off_days: Array<Scalars['Int']['output']>;
};

export type VenueSettingsInput = {
  auto_extend?: InputMaybe<VenueAutoExtendInput>;
  holidays?: InputMaybe<Array<Scalars['String']['input']>>;
  operating_hours?: InputMaybe<VenueOperatingHoursInput>;
  rules?: InputMaybe<VenueRulesInput>;
  weekly_off_days?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type VenueSlot = {
  __typename?: 'VenueSlot';
  booked_by_pod_id?: Maybe<Scalars['ID']['output']>;
  booked_pod_title?: Maybe<Scalars['String']['output']>;
  /** Guests this slot can hold (0 = unset/whole venue). */
  capacity: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  end_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes: Scalars['String']['output'];
  price: Scalars['Int']['output'];
  /** The venue space/capacity-item this slot is for ('' = whole venue). */
  space_label: Scalars['String']['output'];
  start_at: Scalars['String']['output'];
  status: VenueSlotStatus;
  venue_id: Scalars['ID']['output'];
  venue_name?: Maybe<Scalars['String']['output']>;
};

/** A PENDING slot hold awaiting the venue owner's decision, with pod + host contact. */
export type VenueSlotRequest = {
  __typename?: 'VenueSlotRequest';
  end_at: Scalars['String']['output'];
  host_email: Scalars['String']['output'];
  host_name: Scalars['String']['output'];
  host_phone: Scalars['String']['output'];
  pod_description: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  price: Scalars['Int']['output'];
  requested_at: Scalars['String']['output'];
  slot_id: Scalars['ID']['output'];
  start_at: Scalars['String']['output'];
  venue_id: Scalars['ID']['output'];
  venue_name: Scalars['String']['output'];
};

export type VenueSlotStatus =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'BOOKED'
  | 'PENDING';

export type VenueStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'SUBMITTED';

export type VenueStep1Input = {
  address_line1: Scalars['String']['input'];
  address_line2?: InputMaybe<Scalars['String']['input']>;
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
  capacity: Scalars['Int']['input'];
  capacity_items?: InputMaybe<Array<VenueCapacityItemInput>>;
  city: Scalars['String']['input'];
  country?: InputMaybe<Scalars['String']['input']>;
  country_code?: InputMaybe<Scalars['String']['input']>;
  cover_image_url?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  facilities?: InputMaybe<Array<Scalars['String']['input']>>;
  gallery?: InputMaybe<Array<Scalars['String']['input']>>;
  lat?: InputMaybe<Scalars['Float']['input']>;
  lng?: InputMaybe<Scalars['Float']['input']>;
  locality?: InputMaybe<Scalars['String']['input']>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  postal_code: Scalars['String']['input'];
  security?: InputMaybe<Array<Scalars['String']['input']>>;
  state: Scalars['String']['input'];
  state_code?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  venue_category?: InputMaybe<VenueCategoryInput>;
  venue_name: Scalars['String']['input'];
  venue_type: Scalars['String']['input'];
};

export type VenueStep2Input = {
  documents: Array<VenueDocumentInput>;
  gstin?: InputMaybe<Scalars['String']['input']>;
  pan?: InputMaybe<Scalars['String']['input']>;
};

export type VenueStep3Input = {
  bank_account?: InputMaybe<BankAccountVerificationInput>;
  owner_address?: InputMaybe<Scalars['String']['input']>;
  owner_dob?: InputMaybe<Scalars['String']['input']>;
  owner_email: Scalars['String']['input'];
  owner_name: Scalars['String']['input'];
  owner_phone: Scalars['String']['input'];
};

/** Server-side table page for the shared table engine (venuesTable / myVenuesTable). */
export type VenueTablePage = {
  __typename?: 'VenueTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Venue>;
  total: Scalars['Int']['output'];
};

export type Verification = {
  __typename?: 'Verification';
  address?: Maybe<Address>;
  document_url?: Maybe<Scalars['String']['output']>;
  reject_reason?: Maybe<Scalars['String']['output']>;
  reviewed_at?: Maybe<Scalars['String']['output']>;
  status: VerificationStatus;
  type: VerificationType;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type VerificationStatus =
  | 'APPROVED'
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'REJECTED'
  | 'VERIFIED_BY_APP';

/** Server-side table page for the shared table engine (userVerificationsTable). */
export type VerificationTablePage = {
  __typename?: 'VerificationTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Verification>;
  total: Scalars['Int']['output'];
};

export type VerificationType =
  | 'ADDRESS'
  | 'EMAIL'
  | 'IDENTITY';

export type VerifyRazorpayInput = {
  payment_doc_id: Scalars['ID']['input'];
  razorpay_order_id: Scalars['String']['input'];
  razorpay_payment_id: Scalars['String']['input'];
  razorpay_signature: Scalars['String']['input'];
};

/** Result of a database-level cleanup. */
export type WaCleanResult = {
  __typename?: 'WaCleanResult';
  remaining: Scalars['Int']['output'];
  removed_contacts: Scalars['Int']['output'];
  removed_duplicates: Scalars['Int']['output'];
  removed_invalid: Scalars['Int']['output'];
};

export type WaCommunity = {
  __typename?: 'WaCommunity';
  community_jid: Scalars['String']['output'];
  groups_count: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type WaCommunityPage = {
  __typename?: 'WaCommunityPage';
  items: Array<WaCommunity>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WaConfigInput = {
  api_key?: InputMaybe<Scalars['String']['input']>;
  base_url?: InputMaybe<Scalars['String']['input']>;
  session_id?: InputMaybe<Scalars['String']['input']>;
};

/** Gateway connection config + live session status (the API key is never returned). */
export type WaConnection = {
  __typename?: 'WaConnection';
  base_url: Scalars['String']['output'];
  connected_at?: Maybe<Scalars['String']['output']>;
  has_api_key: Scalars['Boolean']['output'];
  last_error?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  session_id: Scalars['String']['output'];
  status: WaStatus;
};

export type WaContact = {
  __typename?: 'WaContact';
  contact_jid: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_business: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  push_name?: Maybe<Scalars['String']['output']>;
};

export type WaContactPage = {
  __typename?: 'WaContactPage';
  items: Array<WaContact>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WaCreateUserLeadInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  phone: Scalars['String']['input'];
  source_account?: InputMaybe<Scalars['String']['input']>;
};

/** Background extraction job — live progress + quality breakdown. */
export type WaExtraction = {
  __typename?: 'WaExtraction';
  communities: Scalars['Int']['output'];
  duplicates: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  finished_at?: Maybe<Scalars['String']['output']>;
  groups: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  invalid: Scalars['Int']['output'];
  leads_created: Scalars['Int']['output'];
  phase: Scalars['String']['output'];
  processed: Scalars['Int']['output'];
  started_at?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  total: Scalars['Int']['output'];
  valid: Scalars['Int']['output'];
};

/** Result of generating a fresh gateway API key (the key is returned once). */
export type WaGeneratedKey = {
  __typename?: 'WaGeneratedKey';
  api_key: Scalars['String']['output'];
  connection: WaConnection;
};

export type WaGroup = {
  __typename?: 'WaGroup';
  community_jid?: Maybe<Scalars['String']['output']>;
  group_jid: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  members_count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type WaGroupPage = {
  __typename?: 'WaGroupPage';
  items: Array<WaGroup>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type WaImportResult = {
  __typename?: 'WaImportResult';
  duplicates: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

/** Top-of-page dashboard counters. */
export type WaLeadStats = {
  __typename?: 'WaLeadStats';
  total_communities: Scalars['Int']['output'];
  total_contacts: Scalars['Int']['output'];
  total_groups: Scalars['Int']['output'];
  total_leads: Scalars['Int']['output'];
};

export type WaMember = {
  __typename?: 'WaMember';
  is_business: Scalars['Boolean']['output'];
  jid: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
};

/** Server-side pagination / search / sort options for the cache lists. */
export type WaPageInput = {
  community_jid?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  page_size?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
};

export type WaQr = {
  __typename?: 'WaQr';
  qr_code?: Maybe<Scalars['String']['output']>;
  status: WaStatus;
};

export type WaSourceRef = {
  __typename?: 'WaSourceRef';
  jid: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type WaStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export type WaSyncResult = {
  __typename?: 'WaSyncResult';
  communities: Scalars['Int']['output'];
  contacts: Scalars['Int']['output'];
  duplicates: Scalars['Int']['output'];
  groups: Scalars['Int']['output'];
  invalid: Scalars['Int']['output'];
  leads: Scalars['Int']['output'];
  valid: Scalars['Int']['output'];
};

export type WaUpdateUserLeadInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type WaUserLead = {
  __typename?: 'WaUserLead';
  contact_jid?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imported_at?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  source_account?: Maybe<Scalars['String']['output']>;
  source_communities: Array<WaSourceRef>;
  source_groups: Array<WaSourceRef>;
};

export type WaUserLeadPage = {
  __typename?: 'WaUserLeadPage';
  items: Array<WaUserLead>;
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type Wallet = {
  __typename?: 'Wallet';
  balance: Scalars['Float']['output'];
  currency_symbol: Scalars['String']['output'];
  next_payout_at: Scalars['String']['output'];
  payout_mode: PayoutMode;
};

export type WalletTransaction = {
  __typename?: 'WalletTransaction';
  amount: Scalars['Float']['output'];
  balance_after: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  pod_id?: Maybe<Scalars['ID']['output']>;
  reason: Scalars['String']['output'];
  source: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type WalletWithdrawal = {
  __typename?: 'WalletWithdrawal';
  account_holder_name: Scalars['String']['output'];
  account_number: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  beneficiary_email: Scalars['String']['output'];
  beneficiary_name: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  ifsc_code: Scalars['String']['output'];
  paid_at?: Maybe<Scalars['String']['output']>;
  payout_method: WithdrawalMethod;
  reject_reason: Scalars['String']['output'];
  requested_at: Scalars['String']['output'];
  reviewed_at?: Maybe<Scalars['String']['output']>;
  scheduled_for: Scalars['String']['output'];
  status: WithdrawalStatus;
  upi_id: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  withdrawal_id: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (withdrawalRequestsTable). */
export type WalletWithdrawalTablePage = {
  __typename?: 'WalletWithdrawalTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WalletWithdrawal>;
  total: Scalars['Int']['output'];
};

export type WebsiteContentInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  cta_label?: InputMaybe<Scalars['String']['input']>;
  cta_url?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_published?: InputMaybe<Scalars['Boolean']['input']>;
  published_at?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  type: WebsitePageType;
};

export type WebsiteContentItem = {
  __typename?: 'WebsiteContentItem';
  body: Scalars['String']['output'];
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  cta_label: Scalars['String']['output'];
  cta_url: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  is_published: Scalars['Boolean']['output'];
  published_at?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: WebsitePageType;
  updated_at: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (websiteContentTable). */
export type WebsiteContentItemTablePage = {
  __typename?: 'WebsiteContentItemTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WebsiteContentItem>;
  total: Scalars['Int']['output'];
};

export type WebsiteNavArea =
  | 'FOOTER'
  | 'HEADER';

/** A marketing-website navigation link, managed from the Website portal. */
export type WebsiteNavItem = {
  __typename?: 'WebsiteNavItem';
  area: WebsiteNavArea;
  created_at: Scalars['String']['output'];
  group_label: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  site: WebsiteNavSite;
  sort_order: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type WebsiteNavItemInput = {
  area: WebsiteNavArea;
  group_label?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
  site: WebsiteNavSite;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  url: Scalars['String']['input'];
};

/** Server-side table page for the shared table engine (websiteNavTable). */
export type WebsiteNavItemTablePage = {
  __typename?: 'WebsiteNavItemTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WebsiteNavItem>;
  total: Scalars['Int']['output'];
};

export type WebsiteNavSite =
  | 'ADS'
  | 'EARNWITH'
  | 'MAIN'
  | 'PARTNERS';

export type WebsitePageType =
  | 'BLOG'
  | 'CAREERS'
  | 'NEWSROOM';

export type WhatsAppOtpRequestResult = {
  __typename?: 'WhatsAppOtpRequestResult';
  dev_otp?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type WithdrawalMethod =
  | 'IMPS'
  | 'NEFT'
  | 'UPI';

export type WithdrawalStatus =
  | 'PAID'
  | 'PENDING'
  | 'REJECTED';
