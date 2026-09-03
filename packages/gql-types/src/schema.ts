export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AccountDeletionCronFrequency =
  | 'DAILY'
  | 'WEEKLY';

/**
 * The retention window AND the job that acts on it, as the Admin Panel sees it.
 *
 * Separate from `AccountDeletionSettings`, which any signed-in member may read
 * because both apps quote the window before anybody confirms. When the sweep
 * runs, how large a batch it takes and when it last fired are operational
 * facts, not a promise made to a member.
 */
export type AccountDeletionCronSettings = {
  __typename?: 'AccountDeletionCronSettings';
  /** How many accounts one sweep will carry out. A ceiling, not a target. */
  cron_batch_size: Scalars['Int']['output'];
  /** False means the queue is cleared by hand, exactly as it was before. */
  cron_enabled: Scalars['Boolean']['output'];
  cron_frequency: AccountDeletionCronFrequency;
  /** Wall-clock `HH:mm` in the platform timezone, not the container's UTC. */
  cron_time_of_day: Scalars['String']['output'];
  /** 0 = Sunday. Only read when the frequency is WEEKLY. */
  cron_weekday: Scalars['Int']['output'];
  last_run_at?: Maybe<Scalars['String']['output']>;
  /** Null while the sweep is off — there is no next run to name. */
  next_run_at?: Maybe<Scalars['String']['output']>;
  /** The grace period, in whole days. 30 is today's default, not a fixed rule. */
  retention_days: Scalars['Int']['output'];
};

export type AccountDeletionDetail = {
  __typename?: 'AccountDeletionDetail';
  /** False once the account document itself has been removed. */
  account_exists: Scalars['Boolean']['output'];
  request: AccountDeletionRequest;
  /** Only the references that still match something; a cleared one drops out. */
  trace: Array<AccountDeletionTraceGroup>;
};

/** One collection cleared while carrying a request out, and when. */
export type AccountDeletionPurgeEntry = {
  __typename?: 'AccountDeletionPurgeEntry';
  collection_name: Scalars['String']['output'];
  field_path: Scalars['String']['output'];
  model_name: Scalars['String']['output'];
  purged_at: Scalars['String']['output'];
  removed: Scalars['Int']['output'];
};

/**
 * A member asking to be removed.
 *
 * The identity fields are a SNAPSHOT taken when they asked, not a join onto
 * the account — carrying the request out destroys the account, and a finished
 * row that can no longer say who it was about is a useless record.
 */
export type AccountDeletionRequest = {
  __typename?: 'AccountDeletionRequest';
  /** Whole days left before that date. Null once the request is closed. */
  days_remaining?: Maybe<Scalars['Int']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  note: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  purge_log: Array<AccountDeletionPurgeEntry>;
  reason: Scalars['String']['output'];
  request_id: Scalars['String']['output'];
  requested_at: Scalars['String']['output'];
  reviewed_at?: Maybe<Scalars['String']['output']>;
  reviewed_by?: Maybe<Scalars['ID']['output']>;
  /** The date the member was promised, stamped from the window when they asked. */
  scheduled_delete_at: Scalars['String']['output'];
  status: AccountDeletionStatus;
  surface: AccountDeletionSurface;
  user_id: Scalars['ID']['output'];
};

export type AccountDeletionRequestPage = {
  __typename?: 'AccountDeletionRequestPage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AccountDeletionRequest>;
  total: Scalars['Int']['output'];
};

/**
 * One sweep of the deletion queue.
 *
 * Written whether or not anything was found: a run that deleted nobody is the
 * evidence that the job is alive, and a night with no row at all is the thing
 * worth noticing.
 */
export type AccountDeletionRun = {
  __typename?: 'AccountDeletionRun';
  /** The moment eligibility was judged against. */
  cutoff_at: Scalars['String']['output'];
  /** Due requests found. `purged + failed` may be fewer — the batch has a ceiling. */
  eligible: Scalars['Int']['output'];
  error: Scalars['String']['output'];
  failed: Scalars['Int']['output'];
  finished_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  purged: Scalars['Int']['output'];
  results: Array<AccountDeletionRunResult>;
  retention_days: Scalars['Int']['output'];
  run_id: Scalars['String']['output'];
  started_at: Scalars['String']['output'];
  status: AccountDeletionRunStatus;
  trigger: AccountDeletionRunTrigger;
};

export type AccountDeletionRunPage = {
  __typename?: 'AccountDeletionRunPage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AccountDeletionRun>;
  total: Scalars['Int']['output'];
};

/** One account a sweep acted on, and what became of it. */
export type AccountDeletionRunResult = {
  __typename?: 'AccountDeletionRunResult';
  /** The address as the request recorded it. The account itself is gone. */
  email: Scalars['String']['output'];
  error: Scalars['String']['output'];
  /** PURGED, or FAILED with the reason beside it. */
  outcome: Scalars['String']['output'];
  /** Rows removed or redacted across every collection, for scale not detail. */
  records: Scalars['Int']['output'];
  request_id: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type AccountDeletionRunStatus =
  | 'FAILED'
  | 'RUNNING'
  | 'SUCCEEDED';

export type AccountDeletionRunTrigger =
  | 'MANUAL'
  | 'SCHEDULED';

/** How long an account stays after its owner asks for it to go. */
export type AccountDeletionSettings = {
  __typename?: 'AccountDeletionSettings';
  retention_days: Scalars['Int']['output'];
};

export type AccountDeletionStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'PENDING'
  | 'REJECTED';

export type AccountDeletionSurface =
  | 'APP'
  | 'MWEB'
  | 'UNKNOWN';

/**
 * One place this member still appears, found by reading the schemas rather
 * than a hand-kept list — so a collection added next week is covered without
 * anyone remembering to register it.
 */
export type AccountDeletionTraceGroup = {
  __typename?: 'AccountDeletionTraceGroup';
  /** The underlying collection, which is what a DB console shows. */
  collection_name: Scalars['String']['output'];
  /** How many documents match right now. */
  count: Scalars['Int']['output'];
  /** The field pointing at the member, e.g. `pod_attendees`. */
  field_path: Scalars['String']['output'];
  /** Whether the stored value is an ObjectId or a stringified id. */
  id_kind: Scalars['String']['output'];
  /** The mongoose model, e.g. `Ticket`. */
  model_name: Scalars['String']['output'];
  /**
   * What clearing this does.
   *
   * DELETE_DOCUMENTS — the documents are the member's and go entirely.
   * REMOVE_FROM_DOCUMENTS — the member is one entry inside somebody else's
   * document (a pod attendee, a comment, a signature), so only their entry is
   * pulled.
   * REDACT_RECORDS — a financial or audit record that outlives the account. The
   * row stays and the personal data on it is erased; what showed a name shows
   * "Deleted user".
   * The console shows this before it asks, because the three are not remotely
   * the same act.
   */
  purge_kind: Scalars['String']['output'];
  /** Why this record is kept. Empty unless purge_kind is REDACT_RECORDS. */
  retention_reason: Scalars['String']['output'];
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

/** How one placement is sold: the name on the rate card, and the line under it. */
export type AdPlacementCopy = {
  __typename?: 'AdPlacementCopy';
  label: Scalars['String']['output'];
  note: Scalars['String']['output'];
  position: AdPosition;
};

export type AdPlacementCopyInput = {
  /** Blank clears the override and restores the shipped name. */
  label?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  position: AdPosition;
};

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
  max_days: Scalars['Int']['output'];
  /**
   * The booking window advertisers may pick from. Editable because the slider
   * on the public page is drawn from these two numbers — a length the site
   * offers must never be one the server refuses.
   */
  min_days: Scalars['Int']['output'];
  /** What each placement is called and said about, resolved over the defaults. */
  placements: Array<AdPlacementCopy>;
  pod_details_per_day: Scalars['Float']['output'];
  pod_list_per_day: Scalars['Float']['output'];
  sidebar_per_day: Scalars['Float']['output'];
  status_per_day: Scalars['Float']['output'];
  venue_list_per_day: Scalars['Float']['output'];
};

/**
 * The advertising rate card, readable WITHOUT signing in — it is what the
 * marketing site quotes, so a price on that page can never be a stale copy of
 * one Marketing has since changed.
 */
export type AdRateCard = {
  __typename?: 'AdRateCard';
  currency_symbol: Scalars['String']['output'];
  entries: Array<AdRateCardEntry>;
  /** The cheapest and dearest placement — lets a page headline a starting price. */
  from_per_day: Scalars['Float']['output'];
  max_days: Scalars['Int']['output'];
  /** The booking window a campaign must fall inside, in days. */
  min_days: Scalars['Int']['output'];
  to_per_day: Scalars['Float']['output'];
};

/** One placement on the public rate card: what it is, and what a day of it costs. */
export type AdRateCardEntry = {
  __typename?: 'AdRateCardEntry';
  label: Scalars['String']['output'];
  /** The description under the name on the rate table. Marketing-editable. */
  note: Scalars['String']['output'];
  position: AdPosition;
  price_per_day: Scalars['Float']['output'];
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

/** Admin/Finance: one person on a pod — host, attendee or backed-out member. */
export type AdminPodAttendee = {
  __typename?: 'AdminPodAttendee';
  backed_out_at?: Maybe<Scalars['String']['output']>;
  /** Backout ID of the filled request when this member's seat was rebooked. */
  backout_no?: Maybe<Scalars['String']['output']>;
  /** The other people on this booking, recorded at the door. */
  companions: Array<PodCompanion>;
  email?: Maybe<Scalars['String']['output']>;
  full_name?: Maybe<Scalars['String']['output']>;
  is_host: Scalars['Boolean']['output'];
  joined_at?: Maybe<Scalars['String']['output']>;
  /** PodMember row id — null for people without a membership row (host seat). */
  member_id?: Maybe<Scalars['ID']['output']>;
  /** This person's own story on the pod. Null for a host seat with no booking. */
  participation?: Maybe<PodParticipation>;
  payment_id?: Maybe<Scalars['ID']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  refund_status?: Maybe<RefundStatus>;
  replaced_by_name?: Maybe<Scalars['String']['output']>;
  /** Set when this member backed out and a replacement filled the seat. */
  replaced_by_user_id?: Maybe<Scalars['ID']['output']>;
  /** Seats this booking holds — one ticket admits this many. 1 for a legacy booking. */
  seats: Scalars['Int']['output'];
  source?: Maybe<JoinSource>;
  /** Null for people without a membership row (the host's own free seat). */
  status?: Maybe<MembershipStatus>;
  user_id: Scalars['ID']['output'];
};

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

export type AgentAvailability = {
  __typename?: 'AgentAvailability';
  /** Whether this caller may run creating actions at all. */
  can_act: Scalars['Boolean']['output'];
  /** False when there is no OpenAI key — the composer says so instead of failing on send. */
  is_available: Scalars['Boolean']['output'];
  /** Most items one run will create. */
  max_batch: Scalars['Int']['output'];
};

export type AgentChatInput = {
  /** The thread so far, so a follow-up still knows what 'the same again' meant. */
  history?: InputMaybe<Array<AgentTurnInput>>;
  message: Scalars['String']['input'];
};

export type AgentReply = {
  __typename?: 'AgentReply';
  /** NONE | CREATE_PODS | CREATE_CLUBS */
  action: Scalars['String']['output'];
  /** What the agent says back, before the results are listed. */
  answer: Scalars['String']['output'];
  created: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  items: Array<AgentResultItem>;
  /** How many the plan asked for, after the batch cap. */
  requested: Scalars['Int']['output'];
};

/**
 * One thing the agent tried to create. A failed item is still reported: a run
 * that made seven of ten has to say which three did not, and why.
 */
export type AgentResultItem = {
  __typename?: 'AgentResultItem';
  /** What it was given (venue, approval state) — or the reason it failed. */
  detail: Scalars['String']['output'];
  /** Document id, when it was created. */
  id?: Maybe<Scalars['String']['output']>;
  /** POD | CLUB */
  kind: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  /** Human reference — the pod/club slug. */
  ref?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  /**
   * When the booked slot starts, as an ISO instant. Formatting is the console's
   * job — the admin-configured date format and time zone live there, not here.
   */
  when?: Maybe<Scalars['String']['output']>;
};

export type AgentTurnInput = {
  content: Scalars['String']['input'];
  role: AgentTurnRole;
};

export type AgentTurnRole =
  | 'AGENT'
  | 'USER';

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

/**
 * The AI Monitoring chip/dialog copy every upload surface renders.
 * A null field means "no override" — the surface renders its own localized
 * fallback, so untouched copy still follows the reader's language.
 */
export type AiMonitoringConfig = {
  __typename?: 'AiMonitoringConfig';
  /** Master switch for the chip. Off hides it everywhere; scans still log. */
  chip_enabled: Scalars['Boolean']['output'];
  chip_label?: Maybe<Scalars['String']['output']>;
  dialog_footnote?: Maybe<Scalars['String']['output']>;
  dialog_intro?: Maybe<Scalars['String']['output']>;
  dialog_points: Array<Scalars['String']['output']>;
  dialog_title?: Maybe<Scalars['String']['output']>;
  dismiss_label?: Maybe<Scalars['String']['output']>;
};

/** One AI monitoring check — every image the platform screened, and what came of it. */
export type AiMonitoringLog = {
  __typename?: 'AiMonitoringLog';
  /** Action Taken: NONE, ALLOWED, FLAGGED or BLOCKED. */
  action: Scalars['String']['output'];
  checked_at?: Maybe<Scalars['String']['output']>;
  /** Upload date and time. */
  created_at: Scalars['String']['output'];
  duration_ms: Scalars['Int']['output'];
  /** User/Entity that uploaded it, resolved to a display name. */
  entity?: Maybe<Scalars['String']['output']>;
  /** Failure detail when the check did not complete. */
  error: Scalars['String']['output'];
  file_name: Scalars['String']['output'];
  /** Upload folder — the Source/Module the image came from. */
  folder: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  model: Scalars['String']['output'];
  /** AI Result: PENDING, LOW, MEDIUM or HIGH. */
  risk: Scalars['String']['output'];
  /** Monitoring Status: PENDING, COMPLETED, FAILED or SKIPPED. */
  status: Scalars['String']['output'];
  /** Reason/Comment — the model's one-line explanation, or why it never ran. */
  summary: Scalars['String']['output'];
  /** Client family the upload came from: PORTALS, MOBILE or MWEB. */
  surface: Scalars['String']['output'];
  /** Uploaded image. */
  url: Scalars['String']['output'];
  user_id?: Maybe<Scalars['String']['output']>;
};

export type AiMonitoringLogsTableResult = {
  __typename?: 'AiMonitoringLogsTableResult';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AiMonitoringLog>;
  total: Scalars['Int']['output'];
};

/** The config plus the prompt the image check runs on (AI Portal > Settings). */
export type AiMonitoringSettings = {
  __typename?: 'AiMonitoringSettings';
  chip_enabled: Scalars['Boolean']['output'];
  chip_label?: Maybe<Scalars['String']['output']>;
  dialog_footnote?: Maybe<Scalars['String']['output']>;
  dialog_intro?: Maybe<Scalars['String']['output']>;
  dialog_points: Array<Scalars['String']['output']>;
  dialog_title?: Maybe<Scalars['String']['output']>;
  dismiss_label?: Maybe<Scalars['String']['output']>;
  /** Live body of the system prompt that analyses every uploaded image. */
  image_prompt: Scalars['String']['output'];
  /** Its row in the AI Prompt Library — the same prompt, one store. */
  image_prompt_id?: Maybe<Scalars['ID']['output']>;
  image_prompt_key: Scalars['String']['output'];
  image_scan_model: Scalars['String']['output'];
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
 * A prompt in the AI Library. `token_count` is derived from `content` on
 * every read, so it stays in sync with edits.
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
  /** Stable catalogue id of a code prompt; null for portal-authored ones. */
  key?: Maybe<Scalars['String']['output']>;
  kind: AiPromptKind;
  name: Scalars['String']['output'];
  role: AiPromptRole;
  /** Model this prompt is sent to; empty means the configured default. */
  target_model: Scalars['String']['output'];
  /** Usage-log task keys this prompt bills to, for joining spend back to it. */
  tasks: Array<Scalars['String']['output']>;
  token_count: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  usage: Array<AiPromptUsage>;
  variables: Array<AiPromptVariable>;
};

export type AiPromptFilter = {
  category?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<AiPromptKind>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Which half of the AI Library a prompt belongs to. */
export type AiPromptKind =
  /** Authored in the AI portal. Owned by nobody in code, fully editable, and served by the public GET feed. */
  | 'AI'
  /** Declared in the server catalogue and read back by a call site on every request. Editing its body changes what the product sends to the model. Cannot be created or deleted from a portal — only reset. */
  | 'CODE';

/**
 * Which turn of the conversation a prompt is. A CODE feature ships up to two: the
 * standing SYSTEM instruction and the per-call USER payload.
 */
export type AiPromptRole =
  | 'SYSTEM'
  | 'USER';

/** Where a code prompt is wired in — read-only, it describes the call site. */
export type AiPromptUsage = {
  __typename?: 'AiPromptUsage';
  /** Repo-relative file that sends it. */
  file: Scalars['String']['output'];
  /** The surface a person is looking at when it runs. */
  surface: Scalars['String']['output'];
  /** What they did to trigger it. */
  trigger: Scalars['String']['output'];
};

/**
 * One `{{placeholder}}` the call site fills in at request time. A CODE prompt
 * declares these in the catalogue; an AI prompt has them read out of its body.
 */
export type AiPromptVariable = {
  __typename?: 'AiPromptVariable';
  description: Scalars['String']['output'];
  /** Stand-in the portal's preview renders with. */
  example: Scalars['String']['output'];
  label: Scalars['String']['output'];
  /** Placeholder name, without the braces. */
  name: Scalars['String']['output'];
  /** Dropping a required placeholder breaks the feature silently, so the editor refuses to save a body that lost one. */
  required: Scalars['Boolean']['output'];
};

export type AiRichTextImproveInput = {
  context?: InputMaybe<Scalars['String']['input']>;
  html: Scalars['String']['input'];
};

/**
 * What fills a CTA button's dynamic link. It travels in its own field and never
 * as a template parameter — a template_params of the wrong length is refused.
 */
export type AisensyButton = {
  __typename?: 'AisensyButton';
  /** Where the button sits on the template, counting from zero. */
  index: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};

export type AisensyButtonInput = {
  /** The button's position in the template's cta_buttons, counting from zero. */
  index: Scalars['Int']['input'];
  /** What replaces the {{n}} in that button's link. */
  value: Scalars['String']['input'];
};

/** An API campaign as AiSensy has it — read through the Project API, not stored here. */
export type AisensyCampaign = {
  __typename?: 'AisensyCampaign';
  media_filename: Scalars['String']['output'];
  /**
   * The header asset this campaign was built with in the AiSensy console, if
   * any. It lives on the CAMPAIGN, never on the template, and every message the
   * campaign sends must carry it — a send without it is refused.
   */
  media_url: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
  /** The WhatsApp template this campaign sends. */
  template_name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AisensyCampaignDraft = {
  __typename?: 'AisensyCampaignDraft';
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
  template_name: Scalars['String']['output'];
};

/**
 * The header asset a media template sends — the image, video or document above
 * the message. AiSensy fetches the URL itself at send time, so it must be
 * reachable from the public internet.
 */
export type AisensyMedia = {
  __typename?: 'AisensyMedia';
  filename: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type AisensyMediaInput = {
  /** File name WhatsApp shows on a document. Optional for an image or a video. */
  filename?: InputMaybe<Scalars['String']['input']>;
  /** Public URL of the image, video or document. */
  url: Scalars['String']['input'];
};

export type AisensySendResult = {
  __typename?: 'AisensySendResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  /** AiSensy's queued-message id, echoed back so a delivery can be traced. */
  submitted_message_id: Scalars['String']['output'];
};

export type AisensyStatus = {
  __typename?: 'AisensyStatus';
  /** Whether an AiSensy API key is configured (Tech portal → Environment Variables → AiSensy). */
  configured: Scalars['Boolean']['output'];
  /** Campaign name sends default to, from the AiSensy entry. Empty when unset. */
  default_campaign: Scalars['String']['output'];
};

/** A WhatsApp message template as AiSensy has it. */
export type AisensyTemplate = {
  __typename?: 'AisensyTemplate';
  /** The template's BODY text, with its {{1}} placeholders intact. */
  body: Scalars['String']['output'];
  /** The button labels WhatsApp draws under the message, in order. */
  buttons: Array<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  /** The interactive buttons in full — the only place a dynamic link shows up. */
  cta_buttons: Array<AisensyTemplateButton>;
  /** The small grey line under the body, when the template has one. */
  footer: Scalars['String']['output'];
  /** The HEADER text — empty for a media header or no header. */
  header: Scalars['String']['output'];
  /** TEXT, IMAGE, VIDEO or FILE — empty when the template has no header. */
  header_format: Scalars['String']['output'];
  /** AiSensy's own id — the only handle deleteAisensyTemplate accepts. */
  id: Scalars['ID']['output'];
  language: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Whether every message on this template must carry a header asset. */
  needs_media: Scalars['Boolean']['output'];
  /** How many variables the body expects — the number of params a send must fill. */
  param_count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

/** One interactive button under a template's message. */
export type AisensyTemplateButton = {
  __typename?: 'AisensyTemplateButton';
  /** The label WhatsApp draws on the button. */
  text: Scalars['String']['output'];
  /** URL or PHONE_NUMBER. */
  type: Scalars['String']['output'];
  /** A URL button's link with its {{n}} intact; empty for every other kind. */
  url: Scalars['String']['output'];
  /**
   * The {{n}} the link carries, or 0 when it is static. AiSensy numbers a
   * dynamic link after the body's own variables, so this is the parameter's
   * position on the template. Its value is sent under the send input's buttons
   * field, addressed by this button's position in cta_buttons — never as one
   * more template parameter.
   */
  url_param: Scalars['Int']['output'];
};

/** A template submitted to Meta. It comes back PENDING; Meta decides. */
export type AisensyTemplateDraft = {
  __typename?: 'AisensyTemplateDraft';
  name: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  status: Scalars['String']['output'];
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

/**
 * One CI build of the mobile app — made by the android-build / ios-build
 * GitHub Actions workflows on every merge to main, uploaded to ImageKit and
 * announced on Slack. The row is the store of record; Slack is a notification.
 */
export type AppBuild = {
  __typename?: 'AppBuild';
  /** Which server and database this build's app points at. */
  app_env: AppBuildEnv;
  /**
   * Why a SUCCESS build has no download. Empty whenever there is one. A build
   * that compiled but could not be stored is still reported and announced, so
   * this is what tells the two apart.
   */
  artifact_error: Scalars['String']['output'];
  /** The handle the primary artifact is removed by — its file name in the build store. */
  artifact_file_id: Scalars['String']['output'];
  /**
   * The primary artifact's download link, served from the VPS build store. Empty
   * on a FAILED build, and on a SUCCESS build whose artifact could not be stored.
   * Prefer the artifacts list — this names only the first of them.
   */
  artifact_url: Scalars['String']['output'];
  /**
   * Everything this build produced: an APK and an AAB on Android, an IPA on iOS.
   * Empty on a FAILED build. Rows written before builds shipped two artifacts
   * report their single one here too, so this is always the whole answer.
   */
  artifacts: Array<AppBuildArtifact>;
  branch: Scalars['String']['output'];
  /** The primary artifact's file name (the APK on Android, the IPA on iOS). */
  build_name: Scalars['String']['output'];
  /** Permanent human-readable id (DUN-BLD-000001). */
  build_no: Scalars['String']['output'];
  commit_sha: Scalars['String']['output'];
  /** The commits this build shipped. */
  commits: Array<AppBuildCommit>;
  created_at?: Maybe<Scalars['String']['output']>;
  deletions?: Maybe<Scalars['Int']['output']>;
  /**
   * Correlates the row the portal wrote at dispatch with the reports the runner
   * sends afterwards. Empty on push-triggered builds, which have a run id from
   * their first report and need no other join key.
   */
  dispatch_id: Scalars['String']['output'];
  duration_seconds?: Maybe<Scalars['Int']['output']>;
  /**
   * Why a FAILED build failed — the workflow stage that broke, and the runner's
   * own message where there is one. Empty on every other status. A red row that
   * cannot say what went wrong sends you to the GitHub log for a fact the row
   * should already have.
   */
  error_message: Scalars['String']['output'];
  files_changed?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  insertions?: Maybe<Scalars['Int']['output']>;
  platform: AppBuildPlatform;
  /** Who the CI authenticated as when it reported the build. */
  reported_by: Scalars['String']['output'];
  /**
   * What was asked for, as opposed to the artifacts list, which is what was
   * actually produced.
   * An APK that was requested and never appeared is a gap you can see.
   */
  requested_artifacts: Array<AppBuildArtifactKind>;
  size_mb?: Maybe<Scalars['Float']['output']>;
  slack_channel?: Maybe<Scalars['String']['output']>;
  /** Why the Slack post did not happen, when it did not. */
  slack_error?: Maybe<Scalars['String']['output']>;
  slack_ts?: Maybe<Scalars['String']['output']>;
  /** What the runner is doing now. Empty once the build is over. */
  stage: Scalars['String']['output'];
  /** Every stage this run has entered, in order. */
  stages: Array<AppBuildStage>;
  status: AppBuildStatus;
  /** Whether this build was requested for Google Play internal testing. */
  submit_to_play_store: Scalars['Boolean']['output'];
  trigger_source: AppBuildTrigger;
  /**
   * Who started it — the portal account that pressed Create build, or the GitHub
   * actor whose merge triggered it.
   */
  triggered_by: Scalars['String']['output'];
  version: Scalars['String']['output'];
  workflow_run_id: Scalars['String']['output'];
  workflow_run_url: Scalars['String']['output'];
};

export type AppBuildArtifact = {
  __typename?: 'AppBuildArtifact';
  /** Why this one is missing. Empty whenever there is a url. */
  error: Scalars['String']['output'];
  /** The handle it is removed by — its file name in the build store. */
  file_id: Scalars['String']['output'];
  kind: AppBuildArtifactKind;
  /** The artifact's file name. */
  name: Scalars['String']['output'];
  size_mb?: Maybe<Scalars['Float']['output']>;
  /** The download link, served from the VPS build store. Empty if it never stored. */
  url: Scalars['String']['output'];
};

export type AppBuildArtifactInput = {
  /** Why this one is missing — the build still counts as a success without it. */
  error?: InputMaybe<Scalars['String']['input']>;
  file_id?: InputMaybe<Scalars['String']['input']>;
  kind: AppBuildArtifactKind;
  name: Scalars['String']['input'];
  size_mb?: InputMaybe<Scalars['Float']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

/**
 * What one build produced. Android emits two — an APK to sideload and an AAB to
 * upload to Play — and they are ONE build, so they share a row rather than
 * racing each other for the newest-first sort.
 */
export type AppBuildArtifactKind =
  | 'AAB'
  | 'APK'
  | 'IPA';

/**
 * A credential for the build workflows, shown once and never stored.
 *
 * CI cannot read this database without already being authenticated, so one secret
 * has to live in GitHub — that part is unavoidable. What is avoidable is
 * hand-crafting the JWT: this mints one for the signed-in admin, with exactly
 * their roles, so the Tech portal is where the credential comes from even though
 * GitHub is where it is kept.
 */
export type AppBuildCiToken = {
  __typename?: 'AppBuildCiToken';
  /** The account the token authenticates as. */
  issued_for: Scalars['String']['output'];
  /** The GitHub Actions repo secret this belongs in. */
  secret_name: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type AppBuildCommit = {
  __typename?: 'AppBuildCommit';
  author: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type AppBuildCommitInput = {
  author?: InputMaybe<Scalars['String']['input']>;
  hash: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};

/** Which server and database the built app talks to. */
export type AppBuildEnv =
  | 'PRODUCTION'
  | 'STAGING';

export type AppBuildPlatform =
  | 'ANDROID'
  | 'IOS';

/** Which Slack channels build announcements post to (stored on the SLACK env entry). */
export type AppBuildSettings = {
  __typename?: 'AppBuildSettings';
  android_channel?: Maybe<Scalars['String']['output']>;
  ios_channel?: Maybe<Scalars['String']['output']>;
  /** When CI last reported any build. Null means the workflows have never reached us. */
  last_reported_at?: Maybe<Scalars['String']['output']>;
  /** Which account the last report authenticated as. */
  last_reported_by?: Maybe<Scalars['String']['output']>;
};

/**
 * A stage the runner entered, stamped when it got there. Reported as the build
 * goes, so a running build can say what it is doing rather than only how long it
 * has been doing it.
 */
export type AppBuildStage = {
  __typename?: 'AppBuildStage';
  at: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/**
 * RUNNING is written when the workflow STARTS and replaced in place when it
 * finishes, so a build is visible while it is being made rather than only after.
 * A row can sit RUNNING forever if the runner is cancelled or killed mid-job —
 * nothing is left to report it — so treat an old RUNNING row as unknown, not live.
 *
 * QUEUED belongs to builds started from the Tech portal. Dispatching a workflow
 * answers with no run id, so the row is written first and the runner claims it
 * by dispatch_id. A QUEUED row that never becomes RUNNING means GitHub accepted
 * the dispatch and never scheduled it.
 */
export type AppBuildStatus =
  | 'FAILED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS';

export type AppBuildTablePage = {
  __typename?: 'AppBuildTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AppBuild>;
  total: Scalars['Int']['output'];
};

/** What started a build. */
export type AppBuildTrigger =
  /** Someone pressed Create build in the Tech portal. */
  | 'PORTAL'
  /** A merge to main. */
  | 'PUSH';

/** Whether the portal can start builds, and what it would build from. */
export type AppBuildTriggerConfig = {
  __typename?: 'AppBuildTriggerConfig';
  /**
   * False when no GitHub token is configured. The Create build button is
   * disabled rather than hidden, so the reason is discoverable.
   */
  configured: Scalars['Boolean']['output'];
  /** Default branch for a PRODUCTION build. */
  production_ref: Scalars['String']['output'];
  /**
   * Where a dispatched build reports back to — this server. A build always
   * records itself in the portal it was started from, whichever stack its app
   * is pointed at.
   */
  reports_to: Scalars['String']['output'];
  /** owner/repo builds are dispatched against. Empty when not configured. */
  repository: Scalars['String']['output'];
  /** Default branch for a STAGING build. */
  staging_ref: Scalars['String']['output'];
};

/**
 * A one-shot pass that lets CI hand a build artifact to the server, which then
 * puts it on ImageKit. This used to be an ImageKit client-upload signature, so CI
 * could post straight to ImageKit and skip the server body cap. A signature needs
 * the public and private keys to be a matched pair from one account, and when they
 * are not, ImageKit rejects the upload as an invalid signature parameter and says
 * nothing about which key is wrong. The server uploads on the private key alone
 * now, so there is no signature and no public key to mismatch.
 */
export type AppBuildUploadAuth = {
  __typename?: 'AppBuildUploadAuth';
  /** The ImageKit folder build artifacts land in. */
  folder: Scalars['String']['output'];
  /** Single-use and short-lived. Spent by the upload, so it is worthless in a log. */
  ticket: Scalars['String']['output'];
  /** POST the artifact here as multipart form-data, with the ticket in the query string. */
  upload_url: Scalars['String']['output'];
};

/**
 * In-app feedback / problem report from any signed-in user. The server stamps
 * the authenticated identity and routes it to the feedback channel.
 */
export type AppFeedbackInput = {
  app_version?: InputMaybe<Scalars['String']['input']>;
  /** JSON array of Block Kit blocks (stringified) the client composed for the body. */
  blocks_json?: InputMaybe<Scalars['String']['input']>;
  /** Bug | Idea | Question | Other (free-form, shown as a label). */
  category: Scalars['String']['input'];
  device_model?: InputMaybe<Scalars['String']['input']>;
  /** Device context — a bug report without it cannot be reproduced. */
  device_os?: InputMaybe<Scalars['String']['input']>;
  /** Screenshots the reporter attached — a picture of the broken screen is most of the report. */
  media_urls?: InputMaybe<Array<Scalars['String']['input']>>;
  message: Scalars['String']['input'];
  /** Where it was sent from — 'web' | 'ios' | 'android' (labelling only). */
  platform?: InputMaybe<Scalars['String']['input']>;
  /** The screen the reporter was on when they opened the form. */
  source_screen?: InputMaybe<Scalars['String']['input']>;
};

export type AppPopup = {
  __typename?: 'AppPopup';
  /** Set only for AUDIENCE_LIST — membership is recomputed on every app open. */
  audience_list_id?: Maybe<Scalars['ID']['output']>;
  audience_type: AppPopupAudience;
  /** Whether the ✕ is drawn. Tapping outside the image always closes it. */
  close_button_enabled: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  cta_label: Scalars['String']['output'];
  cta_url: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  end_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  /** Internal label for the marketing table — never rendered in the app. */
  name: Scalars['String']['output'];
  platform: AppPopupPlatform;
  start_at: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

/** Everyone, or the people currently matching a saved marketing audience list. */
export type AppPopupAudience =
  | 'ALL_USERS'
  | 'AUDIENCE_LIST';

/**
 * What a client reports about itself when it asks for a popup. WEB is mWeb in a
 * desktop browser; on a phone browser mWeb reports the underlying IOS/ANDROID,
 * so platform targeting means the same thing on both surfaces.
 */
export type AppPopupClientPlatform =
  | 'ANDROID'
  | 'IOS'
  | 'WEB';

export type AppPopupInput = {
  /** Required when audience_type is AUDIENCE_LIST. */
  audience_list_id?: InputMaybe<Scalars['ID']['input']>;
  audience_type?: InputMaybe<AppPopupAudience>;
  close_button_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  cta_label?: InputMaybe<Scalars['String']['input']>;
  cta_url?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  end_at: Scalars['String']['input'];
  image_url: Scalars['String']['input'];
  name: Scalars['String']['input'];
  platform?: InputMaybe<AppPopupPlatform>;
  start_at: Scalars['String']['input'];
};

/** Which builds a popup is aimed at. BOTH reaches every client. */
export type AppPopupPlatform =
  | 'ANDROID'
  | 'BOTH'
  | 'IOS';

/** Server-side table page for the shared table engine (appPopupsTable). */
export type AppPopupTablePage = {
  __typename?: 'AppPopupTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AppPopup>;
  total: Scalars['Int']['output'];
};

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
  /** Whether a host must verify an attendee's name and phone over OTP before marking them present by hand. The door scan is proof on its own and is never gated by this. */
  attendance_otp_required: Scalars['Boolean']['output'];
  /** Account Health points a venue or host loses by withdrawing from an Auto Pod (0 disables the penalty). */
  auto_pod_cancel_health_penalty: Scalars['Int']['output'];
  /** How many days ahead a venue is shown its free slots when accepting an Auto Pod. */
  auto_pod_slot_window_days: Scalars['Int']['output'];
  /** How many hours an Auto Pod waits for a venue before it leaves venues' lists and expires. */
  auto_pod_venue_expiry_hours: Scalars['Int']['output'];
  /** CUSTOM anchor — the instant the apps' clock should read (ISO). */
  custom_time?: Maybe<Scalars['String']['output']>;
  /** Server's real time when the CUSTOM anchor was saved (ISO). */
  custom_time_set_at?: Maybe<Scalars['String']['output']>;
  date_format: Scalars['String']['output'];
  /** Days a Create-Pod draft is kept (from last save) before auto-deletion. */
  draft_retention_days: Scalars['Int']['output'];
  jwt_expires_in?: Maybe<Scalars['String']['output']>;
  jwt_no_expiry: Scalars['Boolean']['output'];
  /** Max Backout attempts a user gets per pod (each 'Backout in process' counts one). */
  max_backout_attempts: Scalars['Int']['output'];
  /** Minimum age (whole years) required to sign up or save a date of birth. */
  min_signup_age: Scalars['Int']['output'];
  /** Whether the sweep auto-cancels an upcoming pod whose finances are negative, refunding attendees under the venue's cancellation policy. */
  pod_auto_cancel_enabled: Scalars['Boolean']['output'];
  /** How many hours before a pod's start the auto-cancel finance check runs. */
  pod_auto_cancel_lead_hours: Scalars['Int']['output'];
  time_format: Scalars['String']['output'];
  /** Where every app reads 'now' from: SERVER, BROWSER or CUSTOM. */
  time_source: TimeSource;
  /** IANA timezone (e.g. Asia/Kolkata) used to display all dates & times. */
  time_zone: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  /** Account Health points deducted from a venue when its owner cancels a pod booked there (0 disables the penalty). */
  venue_cancel_health_penalty: Scalars['Int']['output'];
};

export type AppVersionInfo = {
  __typename?: 'AppVersionInfo';
  android_store_url: Scalars['String']['output'];
  ios_store_url: Scalars['String']['output'];
  /** Newest released version. Moves on every deploy — informational only. */
  latest_version: Scalars['String']['output'];
  /**
   * Oldest build still allowed in; what the force-update gate compares against.
   * Blank means nothing is blocked, which is the state a fresh database is in.
   */
  min_supported_version: Scalars['String']['output'];
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

/**
 * One bot in the Ask Bot list behind the portal header's Apps drawer. Which bots
 * exist and whether each can answer is the server's to say; its name, blurb and
 * opening line are the console's localized copy, keyed off the bot key.
 */
export type AskBot = {
  __typename?: 'AskBot';
  /** An icon name the shell's AppIcon understands. */
  icon: Scalars['String']['output'];
  /**
   * False when the bot cannot answer — an unconfigured OpenAI key, say. The row
   * is still listed, so the reason is visible rather than the bot missing.
   */
  is_available: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  unavailable_reason?: Maybe<AskBotUnavailableReason>;
};

export type AskBotChatInput = {
  bot_key: Scalars['String']['input'];
  /**
   * The conversation so far, oldest first, so a follow-up keeps its context.
   * Trimmed server-side to the last few turns.
   */
  history?: InputMaybe<Array<AskBotTurnInput>>;
  message: Scalars['String']['input'];
};

/**
 * Somewhere the answer points to, already resolved to an address that works in
 * the environment the caller is in: localhost while developing, staging on
 * staging, production otherwise.
 */
export type AskBotLink = {
  __typename?: 'AskBotLink';
  /**
   * False when this console's login gate would turn the caller away. Staff
   * consoles only; member surfaces are always open.
   */
  has_access: Scalars['Boolean']['output'];
  /** The button caption, written by the bot in the language the person asked in. */
  label: Scalars['String']['output'];
  path: Scalars['String']['output'];
  surface_key: Scalars['String']['output'];
  surface_name: Scalars['String']['output'];
  /**
   * Empty when the surface has no address in this environment — the mobile app
   * has no local web server, so there is nothing to click while developing.
   */
  url: Scalars['String']['output'];
};

export type AskBotReply = {
  __typename?: 'AskBotReply';
  answer: Scalars['String']['output'];
  followups: Array<Scalars['String']['output']>;
  links: Array<AskBotLink>;
};

export type AskBotRole =
  | 'BOT'
  | 'USER';

export type AskBotTurnInput = {
  content: Scalars['String']['input'];
  role: AskBotRole;
};

/**
 * Why a bot cannot answer right now. A code rather than a sentence: the console
 * renders the wording from its own localized copy (rule 38).
 */
export type AskBotUnavailableReason =
  | 'NOT_CONFIGURED';

/** How a booking came to be marked present. */
export type AttendanceMarkMethod =
  /** A Duncit admin checked the ticket in. */
  | 'ADMIN'
  /** A Club Admin forced it without a scan. */
  | 'CLUB_ADMIN_FORCE'
  /** The host marked them by hand, after verifying their name and number. */
  | 'HOST_MANUAL'
  /** Their ticket QR was scanned at the door — proof they were there. */
  | 'HOST_SCAN'
  /** They opened a virtual pod's meeting link as a joined member, inside the pod window — the online equivalent of the door scan. */
  | 'VIRTUAL_JOIN';

/** Dropdown values for the audience filters whose options are data, not a fixed list. */
export type AudienceFilterOptions = {
  __typename?: 'AudienceFilterOptions';
  interests: Array<AudienceInterestOption>;
  /** Role keys actually held by somebody in the audience. */
  roles: Array<Scalars['String']['output']>;
};

/** A category at least one person has picked as an interest. */
export type AudienceInterestOption = {
  __typename?: 'AudienceInterestOption';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/**
 * A saved Target Audience list. It stores the filter CRITERIA, not the people —
 * opening it re-runs them, so the membership and the count are always current
 * rather than a snapshot of the day it was built. People added by hand are
 * unioned on top of whoever the criteria match, and people removed by hand are
 * subtracted from that union.
 */
export type AudienceList = {
  __typename?: 'AudienceList';
  created_at?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  /** How many people were taken out of this list by hand. */
  excluded_member_count: Scalars['Int']['output'];
  filters: Array<AudienceListFilter>;
  id: Scalars['ID']['output'];
  /** How many people were added to this list by hand. */
  manual_member_count: Scalars['Int']['output'];
  /**
   * How many people are in the list right now: everyone matching the criteria,
   * plus everyone added by hand. Somebody who is both is counted once.
   */
  member_count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  owner_user_id?: Maybe<Scalars['ID']['output']>;
  search: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** One saved criterion, in the shared table-filter shape. */
export type AudienceListFilter = {
  __typename?: 'AudienceListFilter';
  field: Scalars['String']['output'];
  op: Scalars['String']['output'];
  value?: Maybe<Scalars['String']['output']>;
  values: Array<Scalars['String']['output']>;
};

export type AudienceListFilterInput = {
  field: Scalars['String']['input'];
  op: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type AudienceListInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Array<AudienceListFilterInput>>;
  name: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  /** The account behind the owner name, when picked from the portal-access list. */
  owner_user_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Somebody who can open the Marketing portal, and so can own a list. */
export type AudienceListOwner = {
  __typename?: 'AudienceListOwner';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True for a SUPER_ADMIN, who reaches every portal. */
  is_admin: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (audienceListsTable). */
export type AudienceListTablePage = {
  __typename?: 'AudienceListTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AudienceList>;
  total: Scalars['Int']['output'];
};

/**
 * One targetable person. Deliberately narrower than the admin User type: a
 * campaign tool has no business with payout percentages, postal addresses or
 * raw birthdates, so this carries the derived age instead of the date of birth
 * and omits the rest.
 */
export type AudienceMember = {
  __typename?: 'AudienceMember';
  /** Derived from the date of birth. Null when the account never supplied one. */
  age?: Maybe<Scalars['Int']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  email_verified: Scalars['Boolean']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  last_login_at?: Maybe<Scalars['String']['output']>;
  last_login_provider?: Maybe<Scalars['String']['output']>;
  locale?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  phone_verified: Scalars['Boolean']['output'];
  pincode?: Maybe<Scalars['String']['output']>;
  /**
   * Push platforms this person can currently be reached on (ANDROID / IOS /
   * WEB). Empty when they have never granted push or have since logged out —
   * this is reachability, not an inventory of the devices they own.
   */
  push_platforms: Array<Scalars['String']['output']>;
  roles: Array<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  /** True when the WhatsApp number on the account has been verified. */
  whatsapp_reachable: Scalars['Boolean']['output'];
  zone?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (audienceTable). */
export type AudienceTablePage = {
  __typename?: 'AudienceTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AudienceMember>;
  total: Scalars['Int']['output'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type AuthProvider =
  | 'EMAIL'
  | 'GOOGLE';

export type AutoPod = {
  __typename?: 'AutoPod';
  auto_pod_no: Scalars['String']['output'];
  available_perks: Array<Scalars['String']['output']>;
  cancel_reason?: Maybe<Scalars['String']['output']>;
  cancelled_at?: Maybe<Scalars['String']['output']>;
  /** Display name of the sub-category the admin chose. */
  category_name?: Maybe<Scalars['String']['output']>;
  /** Super › Category › Sub names, walked up from the sub-category. */
  category_path: Array<Scalars['String']['output']>;
  /** Club Admin enrolment — null until a club admin claims it for their club. */
  club_claim?: Maybe<AutoPodClubClaim>;
  created_at: Scalars['String']['output'];
  events: Array<AutoPodEvent>;
  /**
   * Projected earnings for the CALLING host under their own rates. Null before a
   * venue has priced it, and for callers who are not hosts.
   */
  expected_host_earnings?: Maybe<Scalars['Float']['output']>;
  /** Host enrolment — null until a host assigns themselves. */
  host_claim?: Maybe<AutoPodHostClaim>;
  id: Scalars['ID']['output'];
  /** False while an admin has paused the offer: shown to nobody, and no claim lands on it. */
  is_active: Scalars['Boolean']['output'];
  /** The city the first enrolment pinned it to — null while nobody has enrolled. */
  location?: Maybe<AutoPodLocation>;
  materialized_at?: Maybe<Scalars['String']['output']>;
  meeting_notes?: Maybe<Scalars['String']['output']>;
  meeting_platform?: Maybe<Scalars['String']['output']>;
  meeting_url?: Maybe<Scalars['String']['output']>;
  no_of_spots: Scalars['Int']['output'];
  payment_terms?: Maybe<Scalars['String']['output']>;
  place_charges: Array<PodPlaceCharge>;
  /** The materialized pod, once LIVE. */
  pod?: Maybe<Pod>;
  pod_amount: Scalars['Float']['output'];
  /** VIRTUAL only — a physical offer's dates come from the venue's slot. */
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_description: Scalars['String']['output'];
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_hashtag: Array<Scalars['String']['output']>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  pod_images_and_videos: Array<PodMedia>;
  pod_info: Scalars['String']['output'];
  /**
   * PHYSICAL waits on a venue to bring the slot; VIRTUAL carries its own
   * meeting details and dates and waits on a host and a club only.
   */
  pod_mode: PodMode;
  pod_occurrence: PodOccurrence;
  pod_title: Scalars['String']['output'];
  pod_type: PodType;
  product_requests: Array<PodProductRequest>;
  products_enabled: Scalars['Boolean']['output'];
  reel_url?: Maybe<Scalars['String']['output']>;
  stage: AutoPodStage;
  sub_category_id: Scalars['ID']['output'];
  super_category_id: Scalars['ID']['output'];
  updated_at: Scalars['String']['output'];
  /** Venue enrolment — null until a venue accepts and picks its slot. Always null on a VIRTUAL offer. */
  venue_claim?: Maybe<AutoPodVenueClaim>;
  /**
   * When this offer leaves venues' lists (and expires) if none has accepted it
   * by then — created_at plus Pod Settings' auto_pod_venue_expiry_hours. Null on
   * a virtual offer, once a venue has accepted, and on every list but the
   * venue's own queue.
   */
  venue_expires_at?: Maybe<Scalars['String']['output']>;
  /** True when the calling user (or one of their clubs) already enrolled. */
  viewer_claimed: Scalars['Boolean']['output'];
  what_this_pod_offers: Array<Scalars['String']['output']>;
  /** Account Health points a venue or host loses by withdrawing (Pod Settings). Set on their own queues. */
  withdraw_penalty_points?: Maybe<Scalars['Int']['output']>;
};

export type AutoPodActionCounts = {
  __typename?: 'AutoPodActionCounts';
  club: Scalars['Int']['output'];
  host: Scalars['Int']['output'];
  venue: Scalars['Int']['output'];
};

/**
 * Everyone who could enrol in a fresh Auto Pod of one sub-category, before a
 * city is pinned. All three counts must be positive before the template is
 * rolled out — an offer nobody can complete never goes live.
 */
export type AutoPodAudience = {
  __typename?: 'AutoPodAudience';
  club_admin_count: Scalars['Int']['output'];
  club_admins: Array<AutoPodAudienceClubAdmin>;
  host_count: Scalars['Int']['output'];
  hosts: Array<AutoPodAudienceHost>;
  venue_count: Scalars['Int']['output'];
  venues: Array<AutoPodAudienceVenue>;
};

/** A club admin whose club carries a sub-category, with every such club of theirs. */
export type AutoPodAudienceClubAdmin = {
  __typename?: 'AutoPodAudienceClubAdmin';
  club_names: Array<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** A host approved in a sub-category. */
export type AutoPodAudienceHost = {
  __typename?: 'AutoPodAudienceHost';
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** A venue that could accept an offer in a sub-category. */
export type AutoPodAudienceVenue = {
  __typename?: 'AutoPodAudienceVenue';
  city: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locality: Scalars['String']['output'];
  owner_name: Scalars['String']['output'];
  venue_name: Scalars['String']['output'];
};

export type AutoPodClubClaim = {
  __typename?: 'AutoPodClubClaim';
  claimed_at: Scalars['String']['output'];
  club_id: Scalars['ID']['output'];
  club_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

export type AutoPodEvent = {
  __typename?: 'AutoPodEvent';
  action: Scalars['String']['output'];
  actor_name: Scalars['String']['output'];
  actor_user_id?: Maybe<Scalars['ID']['output']>;
  at: Scalars['String']['output'];
  note: Scalars['String']['output'];
};

export type AutoPodHostClaim = {
  __typename?: 'AutoPodHostClaim';
  assigned_at: Scalars['String']['output'];
  host_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/**
 * What the host's numbers add up to on an offer — under their own rates, the
 * venue's slot price and the club admin's cut — and the spot limits the
 * activity and the booked space impose.
 */
export type AutoPodHostProjection = {
  __typename?: 'AutoPodHostProjection';
  club_admin_amount: Scalars['Float']['output'];
  gst_amount: Scalars['Float']['output'];
  host_receives: Scalars['Float']['output'];
  max_spots: Scalars['Int']['output'];
  min_spots: Scalars['Int']['output'];
  no_of_spots: Scalars['Int']['output'];
  platform_fee_amount: Scalars['Float']['output'];
  pod_amount: Scalars['Float']['output'];
  total_collection: Scalars['Float']['output'];
  venue_amount: Scalars['Float']['output'];
  /** False when the numbers would be refused: out of range, or the host would earn nothing. */
  viable: Scalars['Boolean']['output'];
};

/**
 * The city (Country → State → City, one admin Location row) the offer is pinned
 * to. Null until the first partner enrols; from then on only partners in that
 * city are offered it.
 */
export type AutoPodLocation = {
  __typename?: 'AutoPodLocation';
  bound_at: Scalars['String']['output'];
  bound_by: AutoPodLocationBinder;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  location_id: Scalars['ID']['output'];
  location_name: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

/** Which enrolment pinned the Auto Pod to its city. */
export type AutoPodLocationBinder =
  | 'CLUB'
  | 'HOST'
  | 'VENUE';

/**
 * Where an Auto Pod sits in its enrolment cycle. OPEN means nobody has enrolled
 * yet and all three roles are offered it; CLAIMING means at least one partner
 * enrolled and the rest may still enrol, in any order; LIVE means it
 * materialized into an ordinary pod.
 */
export type AutoPodStage =
  | 'CANCELLED'
  | 'CLAIMING'
  | 'EXPIRED'
  | 'LIVE'
  | 'MATERIALIZING'
  | 'OPEN';

export type AutoPodTablePage = {
  __typename?: 'AutoPodTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<AutoPod>;
  total: Scalars['Int']['output'];
};

export type AutoPodVenueClaim = {
  __typename?: 'AutoPodVenueClaim';
  accepted_at: Scalars['String']['output'];
  owner_user_id: Scalars['ID']['output'];
  pod_date_time: Scalars['String']['output'];
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  slot_price: Scalars['Float']['output'];
  venue_id: Scalars['ID']['output'];
  venue_name: Scalars['String']['output'];
  venue_slot_id: Scalars['ID']['output'];
};

/** One of a venue's free slots, priced as the venue would be paid for the offer. */
export type AutoPodVenueSlot = {
  __typename?: 'AutoPodVenueSlot';
  capacity: Scalars['Int']['output'];
  end_at: Scalars['String']['output'];
  /** What the host would be left with — negative when the slot costs more than the pod collects. */
  host_receives: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** The slot's price — what the pod pays the venue before commission. */
  price: Scalars['Float']['output'];
  space_label: Scalars['String']['output'];
  start_at: Scalars['String']['output'];
  venue_commission_pct: Scalars['Float']['output'];
  /** What the venue is paid after Finance's venue commission. */
  venue_receives: Scalars['Float']['output'];
  /** False when the pod's money could not cover this slot; accepting it would be refused. */
  viable: Scalars['Boolean']['output'];
  whole_day: Scalars['Boolean']['output'];
};

export type AutoPodVenueSlots = {
  __typename?: 'AutoPodVenueSlots';
  /** When the offer leaves this venue's list if it does not accept. */
  expires_at?: Maybe<Scalars['String']['output']>;
  /** Nearest first. */
  slots: Array<AutoPodVenueSlot>;
  /** How many days ahead the list reaches — Pod Settings' auto_pod_slot_window_days. */
  window_days: Scalars['Int']['output'];
};

/** One recorded Backout lifecycle event (immutable, chronological). */
export type BackoutEvent = {
  __typename?: 'BackoutEvent';
  at: Scalars['String']['output'];
  /** The user's backout-attempt count for this pod when the event happened. */
  backout_count: Scalars['Int']['output'];
  status: BackoutStatus;
};

/** A Backout request — powers the Finance 'Backout Refunds' list + detail. */
export type BackoutRefundRequest = {
  __typename?: 'BackoutRefundRequest';
  /** 1-based backout attempt this request represents for the user+pod. */
  attempt_no: Scalars['Int']['output'];
  backed_out_at?: Maybe<Scalars['String']['output']>;
  /** Backout attempts the user has used for this pod so far. */
  backout_attempts_used: Scalars['Int']['output'];
  /** Permanent, globally unique Backout ID (DUN-BKO-000001). */
  backout_no: Scalars['String']['output'];
  /** Lifecycle status of this Backout request. */
  backout_status: BackoutStatus;
  /**
   * Duncit Coins this release's share of the booking was paid with, before the
   * deduction — the coin twin of payment_amount.
   */
  coins_paid: Scalars['Float']['output'];
  /**
   * Coins handed back, after the SAME Backouts deduction the cash refund takes
   * (Finance > Default Deductions). Credited to the balance at the moment the
   * cash refund is processed, never before.
   */
  coins_refunded: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  /** Backouts deduction % snapshotted when the request was created. */
  deduction_pct: Scalars['Float']['output'];
  /** Immutable, chronological Backout lifecycle timeline. */
  events: Array<BackoutEvent>;
  id: Scalars['ID']['output'];
  /** True when the member gave back only part of their booking and is still attending. */
  is_partial: Scalars['Boolean']['output'];
  joined_at: Scalars['String']['output'];
  /** Max Backout attempts per user per pod (Admin > Pods > Pod Settings). */
  max_backout_attempts: Scalars['Int']['output'];
  /**
   * The whole booking this request belongs to, so Finance reads the same story
   * the member reads — this request is one branch of it, found by backout_no.
   */
  participation?: Maybe<PodParticipation>;
  payment_amount?: Maybe<Scalars['Float']['output']>;
  payment_currency?: Maybe<Scalars['String']['output']>;
  payment_id?: Maybe<Scalars['ID']['output']>;
  payment_status?: Maybe<Scalars['String']['output']>;
  pod?: Maybe<Pod>;
  pod_id: Scalars['ID']['output'];
  /** Estimated refund after deduction (null for free bookings). */
  refund_amount?: Maybe<Scalars['Float']['output']>;
  /** Set once Finance processed the refund (one refund per request). */
  refund_processed_at?: Maybe<Scalars['String']['output']>;
  refund_status: RefundStatus;
  refund_threshold_pct: Scalars['Int']['output'];
  /** True once a replacement booked the released seat (Spot Filled). */
  replacement_confirmed: Scalars['Boolean']['output'];
  replacement_user_email?: Maybe<Scalars['String']['output']>;
  /**
   * The member whose join closed this request. Null while the request is open
   * and on requests filled before this was recorded.
   */
  replacement_user_id?: Maybe<Scalars['ID']['output']>;
  replacement_user_name?: Maybe<Scalars['String']['output']>;
  /** Seats this request released. Finance refunds these, not the whole booking. */
  seats: Scalars['Int']['output'];
  /** Seats the booking held before this request — fewer released means a partial backout. */
  seats_before: Scalars['Int']['output'];
  status: MembershipStatus;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  user_name?: Maybe<Scalars['String']['output']>;
  /** Contact number of the member being refunded (null when none is on file). */
  user_phone?: Maybe<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (backoutRefundRequestsTable). */
export type BackoutRefundRequestTablePage = {
  __typename?: 'BackoutRefundRequestTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<BackoutRefundRequest>;
  total: Scalars['Int']['output'];
};

/** Lifecycle of a single Backout request (one per Confirm Backout). */
export type BackoutStatus =
  | 'CANCELLED'
  | 'IN_PROCESS'
  | 'SPOT_FILLED';

export type Badge = {
  __typename?: 'Badge';
  badge_id: Scalars['String']['output'];
  /** CATEGORY_POD_ATTEND_COUNT only: the category the attended pods must be in. */
  category_id?: Maybe<Scalars['ID']['output']>;
  condition_type: BadgeConditionType;
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  /** ROLE_GRANTED only: the role key that unlocks the badge. */
  role_key: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  threshold: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type BadgeConditionType =
  | 'CATEGORY_POD_ATTEND_COUNT'
  | 'CLUB_JOIN_COUNT'
  | 'DISTINCT_CATEGORY_COUNT'
  | 'MANUAL'
  | 'MONTHLY_POD_ATTEND_COUNT'
  | 'PLUS_ONE_POD_COUNT'
  | 'POD_ATTEND_COUNT'
  | 'POD_HOST_COUNT'
  | 'POD_JOIN_COUNT'
  | 'POD_REFERRAL_COUNT'
  | 'ROLE_GRANTED';

/**
 * One badge measured against one member: the goal, how far along they are, and
 * when they got there. Locked badges are returned too — the Badges section is
 * what is still to be won as much as what already has been.
 */
export type BadgeProgress = {
  __typename?: 'BadgeProgress';
  achieved: Scalars['Boolean']['output'];
  /** When the badge was first earned. Null while it is still locked. */
  achieved_at?: Maybe<Scalars['String']['output']>;
  badge: Badge;
  current: Scalars['Int']['output'];
  target: Scalars['Int']['output'];
};

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

/** One booking resolved from a booking deep link (the receipt email's View Booking CTA). */
export type BookingDetail = {
  __typename?: 'BookingDetail';
  /** Club slug — first path segment of the canonical pod URL. */
  club_slug: Scalars['String']['output'];
  /** PodMember id — the booking identifier carried in the deep link. */
  id: Scalars['ID']['output'];
  joined_at: Scalars['String']['output'];
  payment_id?: Maybe<Scalars['ID']['output']>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  /** Pod slug — second path segment of the canonical pod URL. */
  pod_slug: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  status: MembershipStatus;
};

export type BouncerActor = {
  __typename?: 'BouncerActor';
  avatar_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
};

export type BouncerAspectRating = {
  __typename?: 'BouncerAspectRating';
  aspect: BouncerFeedbackAspect;
  rating: Scalars['Int']['output'];
};

export type BouncerAspectRatingInput = {
  aspect: BouncerFeedbackAspect;
  rating: Scalars['Int']['input'];
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
  /** The OVERALL score. Every rating has one, including the oldest. */
  rating: Scalars['Int']['output'];
  /** Host, venue, club admin, safety, food — whichever the guest scored. */
  ratings: Array<BouncerAspectRating>;
  user: BouncerActor;
};

/**
 * The parts of a pod a guest is asked to score. OVERALL is the headline; the
 * rest are asked only when the pod has them (no venue, no venue rating).
 */
export type BouncerFeedbackAspect =
  | 'CLUB_ADMIN'
  | 'FOOD'
  | 'HOST'
  | 'OTHER'
  | 'OVERALL'
  | 'SAFETY'
  | 'VENUE';

export type BouncerFeedbackCategory =
  | 'CLUB_ADMIN'
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
  /**
   * Which parts of THIS pod can be rated, in the order to ask them. The server
   * decides, so the app, mWeb and the admin panel cannot disagree.
   */
  feedback_aspects: Array<BouncerFeedbackAspect>;
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
  /** Partner-warehouse approval gate: PENDING | APPROVED | REJECTED (Duncit-owned + legacy are APPROVED). */
  review_status: Scalars['String']['output'];
  /** Why the last registration attempt did not land ('' once registered). */
  shiprocket_error: Scalars['String']['output'];
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
  /**
   * Oldest mobile build still allowed in. Set by hand once a release is live in
   * the stores — unlike app_latest_version, which moves on every deploy. Blank
   * means nothing is blocked.
   */
  app_min_supported_version: Scalars['String']['output'];
  app_name: Scalars['String']['output'];
  /** Icon placement + size for the home All tab (null means the default TOP 40x40 look). */
  home_all_vibe_icon_layout?: Maybe<CategoryIconLayout>;
  home_all_vibe_icon_url: Scalars['String']['output'];
  home_header_tagline: Scalars['String']['output'];
  /** When true, the home vibe tabber shows every category (even ones with no pods); false shows only categories that have pods. */
  home_show_all_vibe_categories: Scalars['Boolean']['output'];
  /** Heading over the home vibe (category) filter; empty falls back to each client's bundled copy. */
  home_vibe_heading: Scalars['String']['output'];
  /** Sub-heading under the vibe heading; empty falls back to each client's bundled copy. */
  home_vibe_subheading: Scalars['String']['output'];
  ios_app_url: Scalars['String']['output'];
  /**
   * The backdrop behind the sign-in and sign-up screens, as two independent
   * switches. With both off the apps keep their bundled animated gradient,
   * which is what a database nobody has touched already answers. Video wins
   * when both are on and both carry a URL.
   */
  login_background_image_enabled: Scalars['Boolean']['output'];
  login_background_image_url: Scalars['String']['output'];
  login_background_video_enabled: Scalars['Boolean']['output'];
  login_background_video_url: Scalars['String']['output'];
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
  /** Festive icon windows; the app clock picks which one is active. */
  occasional_icons: Array<OccasionalIcon>;
  /** Global Pod Shop top slider — admin-managed image/video media (products portal). */
  pod_shop_slider: Array<PodShopSliderMedia>;
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

export type Bug = {
  __typename?: 'Bug';
  /**
   * How many distinct accounts have hit this bug. Exact up to 50 distinct
   * users, approximate beyond: the ids behind it are kept as a bounded sample,
   * so past the cap a returning user whose id aged out counts twice.
   */
  affected_user_count: Scalars['Int']['output'];
  /** Bounded, most-recent-first sample of the ids behind that count. */
  affected_user_ids: Array<Scalars['String']['output']>;
  /** Occurrences with nobody signed in — a crash on the login screen. */
  anonymous_count: Scalars['Int']['output'];
  app: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  env_counts: BugEnvCounts;
  error_name: Scalars['String']['output'];
  fingerprint: Scalars['String']['output'];
  first_seen_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  last_app_version?: Maybe<Scalars['String']['output']>;
  /**
   * The machine the latest occurrence ran on. Kept on the bug rather than left
   * to the occurrence list: occurrences fall out of the retention window while
   * the bug survives, and "only on Android 9, offline" must not go with them.
   */
  last_client?: Maybe<TelemetryClient>;
  last_duid?: Maybe<Scalars['String']['output']>;
  last_environment?: Maybe<Scalars['String']['output']>;
  last_host?: Maybe<Scalars['String']['output']>;
  last_ip?: Maybe<Scalars['String']['output']>;
  last_seen_at: Scalars['String']['output'];
  last_session_id?: Maybe<Scalars['String']['output']>;
  last_stack?: Maybe<Scalars['String']['output']>;
  last_url?: Maybe<Scalars['String']['output']>;
  /** The person who hit it most recently — the one worth calling back. */
  last_user?: Maybe<TelemetryUser>;
  last_user_agent?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  occurrence_count: Scalars['Int']['output'];
  os?: Maybe<Scalars['String']['output']>;
  page: Scalars['String']['output'];
  platform: Scalars['String']['output'];
  portal?: Maybe<Scalars['String']['output']>;
  resolved_at?: Maybe<Scalars['String']['output']>;
  /** User id of whoever marked it resolved. */
  resolved_by?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  /** OPEN | RESOLVED | IGNORED */
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type BugEnvCounts = {
  __typename?: 'BugEnvCounts';
  localhost: Scalars['Int']['output'];
  production: Scalars['Int']['output'];
  staging: Scalars['Int']['output'];
};

export type BugEnvCountsInput = {
  localhost?: InputMaybe<Scalars['Int']['input']>;
  production?: InputMaybe<Scalars['Int']['input']>;
  staging?: InputMaybe<Scalars['Int']['input']>;
};

/** One bug from an export file. Matched on fingerprint: existing rows are overwritten. */
export type BugImportInput = {
  affected_user_count?: InputMaybe<Scalars['Int']['input']>;
  affected_user_ids?: InputMaybe<Array<Scalars['String']['input']>>;
  anonymous_count?: InputMaybe<Scalars['Int']['input']>;
  app?: InputMaybe<Scalars['String']['input']>;
  env_counts?: InputMaybe<BugEnvCountsInput>;
  error_name?: InputMaybe<Scalars['String']['input']>;
  fingerprint: Scalars['String']['input'];
  first_seen_at?: InputMaybe<Scalars['String']['input']>;
  last_app_version?: InputMaybe<Scalars['String']['input']>;
  last_duid?: InputMaybe<Scalars['String']['input']>;
  last_environment?: InputMaybe<Scalars['String']['input']>;
  last_host?: InputMaybe<Scalars['String']['input']>;
  last_seen_at?: InputMaybe<Scalars['String']['input']>;
  last_session_id?: InputMaybe<Scalars['String']['input']>;
  last_stack?: InputMaybe<Scalars['String']['input']>;
  last_url?: InputMaybe<Scalars['String']['input']>;
  last_user?: InputMaybe<TelemetryUserImportInput>;
  last_user_agent?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  occurrence_count?: InputMaybe<Scalars['Int']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  page: Scalars['String']['input'];
  platform?: InputMaybe<Scalars['String']['input']>;
  portal?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type BugImportResult = {
  __typename?: 'BugImportResult';
  created: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

export type BugTablePage = {
  __typename?: 'BugTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Bug>;
  total: Scalars['Int']['output'];
};

export type BulkCreateVenueSlotsInput = {
  /** What to do when a new slot overlaps an existing one (defaults to FAIL). */
  on_conflict?: InputMaybe<VenueSlotConflictMode>;
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

/**
 * What the SMTP server said at handover. Acceptance, not inbox delivery — a
 * mailbox that accepts and then bounces is invisible from here.
 */
export type CampaignDelivery = {
  __typename?: 'CampaignDelivery';
  accepted: Scalars['Int']['output'];
  rejected: Scalars['Int']['output'];
  rejected_addresses: Array<Scalars['String']['output']>;
};

/**
 * One human check, minted on demand.
 *
 * The token is the whole challenge — it carries a nonce, an expiry and a hash
 * of the answer, signed by the server. Nothing is stored per challenge, so the
 * check still works on the status page while the database is the thing being
 * reported as broken.
 */
export type CaptchaChallenge = {
  __typename?: 'CaptchaChallenge';
  /** Seconds the token stays good for. */
  expires_in: Scalars['Int']['output'];
  /** The code drawn as an SVG data URI, ready for an <img> tag. */
  image: Scalars['String']['output'];
  /** Send this back with the form, beside the answer the visitor typed. */
  token: Scalars['String']['output'];
};

export type Category = {
  __typename?: 'Category';
  /** SUB level only: may a host invite co-hosts to a pod in this sub-category? */
  allow_co_hosts: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** Back face of the gift card sold under this category. Empty means no artwork. */
  gift_card_image_back: Scalars['String']['output'];
  /**
   * Front face of the gift card sold under this category. Empty means no artwork
   * was uploaded, and the clients render their generated gradient card instead.
   */
  gift_card_image_front: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  /** CATEGORY level only: icon layout for the mWeb vibe tabber. */
  icon_layout_mweb?: Maybe<CategoryIconLayout>;
  /** CATEGORY level only: icon layout for the native-app vibe tabber. */
  icon_layout_native?: Maybe<CategoryIconLayout>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  is_system: Scalars['Boolean']['output'];
  level: CategoryLevel;
  /** SUB level only: how many co-hosts one pod may carry (1-5). */
  max_co_hosts: Scalars['Int']['output'];
  media: Array<CategoryMedia>;
  /**
   * SUB level only: the fewest people this activity needs to work. A host sizing
   * a pod in this sub-category cannot go below it. 0 means no minimum is set.
   */
  min_pax: Scalars['Int']['output'];
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

/** CATEGORY level only: per-surface icon placement + size for the vibe tabber. */
export type CategoryIconLayout = {
  __typename?: 'CategoryIconLayout';
  height: Scalars['Int']['output'];
  position: CategoryIconPosition;
  width: Scalars['Int']['output'];
};

export type CategoryIconLayoutInput = {
  height?: InputMaybe<Scalars['Int']['input']>;
  position?: InputMaybe<CategoryIconPosition>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Icon placement relative to the category label in the home vibe tabber. */
export type CategoryIconPosition =
  | 'BOTTOM'
  | 'LEFT'
  | 'RIGHT'
  | 'TOP';

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

export type ChatParticipants = {
  __typename?: 'ChatParticipants';
  hosts: Array<ChatUser>;
  participant_count: Scalars['Int']['output'];
  participants: Array<ChatUser>;
};

export type ChatRoom = {
  __typename?: 'ChatRoom';
  club_id?: Maybe<Scalars['ID']['output']>;
  /** The club's URL slug (Club.club_id) for building the pod detail path. */
  club_slug?: Maybe<Scalars['String']['output']>;
  cover_url?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  no_of_spots?: Maybe<Scalars['Int']['output']>;
  pod_attendees: Array<Scalars['ID']['output']>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  /** End time (or null) — clients bucket Upcoming vs Previous from these. */
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_id?: Maybe<Scalars['ID']['output']>;
  /** The pod's URL slug (Pod.pod_id) for linking to its detail page. */
  pod_slug?: Maybe<Scalars['String']['output']>;
  pod_title: Scalars['String']['output'];
  /** Super category the linked club maps to (For You / For Your Pet classification). */
  super_category_id?: Maybe<Scalars['ID']['output']>;
};

/** A host or participant shown in the chat detail people panel. */
export type ChatUser = {
  __typename?: 'ChatUser';
  full_name: Scalars['String']['output'];
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
};

export type CheckInEventTicketInput = {
  /**
   * The other people this ticket admits. Required the first time a multi-seat
   * ticket is checked in — exactly one entry per seat beyond the buyer's own.
   */
  companions?: InputMaybe<Array<PodCompanionInput>>;
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
  /** Chosen variant for products with a variant matrix — price and stock resolve from it. */
  variant_id?: InputMaybe<Scalars['ID']['input']>;
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
  /** Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once. */
  seats?: InputMaybe<Scalars['Int']['input']>;
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
  /**
   * Contact details lifted from the person's profile. Only a club's assigned
   * admins carry these — they are the club's point of contact. Null on hosts,
   * and null for any field the profile leaves empty.
   */
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Dialable number with its extension when stored (e.g. "+91 9876543210"). */
  phone?: Maybe<Scalars['String']['output']>;
  /**
   * WhatsApp number with its extension — the client strips non-digits to build
   * the wa.me link. Null when the admin has no WhatsApp number on file.
   */
  whatsapp?: Maybe<Scalars['String']['output']>;
};

/** A club this Club Admin runs. */
export type ClubAdminAssignedClub = {
  __typename?: 'ClubAdminAssignedClub';
  club_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** What a backfill run did, so an operator can see it worked. */
export type ClubAdminBackfillResult = {
  __typename?: 'ClubAdminBackfillResult';
  created: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

/** One assignable Club Admin, in the shape the club form's picker renders. */
export type ClubAdminCandidate = {
  __typename?: 'ClubAdminCandidate';
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/**
 * One category the Club Admin's clubs run under — a tile of the dashboard's
 * category card.
 *
 * Keyed on the club's OWN category (the sub-category leaf every club carries),
 * with the parent super category alongside, so a tile names the activity the
 * same way the "Your Clubs" table's two category columns do. A club carrying no
 * category — only ones predating the mandatory picker — has none to report and
 * is simply absent from the card, which is why these club counts are read per
 * category rather than against assigned_clubs.
 */
export type ClubAdminCategory = {
  __typename?: 'ClubAdminCategory';
  category_id: Scalars['ID']['output'];
  /** How many of the caller's clubs run under this category. */
  clubs: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  /** Pods across those clubs, inside the dashboard's date window. */
  pods: Scalars['Int']['output'];
  /** Parent super category's name. Null when the club carries no super category. */
  super_category?: Maybe<Scalars['String']['output']>;
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

/** A club that matches the Club Admin's taxonomy, for the Assign Clubs picker. */
export type ClubAdminClubOption = {
  __typename?: 'ClubAdminClubOption';
  /** Whether this admin already runs it. */
  assigned: Scalars['Boolean']['output'];
  club_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /**
   * False for a club they run from outside their own category. Listed anyway,
   * because a club that is assigned but not shown cannot be given back.
   */
  matches_category: Scalars['Boolean']['output'];
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
  /** Categories the caller's clubs run under, biggest first. */
  categories: Array<ClubAdminCategory>;
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

/**
 * The onboarded Club Admin record — the Club Admin counterpart of Host, Venue
 * and E-Commerce Brand. Created when their onboarding meeting is approved.
 */
export type ClubAdminProfile = {
  __typename?: 'ClubAdminProfile';
  /** Every club this admin runs. Empty until clubs are assigned in Review. */
  assigned_clubs: Array<ClubAdminAssignedClub>;
  category?: Maybe<Scalars['String']['output']>;
  category_id?: Maybe<Scalars['ID']['output']>;
  /** Immutable public id, e.g. CADM-000001. */
  club_admin_no?: Maybe<Scalars['String']['output']>;
  /** Null or 0 inherits the platform default. */
  commission_pct?: Maybe<Scalars['Float']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Separate from status: a switch onboarding can flip back. */
  is_active: Scalars['Boolean']['output'];
  /** When onboarding completed. */
  joined_at?: Maybe<Scalars['String']['output']>;
  phone: Scalars['String']['output'];
  /** The onboarding meeting request this came from. */
  request_no?: Maybe<Scalars['String']['output']>;
  reviewer_notes?: Maybe<Scalars['String']['output']>;
  /** DRAFT until reviewed, then APPROVED or REJECTED. */
  status: Scalars['String']['output'];
  sub_category?: Maybe<Scalars['String']['output']>;
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  /** Names of the taxonomy chosen in the onboarding gate. */
  super_category?: Maybe<Scalars['String']['output']>;
  super_category_id?: Maybe<Scalars['ID']['output']>;
  user_id: Scalars['ID']['output'];
};

export type ClubAdminProfileTablePage = {
  __typename?: 'ClubAdminProfileTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ClubAdminProfile>;
  total: Scalars['Int']['output'];
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

/**
 * One pod under a club the caller administers — the Club Studio "Your Pods" row.
 *
 * Field-for-field identical to VenuePod, with club_id/club_name where that type
 * carries venue_id/venue_name, so Club Studio and Venue Studio render the same
 * row through ONE component in mWeb and native (rules 27 + 34).
 *
 * It reuses VenuePodBucket rather than declaring a club-named twin of the same
 * four values: the bucket describes the POD's lifecycle, not who is looking at
 * it, and a second enum is how the two client unions drift apart.
 */
export type ClubPod = {
  __typename?: 'ClubPod';
  /** Seats taken — attendees plus the extra seats they bought. */
  attendee_count: Scalars['Int']['output'];
  bucket: VenuePodBucket;
  /** Set when the pod was cancelled (soft-deleted). */
  cancelled_at?: Maybe<Scalars['String']['output']>;
  club_id: Scalars['ID']['output'];
  club_name: Scalars['String']['output'];
  completed_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  host_names: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  no_of_spots: Scalars['Int']['output'];
  pod_amount: Scalars['Int']['output'];
  /** Attendee user ids — resolve names via publicUsersByIds. */
  pod_attendees: Array<Scalars['ID']['output']>;
  pod_date_time: Scalars['String']['output'];
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_slug: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  pod_type: PodType;
};

/**
 * Roll-up figures behind the Club Studio "Your Pods" header, computed over EVERY
 * pod in scope (the list itself is capped) so the apps never re-derive money or
 * state counts themselves.
 *
 * Cancelled pods count in the cancelled field only: their spots were never sold
 * and their payments were refunded, so they stay out of capacity, fill and
 * revenue.
 */
export type ClubPodSummary = {
  __typename?: 'ClubPodSummary';
  cancelled: Scalars['Int']['output'];
  /** Finished (the COMPLETED bucket). */
  completed: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  /** filled_spots / total_spots (0..1); 0 when there is no capacity. */
  fill_rate: Scalars['Float']['output'];
  /** Seats taken across non-cancelled pods (attendees + extra seats). */
  filled_spots: Scalars['Int']['output'];
  /** Start of the soonest upcoming pod, ISO. Null when nothing is scheduled. */
  next_pod_date_time?: Maybe<Scalars['String']['output']>;
  /** Running right now (the ONGOING bucket). */
  ongoing: Scalars['Int']['output'];
  /**
   * Clubs in scope — 1 when club_id narrows to a single club. Named to match
   * VenuePodSummary so one client component reads both.
   */
  scope_count: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  /** People in those pods — extra seats excluded. */
  total_attendees: Scalars['Int']['output'];
  /** Collected from SUCCESS payments on the non-cancelled pods in scope. */
  total_revenue: Scalars['Float']['output'];
  /** Capacity across non-cancelled pods. */
  total_spots: Scalars['Int']['output'];
  upcoming: Scalars['Int']['output'];
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

export type CoinAdjustDirection =
  | 'DEDUCT'
  | 'GRANT';

/** What one manual adjustment left behind, so the console can confirm it landed. */
export type CoinAdjustResult = {
  __typename?: 'CoinAdjustResult';
  /** Signed movement: positive for a grant, negative for a deduction. */
  applied: Scalars['Float']['output'];
  balance: Scalars['Float']['output'];
  lifetime_earned: Scalars['Float']['output'];
  user_id: Scalars['ID']['output'];
};

/** A pod a coin row is attributable to, named for the admin ledger. */
export type CoinAdminPod = {
  __typename?: 'CoinAdminPod';
  id: Scalars['ID']['output'];
  /** Per-club pod slug, so two pods sharing a title stay distinguishable. */
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** Platform-wide Duncit Coin position for Admin > Duncit Coin > Dashboard. */
export type CoinAdminStats = {
  __typename?: 'CoinAdminStats';
  /** Currency the coin value is quoted in — 1 coin = 1 unit of it. */
  currency_symbol: Scalars['String']['output'];
  /** Percent of a pod join currently granted back as coins. */
  earn_pct: Scalars['Float']['output'];
  /** Accounts holding a non-zero balance. */
  holders_count: Scalars['Int']['output'];
  /** Oldest first, one entry per calendar month, empty months filled with zeroes. */
  monthly: Array<CoinMonthBucket>;
  /** Percent of a shop order currently granted back as coins. */
  shop_earn_pct: Scalars['Float']['output'];
  /** Every coin ever granted — the sum of all CREDIT rows. */
  total_circulated: Scalars['Float']['output'];
  /** Circulated minus redeemed: the coins still sitting with users. */
  total_outstanding: Scalars['Float']['output'];
  /** Every coin ever spent at checkout — the sum of all DEBIT rows. */
  total_redeemed: Scalars['Float']['output'];
  /** Ledger rows written so far. */
  transaction_count: Scalars['Int']['output'];
  /**
   * The same outstanding figure read from CoinBalance instead of the ledger.
   * Exposed as a cross-check: it should equal total_outstanding, and a drift is
   * worth seeing rather than hiding.
   */
  wallet_balance_total: Scalars['Float']['output'];
};

/** One coin ledger row joined to its payment and the pods that payment bought. */
export type CoinAdminTransaction = {
  __typename?: 'CoinAdminTransaction';
  /** Who typed this adjustment. Empty on every automatic row. */
  admin_name: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  balance_after: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  /** Rate in effect when these coins were granted. */
  earn_pct: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  payment_id?: Maybe<Scalars['String']['output']>;
  /** What the payment charged, so the row audits on its own. */
  payment_total: Scalars['Float']['output'];
  /**
   * Every pod the payment touched. A pod ticket resolves to exactly one; a shop
   * cart can span several, because a unified cart groups its lines by pod. Empty
   * when the payment bought nothing pod-linked.
   */
  pods: Array<CoinAdminPod>;
  reason: Scalars['String']['output'];
  /** PAYMENT_EARN or PAYMENT_REDEEM. */
  source: Scalars['String']['output'];
  /** Order total the grant was computed from. */
  spend_amount: Scalars['Float']['output'];
  /** CREDIT or DEBIT. */
  type: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  /**
   * Who the coins moved for. Taken from the buyer name frozen on the payment,
   * and looked up on the account for the rows that have no payment — a referral
   * credit or a manual adjustment names its person too.
   */
  user_name: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (coinTransactionsTable). */
export type CoinAdminTransactionTablePage = {
  __typename?: 'CoinAdminTransactionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<CoinAdminTransaction>;
  total: Scalars['Int']['output'];
};

/** A user's Duncit Coin balance. 1 coin = 1 rupee of earned reward value. */
export type CoinBalance = {
  __typename?: 'CoinBalance';
  balance: Scalars['Float']['output'];
  /** Percent of a pod join currently granted back as coins. */
  earn_pct: Scalars['Float']['output'];
  /** Every coin ever earned, so the total survives future spending. */
  lifetime_earned: Scalars['Float']['output'];
  /**
   * Flat coins currently paid for rating an attended pod. 0 means the reward is
   * switched off, and the Duncit Coin page says nothing about it.
   */
  pod_feedback_coins: Scalars['Int']['output'];
  /** Percent of a shop order currently granted back as coins. */
  shop_earn_pct: Scalars['Float']['output'];
};

/** One calendar month of coin flow. The client formats the label from the key. */
export type CoinMonthBucket = {
  __typename?: 'CoinMonthBucket';
  earned: Scalars['Float']['output'];
  /** Calendar month as a 'YYYY-MM' key, in UTC. */
  month: Scalars['String']['output'];
  redeemed: Scalars['Float']['output'];
};

/**
 * Every rule that decides how many coins someone is given, in one place
 * (Finance > Duncit Coin > Settings).
 */
export type CoinSettings = {
  __typename?: 'CoinSettings';
  /** Flat coins paid to EACH side of a referral — the referrer and the new member. */
  coins_per_referral: Scalars['Int']['output'];
  /** Flat coins paid for feedback on an attended pod (0 turns it off). */
  pod_feedback_coins: Scalars['Int']['output'];
  /** Percent of a pod-ticket payment granted back to the buyer (0 turns it off). */
  pod_join_earn_pct: Scalars['Int']['output'];
  /** Percent of a shop/product order granted back to the buyer (0 turns it off). */
  shop_earn_pct: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
};

/** Every field is optional; an omitted one is left alone. */
export type CoinSettingsInput = {
  coins_per_referral?: InputMaybe<Scalars['Int']['input']>;
  pod_feedback_coins?: InputMaybe<Scalars['Int']['input']>;
  pod_join_earn_pct?: InputMaybe<Scalars['Int']['input']>;
  shop_earn_pct?: InputMaybe<Scalars['Int']['input']>;
};

/** One row of the coin ledger — insert-only, newest first. */
export type CoinTransaction = {
  __typename?: 'CoinTransaction';
  amount: Scalars['Float']['output'];
  balance_after: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  /** Rate in effect when these coins were granted. */
  earn_pct: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Payment this reward was earned on. */
  payment_id?: Maybe<Scalars['String']['output']>;
  reason: Scalars['String']['output'];
  source: Scalars['String']['output'];
  /** Order total the grant was computed from. */
  spend_amount: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

/**
 * One account the manual-adjustment picker can offer. Deliberately narrow: the
 * full User type would ship a profile per keystroke, and the balance is the one
 * extra fact an admin needs before typing an amount.
 */
export type CoinUserOption = {
  __typename?: 'CoinUserOption';
  balance: Scalars['Float']['output'];
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

/** A way Duncit can reach a person. Channel and kind are different axes. */
export type CommChannel =
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP';

/**
 * One channel on the Communication Preferences section of Profile Settings.
 *
 * The marketing side of each channel lives on its own screen — Mail Preference,
 * WhatsApp Preference, SMS Preference — because there are nine categories with
 * a sentence each and inlining them would push the account's own information
 * off the first screen. What IS inline is the switch below: whether this
 * channel may carry a one-time code.
 */
export type CommChannelPreference = {
  __typename?: 'CommChannelPreference';
  channel: CommChannel;
  /** The address or number, for the screen to name. Blank when unreachable. */
  destination: Scalars['String']['output'];
  /**
   * False when the switch must stay on: this is the last channel that both
   * accepts codes AND can be reached, and an account with nowhere to receive a
   * code cannot sign in. Enabling is never blocked, only disabling.
   */
  otp_can_disable: Scalars['Boolean']['output'];
  /** Whether one-time codes may be carried on this channel. */
  otp_enabled: Scalars['Boolean']['output'];
  /**
   * Whether a message could reach this person here at all — an address for
   * EMAIL, a WhatsApp number, a phone number for SMS. Both apps render an
   * "add your number" state off this rather than re-deriving it.
   */
  reachable: Scalars['Boolean']['output'];
};

export type CommPreference = {
  __typename?: 'CommPreference';
  channels: Array<CommChannelPreference>;
  /** ISO instant the OTP switches last moved. Null while they are all default. */
  updated_at?: Maybe<Scalars['String']['output']>;
};

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

export type CompletePasswordResetInput = {
  new_password: Scalars['String']['input'];
  /** The one-shot grant verifyPasswordResetCode handed back. */
  reset_token: Scalars['String']['input'];
};

export type CompletePodInput = {
  evidence_media?: InputMaybe<Array<PaymentReleaseMediaInput>>;
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
  venue_bill_amount: Scalars['Float']['input'];
};

/**
 * What a user can currently sign in with.
 *
 * has_password is what makes Google safe to disconnect: an account with no
 * password has Google as its ONLY way in, so unlinking would lock the user out.
 */
export type ConnectedAccounts = {
  __typename?: 'ConnectedAccounts';
  email?: Maybe<Scalars['String']['output']>;
  google?: Maybe<ConnectedGoogleAccount>;
  has_password: Scalars['Boolean']['output'];
};

/** The Google account currently linked to a Duncit account. */
export type ConnectedGoogleAccount = {
  __typename?: 'ConnectedGoogleAccount';
  /** The Gmail address the user is prompted with. Falls back to the account email for accounts created by Google signup, which predate the stored field. */
  google_email: Scalars['String']['output'];
  /** ISO timestamp of when the link was granted. Null for Google-signup accounts linked before this was recorded. */
  linked_at?: Maybe<Scalars['String']['output']>;
};

/** Which number on the account a one-time code is being asked to move. */
export type ContactPhoneField =
  /** The contact number — auth.phone. */
  | 'PHONE'
  /** The WhatsApp number — communication.whatsapp. */
  | 'WHATSAPP';

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

export type ContentReport = {
  __typename?: 'ContentReport';
  club_id?: Maybe<Scalars['ID']['output']>;
  created_at: Scalars['String']['output'];
  /** The reporter's own words. Always present when the reason is OTHER. */
  details: Scalars['String']['output'];
  handled_by_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reason: ReportReason;
  /** Permanent, globally unique handle (RPT-000001). Never edited, never reused. */
  report_no: Scalars['String']['output'];
  reporter_name: Scalars['String']['output'];
  /** What Legal did about it. Staff-only. */
  resolution: Scalars['String']['output'];
  resolved_at?: Maybe<Scalars['String']['output']>;
  status: ReportStatus;
  target_caption: Scalars['String']['output'];
  target_id: Scalars['ID']['output'];
  target_owner_name: Scalars['String']['output'];
  /**
   * What the reporter was looking at, copied at report time.
   *
   * A story is gone in 24 hours and a reported post is the first thing its
   * author deletes, so the row would otherwise point at nothing by the time
   * anyone reviewed it.
   */
  target_preview_url: Scalars['String']['output'];
  target_type: ReportTargetType;
  updated_at: Scalars['String']['output'];
};

export type ContentReportStats = {
  __typename?: 'ContentReportStats';
  by_status: Array<ReportStatusCount>;
  total: Scalars['Int']['output'];
};

export type ContentReportTablePage = {
  __typename?: 'ContentReportTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ContentReport>;
  total: Scalars['Int']['output'];
};

export type Contract = {
  __typename?: 'Contract';
  content: Scalars['String']['output'];
  /**
   * The permanent, globally unique handle (CTR-000001). Minted on creation,
   * never edited, and never reused — the counter behind it only counts up, so
   * a deleted contract's id is not handed to another one.
   */
  contract_no: Scalars['String']['output'];
  counterparty: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  created_by_name: Scalars['String']['output'];
  description: Scalars['String']['output'];
  effective_from?: Maybe<Scalars['String']['output']>;
  effective_to?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** A signed contract is closed to edits — the lock IS the signature. */
  is_locked: Scalars['Boolean']['output'];
  /** Everyone who must sign, and their signature once they have. */
  signatories: Array<ContractSignatory>;
  signed_at?: Maybe<Scalars['String']['output']>;
  /** UNSIGNED until every required signatory has signed, then SIGNED. */
  signing_status: SigningStatus;
  status: ContractStatus;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  updated_by_name: Scalars['String']['output'];
};

/**
 * One person who must sign a contract, and their signature once they have.
 *
 * The same shape a legal document's signatory carries, because both sign
 * through one service — a separate type is what would let the two drift.
 */
export type ContractSignatory = {
  __typename?: 'ContractSignatory';
  designation: Scalars['String']['output'];
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  initials: Scalars['String']['output'];
  /** A data URL for a drawn or typed signature, or the uploaded image URL. */
  signature_image: Scalars['String']['output'];
  signature_method?: Maybe<SignatureMethod>;
  signed_at?: Maybe<Scalars['String']['output']>;
};

/** Where a contract is in its life. */
export type ContractStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DRAFT'
  | 'EXPIRED';

/** Server-side table page for the shared table engine (contractsTable). */
export type ContractTablePage = {
  __typename?: 'ContractTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Contract>;
  total: Scalars['Int']['output'];
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

/**
 * Someone who works here: anyone holding a role that admits them to a staff
 * console. Membership follows the roles, so nobody maintains this list.
 */
export type Coworker = {
  __typename?: 'Coworker';
  bio: Scalars['String']['output'];
  city: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Reachable off-chat. Empty when they have not given one. */
  phone: Scalars['String']['output'];
  photo: Scalars['String']['output'];
  /** Only their staff roles — the ones that put them in this directory. */
  roles: Array<Scalars['String']['output']>;
  /** Their IANA zone, so you can see whether it is a reasonable hour to call. */
  timezone: Scalars['String']['output'];
};

export type CreateAiPromptInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  /** Feed address for this prompt, slugged from the name when left out. Cannot be changed later. */
  key?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  target_model?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAisensyCampaignInput = {
  campaign_name: Scalars['String']['input'];
  template_name: Scalars['String']['input'];
};

export type CreateAisensyTemplateInput = {
  /** The body, with its {{1}} placeholders. */
  body: Scalars['String']['input'];
  /** UTILITY, MARKETING or AUTHENTICATION. */
  category: Scalars['String']['input'];
  footer_text?: InputMaybe<Scalars['String']['input']>;
  header_text?: InputMaybe<Scalars['String']['input']>;
  /** The full language NAME AiSensy expects — English, Hindi — never a code. */
  language: Scalars['String']['input'];
  /** Unique template name — this is also what a campaign binds to. */
  name: Scalars['String']['input'];
  /** The same body with sample values in place — Meta reviews against this. */
  sample: Scalars['String']['input'];
  /** TEXT, or IMAGE / VIDEO / FILE for a media header. */
  type: Scalars['String']['input'];
};

export type CreateAutoPodInput = {
  available_perks?: InputMaybe<Array<Scalars['String']['input']>>;
  meeting_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_platform?: InputMaybe<Scalars['String']['input']>;
  meeting_url?: InputMaybe<Scalars['String']['input']>;
  no_of_spots: Scalars['Int']['input'];
  payment_terms?: InputMaybe<Scalars['String']['input']>;
  place_charges?: InputMaybe<Array<PodPlaceChargeInput>>;
  pod_amount: Scalars['Float']['input'];
  pod_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_description: Scalars['String']['input'];
  pod_end_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_images_and_videos: Array<PodMediaInput>;
  pod_info?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to PHYSICAL. VIRTUAL requires meeting_url, pod_date_time and pod_end_date_time. */
  pod_mode?: InputMaybe<PodMode>;
  pod_occurrence?: InputMaybe<PodOccurrence>;
  pod_title: Scalars['String']['input'];
  product_requests?: InputMaybe<Array<PodProductRequestInput>>;
  reel_url?: InputMaybe<Scalars['String']['input']>;
  sub_category_id: Scalars['ID']['input'];
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateBadgeInput = {
  badge_id?: InputMaybe<Scalars['String']['input']>;
  category_id?: InputMaybe<Scalars['ID']['input']>;
  condition_type: BadgeConditionType;
  description?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  role_key?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateCategoryInput = {
  allow_co_hosts?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gift_card_image_back?: InputMaybe<Scalars['String']['input']>;
  gift_card_image_front?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  icon_layout_mweb?: InputMaybe<CategoryIconLayoutInput>;
  icon_layout_native?: InputMaybe<CategoryIconLayoutInput>;
  level: CategoryLevel;
  max_co_hosts?: InputMaybe<Scalars['Int']['input']>;
  media?: InputMaybe<Array<CategoryMediaInput>>;
  min_pax?: InputMaybe<Scalars['Int']['input']>;
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

export type CreateContractInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  counterparty?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  effective_from?: InputMaybe<Scalars['String']['input']>;
  effective_to?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ContractStatus>;
  title: Scalars['String']['input'];
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

export type CreateEmailFragmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  footer_mjml?: InputMaybe<Scalars['String']['input']>;
  header_mjml?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateEmailTemplateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  footer_note?: InputMaybe<Scalars['String']['input']>;
  fragment_key?: InputMaybe<Scalars['String']['input']>;
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
  /** Required for AUDIENCE_LIST scope — the saved marketing list to send to. */
  audience_list_id?: InputMaybe<Scalars['ID']['input']>;
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
  category_id: Scalars['ID']['input'];
  category_name?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  sub_category_id: Scalars['ID']['input'];
  sub_category_name?: InputMaybe<Scalars['String']['input']>;
  /** Mandatory Super/Category/Sub the idea maps to (For You › Sports › Badminton). */
  super_category_id: Scalars['ID']['input'];
  super_category_name?: InputMaybe<Scalars['String']['input']>;
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
  policy_type?: InputMaybe<Scalars['String']['input']>;
  /** Omitted means true — every policy gates signup until Legal says otherwise. */
  requires_signup_acceptance?: InputMaybe<Scalars['Boolean']['input']>;
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
  /** Mark this slot as a whole-day (or whole-date-range) booking (defaults to false). */
  whole_day?: InputMaybe<Scalars['Boolean']['input']>;
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

/**
 * The signed-in user's saved arrangement of one dashboard. Null from
 * myDashboardLayout when they have never customised it — the client then
 * renders the dashboard's built-in defaults.
 */
export type DashboardLayout = {
  __typename?: 'DashboardLayout';
  dashboard_id: Scalars['ID']['output'];
  items: Array<DashboardLayoutItem>;
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** One widget's place on a dashboard grid, in GridStack column/row units. */
export type DashboardLayoutItem = {
  __typename?: 'DashboardLayoutItem';
  h: Scalars['Int']['output'];
  w: Scalars['Int']['output'];
  /** The widget's stable id, as declared by the dashboard's widget catalogue. */
  widget_id: Scalars['ID']['output'];
  x: Scalars['Int']['output'];
  y: Scalars['Int']['output'];
};

export type DashboardLayoutItemInput = {
  h: Scalars['Int']['input'];
  w: Scalars['Int']['input'];
  widget_id: Scalars['ID']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
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

/**
 * Progress for one collection inside a clone job. The bytes field is the BSON
 * size of the documents actually written, so it grows while the copy runs.
 */
export type DataCloneCollection = {
  __typename?: 'DataCloneCollection';
  bytes: Scalars['Float']['output'];
  copiedCount: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  sourceCount: Scalars['Int']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  /** PENDING | COPYING | DONE | FAILED */
  status: Scalars['String']['output'];
};

/**
 * One saved database connection.
 *
 * The connection string itself is never returned — uriMasked keeps the cluster
 * and the user and drops the password, which is enough to recognise which
 * account is saved and not enough to use it. connected is only true because the
 * server actually reached that database, and collectionCount is what it counted
 * there.
 */
export type DataCloneConnection = {
  __typename?: 'DataCloneConnection';
  collectionCount: Scalars['Int']['output'];
  connected: Scalars['Boolean']['output'];
  database: Scalars['String']['output'];
  hasUri: Scalars['Boolean']['output'];
  /** Why the last connect attempt failed, in the driver's own words. */
  lastTestError?: Maybe<Scalars['String']['output']>;
  lastTestedAt?: Maybe<Scalars['String']['output']>;
  role: DataCloneRole;
  uriMasked: Scalars['String']['output'];
};

/**
 * A blank uri keeps the stored one, so the database name can be corrected
 * without re-pasting credentials that are only ever shown masked.
 */
export type DataCloneConnectionInput = {
  database: Scalars['String']['input'];
  uri?: InputMaybe<Scalars['String']['input']>;
};

/** A production -> staging clone. Runs server-side; the browser only polls it. */
export type DataCloneJob = {
  __typename?: 'DataCloneJob';
  bytesCopied: Scalars['Float']['output'];
  collections: Array<DataCloneCollection>;
  collectionsDone: Scalars['Int']['output'];
  collectionsTotal: Scalars['Int']['output'];
  currentCollection?: Maybe<Scalars['String']['output']>;
  documentsCopied: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  /** Collections this clone deliberately never copies (credentials, tokens, logs). */
  excluded: Array<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  sourceDatabase: Scalars['String']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  startedBy?: Maybe<Scalars['String']['output']>;
  /** RUNNING | SUCCEEDED | FAILED */
  status: Scalars['String']['output'];
  targetDatabase: Scalars['String']['output'];
};

/** Which end of a clone a saved connection is. There is exactly one of each. */
export type DataCloneRole =
  | 'PRODUCTION'
  | 'STAGING';

/** Both ends of a clone. A clone can only start when both are connected. */
export type DataCloneSettings = {
  __typename?: 'DataCloneSettings';
  production: DataCloneConnection;
  staging: DataCloneConnection;
};

/**
 * What a clone would read and write, resolved from the two saved connections.
 * The ready flag is false — with the reason in error — when either end is
 * missing or has never been proved, or when the target would resolve to the
 * source database.
 */
export type DataCloneTargets = {
  __typename?: 'DataCloneTargets';
  error?: Maybe<Scalars['String']['output']>;
  excluded: Array<Scalars['String']['output']>;
  ready: Scalars['Boolean']['output'];
  sourceDatabase: Scalars['String']['output'];
  targetDatabase: Scalars['String']['output'];
};

/**
 * One backup run. The archive itself never appears here — it is downloaded
 * through a short-lived signed link, never named by a URL this returns.
 */
export type DbBackup = {
  __typename?: 'DbBackup';
  /**
   * When the archive was TAKEN, read from its own header. Only an uploaded
   * archive carries one, and for those it is not startedAt — that is the day it
   * was sent here, this is the day the data is from.
   */
  archiveTakenAt?: Maybe<Scalars['String']['output']>;
  collections: Array<DbBackupCollection>;
  collectionsTotal: Scalars['Int']['output'];
  currentCollection?: Maybe<Scalars['String']['output']>;
  database: Scalars['String']['output'];
  documentsTotal: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  fileName?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  /** False once the archive is gone: pruned, deleted, or never written. */
  hasFile: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Uncompressed size, so the compression ratio is readable. */
  rawBytes: Scalars['Float']['output'];
  /** Compressed size on disk. */
  sizeBytes: Scalars['Float']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  /** Email of the operator who ran it; null for a scheduled run. */
  startedBy?: Maybe<Scalars['String']['output']>;
  /** RUNNING | SUCCEEDED | FAILED */
  status: Scalars['String']['output'];
  /**
   * SCHEDULED | MANUAL | UPLOADED. Only SCHEDULED archives are pruned by
   * retention. UPLOADED is an archive this server did not take — it was sent in
   * from an operator's machine and read end to end before it was allowed to
   * count as one.
   */
  trigger: Scalars['String']['output'];
};

/** What one collection contributed to an archive. */
export type DbBackupCollection = {
  __typename?: 'DbBackupCollection';
  /** Uncompressed BSON size of that collection's documents. */
  bytes: Scalars['Float']['output'];
  documents: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

/** A download good for a few minutes, for exactly one archive. */
export type DbBackupDownload = {
  __typename?: 'DbBackupDownload';
  expiresInSeconds: Scalars['Int']['output'];
  fileName: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

/**
 * The automatic backup schedule.
 *
 * timeOfDay is wall-clock time in the platform's configured timezone (Admin >
 * Settings), not the server's UTC — an operator picking 03:00 means their own
 * quiet hour.
 */
export type DbBackupSettings = {
  __typename?: 'DbBackupSettings';
  enabled: Scalars['Boolean']['output'];
  /** DAILY | WEEKLY */
  frequency: Scalars['String']['output'];
  /** How many SCHEDULED archives to keep. Manual backups are never pruned. */
  keepLast: Scalars['Int']['output'];
  lastRunAt?: Maybe<Scalars['String']['output']>;
  /**
   * The database a restore would REPLACE. Not part of the schedule: the page
   * needs it and this is the query it already makes. It is not the same as a
   * row's own database once an archive from somewhere else has been uploaded,
   * and the restore warning has to name the one being destroyed.
   */
  liveDatabase: Scalars['String']['output'];
  /** When the schedule next fires, or null when it is off. */
  nextRunAt?: Maybe<Scalars['String']['output']>;
  /** 24-hour HH:mm. */
  timeOfDay: Scalars['String']['output'];
  /**
   * The largest archive this server accepts in one upload, in bytes. The same
   * number nginx enforces, so the picker can refuse a file before spending
   * minutes sending it.
   */
  uploadMaxBytes: Scalars['Float']['output'];
  /** 0 = Sunday. Only meaningful when frequency is WEEKLY. */
  weekday: Scalars['Int']['output'];
};

export type DbBackupSettingsInput = {
  enabled: Scalars['Boolean']['input'];
  frequency: Scalars['String']['input'];
  keepLast: Scalars['Int']['input'];
  timeOfDay: Scalars['String']['input'];
  weekday: Scalars['Int']['input'];
};

export type DbBackupTablePage = {
  __typename?: 'DbBackupTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<DbBackup>;
  total: Scalars['Int']['output'];
};

/**
 * A single-use pass to POST one archive to the server's upload route.
 *
 * The browser cannot put its session header on a raw file POST, so the pass is
 * what authorises it. The row it belongs to already exists — RUNNING, and
 * pointing at the name the bytes must land on.
 */
export type DbBackupUploadPass = {
  __typename?: 'DbBackupUploadPass';
  backupId: Scalars['ID']['output'];
  ticket: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

/**
 * One restore run — the destructive direction. Every collection the archive
 * carries is dropped and rewritten, so anything written since it was taken is
 * gone.
 */
export type DbRestore = {
  __typename?: 'DbRestore';
  backupFile: Scalars['String']['output'];
  backupId: Scalars['ID']['output'];
  /** When the archive being restored was taken. */
  backupTakenAt?: Maybe<Scalars['String']['output']>;
  collections: Array<DbRestoreCollection>;
  collectionsTotal: Scalars['Int']['output'];
  currentCollection?: Maybe<Scalars['String']['output']>;
  documentsRestored: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /**
   * Collections a restore deliberately leaves alone: the backup rows, the
   * schedule and the restore rows themselves. Restoring those would delete the
   * row recording the restore while it is still being written to.
   */
  skipped: Array<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  startedBy?: Maybe<Scalars['String']['output']>;
  /** RUNNING | SUCCEEDED | FAILED */
  status: Scalars['String']['output'];
};

/** What one collection got back during a restore. */
export type DbRestoreCollection = {
  __typename?: 'DbRestoreCollection';
  documents: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
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
  /** Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill. */
  redeem_coins?: InputMaybe<Scalars['Int']['input']>;
  /** Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once. */
  seats?: InputMaybe<Scalars['Int']['input']>;
  selected_products?: InputMaybe<Array<CheckoutProductSelectionInput>>;
  /** Delivery address, required when any product ships. */
  shipping_address?: InputMaybe<OrderShippingAddressInput>;
  simulate_failure?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DummyGiftCardCheckoutInput = {
  amount: Scalars['Float']['input'];
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  recipient_email?: InputMaybe<Scalars['String']['input']>;
  recipient_name?: InputMaybe<Scalars['String']['input']>;
  scope_category_id?: InputMaybe<Scalars['ID']['input']>;
  scope_type: GiftCardScopeType;
  simulate_failure?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DummyProductCheckoutInput = {
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  coupon_code?: InputMaybe<Scalars['String']['input']>;
  delivery_pincode?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  items: Array<ProductCartItemInput>;
  /** Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill. */
  redeem_coins?: InputMaybe<Scalars['Int']['input']>;
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

/** Why an email is being sent. The nine fragments that ship map one-to-one onto these. */
export type EmailCategory =
  | 'authentication'
  | 'billing'
  | 'internal'
  | 'legal'
  | 'marketing'
  | 'notification'
  | 'service'
  | 'support'
  | 'transactional';

/**
 * The header and footer that wrap a template's body.
 *
 * Nine ship with Duncit, one per email category, and cannot be deleted — a
 * template that lost its header mid-flight would send bare. Beyond those an
 * admin adds their own and removes them again.
 */
export type EmailFragment = {
  __typename?: 'EmailFragment';
  /** Set for the nine that ship; null for one an admin added. */
  category?: Maybe<EmailCategory>;
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** MJML injected at the bottom of the template's mj-body. */
  footer_mjml: Scalars['String']['output'];
  fragment_id: Scalars['ID']['output'];
  /** MJML injected at the top of the template's mj-body. */
  header_mjml: Scalars['String']['output'];
  /** Off means templates naming it render without the wrap. */
  is_active: Scalars['Boolean']['output'];
  /** True for the nine. Editable and switchable, never deletable. */
  is_system: Scalars['Boolean']['output'];
  /** Stable, immutable identity. A template stores this. */
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/**
 * One attempt to send an email — including the ones that never left.
 *
 * A provider's dashboard can only show what reached it. The rows that matter
 * most here are the ones that did not: a switched-off template, a recipient with
 * no address, a refusal. Those have no other record anywhere.
 */
export type EmailLog = {
  __typename?: 'EmailLog';
  bcc: Array<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  cc: Array<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['String']['output']>;
  duration_ms: Scalars['Int']['output'];
  /** The header/footer fragment the template named, if any. */
  fragment_key?: Maybe<Scalars['String']['output']>;
  /**
   * The body exactly as it was handed to the provider.
   *
   * Only the single-row query fills this in — a page of campaign rows would
   * otherwise carry a megabyte of HTML nobody opened. Empty on the table.
   */
  html?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The provider's own id, for tracing a delivery complaint back to them. */
  message_id: Scalars['String']['output'];
  /** smtp, or none when it never left. Older rows may name a retired provider. */
  provider: Scalars['String']['output'];
  /** Why, in one line, whenever the status is not SENT. */
  reason: Scalars['String']['output'];
  /** Which surface caused it: SERVER, NATIVE, MWEB, WEBSITE, PORTAL, CRM, TEST. */
  source: Scalars['String']['output'];
  /** The exact host or portal, when known. */
  source_detail: Scalars['String']['output'];
  /** SENT, SKIPPED (deliberately not sent) or FAILED. */
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  /** The template slug, or empty for a raw-HTML send. */
  template: Scalars['String']['output'];
  to: Scalars['String']['output'];
  /** The variables it rendered with, as a JSON object. Single-row query only. */
  vars?: Maybe<Scalars['String']['output']>;
};

/** One bar: a grouping key and how many rows fell into it. */
export type EmailLogCountBucket = {
  __typename?: 'EmailLogCountBucket';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
};

/**
 * What the log says about deliverability over a window.
 *
 * Built to answer the question a provider's dashboard cannot: not "how many
 * did we send", but "who did not get theirs, and why".
 */
export type EmailLogDashboard = {
  __typename?: 'EmailLogDashboard';
  /** Rows in the window — one per send attempt. */
  attempts: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  /** Why the ones that did not go out did not go out, in fixed buckets. */
  not_delivered_reasons: Array<EmailLogCountBucket>;
  /** Which templates they belonged to. The empty key is a raw-HTML send. */
  not_delivered_templates: Array<EmailLogCountBucket>;
  /**
   * Accepted by the mail server with part of the batch refused.
   *
   * The row reads SENT and somebody in it still did not get the email.
   */
  partially_refused: Scalars['Int']['output'];
  range_days: Scalars['Int']['output'];
  /**
   * People addressed in the window, which is not the same as attempts.
   *
   * A campaign goes out as one row per batch with its audience in bcc, so one
   * attempt can be fifty recipients; the sending mailbox the row is addressed
   * to is not one of them.
   */
  recipients: Scalars['Int']['output'];
  repeat_failures: Array<EmailLogFailingAddress>;
  sent: Scalars['Int']['output'];
  /**
   * Sends that were accepted by nothing.
   *
   * With no provider entry configured the server falls back to a transport that
   * accepts every message and discards it, so the row reads SENT with an empty
   * rejection list. A sub-5ms handover is the only signature that leaves.
   */
  silently_discarded: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

/**
 * An address that failed more than once in the window.
 *
 * Nothing in this product receives bounce notifications, so an address that
 * keeps failing is the closest thing to a hard-bounce list that exists.
 */
export type EmailLogFailingAddress = {
  __typename?: 'EmailLogFailingAddress';
  address: Scalars['String']['output'];
  failures: Scalars['Int']['output'];
  last_failed_at?: Maybe<Scalars['String']['output']>;
  last_reason: Scalars['String']['output'];
};

/** Headline counts for the page's summary strip. */
export type EmailLogStats = {
  __typename?: 'EmailLogStats';
  /**
   * Every row ever kept, not just the window above.
   *
   * Approximate by design — it comes from collection metadata, and its only job
   * is to tell an operator the scale of what "delete everything" would remove.
   */
  all_time_total: Scalars['Int']['output'];
  days: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type EmailLogTablePage = {
  __typename?: 'EmailLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<EmailLog>;
  total: Scalars['Int']['output'];
};

export type EmailTemplate = {
  __typename?: 'EmailTemplate';
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** This template's own footer sentence. Blank uses the category's generic one. */
  footer_note?: Maybe<Scalars['String']['output']>;
  /** The key of the header/footer fragment wrapping this body. Null renders it bare. */
  fragment_key?: Maybe<Scalars['String']['output']>;
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

/**
 * How much use one template has seen, counted from this log.
 *
 * Derived rather than stored: the number is a link INTO the log, and a counter
 * on the template document would go on claiming 128 after the rows behind it
 * were deleted. Raw-HTML sends carry no slug and are not counted.
 */
export type EmailTemplateUsage = {
  __typename?: 'EmailTemplateUsage';
  /** Attempts that tried and failed. */
  failed: Scalars['Int']['output'];
  /** The most recent attempt of any status. */
  last_attempt_at?: Maybe<Scalars['String']['output']>;
  /**
   * When it last actually went out, or null for a template that never has.
   *
   * Null while total is non-zero is a real and important state: a template that
   * has only ever failed. It is not the same as never used.
   */
  last_sent_at?: Maybe<Scalars['String']['output']>;
  /** Attempts that actually went out. */
  sent: Scalars['Int']['output'];
  /** Attempts deliberately not sent — a disabled template, a suppressed address. */
  skipped: Scalars['Int']['output'];
  /** The template slug these rows carry. Matches EmailTemplate.slug. */
  slug: Scalars['String']['output'];
  /** Every attempt, whatever became of it. */
  total: Scalars['Int']['output'];
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

/**
 * What a one-time entity-id repair did.
 *
 * Every entity whose id is minted on insert (contracts, documents, policies …)
 * needs the same one-off pass for rows written before that id existed, and each
 * one answers the same single question: how many did it have to fix.
 */
export type EntityIdBackfillResult = {
  __typename?: 'EntityIdBackfillResult';
  repaired: Scalars['Int']['output'];
};

export type EnvCategory =
  | 'AISENSY'
  | 'EMAIL'
  | 'GEMINI'
  | 'GITHUB'
  | 'GOOGLE_MAPS'
  | 'GOOGLE_OAUTH'
  | 'IMAGEKIT'
  | 'OPENAI'
  | 'PEXELS'
  | 'RAZORPAY'
  | 'SERVAM'
  | 'SHIPROCKET'
  | 'SLACK'
  | 'TURN'
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

export type EnvConnectionTestInput = {
  /**
   * Where a provider whose only real credential check is a live send should
   * send it (today: AiSensy). Country code + number, digits only. Left blank,
   * the signed-in admin's own profile phone is used.
   */
  to?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The outcome of proving one entry's credentials against its vendor.
 *
 * The details list carries everything that is not the headline — granted
 * scopes, live-vs-test mode, how long a token lasts. Neither field ever
 * contains a credential; both are shown in the portal and kept in the
 * entry's test history.
 */
export type EnvConnectionTestResult = {
  __typename?: 'EnvConnectionTestResult';
  details: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
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

/**
 * What an import did. Entries are reported by name so an operator can see
 * which credentials were overwritten, and skipped names say what the file
 * asked for that this server does not have (an unknown category, or no name).
 */
export type EnvImportResult = {
  __typename?: 'EnvImportResult';
  created: Array<Scalars['String']['output']>;
  skipped: Array<Scalars['String']['output']>;
  updated: Array<Scalars['String']['output']>;
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
  /** People this ticket admits (its booking's seats). 1 for every legacy ticket. */
  seats: Scalars['Int']['output'];
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

/**
 * What an import did. Flags are reported by key so an operator can see which
 * features the file switched, and skipped keys say what the file asked for
 * that could not be applied (a flag with no key or no name).
 */
export type FeatureFlagImportResult = {
  __typename?: 'FeatureFlagImportResult';
  created: Array<Scalars['String']['output']>;
  skipped: Array<Scalars['String']['output']>;
  updated: Array<Scalars['String']['output']>;
};

/** Server-side table page for the shared table engine (featureFlagsTable). */
export type FeatureFlagTablePage = {
  __typename?: 'FeatureFlagTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<FeatureFlag>;
  total: Scalars['Int']['output'];
};

/**
 * One problem reported from the app through "Report a Problem".
 *
 * The row is the STORE OF RECORD. Slack is only a notification, which is why
 * slack_error exists: an announcement that never went out must be visible here
 * rather than costing the reporter their report.
 */
export type FeedbackReport = {
  __typename?: 'FeedbackReport';
  app_version: Scalars['String']['output'];
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  device_model: Scalars['String']['output'];
  /** What they were running it on — a report without the device cannot be reproduced. */
  device_os: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Screenshots the reporter attached. */
  media_urls: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  platform: Scalars['String']['output'];
  /** Permanent, human-readable id (DUN-RPT-000001). */
  report_no: Scalars['String']['output'];
  reporter_city: Scalars['String']['output'];
  reporter_locale: Scalars['String']['output'];
  /**
   * The reporter as they were WHEN they reported it — a snapshot, not a join.
   * Support reads these days later, by which time the account may have changed
   * phone, city or roles; user_id is still here for when the CURRENT state is
   * what matters instead.
   */
  reporter_phone: Scalars['String']['output'];
  reporter_roles: Array<Scalars['String']['output']>;
  /** Why the Slack announcement did not go out. Null when it did. */
  slack_error?: Maybe<Scalars['String']['output']>;
  /** Slack message timestamp when the announcement went out. */
  slack_ts?: Maybe<Scalars['String']['output']>;
  /** The screen they were on when they opened the form. */
  source_screen: Scalars['String']['output'];
  status: FeedbackStatus;
  updated_at: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  /** Null when the report arrived by email from an address with no account. */
  user_id?: Maybe<Scalars['ID']['output']>;
  user_name: Scalars['String']['output'];
};

export type FeedbackReportTablePage = {
  __typename?: 'FeedbackReportTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<FeedbackReport>;
  total: Scalars['Int']['output'];
};

export type FeedbackStatus =
  | 'CLOSED'
  | 'IN_REVIEW'
  | 'OPEN'
  | 'RESOLVED';

export type FinanceDashboardStats = {
  __typename?: 'FinanceDashboardStats';
  completed_payouts: FinanceStat;
  currency_symbol: Scalars['String']['output'];
  duncit_revenue: FinanceStat;
  gst_collected: FinanceStat;
  pending_payouts: FinanceStat;
  /** What Duncit itself spent to run pods (Finance > Pod Expenses). */
  pod_expenses: FinanceStat;
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
  /** Working days a refund takes to reach the customer, as quoted in every cancellation message. */
  refund_processing_days: Scalars['Int']['output'];
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

/** A pending ask to follow a PRIVATE profile. Answering it is what creates the follow. */
export type FollowRequest = {
  __typename?: 'FollowRequest';
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  requester: PublicProfile;
  status: Scalars['String']['output'];
};

/**
 * What the viewer's Follow button must render for this profile.
 * REQUESTED only ever happens on a PRIVATE profile — a public one goes
 * straight from NONE to FOLLOWING.
 */
export type FollowStatus =
  | 'FOLLOWING'
  | 'NONE'
  | 'REQUESTED';

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

/**
 * A purchased gift card. A bearer instrument: whoever holds the code holds the
 * value, which is what sharing it by email or link means. Redeeming converts the
 * whole balance into Duncit Coins in one act.
 */
export type GiftCard = {
  __typename?: 'GiftCard';
  /** Equals initial_amount until redeemed, then 0. */
  balance: Scalars['Float']['output'];
  /** Redemption code (XXXX-XXXX-XXXX-XXXX). */
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  expires_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  initial_amount: Scalars['Float']['output'];
  /** Personal note printed on the card and in the email. */
  message: Scalars['String']['output'];
  recipient_email: Scalars['String']['output'];
  recipient_name: Scalars['String']['output'];
  redeemed: Scalars['Boolean']['output'];
  redeemed_at?: Maybe<Scalars['String']['output']>;
  scope_category_id?: Maybe<Scalars['ID']['output']>;
  /** The back face of the card artwork. Empty when the category ships none. */
  scope_image_back_url: Scalars['String']['output'];
  /**
   * The category's card artwork, frozen at purchase — the front face. Empty when
   * the category ships none, and the client then draws its gradient card.
   */
  scope_image_front_url: Scalars['String']['output'];
  scope_image_url: Scalars['String']['output'];
  /** Snapshot of the category name — empty for SHOP cards (clients localize it). */
  scope_name: Scalars['String']['output'];
  scope_type: GiftCardScopeType;
  /** The buyer's name — filled on the code-lookup view so the claim page can say who sent it. */
  sender_name?: Maybe<Scalars['String']['output']>;
  status: GiftCardStatus;
};

/** One card of the book, joined with who bought it and who redeemed it. */
export type GiftCardAdminCard = {
  __typename?: 'GiftCardAdminCard';
  balance: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  expires_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  initial_amount: Scalars['Float']['output'];
  message: Scalars['String']['output'];
  /** The purchase payment's business id. */
  payment_id: Scalars['String']['output'];
  purchaser_email: Scalars['String']['output'];
  purchaser_name: Scalars['String']['output'];
  recipient_email: Scalars['String']['output'];
  recipient_name: Scalars['String']['output'];
  redeemed: Scalars['Boolean']['output'];
  redeemed_at?: Maybe<Scalars['String']['output']>;
  redeemer_email: Scalars['String']['output'];
  redeemer_name: Scalars['String']['output'];
  scope_category_id?: Maybe<Scalars['ID']['output']>;
  scope_image_back_url: Scalars['String']['output'];
  scope_image_front_url: Scalars['String']['output'];
  scope_image_url: Scalars['String']['output'];
  scope_name: Scalars['String']['output'];
  scope_type: GiftCardScopeType;
  status: GiftCardStatus;
};

/** Server-side table page for the shared table engine (giftCardsTable). */
export type GiftCardAdminCardTablePage = {
  __typename?: 'GiftCardAdminCardTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<GiftCardAdminCard>;
  total: Scalars['Int']['output'];
};

/**
 * Platform-wide gift card position for Finance > Gift Cards > Dashboard.
 * Outstanding + expired + redeemed value always equals sold value.
 */
export type GiftCardAdminStats = {
  __typename?: 'GiftCardAdminStats';
  currency_symbol: Scalars['String']['output'];
  /** Value on cards that expired unredeemed — breakage. */
  expired_value: Scalars['Float']['output'];
  /** Oldest first, one entry per calendar month, empty months filled with zeroes. */
  monthly: Array<GiftCardMonthBucket>;
  /** Value still sitting on live, unexpired cards — the platform's liability. */
  outstanding_value: Scalars['Float']['output'];
  /** Cards converted to coins. */
  redeemed_count: Scalars['Int']['output'];
  /** Value converted to coins — the sum of all REDEEM rows. */
  redeemed_value: Scalars['Float']['output'];
  /** Cards ever sold. */
  sold_count: Scalars['Int']['output'];
  /** Value ever sold — the sum of all ISSUE rows. */
  sold_value: Scalars['Float']['output'];
  /** Months a card currently lives from purchase. */
  validity_months: Scalars['Int']['output'];
};

/** One row of the gift card ledger — insert-only, newest first. */
export type GiftCardAdminTransaction = {
  __typename?: 'GiftCardAdminTransaction';
  amount: Scalars['Float']['output'];
  balance_after: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  gift_card_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** The purchase payment on ISSUE rows. */
  payment_id?: Maybe<Scalars['String']['output']>;
  /** PURCHASE or REDEEM_TO_COINS. */
  source: Scalars['String']['output'];
  /** ISSUE or REDEEM. */
  type: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  /** The purchaser on ISSUE rows, the redeemer on REDEEM rows. */
  user_name: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (giftCardTransactionsTable). */
export type GiftCardAdminTransactionTablePage = {
  __typename?: 'GiftCardAdminTransactionTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<GiftCardAdminTransaction>;
  total: Scalars['Int']['output'];
};

/**
 * Buying a gift card. The card is charged at face value (no fee, no GST — tax
 * applies when the goods are bought), and coupons/coins are deliberately not
 * accepted: stored value must not buy stored value. The card itself is created
 * only on payment success.
 */
export type GiftCardCheckoutInput = {
  /** Face value in whole rupees, within the configured min/max. */
  amount: Scalars['Float']['input'];
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  /** Personal note printed on the card and in the email. */
  message?: InputMaybe<Scalars['String']['input']>;
  /** Who the card is for. Empty means the buyer keeps it. */
  recipient_email?: InputMaybe<Scalars['String']['input']>;
  recipient_name?: InputMaybe<Scalars['String']['input']>;
  scope_category_id?: InputMaybe<Scalars['ID']['input']>;
  /** The card's theme. SUPER/CATEGORY/SUB need scope_category_id; SHOP must not send one. */
  scope_type: GiftCardScopeType;
};

/** One calendar month of gift card flow. The client formats the label from the key. */
export type GiftCardMonthBucket = {
  __typename?: 'GiftCardMonthBucket';
  /** Calendar month as a 'YYYY-MM' key, in UTC. */
  month: Scalars['String']['output'];
  redeemed: Scalars['Float']['output'];
  sold: Scalars['Float']['output'];
};

/** What redeeming a card left behind: the coins minted and the new balance. */
export type GiftCardRedeemResult = {
  __typename?: 'GiftCardRedeemResult';
  card: GiftCard;
  /** The caller's Duncit Coin balance after the credit. */
  coin_balance: Scalars['Float']['output'];
  /** Coins credited by THIS call — 0 when the card had already paid out. */
  coins_added: Scalars['Float']['output'];
};

/**
 * The card's theme — what it was bought "for". SUPER/CATEGORY/SUB reference one
 * category of that level; SHOP is the global Pod Shop. The scope decides the
 * card's design and title, not where the value can be spent: redeeming converts
 * the full value into Duncit Coins.
 */
export type GiftCardScopeType =
  | 'CATEGORY'
  | 'SHOP'
  | 'SUB'
  | 'SUPER';

/** The gift card sales policy (Finance > Gift Cards). */
export type GiftCardSettings = {
  __typename?: 'GiftCardSettings';
  /** Preset amount chips the buy page offers. */
  denominations: Array<Scalars['Int']['output']>;
  max_amount: Scalars['Int']['output'];
  /** Bounds for a custom amount (whole rupees). */
  min_amount: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  /** Months from purchase until a card expires. */
  validity_months: Scalars['Int']['output'];
};

/** Every field is optional; an omitted one is left alone. */
export type GiftCardSettingsInput = {
  denominations?: InputMaybe<Array<Scalars['Int']['input']>>;
  max_amount?: InputMaybe<Scalars['Int']['input']>;
  min_amount?: InputMaybe<Scalars['Int']['input']>;
  validity_months?: InputMaybe<Scalars['Int']['input']>;
};

/** EXPIRED is derived from the expiry date at read time. */
export type GiftCardStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REDEEMED';

export type GoogleAuthInput = {
  id_token: Scalars['String']['input'];
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type GoogleSignupInput = {
  /**
   * Every policy the person ticked in the acceptance dialog.
   *
   * This mutation is new-account-only, so the SAME dialog runs after Google
   * returns its id_token and the mutation is only called once everything is
   * accepted — no second route, no post-signup screen. Re-verified here too.
   */
  accepted_policy_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Which app they accepted in. Recorded on every acceptance row. */
  accepted_policy_surface?: InputMaybe<PolicyAcceptanceSurface>;
  city?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  id_token: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The Grievance Officer Duncit publishes.
 *
 * Readable by anyone — publishing these details is the whole purpose of the
 * record, so the app, the website and the acknowledgement email all quote the
 * same one instead of keeping copies.
 */
export type GrievanceOfficer = {
  __typename?: 'GrievanceOfficer';
  /** Optional. */
  address: Scalars['String']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** Which surface the grievance was raised from. */
export type GrievanceSource =
  | 'APP'
  /** Arrived in a mailbox connected under Mail Automation. */
  | 'EMAIL'
  | 'PORTAL'
  | 'WEBSITE';

export type GrievanceStats = {
  __typename?: 'GrievanceStats';
  by_status: Array<GrievanceStatusCount>;
  total: Scalars['Int']['output'];
};

export type GrievanceStatus =
  | 'IN_REVIEW'
  | 'RECEIVED'
  | 'REJECTED'
  | 'RESOLVED';

export type GrievanceStatusCount = {
  __typename?: 'GrievanceStatusCount';
  count: Scalars['Int']['output'];
  status: GrievanceStatus;
};

export type GrievanceTicket = {
  __typename?: 'GrievanceTicket';
  /** Optional — a grievance is answerable without a postal address. */
  address: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  email: Scalars['String']['output'];
  /** Permanent, globally unique handle (GRV-000001). Never edited, never reused. */
  grievance_no: Scalars['String']['output'];
  handled_by_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  /** What the legal team did about it. Staff-only. */
  resolution: Scalars['String']['output'];
  resolved_at?: Maybe<Scalars['String']['output']>;
  source: GrievanceSource;
  status: GrievanceStatus;
  subject: Scalars['String']['output'];
  /**
   * The support ticket this grievance escalates (ST-/CB-/CH-/SOS-).
   *
   * Blank means the complainant reached the officer without going through
   * support first — the ground the officer rejects on.
   */
  support_ticket_ref: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type GrievanceTicketTablePage = {
  __typename?: 'GrievanceTicketTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<GrievanceTicket>;
  total: Scalars['Int']['output'];
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
  /**
   * The Super → Category → Sub this applicant picked in their "Earn with
   * Duncit" onboarding survey, read back from their onboarding meeting.
   * Resolved on demand (never selected by the list queries) so the Review Host
   * dialog can prefill the picker even when the pick was never copied onto
   * host_categories — meetings approved before that seeding existed, partial
   * triples, and hosts onboarded outside the meeting flow all leave it empty.
   * Null when they never booked a meeting or the taxonomy has since changed.
   */
  survey_category?: Maybe<HostCategory>;
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

/**
 * Club-admin contact card ("Need help?"). Carries PII, so it is only ever
 * served through hostPodPendingView (pod hosts / co-hosts).
 */
export type HostPodPendingClubAdmin = {
  __typename?: 'HostPodPendingClubAdmin';
  email?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Dialable number with its extension when stored (e.g. "+91 9876543210"). */
  phone?: Maybe<Scalars['String']['output']>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  /**
   * WhatsApp number with its extension — the client strips non-digits to build
   * the wa.me link. Null when the admin has no WhatsApp number on file.
   */
  whatsapp?: Maybe<Scalars['String']['output']>;
};

/**
 * Venue contact card for the host's post-create waiting screen. Carries PII, so
 * it is only ever served through hostPodPendingView (pod hosts / co-hosts).
 */
export type HostPodPendingVenue = {
  __typename?: 'HostPodPendingVenue';
  /**
   * Single-line postal address (line1, line2, locality, city, state, pincode,
   * country — blanks skipped). Null when the venue has no address on file.
   */
  address?: Maybe<Scalars['String']['output']>;
  /**
   * The venue owner — the person who decides the slot request. Null when the
   * venue has no owner name on file.
   */
  contact_person?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  /** Latitude for the 'View on Map' link. Null when the venue is not geocoded. */
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  /** Dialable number as stored on the venue (no extension is collected for it). */
  phone?: Maybe<Scalars['String']['output']>;
  venue_id: Scalars['ID']['output'];
  venue_name: Scalars['String']['output'];
};

/**
 * Everything the post-create waiting screen renders. The venue's decision is
 * pod.venue_approval_status — the query works at ANY approval status so the
 * screen can poll and flip once the venue approves or declines.
 */
export type HostPodPendingView = {
  __typename?: 'HostPodPendingView';
  /** The pod's club category name (empty when the club has none). */
  category_name: Scalars['String']['output'];
  /** The club's first assigned admin. Null when the club has none. */
  club_admin?: Maybe<HostPodPendingClubAdmin>;
  currency_symbol: Scalars['String']['output'];
  /**
   * Projected host payout for this pod — the earnings waterfall's
   * host_receives, billed on payable spots (total - 1, host's seat is free).
   */
  expected_earnings: Scalars['Float']['output'];
  /** The pod itself, in the same public shape as the pod query. */
  pod: Pod;
  /** Null for virtual pods and location-only pods (no venue attached). */
  venue?: Maybe<HostPodPendingVenue>;
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

/** Full edit + resubmission of a venue-rejected (DECLINED) pod. Booking state, hosts and club stay server-managed. */
export type HostResubmitPodInput = {
  available_perks?: InputMaybe<Array<Scalars['String']['input']>>;
  location_id?: InputMaybe<Scalars['ID']['input']>;
  meeting_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_platform?: InputMaybe<Scalars['String']['input']>;
  meeting_url?: InputMaybe<Scalars['String']['input']>;
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  payment_terms?: InputMaybe<Scalars['String']['input']>;
  place_charges?: InputMaybe<Array<PodPlaceChargeInput>>;
  pod_amount?: InputMaybe<Scalars['Int']['input']>;
  pod_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_description?: InputMaybe<Scalars['String']['input']>;
  pod_end_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
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
  /** A fresh slot to request — re-enters the venue's approval queue. */
  venue_slot_id?: InputMaybe<Scalars['ID']['input']>;
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
  zone_name?: InputMaybe<Scalars['String']['input']>;
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

export type HostTicketScanResult = {
  __typename?: 'HostTicketScanResult';
  /** True when the ticket had already been checked in before this scan. */
  already_checked_in: Scalars['Boolean']['output'];
  attendee?: Maybe<ScannedAttendee>;
  /** The other people on this booking, once recorded. */
  companions: Array<PodCompanion>;
  /** How many more people still need a name and phone number (0 when none do). */
  companions_required: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  /**
   * True when this ticket admits more people than the buyer and their details
   * have not been recorded yet. The ticket is NOT checked in — scan again with
   * the companions argument filled to mark the group present.
   */
  requires_companions: Scalars['Boolean']['output'];
  ticket?: Maybe<EventTicket>;
};

/** The only fields a host may edit on their own pod. */
export type HostUpdatePodInput = {
  /**
   * A bigger pod. Only ever upwards for a host, and never past the capacity of
   * the space the pod booked — omit it to leave the capacity alone.
   */
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  pod_description: Scalars['String']['input'];
  pod_images_and_videos: Array<PodMediaInput>;
  pod_title: Scalars['String']['input'];
  reel_url?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Where to send a file, and the one-shot pass that lets you.
 *
 * Files go to ImageKit THROUGH the server, on the private key alone. A browser
 * cannot sign an ImageKit upload, and the signed-from-the-browser scheme only
 * works while the public and private keys are a matched pair — a mismatched pair
 * rejects every upload and names no cause.
 */
export type ImagekitAuth = {
  __typename?: 'ImagekitAuth';
  /** Single use, ten minutes. It also fixes which folder the file lands in. */
  ticket: Scalars['String']['output'];
  /** POST the raw file here, with the ticket and fileName on the query string. */
  uploadUrl: Scalars['String']['output'];
  /** The CDN base callers render from. */
  urlEndpoint: Scalars['String']['output'];
};

/**
 * One entry from an exported JSON file. There is no id: an export is moved
 * BETWEEN environments, where ids mean nothing, so an entry is matched on the
 * pair that names it — its category and its name.
 */
export type ImportEnvEntryInput = {
  assigned_portals?: InputMaybe<Array<Scalars['String']['input']>>;
  category: EnvCategory;
  config: Array<EnvConfigPairInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

/**
 * One flag from an exported JSON file. There is no id: an export is moved
 * BETWEEN environments, where ids mean nothing, so a flag is matched on the
 * thing that names it — its key.
 */
export type ImportFeatureFlagInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
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
  /** Line subtotal (qty x unit price) at/above which this product's delivery is free. null = no offer. */
  free_delivery_above?: Maybe<Scalars['Float']['output']>;
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
  /** Duncit warehouse (BrandPickupLocation, owner_kind DUNCIT) this product ships from. Required for Duncit-owned products. */
  pickup_location_id?: Maybe<Scalars['ID']['output']>;
  pod_available: Scalars['Boolean']['output'];
  /** Units currently available across all live pods stocking this product (0 = out of stock in pods). Only meaningful on the Pod Shop list. */
  pod_available_count: Scalars['Int']['output'];
  product_name: Scalars['String']['output'];
  product_type: ProductType;
  purchase_price: Scalars['Float']['output'];
  requested_count: Scalars['Int']['output'];
  reserved_count: Scalars['Int']['output'];
  /** Aggregate rating for the Pod Shop catalogue card (average + count + star split). */
  review_summary: ProductReviewSummary;
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
  free_delivery_above?: InputMaybe<Scalars['Float']['input']>;
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
  /** Duncit warehouse (owner_kind DUNCIT) origin. Required for Duncit-owned products (enforced server-side). */
  pickup_location_id?: InputMaybe<Scalars['ID']['input']>;
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

/** One points ledger row joined to its user and pod, for Admin > Leaderboard. */
export type LeaderboardAdminPoint = {
  __typename?: 'LeaderboardAdminPoint';
  category: LeaderboardCategory;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  pod_id?: Maybe<Scalars['ID']['output']>;
  pod_title: Scalars['String']['output'];
  points: Scalars['Float']['output'];
  /** Business key of the earning event — pod id, or order:product:variant. */
  source_id: Scalars['String']['output'];
  source_type: Scalars['String']['output'];
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  user_name: Scalars['String']['output'];
};

/** Server-side table page for the shared table engine (leaderboardPointsTable). */
export type LeaderboardAdminPointTablePage = {
  __typename?: 'LeaderboardAdminPointTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<LeaderboardAdminPoint>;
  total: Scalars['Int']['output'];
};

/** One board ranked over one window, with the caller's own position. */
export type LeaderboardBoard = {
  __typename?: 'LeaderboardBoard';
  category: LeaderboardCategory;
  /** The caller's points in this window — 0 when they have none yet. */
  my_points: Scalars['Float']['output'];
  /** The caller's 1-based rank. Null until they hold points in this window. */
  my_rank?: Maybe<Scalars['Int']['output']>;
  /** Distinct users holding at least one point in this window. */
  participants: Scalars['Int']['output'];
  period: LeaderboardPeriod;
  /** Top rows, best first. Rank counts everyone, not just this page. */
  rows: Array<LeaderboardEntry>;
};

/** The five boards. Each ranks a different way of showing up for the platform. */
export type LeaderboardCategory =
  | 'BRAND'
  | 'CLUB_ADMIN'
  | 'HOST'
  | 'USER'
  | 'VENUE';

/** One headline card per board for Admin > Leaderboard > Boards. */
export type LeaderboardCategoryStats = {
  __typename?: 'LeaderboardCategoryStats';
  /** Ledger rows written on this board. */
  awards_count: Scalars['Int']['output'];
  category: LeaderboardCategory;
  /** Distinct users holding at least one point on this board. */
  participants: Scalars['Int']['output'];
  /** Every point ever granted on this board. */
  total_points: Scalars['Float']['output'];
};

/**
 * Points-per-action plus the reward list. The apps render "How to increase
 * your points" and the rewards showcase from this, so changing a number in
 * Admin > Leaderboard changes what every surface promises — no client release.
 */
export type LeaderboardConfig = {
  __typename?: 'LeaderboardConfig';
  /** Points a club admin earns when a pod of their club completes. */
  points_per_club_pod: Scalars['Float']['output'];
  /** Points a host earns when their pod completes. */
  points_per_host: Scalars['Float']['output'];
  /** Points a member earns for each successful pod join. */
  points_per_join: Scalars['Float']['output'];
  /** Points a brand owner earns per product sold. */
  points_per_product_sale: Scalars['Float']['output'];
  /** Points a venue owner earns when a pod completes at their venue. */
  points_per_venue_pod: Scalars['Float']['output'];
  /** Active rewards only, in display order. */
  rewards: Array<LeaderboardReward>;
};

/** One ranked row of a board. */
export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  avatar_url: Scalars['String']['output'];
  /** True when this row is the caller. */
  is_me: Scalars['Boolean']['output'];
  /** Display name from the profile. May be empty for a deleted account. */
  name: Scalars['String']['output'];
  points: Scalars['Float']['output'];
  rank: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
};

/** Ranking window. MONTH and YEAR are the current calendar window, in UTC. */
export type LeaderboardPeriod =
  | 'ALL'
  | 'MONTH'
  | 'YEAR';

/** A prize the admin promises for finishing a window inside a rank range. */
export type LeaderboardReward = {
  __typename?: 'LeaderboardReward';
  category: LeaderboardCategory;
  description: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  period: LeaderboardRewardPeriod;
  rank_from: Scalars['Int']['output'];
  rank_to: Scalars['Int']['output'];
  sort_order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type LeaderboardRewardInput = {
  category: LeaderboardCategory;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  period: LeaderboardRewardPeriod;
  rank_from: Scalars['Int']['input'];
  rank_to: Scalars['Int']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

/** When a reward's window closes and it is handed out. */
export type LeaderboardRewardPeriod =
  | 'MONTHLY'
  | 'YEARLY';

/** The admin view of the settings singleton — every reward, active or not. */
export type LeaderboardSettings = {
  __typename?: 'LeaderboardSettings';
  points_per_club_pod: Scalars['Float']['output'];
  points_per_host: Scalars['Float']['output'];
  points_per_join: Scalars['Float']['output'];
  points_per_product_sale: Scalars['Float']['output'];
  points_per_venue_pod: Scalars['Float']['output'];
  rewards: Array<LeaderboardReward>;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type LegalDocument = {
  __typename?: 'LegalDocument';
  content: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  created_by_name: Scalars['String']['output'];
  description: Scalars['String']['output'];
  /** Permanent, globally unique handle (DOC-000001). Never edited, never reused. */
  document_no: Scalars['String']['output'];
  document_type: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Off hides the document from the app without deleting it. */
  is_active: Scalars['Boolean']['output'];
  /** A signed contract is closed to edits — the lock IS the signature. */
  is_locked: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  signatories: Array<LegalDocumentSignatory>;
  signed_at?: Maybe<Scalars['String']['output']>;
  /** UNSIGNED until every required signatory has signed, then SIGNED. */
  signing_status: SigningStatus;
  updated_at: Scalars['String']['output'];
  updated_by_name: Scalars['String']['output'];
  version_count: Scalars['Int']['output'];
  versions: Array<LegalDocumentVersion>;
};

export type LegalDocumentFilterInput = {
  document_type?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** One person who must sign, and their signature once they have. */
export type LegalDocumentSignatory = {
  __typename?: 'LegalDocumentSignatory';
  designation: Scalars['String']['output'];
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  initials: Scalars['String']['output'];
  /** A data URL for a drawn or typed signature, or the uploaded image URL. */
  signature_image: Scalars['String']['output'];
  signature_method?: Maybe<SignatureMethod>;
  signed_at?: Maybe<Scalars['String']['output']>;
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

/**
 * The public slice of an entity that a link-preview card renders: a title, a
 * short plain-text description and one image. Nothing else ever crosses this
 * boundary — no contact, finance or membership data.
 */
export type LinkPreview = {
  __typename?: 'LinkPreview';
  /**
   * The address this entity should be indexed under, when that is not
   * necessarily the address the request came in on.
   *
   * A profile is reachable both as /u/<handle> and as /u/<id> — the same
   * page at two URLs, which is duplicate content until one of them names the
   * other as canonical. Null means "the requested path is already canonical".
   */
  canonical_path?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  image_url?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** Which kind of page a shared mWeb link points at. */
export type LinkPreviewKind =
  | 'CLUB'
  | 'POD'
  | 'POST'
  | 'PRODUCT'
  | 'USER'
  | 'VENUE';

/** A language/country the platform can render in. */
export type Locale = {
  __typename?: 'Locale';
  /** BCP-47 tag — the stable id used everywhere, including profile.locale. */
  code: Scalars['String']['output'];
  english_label: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  /** The source language every other locale falls back to. Exactly one. */
  is_default: Scalars['Boolean']['output'];
  /** Right-to-left script — flips document direction on the clients. */
  is_rtl: Scalars['Boolean']['output'];
  /** Endonym shown in the language switcher. */
  label: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
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
  /**
   * Which of the two the password is being proved against. Defaults to EMAIL, so
   * every portal and shipped app build that posts a bare email + password keeps
   * working untouched.
   */
  channel?: InputMaybe<PasswordResetChannel>;
  /** Required when channel is EMAIL. */
  email?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  /** Required, with the extension, when channel is PHONE. */
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type LoginWithOtpInput = {
  channel: PasswordResetChannel;
  email?: InputMaybe<Scalars['String']['input']>;
  otp: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A Gmail mailbox that answers itself.
 *
 * Connected in the Tech portal (credentials), governed from the Support portal
 * (what it says and what it opens). The first message on a conversation gets a
 * ticket and one acknowledgement; every reply after that on the same thread is
 * left alone for a human.
 */
export type MailAutomationAccount = {
  __typename?: 'MailAutomationAccount';
  /** Let OpenAI rewrite the template into a reply to the actual email, at send time. */
  ai_enabled: Scalars['Boolean']['output'];
  connected_at: Scalars['String']['output'];
  display_name: Scalars['String']['output'];
  /** The connected mailbox address. */
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Whether the automation is running for this mailbox. Pausing is not disconnecting. */
  is_active: Scalars['Boolean']['output'];
  /** False once the Google grant is gone — reconnect from the Tech portal. */
  is_connected: Scalars['Boolean']['output'];
  /** Why the last poll failed, or '' when it did not. */
  last_error: Scalars['String']['output'];
  last_polled_at?: Maybe<Scalars['String']['output']>;
  /** Step 2 — what every first message gets back. Must contain {{ticket_no}}. */
  reply_template: Scalars['String']['output'];
  /** The response window as the reply words it — for example, 24-48 hours. */
  sla_label: Scalars['String']['output'];
  sla_max_hours: Scalars['Int']['output'];
  sla_min_hours: Scalars['Int']['output'];
  ticket_type: MailTicketType;
};

/** What a sender would actually receive, composed from the saved rule. */
export type MailAutomationPreview = {
  __typename?: 'MailAutomationPreview';
  by_ai: Scalars['Boolean']['output'];
  text: Scalars['String']['output'];
};

export type MailAutomationRuleInput = {
  ai_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  /** Pause or resume the automation without giving up the Google grant. */
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  reply_template?: InputMaybe<Scalars['String']['input']>;
  sla_max_hours?: InputMaybe<Scalars['Int']['input']>;
  sla_min_hours?: InputMaybe<Scalars['Int']['input']>;
  ticket_type?: InputMaybe<MailTicketType>;
};

/** One conversation the automation has already answered. */
export type MailAutomationThread = {
  __typename?: 'MailAutomationThread';
  created_at: Scalars['String']['output'];
  from_email: Scalars['String']['output'];
  from_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** When the acknowledgement went out. Null means the ticket exists but the reply did not send. */
  replied_at?: Maybe<Scalars['String']['output']>;
  /** True when OpenAI wrote the body; false when the operator's template went as written. */
  reply_by_ai: Scalars['Boolean']['output'];
  reply_error: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  /** The reference quoted back to the sender, e.g. ST-A1B2C3 or GRV-000012. */
  ticket_no: Scalars['String']['output'];
  ticket_type: MailTicketType;
};

/** Everything one address receives, and what it has opted out of. */
export type MailPreference = {
  __typename?: 'MailPreference';
  categories: Array<MailPreferenceCategory>;
  email: Scalars['String']['output'];
  /** When the person last changed anything. Null if they never have. */
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** What the opt-out log says about reach. */
export type MailPreferenceAnalytics = {
  __typename?: 'MailPreferenceAnalytics';
  by_category: Array<MailPreferenceCategoryStat>;
  /** Which surface the changes were made from. */
  by_source: Array<MailPreferenceBucket>;
  opt_ins: Scalars['Int']['output'];
  opt_outs: Scalars['Int']['output'];
  /** Addresses refusing at least one category. */
  people_opted_out: Scalars['Int']['output'];
  /**
   * Addresses refusing every category they are allowed to refuse.
   *
   * Counted apart from the number above because it is a different kind of loss:
   * one category off still leaves somebody reachable, all of them off does not.
   */
  people_opted_out_all: Scalars['Int']['output'];
  range_days: Scalars['Int']['output'];
};

export type MailPreferenceBucket = {
  __typename?: 'MailPreferenceBucket';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
};

/**
 * One kind of email, and whether this person still wants it.
 *
 * There is no label or description here on purpose: the copy is localized and
 * lives in the client bundles (rule 38), so the server ships the KEY and the
 * screen decides what it says in the reader's language.
 */
export type MailPreferenceCategory = {
  __typename?: 'MailPreferenceCategory';
  /** The email category — marketing, notification, authentication, and so on. */
  category: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  /**
   * Sent whatever this says.
   *
   * Codes, receipts and notices we are obliged to send. The screen renders these
   * locked rather than hiding them: "you will always get your OTP" is the answer
   * to a question people actually have.
   */
  required: Scalars['Boolean']['output'];
};

/** One category's standing, now and over the window. */
export type MailPreferenceCategoryStat = {
  __typename?: 'MailPreferenceCategoryStat';
  category: Scalars['String']['output'];
  /** People who came back inside the window. */
  opt_ins: Scalars['Int']['output'];
  /** Opt-outs inside the window. */
  opt_outs: Scalars['Int']['output'];
  /** Addresses currently refusing this category. */
  opted_out_now: Scalars['Int']['output'];
};

/** One change to one category — the row the Marketing analytics table lists. */
export type MailPreferenceLog = {
  __typename?: 'MailPreferenceLog';
  category: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  /** true = they opted back in, false = they opted out. */
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Where the change was made: MWEB, NATIVE, WEBSITE, PORTAL or SERVER. */
  source: Scalars['String']['output'];
  source_detail: Scalars['String']['output'];
  user_id?: Maybe<Scalars['ID']['output']>;
  /** The account behind the address, when there is one. Empty for a contact. */
  user_name: Scalars['String']['output'];
};

export type MailPreferenceLogTablePage = {
  __typename?: 'MailPreferenceLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<MailPreferenceLog>;
  total: Scalars['Int']['output'];
};

/**
 * Which queue an inbound email opens a record in. Chosen per mailbox in the
 * Support portal — step 3 of the wizard.
 */
export type MailTicketType =
  /** A grievance — a legal filing with a redressal clock on it. */
  | 'GRIEVANCE'
  /** A Report a Problem entry, triaged like an in-app bug report. */
  | 'REPORT_PROBLEM'
  /** A support ticket, the ordinary conversation queue. */
  | 'SUPPORT';

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
  /** AUDIENCE_LIST audience only — recipients are recomputed at send time. */
  audience_list_id?: Maybe<Scalars['ID']['output']>;
  campaign_id: Scalars['ID']['output'];
  card?: Maybe<MarketingCampaignCard>;
  channel: MarketingCampaignChannel;
  /** Times a tracked link in the email was followed. */
  click_count: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  delivery?: Maybe<CampaignDelivery>;
  error?: Maybe<Scalars['String']['output']>;
  /** First evidence anyone opened it — pixel, image load or click. */
  first_opened_at?: Maybe<Scalars['String']['output']>;
  /** Times an image in the email was fetched. Survives a blocked pixel. */
  image_load_count: Scalars['Int']['output'];
  last_opened_at?: Maybe<Scalars['String']['output']>;
  mjml: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Times the open pixel loaded — a total, not a headcount. */
  open_count: Scalars['Int']['output'];
  recipient_count: Scalars['Int']['output'];
  rendered_html?: Maybe<Scalars['String']['output']>;
  scheduled_at?: Maybe<Scalars['String']['output']>;
  sent_at?: Maybe<Scalars['String']['output']>;
  status: MarketingCampaignStatus;
  subject: Scalars['String']['output'];
  tracked_images: Array<TrackedImage>;
  tracked_links: Array<TrackedLink>;
  updated_at: Scalars['String']['output'];
};

export type MarketingCampaignAudience =
  | 'ALL_USERS'
  /** Everybody currently matching a saved audience list. */
  | 'AUDIENCE_LIST'
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

/** Email is the only campaign channel; WhatsApp campaigns were removed. */
export type MarketingCampaignChannel =
  | 'EMAIL';

export type MarketingCampaignInput = {
  audience: MarketingCampaignAudience;
  /** Required when audience is AUDIENCE_LIST. */
  audience_list_id?: InputMaybe<Scalars['ID']['input']>;
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

/** A placeholder a campaign may use, e.g. {{app_name}}. */
export type MarketingCampaignVariable = {
  __typename?: 'MarketingCampaignVariable';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** What this variable renders to right now. */
  sample: Scalars['String']['output'];
};

/** Everything the Marketing console opens on, in one round trip. */
export type MarketingDashboard = {
  __typename?: 'MarketingDashboard';
  ads: MarketingDashboardAds;
  audience: MarketingDashboardAudience;
  campaigns: MarketingDashboardCampaigns;
  /** The window the activity figures cover, in days. */
  days: Scalars['Int']['output'];
  links: MarketingDashboardLinks;
};

export type MarketingDashboardAds = {
  __typename?: 'MarketingDashboardAds';
  live: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
};

export type MarketingDashboardAudience = {
  __typename?: 'MarketingDashboardAudience';
  lists: Scalars['Int']['output'];
};

export type MarketingDashboardCampaigns = {
  __typename?: 'MarketingDashboardCampaigns';
  click_rate: Scalars['Float']['output'];
  clicks: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  open_rate: Scalars['Float']['output'];
  opens: Scalars['Int']['output'];
  recent: Array<MarketingDashboardRecentCampaign>;
  recipients: Scalars['Int']['output'];
  scheduled: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
};

export type MarketingDashboardDaily = {
  __typename?: 'MarketingDashboardDaily';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type MarketingDashboardLinks = {
  __typename?: 'MarketingDashboardLinks';
  /** Links accepting traffic right now. */
  active: Scalars['Int']['output'];
  conversion_rate: Scalars['Float']['output'];
  conversions: Scalars['Int']['output'];
  countries: Array<MarketingDashboardPoint>;
  daily: Array<MarketingDashboardDaily>;
  platforms: Array<MarketingDashboardPoint>;
  revenue: Scalars['Float']['output'];
  top: Array<MarketingDashboardTopLink>;
  total: Scalars['Int']['output'];
  total_clicks: Scalars['Int']['output'];
  unique_visitors: Scalars['Int']['output'];
};

export type MarketingDashboardPoint = {
  __typename?: 'MarketingDashboardPoint';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
};

export type MarketingDashboardRecentCampaign = {
  __typename?: 'MarketingDashboardRecentCampaign';
  campaign_id: Scalars['ID']['output'];
  click_count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  open_count: Scalars['Int']['output'];
  open_rate: Scalars['Float']['output'];
  recipient_count: Scalars['Int']['output'];
  sent_at?: Maybe<Scalars['String']['output']>;
};

export type MarketingDashboardTopLink = {
  __typename?: 'MarketingDashboardTopLink';
  clicks: Scalars['Int']['output'];
  code: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  revenue: Scalars['Float']['output'];
};

/**
 * One file (or folder) in the ImageKit media library.
 *
 * Nothing about it is stored here — it is ImageKit's record, read through the
 * private key, which is why the browser cannot ask for it directly.
 */
export type MediaItem = {
  __typename?: 'MediaItem';
  createdAt?: Maybe<Scalars['String']['output']>;
  fileId: Scalars['ID']['output'];
  filePath: Scalars['String']['output'];
  /** image or non-image, as ImageKit classifies it. */
  fileType?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  mime?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  thumbnail?: Maybe<Scalars['String']['output']>;
  /** file or folder. */
  type: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
  versionId?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
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

/** One row of the comparison table, with a cell per plan. */
export type MembershipBenefit = {
  __typename?: 'MembershipBenefit';
  created_at?: Maybe<Scalars['String']['output']>;
  /** Section heading the row sits under. Rows group by this, in sort order. */
  group: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  values: Array<MembershipBenefitValue>;
};

export type MembershipBenefitInput = {
  group: Scalars['String']['input'];
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  values?: InputMaybe<Array<MembershipBenefitValueInput>>;
};

/** Server-side table page for the shared table engine (membershipBenefitsTable). */
export type MembershipBenefitTablePage = {
  __typename?: 'MembershipBenefitTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<MembershipBenefit>;
  total: Scalars['Int']['output'];
};

/** A present values array replaces the whole row; scalars are patched individually. */
export type MembershipBenefitUpdateInput = {
  group?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  values?: InputMaybe<Array<MembershipBenefitValueInput>>;
};

/** One plan's cell on a comparison row. Free text so a cell can read 12h, 10% or a tick. */
export type MembershipBenefitValue = {
  __typename?: 'MembershipBenefitValue';
  plan_key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type MembershipBenefitValueInput = {
  plan_key: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

/** Somebody who asked to be notified when membership opens. */
export type MembershipNewsSubscriber = {
  __typename?: 'MembershipNewsSubscriber';
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** Server-side table page for the shared table engine (membershipNewsSubscribersTable). */
export type MembershipNewsSubscriberTablePage = {
  __typename?: 'MembershipNewsSubscriberTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<MembershipNewsSubscriber>;
  total: Scalars['Int']['output'];
};

/**
 * One membership tier. Every price is TEXT, not a number: a tier can read
 * "Free" or "Invite only", and the currency is part of what Admin edits.
 */
export type MembershipPlan = {
  __typename?: 'MembershipPlan';
  /** Hex accent for the card. Empty falls back to the app's primary colour. */
  accent_color: Scalars['String']['output'];
  /** Ribbon on the card. Empty means no ribbon. */
  badge_label: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  /** Label on the call to action, which stays disabled while membership is coming soon. */
  cta_label: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** The headline price as shown, for example 1,499 with its currency symbol. */
  price_label: Scalars['String']['output'];
  /** The qualifier under the price, for example: / year or a monthly alternative. */
  price_note: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  /** One line under the name — who the tier is for. */
  tagline: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type MembershipPlanInput = {
  accent_color?: InputMaybe<Scalars['String']['input']>;
  badge_label?: InputMaybe<Scalars['String']['input']>;
  cta_label?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price_label?: InputMaybe<Scalars['String']['input']>;
  price_note?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  tagline?: InputMaybe<Scalars['String']['input']>;
};

/** Server-side table page for the shared table engine (membershipPlansTable). */
export type MembershipPlanTablePage = {
  __typename?: 'MembershipPlanTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<MembershipPlan>;
  total: Scalars['Int']['output'];
};

/** The key is immutable — benefit cells reference it, so renaming would orphan them. */
export type MembershipPlanUpdateInput = {
  accent_color?: InputMaybe<Scalars['String']['input']>;
  badge_label?: InputMaybe<Scalars['String']['input']>;
  cta_label?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price_label?: InputMaybe<Scalars['String']['input']>;
  price_note?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  tagline?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The whole pricing screen in one round trip. is_subscribed is the CALLER's
 * own state, which is why this query is never response-cached.
 */
export type MembershipPricing = {
  __typename?: 'MembershipPricing';
  benefits: Array<MembershipBenefit>;
  /** True when the caller already asked to be told when membership opens. */
  is_subscribed: Scalars['Boolean']['output'];
  plans: Array<MembershipPlan>;
};

export type MembershipStatus =
  | 'BACKED_OUT'
  | 'BACKOUT_IN_PROCESS'
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
  /** The private profile's owner accepts — this is what creates the follow. */
  acceptFollowRequest: User;
  /**
   * Auth-required: record acceptance from inside the account.
   *
   * For people who predate the gate and for re-accepting after an edit; signup
   * acceptance rides RegisterInput / GoogleSignupInput instead, so it can be
   * written in the same breath as the account.
   */
  acceptPolicies: Scalars['Boolean']['output'];
  acknowledgeBouncerSos: BouncerSosAlert;
  acknowledgeHostRequest: HostRequest;
  /**
   * Add hand-picked people to a saved list, on top of its criteria. Adding
   * somebody already in the list is a no-op, and ids of closed accounts are
   * dropped rather than stored.
   */
  addAudienceListMembers: AudienceList;
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
  /** Adds photos/videos from the pod. Host, or anyone marked present at it. */
  addPodPartyMedia: PodMediaBoard;
  addPodStatus: Pod;
  addPostComment: Post;
  addUserRole: User;
  /**  Admin-only: append a delta with an optional remark. Returns the updated score.  */
  adjustHealth: HealthScore;
  /**
   * Finance: hand one named account coins, or take them back.
   *
   * 'reason' is required — a manual row has no payment or referral to explain
   * itself, so the words are the whole audit trail. A deduction larger than the
   * balance is refused rather than partially applied.
   */
  adjustUserCoins: CoinAdjustResult;
  /** Admin assistant chat backed by OpenAI with limited internal lookup context. */
  adminAiChat: Scalars['String']['output'];
  adminCreateHost: Host;
  adminCreateVenue: Venue;
  /** Onboarding/admin slot management for any venue (role-gated). */
  adminCreateVenueSlots: Array<VenueSlot>;
  adminDeleteVenueSlot: Scalars['Boolean']['output'];
  /**
   * Replace a host's operating categories and nothing else. adminUpdateHost
   * requires the whole step1/2/3 payload, so a caller that only wants to set
   * categories would have to round-trip every other field to use it.
   */
  adminSetHostCategories: Host;
  /** Onboarding/admin: edit any brand (e.g. complete an approval-created draft) and optionally set its status. */
  adminUpdateEcommBrand: EcommBrand;
  adminUpdateHost: Host;
  adminUpdateVenue: Venue;
  adminUpdateVenueSlot: VenueSlot;
  /** Ops: advance an order's fulfilment status (manual). */
  advanceProductOrderStatus: ProductOrder;
  agentChat: AgentReply;
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
  /** Improves authored portal rich text while preserving its facts and HTML structure. */
  aiImproveRichText: Scalars['String']['output'];
  aiParseCrmLead: Scalars['String']['output'];
  /** Extract multiple leads from text — returns JSON { records: [...] }. */
  aiParseCrmLeads: Scalars['String']['output'];
  /** Authorise one build-artifact upload through the server. Tech/Super admin only. */
  appBuildUploadAuth: AppBuildUploadAuth;
  /** Redeem someone's referral code (once per account, not your own). */
  applyReferralCode: MyReferral;
  /** Approve the Club Admin — the table reads Active from here on. */
  approveClubAdminProfile: ClubAdminProfile;
  /** Onboarding/admin: approve a brand (grants the owner the E-commerce Manager role). */
  approveEcommBrand: EcommBrand;
  approveHost: Host;
  approveHostRequest: HostRequest;
  /** Admin approves a request — runs the request type's side effect (e.g. drafts the onboarded host/venue/seller, or applies an ecomm change). */
  approveRequest: ApprovalRequest;
  approveVenue: Venue;
  /** Owner approves a pending booking request — the pod goes live. */
  approveVenueSlotRequest: VenueSlot;
  /** Products portal: approve a partner warehouse so it goes live (usable for shipping). */
  approveWarehouseRequest: ApprovalRequest;
  /**
   * Shorthand for setting the status to ARCHIVED.
   *
   * Works on a SIGNED contract, unlike updateContract: filing something away is
   * not editing what it says.
   */
  archiveContract: Contract;
  archiveInventoryProduct: InventoryProduct;
  /**
   * Ask a bot a question. Every link in the reply is checked against the
   * navigation map and resolved for the caller's own environment, so the answer
   * can never point at a page that does not exist.
   */
  askBotChat: AskBotReply;
  /** Replace the set of clubs this admin runs. Other admins of those clubs are untouched. */
  assignClubAdminClubs: ClubAdminProfile;
  assignTicket: Ticket;
  assignUserRoles: User;
  /**
   * Hang a finished recording on the call it came from. Only a call you were
   * on: a call id is guessable, and this writes into a conversation.
   */
  attachStaffCallRecording: Scalars['Boolean']['output'];
  awardBadgeManually: UserBadge;
  /** Give every existing Club Admin a record and an id. Idempotent. */
  backfillClubAdminProfiles: ClubAdminBackfillResult;
  /** One-time repair: give an id to any contract that has none. */
  backfillContractIds: EntityIdBackfillResult;
  /** One-time repair: give an id to any grievance that has none. */
  backfillGrievanceIds: EntityIdBackfillResult;
  /** One-time repair: give an id to any document that has none. */
  backfillLegalDocumentIds: EntityIdBackfillResult;
  /** One-time repair: give an id to any policy that has none. */
  backfillPolicyIds: EntityIdBackfillResult;
  /**
   * Confirm Backout — the released seats go back on sale immediately and the
   * refund becomes eligible only once a replacement takes them.
   *
   * Omit the seats argument (or pass the whole booking) for the original
   * all-or-nothing backout. Pass fewer to give back PART of a multi-seat
   * booking: the member stays in the pod with the seats they kept, and only the
   * released ones are refunded, at the same deduction.
   */
  backoutPod: PodMember;
  /** Bulk-manage a venue's upcoming non-booked slots (owner-scoped). */
  bulkDeleteVenueSlots: BulkSlotResult;
  bulkUpdateVenueSlots: BulkSlotResult;
  callEcommLeadContact: LeadContactActionResult;
  callHostLeadContact: LeadContactActionResult;
  callVenueLeadContact: LeadContactActionResult;
  /** Pulls a pre-live offer: everyone enrolled is told and the venue's slot is released. */
  cancelAutoPod: AutoPod;
  /** Keep My Spot — cancel an in-process backout and restore the booking (seat must still be free). */
  cancelBackoutPod: PodMember;
  /** The requester withdraws their own pending ask (tapping Requested). */
  cancelFollowRequest: User;
  /** Onboarding staff cancel a meeting with a reason — the applicant is emailed and asked to fill the survey again. */
  cancelMeeting: OnboardingMeeting;
  /**
   * Withdraw an open request. The member's own, and only while it is open.
   *
   * No longer reachable from the apps: filing a request signs the member out
   * and closes the account, so nobody holding an open request can be signed in
   * to call this. `rejectAccountDeletionRequest` is the way back now.
   */
  cancelMyAccountDeletionRequest: AccountDeletionRequest;
  /** Cancel the caller's own pending meeting (with a reason). */
  cancelMyMeeting: OnboardingMeeting;
  /** Call off a scheduled send before it runs. */
  cancelWaCampaign: WaCampaign;
  /** Auth-required: confirm the OTP and set the new password. */
  changePasswordWithOtp: Scalars['Boolean']['output'];
  checkInEventTicket: EventTicket;
  /** Agent picks up an unassigned chat — announced as a SYSTEM bubble. */
  claimSupportChat: SupportChatSession;
  /** Delete every recorded breach. Returns how many rows went. */
  clearRateLimitEvents: Scalars['Int']['output'];
  /**
   * Empty this conversation for BOTH people and return how many messages went.
   * Deleted, not blanked: a thread of tombstones is not a cleared thread. The
   * call history stays — that two people spoke is still true.
   */
  clearStaffThread: Scalars['Int']['output'];
  cloneLegalDocument: LegalDocument;
  closeBouncerCallback: BouncerCallbackRequest;
  closeSupportChat: SupportChatSession;
  /** Create a pod under a club the signed-in user administers. */
  clubAdminCreatePod: Pod;
  /** Soft-delete a pod in one of the signed-in user's clubs. */
  clubAdminDeletePod: Scalars['Boolean']['output'];
  /**
   * Club Admin marks a member present without a scan — by code, or by name.
   *
   * The host's own path is proof-first: a QR scan, or a one-time code the
   * attendee reads back, and the host is paid on the result. This is the club's
   * override for when neither can be produced, and it carries both doors:
   *
   * - Send the attendee a WhatsApp/SMS code with requestPodAttendanceOtp, verify
   *   it, and pass the challenge as otp_challenge_id. It is spent here and the
   *   number that answered is recorded against the ticket.
   * - Or pass none: the host forgot to mark the pod and read the admin the
   *   names, which is the call this path exists for. The companions argument
   *   records whichever of them a multi-seat booking was given.
   *
   * Neither door is gated on the companion count, unlike the host's scan — the
   * group is not standing at this one. Every mark records who made it and
   * notifies the member, so it is contestable rather than silent.
   */
  clubAdminForceAttendance: EventTicket;
  /** Edit a club the signed-in user administers (governance fields are ignored). */
  clubAdminUpdateClub: Club;
  /** Edit any field of a pod in one of the signed-in user's clubs. */
  clubAdminUpdatePod: Pod;
  /** Club Admin enrols: claims the offer for one of their clubs. */
  clubClaimAutoPod: AutoPod;
  /**
   * The upload finished: read the archive end to end and, if it is whole, turn
   * it into a restorable backup. Returns immediately — the read continues
   * server-side and the row stays RUNNING until it is through. An archive that
   * cannot be read is failed and deleted rather than left where someone could
   * restore from it.
   */
  completeDbBackupUpload: DbBackup;
  /**
   * Step three: spend the grant and set the new password.
   *
   * Refuses a password the account already holds, and ends every session opened
   * before it — the flow exists because somebody else may hold the old one.
   */
  completePasswordReset: Scalars['Boolean']['output'];
  completePodSettlement: PodSettlementResult;
  /** Spend the code from requestContactPhoneChangeOtp and store the number. */
  confirmContactPhoneChange: User;
  /**
   * Spend the emailed code and store the address.
   *
   * The new address arrives already verified: the code proved it, which is the
   * whole reason it was sent there rather than to the address being replaced.
   */
  confirmEmailChange: User;
  /** Auth-required: link a Google account from Profile > Connected Accounts. */
  connectGoogleAccount: ConnectedAccounts;
  /** Creates an AI prompt. Code prompts come from the catalogue and cannot be created here. */
  createAiPrompt: AiPrompt;
  /** Bind an approved template to a campaign name, which is what a send addresses. */
  createAisensyCampaign: AisensyCampaignDraft;
  /** Submit a new WhatsApp template straight to AiSensy. Nothing is stored here. */
  createAisensyTemplate: AisensyTemplateDraft;
  createApiKey: CreatedApiKey;
  createAppPopup: AppPopup;
  createAudienceList: AudienceList;
  /**
   * Opens an Auto Pod for the marketplace. A Duncit admin opens one for every
   * club to compete for; a Club Admin passes club_id to open one FOR their own
   * club, which enrols that club at creation (so only a venue and a host are
   * still needed), fixes the category to the club's own and pins the offer to
   * the club's city.
   */
  createAutoPod: AutoPod;
  createBadge: Badge;
  createCategory: Category;
  createChallenge: Challenge;
  createClub: Club;
  createCommsProvider: CommsProvider;
  createContract: Contract;
  createCoupon: Coupon;
  createCrmCallPrompt: CrmCallPrompt;
  createCrmDynamicField: CrmDynamicField;
  createCrmEmailTemplate: CrmEmailTemplate;
  createCrmManagedOption: CrmManagedOption;
  createCrmReminder: CrmReminder;
  createCrmService: CrmService;
  createCrmServicesOffered: Array<CrmServiceOffered>;
  createEcommLead: EcommLead;
  /** Add a fragment of your own. It belongs to no category and can be deleted. */
  createEmailFragment: EmailFragment;
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
  createMembershipBenefit: MembershipBenefit;
  createMembershipPlan: MembershipPlan;
  createNotification: Notification;
  createPartnerPod: Pod;
  createPaymentReleaseRequest: PaymentReleaseRequest;
  createPod: Pod;
  createPodExpense: PodExpense;
  createPodIdea: PodIdea;
  createPodPlan: PodPlan;
  createPolicy: Policy;
  createPost: Post;
  /** Ops: create/retry the ShipRocket shipment for a SHIP order. */
  createProductOrderShipment: ProductOrder;
  /** Create or update the caller's review of a product. */
  createProductReview: ProductReview;
  createRateLimitRule: RateLimitRule;
  /** Gift card purchase via Razorpay (step 1; verify with verifyRazorpayPayment). */
  createRazorpayGiftCardOrder: RazorpayOrder;
  createRazorpayOrder: RazorpayOrder;
  /** Standalone product-cart checkout via Razorpay (step 1; verify with verifyRazorpayPayment). */
  createRazorpayProductOrder: RazorpayOrder;
  createRole: Role;
  createShortLink: ShortLink;
  createSlotTemplate: SlotTemplate;
  createSomethingForYouItem: SomethingForYouItem;
  createSurvey: Survey;
  createTicket: Ticket;
  createUser: User;
  createVenueLead: VenueLead;
  createVenueSlots: Array<VenueSlot>;
  createWaCampaignName: WaCampaignNameOption;
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
  /**
   * Claim a name for an archive being sent in, and hand back a one-shot pass for
   * the upload route. Creates the backup row up front so an abandoned upload
   * leaves something the stale sweep can clean. SUPER_ADMIN only.
   */
  dbBackupUploadAuth: DbBackupUploadPass;
  /** Onboarding staff approve or deny a DONE meeting themselves — approval drafts the onboarded host/venue/seller (or grants the club-admin role). No admin round-trip. */
  decideMeeting: OnboardingMeeting;
  /** Owner declines a pending booking request — the slot frees up again. */
  declineVenueSlotRequest: VenueSlot;
  /** Permanently remove an ad request. */
  deleteAdRequest: Scalars['Boolean']['output'];
  /**  Admin-only: delete an adjustment. Returns the recomputed score.  */
  deleteAdjustment: HealthScore;
  /** Deleting a code prompt is refused — reset it instead. */
  deleteAiPrompt: Scalars['Boolean']['output'];
  /** Remove a template. There is no edit — replacing one means delete and resubmit. */
  deleteAisensyTemplate: Scalars['Boolean']['output'];
  /**
   * Delete every bug ever rolled up — the whole collection, not a filtered view.
   * Deleting a filtered set is what deleteBugs is for.
   */
  deleteAllBugs: Scalars['Int']['output'];
  /**
   * Empty the log entirely. Returns how many rows went.
   *
   * Deliberately unscoped rather than filter-scoped: the table's filters are
   * debounced and its total came from an earlier fetch, so a scoped delete
   * would state one number in the confirmation and remove a different one.
   * Deleting a filtered set is what deleteEmailLogs is for.
   */
  deleteAllEmailLogs: Scalars['Int']['output'];
  /**
   * Delete a build and the artifact it points at. Tech/Super admin only.
   *
   * The stored file goes with the row — leaving it would fill the disk with
   * artifacts nothing links to. An artifact that is already gone is not an
   * error: the row must always be removable.
   */
  deleteAppBuild: Scalars['Boolean']['output'];
  deleteAppPopup: Scalars['Boolean']['output'];
  deleteAudienceList: Scalars['Boolean']['output'];
  /**
   * Removes the record for good. Refused once the pod is live (delete the pod
   * itself); a pre-live offer is cancelled first so its slot is released and
   * everyone enrolled is told.
   */
  deleteAutoPod: Scalars['Boolean']['output'];
  deleteBadge: Scalars['Boolean']['output'];
  deleteBrandPickupLocation: Scalars['Boolean']['output'];
  /** Delete the given bugs. Returns how many actually went. */
  deleteBugs: Scalars['Int']['output'];
  deleteCategory: Scalars['Boolean']['output'];
  deleteChallenge: Scalars['Boolean']['output'];
  deleteClub: Scalars['Boolean']['output'];
  /**
   * Delete the onboarding record and unassign every club. The user account and
   * its role stay — deleting an onboarding record must not delete a login.
   * Re-confirmed with the caller's own credentials; it cannot be undone.
   */
  deleteClubAdminProfile: Scalars['Boolean']['output'];
  deleteCommsProvider: Scalars['Boolean']['output'];
  deleteContract: Scalars['Boolean']['output'];
  deleteCoupon: Scalars['Boolean']['output'];
  deleteCrmCallPrompt: Scalars['Boolean']['output'];
  deleteCrmDynamicField: Scalars['Boolean']['output'];
  deleteCrmEmailTemplate: Scalars['Boolean']['output'];
  deleteCrmManagedOption: Scalars['Boolean']['output'];
  deleteCrmReminder: Scalars['Boolean']['output'];
  deleteCrmService: Scalars['Boolean']['output'];
  deleteCrmServiceOffered: Scalars['Boolean']['output'];
  /**
   * Delete one archive from disk. The row survives and loses its download — what
   * was backed up and when is history, not a file pointer.
   */
  deleteDbBackup: DbBackup;
  /** Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the brand still has products. */
  deleteEcommBrand: Scalars['Boolean']['output'];
  deleteEcommLead: Scalars['Boolean']['output'];
  /**
   * Delete a fragment you added. Refused for the nine that ship. Templates
   * naming it are released rather than left pointing at nothing.
   */
  deleteEmailFragment: Scalars['Boolean']['output'];
  /** Delete the ticked rows. Returns how many actually went. */
  deleteEmailLogs: Scalars['Int']['output'];
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
  deleteLocale: Scalars['Boolean']['output'];
  deleteLocation: Scalars['Boolean']['output'];
  /**
   * Delete a campaign. A scheduled one has its pending send cancelled with it;
   * a campaign that is sending right now is refused.
   */
  deleteMarketingCampaign: Scalars['Boolean']['output'];
  /** Delete files by id. Returns how many ImageKit actually removed. */
  deleteMediaFiles: Scalars['Int']['output'];
  deleteMembershipBenefit: Scalars['Boolean']['output'];
  deleteMembershipPlan: Scalars['Boolean']['output'];
  deleteMyAddress: Scalars['Boolean']['output'];
  /** Delete an own-brand warehouse. Blocked while any product still ships from it. */
  deleteMyBrandPickupLocation: Scalars['Boolean']['output'];
  deleteMyProductListing: Scalars['Boolean']['output'];
  deleteNotification: Scalars['Boolean']['output'];
  deletePod: Scalars['Boolean']['output'];
  deletePodComment: Scalars['Boolean']['output'];
  deletePodDraft: Scalars['Boolean']['output'];
  deletePodExpense: Scalars['Boolean']['output'];
  deletePodIdea: Scalars['Boolean']['output'];
  deletePodIdeaComment: PodIdea;
  deletePodMessage?: Maybe<PodMessage>;
  deletePodPlan: Scalars['Boolean']['output'];
  deletePolicy: Scalars['Boolean']['output'];
  deletePost: Scalars['Boolean']['output'];
  deletePostComment: Post;
  deletePushSubscription: Scalars['Boolean']['output'];
  deleteRateLimitRule: Scalars['Boolean']['output'];
  deleteRole: Scalars['Boolean']['output'];
  deleteShortLink: Scalars['Boolean']['output'];
  deleteSlotTemplate: Scalars['Boolean']['output'];
  deleteSomethingForYouItem: Scalars['Boolean']['output'];
  /** Take back your own message. The row stays; the words go. */
  deleteStaffMessage: StaffMessage;
  deleteStatusReports: Scalars['Int']['output'];
  deleteSurvey: Scalars['Boolean']['output'];
  deleteTranslation: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  deleteUserActivityDay: Scalars['Boolean']['output'];
  deleteUserActivityYear: Scalars['Boolean']['output'];
  deleteUserContactAction: Scalars['Boolean']['output'];
  /** Developer-only permanent delete. Re-confirm with your own email + password. Cannot be undone; blocked if the venue still has live pods/booked slots. */
  deleteVenue: Scalars['Boolean']['output'];
  deleteVenueLead: Scalars['Boolean']['output'];
  deleteVenueSlot: Scalars['Boolean']['output'];
  deleteWaCampaign: Scalars['Boolean']['output'];
  deleteWaCampaignName: Scalars['Boolean']['output'];
  deleteWebsiteContent: Scalars['Boolean']['output'];
  deleteWebsiteNavItem: Scalars['Boolean']['output'];
  /** Admin denies a request. */
  denyRequest: ApprovalRequest;
  /** Products portal: deny a partner warehouse (stays blocked). */
  denyWarehouseRequest: ApprovalRequest;
  /**
   * Auth-required: unlink the Google account.
   *
   * Refused when the account has no password — Google would be the only way in,
   * and unlinking it would lock the user out of their own account.
   */
  disconnectGoogleAccount: ConnectedAccounts;
  /** Tech portal only: forget the mailbox. Tickets it already opened stay. */
  disconnectMailAutomationAccount: Scalars['Boolean']['output'];
  /** Record that the signed-in user closed this popup, so it never returns. */
  dismissAppPopup: Scalars['Boolean']['output'];
  /** Onboarding staff remove a cancelled meeting from the calendar (kept for audit). */
  dismissMeeting: OnboardingMeeting;
  dummyCheckout: Payment;
  /** Gift card purchase via the dummy gateway. */
  dummyGiftCardCheckout: Payment;
  /** Standalone product-cart checkout via the dummy gateway. */
  dummyProductCheckout: Payment;
  duplicateInventoryProduct: InventoryProduct;
  /**  Admin-only: edit an existing adjustment's delta/remark in place. Returns the recomputed score.  */
  editAdjustment: HealthScore;
  /** Change your own words. Only the text — never the attachment. */
  editStaffMessage: StaffMessage;
  emailEcommLeadContact: LeadContactActionResult;
  emailHostLeadContact: LeadContactActionResult;
  /** Email the chat transcript to an address (defaults to a .docx attachment). */
  emailSupportChatTranscript: Scalars['Boolean']['output'];
  /** Email the ticket transcript to an address (defaults to a .docx attachment). */
  emailTicketTranscript: Scalars['Boolean']['output'];
  emailVenueLeadContact: LeadContactActionResult;
  followClub: User;
  followPod: User;
  /**
   * Follow a user. A PUBLIC profile is followed immediately; a PRIVATE one
   * only opens a PENDING follow request and notifies its owner.
   */
  followUser: User;
  /** Send an existing message on to somebody else — a copy, not a pointer. */
  forwardStaffMessage: StaffMessage;
  generateInventorySku: Scalars['String']['output'];
  generateLeadSurveyLink: LeadSurveyEntry;
  generateMeetingLink: MeetingLinkResult;
  /**
   * Ask for somewhere to put a file. The folder is fixed on the pass, so one
   * issued for avatars cannot be spent writing somewhere else.
   */
  getImagekitAuth: ImagekitAuth;
  grantAdminAccess: User;
  /**
   * Host enrols: assigns themselves, setting the pod's ticket price and spots
   * (the template's when omitted). Only once a venue has fixed the slot on a
   * physical offer. location_id is the city the host had selected — required
   * when nobody has enrolled yet on a virtual offer (it pins it), and must
   * match the pinned city otherwise.
   */
  hostAssignAutoPod: AutoPod;
  hostDeletePod: Scalars['Boolean']['output'];
  /**
   * Host marks one attendee present without a scan.
   *
   * While Admin > Pods > Pod Settings requires OTP, `otp_challenge_id` must
   * name a verified challenge raised for THIS booking — one proof marks one
   * person. Returns the whole board so the page never has to guess what the
   * write did to the counts.
   */
  hostMarkPodAttendance: PodAttendanceBoard;
  /** Host fully edits a venue-rejected pod and resubmits the booking request (no new pod). */
  hostResubmitPod: Pod;
  /**
   * Host scans an attendee's ticket QR for one of their OWN pods: verifies the
   * code belongs to that pod, marks attendance and returns the attendee.
   * Authorised by the same host/co-host rule as hostUpdatePod — a host never
   * holds an admin role, so the admin check-in mutations are closed to them.
   */
  hostScanPodTicket: HostTicketScanResult;
  hostUpdatePod: Pod;
  /** The host steps off while the offer is still enrolling; the offer returns to hosts' lists and the host pays the Pod Settings penalty. */
  hostWithdrawAutoPod: AutoPod;
  /** Upsert bugs from an export file, matched on fingerprint. */
  importBugs: BugImportResult;
  /**
   * Restore entries from an exported JSON file, matching on category + name:
   * a name this server already has is updated in place, a new one is created.
   *
   * Blank secrets are left alone rather than written, which is what makes an
   * export that was hand-edited safe to re-import — deleting a value from the
   * file does not wipe the credential the server is running on.
   */
  importEnvEntries: EnvImportResult;
  /**
   * Restore flags from an exported JSON file, matching on key: a key this
   * server already has is switched to the file's state, a new one is created.
   *
   * System flags are updated like any other — their key is seeded on boot, so
   * the file only carries whether the feature is on, never the seeding itself.
   */
  importFeatureFlags: FeatureFlagImportResult;
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
  /** Load logs from an export file, matched on the id each row carries. */
  importTelemetryLogs: TelemetryLogImportResult;
  /**
   * Bulk-add keys for a surface from a fallback bundle, so a new page's strings
   * appear in the admin automatically instead of being typed by hand. Existing
   * keys keep their translations; only missing ones are created.
   */
  importTranslationKeys: Scalars['Int']['output'];
  incrementPodHits: Pod;
  /** Primary host invites a co-host. Enforces the sub-category's allow_co_hosts + max_co_hosts. */
  inviteCoHost: Pod;
  /**
   * Mint a CI credential for the caller, to paste into the GitHub repo secret.
   * Grants nothing the caller does not already hold — it re-signs their own
   * identity — but it is audited, because a copyable long-lived token is worth
   * knowing the origin of. Tech/Super admin only.
   */
  issueAppBuildCiToken: AppBuildCiToken;
  /** Book a free pod. Seats books several at once (default 1, capped by what is left). */
  joinFreePod: PodMember;
  /**
   * Open a virtual pod's meeting as a joined member.
   *
   * Returns the link, and — inside the pod window (from an hour before the
   * start to an hour after the end) — marks the booking present through the
   * same write every other attendance path uses, as VIRTUAL_JOIN. A host
   * opening their own pod's link is handed the link and marks nothing: hosts
   * are never attendees of their own pod.
   */
  joinPodMeeting: PodMeetingAccess;
  /**
   * Add the bot to a PUBLIC channel, which is the fix for not_in_channel.
   *
   * Needs the channels:join scope. Private channels cannot be joined by any API
   * — Slack only admits a bot to one by invitation from someone already inside
   * it — so this refuses them rather than failing at Slack with a vaguer error.
   */
  joinSlackChannel: SlackChannel;
  /**
   * Grant Google sign-in to an existing email/password account, then sign in.
   *
   * This is the "allow" half of the consent step loginWithGoogle triggers with
   * EMAIL_LOGIN_REQUIRED. Deliberately UNAUTHENTICATED: the caller has just
   * proved control of the Google account, and verifyGoogleIdToken refuses a
   * token whose email Google has not verified — so a verified address matching
   * an account IS the proof. The password is never touched; the account keeps
   * both ways in.
   */
  linkGoogleAccount: AuthPayload;
  login: AuthPayload;
  loginWithGoogle: AuthPayload;
  /**
   * Continue with OTP, step two: trade a correct code for the same session a
   * password would have produced. Single-use, expires with the challenge, and a
   * wrong code costs an attempt.
   */
  loginWithOtp: AuthPayload;
  /** Trade a correct code for the same session a password would have produced. */
  loginWithPortalOtp: AuthPayload;
  /**
   * Tech portal only: the Google consent URL to open in a new tab. The callback
   * at /gmail/oauth/callback finishes the connection and returns the operator
   * to the Tech portal.
   */
  mailAutomationConnectUrl: Scalars['String']['output'];
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markBouncerCallbackContacted: BouncerCallbackRequest;
  markNotificationRead: Scalars['Boolean']['output'];
  /** Mark what they sent you as read. Returns how many that was. */
  markStaffThreadRead: Scalars['Int']['output'];
  markSupportChatRead: SupportChatSession;
  /** Mark a ticket thread read (owner or agent) — updates the side's last-read so the other side's ticks turn 'Seen' (B12). */
  markTicketRead: Ticket;
  /** Deep-analyses a pod's content against community guidelines before publishing. */
  moderatePodContent: ModerationResult;
  /** Deep-analyses a product listing's content against community guidelines before submit. */
  moderateProductContent: ModerationResult;
  /**
   * Send the change notice on its own, without editing anything.
   *
   * The same mail the update checkbox sends, for when Legal decides afterwards
   * that people should have been told. Returns how many accounts it reached.
   */
  notifyPolicyAcceptedUsers: Scalars['Int']['output'];
  permanentlyDeleteInventoryProduct: Scalars['Boolean']['output'];
  /** Pin, or take the pin off. Pins belong to the thread, so both people see them. */
  pinStaffMessage: StaffMessage;
  /** Finance-only: process the refund for a Spot Filled Backout request (one refund per request). */
  processBackoutRefund: BackoutRefundRequest;
  publishPodDraft: Pod;
  /**
   * Clear every remaining trace and then the account itself. Permanent.
   *
   * The account goes last: a run that dies halfway leaves a request that still
   * names a user the next attempt can search by.
   */
  purgeAccountCompletely: AccountDeletionDetail;
  /** Clear this member's rows behind ONE reference. Permanent. */
  purgeAccountTrace: AccountDeletionDetail;
  /** Drop a URL from ImageKit's CDN cache, after replacing what sits behind it. */
  purgeMediaCache: Scalars['String']['output'];
  raiseBouncerSos: BouncerSosAlert;
  reactToPodMessage: PodMessage;
  /**
   * React, or take the reaction back. The same kind again removes it; a
   * different kind replaces it, so one person is only ever counted once.
   */
  reactToStaffMessage: StaffMessage;
  /** Re-sync a non-terminal call's status from Twilio (fallback when the async callback is missed). */
  reconcileCrmCall: CrmAiCallResult;
  /** Re-read AiSensy and cache each template's category, which sets the rate. */
  reconcileWhatsappScenarios: WaScenarioBoard;
  recordActivePing: Scalars['Boolean']['output'];
  recordAppEvent: Scalars['Boolean']['output'];
  recordInventoryStockMovement: InventoryProduct;
  /** Record a buyer click on a product (optionally a specific variant). */
  recordProductClick: Scalars['Boolean']['output'];
  /** Record a buyer view of a product (forward-only engagement tracking). */
  recordProductView: Scalars['Boolean']['output'];
  /**
   * Report that a click reached a step. Called by the apps as the visitor moves
   * through the funnel; safe to call more than once, since a step that already
   * happened keeps its original time. Public: most of the funnel happens before
   * anyone has signed in, and an authenticated call also binds the account.
   */
  recordShortLinkJourney: Scalars['Boolean']['output'];
  /** Record that the signed-in viewer opened this story; idempotent (Bugs 2 & 4). */
  recordStoryView: Post;
  recordUserContactAction: UserContactAction;
  /**
   * Convert a gift card's full value into Duncit Coins for the caller. The first
   * redeemer of a shared code wins; a repeat call by the same person is a no-op
   * that reports coins_added: 0.
   */
  redeemGiftCard: GiftCardRedeemResult;
  redeemPodReferral: PodMember;
  /** Ops: pull the latest tracking from ShipRocket. */
  refreshProductOrderTracking: ProductOrder;
  refundPayment: Payment;
  register: AuthPayload;
  /** Register the location with ShipRocket so SHIP orders can pick up from it. */
  registerBrandPickupWithShiprocket: BrandPickupLocation;
  /** Turn a request down, with a reason. */
  rejectAccountDeletionRequest: AccountDeletionDetail;
  /** Reject the Club Admin. A reason is required. */
  rejectClubAdminProfile: ClubAdminProfile;
  /** Onboarding/admin: reject a brand with notes. */
  rejectEcommBrand: EcommBrand;
  /** The private profile's owner rejects. No follow is created. */
  rejectFollowRequest: User;
  rejectHost: Host;
  rejectHostRequest: HostRequest;
  rejectVenue: Venue;
  /** Rejoin a pod the caller previously backed out of — no payment, until the pod completes. */
  rejoinPod: PodMember;
  /**
   * Record that the guest closed the rating prompt for this pod, and whether to
   * ask again — so the pop-up stops reappearing on every page load.
   */
  remindPodFeedback: Scalars['Boolean']['output'];
  /**
   * Take one person out of a saved list. A list stores criteria, not people, so
   * this records a removal rather than deleting a row: the person stays out as
   * the criteria re-run, and is offered by the picker again if they should
   * return. Removing somebody the list never held succeeds quietly.
   */
  removeAudienceListMember: AudienceList;
  /** Primary host withdraws an invite / removes a co-host. */
  removeCoHost: Pod;
  removeCrmEmailTemplateImage: CrmEmailTemplate;
  removeExpenseRefund: Expense;
  /** Onboarding staff remove a holiday / leave day. */
  removeMeetingHoliday: Scalars['Boolean']['output'];
  /** Takes one item down — your own, or any of them if you host the pod. */
  removePodPartyMedia: PodMediaBoard;
  removeUserRole: User;
  /** Rename in place. Purging the CDN copy costs a purge credit, so it is opt-in. */
  renameMediaFile: MediaItem;
  /** Re-open a resolved/closed chat (user within 3 days, or an agent). Reason logged to the thread. */
  reopenSupportChat: SupportChatSession;
  /** Re-open a resolved/closed ticket (owner within 3 days, or an agent). Reason logged to the thread. */
  reopenTicket: Ticket;
  reorderCrmDynamicFields: Array<CrmDynamicField>;
  /** Seller reply to a review of their own product (single reply). */
  replyToProductReview: ProductReview;
  replyToTicket: Ticket;
  /**
   * Record a CI build (and, once it finishes, announce it on the platform's
   * Slack channel, best-effort). Tech/Super admin only — the workflow
   * authenticates with a TECH_MANAGER JWT, the same way release-notify does.
   *
   * Reports are keyed on workflow_run_id, so the RUNNING report a workflow sends
   * at its start and the SUCCESS/FAILED report it sends at its end are the SAME
   * row, not two. Slack hears only about the finished one — a channel that
   * announced every build twice would be ignored within a week.
   */
  reportAppBuild: AppBuild;
  /**
   * Report a story. Open to any signed-in viewer — that is the point of it.
   *
   * The snapshot (media, caption, author, club) is taken server-side from the
   * story itself, so a reporter cannot file a row describing something the
   * story never showed.
   */
  reportStory: ContentReport;
  /**
   * Auth-required: email a confirmation code before asking to be deleted.
   *
   * The code is spent by submitAccountDeletionRequest, which FILES a request
   * for the Tech portal rather than deleting anything — see the accountDeletion
   * module. Nothing in this module deletes an account any more.
   */
  requestAccountDeletionOtp: OtpRequestResult;
  requestBouncerCallback: BouncerCallbackRequest;
  /**
   * Triggers (or retries) the Servam-AI transcript pipeline for a CALL log.
   * Returns the log with transcript_status flipped to PENDING.
   */
  requestCommunicationTranscript: CommunicationLog;
  /**
   * Send a one-time code to a number this account wants to start using.
   *
   * The code goes to the NEW number over the mediums that number's owner
   * accepts, and it is refused if the number already belongs to another
   * account — a number is how somebody signs in, so two accounts may not share
   * one.
   */
  requestContactPhoneChangeOtp: PhoneOtpRequestResult;
  /**
   * Mint a short-lived signed download link for one archive.
   *
   * A backup is the entire database in a file, so it is not served statically
   * the way a build artifact is, and a browser download cannot carry the session
   * header. The link names one backup and stops working within minutes.
   */
  requestDbBackupDownload: DbBackupDownload;
  /**
   * Email a one-time code to an address this account wants to start using.
   *
   * Refused when the address already belongs to another account, and when it is
   * the address already on this one — there is nothing to prove in that case.
   */
  requestEmailChangeOtp: OtpRequestResult;
  requestEmailVerificationOtp: OtpRequestResult;
  /**
   * Continue with OTP, step one: send a sign-in code to the chosen channel.
   *
   * Answers exactly as the recovery request does — registered: false when no
   * account holds these details, and no code is sent then. Unlike recovery, an
   * account with no password may still ask: a code proves the mailbox or the
   * number, which is as authenticated as that account ever is.
   */
  requestLoginOtp: PasswordResetRequestResult;
  requestMeeting: OnboardingMeeting;
  /** Auth-required: verify the current password and email a change-confirmation OTP. */
  requestPasswordChangeOtp: OtpRequestResult;
  /**
   * Step one of forgotten-password recovery: send a code to the chosen channel.
   *
   * Replaces requestPasswordResetOtp, which is email-only and stays for app
   * builds already on people's phones.
   */
  requestPasswordResetCode: PasswordResetRequestResult;
  /** Deprecated: email-only step one. Use requestPasswordResetCode. */
  requestPasswordResetOtp: OtpRequestResult;
  /** Send the attendee a one-time code over the chosen medium(s). */
  requestPodAttendanceOtp: PhoneOtpRequestResult;
  /**
   * Send ONE of the extra people a multi-seat booking admits a one-time code.
   *
   * The same input and the same shared OTP service as the attendee's own code,
   * with the name and the number being the companion's rather than the buyer's.
   * A separate purpose, so a companion's proof can never be spent as the
   * buyer's attendance. Spending it happens when the group is recorded, which
   * is why the host verifies them one at a time.
   */
  requestPodCompanionOtp: PhoneOtpRequestResult;
  /** Ask an admin for console access — lands in Admin > Portal Access; the decision is emailed. */
  requestPortalAccess: PortalAccessEntry;
  /**
   * Email a sign-in code for a console.
   *
   * Answers the same way whatever happens, on purpose: an account that does not
   * exist, one that is not active and one with no role for this portal are all
   * reported as sent. Told apart, this mutation would be a directory of who
   * works here and what they can reach.
   */
  requestPortalLoginOtp: OtpRequestResult;
  requestWhatsAppOtp: WhatsAppOtpRequestResult;
  requestWithdrawal: WalletWithdrawal;
  /** Move the caller's own meeting to a new open slot (one-time; keeps contact details, resets staff scheduling). */
  rescheduleMyMeeting: OnboardingMeeting;
  /** Restore a code prompt's shipped default body. */
  resetAiPrompt: AiPrompt;
  /**
   * Forget the caller's arrangement of one dashboard so it falls back to the
   * built-in defaults. Returns true whether or not a row existed.
   */
  resetDashboardLayout: Scalars['Boolean']['output'];
  /** Restore one of the nine to the header and footer it shipped with. */
  resetEmailFragment: EmailFragment;
  /** Deprecated: code + new password in one call. Use completePasswordReset. */
  resetPasswordWithOtp: Scalars['Boolean']['output'];
  /**
   * Forget every live counter and cool-off.
   *
   * The way out of a cool-off somebody is stuck in after a rule was tightened
   * too far. Rules and settings are untouched.
   */
  resetRateLimitCounters: Scalars['Boolean']['output'];
  /** Zero one rule's lifetime hit/blocked counters without changing what it does. */
  resetRateLimitRuleCounters: RateLimitRule;
  resolveBouncerSos: BouncerSosAlert;
  /** The user (or an agent) marks the chat resolved — same as close, owner-allowed. */
  resolveSupportChat: SupportChatSession;
  /** Mark a ticket resolved (owner OR an agent) — appends a SYSTEM timeline bubble. */
  resolveTicket: Ticket;
  /** The invited user accepts or declines. */
  respondToCoHostInvite: Pod;
  /**
   * Restore the live database from one archive. DESTRUCTIVE: every collection
   * the archive carries is dropped and rewritten, and anything written since it
   * was taken is lost. Returns immediately; the walk continues server-side.
   * SUPER_ADMIN only, and audited.
   */
  restoreDbBackup: DbRestore;
  restoreInventoryProduct: InventoryProduct;
  /**
   * Re-run the checkout work that did not land, and answer with the fresh audit.
   *
   * Omit step_keys to re-run everything the payment still owes; pass one to
   * re-run a single row. A payment whose booking core never committed is re-run
   * whole instead — every leg guards its own replay, so nothing is created twice.
   */
  retryPaymentSteps: PaymentDetail;
  /** Re-attempt only the people this campaign did not reach. Returns immediately. */
  retryWaCampaign: WaCampaign;
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
  /**
   * Mint a new key for the public JSON feeds. Every URL copied before this
   * stops working the moment it returns — which is the entire point.
   */
  rotateTelemetryApiKey: TelemetrySettings;
  /**
   * Run the sweep now.
   *
   * Not gated on `cron_enabled` and does not move `last_run_at`: this is a
   * human clearing the queue, and it must neither require switching the
   * schedule on nor make tonight's run look like it already happened.
   */
  runAccountDeletionPurgeNow: AccountDeletionRun;
  /**
   * Take a backup now and return the row immediately. The archive is written on
   * the server, so closing the browser cannot interrupt it. SUPER_ADMIN only.
   */
  runDbBackup: DbBackup;
  saveBrandPickupLocation: BrandPickupLocation;
  /**
   * Store the caller's arrangement of one dashboard, replacing any previous
   * one. Positions only — widget ids the running build does not define are
   * simply ignored when the dashboard next renders.
   */
  saveDashboardLayout: DashboardLayout;
  /**
   * Save one end and immediately prove it by connecting with exactly what was
   * saved. Returns both ends, so the caller never has to merge two shapes.
   */
  saveDataCloneConnection: DataCloneSettings;
  /** Save the automatic schedule. SUPER_ADMIN only. */
  saveDbBackupSettings: DbBackupSettings;
  /** Partner: create a new brand (omit brand_doc_id) or update an owned draft. */
  saveEcommBrand: EcommBrand;
  /** Register a native (Expo) push token for the signed-in device. */
  saveExpoPushToken: Scalars['Boolean']['output'];
  /** Save a founder setting (constant / manual metric value). */
  saveFounderSetting: FounderSettingKv;
  saveGrievanceOfficer: GrievanceOfficer;
  saveLeadSurveyResponse: LeadSurveyEntry;
  /** Create (no id) or update (with id) one of my saved addresses. */
  saveMyAddress: UserAddress;
  /** Create/update a warehouse on one of the caller's OWN brands (owner_kind/brand_id are forced server-side). */
  saveMyBrandPickupLocation: BrandPickupLocation;
  savePodDraft: PodDraft;
  savePushSubscription: Scalars['Boolean']['output'];
  /**
   * Store the caller's chrome arrangement. Only the fields present in the input
   * are written, so two consoles open at once cannot overwrite each other's
   * unrelated preferences.
   */
  saveShellWorkspaceState: ShellWorkspaceState;
  /** Save part of your chat setup. Anything omitted is left as it was. */
  saveStaffChatState: StaffChatState;
  seedSuperAdmin: SeedAdminResult;
  /** Send a WhatsApp template campaign message through AiSensy. */
  sendAisensyCampaign: AisensySendResult;
  /**
   * Emails the mobile-app release distribution list an APK download link plus an
   * OpenAI-summarised changelog built from the supplied git commits. Tech/Super
   * admin only; SMTP + OpenAI credentials come from the Tech portal env entries.
   */
  sendAppReleaseEmail: AppReleaseEmailResult;
  sendCrmTestEmail: CrmEmailTestResult;
  sendMarketingCampaign: MarketingCampaign;
  sendPodMessage: PodMessage;
  /** Post a message to a Slack channel (full message surface). */
  sendSlackMessage: SlackSendResult;
  /** Send a message, a file, or both. Text may be empty when a file comes with it. */
  sendStaffMessage: StaffMessage;
  sendSupportChatMessage: SupportChatMessage;
  sendTestEmail: EmailTestResult;
  /** Start or schedule a WhatsApp send. Returns immediately; the walk continues in the background. */
  sendWaCampaign: WaCampaign;
  /** Send one test message to one number, through the same path a campaign uses. */
  sendWaTestMessage: WaTestSendResult;
  /** Switch off everything the signed-in person is allowed to switch off. */
  setAllMyMailPreferences: MailPreference;
  setAllMyWhatsappPreferences: WaPreference;
  /**
   * Pauses (false) or resumes (true) an offer still enrolling. Paused, it is
   * shown to nobody and takes no claim; resumed, whoever is still missing is
   * told again.
   */
  setAutoPodActive: AutoPod;
  /** Onboarding/finance: brand-level Duncit commission %% override on product sales (0 = inherit). */
  setBrandCommission: EcommBrand;
  /** Set the pay commission. Null or 0 inherits the platform default. */
  setClubAdminCommission: ClubAdminProfile;
  setClubAdminProfileActive: ClubAdminProfile;
  setDefaultBrandPickupLocation: BrandPickupLocation;
  setDefaultCommsProvider: CommsProvider;
  setDefaultEnvEntry: EnvEntry;
  setDefaultMyAddress: UserAddress;
  setDefaultMyBrandPickupLocation: BrandPickupLocation;
  setDefaultSlotTemplate: SlotTemplate;
  /** Onboarding/admin: deactivate/reactivate a brand — hides it + its products from the marketplace and pod product picker (reversible). */
  setEcommBrandActive: EcommBrand;
  setFeatureFlag: FeatureFlag;
  /** Support portal: move a report through triage. */
  setFeedbackReportStatus: FeedbackReport;
  setHostActive: Host;
  setHostDeductions: Scalars['Boolean']['output'];
  /** Staff: temporarily deactivate/reactivate any catalogue product (reversible is_active flip; archive/restore own the ARCHIVED lifecycle). */
  setInventoryProductActive: InventoryProduct;
  /**
   * Show or hide a document without editing it.
   *
   * Works on a SIGNED document, unlike updateLegalDocument: taking something
   * down is the remedy for a signed document that turns out to be wrong, so the
   * signature lock must not block it.
   */
  setLegalDocumentActive: LegalDocument;
  /** The same two actions from an unsubscribe link, with no sign-in. */
  setMailPreferenceByToken: MailPreference;
  /** Partner: temporarily deactivate/reactivate an OWN brand — same reversible hide as setEcommBrandActive; placed orders are unaffected. */
  setMyEcommBrandActive: EcommBrand;
  /** Persist the signed-in users language. Validated against active locales. */
  setMyLocale: User;
  /** Switch one category on or off for the signed-in person. */
  setMyMailPreference: MailPreference;
  /**
   * Turn one-time codes on or off for one channel.
   *
   * Refuses the write that would leave the account with no reachable channel
   * for a code — that is a lockout, not a preference.
   */
  setMyOtpChannel: CommPreference;
  /** Partner: temporarily deactivate/reactivate an OWN approved listing (reversible; hidden from the shop while paused, placed orders unaffected). */
  setMyProductListingActive: InventoryProduct;
  /** Persist the user's selected header location (pass null to clear). */
  setMySelectedLocation: User;
  /** Change the signed-in account's @handle. Rejects a taken or reserved one. */
  setMyUsername: User;
  setMyWhatsappPreference: WaPreference;
  setPodIdeaStatus: PodIdea;
  /**
   * Turn one console's header features on or off. Each flag is optional so a
   * single switch can be flipped without restating the other.
   */
  setPortalAppFeatures: PortalMode;
  /** Replace the full set of entries assigned to a portal. */
  setPortalEnvEntries: Array<EnvEntry>;
  setPortalMode: PortalMode;
  /** Ops: switch an order between SHIP and PICKUP. */
  setProductOrderFulfilmentMethod: ProductOrder;
  setRateLimitRuleEnabled: RateLimitRule;
  /** Retire or revive a link without deleting its click history. */
  setShortLinkActive: ShortLink;
  setVenueActive: Venue;
  setVenueDeductions: Venue;
  /** Set one of the platform default header assets — what a media-header scenario sends when neither it nor its campaign carries one. An empty url clears it. */
  setWhatsappDefaultMedia: WaScenarioBoard;
  /** Flip one scenario. Pass __global__ as the key for the kill switch. */
  setWhatsappScenarioEnabled: WaScenarioBoard;
  /** Set the admin's own header asset for one scenario. An empty url clears it. Reconcile never overwrites it. */
  setWhatsappScenarioMedia: WaScenarioBoard;
  /** Email the signed contract, with the PDF attached. */
  shareContract: Scalars['Boolean']['output'];
  /** Email the signed contract, with the PDF attached. */
  shareLegalDocument: Scalars['Boolean']['output'];
  /**
   * The tracked link for something being shared out of mWeb or the app.
   * Minted once per thing shared, under that target's campaign, and reused by
   * everyone who shares it afterwards. Public: a pod is shared by signed-out
   * visitors too, and the destination is built from the ref rather than sent, so
   * a link can only ever point at something that already exists on Duncit.
   */
  shareLink: ShareLink;
  sharePodIdea: PodIdea;
  /**
   * Sign as the acting user. Locks the contract once nobody is left to sign,
   * and moves a DRAFT to ACTIVE — a signed contract is in force.
   */
  signContract: Contract;
  /** Sign as the acting user. Locks the contract once nobody is left to sign. */
  signLegalDocument: LegalDocument;
  signupWithGoogle: AuthPayload;
  skipWhatsAppOtp: User;
  /** Place an outbound AI call (Servam-driven) using a Static Content prompt and Servam voice. */
  startCrmAiCall: CrmAiCallResult;
  /** Place a portal call: Twilio rings the agent leg (agent_number, else the user's profile phone), then bridges to the customer. */
  startCrmPortalCall: CrmAiCallResult;
  /**
   * Start a production -> staging clone and return the job immediately. The copy
   * itself continues on the server, so closing the browser cannot interrupt it.
   * SUPER_ADMIN only, and audited.
   */
  startDataClone: DataCloneJob;
  startRecordedUserCall: UserContactAction;
  startSupportChat: SupportChatSession;
  /**
   * Compress an already direct-uploaded ImageKit video with FFmpeg and re-upload
   * the result. Poll videoCompressionJob(job_id) for the real percentage.
   * An optional trim window (start + duration, seconds) cuts the video during
   * the FFmpeg pass — used by 15s video stories; trim always re-encodes even
   * when compression is disabled for the surface.
   */
  startVideoCompression: VideoCompressionJob;
  /**
   * Stop a running ad early. It becomes EXPIRED and its window is closed now,
   * which is what actually takes it off the slots.
   */
  stopAdRequest: AdRequest;
  /**
   * Ask for the account to be removed.
   *
   * This does NOT delete anything yet — the request is queued, and the account
   * survives until the grace period is up. What it DOES do immediately is end
   * the account: every token it has handed out stops being accepted, the live
   * surfaces are told to sign out, and no door will mint it another one. The
   * window is time for the decision to be reversed from the console, not time
   * to keep using the account.
   *
   * Asking twice returns the request already open.
   */
  submitAccountDeletionRequest: AccountDeletionRequest;
  /** Advertiser submits a request; server quotes the cost and assigns the trace id. */
  submitAdRequest: AdRequest;
  /** Submit a structured address for ADDRESS verification — moves it to PENDING. */
  submitAddressVerification: Verification;
  /**
   * File an in-app problem report. Any signed-in user; identity is server-stamped.
   *
   * The report is SAVED first and read in the Support portal; the Slack post is a
   * notification whose failure is recorded on the row. It used to be Slack-only,
   * so an unconfigured channel threw the report away.
   */
  submitAppFeedback: SlackSendResult;
  submitBouncerFeedback: BouncerFeedback;
  submitContactForm: ContactSubmitResult;
  /** Partner: submit an owned brand for onboarding review. */
  submitEcommBrand: EcommBrand;
  /** Products portal: raise a brand/product change request for admin approval (Task B item 2). */
  submitEcommChangeRequest: ApprovalRequest;
  submitFaqQuestion: FaqSubmitResult;
  /**
   * Raise a grievance.
   *
   * Deliberately open: someone with a grievance about Duncit may have already
   * deleted their account, so requiring one would close the only door they have.
   */
  submitGrievance: GrievanceTicket;
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
  /**
   * PUBLIC and unauthenticated, on purpose: somebody locked out of every
   * console is exactly who this form exists for.
   */
  submitStatusReport: StatusReportSubmitResult;
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
  /**
   * Add the caller to the notify-me list. The address is read from their
   * profile, never from the request, so nobody can subscribe another inbox.
   */
  subscribeMembershipNews: MembershipNewsSubscriber;
  subscribeNewsletter: NewsletterSubscribeResult;
  /** Support agents can create a user account on a caller's behalf. */
  supportCreateUser: User;
  /** Run a shell command in the API container and return its output. SUPER_ADMIN only — host-root-equivalent via the mounted docker socket, and audited. */
  techExec: TechExecResult;
  /** Re-ask the registry now, ignoring the cache. */
  techRefreshPackageUpdates: TechPackageUpdatesReport;
  /** Restart one Docker container by name (SUPER_ADMIN / TECH_MANAGER). Audited. */
  techRestartContainer: TechRestartResult;
  testCommsProvider: CommsProviderTestResult;
  /** Re-prove an already-saved connection — a rotated password changes the answer. */
  testDataCloneConnection: DataCloneSettings;
  /**
   * Prove one entry's saved credentials against its vendor.
   *
   * Takes the ENTRY id rather than a category on purpose: a category can hold
   * several entries and only one of them is the default, so a category-keyed
   * test would report a credential the operator is not looking at. The category
   * comes from the entry, which is what keeps this ONE mutation instead of a
   * near-identical one per provider.
   *
   * Some of these perform a REAL action — AiSensy's key can make no call except
   * sending, so testing it sends a WhatsApp message.
   */
  testEnvConnection: EnvConnectionTestResult;
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
  /**
   * Start a build from the portal. Tech/Super admin only.
   *
   * Writes a QUEUED row, then dispatches the platform's workflow with the
   * operator's choices as inputs. The row is written FIRST and deleted again if
   * GitHub refuses the dispatch, so a build the operator can see always
   * corresponds to a run GitHub accepted.
   *
   * The run reports back to THIS server whatever env its app is pointed at, so
   * a build started here is visible here. That also means a staging portal needs
   * its own CI token in the repo secrets.
   */
  triggerAppBuild: TriggerAppBuildResult;
  unfollowClub: User;
  unfollowPod: User;
  unfollowUser: User;
  unsubscribeAllByToken: MailPreference;
  unsubscribeNewsletter: Scalars['Boolean']['output'];
  /** Change when the sweep runs, and whether it runs at all. */
  updateAccountDeletionCron: AccountDeletionCronSettings;
  /**
   * Change the retention window, in whole days (1–365).
   *
   * Applies to requests filed after it. A member already waiting keeps the date
   * they were promised — moving somebody's deletion date under them is exactly
   * what a grace period is supposed to prevent.
   */
  updateAccountDeletionSettings: AccountDeletionSettings;
  /** Marketing edits per-position per-day pricing. */
  updateAdPricing: AdPricing;
  /** AI Portal: save the chip/dialog copy and the image-analysis prompt. */
  updateAiMonitoringSettings: AiMonitoringSettings;
  /** On a code prompt only the body, note and target model are applied — the rest belongs to the catalogue. */
  updateAiPrompt: AiPrompt;
  updateAppBuildSettings: AppBuildSettings;
  updateAppPopup: AppPopup;
  updateAppSettings: AppSettings;
  /** Owner edits the editable subset of an APPROVED venue (documents append-only). */
  updateApprovedVenue: Venue;
  /**
   * Rewrites the template while the offer is not yet live. The economics are
   * re-checked against whoever has already enrolled, and the category is locked
   * once a host or a club is on it.
   */
  updateAutoPod: AutoPod;
  updateBadge: Badge;
  updateBranding: Branding;
  updateBugStatus: Bug;
  updateCategory: Category;
  updateChallenge: Challenge;
  updateClub: Club;
  updateClubAdminProfile: ClubAdminProfile;
  /** Finance: set what a pod join, a shop order, a referral and a pod rating each pay. */
  updateCoinSettings: CoinSettings;
  updateCommsProvider: CommsProvider;
  updateContactStatus: ContactSubmission;
  updateContentReportStatus: ContentReport;
  updateContract: Contract;
  updateCoupon: Coupon;
  updateCrmCallPrompt: CrmCallPrompt;
  updateCrmDynamicField: CrmDynamicField;
  updateCrmEmailTemplate: CrmEmailTemplate;
  updateCrmManagedOption: CrmManagedOption;
  updateCrmReminder: CrmReminder;
  updateCrmService: CrmService;
  updateCrmServiceOffered: CrmServiceOffered;
  updateEcommLead: EcommLead;
  updateEmailFragment: EmailFragment;
  updateEmailTemplate: EmailTemplate;
  updateEnvEntry: EnvEntry;
  updateExpense: Expense;
  updateFaq: Faq;
  updateFaqSubmissionStatus: FaqSubmission;
  updateFeatureFlag: FeatureFlag;
  updateFinanceSettings: FinanceSettings;
  /** Finance: set the amounts offered and how long a card lives. */
  updateGiftCardSettings: GiftCardSettings;
  updateGrievanceStatus: GrievanceTicket;
  updateHostLead: HostLead;
  updateInterview: Interview;
  updateInventoryProduct: InventoryProduct;
  updateJobApplicationStatus: JobApplication;
  updateLeaderboardSettings: LeaderboardSettings;
  updateLegalDocument: LegalDocument;
  updateLocation: Location;
  /** Support portal: steps 2 and 3 — the reply message, the queue and the window. */
  updateMailAutomationRule: MailAutomationAccount;
  /** Tags, and the focus rectangle a smart crop uses. */
  updateMediaFile: MediaItem;
  updateMeeting: OnboardingMeeting;
  updateMeetingAvailability: MeetingAvailability;
  updateMembershipBenefit: MembershipBenefit;
  updateMembershipPlan: MembershipPlan;
  updateMyInterests: User;
  updateMyPetProfile: User;
  updateMyProductListing: InventoryProduct;
  updateMyProductListingQuantity: InventoryProduct;
  /** Update a listing's low-stock threshold + notify toggle without re-triggering approval. */
  updateMyProductSettings: InventoryProduct;
  updateMyProfile: User;
  updateMyProfileVisibility: User;
  /** Replace the occasional-icon windows (admin Branding). */
  updateOccasionalIcons: Array<OccasionalIcon>;
  updatePod: Pod;
  updatePodExpense: PodExpense;
  updatePodIdea: PodIdea;
  updatePodPlan: PodPlan;
  /** Replace the global Pod Shop slider media (managed from the products portal). */
  updatePodShopSlider: Array<PodShopSliderMedia>;
  updatePolicy: Policy;
  updateRateLimitRule: RateLimitRule;
  updateRateLimitSettings: RateLimitSettings;
  /** Finance: what a referral pays and what a member's share sheet says. */
  updateReferralSettings: ReferralSettings;
  /** Support portal: edit the chips and prompt the app renders. */
  updateReportProblemConfig: ReportProblemConfig;
  /** Support portal: choose whether reports are announced on Slack, and where. */
  updateReportProblemSlack: ReportProblemSlackSettings;
  updateRole: Role;
  updateSomethingForYouItem: SomethingForYouItem;
  /**
   * Triage one report: its state, the note, and any images the operator added.
   * Omitting staff_images leaves the ones already there alone.
   */
  updateStatusReport: StatusReport;
  updateSurvey: Survey;
  updateTelemetrySettings: TelemetrySettings;
  /** Set a ticket's priority flag (High/Medium/Low) — support agents only. */
  updateTicketPriority: Ticket;
  updateTicketStatus: Ticket;
  updateUploadSettings: UploadSetting;
  updateUser: User;
  updateVenueLead: VenueLead;
  /** Owner (or admin) updates operating hours, weekly-off, holidays + booking rules. */
  updateVenueSettings: Venue;
  updateVenueSlot: VenueSlot;
  /** Change the rate card. Applies to sends made from now on — past sends keep the rate they froze. */
  updateWaPricing: WaPricing;
  updateWebsiteContent: WebsiteContentItem;
  updateWebsiteNavItem: WebsiteNavItem;
  updateWithdrawalMinimums: WithdrawalMinimums;
  /**
   * Server-side ImageKit upload for admin/device files. This avoids browser
   * signature failures by keeping the private-key upload on the API server.
   */
  uploadImageToImagekit: UploadedImage;
  upsertLocale: Locale;
  /** Create or correct one model's rate. Past rows keep the cost they were written with. */
  upsertOpenAiModelPrice: OpenAiModelPrice;
  upsertTranslation: Translation;
  /** Venue enrols: accepts the offer and commits one of its own slots. */
  venueAcceptAutoPod: AutoPod;
  /** Venue owner cancels an UPCOMING pod booked at their venue: refunds every successful attendee payment, emails the audience and deducts the Account Health penalty configured in Admin > Pods > Pod Settings. */
  venueCancelPod: VenueCancelPodResult;
  /** The venue takes its slot back while the offer is still enrolling; the offer returns to venues' lists and the venue pays the Pod Settings penalty. */
  venueWithdrawAutoPod: AutoPod;
  verifyEmailVerificationOtp: User;
  verifyEventTicketQr: EventTicketVerifyResult;
  /**
   * Step two: prove the code and get the grant that sets the password.
   *
   * Its own step so a wrong code is reported before anybody types a new password
   * twice. The code is single-use, expires with the challenge, and a wrong one
   * costs an attempt.
   */
  verifyPasswordResetCode: PasswordResetVerifyResult;
  /**
   * Check a code that was read out — the attendee's own, or a companion's.
   *
   * Purpose-agnostic on purpose: verifying grants nothing by itself, and the
   * step that SPENDS the proof (the mark, or the door's companion record)
   * re-checks the purpose, the booking and the number it was raised for.
   */
  verifyPodAttendanceOtp: Scalars['Boolean']['output'];
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


export type MutationAcceptFollowRequestArgs = {
  request_id: Scalars['ID']['input'];
};


export type MutationAcceptPoliciesArgs = {
  policy_ids: Array<Scalars['ID']['input']>;
  surface?: InputMaybe<PolicyAcceptanceSurface>;
};


export type MutationAcknowledgeBouncerSosArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAcknowledgeHostRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddAudienceListMembersArgs = {
  id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
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


export type MutationAddPodPartyMediaArgs = {
  media: Array<PodMediaInput>;
  pod_doc_id: Scalars['ID']['input'];
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


export type MutationAdjustUserCoinsArgs = {
  coins: Scalars['Int']['input'];
  direction: CoinAdjustDirection;
  reason: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
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


export type MutationAdminSetHostCategoriesArgs = {
  categories: Array<HostCategoryInput>;
  host_doc_id: Scalars['ID']['input'];
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


export type MutationAgentChatArgs = {
  input: AgentChatInput;
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


export type MutationAiImproveRichTextArgs = {
  input: AiRichTextImproveInput;
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


export type MutationApproveClubAdminProfileArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
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


export type MutationApproveWarehouseRequestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationArchiveContractArgs = {
  id: Scalars['ID']['input'];
};


export type MutationArchiveInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationAskBotChatArgs = {
  input: AskBotChatInput;
};


export type MutationAssignClubAdminClubsArgs = {
  club_ids: Array<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationAssignTicketArgs = {
  assignee_id?: InputMaybe<Scalars['ID']['input']>;
  ticket_id: Scalars['ID']['input'];
};


export type MutationAssignUserRolesArgs = {
  role_keys: Array<Scalars['String']['input']>;
  user_id: Scalars['ID']['input'];
};


export type MutationAttachStaffCallRecordingArgs = {
  call_id: Scalars['ID']['input'];
  url: Scalars['String']['input'];
};


export type MutationAwardBadgeManuallyArgs = {
  badge_doc_id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  user_id: Scalars['ID']['input'];
};


export type MutationBackoutPodArgs = {
  pod_doc_id: Scalars['ID']['input'];
  seats?: InputMaybe<Scalars['Int']['input']>;
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


export type MutationCancelAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCancelBackoutPodArgs = {
  backout_id?: InputMaybe<Scalars['ID']['input']>;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationCancelFollowRequestArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationCancelMeetingArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationCancelMyMeetingArgs = {
  kind: SurveyKind;
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCancelWaCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
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


export type MutationClearStaffThreadArgs = {
  peer_id: Scalars['ID']['input'];
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


export type MutationClubAdminForceAttendanceArgs = {
  companions?: InputMaybe<Array<PodForcedCompanionInput>>;
  membership_id: Scalars['ID']['input'];
  otp_challenge_id?: InputMaybe<Scalars['ID']['input']>;
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


export type MutationClubClaimAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  club_id: Scalars['ID']['input'];
};


export type MutationCompleteDbBackupUploadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCompletePasswordResetArgs = {
  input: CompletePasswordResetInput;
};


export type MutationCompletePodSettlementArgs = {
  input: CompletePodInput;
};


export type MutationConfirmContactPhoneChangeArgs = {
  field: ContactPhoneField;
  otp: Scalars['String']['input'];
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
};


export type MutationConfirmEmailChangeArgs = {
  email: Scalars['String']['input'];
  otp: Scalars['String']['input'];
};


export type MutationConnectGoogleAccountArgs = {
  input: GoogleAuthInput;
};


export type MutationCreateAiPromptArgs = {
  input: CreateAiPromptInput;
};


export type MutationCreateAisensyCampaignArgs = {
  input: CreateAisensyCampaignInput;
};


export type MutationCreateAisensyTemplateArgs = {
  input: CreateAisensyTemplateInput;
};


export type MutationCreateApiKeyArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreateAppPopupArgs = {
  input: AppPopupInput;
};


export type MutationCreateAudienceListArgs = {
  input: AudienceListInput;
};


export type MutationCreateAutoPodArgs = {
  club_id?: InputMaybe<Scalars['ID']['input']>;
  input: CreateAutoPodInput;
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


export type MutationCreateContractArgs = {
  input: CreateContractInput;
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


export type MutationCreateEmailFragmentArgs = {
  input: CreateEmailFragmentInput;
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


export type MutationCreateMembershipBenefitArgs = {
  input: MembershipBenefitInput;
};


export type MutationCreateMembershipPlanArgs = {
  input: MembershipPlanInput;
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


export type MutationCreatePodExpenseArgs = {
  input: PodExpenseInput;
  pod_doc_id: Scalars['ID']['input'];
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


export type MutationCreateRateLimitRuleArgs = {
  input: RateLimitRuleInput;
};


export type MutationCreateRazorpayGiftCardOrderArgs = {
  input: GiftCardCheckoutInput;
};


export type MutationCreateRazorpayOrderArgs = {
  input: RazorpayOrderInput;
};


export type MutationCreateRazorpayProductOrderArgs = {
  input: ProductCheckoutInput;
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


export type MutationCreateShortLinkArgs = {
  input: ShortLinkInput;
};


export type MutationCreateSlotTemplateArgs = {
  input: CreateSlotTemplateInput;
};


export type MutationCreateSomethingForYouItemArgs = {
  input: SomethingForYouInput;
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


export type MutationCreateWaCampaignNameArgs = {
  input: WaCampaignNameInput;
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


export type MutationDbBackupUploadAuthArgs = {
  fileName: Scalars['String']['input'];
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


export type MutationDeleteAdRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAdjustmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAiPromptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAisensyTemplateArgs = {
  template_id: Scalars['ID']['input'];
};


export type MutationDeleteAppBuildArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAppPopupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAudienceListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteBrandPickupLocationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBugsArgs = {
  ids: Array<Scalars['ID']['input']>;
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


export type MutationDeleteClubAdminProfileArgs = {
  email: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  password: Scalars['String']['input'];
};


export type MutationDeleteCommsProviderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteContractArgs = {
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


export type MutationDeleteDbBackupArgs = {
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


export type MutationDeleteEmailFragmentArgs = {
  key: Scalars['String']['input'];
};


export type MutationDeleteEmailLogsArgs = {
  ids: Array<Scalars['ID']['input']>;
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


export type MutationDeleteLocaleArgs = {
  code: Scalars['String']['input'];
};


export type MutationDeleteLocationArgs = {
  location_doc_id: Scalars['ID']['input'];
};


export type MutationDeleteMarketingCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type MutationDeleteMediaFilesArgs = {
  fileIds: Array<Scalars['ID']['input']>;
};


export type MutationDeleteMembershipBenefitArgs = {
  benefit_id: Scalars['ID']['input'];
};


export type MutationDeleteMembershipPlanArgs = {
  plan_id: Scalars['ID']['input'];
};


export type MutationDeleteMyAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMyBrandPickupLocationArgs = {
  brand_doc_id: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
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


export type MutationDeletePodExpenseArgs = {
  expense_doc_id: Scalars['ID']['input'];
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


export type MutationDeleteRateLimitRuleArgs = {
  rule_id: Scalars['ID']['input'];
};


export type MutationDeleteRoleArgs = {
  role_id: Scalars['ID']['input'];
};


export type MutationDeleteShortLinkArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSlotTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSomethingForYouItemArgs = {
  item_id: Scalars['ID']['input'];
};


export type MutationDeleteStaffMessageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteStatusReportsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationDeleteSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTranslationArgs = {
  key: Scalars['String']['input'];
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


export type MutationDeleteWaCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type MutationDeleteWaCampaignNameArgs = {
  id: Scalars['ID']['input'];
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


export type MutationDenyWarehouseRequestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDisconnectMailAutomationAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDismissAppPopupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDismissMeetingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDummyCheckoutArgs = {
  input: DummyCheckoutInput;
};


export type MutationDummyGiftCardCheckoutArgs = {
  input: DummyGiftCardCheckoutInput;
};


export type MutationDummyProductCheckoutArgs = {
  input: DummyProductCheckoutInput;
};


export type MutationDuplicateInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationEditAdjustmentArgs = {
  input: EditAdjustmentInput;
};


export type MutationEditStaffMessageArgs = {
  id: Scalars['ID']['input'];
  text: Scalars['String']['input'];
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


export type MutationForwardStaffMessageArgs = {
  id: Scalars['ID']['input'];
  to_user_id: Scalars['ID']['input'];
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


export type MutationGetImagekitAuthArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  surface?: InputMaybe<UploadSurface>;
};


export type MutationGrantAdminAccessArgs = {
  user_id: Scalars['ID']['input'];
};


export type MutationHostAssignAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  location_id?: InputMaybe<Scalars['ID']['input']>;
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  pod_amount?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationHostDeletePodArgs = {
  pod_doc_id: Scalars['ID']['input'];
  reason_note?: InputMaybe<Scalars['String']['input']>;
  reason_subject: Scalars['String']['input'];
};


export type MutationHostMarkPodAttendanceArgs = {
  membership_id: Scalars['ID']['input'];
  otp_challenge_id?: InputMaybe<Scalars['ID']['input']>;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationHostResubmitPodArgs = {
  input: HostResubmitPodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationHostScanPodTicketArgs = {
  companions?: InputMaybe<Array<PodCompanionInput>>;
  pod_doc_id: Scalars['ID']['input'];
  token: Scalars['String']['input'];
};


export type MutationHostUpdatePodArgs = {
  input: HostUpdatePodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationHostWithdrawAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
};


export type MutationImportBugsArgs = {
  bugs: Array<BugImportInput>;
};


export type MutationImportEnvEntriesArgs = {
  entries: Array<ImportEnvEntryInput>;
};


export type MutationImportFeatureFlagsArgs = {
  flags: Array<ImportFeatureFlagInput>;
};


export type MutationImportRemoteImageToImagekitArgs = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  remoteUrl: Scalars['String']['input'];
  surface?: InputMaybe<Scalars['String']['input']>;
};


export type MutationImportRemoteMediaToImagekitArgs = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['String']['input']>;
  remoteUrl: Scalars['String']['input'];
  surface?: InputMaybe<Scalars['String']['input']>;
};


export type MutationImportTelemetryLogsArgs = {
  logs: Array<TelemetryLogImportInput>;
};


export type MutationImportTranslationKeysArgs = {
  entries: Array<TranslationValueEntry>;
  locale: Scalars['String']['input'];
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
  seats?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationJoinPodMeetingArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationJoinSlackChannelArgs = {
  channel: Scalars['ID']['input'];
};


export type MutationLinkGoogleAccountArgs = {
  input: GoogleAuthInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationLoginWithGoogleArgs = {
  input: GoogleAuthInput;
};


export type MutationLoginWithOtpArgs = {
  input: LoginWithOtpInput;
};


export type MutationLoginWithPortalOtpArgs = {
  input: PortalLoginOtpInput;
};


export type MutationMailAutomationConnectUrlArgs = {
  login_hint?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkBouncerCallbackContactedArgs = {
  conclusion?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  user_notification_doc_id: Scalars['ID']['input'];
};


export type MutationMarkStaffThreadReadArgs = {
  peer_id: Scalars['ID']['input'];
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


export type MutationNotifyPolicyAcceptedUsersArgs = {
  policy_doc_id: Scalars['ID']['input'];
  summary?: InputMaybe<Scalars['String']['input']>;
};


export type MutationPermanentlyDeleteInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationPinStaffMessageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationProcessBackoutRefundArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishPodDraftArgs = {
  draft_id: Scalars['ID']['input'];
  input: CreatePodInput;
};


export type MutationPurgeAccountCompletelyArgs = {
  request_doc_id: Scalars['ID']['input'];
};


export type MutationPurgeAccountTraceArgs = {
  input: PurgeAccountTraceInput;
};


export type MutationPurgeMediaCacheArgs = {
  url: Scalars['String']['input'];
};


export type MutationRaiseBouncerSosArgs = {
  input: RaiseSosInput;
};


export type MutationReactToPodMessageArgs = {
  emoji: Scalars['String']['input'];
  message_id: Scalars['ID']['input'];
};


export type MutationReactToStaffMessageArgs = {
  emoji: Scalars['String']['input'];
  id: Scalars['ID']['input'];
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


export type MutationRecordProductClickArgs = {
  product_doc_id: Scalars['ID']['input'];
  variant_id?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRecordProductViewArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationRecordShortLinkJourneyArgs = {
  click_id: Scalars['String']['input'];
  step: ShortLinkJourneyStep;
};


export type MutationRecordStoryViewArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type MutationRecordUserContactActionArgs = {
  input: RecordUserContactActionInput;
};


export type MutationRedeemGiftCardArgs = {
  code: Scalars['String']['input'];
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


export type MutationRejectAccountDeletionRequestArgs = {
  note: Scalars['String']['input'];
  request_doc_id: Scalars['ID']['input'];
};


export type MutationRejectClubAdminProfileArgs = {
  id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type MutationRejectEcommBrandArgs = {
  brand_doc_id: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
};


export type MutationRejectFollowRequestArgs = {
  request_id: Scalars['ID']['input'];
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


export type MutationRemindPodFeedbackArgs = {
  choice: PodFeedbackReminderChoice;
  pod_id: Scalars['ID']['input'];
};


export type MutationRemoveAudienceListMemberArgs = {
  id: Scalars['ID']['input'];
  user_id: Scalars['ID']['input'];
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


export type MutationRemovePodPartyMediaArgs = {
  pod_doc_id: Scalars['ID']['input'];
  url: Scalars['String']['input'];
};


export type MutationRemoveUserRoleArgs = {
  role_key: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationRenameMediaFileArgs = {
  fileId: Scalars['ID']['input'];
  newFileName: Scalars['String']['input'];
  purgeCache?: InputMaybe<Scalars['Boolean']['input']>;
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


export type MutationReportAppBuildArgs = {
  input: ReportAppBuildInput;
};


export type MutationReportStoryArgs = {
  details?: InputMaybe<Scalars['String']['input']>;
  post_doc_id: Scalars['ID']['input'];
  reason: ReportReason;
};


export type MutationRequestBouncerCallbackArgs = {
  input: RequestCallbackInput;
};


export type MutationRequestCommunicationTranscriptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestContactPhoneChangeOtpArgs = {
  field: ContactPhoneField;
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
};


export type MutationRequestDbBackupDownloadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestEmailChangeOtpArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestLoginOtpArgs = {
  input: RequestLoginOtpInput;
};


export type MutationRequestMeetingArgs = {
  input: RequestMeetingInput;
  kind: SurveyKind;
};


export type MutationRequestPasswordChangeOtpArgs = {
  input: RequestPasswordChangeInput;
};


export type MutationRequestPasswordResetCodeArgs = {
  input: PasswordResetLookupInput;
};


export type MutationRequestPasswordResetOtpArgs = {
  email: Scalars['String']['input'];
};


export type MutationRequestPodAttendanceOtpArgs = {
  input: PodAttendanceOtpInput;
};


export type MutationRequestPodCompanionOtpArgs = {
  input: PodAttendanceOtpInput;
};


export type MutationRequestPortalAccessArgs = {
  portal_key: Scalars['String']['input'];
};


export type MutationRequestPortalLoginOtpArgs = {
  input: PortalLoginOtpRequestInput;
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


export type MutationResetAiPromptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResetDashboardLayoutArgs = {
  dashboard_id: Scalars['ID']['input'];
};


export type MutationResetEmailFragmentArgs = {
  key: Scalars['String']['input'];
};


export type MutationResetPasswordWithOtpArgs = {
  input: ResetPasswordInput;
};


export type MutationResetRateLimitRuleCountersArgs = {
  rule_id: Scalars['ID']['input'];
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


export type MutationRestoreDbBackupArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRestoreInventoryProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type MutationRetryPaymentStepsArgs = {
  payment_doc_id: Scalars['ID']['input'];
  step_keys?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationRetryWaCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
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


export type MutationSaveDashboardLayoutArgs = {
  dashboard_id: Scalars['ID']['input'];
  items: Array<DashboardLayoutItemInput>;
};


export type MutationSaveDataCloneConnectionArgs = {
  input: DataCloneConnectionInput;
  role: DataCloneRole;
};


export type MutationSaveDbBackupSettingsArgs = {
  input: DbBackupSettingsInput;
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


export type MutationSaveGrievanceOfficerArgs = {
  input: SaveGrievanceOfficerInput;
};


export type MutationSaveLeadSurveyResponseArgs = {
  answers: Array<SurveyAnswerInput>;
  entity: LeadSurveyEntity;
  lead_id: Scalars['ID']['input'];
  survey_id: Scalars['ID']['input'];
};


export type MutationSaveMyAddressArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  input: UserAddressInput;
};


export type MutationSaveMyBrandPickupLocationArgs = {
  brand_doc_id: Scalars['ID']['input'];
  id?: InputMaybe<Scalars['ID']['input']>;
  input: BrandPickupLocationInput;
};


export type MutationSavePodDraftArgs = {
  draft_id?: InputMaybe<Scalars['ID']['input']>;
  input: PodDraftInput;
};


export type MutationSavePushSubscriptionArgs = {
  input: PushSubscriptionInput;
};


export type MutationSaveShellWorkspaceStateArgs = {
  input: ShellWorkspaceStateInput;
};


export type MutationSaveStaffChatStateArgs = {
  input: StaffChatStateInput;
};


export type MutationSendAisensyCampaignArgs = {
  input: SendAisensyCampaignInput;
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


export type MutationSendSlackMessageArgs = {
  input: SendSlackMessageInput;
};


export type MutationSendStaffMessageArgs = {
  attachment_name?: InputMaybe<Scalars['String']['input']>;
  attachment_peaks?: InputMaybe<Array<Scalars['Float']['input']>>;
  attachment_size?: InputMaybe<Scalars['Int']['input']>;
  attachment_type?: InputMaybe<Scalars['String']['input']>;
  attachment_url?: InputMaybe<Scalars['String']['input']>;
  reply_to_id?: InputMaybe<Scalars['ID']['input']>;
  text: Scalars['String']['input'];
  to_user_id: Scalars['ID']['input'];
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


export type MutationSendWaCampaignArgs = {
  input: SendWaCampaignInput;
};


export type MutationSendWaTestMessageArgs = {
  input: SendWaTestInput;
};


export type MutationSetAllMyMailPreferencesArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetAllMyWhatsappPreferencesArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetAutoPodActiveArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  is_active: Scalars['Boolean']['input'];
};


export type MutationSetBrandCommissionArgs = {
  brand_doc_id: Scalars['ID']['input'];
  product_commission_pct: Scalars['Float']['input'];
};


export type MutationSetClubAdminCommissionArgs = {
  commission_pct?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationSetClubAdminProfileActiveArgs = {
  id: Scalars['ID']['input'];
  is_active: Scalars['Boolean']['input'];
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


export type MutationSetDefaultMyAddressArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDefaultMyBrandPickupLocationArgs = {
  brand_doc_id: Scalars['ID']['input'];
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


export type MutationSetFeedbackReportStatusArgs = {
  id: Scalars['ID']['input'];
  status: FeedbackStatus;
};


export type MutationSetHostActiveArgs = {
  active: Scalars['Boolean']['input'];
  host_doc_id: Scalars['ID']['input'];
};


export type MutationSetHostDeductionsArgs = {
  host_commission_pct: Scalars['Float']['input'];
  user_id: Scalars['ID']['input'];
};


export type MutationSetInventoryProductActiveArgs = {
  active: Scalars['Boolean']['input'];
  product_doc_id: Scalars['ID']['input'];
};


export type MutationSetLegalDocumentActiveArgs = {
  id: Scalars['ID']['input'];
  is_active: Scalars['Boolean']['input'];
};


export type MutationSetMailPreferenceByTokenArgs = {
  category: Scalars['String']['input'];
  e: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  t: Scalars['String']['input'];
};


export type MutationSetMyEcommBrandActiveArgs = {
  active: Scalars['Boolean']['input'];
  brand_doc_id: Scalars['ID']['input'];
};


export type MutationSetMyLocaleArgs = {
  locale: Scalars['String']['input'];
};


export type MutationSetMyMailPreferenceArgs = {
  category: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetMyOtpChannelArgs = {
  channel: CommChannel;
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetMyProductListingActiveArgs = {
  active: Scalars['Boolean']['input'];
  product_doc_id: Scalars['ID']['input'];
};


export type MutationSetMySelectedLocationArgs = {
  location_id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSetMyUsernameArgs = {
  username: Scalars['String']['input'];
};


export type MutationSetMyWhatsappPreferenceArgs = {
  category: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetPodIdeaStatusArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
  status: PodIdeaStatus;
};


export type MutationSetPortalAppFeaturesArgs = {
  apps_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  chat_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  key: Scalars['String']['input'];
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


export type MutationSetRateLimitRuleEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  rule_id: Scalars['ID']['input'];
};


export type MutationSetShortLinkActiveArgs = {
  id: Scalars['ID']['input'];
  is_active: Scalars['Boolean']['input'];
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


export type MutationSetWhatsappDefaultMediaArgs = {
  filename?: InputMaybe<Scalars['String']['input']>;
  kind: WaMediaKind;
  url: Scalars['String']['input'];
};


export type MutationSetWhatsappScenarioEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  event_key: Scalars['String']['input'];
};


export type MutationSetWhatsappScenarioMediaArgs = {
  event_key: Scalars['String']['input'];
  filename?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};


export type MutationShareContractArgs = {
  id: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};


export type MutationShareLegalDocumentArgs = {
  id: Scalars['ID']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};


export type MutationShareLinkArgs = {
  ref: Scalars['ID']['input'];
  target: ShareLinkTarget;
};


export type MutationSharePodIdeaArgs = {
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationSignContractArgs = {
  id: Scalars['ID']['input'];
  input: SignContractInput;
};


export type MutationSignLegalDocumentArgs = {
  id: Scalars['ID']['input'];
  input: SignLegalDocumentInput;
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


export type MutationStartVideoCompressionArgs = {
  folder?: InputMaybe<Scalars['String']['input']>;
  force_transcode?: InputMaybe<Scalars['Boolean']['input']>;
  remote_url: Scalars['String']['input'];
  surface?: InputMaybe<Scalars['String']['input']>;
  trim_duration_seconds?: InputMaybe<Scalars['Float']['input']>;
  trim_start_seconds?: InputMaybe<Scalars['Float']['input']>;
};


export type MutationStopAdRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSubmitAccountDeletionRequestArgs = {
  input: SubmitAccountDeletionRequestInput;
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


export type MutationSubmitAppFeedbackArgs = {
  input: AppFeedbackInput;
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


export type MutationSubmitGrievanceArgs = {
  input: SubmitGrievanceInput;
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


export type MutationSubmitStatusReportArgs = {
  input: SubmitStatusReportInput;
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


export type MutationTechExecArgs = {
  command: Scalars['String']['input'];
};


export type MutationTechRestartContainerArgs = {
  name: Scalars['String']['input'];
};


export type MutationTestCommsProviderArgs = {
  id: Scalars['ID']['input'];
  recipient: Scalars['String']['input'];
};


export type MutationTestDataCloneConnectionArgs = {
  role: DataCloneRole;
};


export type MutationTestEnvConnectionArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<EnvConnectionTestInput>;
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


export type MutationTriggerAppBuildArgs = {
  input: TriggerAppBuildInput;
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


export type MutationUnsubscribeAllByTokenArgs = {
  e: Scalars['String']['input'];
  t: Scalars['String']['input'];
};


export type MutationUnsubscribeNewsletterArgs = {
  email: Scalars['String']['input'];
};


export type MutationUpdateAccountDeletionCronArgs = {
  input: UpdateAccountDeletionCronInput;
};


export type MutationUpdateAccountDeletionSettingsArgs = {
  retention_days: Scalars['Int']['input'];
};


export type MutationUpdateAdPricingArgs = {
  input: UpdateAdPricingInput;
};


export type MutationUpdateAiMonitoringSettingsArgs = {
  input: UpdateAiMonitoringSettingsInput;
};


export type MutationUpdateAiPromptArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAiPromptInput;
};


export type MutationUpdateAppBuildSettingsArgs = {
  input: UpdateAppBuildSettingsInput;
};


export type MutationUpdateAppPopupArgs = {
  id: Scalars['ID']['input'];
  input: AppPopupInput;
};


export type MutationUpdateAppSettingsArgs = {
  input: UpdateAppSettingsInput;
};


export type MutationUpdateApprovedVenueArgs = {
  input: UpdateApprovedVenueInput;
  venue_id: Scalars['ID']['input'];
};


export type MutationUpdateAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  input: UpdateAutoPodInput;
};


export type MutationUpdateBadgeArgs = {
  badge_doc_id: Scalars['ID']['input'];
  input: UpdateBadgeInput;
};


export type MutationUpdateBrandingArgs = {
  input: UpdateBrandingInput;
};


export type MutationUpdateBugStatusArgs = {
  bug_id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
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


export type MutationUpdateClubAdminProfileArgs = {
  id: Scalars['ID']['input'];
  input: UpdateClubAdminProfileInput;
};


export type MutationUpdateCoinSettingsArgs = {
  input: CoinSettingsInput;
};


export type MutationUpdateCommsProviderArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommsProviderInput;
};


export type MutationUpdateContactStatusArgs = {
  contact_id: Scalars['ID']['input'];
  status: ContactStatus;
};


export type MutationUpdateContentReportStatusArgs = {
  id: Scalars['ID']['input'];
  input: UpdateContentReportStatusInput;
};


export type MutationUpdateContractArgs = {
  id: Scalars['ID']['input'];
  input: UpdateContractInput;
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


export type MutationUpdateEmailFragmentArgs = {
  input: UpdateEmailFragmentInput;
  key: Scalars['String']['input'];
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


export type MutationUpdateGiftCardSettingsArgs = {
  input: GiftCardSettingsInput;
};


export type MutationUpdateGrievanceStatusArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGrievanceStatusInput;
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


export type MutationUpdateLeaderboardSettingsArgs = {
  input: UpdateLeaderboardSettingsInput;
};


export type MutationUpdateLegalDocumentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLegalDocumentInput;
};


export type MutationUpdateLocationArgs = {
  input: UpdateLocationInput;
  location_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateMailAutomationRuleArgs = {
  input: MailAutomationRuleInput;
};


export type MutationUpdateMediaFileArgs = {
  customCoordinates?: InputMaybe<Scalars['String']['input']>;
  fileId: Scalars['ID']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationUpdateMeetingArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMeetingInput;
};


export type MutationUpdateMeetingAvailabilityArgs = {
  input: MeetingAvailabilityInput;
};


export type MutationUpdateMembershipBenefitArgs = {
  benefit_id: Scalars['ID']['input'];
  input: MembershipBenefitUpdateInput;
};


export type MutationUpdateMembershipPlanArgs = {
  input: MembershipPlanUpdateInput;
  plan_id: Scalars['ID']['input'];
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


export type MutationUpdateOccasionalIconsArgs = {
  input: Array<OccasionalIconInput>;
};


export type MutationUpdatePodArgs = {
  input: UpdatePodInput;
  pod_doc_id: Scalars['ID']['input'];
};


export type MutationUpdatePodExpenseArgs = {
  expense_doc_id: Scalars['ID']['input'];
  input: PodExpenseInput;
};


export type MutationUpdatePodIdeaArgs = {
  input: UpdatePodIdeaInput;
  pod_idea_doc_id: Scalars['ID']['input'];
};


export type MutationUpdatePodPlanArgs = {
  input: PodPlanUpdateInput;
  plan_id: Scalars['ID']['input'];
};


export type MutationUpdatePodShopSliderArgs = {
  input: Array<PodShopSliderMediaInput>;
};


export type MutationUpdatePolicyArgs = {
  input: UpdatePolicyInput;
  policy_doc_id: Scalars['ID']['input'];
};


export type MutationUpdateRateLimitRuleArgs = {
  input: RateLimitRuleInput;
  rule_id: Scalars['ID']['input'];
};


export type MutationUpdateRateLimitSettingsArgs = {
  input: RateLimitSettingsInput;
};


export type MutationUpdateReferralSettingsArgs = {
  input: ReferralSettingsInput;
};


export type MutationUpdateReportProblemConfigArgs = {
  input: UpdateReportProblemConfigInput;
};


export type MutationUpdateReportProblemSlackArgs = {
  input: UpdateReportProblemSlackInput;
};


export type MutationUpdateRoleArgs = {
  input: UpdateRoleInput;
  role_id: Scalars['ID']['input'];
};


export type MutationUpdateSomethingForYouItemArgs = {
  input: SomethingForYouInput;
  item_id: Scalars['ID']['input'];
};


export type MutationUpdateStatusReportArgs = {
  note?: InputMaybe<Scalars['String']['input']>;
  report_id: Scalars['ID']['input'];
  staff_images?: InputMaybe<Array<Scalars['String']['input']>>;
  status: StatusReportStatus;
};


export type MutationUpdateSurveyArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSurveyInput;
};


export type MutationUpdateTelemetrySettingsArgs = {
  input: UpdateTelemetrySettingsInput;
};


export type MutationUpdateTicketPriorityArgs = {
  priority: TicketPriority;
  ticket_id: Scalars['ID']['input'];
};


export type MutationUpdateTicketStatusArgs = {
  status: TicketStatus;
  ticket_id: Scalars['ID']['input'];
};


export type MutationUpdateUploadSettingsArgs = {
  input: UpdateUploadSettingInput;
  surface: UploadSurface;
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


export type MutationUpdateWaPricingArgs = {
  input: UpdateWaPricingInput;
};


export type MutationUpdateWebsiteContentArgs = {
  content_id: Scalars['ID']['input'];
  input: WebsiteContentInput;
};


export type MutationUpdateWebsiteNavItemArgs = {
  input: WebsiteNavItemInput;
  item_id: Scalars['ID']['input'];
};


export type MutationUpdateWithdrawalMinimumsArgs = {
  input: UpdateWithdrawalMinimumsInput;
};


export type MutationUploadImageToImagekitArgs = {
  allow_documents?: InputMaybe<Scalars['Boolean']['input']>;
  crop?: InputMaybe<UploadCropRectInput>;
  crop_preset?: InputMaybe<Scalars['String']['input']>;
  fileBase64: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  surface?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpsertLocaleArgs = {
  input: UpsertLocaleInput;
};


export type MutationUpsertOpenAiModelPriceArgs = {
  input: OpenAiModelPriceInput;
};


export type MutationUpsertTranslationArgs = {
  input: UpsertTranslationInput;
};


export type MutationVenueAcceptAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  slot_id: Scalars['ID']['input'];
  venue_id: Scalars['ID']['input'];
};


export type MutationVenueCancelPodArgs = {
  pod_id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationVenueWithdrawAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
};


export type MutationVerifyEmailVerificationOtpArgs = {
  otp: Scalars['String']['input'];
};


export type MutationVerifyEventTicketQrArgs = {
  token: Scalars['String']['input'];
};


export type MutationVerifyPasswordResetCodeArgs = {
  input: VerifyPasswordResetCodeInput;
};


export type MutationVerifyPodAttendanceOtpArgs = {
  challenge_id: Scalars['ID']['input'];
  otp: Scalars['String']['input'];
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

/** The caller's cards: held or redeemed by them, and the ones they gifted away. */
export type MyGiftCards = {
  __typename?: 'MyGiftCards';
  gifted: Array<GiftCard>;
  owned: Array<GiftCard>;
};

/**
 * One guest's own rating of a pod, exactly as they left it — the answers that
 * fill the form back in when they open the feedback link a second time.
 */
export type MyPodFeedback = {
  __typename?: 'MyPodFeedback';
  created_at: Scalars['String']['output'];
  message: Scalars['String']['output'];
  /** The OVERALL score. */
  rating: Scalars['Int']['output'];
  ratings: Array<BouncerAspectRating>;
  updated_at: Scalars['String']['output'];
};

/** The signed-in user's referral state — code, gift on offer and redemptions. */
export type MyReferral = {
  __typename?: 'MyReferral';
  code: Scalars['String']['output'];
  /** Coins EACH side of a referral earns — the referrer and the new member. */
  coins_per_referral: Scalars['Int']['output'];
  gift_description: Scalars['String']['output'];
  referred: Array<ReferralEntry>;
  /** Name of whoever referred this user; null when nobody has. */
  referred_by_name?: Maybe<Scalars['String']['output']>;
  /**
   * The Finance-written message a share sheet pre-fills, with its {code},
   * {link} and {coins} placeholders still in it. Empty when Finance has not
   * written one, which the apps answer with their shipped default.
   */
  share_message: Scalars['String']['output'];
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
  /**
   * The other user this row is about — the requester behind a FOLLOW_REQUEST,
   * the new follower behind a NEW_FOLLOWER. What the recipient's Follow Back
   * acts on.
   */
  action_actor_id?: Maybe<Scalars['ID']['output']>;
  /** The document the actions operate on — a FollowRequest id for FOLLOW_REQUEST. */
  action_ref_id?: Maybe<Scalars['ID']['output']>;
  /**
   * Live status of action_ref_id, so an answered request stops offering buttons.
   * Always null on a NEW_FOLLOWER row: there is no request behind it.
   */
  action_status?: Maybe<Scalars['String']['output']>;
  /** Set when this row carries inline actions instead of only being readable. */
  action_type?: Maybe<NotificationAction>;
  /** AUDIENCE_LIST scope only — members are recomputed at send time. */
  audience_list_id?: Maybe<Scalars['ID']['output']>;
  body: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  delivered_count: Scalars['Int']['output'];
  failed_count: Scalars['Int']['output'];
  /**
   * The signed-in viewer's follow state TOWARDS action_actor_id, so an accepted
   * request can offer Follow Back and hide it once the viewer already follows
   * them. NONE when there is no actor, no viewer, or the actor is the viewer.
   */
  follow_back_status: FollowStatus;
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

/**
 * Notifications the recipient can act on inline. FOLLOW_REQUEST renders
 * Accept / Deny against the FollowRequest in action_ref_id. NEW_FOLLOWER has
 * no document to answer — it renders Follow Back alone, which is the only way
 * a public profile (one that never receives a follow request) can follow a new
 * follower back from the inbox.
 */
export type NotificationAction =
  | 'FOLLOW_REQUEST'
  | 'NEW_FOLLOWER';

export type NotificationScope =
  /** Everybody currently matching a saved marketing audience list. */
  | 'AUDIENCE_LIST'
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

/**
 * A festive window. While the app clock sits inside [starts_at, ends_at] the
 * apps swap in this occasion's icons. The slug doubles as the folder name the
 * native app loads its pre-bundled icons from.
 */
export type OccasionalIcon = {
  __typename?: 'OccasionalIcon';
  ends_at: Scalars['String']['output'];
  /**
   * Which bundled fallback-icon NAME renders when icon_url is blank or fails
   * to load — one of @duncit/fallback-icons FALLBACK_ICON_NAMES.
   */
  fallback_icon: Scalars['String']['output'];
  /** Server-hosted icon. Native prefers its bundled copy for this slug. */
  icon_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  /** Higher wins when windows overlap, so a campaign can sit over a season. */
  sort_order: Scalars['Int']['output'];
  starts_at: Scalars['String']['output'];
};

export type OccasionalIconInput = {
  ends_at: Scalars['String']['input'];
  fallback_icon?: InputMaybe<Scalars['String']['input']>;
  icon_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  starts_at: Scalars['String']['input'];
};

export type OnboardingMeeting = {
  __typename?: 'OnboardingMeeting';
  /** Onboarding decision on the interviewer's feedback: NONE (not yet decided) | APPROVED | DENIED. */
  approval_status?: Maybe<Scalars['String']['output']>;
  /** Why onboarding staff cancelled it (null for self-cancels). */
  cancel_reason?: Maybe<Scalars['String']['output']>;
  /** True when a CANCELLED row was rejected by onboarding staff (display as 'Rejected' vs a user 'Cancelled'). */
  cancelled_by_staff?: Maybe<Scalars['Boolean']['output']>;
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
  /** Status of the linked onboarded record (DRAFT|SUBMITTED|APPROVED|REJECTED) for HOST/VENUE/ECOMM once the meeting is approved; null for CLUB_ADMIN or before an onboarded record exists. Drives the Earn re-application block. */
  onboarded_status?: Maybe<Scalars['String']['output']>;
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

/** USD per 1,000,000 tokens for one model. Editable — OpenAI re-prices models. */
export type OpenAiModelPrice = {
  __typename?: 'OpenAiModelPrice';
  id: Scalars['ID']['output'];
  input_per_1m: Scalars['Float']['output'];
  model: Scalars['String']['output'];
  output_per_1m: Scalars['Float']['output'];
  updated_at: Scalars['String']['output'];
};

export type OpenAiModelPriceInput = {
  input_per_1m: Scalars['Float']['input'];
  model: Scalars['String']['input'];
  output_per_1m: Scalars['Float']['input'];
};

/** Spend rolled up by one dimension — module or model. */
export type OpenAiSpendBucket = {
  __typename?: 'OpenAiSpendBucket';
  calls: Scalars['Int']['output'];
  cost_usd: Scalars['Float']['output'];
  key: Scalars['String']['output'];
  tokens: Scalars['Int']['output'];
};

export type OpenAiSpendPoint = {
  __typename?: 'OpenAiSpendPoint';
  calls: Scalars['Int']['output'];
  cost_usd: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  tokens: Scalars['Int']['output'];
};

/** The task/module filter options, served from the server catalogue. */
export type OpenAiTaskCatalogue = {
  __typename?: 'OpenAiTaskCatalogue';
  modules: Array<Scalars['String']['output']>;
  tasks: Array<OpenAiTaskOption>;
};

export type OpenAiTaskOption = {
  __typename?: 'OpenAiTaskOption';
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  module: Scalars['String']['output'];
};

/** Spend for one task in the catalogue. */
export type OpenAiTaskSpend = {
  __typename?: 'OpenAiTaskSpend';
  avg_duration_ms: Scalars['Int']['output'];
  calls: Scalars['Int']['output'];
  cost_usd: Scalars['Float']['output'];
  /** Calls that did not come back with an answer (failed or skipped). */
  failures: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  module: Scalars['String']['output'];
  task: Scalars['String']['output'];
  tokens: Scalars['Int']['output'];
};

export type OpenAiUsageDashboard = {
  __typename?: 'OpenAiUsageDashboard';
  all_time_calls: Scalars['Int']['output'];
  all_time_cost_usd: Scalars['Float']['output'];
  avg_duration_ms: Scalars['Int']['output'];
  by_model: Array<OpenAiSpendBucket>;
  by_module: Array<OpenAiSpendBucket>;
  by_task: Array<OpenAiTaskSpend>;
  completion_tokens: Scalars['Int']['output'];
  failed_calls: Scalars['Int']['output'];
  prices: Array<OpenAiModelPrice>;
  prompt_tokens: Scalars['Int']['output'];
  range_days: Scalars['Int']['output'];
  series: Array<OpenAiSpendPoint>;
  skipped_calls: Scalars['Int']['output'];
  success_calls: Scalars['Int']['output'];
  total_calls: Scalars['Int']['output'];
  total_cost_usd: Scalars['Float']['output'];
  total_tokens: Scalars['Int']['output'];
  /** Models seen in this range that have no rate card entry — their spend reads as zero. */
  unpriced_models: Array<Scalars['String']['output']>;
};

/**
 * One OpenAI request, as it happened — including the ones that failed and the
 * ones that never left because no key is configured.
 */
export type OpenAiUsageLog = {
  __typename?: 'OpenAiUsageLog';
  completion_tokens: Scalars['Int']['output'];
  /** USD, priced at the rate card in force when the call was made. */
  cost_usd: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  /** Context for this one call (entity, template key, lead id …). */
  detail: Scalars['String']['output'];
  duration_ms: Scalars['Int']['output'];
  error_message: Scalars['String']['output'];
  http_status: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  model: Scalars['String']['output'];
  /** Owning area — Moderation, CRM, Admin Tools … */
  module: Scalars['String']['output'];
  /** False when the model had no rate — the cost on this row is a floor, not a fact. */
  priced: Scalars['Boolean']['output'];
  prompt_tokens: Scalars['Int']['output'];
  request_preview: Scalars['String']['output'];
  response_preview: Scalars['String']['output'];
  /** SUCCESS | FAILED | SKIPPED */
  status: Scalars['String']['output'];
  /** Catalogue key the spend is attributed to, e.g. moderation.pod. */
  task: Scalars['String']['output'];
  task_label: Scalars['String']['output'];
  total_tokens: Scalars['Int']['output'];
  user_id?: Maybe<Scalars['String']['output']>;
};

export type OpenAiUsageLogTablePage = {
  __typename?: 'OpenAiUsageLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<OpenAiUsageLog>;
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
  /** Which variant of the product was bought — empty for variant-less products. */
  variant_id: Scalars['String']['output'];
  variant_label: Scalars['String']['output'];
  variant_sku: Scalars['String']['output'];
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

/** What happened when one medium was asked to carry a code. */
export type OtpDeliveryStatus =
  /** The provider refused it. */
  | 'FAILED'
  /** Genuinely handed to a provider. */
  | 'SENT'
  /** No transport is wired for this medium yet — the test code is returned instead. */
  | 'STUBBED';

/** How a one-time code is carried to the person it proves. */
export type OtpMedium =
  | 'SMS'
  | 'WHATSAPP';

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

/** Owner-scoped e-commerce KPIs. brand_doc_id narrows to one owned brand; omitted = all owned brands. */
export type PartnerEcommStats = {
  __typename?: 'PartnerEcommStats';
  approved_brands: Scalars['Int']['output'];
  approved_products: Scalars['Int']['output'];
  /** Gross value of the partner's sold line items (before Duncit commission). */
  gross_revenue: Scalars['Float']['output'];
  total_brands: Scalars['Int']['output'];
  total_items_sold: Scalars['Int']['output'];
  /** Distinct product orders containing at least one of the partner's brand lines (cancelled/failed/RTO excluded). */
  total_orders: Scalars['Int']['output'];
  total_products: Scalars['Int']['output'];
  total_warehouses: Scalars['Int']['output'];
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

/** Where a forgotten-password code is sent. */
export type PasswordResetChannel =
  | 'EMAIL'
  /** WhatsApp, on the number the account signed up with or added later. */
  | 'PHONE';

/**
 * Which account is recovering, and where its code should go.
 *
 * The fields the chosen channel does not use are ignored rather than required —
 * one input rather than two mutations, because everything after this step is the
 * same either way.
 */
export type PasswordResetLookupInput = {
  channel: PasswordResetChannel;
  /** EMAIL only. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** PHONE only — the dial code, e.g. +91. */
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  /** PHONE only — digits, without the dial code. */
  phone_number?: InputMaybe<Scalars['String']['input']>;
};

export type PasswordResetRequestResult = {
  __typename?: 'PasswordResetRequestResult';
  channel: PasswordResetChannel;
  /** ISO instant the code stops working. Null when nothing was sent. */
  expires_at?: Maybe<Scalars['String']['output']>;
  /** How long the code lasts, so no screen hard-codes the rule. */
  expires_in_minutes: Scalars['Int']['output'];
  ok: Scalars['Boolean']['output'];
  /**
   * False when there is no account with these details, or the account signs in
   * with Google and has no password to reset. No code is sent in either case.
   */
  registered: Scalars['Boolean']['output'];
  /** Seconds to wait before another code can be asked for. */
  resend_after_seconds: Scalars['Int']['output'];
  /**
   * Whether a medium actually carried the code out of the building.
   *
   * Separate from registered, which only says an account was found. A mailbox
   * that receives its codes on another channel, a switched-off template and an
   * address every mail server refused are all a real account whose code never
   * arrives — and a screen that says to check your email for those leaves the
   * person with nothing to do. False means show the failure, not the code box.
   */
  sent: Scalars['Boolean']['output'];
  /**
   * The code itself, echoed back ONLY while no medium could really carry it.
   * Null the moment a real transport handles the send.
   */
  test_code?: Maybe<Scalars['String']['output']>;
};

export type PasswordResetVerifyResult = {
  __typename?: 'PasswordResetVerifyResult';
  ok: Scalars['Boolean']['output'];
  /**
   * A single-use grant, valid for what is left of the code's own life. It is
   * what the last step spends — the code is never sent again.
   */
  reset_token: Scalars['String']['output'];
};

export type Payment = {
  __typename?: 'Payment';
  billing: BillingDetails;
  /** Legacy one-line billing address, composed from the structured billing block. */
  billing_address: Scalars['String']['output'];
  checkout_url: Scalars['String']['output'];
  coins_earned: Scalars['Float']['output'];
  /** Duncit Coins spent on this payment (1 coin = 1 rupee off the gross). */
  coins_redeemed: Scalars['Float']['output'];
  coupon_code?: Maybe<Scalars['String']['output']>;
  coupon_discount: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  currency_symbol: Scalars['String']['output'];
  description: Scalars['String']['output'];
  finalize_state: Scalars['String']['output'];
  gateway: Scalars['String']['output'];
  gateway_ref?: Maybe<Scalars['String']['output']>;
  gst_amount: Scalars['Float']['output'];
  gst_pct: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  invoice_no?: Maybe<Scalars['String']['output']>;
  needs_refund: Scalars['Boolean']['output'];
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

/** A thing checkout was supposed to create, verified by reading it back from the database. */
export type PaymentArtifact = {
  __typename?: 'PaymentArtifact';
  /** How many documents of this kind exist for the payment. */
  count: Scalars['Int']['output'];
  /** True only when the document was actually found in the database — this is what draws the green tick. */
  created: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  /** Set when the artifact is not applicable to this payment (e.g. no products bought). */
  not_applicable: Scalars['Boolean']['output'];
  /** Human-readable ids (ticket code, order no, membership id...). */
  refs: Array<Scalars['String']['output']>;
  /** The pipeline step that would re-create this row; null when only re-running the whole booking core would. */
  retry_key?: Maybe<Scalars['String']['output']>;
  segment: PaymentSegment;
};

/** One Duncit Coin ledger movement caused by this payment. */
export type PaymentCoinLine = {
  __typename?: 'PaymentCoinLine';
  amount: Scalars['Float']['output'];
  at: Scalars['String']['output'];
  balance_after: Scalars['Float']['output'];
  earn_pct: Scalars['Float']['output'];
  reason: Scalars['String']['output'];
  source: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** The coupon applied at checkout, resolved against the live coupon record. */
export type PaymentCouponInfo = {
  __typename?: 'PaymentCouponInfo';
  code: Scalars['String']['output'];
  discount: Scalars['Float']['output'];
  discount_type: Scalars['String']['output'];
  discount_value: Scalars['Float']['output'];
  /** False when the coupon record has since been deleted. */
  still_exists: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

/** Everything checkout did for one payment — for the Finance Payment Logs detail page. */
export type PaymentDetail = {
  __typename?: 'PaymentDetail';
  artifacts: Array<PaymentArtifact>;
  /** True when the money landed but the booking core never did — the one state where the whole finalization can be re-run. */
  can_retry_finalize: Scalars['Boolean']['output'];
  coins: Array<PaymentCoinLine>;
  /** Coins this payment earned the buyer back. */
  coins_earned: Scalars['Float']['output'];
  /** Coins spent on this payment (1 coin = 1 rupee off the gross). */
  coins_redeemed: Scalars['Float']['output'];
  coupon?: Maybe<PaymentCouponInfo>;
  finalize_attempts: Scalars['Int']['output'];
  finalize_error?: Maybe<Scalars['String']['output']>;
  finalize_state: Scalars['String']['output'];
  finalized_at?: Maybe<Scalars['String']['output']>;
  gift_card?: Maybe<PaymentGiftCard>;
  needs_refund: Scalars['Boolean']['output'];
  /** Gross before coupon + coins, taken from the frozen checkout metadata. */
  original_total: Scalars['Float']['output'];
  payment: Payment;
  pod_booking?: Maybe<PaymentPodBooking>;
  product_orders: Array<PaymentProductOrderLine>;
  /** Every deferred step still owed. What the page's Retry all sends. */
  retryable_step_keys: Array<Scalars['String']['output']>;
  steps: Array<PaymentStep>;
};

export type PaymentFilterInput = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PaymentStatus>;
  user_id?: InputMaybe<Scalars['ID']['input']>;
};

/** The gift card a GIFT_CARD payment bought, read back by its payment id. */
export type PaymentGiftCard = {
  __typename?: 'PaymentGiftCard';
  balance: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  expires_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  initial_amount: Scalars['Float']['output'];
  /** Empty on a self-purchase — the buyer is the recipient. */
  recipient_email: Scalars['String']['output'];
  recipient_name: Scalars['String']['output'];
  redeemed_at?: Maybe<Scalars['String']['output']>;
  scope_name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** The pod booking this payment produced. */
export type PaymentPodBooking = {
  __typename?: 'PaymentPodBooking';
  membership_id?: Maybe<Scalars['ID']['output']>;
  membership_status?: Maybe<Scalars['String']['output']>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  seats: Scalars['Int']['output'];
  ticket_code?: Maybe<Scalars['String']['output']>;
  ticket_status?: Maybe<Scalars['String']['output']>;
};

/** One product order this payment produced. */
export type PaymentProductOrderLine = {
  __typename?: 'PaymentProductOrderLine';
  awb?: Maybe<Scalars['String']['output']>;
  fulfilment_method: Scalars['String']['output'];
  fulfilment_status: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  item_count: Scalars['Int']['output'];
  order_no: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

export type PaymentReleaseApprovalType =
  | 'FULL'
  | 'PARTIAL';

export type PaymentReleaseBreakdown = {
  __typename?: 'PaymentReleaseBreakdown';
  /**
   * The attendance this payout was computed from, frozen at completion.
   *
   * A pod settles on the seats a host scanned in, and a later scan changes the
   * pod's attendance — so these cannot be re-derived when the release is
   * reviewed, only read back. 0 on snapshots written before attendance drove
   * the money.
   */
  attended_seats: Scalars['Int']['output'];
  /** Money from the attended bookings — what the waterfall started from. */
  attended_total: Scalars['Float']['output'];
  booked_seats: Scalars['Int']['output'];
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
  /** The club-admin cut of a completed pod, paid to the club's admin user. */
  | 'CLUB_ADMIN'
  /**
   * An e-commerce brand's product-sale earnings on a completed pod, paid to the
   * seller who listed the stock. The amount is the gross buyers paid minus the
   * Duncit commission — the same net the seller's product invoice bills.
   */
  | 'ECOMM_PAYMENT'
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

/**
 * Which part of checkout a step or artifact belongs to — one per thing a
 * checkout can buy, plus the PAYMENT work every checkout does whatever it bought.
 * The Finance detail page draws a tab per purchase kind.
 */
export type PaymentSegment =
  | 'GIFT_CARD'
  | 'PAYMENT'
  | 'POD'
  | 'PRODUCT';

export type PaymentStatus =
  | 'FAILED'
  | 'PENDING'
  | 'REFUNDED'
  | 'SUCCESS';

/** One step of the post-payment finalization pipeline, in execution order. */
export type PaymentStep = {
  __typename?: 'PaymentStep';
  at?: Maybe<Scalars['String']['output']>;
  /** True when Finance can re-run this step on its own from the detail page. */
  can_retry: Scalars['Boolean']['output'];
  /** Why it was skipped, or the failure message. */
  detail: Scalars['String']['output'];
  key: Scalars['String']['output'];
  /** Human label for the Finance detail table. */
  label: Scalars['String']['output'];
  /** Ids of the documents this step created. */
  refs: Array<Scalars['String']['output']>;
  segment: PaymentSegment;
  status: PaymentStepStatus;
};

export type PaymentStepStatus =
  | 'DONE'
  | 'FAILED'
  | 'PENDING'
  | 'SKIPPED';

/** Server-side table page for the shared table engine (paymentsTable). */
export type PaymentTablePage = {
  __typename?: 'PaymentTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Payment>;
  total: Scalars['Int']['output'];
};

export type PaymentTargetType =
  | 'GIFT_CARD'
  | 'OTHER'
  | 'POD'
  | 'PRODUCT';

/** Filter-wide KPI totals for the Payment Logs cards (SUCCESS payments only, no row cap). */
export type PaymentTotals = {
  __typename?: 'PaymentTotals';
  count: Scalars['Int']['output'];
  fee: Scalars['Float']['output'];
  gross: Scalars['Float']['output'];
  gst: Scalars['Float']['output'];
};

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

export type PhoneOtpDelivery = {
  __typename?: 'PhoneOtpDelivery';
  medium: OtpMedium;
  /** Why it was not really sent. Blank on a genuine send. */
  reason: Scalars['String']['output'];
  status: OtpDeliveryStatus;
};

/**
 * An issued one-time code.
 *
 * Named PhoneOtp... rather than Otp... because OtpRequestResult is already
 * taken by the EMAIL code flows in auth.schema.ts, and two types sharing one
 * name are folded into one by the schema builder — a caller then selects a
 * field from the other definition and always reads null.
 *
 * There is no generic `requestOtp` mutation on purpose: every flow that needs a
 * number proved authorises the request itself (the pod's host for attendance,
 * the signed-in account for a WhatsApp number) and then calls the ONE shared
 * otpService underneath. A generic entry point would be an open relay for
 * sending codes to arbitrary numbers.
 */
export type PhoneOtpRequestResult = {
  __typename?: 'PhoneOtpRequestResult';
  challenge_id: Scalars['ID']['output'];
  /** Every medium that was asked, with what actually happened to it. */
  deliveries: Array<PhoneOtpDelivery>;
  /** ISO instant the code stops working. */
  expires_at: Scalars['String']['output'];
  /** Seconds to wait before another code can be requested. */
  resend_after_seconds: Scalars['Int']['output'];
  /**
   * The code itself, echoed back ONLY while no medium could really carry it —
   * which is the case for both SMS and WhatsApp today. Null the moment a real
   * transport is wired, so no client may depend on reading it.
   */
  test_code?: Maybe<Scalars['String']['output']>;
};

export type PickupOwnerKind =
  | 'BRAND'
  | 'DUNCIT';

export type Pod = {
  __typename?: 'Pod';
  /**
   * Seats a host has scanned in at the door, out of the seats booked.
   *
   * Attendance is not stored on the pod or the membership — it is the door scan
   * on each EventTicket — so this is resolved live. It is what a completed pod
   * settles on, which is why a pod's own detail view reports it beside the
   * booking count rather than leaving the two to be reconciled elsewhere.
   */
  attendance: PodAttendanceSummary;
  /** The Auto Pod offer this pod materialized from — null for ordinary pods. */
  auto_pod_id?: Maybe<Scalars['ID']['output']>;
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
  /** Required for a VIRTUAL pod — its window is the only thing that says when the meeting is over. A physical pod takes its end from the booked slot. */
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
  /** Seats still bookable (0 when the pod has unlimited spots). */
  seats_available: Scalars['Int']['output'];
  /** Seats taken — attendees plus every extra seat a multi-seat booking holds. */
  seats_taken: Scalars['Int']['output'];
  updated_at: Scalars['String']['output'];
  venue_approval_status: PodVenueApproval;
  venue_id?: Maybe<Scalars['ID']['output']>;
  venue_slot_id?: Maybe<Scalars['ID']['output']>;
  what_this_pod_offers: Array<Scalars['String']['output']>;
  zone_name?: Maybe<Scalars['String']['output']>;
};

export type PodAspectRating = {
  __typename?: 'PodAspectRating';
  aspect: BouncerFeedbackAspect;
  average: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
};

/**
 * Everything the attendance page draws, in one read.
 *
 * The host's page and the Club Admin's section render the SAME board — two
 * queries would be two places for "is this person marked" to disagree.
 */
export type PodAttendanceBoard = {
  __typename?: 'PodAttendanceBoard';
  /** False once the pod is completed or cancelled — nothing can be marked then. */
  can_mark: Scalars['Boolean']['output'];
  /** The club's admins — the people to ask once the roster is locked. */
  club_admins: Array<PodAttendanceClubAdmin>;
  lock: PodAttendanceLock;
  marked_count: Scalars['Int']['output'];
  marked_seats: Scalars['Int']['output'];
  /** Whether a by-hand mark must be preceded by a verified one-time code. */
  otp_required: Scalars['Boolean']['output'];
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  /** PHYSICAL or VIRTUAL. A virtual pod has no door to scan at: a member is marked when they open the meeting link. */
  pod_mode: PodMode;
  pod_title: Scalars['String']['output'];
  rows: Array<PodAttendanceRow>;
  total_count: Scalars['Int']['output'];
  total_seats: Scalars['Int']['output'];
  viewer: PodAttendanceViewer;
};

/** Who to ask when attendance can no longer be marked. */
export type PodAttendanceClubAdmin = {
  __typename?: 'PodAttendanceClubAdmin';
  avatar_url: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  whatsapp: Scalars['String']['output'];
};

export type PodAttendanceCompanion = {
  __typename?: 'PodAttendanceCompanion';
  added_at: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone_extension: Scalars['String']['output'];
  phone_number: Scalars['String']['output'];
};

/**
 * Why the roster can no longer be changed.
 *
 * Completion is the real deadline: it computes the payout from exactly who is
 * marked and hands the releases to Finance, so a late mark would claim money
 * that was already split.
 */
export type PodAttendanceLock =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'OPEN';

export type PodAttendanceOtpInput = {
  /** SMS, WhatsApp, or both. The medium is an argument to one shared service. */
  mediums: Array<OtpMedium>;
  membership_id: Scalars['ID']['input'];
  /** The name being proven alongside the number. */
  name: Scalars['String']['input'];
  phone_extension: Scalars['String']['input'];
  phone_number: Scalars['String']['input'];
  pod_doc_id: Scalars['ID']['input'];
};

/** One booking on the roster. */
export type PodAttendanceRow = {
  __typename?: 'PodAttendanceRow';
  attended: Scalars['Boolean']['output'];
  attended_at?: Maybe<Scalars['String']['output']>;
  avatar_url: Scalars['String']['output'];
  companions: Array<PodAttendanceCompanion>;
  /** How many of this booking's extra people still need a name and number. */
  companions_required: Scalars['Int']['output'];
  email: Scalars['String']['output'];
  /** Who marked them, named. Blank when nobody has. */
  marked_by_name: Scalars['String']['output'];
  marked_method?: Maybe<AttendanceMarkMethod>;
  membership_id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The number on their account, so the host confirms rather than retypes it. */
  phone_extension: Scalars['String']['output'];
  phone_number: Scalars['String']['output'];
  /** People this one booking admits. */
  seats: Scalars['Int']['output'];
  ticket_code: Scalars['String']['output'];
  ticket_id?: Maybe<Scalars['ID']['output']>;
  user_id: Scalars['ID']['output'];
  /** The number that answered the one-time code. Blank when none was required. */
  verified_phone: Scalars['String']['output'];
};

/**
 * How many of a pod's booked seats were actually scanned in at the door.
 *
 * Seats, not people: one booking can admit several, and a completed pod settles
 * per seat. The recorded flag tells "nobody turned up" apart from "nobody
 * scanned" — a virtual pod, or a host who never opened the scanner, is not a
 * pod where everyone was absent.
 */
export type PodAttendanceSummary = {
  __typename?: 'PodAttendanceSummary';
  attended_seats: Scalars['Int']['output'];
  booked_seats: Scalars['Int']['output'];
  /** False when no ticket on this pod has ever been scanned. */
  recorded: Scalars['Boolean']['output'];
};

/** Which capacity the signed-in person is reading this roster in. */
export type PodAttendanceViewer =
  /** An admin of the club the pod belongs to. Their mark is the override. */
  | 'CLUB_ADMIN'
  /** The pod's host or co-host. Paid on the result, so their by-hand mark is gated. */
  | 'HOST';

/** How many seats one JOINED member holds — the +N other members label. */
export type PodAttendeeSeats = {
  __typename?: 'PodAttendeeSeats';
  /** Seats this person's booking holds (always at least 1). */
  seats: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
};

/** What kind of pod action was recorded. */
export type PodAuditAction =
  | 'COMPLETE'
  | 'CREATE'
  | 'DELETE'
  /** A content-guideline check refused the edit — nothing was written to the pod. */
  | 'REJECTED'
  | 'RESUBMIT'
  | 'UPDATE'
  | 'VENUE_APPROVED'
  | 'VENUE_DECLINED';

/** One changed field of a recorded pod edit. */
export type PodAuditChange = {
  __typename?: 'PodAuditChange';
  field: Scalars['String']['output'];
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

/** One immutable AI-monitored audit entry for a pod action. */
export type PodAuditLog = {
  __typename?: 'PodAuditLog';
  action: PodAuditAction;
  actor_name: Scalars['String']['output'];
  actor_user_id?: Maybe<Scalars['ID']['output']>;
  ai_reviewed_at?: Maybe<Scalars['String']['output']>;
  ai_risk: PodAuditRisk;
  ai_summary: Scalars['String']['output'];
  changes: Array<PodAuditChange>;
  club_id?: Maybe<Scalars['ID']['output']>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Free-text context (delete reason, venue decline reason, …). */
  note: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  source: PodAuditSource;
};

/** Server-side table page for the shared table engine (podAuditLogsTable). */
export type PodAuditLogTablePage = {
  __typename?: 'PodAuditLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodAuditLog>;
  total: Scalars['Int']['output'];
};

/** AI risk verdict for a recorded action (PENDING until the review lands). */
export type PodAuditRisk =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM'
  | 'PENDING';

/** Which surface performed the action. */
export type PodAuditSource =
  | 'ADMIN'
  | 'CLUB_ADMIN'
  | 'HOST'
  | 'SYSTEM'
  | 'VENUE_OWNER';

/** Who cancelled a pod — Finance's Cancel & Refunds pages split on this. */
export type PodCancelKind =
  | 'ADMIN'
  | 'CLUB_ADMIN'
  | 'HOST'
  | 'SYSTEM'
  | 'VENUE';

/** One cancelled pod with its refund money and the venue's booked amount. */
export type PodCancellation = {
  __typename?: 'PodCancellation';
  actor_name: Scalars['String']['output'];
  attendee_count: Scalars['Int']['output'];
  cancelled_at: Scalars['String']['output'];
  club_id?: Maybe<Scalars['ID']['output']>;
  currency_symbol: Scalars['String']['output'];
  host_names: Array<Scalars['String']['output']>;
  kind: PodCancelKind;
  pod_amount: Scalars['Float']['output'];
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  pod_slug: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  /** Free-text cancellation reason (delete reason / venue decline reason). */
  reason: Scalars['String']['output'];
  /** Payments already refunded for this pod. */
  refunded_count: Scalars['Int']['output'];
  refunded_total: Scalars['Float']['output'];
  /** Successful payments NOT refunded — outstanding attendee money. */
  unrefunded_count: Scalars['Int']['output'];
  unrefunded_total: Scalars['Float']['output'];
  /** The venue's booked slot money for this pod (what the venue loses). */
  venue_amount: Scalars['Float']['output'];
  venue_id?: Maybe<Scalars['ID']['output']>;
  venue_name?: Maybe<Scalars['String']['output']>;
};

/** KPI tiles for Finance → Cancel & Refunds → Dashboard. */
export type PodCancellationStats = {
  __typename?: 'PodCancellationStats';
  cancelled_by_admin: Scalars['Int']['output'];
  cancelled_by_club_admin: Scalars['Int']['output'];
  cancelled_by_host: Scalars['Int']['output'];
  cancelled_by_venue: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  refunded_payment_count: Scalars['Int']['output'];
  total_cancelled: Scalars['Int']['output'];
  total_refund_amount: Scalars['Float']['output'];
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

/** One extra person admitted on someone else's booking, recorded at the door. */
export type PodCompanion = {
  __typename?: 'PodCompanion';
  /** When the host recorded them (ISO). */
  added_at: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone_extension?: Maybe<Scalars['String']['output']>;
  phone_number: Scalars['String']['output'];
  /** When their own number answered a one-time code (ISO). Null when the host recorded them without one. */
  verified_at?: Maybe<Scalars['String']['output']>;
  /** The channel that carried the code they answered — blank when none did. */
  verified_medium: Scalars['String']['output'];
};

/** Details for one of the other people a multi-seat ticket admits. */
export type PodCompanionInput = {
  name: Scalars['String']['input'];
  /**
   * A verified requestPodCompanionOtp challenge for THIS number, when the
   * host proved it at the door.
   *
   * Optional on purpose: a dead phone or a number abroad must never hold a
   * group at the door. When it is sent the server spends it, so one proof can
   * never be replayed across the rest of the group.
   */
  otp_challenge_id?: InputMaybe<Scalars['ID']['input']>;
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number: Scalars['String']['input'];
};

export type PodDashboard = {
  __typename?: 'PodDashboard';
  created_trend: Array<PodDashboardDay>;
  /** The window the money, ratings and trend cover. Counts are always live. */
  days: Scalars['Int']['output'];
  money: PodDashboardMoney;
  /** Rated pods that scored below four — what to look at first. */
  needs_attention: Array<PodDashboardPod>;
  ratings: PodDashboardRatings;
  seats: PodDashboardSeats;
  top_rated: Array<PodDashboardPod>;
  totals: PodDashboardTotals;
  upcoming: Array<PodDashboardPod>;
};

export type PodDashboardDay = {
  __typename?: 'PodDashboardDay';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type PodDashboardMoney = {
  __typename?: 'PodDashboardMoney';
  average_ticket: Scalars['Float']['output'];
  payments_count: Scalars['Int']['output'];
  refunded_total: Scalars['Float']['output'];
  revenue_total: Scalars['Float']['output'];
};

export type PodDashboardPod = {
  __typename?: 'PodDashboardPod';
  filled: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  pod_id: Scalars['String']['output'];
  rating_average?: Maybe<Scalars['Float']['output']>;
  rating_count: Scalars['Int']['output'];
  spots: Scalars['Int']['output'];
  starts_at?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** What guests scored pods on in the window — reuses the rating aspects. */
export type PodDashboardRatings = {
  __typename?: 'PodDashboardRatings';
  aspects: Array<PodAspectRating>;
  overall_average: Scalars['Float']['output'];
  total: Scalars['Int']['output'];
};

/** Seats sold against seats offered. */
export type PodDashboardSeats = {
  __typename?: 'PodDashboardSeats';
  occupancy_pct: Scalars['Float']['output'];
  seats_filled: Scalars['Int']['output'];
  spots_total: Scalars['Int']['output'];
};

/** How many pods there are and what state they are in, right now. */
export type PodDashboardTotals = {
  __typename?: 'PodDashboardTotals';
  awaiting_venue: Scalars['Int']['output'];
  cancelled: Scalars['Int']['output'];
  completed: Scalars['Int']['output'];
  live_today: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  upcoming: Scalars['Int']['output'];
};

export type PodDraft = {
  __typename?: 'PodDraft';
  created_at?: Maybe<Scalars['String']['output']>;
  /**
   * When the retention sweep deletes this draft: created_at plus the
   * admin-configured draft_retention_days. Null when the draft carries no
   * usable creation date.
   */
  expires_at?: Maybe<Scalars['String']['output']>;
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

export type PodEarningsProjection = {
  __typename?: 'PodEarningsProjection';
  /** Spots that can actually be sold: total_spots - 1 (0 when unset/unlimited). */
  payable_spots: Scalars['Int']['output'];
  /** Spots the host entered (physical capacity, including the host's own seat). */
  total_spots: Scalars['Int']['output'];
  /**
   * The most a venue's slot can cost before the host earns nothing: the pool
   * left after GST, the platform fee and the club-admin cut. The create and
   * enrol guards refuse a venue priced at or above it, so a console can state
   * the ceiling before any venue is chosen — an Auto Pod has none yet.
   */
  venue_budget: Scalars['Float']['output'];
  waterfall: PodFinanceWaterfall;
};

/** One thing Duncit paid for to put a pod on. */
export type PodExpense = {
  __typename?: 'PodExpense';
  amount: Scalars['Float']['output'];
  /** The supplier's bill / invoice number, as printed on the document. */
  bill_number: Scalars['String']['output'];
  /** The uploaded bill or invoice (image or PDF). Empty when none is attached. */
  bill_url: Scalars['String']['output'];
  category: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  created_by?: Maybe<Scalars['ID']['output']>;
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  expense_id: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  payment_method: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  reference: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  vendor_name: Scalars['String']['output'];
};

export type PodExpenseCategoryTotal = {
  __typename?: 'PodExpenseCategoryTotal';
  category: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

export type PodExpenseInput = {
  amount: Scalars['Float']['input'];
  bill_number?: InputMaybe<Scalars['String']['input']>;
  bill_url?: InputMaybe<Scalars['String']['input']>;
  category: Scalars['String']['input'];
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  payment_method?: InputMaybe<Scalars['String']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
  vendor_name?: InputMaybe<Scalars['String']['input']>;
};

/** One pod, with everything Duncit has spent on it rolled up. */
export type PodExpensePodRow = {
  __typename?: 'PodExpensePodRow';
  /** How many of those entries have a bill or invoice attached. */
  bill_count: Scalars['Int']['output'];
  expense_count: Scalars['Int']['output'];
  expense_total: Scalars['Float']['output'];
  last_expense_at?: Maybe<Scalars['String']['output']>;
  /** The pod's human slug (pod_id), not the document id. */
  pod_code: Scalars['String']['output'];
  pod_date_time: Scalars['String']['output'];
  pod_doc_id: Scalars['ID']['output'];
  pod_status: PodExpensePodStatus;
  pod_title: Scalars['String']['output'];
};

/**
 * Where a pod sits in its own lifecycle, for the Pod Expenses list. CANCELLED
 * pods appear here even though every other pod read hides them — money already
 * spent on a called-off pod is still Duncit's cost.
 */
export type PodExpensePodStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ONGOING'
  | 'UPCOMING';

/** Server-side table page for the shared table engine (podExpensePodsTable). */
export type PodExpensePodTablePage = {
  __typename?: 'PodExpensePodTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodExpensePodRow>;
  total: Scalars['Int']['output'];
};

export type PodExpenseSummary = {
  __typename?: 'PodExpenseSummary';
  bill_count: Scalars['Int']['output'];
  by_category: Array<PodExpenseCategoryTotal>;
  expense_count: Scalars['Int']['output'];
  missing_bill_count: Scalars['Int']['output'];
  /** Distinct pods that have at least one expense recorded. */
  pods_covered: Scalars['Int']['output'];
  this_month_spent: Scalars['Float']['output'];
  total_spent: Scalars['Float']['output'];
};

/** Server-side table page for the shared table engine (podExpensesTable). */
export type PodExpenseTablePage = {
  __typename?: 'PodExpenseTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodExpense>;
  total: Scalars['Int']['output'];
};

/**
 * The rating form for one pod: which parts it can be rated on, plus whatever
 * the signed-in guest has already said about it. "mine" is null until they
 * rate it, and submitting again edits that same answer.
 */
export type PodFeedbackForm = {
  __typename?: 'PodFeedbackForm';
  /**
   * Whether this guest may answer the form: the host marked them present at
   * this pod. False is the shared link having reached somebody who was not
   * there — the page says so instead of rendering stars the submit would
   * refuse.
   */
  can_rate: Scalars['Boolean']['output'];
  /** Null until they rate it, and null for anyone who may not. */
  mine?: Maybe<MyPodFeedback>;
  pod: BouncerPodInfo;
};

/**
 * What a guest chose when they closed the rating prompt without answering it.
 * LATER puts the pod back in front of them on a later visit; NEVER retires it.
 */
export type PodFeedbackReminderChoice =
  | 'LATER'
  | 'NEVER';

/** Everything guests said about one pod — averages, plus the ratings themselves. */
export type PodFeedbackSummary = {
  __typename?: 'PodFeedbackSummary';
  aspects: Array<PodAspectRating>;
  overall_average: Scalars['Float']['output'];
  pod_id: Scalars['ID']['output'];
  recent: Array<BouncerFeedback>;
  total: Scalars['Int']['output'];
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
  /** Coins this pod's bookings paid back to buyers as reward. */
  coins_earned_total: Scalars['Float']['output'];
  /**
   * Duncit Coins spent across this pod's successful bookings. Cash the pod never
   * collected: coins cut the gross before GST, so collected_total is lower by
   * this much than the tickets' face value. Stating it is what makes the gap
   * explainable instead of looking like missing money.
   */
  coins_redeemed_total: Scalars['Float']['output'];
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

/**
 * One of the extra people a booking admits, as a Club Admin is given them.
 *
 * Separate from PodCompanionInput because the two are collected in different
 * rooms. At the door the host has the group in front of them, so a number is
 * reasonable. A Club Admin correcting a roster the host forgot is read names
 * down a phone line, and demanding a number there means ringing every attendee
 * — the exact call this path exists to avoid. So the name is required and
 * nothing else is.
 */
export type PodForcedCompanionInput = {
  name: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
};

export type PodIdea = {
  __typename?: 'PodIdea';
  author?: Maybe<User>;
  author_id: Scalars['ID']['output'];
  category_id?: Maybe<Scalars['ID']['output']>;
  category_name: Scalars['String']['output'];
  comments: Array<PodIdeaComment>;
  comments_count: Scalars['Int']['output'];
  created_at: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Human-readable permanent id (e.g. DUN-000001). */
  idea_no: Scalars['String']['output'];
  liked_by_me: Scalars['Boolean']['output'];
  likes: Array<Scalars['ID']['output']>;
  likes_count: Scalars['Int']['output'];
  shares_count: Scalars['Int']['output'];
  status: PodIdeaStatus;
  sub_category_id?: Maybe<Scalars['ID']['output']>;
  sub_category_name: Scalars['String']['output'];
  super_category_id?: Maybe<Scalars['ID']['output']>;
  super_category_name: Scalars['String']['output'];
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
  category_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PodIdeaStatus>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
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

/**
 * Where a pod sits in its life, DERIVED rather than stored: cancelled is
 * soft-deleted, completed is finance-settled or past its end, ongoing has
 * started and not ended, and everything else is upcoming. Named PodLifecycle
 * because VenuePodBucket already means the same four values scoped to one
 * venue — one name for two types would be folded into one by the schema
 * builder.
 */
export type PodLifecycle =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ONGOING'
  | 'UPCOMING';

export type PodMedia = {
  __typename?: 'PodMedia';
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

/**
 * A pod's media, in one read: what is on it and what this viewer may do.
 * A viewer of NONE gets an EMPTY list — the link is pasted into group chats,
 * so the page explains itself instead of leaking the photos to whoever it
 * reached.
 */
export type PodMediaBoard = {
  __typename?: 'PodMediaBoard';
  can_upload: Scalars['Boolean']['output'];
  count: Scalars['Int']['output'];
  is_cancelled: Scalars['Boolean']['output'];
  items: Array<PodPartyMedia>;
  pod_date_time?: Maybe<Scalars['String']['output']>;
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  viewer: PodMediaViewer;
};

export type PodMediaInput = {
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

/**
 * In what capacity someone is looking at a pod's media: its host (admins read
 * as hosts), someone whose attendance was marked, or neither.
 */
export type PodMediaViewer =
  | 'GUEST'
  | 'HOST'
  | 'NONE';

/**
 * What a joined member gets back when they open a virtual pod's meeting.
 *
 * The link itself is also readable on the Pod (gated to joined members), so
 * this is not the only way to see it — it is the way that COUNTS: opening it
 * through here, inside the pod window, marks the booking present.
 */
export type PodMeetingAccess = {
  __typename?: 'PodMeetingAccess';
  /** True when this open marked the booking present (or it already was). */
  attendance_marked: Scalars['Boolean']['output'];
  meeting_notes?: Maybe<Scalars['String']['output']>;
  meeting_url: Scalars['String']['output'];
};

export type PodMember = {
  __typename?: 'PodMember';
  backed_out_at?: Maybe<Scalars['String']['output']>;
  /** Backout attempts used for this pod (each Confirm Backout counts one). */
  backout_count: Scalars['Int']['output'];
  /**
   * The other people this booking admits, captured at check-in. Empty until the
   * host scans the ticket; one entry per seat beyond the buyer's own afterwards.
   */
  companions: Array<PodCompanion>;
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joined_at: Scalars['String']['output'];
  /**
   * This booking's whole story — backouts, attendance and cancellation in one
   * object, so a timeline costs one resolution rather than five. Null to anyone
   * but the member themselves and Admin/Finance: it carries DUN-BKO ids and
   * refund amounts, and PodMember is reachable from unauthenticated queries.
   */
  participation?: Maybe<PodParticipation>;
  payment_id?: Maybe<Scalars['ID']['output']>;
  pod?: Maybe<Pod>;
  pod_id: Scalars['ID']['output'];
  referral_token?: Maybe<Scalars['String']['output']>;
  referred_by?: Maybe<Scalars['ID']['output']>;
  refund_payment_id?: Maybe<Scalars['ID']['output']>;
  refund_status: RefundStatus;
  /** Seats this booking holds — one ticket admits this many. 1 for every legacy booking. */
  seats: Scalars['Int']['output'];
  source: JoinSource;
  status: MembershipStatus;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/**
 * One backout this booking raised, as Finance sees it. The backout_no is the
 * DUN-BKO id — the same key the User Backout Refunds page lists, so a line on
 * Pod History and a row on that page are provably the same request.
 */
export type PodMemberBackout = {
  __typename?: 'PodMemberBackout';
  /** 1-based attempt for this user on this pod (a pod allows a few). */
  attempt_no: Scalars['Int']['output'];
  backout_no: Scalars['String']['output'];
  /**
   * Duncit Coins this release's share of the booking was paid with, before the
   * deduction — the coin twin of payment_amount.
   */
  coins_paid: Scalars['Float']['output'];
  /**
   * Coins handed back, after the SAME Backouts deduction the cash refund takes
   * (Finance > Default Deductions). Credited to the balance at the moment the
   * cash refund is processed, never before.
   */
  coins_refunded: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  deduction_pct: Scalars['Float']['output'];
  events: Array<PodMemberBackoutEvent>;
  refund_amount?: Maybe<Scalars['Float']['output']>;
  /** Set once Finance has processed it — before that the refund is only pending. */
  refund_processed_at?: Maybe<Scalars['String']['output']>;
  /**
   * What Finance shows for THIS request. The booking's own refund_status is not
   * it: the server never writes that one for a partial backout, so a member paid
   * back for one of three seats was reading "not started".
   */
  refund_status: RefundStatus;
  /** Seats this request released. Fewer than seats_before means a PARTIAL backout. */
  seats: Scalars['Int']['output'];
  seats_before: Scalars['Int']['output'];
  status: BackoutStatus;
};

export type PodMemberBackoutEvent = {
  __typename?: 'PodMemberBackoutEvent';
  at: Scalars['String']['output'];
  status: BackoutStatus;
};

/** Who ended the pod, when it was not the member who left. */
export type PodMemberCancelActor =
  | 'ADMIN'
  | 'CLUB_ADMIN'
  | 'HOST'
  | 'SYSTEM'
  | 'VENUE';

export type PodMembershipState = {
  __typename?: 'PodMembershipState';
  /** Max Backout attempts per user per pod (Admin > Pods > Pod Settings). */
  backout_attempts_max: Scalars['Int']['output'];
  /** Backout attempts the caller has used for this pod. */
  backout_attempts_used: Scalars['Int']['output'];
  /** Global Backouts deduction % applied to a backout refund. */
  backout_deduction_pct: Scalars['Float']['output'];
  /** True while the caller's booking is in 'Backout in process'. */
  backout_in_process: Scalars['Boolean']['output'];
  /** Estimated refund after deduction for the caller's paid booking (null for free). */
  backout_refund_amount?: Maybe<Scalars['Float']['output']>;
  /**
   * Coins the caller would get back if they released everything they hold —
   * their share of what the booking was paid in coins, less the same Backouts
   * deduction. 0 when the booking spent no coins.
   */
  backout_refund_coins: Scalars['Float']['output'];
  /**
   * Refund after deduction for ONE seat, so a partial backout can be priced for
   * any number the buyer picks without another round trip. Null for a free join.
   */
  backout_refund_per_seat?: Maybe<Scalars['Float']['output']>;
  can_backout: Scalars['Boolean']['output'];
  /** True when the in-process backout can still be cancelled (seat not rebooked). */
  can_cancel_backout: Scalars['Boolean']['output'];
  can_join: Scalars['Boolean']['output'];
  is_member: Scalars['Boolean']['output'];
  /** Most seats one booking may take — caps the Pod Details seat picker. */
  max_seats_per_booking: Scalars['Int']['output'];
  membership?: Maybe<PodMember>;
  /** Seats the caller already holds on this pod (0 when not a member). */
  my_seats: Scalars['Int']['output'];
  pod_id: Scalars['ID']['output'];
  refund_threshold_pct: Scalars['Int']['output'];
  /**
   * Seats the caller has already released and is still waiting to have filled.
   * A partial release leaves the member JOINED, so this is the only signal that
   * a Keep My Spot is available to them.
   */
  released_seats_pending: Scalars['Int']['output'];
  /** Seats still bookable (0 when the pod has unlimited spots). */
  seats_available: Scalars['Int']['output'];
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

/**
 * One booking's whole story, in the shape the participation timeline reads.
 *
 * Finance and Admin resolve the same object the member's own Pod History does,
 * so a support conversation is about one account of what happened rather than
 * two. The pod's date is not on it: every screen that draws this already has
 * the pod loaded, and it is the pod that says whether the story is still ahead.
 */
export type PodParticipation = {
  __typename?: 'PodParticipation';
  /**
   * False when NOBODY on the pod was scanned — a virtual pod, or a host who
   * never opened the scanner. Not attending and nobody checking are different
   * things, and only one of them is this person's doing.
   */
  attendance_recorded: Scalars['Boolean']['output'];
  /** True once a host has scanned this booking in at the door. */
  attended: Scalars['Boolean']['output'];
  attended_at?: Maybe<Scalars['String']['output']>;
  /** Every backout this booking raised, oldest first. */
  backouts: Array<PodMemberBackout>;
  /**
   * What the cancellation did to this booking's money. Not every cancel path
   * refunds, and a free booking has nothing to give back.
   */
  cancel_refund_status: RefundStatus;
  joined_at: Scalars['String']['output'];
  pod_cancelled_at?: Maybe<Scalars['String']['output']>;
  /** Set only when the pod itself was cancelled — then nothing else applies. */
  pod_cancelled_by?: Maybe<PodMemberCancelActor>;
};

/** One photo or video FROM the pod, with who put it there. */
export type PodPartyMedia = {
  __typename?: 'PodPartyMedia';
  /** This viewer may take it down — their own, or anything at all if a host. */
  can_remove: Scalars['Boolean']['output'];
  /** This viewer uploaded it. */
  mine: Scalars['Boolean']['output'];
  /** HOST when a host uploaded it, GUEST when one of the people who came did. */
  source: PodMediaViewer;
  type: CategoryMediaType;
  uploaded_at?: Maybe<Scalars['String']['output']>;
  uploaded_by_id: Scalars['ID']['output'];
  uploaded_by_name: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

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
  /** Live product threshold: line subtotal at/above which its delivery is free (null = no offer). */
  free_delivery_above?: Maybe<Scalars['Float']['output']>;
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

/**
 * The status a pod ROW shows in the Club Admin's pods table.
 *
 * Not PodLifecycle: that one asks where a pod sits in time, this one names the
 * Status chip, which mixes the booking cycle with the pod's own flags. The six
 * values partition the table exactly — see pod.rowStatus for the precedence.
 */
export type PodRowStatus =
  /** Live and published. */
  | 'ACTIVE'
  /** Waiting on the venue owner's answer to the slot request. */
  | 'AWAITING_VENUE'
  /** Soft-deleted. */
  | 'CANCELLED'
  /** Settled by finance. */
  | 'COMPLETED'
  /** Live but not published. */
  | 'DRAFT'
  /** The venue owner declined the slot request. */
  | 'VENUE_REJECTED';

export type PodSettlement = {
  __typename?: 'PodSettlement';
  /** Seats a host scanned in at the door. The settlement basis. */
  attended_seats: Scalars['Int']['output'];
  /** Money from the attended bookings: what the waterfall was computed from. */
  attended_total: Scalars['Float']['output'];
  /** Every JOINED booking, attended first — the completion roster. */
  attendees: Array<PodSettlementAttendee>;
  /** Seats booked on the pod, attended or not — the denominator beside it. */
  booked_seats: Scalars['Int']['output'];
  collected_total: Scalars['Float']['output'];
  currency_symbol: Scalars['String']['output'];
  gst_pct: Scalars['Float']['output'];
  has_venue: Scalars['Boolean']['output'];
  host: PodSettlementParty;
  host_commission_pct: Scalars['Float']['output'];
  /**
   * SEATS the settlement was computed on — the ones a host scanned in. Kept
   * under its original name for older consumers; attended_seats is the same
   * number under the name that now describes it.
   */
  paying_attendees: Scalars['Int']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  venue?: Maybe<PodSettlementParty>;
  venue_bill: Scalars['Float']['output'];
  venue_commission_pct: Scalars['Float']['output'];
  waterfall: PodFinanceWaterfall;
};

/**
 * One booking on the completion roster.
 *
 * Attendance is not stored on the membership — it happens when a host scans a
 * ticket at the door, so a booking counts as attended when its ticket reads
 * CHECKED_IN. Seats, not people: one booking can admit several.
 */
export type PodSettlementAttendee = {
  __typename?: 'PodSettlementAttendee';
  /** What this booking paid. Zero on a free pod. */
  amount: Scalars['Float']['output'];
  attended: Scalars['Boolean']['output'];
  attended_at?: Maybe<Scalars['String']['output']>;
  membership_id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  seats: Scalars['Int']['output'];
  user_id: Scalars['ID']['output'];
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

/** One media item in the global Pod Shop top slider (image or video). */
export type PodShopSliderMedia = {
  __typename?: 'PodShopSliderMedia';
  cta_label: Scalars['String']['output'];
  cta_url: Scalars['String']['output'];
  /** Optional overlay copy + call-to-action shown on the Pod Shop hero slide. */
  heading: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  subheading: Scalars['String']['output'];
  type: CategoryMediaType;
  url: Scalars['String']['output'];
};

export type PodShopSliderMediaInput = {
  cta_label?: InputMaybe<Scalars['String']['input']>;
  cta_url?: InputMaybe<Scalars['String']['input']>;
  heading?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  subheading?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<CategoryMediaType>;
  url: Scalars['String']['input'];
};

/** One filled Backout seat on a pod — who released the spot and who took it. */
export type PodSpotFill = {
  __typename?: 'PodSpotFill';
  backed_out_profile_photo?: Maybe<Scalars['String']['output']>;
  backed_out_user_id: Scalars['ID']['output'];
  backed_out_user_name?: Maybe<Scalars['String']['output']>;
  /** Permanent Backout ID of the filled request (DUN-BKO-000001). */
  backout_no: Scalars['String']['output'];
  filled_at: Scalars['String']['output'];
  replacement_profile_photo?: Maybe<Scalars['String']['output']>;
  /** Null on requests filled before the replacement was recorded. */
  replacement_user_id?: Maybe<Scalars['ID']['output']>;
  replacement_user_name?: Maybe<Scalars['String']['output']>;
};

/**
 * How big a pod that already exists may be resized to, for the asking viewer.
 *
 * A live pod's slot is BOOKED, so venueAvailableSlots no longer returns it and
 * no client can work the ceiling out for itself. Every resize surface reads this
 * one answer, and the same rules guard the write.
 */
export type PodSpotLimits = {
  __typename?: 'PodSpotLimits';
  /** False for a host — they may only ever raise a live pod's capacity. */
  can_decrease: Scalars['Boolean']['output'];
  /** Spots the pod declares today. */
  current: Scalars['Int']['output'];
  /** Highest capacity — the booked space's own capacity, when it has one. */
  max: Scalars['Int']['output'];
  /** Lowest capacity this viewer may set. */
  min: Scalars['Int']['output'];
  /** The activity's own floor, from the club's sub-category (0 = none). */
  min_pax: Scalars['Int']['output'];
  /** Seats already held: attendees plus every extra seat a booking bought. */
  seats_taken: Scalars['Int']['output'];
  /** True when there is a real range to drag across rather than a fixed number. */
  slidable: Scalars['Boolean']['output'];
  /** The booked space's capacity (0 = the pod books no capped space). */
  venue_capacity: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (podsTable / myHostPodsTable). */
export type PodTablePage = {
  __typename?: 'PodTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Pod>;
  total: Scalars['Int']['output'];
};

/** FREE is virtual-only — physical pods must be PAID. */
export type PodType =
  | 'FREE'
  | 'PAID';

/** Venue's decision on the pod's slot request — PENDING pods are offline until APPROVED. */
export type PodVenueApproval =
  | 'APPROVED'
  | 'DECLINED'
  | 'NONE'
  | 'PENDING';

/** One pod somebody has withdrawn against — a row of the Withdrawal Payments list. */
export type PodWithdrawalGroup = {
  __typename?: 'PodWithdrawalGroup';
  /** Sum of the slices attributed to this pod across those requests. */
  attributed_total: Scalars['Float']['output'];
  last_requested_at: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  /** Every partner who has raised a withdrawal against this pod so far. */
  requested_from: Array<WithdrawerRole>;
  /** APPROVED only when every request against this pod has been paid. */
  status: PodWithdrawalStatus;
  withdrawal_count: Scalars['Int']['output'];
};

export type PodWithdrawalGroupPage = {
  __typename?: 'PodWithdrawalGroupPage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PodWithdrawalGroup>;
  total: Scalars['Int']['output'];
};

export type PodWithdrawalStatus =
  | 'APPROVED'
  | 'PENDING';

export type Policy = {
  __typename?: 'Policy';
  content: Scalars['String']['output'];
  /** sha256 of the CURRENT wording — what a fresh acceptance records. */
  content_hash: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  /** When Legal last emailed everyone who had accepted it. */
  last_notified_at?: Maybe<Scalars['String']['output']>;
  /** How many accounts that notice reached. */
  last_notified_count: Scalars['Int']['output'];
  /** Permanent, globally unique handle (POL-000001). Never edited, never reused. */
  policy_no: Scalars['String']['output'];
  /** What kind of policy this is — the grouping the dashboard counts by. */
  policy_type: Scalars['String']['output'];
  /** Whether accepting this is a condition of creating an account. */
  requires_signup_acceptance: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  /** Every wording it has had, the live one included. Never fewer than 1. */
  version_count: Scalars['Int']['output'];
};

/**
 * One person's acceptance of one policy — append-only, never edited.
 *
 * The policy_* fields are copied onto the row at write time because deleting a
 * policy is a HARD delete: a row holding only policy_id would render a blank
 * where the thing they agreed to should be.
 */
export type PolicyAcceptance = {
  __typename?: 'PolicyAcceptance';
  accepted_at: Scalars['String']['output'];
  /** sha256 of the policy's content as it read when they accepted it. */
  content_hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  method: PolicyAcceptanceMethod;
  policy_id: Scalars['ID']['output'];
  policy_no: Scalars['String']['output'];
  policy_slug: Scalars['String']['output'];
  policy_title: Scalars['String']['output'];
  /** The policy's own updated_at at that moment. */
  policy_updated_at: Scalars['String']['output'];
  surface: PolicyAcceptanceSurface;
  user_email: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  /** Resolved at read time, so a renamed account still reads correctly. */
  user_name: Scalars['String']['output'];
};

/**
 * The accepting account as it reads TODAY.
 *
 * Resolved rather than copied, so a renamed or closed account reads correctly —
 * and null when the account has been erased entirely, which the row itself
 * survives.
 */
export type PolicyAcceptanceAccount = {
  __typename?: 'PolicyAcceptanceAccount';
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True when the account has been deleted. Its acceptance rows remain. */
  is_deleted: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Blank when no phone was ever collected — signup stopped asking. */
  phone: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/**
 * Everything behind ONE row of the acceptance log.
 *
 * A row on its own carries a sha256 and a user id. This is what turns those
 * into an answer: who they are now, what the policy says now, the exact wording
 * they agreed to, every wording it has had, their own trail through this policy,
 * and what else they have accepted.
 */
export type PolicyAcceptanceDetail = {
  __typename?: 'PolicyAcceptanceDetail';
  /** The row that was opened. */
  acceptance: PolicyAcceptance;
  /**
   * The wording behind this row's content_hash.
   *
   * Null when the policy predates version history, which is honest: the hash is
   * on the record, the words behind it are not on file.
   */
  accepted_version?: Maybe<PolicyVersion>;
  /** Null when the account has been erased. */
  account?: Maybe<PolicyAcceptanceAccount>;
  /** Null when the policy has been deleted — the row still reads correctly. */
  policy?: Maybe<Policy>;
  /** This account's other acceptances of THIS policy, newest first. */
  policy_history: Array<PolicyAcceptance>;
  /** Everything else this account has accepted, newest first. Capped at 50. */
  user_acceptances: Array<PolicyAcceptance>;
  /** Every wording the policy has had, oldest first. */
  versions: Array<PolicyVersion>;
};

/** How a policy acceptance was given. */
export type PolicyAcceptanceMethod =
  /** Accepted later from inside the account — predates the gate, or a policy changed. */
  | 'ACCOUNT'
  /** Ticked in the same dialog, after Google returned but before the account existed. */
  | 'GOOGLE_SIGNUP'
  /** Ticked on the email/password signup form. */
  | 'SIGNUP_FORM';

/** Which app an acceptance was given in. UNKNOWN when the caller did not say. */
export type PolicyAcceptanceSurface =
  | 'APP'
  | 'MWEB'
  | 'PORTAL'
  | 'UNKNOWN'
  | 'WEBSITE';

/** Server-side table page for the shared table engine (policyAcceptancesTable). */
export type PolicyAcceptanceTablePage = {
  __typename?: 'PolicyAcceptanceTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PolicyAcceptance>;
  total: Scalars['Int']['output'];
};

export type PolicyFilterInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type PolicyStats = {
  __typename?: 'PolicyStats';
  by_type: Array<PolicyTypeCount>;
  total: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine (policiesTable). */
export type PolicyTablePage = {
  __typename?: 'PolicyTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Policy>;
  total: Scalars['Int']['output'];
};

export type PolicyTypeCount = {
  __typename?: 'PolicyTypeCount';
  count: Scalars['Int']['output'];
  policy_type: Scalars['String']['output'];
};

/** Server-side table page over the by-type aggregate (policyStatsTable). */
export type PolicyTypeCountTablePage = {
  __typename?: 'PolicyTypeCountTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<PolicyTypeCount>;
  total: Scalars['Int']['output'];
};

/**
 * One wording a policy has had.
 *
 * The stored history holds only SUPERSEDED wordings; the live document is
 * returned as the newest entry, flagged `is_current`. `content_hash` is what
 * makes an acceptance row readable — the log records the hash of what somebody
 * agreed to and nothing else.
 */
export type PolicyVersion = {
  __typename?: 'PolicyVersion';
  content: Scalars['String']['output'];
  content_hash: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** True for the wording in force right now. */
  is_current: Scalars['Boolean']['output'];
  policy_type: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updated_by?: Maybe<Scalars['ID']['output']>;
  /** Resolved at read time, so a renamed account still reads correctly. */
  updated_by_name: Scalars['String']['output'];
  /** 1 for the earliest wording, counting up. The newest is the live one. */
  version_no: Scalars['Int']['output'];
};

/** One staff console in the Jump to Portal directory, with the signed-in user's standing. */
export type PortalAccessEntry = {
  __typename?: 'PortalAccessEntry';
  /** False where access is not granted through this flow (the Admin console, ungated surfaces). */
  can_request: Scalars['Boolean']['output'];
  /** Whether the signed-in user's roles open this console today. */
  has_access: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** The user's latest PORTAL_ACCESS request outcome for this console, if any. */
  request_status?: Maybe<ApprovalStatus>;
  url: Scalars['String']['output'];
};

export type PortalLoginOtpInput = {
  email: Scalars['String']['input'];
  otp: Scalars['String']['input'];
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type PortalLoginOtpRequestInput = {
  email: Scalars['String']['input'];
  /** The console being signed in to. The code only works for this one. */
  portal_key?: InputMaybe<Scalars['String']['input']>;
};

export type PortalMode = {
  __typename?: 'PortalMode';
  /** Whether this console's header offers the Apps drawer. */
  apps_enabled: Scalars['Boolean']['output'];
  /**
   * Whether this console's header offers "Chat with a coworker" — the docked
   * staff chat and its entry in the apps drawer.
   */
  chat_enabled: Scalars['Boolean']['output'];
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
  apps_enabled: Scalars['Boolean']['output'];
  chat_enabled: Scalars['Boolean']['output'];
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
  /**
   * May the signed-in viewer delete this? The author always can; a CLUB
   * story additionally answers to that club's admins, because it was
   * published under the club's name. Server-owned so the two apps cannot
   * disagree about who is allowed to press it.
   */
  can_delete: Scalars['Boolean']['output'];
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

/** Brand-admin analytics for one product: orders/units/earnings (from order data) + views/clicks (tracked forward). */
export type ProductAnalytics = {
  __typename?: 'ProductAnalytics';
  currency_symbol: Scalars['String']['output'];
  gross_revenue: Scalars['Float']['output'];
  linked_pods: Scalars['Int']['output'];
  locations: Array<ProductAnalyticsLocation>;
  orders: Scalars['Int']['output'];
  product_id: Scalars['ID']['output'];
  total_clicks: Scalars['Int']['output'];
  /** Gross minus Duncit commission — the brand's estimated net. */
  total_earning: Scalars['Float']['output'];
  total_views: Scalars['Int']['output'];
  units_sold: Scalars['Int']['output'];
  variants: Array<ProductVariantStat>;
};

export type ProductAnalyticsLocation = {
  __typename?: 'ProductAnalyticsLocation';
  location: Scalars['String']['output'];
  orders: Scalars['Int']['output'];
  units_sold: Scalars['Int']['output'];
};

/** One cart line for the standalone product checkout — each keeps its own pod (the pod's per-pod stock gate still applies). */
export type ProductCartItemInput = {
  /** Optional per-line fulfilment override; falls back to the cart-level method. */
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  pod_id: Scalars['ID']['input'];
  product_id: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  variant_id?: InputMaybe<Scalars['ID']['input']>;
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

/** Standalone product-cart checkout (no pod ticket). Shipping is quoted live from ShipRocket and charged on top. */
export type ProductCheckoutInput = {
  billing?: InputMaybe<CheckoutBillingInput>;
  billing_address?: InputMaybe<Scalars['String']['input']>;
  checkout_url: Scalars['String']['input'];
  contact_email: Scalars['String']['input'];
  contact_name?: InputMaybe<Scalars['String']['input']>;
  contact_phone?: InputMaybe<Scalars['String']['input']>;
  contact_phone_extension: Scalars['String']['input'];
  contact_phone_number: Scalars['String']['input'];
  coupon_code?: InputMaybe<Scalars['String']['input']>;
  /** Destination pincode for the ShipRocket rate; falls back to shipping_address.pincode. */
  delivery_pincode?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Cart-level default fulfilment method (default PICKUP). */
  fulfilment_method?: InputMaybe<FulfilmentMethod>;
  items: Array<ProductCartItemInput>;
  /** Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill. */
  redeem_coins?: InputMaybe<Scalars['Int']['input']>;
  /** Delivery address, required when any product ships. */
  shipping_address?: InputMaybe<OrderShippingAddressInput>;
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
  /** Line subtotal (qty x unit price) at/above which this product's delivery is free. Omit/null = no offer. */
  free_delivery_above?: InputMaybe<Scalars['Float']['input']>;
  height_cm?: InputMaybe<Scalars['Float']['input']>;
  image_url: Scalars['String']['input'];
  images?: InputMaybe<Array<Scalars['String']['input']>>;
  inventory_count: Scalars['Int']['input'];
  /** Legacy delivery-partner flag. No longer collected from brands (defaults to false); kept optional for backward compatibility. */
  is_duncit_delivery_partner?: InputMaybe<Scalars['Boolean']['input']>;
  length_cm?: InputMaybe<Scalars['Float']['input']>;
  /** Product-level option definitions (e.g. Size, Colour); variants are their combinations. */
  options?: InputMaybe<Array<ProductOptionInput>>;
  /** Warehouse (BrandPickupLocation of the SAME brand) this product ships from. */
  pickup_location_id?: InputMaybe<Scalars['ID']['input']>;
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

/** A pod that currently stocks a catalogue product — the per-pod purchase context (price, stock, delivery) needed to add the product to the cart when there is no pod route context (catalogue / standalone product detail). */
export type ProductPodOption = {
  __typename?: 'ProductPodOption';
  available_count: Scalars['Int']['output'];
  club_slug: Scalars['String']['output'];
  /** Live product threshold: line subtotal at/above which delivery is free (null = no offer). */
  free_delivery_above?: Maybe<Scalars['Float']['output']>;
  image_url: Scalars['String']['output'];
  /** The pod's document id — the value that goes on the cart line's pod_id. */
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  product_name: Scalars['String']['output'];
  unit_cost: Scalars['Float']['output'];
};

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

export type ProductShippingQuote = {
  __typename?: 'ProductShippingQuote';
  /** True when every warehouse group was priced live by ShipRocket. */
  all_quoted: Scalars['Boolean']['output'];
  currency_symbol: Scalars['String']['output'];
  lines: Array<ProductShippingQuoteLine>;
  total: Scalars['Float']['output'];
};

export type ProductShippingQuoteInput = {
  delivery_pincode: Scalars['String']['input'];
  items: Array<ProductCartItemInput>;
};

/** One (pod, warehouse) group's delivery estimate in a product-cart shipping quote — each group ships (and is charged) separately. */
export type ProductShippingQuoteLine = {
  __typename?: 'ProductShippingQuoteLine';
  charge: Scalars['Float']['output'];
  courier_name: Scalars['String']['output'];
  /** True when every line in this warehouse group met its product's free-delivery threshold (charge = 0). */
  free: Scalars['Boolean']['output'];
  pickup_pincode: Scalars['String']['output'];
  /** The pod this shipment group belongs to (null/empty when the cart line carried no pod). */
  pod_id?: Maybe<Scalars['ID']['output']>;
  /** True when priced live by ShipRocket; false when it fell back to the manual delivery charge. */
  quoted: Scalars['Boolean']['output'];
  warehouse_id: Scalars['ID']['output'];
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

export type ProductVariantStat = {
  __typename?: 'ProductVariantStat';
  clicks: Scalars['Int']['output'];
  orders: Scalars['Int']['output'];
  units_sold: Scalars['Int']['output'];
  variant_id: Scalars['String']['output'];
  variant_label: Scalars['String']['output'];
  views: Scalars['Int']['output'];
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
  /** Whether a host must verify an attendee's name and phone over OTP before marking them present by hand. The door scan is proof on its own and is never gated by this. */
  attendance_otp_required: Scalars['Boolean']['output'];
  /** CUSTOM anchor — the instant the apps' clock should read (ISO). */
  custom_time?: Maybe<Scalars['String']['output']>;
  /** Server's real time when the CUSTOM anchor was saved (ISO). */
  custom_time_set_at?: Maybe<Scalars['String']['output']>;
  date_format: Scalars['String']['output'];
  /** Days a Create-Pod draft is kept (from last save) before auto-deletion. */
  draft_retention_days: Scalars['Int']['output'];
  /** Max Backout attempts a user gets per pod (each 'Backout in process' counts one). */
  max_backout_attempts: Scalars['Int']['output'];
  /** Minimum age (whole years) required to sign up or save a date of birth. */
  min_signup_age: Scalars['Int']['output'];
  /** The server's clock at the moment this response was built (ISO). Clients add their own elapsed time to keep it ticking. */
  server_time: Scalars['String']['output'];
  time_format: Scalars['String']['output'];
  /** Where every app reads 'now' from: SERVER, BROWSER or CUSTOM. */
  time_source: TimeSource;
  /** IANA timezone (e.g. Asia/Kolkata) used to display all dates & times. */
  time_zone: Scalars['String']['output'];
  /** Account Health points deducted from a venue when its owner cancels a pod booked there (0 disables the penalty). */
  venue_cancel_health_penalty: Scalars['Int']['output'];
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
  /** The three-state Follow button. is_following stays as the FOLLOWING shorthand. */
  follow_status: FollowStatus;
  followers_count: Scalars['Int']['output'];
  following_count: Scalars['Int']['output'];
  /**
   * Whether THIS user follows the signed-in viewer — the other direction of the
   * edge. What turns the viewer's Follow button into Follow Back. False with no
   * viewer.
   */
  follows_viewer: Scalars['Boolean']['output'];
  full_name?: Maybe<Scalars['String']['output']>;
  /**
   * The OPEN follow request this user has sent the viewer, if any — so the
   * viewer can accept or deny it from the profile itself, not only from the
   * notification about it. Null with no viewer or no open ask.
   */
  inbound_request_id?: Maybe<Scalars['ID']['output']>;
  /** Whether the signed-in viewer follows this user. */
  is_following: Scalars['Boolean']['output'];
  /** PRIVATE when this profile hides its posts/stories from non-followers. */
  is_private: Scalars['Boolean']['output'];
  last_name?: Maybe<Scalars['String']['output']>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  /**
   * The stored, globally unique @handle — what /u/<username> carries and
   * what the follow lists render. Accounts that predate the field fall back to
   * a handle derived from the name until the migrate:usernames script has run,
   * so this is never blank.
   */
  username: Scalars['String']['output'];
  zone?: Maybe<Scalars['String']['output']>;
};

export type PublicRole = {
  __typename?: 'PublicRole';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type PurgeAccountTraceInput = {
  field_path: Scalars['String']['input'];
  model_name: Scalars['String']['input'];
  request_doc_id: Scalars['ID']['input'];
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
  /** Admin Panel: the window, the schedule, and when it last ran. */
  accountDeletionCronSettings: AccountDeletionCronSettings;
  /** How many requests are past their date right now — the console's preview. */
  accountDeletionDueCount: Scalars['Int']['output'];
  /** One request plus a live count of where that member still appears. */
  accountDeletionRequest: AccountDeletionDetail;
  /** Tech console queue. */
  accountDeletionRequestsTable: AccountDeletionRequestPage;
  /** The audit log: every sweep, newest first. */
  accountDeletionRuns: AccountDeletionRunPage;
  /**
   * The retention window. Readable by any signed-in member, because both apps
   * warn with the number BEFORE anyone confirms — a promise the product makes
   * has to come from the same place the date is stamped from.
   */
  accountDeletionSettings: AccountDeletionSettings;
  /** Live ads for a placement (includes AUTO ads). Public — powers the app ad slots. */
  activeAds: Array<PublicAd>;
  /**
   * The one popup this signed-in user should see right now, or null. Enabled,
   * inside its date window, matching the caller's platform and audience, and
   * not already dismissed by this user.
   */
  activeAppPopup?: Maybe<AppPopup>;
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
  /** Admin console table — every Auto Pod at every stage. */
  adminAutoPodsTable: AutoPodTablePage;
  /** Admin/Finance: everyone on a pod with contact info and replacement links. */
  adminPodAttendees: Array<AdminPodAttendee>;
  /**
   * The admin consoles' projection for a pod they are writing. Prices at the
   * CHOSEN host's rates (host_user_id — the host picked in the editor) or, with
   * none chosen, at the platform's default rates, which is exactly what an Auto
   * Pod template is checked against before any host enrols. The venue's money
   * is read from the slot itself (venue_slot_id), never typed by the client.
   * Admin roles only.
   */
  adminPotentialPodEarnings: PodEarningsProjection;
  /** Onboarding/admin: all slots for any venue (role-gated, no owner check). */
  adminVenueSlots: Array<VenueSlot>;
  agentAvailability: AgentAvailability;
  /** Chip/dialog copy for any upload surface. Public — it is copy, and an upload field must never wait on a session to render its own safety notice. */
  aiMonitoringConfig: AiMonitoringConfig;
  /** AI Portal: full monitoring history (server-side table). */
  aiMonitoringLogsTable: AiMonitoringLogsTableResult;
  /** AI Portal: the copy plus the image-analysis prompt. */
  aiMonitoringSettings: AiMonitoringSettings;
  aiPrompt?: Maybe<AiPrompt>;
  aiPrompts: Array<AiPrompt>;
  /** The API campaigns AiSensy has for this project. */
  aisensyCampaigns: Array<AisensyCampaign>;
  /** Whether the Tech portal holds the AiSensy Project credentials that read campaigns and templates. */
  aisensyProjectConfigured: Scalars['Boolean']['output'];
  /** AiSensy configuration state for the Tech portal. */
  aisensyStatus: AisensyStatus;
  /** The WhatsApp message templates AiSensy has for this project. */
  aisensyTemplates: Array<AisensyTemplate>;
  /** Admin: both surfaces for the Upload Settings pages. */
  allUploadSettings: Array<UploadSetting>;
  appBuildSettings: AppBuildSettings;
  appBuildTriggerConfig: AppBuildTriggerConfig;
  /** CI builds of one platform, newest first (Tech portal App Builds tables). */
  appBuildsTable: AppBuildTablePage;
  appPopupsTable: AppPopupTablePage;
  appSettings: AppSettings;
  appVersionInfo: AppVersionInfo;
  /** Admin inbox of approval requests (defaults to all; filter by status/type). */
  approvalRequests: Array<ApprovalRequest>;
  /** Server-side table page (search/filter/sort/paginate) over the admin approval inbox. */
  approvalRequestsTable: ApprovalRequestTablePage;
  /** The bots offered in the Ask Bot list, in the order they should be shown. */
  askBots: Array<AskBot>;
  /** Dropdown values for the audience filters that are driven by data. */
  audienceFilterOptions: AudienceFilterOptions;
  /** One saved list, with its member count recomputed. */
  audienceList?: Maybe<AudienceList>;
  /**
   * Who may still be ADDED to one saved list — the whole audience minus whoever
   * the list already holds. Derived from the same membership the query above
   * renders, so the Add-user picker cannot offer somebody already in the list.
   */
  audienceListCandidatesTable: AudienceTablePage;
  /**
   * Who is in one saved list right now — the criteria re-run, plus everyone
   * added by hand. The union is resolved here so a list's detail page can never
   * show a membership that differs from what the next send reaches.
   */
  audienceListMembersTable: AudienceTablePage;
  /** Everybody who can open this portal — the assignable owners for a list. */
  audienceListOwners: Array<AudienceListOwner>;
  /** Every saved list, for the audience dropdowns. Each carries its live reach. */
  audienceLists: Array<AudienceList>;
  /** Saved Target Audience lists. */
  audienceListsTable: AudienceListTablePage;
  /**
   * The marketing Target Audience list. Soft-deleted accounts are always
   * excluded. Beyond the plain field filters, three filter fields are resolved
   * server-side: 'age' (translated to a date-of-birth range), 'whatsapp', and
   * 'push_platform' / 'interest_category' (resolved to a user-id set).
   */
  audienceTable: AudienceTablePage;
  /** One Auto Pod. Admins, and any partner who can act on or has enrolled in it. */
  autoPod: AutoPod;
  /**
   * Admin only: who could enrol in a new Auto Pod of this sub-category — the
   * venues hosting it, the hosts approved in it and the admins of clubs carrying
   * it — with the counts the template form gates its next step on.
   */
  autoPodAudience: AutoPodAudience;
  /** What a ticket price and spot count would earn the CALLING host on this offer, plus the spot limits. */
  autoPodHostProjection: AutoPodHostProjection;
  /**
   * The free slots one of the caller's venues could commit to an offer, in the
   * next auto_pod_slot_window_days days, nearest first — each with what the
   * venue would be paid after Finance's deductions.
   */
  autoPodVenueSlots: AutoPodVenueSlots;
  /** Active, currently-valid coupons a shopper can apply (global + this pod). */
  availableCouponsForPod: Array<Coupon>;
  availablePodProducts: Array<InventoryProduct>;
  backoutRefundRequest?: Maybe<BackoutRefundRequest>;
  /** Finance-only: every Backout request ever raised (all statuses, for audit). */
  backoutRefundRequests: Array<BackoutRefundRequest>;
  backoutRefundRequestsTable: BackoutRefundRequestTablePage;
  badge?: Maybe<Badge>;
  badges: Array<Badge>;
  /** Resolve a booking deep link. Only the user who owns the booking may read it. */
  bookingDetail: BookingDetail;
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
  bug?: Maybe<Bug>;
  /** Recent persisted error logs that roll up into this bug (same fingerprint). */
  bugOccurrences: Array<TelemetryLog>;
  /** Every bug, unpaginated, for the JSON export. */
  bugsExport: Array<Bug>;
  bugsTable: BugTablePage;
  /**
   * PUBLIC. Every form anyone on the internet can post asks for one of these
   * first, so this cannot itself require a session.
   */
  captchaChallenge: CaptchaChallenge;
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
  /** Host(s) and participants of a pod's chat (members only). */
  chatParticipants: ChatParticipants;
  checkoutQuote: CheckoutQuote;
  club?: Maybe<Club>;
  /** Offers one of the caller's clubs may still claim, plus their claims. */
  clubAdminAutoPods: Array<AutoPod>;
  /**
   * Club Admins whose onboarding taxonomy matches a club's — the picker on the
   * New Club form.
   *
   * The mirror of clubAdminMatchingClubs. Without it the form offered every
   * CLUB_ADMIN role-holder on the platform, so a club could be handed to an
   * admin onboarded for an unrelated category. Matching happens at the level
   * the CLUB supplies; passing no category returns everyone, so the picker
   * still works before one is chosen. APPROVED + active only — a DRAFT profile
   * is somebody mid-onboarding who cannot yet be handed a club.
   */
  clubAdminCandidates: Array<ClubAdminCandidate>;
  /** Aggregated metrics for the signed-in Club Admin's clubs. */
  clubAdminDashboard: ClubAdminDashboard;
  /** Table page over the dashboard's computed per-club breakdown rows. */
  clubAdminDashboardTable: ClubAdminClubRowTablePage;
  /** Approved hosts matching the search, for the assign-host picker. Club-admin scoped. */
  clubAdminHostSearch: Array<ClubAdminHostOption>;
  /**
   * Clubs for the Assign Clubs picker: this Club Admin's Super > Category > Sub,
   * plus any club they already run that falls outside it.
   */
  clubAdminMatchingClubs: Array<ClubAdminClubOption>;
  /**
   * Attendees of one pod in the caller's clubs — the club-admin twin of
   * adminPodAttendees.
   *
   * Its own query rather than a role added to the admin one: CLUB_ADMIN is a
   * membership of a club, not a role on the user, so requireRole cannot express
   * it. Gated on assertClubAdminForPod, which is what keeps a club admin inside
   * their own club.
   */
  clubAdminPodAttendees: Array<AdminPodAttendee>;
  /** Full action trail of one pod in the caller's clubs, newest first. */
  clubAdminPodAuditLogs: Array<PodAuditLog>;
  /** Club admin: the same trail scoped to the clubs the caller administers. */
  clubAdminPodAuditLogsTable: PodAuditLogTablePage;
  /** Rating + review summary for one pod in the caller's clubs. */
  clubAdminPodFeedback: PodFeedbackSummary;
  /**
   * ONE pod in the caller's clubs, in the shape the club-admin pod editor
   * prefills from.
   *
   * Its own query rather than the public pod query: that one only honours
   * include_deleted for platform reviewers, and a cancelled pod stays editable
   * for the club admin who has to correct it. Gated on assertClubAdminForPod,
   * which is what keeps a club admin inside their own club.
   */
  clubAdminPodForEdit?: Maybe<Pod>;
  /**
   * The host profile behind one of this pod's hosts.
   *
   * Scoped to the pod, not to an arbitrary user id: a club admin may read the
   * host running their pod, not look up any host on the platform.
   */
  clubAdminPodHost?: Maybe<Host>;
  /**
   * Payments for ONE pod in the caller's clubs.
   *
   * Deliberately takes a pod id instead of the admin paymentsTable's free-form
   * TableQueryInput: that input can express "every payment on the platform", and
   * handing it to a club admin would let them read other clubs' money. The pod
   * filter is applied server-side and cannot be overridden by the caller.
   */
  clubAdminPodPayments: PaymentTablePage;
  /**
   * Pods across the signed-in Club Admin's clubs, scoped server-side. Shows
   * EVERY stage — including pods awaiting the venue owner's approval and
   * cancelled ones — so a club admin can open and edit a pod wherever it sits
   * in the booking cycle. Pass club_id to narrow to one of their clubs.
   *
   * The status argument narrows to one bucket of the table's Status column. It
   * is an argument rather than a column filter because the chip is derived from
   * four fields at once, so it cannot ride the table engine's field allowlist.
   */
  clubAdminPodsTable: PodTablePage;
  clubAdminProfile?: Maybe<ClubAdminProfile>;
  /** Onboarded Club Admins, for the Onboarding portal's table. */
  clubAdminProfilesTable: ClubAdminProfileTablePage;
  clubBySlug?: Maybe<Club>;
  /**
   * People who follow this club — the list behind followers_count, so the count
   * on the club page can open the members it is counting.
   */
  clubFollowers: Array<PublicProfile>;
  clubRatings: Array<ClubRating>;
  /** Active (non-expired) stories attached to a club, newest first (Bug 6). */
  clubStories: Array<Post>;
  clubs: Array<Club>;
  clubsTable: ClubTablePage;
  /** Approved hosts in the same sub-category who can be invited as co-hosts. Excludes the caller and anyone already invited. */
  coHostCandidates: Array<CoHostCandidate>;
  /** Finance > Duncit Coin > Dashboard. 'months' bounds the distribution series (default 12, max 36). */
  coinAdminStats: CoinAdminStats;
  /** Every coin payout rule, for Finance > Duncit Coin > Settings. */
  coinSettings: CoinSettings;
  /** Finance > Duncit Coin > Transactions. 'pod_doc_id' scopes the page to coins settled by that pod's payments. */
  coinTransactionsTable: CoinAdminTransactionTablePage;
  /** Name/email search for the manual-adjustment picker. Under two characters returns nothing. */
  coinUserSearch: Array<CoinUserOption>;
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
  contentReport?: Maybe<ContentReport>;
  contentReportStats: ContentReportStats;
  /** Legal-only queue of everything users have reported. */
  contentReportsTable: ContentReportTablePage;
  contract?: Maybe<Contract>;
  /**
   * The contract as a PDF (base64) — the same document before and after
   * signing, with a signature block appended once it has been signed.
   */
  contractPdfBase64: Scalars['String']['output'];
  contractsTable: ContractTablePage;
  coupon?: Maybe<Coupon>;
  coupons: Array<Coupon>;
  couponsForPod: Array<Coupon>;
  /** Table sibling of couponsForPod — this pod's coupons plus every GLOBAL coupon. */
  couponsForPodTable: CouponTablePage;
  couponsTable: CouponTablePage;
  /** Everyone you could message, minus yourself. Search matches name or email. */
  coworkers: Array<Coworker>;
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
  /** One clone job by id, or the most recent one when id is omitted. Polled for progress. */
  dataCloneJob?: Maybe<DataCloneJob>;
  /** The saved production + staging connections, seeded from the environment on first read. */
  dataCloneSettings: DataCloneSettings;
  /** Source/target databases and the exclusion list, without starting anything. */
  dataCloneTargets: DataCloneTargets;
  /** The automatic backup schedule, created with defaults on first read. */
  dbBackupSettings: DbBackupSettings;
  /** Every backup run, paged for the table. */
  dbBackupsTable: DbBackupTablePage;
  /** One restore by id, or the most recent one. Polled for progress. */
  dbRestoreJob?: Maybe<DbRestore>;
  /**
   * The same, for Club Admins — the Onboarding console's Review Club Admin
   * dialog seeds its Pay Commission field from this, so a reviewer opens on the
   * cut a club admin is actually paid when they carry no override of their own.
   */
  defaultClubAdminCommissionPct: Scalars['Float']['output'];
  /**
   * Just the global default host commission % (Finance → Default Deductions).
   * Split out of financeSettings because the Onboarding console's Review Host
   * dialog seeds its commission field from this number, and financeSettings
   * also carries the business GSTIN, invoice branding and payout config that
   * onboarding staff have no business reading.
   */
  defaultHostCommissionPct: Scalars['Float']['output'];
  /**
   * The same, for product sales — the Onboarding console's Review Brand dialog
   * seeds its commission field from this whenever the brand has no override, so
   * the number on screen is the one the product invoice will charge.
   */
  defaultProductCommissionPct: Scalars['Float']['output'];
  /**
   * The same, for venues — the Onboarding console's Review Venue dialog seeds
   * its commission field from this so a reviewer sees the number settlement
   * will actually apply when the venue carries no override of its own.
   */
  defaultVenueCommissionPct: Scalars['Float']['output'];
  /** Onboarding/admin: a single brand by id. */
  ecommBrand?: Maybe<EcommBrand>;
  /** Onboarding/admin: all brands, optionally filtered by status. */
  ecommBrands: Array<EcommBrand>;
  /** Server-side table sibling of ecommBrands (shared table engine). */
  ecommBrandsTable: EcommBrandTablePage;
  ecommLead?: Maybe<EcommLead>;
  ecommLeads: Array<EcommLead>;
  ecommLeadsTable: EcommLeadTablePage;
  emailFragment?: Maybe<EmailFragment>;
  /** Every fragment — the nine first, then the custom ones. */
  emailFragments: Array<EmailFragment>;
  /** One attempt with its rendered body and variables — what the drawer opens. */
  emailLog?: Maybe<EmailLog>;
  /** Deliverability over the last N days. Defaults to 7, capped at 90. */
  emailLogDashboard: EmailLogDashboard;
  emailLogStats: EmailLogStats;
  /** Every email attempt, newest first. Filter by status, category, source, template. */
  emailLogsTable: EmailLogTablePage;
  emailTemplate?: Maybe<EmailTemplate>;
  emailTemplateBySlug?: Maybe<EmailTemplate>;
  /**
   * Send counts and last-used dates, one entry per template slug.
   *
   * Beside the log rather than beside the templates because every figure in it
   * is read off EmailLog — and deliberately NOT a field on EmailTemplate, which
   * would be one aggregation per row on a page listing thirty-five of them.
   */
  emailTemplateUsage: Array<EmailTemplateUsage>;
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
  /** Posts from the people/clubs the viewer follows, newest first. Stories are excluded — they live on the story rails. */
  followingFeed: Array<Post>;
  /** People the given user follows (their public profiles). */
  followingOf: Array<PublicProfile>;
  /** Founder/Startup dashboard: every KPI for the date range, computed + manual. */
  founderDashboard: FounderDashboard;
  /** Finance > Gift Cards > Dashboard. 'months' bounds the monthly series (default 12, max 36). */
  giftCardAdminStats: GiftCardAdminStats;
  /** One card by its code, for the claim/redeem page. Holding the code is holding the value, so any signed-in holder may look. */
  giftCardByCode: GiftCard;
  /** Finance > Gift Cards > Logs. Every issue and every conversion to coins. */
  giftCardTransactionsTable: GiftCardAdminTransactionTablePage;
  /** Finance > Gift Cards > Cards. Every card ever sold, with buyer and redeemer. */
  giftCardsTable: GiftCardAdminCardTablePage;
  /** Public: the officer the app and website publish. */
  grievanceOfficer: GrievanceOfficer;
  grievanceStats: GrievanceStats;
  grievanceTicket?: Maybe<GrievanceTicket>;
  grievanceTicketsTable: GrievanceTicketTablePage;
  host?: Maybe<Host>;
  /**
   * Offers this host may still take (in a sub-category they are approved in),
   * plus the ones they took. sub_category_id narrows to one of their categories;
   * location_id as for venueAutoPods.
   */
  hostAutoPods: Array<AutoPod>;
  /** The host profile behind a user, or null when they have never onboarded. */
  hostByUser?: Maybe<Host>;
  hostInsights: HostInsights;
  hostLead?: Maybe<HostLead>;
  hostLeads: Array<HostLead>;
  hostLeadsTable: HostLeadTablePage;
  hostPodDeleteImpact: HostPodDeleteImpact;
  /**
   * Host-only view backing the waiting screen shown after creating a pod whose
   * venue slot request is PENDING. Only the pod's hosts and its non-declined
   * co-hosts may read it — venue/admin contact details are PII.
   */
  hostPodPendingView: HostPodPendingView;
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
  /** One ranked board with the caller's own points and rank. Period defaults to MONTH. */
  leaderboard: LeaderboardBoard;
  /** Admin > Leaderboard > Boards headline cards. */
  leaderboardAdminStats: Array<LeaderboardCategoryStats>;
  /** Points-per-action and active rewards. Public, like the ad rate card. */
  leaderboardConfig: LeaderboardConfig;
  /** Admin > Leaderboard > Points Ledger. */
  leaderboardPointsTable: LeaderboardAdminPointTablePage;
  /** Admin > Leaderboard > Settings & Rewards. */
  leaderboardSettings: LeaderboardSettings;
  legalDocument?: Maybe<LegalDocument>;
  /**
   * The contract as a PDF (base64) — the same document before and after
   * signing, with a signature block appended once it has been signed.
   */
  legalDocumentPdfBase64: Scalars['String']['output'];
  legalDocumentStats: LegalDocumentStats;
  legalDocumentStatsTable: LegalDocumentTypeCountTablePage;
  legalDocuments: Array<LegalDocument>;
  legalDocumentsTable: LegalDocumentTablePage;
  /** Which signing methods this platform allows, from the feature flags. */
  legalSignatureMethods: Array<SignatureMethod>;
  /**
   * Hydrates the meta tags mWeb's HTML server injects for social crawlers.
   *
   * Deliberately unauthenticated: WhatsApp/Slack/X fetch a shared link with no
   * session, and the unfurled card must still show the pod instead of a bare
   * logo. The resolver returns null (never an error) for anything unknown,
   * deleted or inactive, so a stale link degrades to the app's default card.
   */
  linkPreview?: Maybe<LinkPreview>;
  /**
   * Only the ads showing right now — approved, started, not yet ended. LIVE is
   * a date window rather than a stored status, so it needs its own query.
   */
  liveAdsTable: AdRequestTablePage;
  /** Every locale, for admin lists. */
  locales: Array<Locale>;
  location?: Maybe<Location>;
  locations: Array<Location>;
  locationsTable: LocationTablePage;
  /** Every connected mailbox. Read by both the Tech and Support portals. */
  mailAutomationAccounts: Array<MailAutomationAccount>;
  /** Whether a Google OAuth client is configured to connect a mailbox with. */
  mailAutomationConfigured: Scalars['Boolean']['output'];
  /**
   * Read the reply back before saving. Takes the same input as the save and
   * applies it to an unsaved copy, so the preview answers "what does the
   * message I just typed do" rather than "what did the last saved one do".
   */
  mailAutomationPreview: MailAutomationPreview;
  /** Recent conversations this mailbox answered — the audit trail for the rule. */
  mailAutomationThreads: Array<MailAutomationThread>;
  /** Opt-outs and opt-ins over a window. Defaults to 30 days, capped at 365. */
  mailPreferenceAnalytics: MailPreferenceAnalytics;
  /** Every preference change ever made, newest first. */
  mailPreferenceLogsTable: MailPreferenceLogTablePage;
  /**
   * The preferences an unsubscribe link points at.
   *
   * Deliberately unauthenticated: the person clicking it is reading an email, not
   * signed in, and an opt-out behind a login screen is one most people abandon.
   * The signature in the link is what proves whose preferences these are.
   */
  mailPreferencesByToken?: Maybe<MailPreference>;
  /** One campaign in full, including its rendered HTML — powers the View dialog. */
  marketingCampaign: MarketingCampaign;
  marketingCampaignPreviewCards: Array<MarketingCampaignPreviewCard>;
  /** Every variable a campaign may use, with a live sample of its value. */
  marketingCampaignVariables: Array<MarketingCampaignVariable>;
  marketingCampaigns: Array<MarketingCampaign>;
  marketingCampaignsTable: MarketingCampaignTablePage;
  marketingDashboard: MarketingDashboard;
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
  /** Everything ImageKit knows about one file — the details panel. */
  mediaFile: MediaItem;
  /**
   * A page of the media library. Search matches the file name, fileType is
   * image or non-image, and sort takes ImageKit's own values (DESC_CREATED
   * by default).
   */
  mediaFiles: Array<MediaItem>;
  /** Global slot-availability config. */
  meetingAvailability: MeetingAvailability;
  /** Onboarding-team holidays / leave days (block slots; shown on the calendar). */
  meetingHolidays: Array<MeetingHoliday>;
  /** Bookable slots (others' bookings disabled). Pass kind so the user's own other-flow bookings show unavailable; staff pass exclude_meeting_id to keep the meeting being scheduled selectable. */
  meetingSlots: Array<MeetingSlot>;
  /** Admin > Membership > Plans > Benefits. */
  membershipBenefits: Array<MembershipBenefit>;
  membershipBenefitsTable: MembershipBenefitTablePage;
  /** Admin > Membership > Subscribers. */
  membershipNewsSubscribersTable: MembershipNewsSubscriberTablePage;
  /** Admin > Membership > Plans. */
  membershipPlans: Array<MembershipPlan>;
  membershipPlansTable: MembershipPlanTablePage;
  /** The membership pricing screen — mWeb and the native app render this. */
  membershipPricing: MembershipPricing;
  /** The signed-in member's own open request, or null. */
  myAccountDeletionRequest?: Maybe<AccountDeletionRequest>;
  /**  Account health for the signed-in user. Always returns a record (default base = 100).  */
  myAccountHealth: HealthScore;
  myActiveBouncerSos?: Maybe<BouncerSosAlert>;
  /** The signed-in advertiser's own requests (Ads portal). */
  myAdRequestsTable: AdRequestTablePage;
  /** The signed-in user's saved addresses (default first, then newest). */
  myAddresses: Array<UserAddress>;
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
  /** Per-role counts of Auto Pods waiting on the caller — drives role-switch landing. */
  myAutoPodActionCounts: AutoPodActionCounts;
  myBadgeProgress: Array<BadgeProgress>;
  myBadges: Array<UserBadge>;
  /** Warehouses of one of the caller's OWN brands (partner portal Brand Settings). */
  myBrandPickupLocations: Array<BrandPickupLocation>;
  /** The signed-in user's own callback request history, newest first. */
  myCallbackRequests: Array<BouncerCallbackRequest>;
  myChatRooms: Array<ChatRoom>;
  /**
   * Pods across the signed-in Club Admin's clubs for the Club Studio "Your Pods"
   * section, newest first — the club-side twin of venuePods. Every stage shows,
   * cancelled and awaiting-venue-approval included, matching clubAdminPodsTable.
   *
   * Scope is derived SERVER-SIDE from the caller's club memberships; club_id
   * only NARROWS within them and throws FORBIDDEN for a club they do not
   * administer (the same rule clubAdminPodsTable applies).
   */
  myClubPods: Array<ClubPod>;
  /** Roll-up figures for exactly the myClubPods scope, over every pod in it. */
  myClubPodsSummary: ClubPodSummary;
  /** Pods where I am a co-host. status defaults to ACCEPTED; pass PENDING for my invites. */
  myCoHostedPods: Array<Pod>;
  myCoinBalance: CoinBalance;
  myCoinTransactions: Array<CoinTransaction>;
  /** Every channel, whether it can reach this account, and its code switch. */
  myCommunicationPreference: CommPreference;
  /**
   * Auth-required: what the signed-in account can sign in with.
   *
   * Reads the password hash's PRESENCE (it is select:false, so the generic
   * user mapper cannot see it) which is why this is its own query rather than a
   * field on User.
   */
  myConnectedAccounts: ConnectedAccounts;
  /**
   * The signed-in user's layout for one dashboard, or null when they have
   * never saved one. Always scoped to the caller — a layout is a personal
   * preference and is never readable for anybody else.
   */
  myDashboardLayout?: Maybe<DashboardLayout>;
  /** The signed-in partner's e-commerce brands (a partner may run several). */
  myEcommBrands: Array<EcommBrand>;
  /** Server-side table sibling of myEcommBrands — always scoped to the caller's own brands. */
  myEcommBrandsTable: EcommBrandTablePage;
  /** Products portal: brand/product change requests raised from this portal (kind = BRAND | PRODUCT). */
  myEcommChangeRequests: Array<ApprovalRequest>;
  myEventTicketForPod?: Maybe<EventTicket>;
  myEventTickets: Array<EventTicket>;
  /** Open follow requests waiting on the signed-in user, newest first. */
  myFollowRequests: Array<FollowRequest>;
  /** The caller's gift cards — held or redeemed, and gifted away. */
  myGiftCards: MyGiftCards;
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
  /** The signed-in person's own mail preferences. */
  myMailPreferences: MailPreference;
  /** Current user's meeting request for a kind. */
  myMeeting?: Maybe<OnboardingMeeting>;
  /** All of the current user's onboarding meetings (one per kind). */
  myMeetings: Array<OnboardingMeeting>;
  myNotifications: Array<UserNotification>;
  /** One of the caller's own payments. Null when it does not exist or is not theirs — the checkout confirmation poll reads this instead of the whole history. */
  myPayment?: Maybe<Payment>;
  myPayments: Array<Payment>;
  /** An attended (past) pod the user has not yet rated — drives the post-pod feedback pop-up. */
  myPendingPodFeedback?: Maybe<BouncerPodInfo>;
  /**
   * Auth-required: what the signed-in account has NOT accepted at the policy's
   * CURRENT wording. A policy edited since they accepted comes back here.
   */
  myPendingPolicies: Array<Policy>;
  myPodDraft?: Maybe<PodDraft>;
  myPodDrafts: Array<PodDraft>;
  myPodIdeas: Array<PodIdea>;
  myPodMemberships: Array<PodMember>;
  /** My own pods that carry at least one co-host. */
  myPodsWithCoHosts: Array<Pod>;
  /** Every staff console with whether the signed-in user can open it (Jump to Portal). */
  myPortalAccess: Array<PortalAccessEntry>;
  myPosts: Array<Post>;
  /** Brand-admin analytics for one of the caller's own products. */
  myProductAnalytics: ProductAnalytics;
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
  /** The signed-in person's own WhatsApp switches. */
  myWhatsappPreference: WaPreference;
  myWithdrawals: Array<WalletWithdrawal>;
  newsletterSubscribers: Array<NewsletterSubscriber>;
  newsletterSubscribersTable: NewsletterSubscriberTablePage;
  notifications: Array<Notification>;
  notificationsTable: NotificationTablePage;
  /** Onboarding list of meetings (calendar + tables). */
  onboardingMeetings: Array<OnboardingMeeting>;
  /** Server-side table page (search/filter/sort/paginate) over onboarding meetings. */
  onboardingMeetingsTable: OnboardingMeetingTablePage;
  openAiTaskCatalogue: OpenAiTaskCatalogue;
  openAiUsageDashboard: OpenAiUsageDashboard;
  openAiUsageLog?: Maybe<OpenAiUsageLog>;
  openAiUsageLogsTable: OpenAiUsageLogTablePage;
  partnerDashboard: PartnerDashboard;
  partnerEcommStats: PartnerEcommStats;
  /** Admin Partners list — users holding a partner-portal role (Host / Venue Partner / Product Seller / Club Admin). */
  partnersTable: UserTablePage;
  payment?: Maybe<Payment>;
  /** Full audit of one payment: what it charged, what it created, and what failed. */
  paymentDetail: PaymentDetail;
  paymentInvoicePdfBase64: Scalars['String']['output'];
  paymentReleaseRequests: Array<PaymentReleaseRequest>;
  paymentReleaseRequestsTable: PaymentReleaseRequestTablePage;
  /** Aggregated totals over EVERY payment matching the filter (no row cap), SUCCESS only. */
  paymentTotals: PaymentTotals;
  payments: Array<Payment>;
  paymentsTable: PaymentTablePage;
  pexelsSearch: PexelsSearchResult;
  pexelsSearchVideos: PexelsVideoSearchResult;
  /** Everything pinned on this line, newest pin first. */
  pinnedStaffMessages: Array<StaffMessage>;
  /** include_deleted opens a cancelled pod too — honored for admin reviewers only. */
  pod?: Maybe<Pod>;
  /**
   * The pod's attendance roster. Readable by the pod's host/co-host and by an
   * admin of the club it belongs to; nobody else.
   */
  podAttendanceBoard: PodAttendanceBoard;
  /**
   * Seats each JOINED member of a pod holds. Powers the "+N other members" label
   * on the attendee list — one face per person, the group size beside their name.
   */
  podAttendeeSeats: Array<PodAttendeeSeats>;
  /** Full trail of one pod, newest first (admin). */
  podAuditLogs: Array<PodAuditLog>;
  /** Admin: AI-monitored audit trail of every pod action. */
  podAuditLogsTable: PodAuditLogTablePage;
  podBySlugs?: Maybe<Pod>;
  podCancellationStats: PodCancellationStats;
  podCancellations: Array<PodCancellation>;
  podComments: Array<PodComment>;
  /** The Admin panel's Pods dashboard, in one read. */
  podDashboard: PodDashboard;
  /** The same row for one pod — the expense drawer's header. */
  podExpensePodSummary?: Maybe<PodExpensePodRow>;
  /** Pod Expenses list: one row per pod, with its Duncit spend rolled up. */
  podExpensePodsTable: PodExpensePodTablePage;
  /** KPI tiles + per-category split for the Pod Expenses page. */
  podExpenseSummary: PodExpenseSummary;
  /** One pod's expense entries. */
  podExpensesTable: PodExpenseTablePage;
  /**
   * Everything the feedback page for one pod needs — backs the shareable
   * /pod/:podId/feedback link a host sends to their guests.
   */
  podFeedbackForm: PodFeedbackForm;
  /** Ratings for one pod, rolled up — backs the admin pod page. */
  podFeedbackSummary: PodFeedbackSummary;
  podFinanceBreakdown: PodFinanceBreakdown;
  podIdea?: Maybe<PodIdea>;
  podIdeas: Array<PodIdea>;
  podIdeasTable: PodIdeaTablePage;
  /**
   * The photos and videos from one pod — the Upload Pod Media page, the link a
   * host shares with the people who came, and the Complete Pod dialog all read
   * this one board.
   */
  podMediaBoard: PodMediaBoard;
  podMembers: Array<PodMember>;
  podMembershipState: PodMembershipState;
  podMessages: Array<PodMessage>;
  podPlans: Array<PodPlan>;
  podPlansTable: PodPlanTablePage;
  podSettlementPreview: PodSettlement;
  /** Every filled Backout seat of a pod — struck-through attendee rows (public). */
  podSpotFills: Array<PodSpotFill>;
  /** The range this pod may be resized within. Host, the pod's club admin, or an admin. */
  podSpotLimits: PodSpotLimits;
  /**
   * Withdrawal Payments, grouped by pod.
   *
   * A requested_from filter in the query narrows to pods that partner has
   * withdrawn against. It is applied to the allocations BEFORE grouping, so a
   * pod's totals only ever count that partner's legs — matching it against the
   * grouped row would keep pods whose other partners matched.
   */
  podWithdrawalGroupsTable: PodWithdrawalGroupPage;
  /** One pod's row from that list. Null when nothing has been withdrawn against it. */
  podWithdrawalSummary?: Maybe<PodWithdrawalGroup>;
  /** Every withdrawal attributed to one pod — the Withdrawal Payments drill-down. */
  podWithdrawalsTable: WalletWithdrawalTablePage;
  pods: Array<Pod>;
  /** Pods that currently stock a catalogue product — per-pod purchase context so a buyer can add the product to the cart from the catalogue / standalone product detail (any signed-in user). */
  podsForProduct: Array<ProductPodOption>;
  /**
   * include_deleted also lists cancelled pods — honored for admin reviewers only.
   * lifecycle narrows the page to one derived bucket; asking for CANCELLED is
   * itself the opt-in to soft-deleted rows, again for reviewers only.
   */
  podsTable: PodTablePage;
  policies: Array<Policy>;
  policiesTable: PolicyTablePage;
  policy?: Maybe<Policy>;
  /** Legal: everything behind one row of that log. */
  policyAcceptanceDetail: PolicyAcceptanceDetail;
  /** Legal: who accepted what, and when. Newest first. */
  policyAcceptancesTable: PolicyAcceptanceTablePage;
  policyBySlug?: Maybe<Policy>;
  /**
   * Legal: how many accounts a change notice would reach right now.
   *
   * Counted from the acceptance log rather than stored, because the answer
   * changes every time somebody accepts. It is what lets the notify checkbox
   * say what pressing it does before anyone presses it.
   */
  policyNotifyRecipientCount: Scalars['Int']['output'];
  /** The policy rendered as a downloadable PDF (base64). */
  policyPdfBase64: Scalars['String']['output'];
  policyStats: PolicyStats;
  policyStatsTable: PolicyTypeCountTablePage;
  /** Legal: every wording this policy has had, oldest first. */
  policyVersions: Array<PolicyVersion>;
  portalMode: PortalModePublic;
  portalModes: Array<PortalMode>;
  portalModesTable: PortalModeTablePage;
  post?: Maybe<Post>;
  posts: Array<Post>;
  potentialPodEarnings: PodEarningsProjection;
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
  /** Live ShipRocket delivery estimate for a product cart (preview only; the charged amount is recomputed server-side at checkout). */
  productShippingQuote: ProductShippingQuote;
  /** The same prices, public, for the advertising site's cost calculator. */
  publicAdRateCard: AdRateCard;
  publicAppSettings: PublicAppSettings;
  publicClientConfig: PublicClientConfig;
  /** Public brand card for the pod product-detail brand dialog (any signed-in user; select only non-sensitive fields client-side). */
  publicEcommBrand?: Maybe<EcommBrand>;
  publicFaqGroups: Array<FaqGroup>;
  publicFeatureFlags: Array<PublicFeatureFlag>;
  publicFinanceSettings: PublicFinanceSettings;
  /** Amount presets and validity for the buy page. Signed-in only. */
  publicGiftCardSettings: GiftCardSettings;
  publicHosts: Array<Host>;
  /** Public read of a single product (any signed-in user) — powers the product-detail view on a pod's shop. */
  publicInventoryProduct?: Maybe<InventoryProduct>;
  /** Active locales only — the language switcher on every surface. */
  publicLocales: Array<Locale>;
  publicPartnerFaqs: Array<Faq>;
  /**
   * The same projection for a signed-OUT visitor — the marketing site's earnings
   * estimator. Runs at the platform's DEFAULT rates (there is no host to
   * personalise for) and takes the venue's cost as a plain amount, so it is an
   * estimate at standard rates rather than a quote. Public on purpose: it
   * exposes the same percentages the pricing page states, and no user data.
   */
  publicPodEarningsEstimate: PodEarningsProjection;
  publicPodPlans: Array<PodPlan>;
  publicPolicies: Array<Policy>;
  publicRoles: Array<PublicRole>;
  /** What Home should show: active cards, in the order an admin put them. */
  publicSomethingForYou: Array<SomethingForYouItem>;
  /**
   * Flat key/value catalogue for one locale, merged over the default locale so a
   * partially translated locale still returns complete text. Clients merge this
   * over their bundled fallback, so a key missing here still renders.
   */
  publicTranslations: Array<TranslationEntry>;
  /**
   * One public profile. user_id accepts EITHER the @handle or a raw user id
   * — every link shared before handles existed carries an id, and those links
   * live in inboxes nobody can rewrite.
   */
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
  /** Server-side table page for the blocked-traffic table. */
  rateLimitEventsTable: RateLimitEventPage;
  /** The enum lists and the known apps and roles the rule editor renders. */
  rateLimitOptions: RateLimitOptions;
  rateLimitRule?: Maybe<RateLimitRule>;
  /** Every rule, in evaluation order. For the editor's priority preview. */
  rateLimitRules: Array<RateLimitRule>;
  /** Server-side table page for the rules table. */
  rateLimitRulesTable: RateLimitRulePage;
  /** Master settings plus the live store engine and the current counts. */
  rateLimitSettings: RateLimitSettings;
  /** Last 24 hours: refusals, recorded breaches, and who is causing them. */
  rateLimitStats: RateLimitStats;
  /** Every system that has called, with what it has spent. */
  rateLimitSystems: Array<RateLimitSystem>;
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
  /** The Report a Problem form config. Readable by any signed-in user — the app renders from it. */
  reportProblemConfig: ReportProblemConfig;
  /** Support portal: where reports are announced on Slack, and the channels to choose from. */
  reportProblemSlackSettings: ReportProblemSlackSettings;
  reportedProblem?: Maybe<FeedbackReport>;
  /** Support portal: every reported problem, newest first. */
  reportedProblemsTable: FeedbackReportTablePage;
  role?: Maybe<Role>;
  roles: Array<Role>;
  rolesTable: RoleTablePage;
  /** Club-centric discovery search grouped by upcoming-pod availability. */
  searchDiscovery: SearchResults;
  /** Find something that was said on this line. */
  searchStaffMessages: Array<StaffMessage>;
  /** Type-ahead suggestions across clubs, categories, pods and activities. */
  searchSuggestions: Array<SearchSuggestion>;
  /**
   * Keys the SERVER itself ships copy for (the MJML email templates), with their
   * bundled English text. The admin merges these with the client surfaces' own
   * bundles when seeding Translations, so email copy is translatable too.
   */
  serverTranslationSeed: Array<TranslationEntry>;
  /**
   * The caller's own chrome arrangement, with every default filled in when they
   * have never changed anything. Always scoped to the caller — this is a
   * personal preference and is never readable for anybody else.
   */
  shellWorkspaceState: ShellWorkspaceState;
  shortLink: ShortLink;
  /** Every campaign a link can be filed under — the share campaigns and the email ones. */
  shortLinkCampaigns: Array<ShortLinkCampaign>;
  /** Individual clicks on one link. */
  shortLinkClicks: ShortLinkClickTablePage;
  /** Click -> signup -> checkout -> paid, for one link. */
  shortLinkFunnel: ShortLinkFunnel;
  /** One row per click, with the person it became and how far they got. */
  shortLinkJourneys: ShortLinkJourneyTablePage;
  /** The channel and medium dropdowns, so no client keeps its own copy. */
  shortLinkOptions: ShortLinkOptions;
  /** A PNG data URL of the short link, rendered server-side. */
  shortLinkQr: Scalars['String']['output'];
  /** Aggregated click analytics for one link. */
  shortLinkStats: ShortLinkStats;
  shortLinksTable: ShortLinkTablePage;
  /**
   * The policies a new account must accept, in display order.
   *
   * PUBLIC and unauthenticated — the signup form is not signed in. Depends on no
   * argument and no caller, which is why it is safe to response-cache.
   */
  signupPolicies: Array<Policy>;
  /**
   * Recent messages in one channel, OLDEST FIRST.
   *
   * The bot must be a MEMBER of the channel — Slack refuses history for a
   * channel it was never invited to, however many scopes the token holds.
   */
  slackChannelHistory: Array<SlackMessage>;
  /** Channels the Slack bot can see, each with a copyable archive link. */
  slackChannels: Array<SlackChannel>;
  /** Whether a Slack bot token is configured (Tech portal). */
  slackConfigured: Scalars['Boolean']['output'];
  /** What the bot token is allowed to do, and where to change it. */
  slackPermissions: SlackPermissions;
  /** Every card, including the switched-off ones. Admin only. */
  somethingForYouItems: Array<SomethingForYouItem>;
  /**
   * Where a call should look for a path to the other browser.
   *
   * Served rather than baked into each console because a TURN relay comes with
   * a username and a secret, and seventeen builds carrying a copy of a secret is
   * seventeen places it can leak.
   */
  staffCallIceServers: Array<StaffIceServer>;
  /** Every call on this line, newest first. */
  staffCalls: Array<StaffCall>;
  /** Your own chat setup, with defaults when you have never changed it. */
  staffChatState: StaffChatState;
  /** Resolve a link for the card that renders it. */
  staffLinkPreview: StaffLinkPreview;
  /**
   * Every earlier wording of one message, oldest first. SUPER_ADMIN only: an
   * edit history is a record of somebody's second thoughts, and handing it to
   * both parties on every read is not the same as keeping it.
   */
  staffMessageEdits: Array<StaffMessageEdit>;
  /** One conversation, oldest message last. */
  staffMessages: Array<StaffMessage>;
  /** Everyone connected right now, for the first paint of the coworker list. */
  staffPresence: Array<StaffPresence>;
  /** The conversations you already have, most recent first. */
  staffThreads: Array<StaffThread>;
  /** Everything anyone has sent you and you have not opened. */
  staffUnreadCount: Scalars['Int']['output'];
  /** Tech portal only. Every report, through the shared table engine. */
  statusReportsTable: StatusReportTablePage;
  /** Active (non-expired) stories, newest first. Optionally scoped to one author. */
  stories: Array<Post>;
  /** Owner-only list of who viewed a story, newest first (Bug 4). */
  storyViewers: Array<StoryView>;
  /**
   * Suggested ₹x99 ticket prices for Create-a-Pod Step 4 — the same input
   * surface as potentialPodEarnings minus the ticket price. Walks 99, 199, 299…
   * and returns the first candidates whose projected host payout is strictly
   * positive: up to 5 rows, fewer near the ₹99,999 cap, empty when no candidate
   * earns the host anything. A ₹0-or-negative payout is never suggested.
   */
  suggestedTicketPrices: Array<SuggestedTicketPrice>;
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
  /** Recent logs for one container (demuxed) — polled by the restart log panel. */
  techContainerLogs: Scalars['String']['output'];
  /** Paged/searchable view over techDockerInfo.containers for the shared table engine. */
  techDockerContainersTable: TechDockerContainerTablePage;
  /** Docker daemon + container status (requires the docker socket mounted into the API container). */
  techDockerInfo: TechDockerInfo;
  /** Every package.json in the repo beside what npm publishes (SUPER_ADMIN / TECH_MANAGER). Cached; use techRefreshPackageUpdates to force a re-check. */
  techPackageUpdates: TechPackageUpdatesReport;
  /** Live host metrics for the Tech portal Server > Info page. Pass sslHost to include that domain's TLS certificate. */
  techServerInfo: TechServerInfo;
  telemetryDashboard: TelemetryDashboard;
  /**
   * One level's logs for the JSON export, newest first. Bounded (20k rows) —
   * a busy day of info is six figures of rows, and an export that tried to be
   * complete would time out instead of producing anything.
   */
  telemetryLogsExport: Array<TelemetryLog>;
  telemetryLogsTable: TelemetryLogTablePage;
  telemetrySettings: TelemetrySettings;
  ticket?: Maybe<Ticket>;
  /** Transcript of a ticket (.txt or .docx) — accessible to its owner or a support agent. */
  ticketTranscript: SupportChatTranscript;
  tickets: TicketPage;
  /**
   * Namespaces with their key counts and per-locale completeness — the first
   * level of the admin Translations view, which drills into translationsTable
   * filtered by the surface + page it hands back. Counted by a mongo
   * aggregation rather than in Node, because the catalogue only grows.
   */
  translationGroups: TranslationGroupTablePage;
  /** Admin table of translation keys, filterable surface-wise and page-wise. */
  translationsTable: TranslationTablePage;
  /** Upload rules for the calling client's surface (any signed-in user). */
  uploadSettings: UploadSetting;
  user?: Maybe<User>;
  /**  Admin-only: account health for any user.  */
  userAccountHealth: HealthScore;
  userActivityYear: UserActivityYear;
  userBadgeProgress: Array<BadgeProgress>;
  userBadges: Array<UserBadge>;
  /** Admin: the complete profile change history of one user, newest first. */
  userChangeLogsTable: UserChangeLogTablePage;
  userClickstream: Array<AppAnalyticsEvent>;
  userContactActions: Array<UserContactAction>;
  userContactActionsTable: UserContactActionTablePage;
  /** All survey responses for a user (admin). */
  userSurveyResponses: Array<UserSurveyResponse>;
  /** A user's verifications — admin review (user details). */
  userVerifications: Array<Verification>;
  /** Server-side table page over a user's verifications — admin review (user details). */
  userVerificationsTable: VerificationTablePage;
  /**
   * Is this @handle free for the signed-in account? Debounced from the
   * username field on Profile Settings; the save re-checks it anyway, because
   * two people can be typing the same handle at once.
   */
  usernameAvailability: UsernameAvailability;
  users: Array<User>;
  usersTable: UserTablePage;
  venue?: Maybe<Venue>;
  /**
   * Offers this venue owner may still accept, plus the ones they accepted.
   * location_id narrows to offers pinned to that city — offers nobody has
   * enrolled in yet have no city and are always included. venue_id narrows to
   * what ONE of the caller's venues could accept (its category and city).
   */
  venueAutoPods: Array<AutoPod>;
  venueAvailableSlots: Array<VenueSlot>;
  /**  Admin-only: health for a specific venue.  */
  venueHealth?: Maybe<HealthScore>;
  venueLead?: Maybe<VenueLead>;
  venueLeads: Array<VenueLead>;
  venueLeadsTable: VenueLeadTablePage;
  venueOwnerStats: VenueOwnerStats;
  /** Pods at the caller's venues, all states incl. cancelled. venue_id narrows to one owned venue. */
  venuePods: Array<VenuePod>;
  /**
   * Header figures for Venue Studio, over EVERY approved booking at the caller's
   * venues — the list is capped at 500 rows, these numbers are not.
   */
  venuePodsSummary: VenuePodSummary;
  venueRegistrationConfig: VenueRegistrationConfig;
  /** Owner: one request with its earnings, for the decision page linked from the request email. */
  venueSlotDecision: VenueSlotDecision;
  /** Owner: pending booking requests across their venues (or one venue). */
  venueSlotRequests: Array<VenueSlotRequest>;
  venueSlots: Array<VenueSlot>;
  venues: Array<Venue>;
  /** Admin/onboarding table page over all venues (shared table engine). */
  venuesTable: VenueTablePage;
  /** Poll a running FFmpeg compression job for its real progress percentage. */
  videoCompressionJob: VideoCompressionJob;
  /** One campaign in full — the detail view behind a table row. */
  waCampaign: WaCampaign;
  /** Whether the Tech portal's AiSensy API key is configured. */
  waCampaignConfigured: Scalars['Boolean']['output'];
  /** What WhatsApp cost and reached over a window (ISO dates; absent means all time). */
  waCampaignDashboard: WaDashboard;
  /** The AiSensy campaign names marketing may send. */
  waCampaignNames: Array<WaCampaignNameOption>;
  /** How many messages this recipient list would actually produce right now. */
  waCampaignReach: Scalars['Int']['output'];
  /** Everyone that campaign walked over, with what happened to each. */
  waCampaignRecipients: WaCampaignRecipientPage;
  /** The whole recipient list as CSV — every row, not one page. */
  waCampaignRecipientsCsv: Scalars['String']['output'];
  /** Accounts the 'send to these people' picker offers, matched on name, email or number. */
  waCampaignUserSearch: Array<WaUserOption>;
  /** Variables a template parameter may use. */
  waCampaignVariables: Array<WaCampaignVariable>;
  waCampaignsTable: WaCampaignTablePage;
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
  /** Every WhatsApp send in one feed: campaign sends and the messages the platform sent on its own. */
  waLogs: WaLogPage;
  /** What a WhatsApp message costs, by category. */
  waPricing: WaPricing;
  /** Current QR data URL to scan + session status. */
  waQr: WaQr;
  /** Refreshes the session status from the gateway, then returns it. */
  waStatus: WaConnection;
  waUserLead?: Maybe<WaUserLead>;
  /** Generated user leads (paginated, searchable, sortable). */
  waUserLeads: WaUserLeadPage;
  /** Products portal: partner warehouse-approval requests (optionally by status). */
  warehouseApprovalRequests: Array<ApprovalRequest>;
  websiteContent: Array<WebsiteContentItem>;
  websiteContentTable: WebsiteContentItemTablePage;
  websiteNav: Array<WebsiteNavItem>;
  websiteNavTable: WebsiteNavItemTablePage;
  /** The default header assets every media-header scenario falls back to. Cheap: no AiSensy read. */
  whatsappDefaultMedia: WaDefaultMedia;
  /** One send attempt in full — the detail behind a row of the merged WhatsApp log. */
  whatsappMessageLog?: Maybe<WaMessageLogRow>;
  /** Every automatic message, its switch, and what AiSensy holds for it. */
  whatsappScenarios: WaScenarioBoard;
  withdrawalMinimums: WithdrawalMinimums;
  withdrawalRequests: Array<WalletWithdrawal>;
  withdrawalRequestsTable: WalletWithdrawalTablePage;
};


export type QueryAccountDeletionRequestArgs = {
  request_doc_id: Scalars['ID']['input'];
};


export type QueryAccountDeletionRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAccountDeletionRunsArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryActiveAdsArgs = {
  position: AdPosition;
};


export type QueryActiveAppPopupArgs = {
  platform: AppPopupClientPlatform;
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


export type QueryAdminAutoPodsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAdminPodAttendeesArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryAdminPotentialPodEarningsArgs = {
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  no_of_spots: Scalars['Int']['input'];
  pod_amount: Scalars['Float']['input'];
  venue_id?: InputMaybe<Scalars['ID']['input']>;
  venue_slot_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAdminVenueSlotsArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  venue_id: Scalars['ID']['input'];
};


export type QueryAiMonitoringLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAiPromptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAiPromptsArgs = {
  filter?: InputMaybe<AiPromptFilter>;
};


export type QueryAppBuildsTableArgs = {
  platform: AppBuildPlatform;
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAppPopupsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryApprovalRequestsArgs = {
  status?: InputMaybe<ApprovalStatus>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryApprovalRequestsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAudienceListArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAudienceListCandidatesTableArgs = {
  list_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAudienceListMembersTableArgs = {
  list_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAudienceListsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAudienceTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryAutoPodArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
};


export type QueryAutoPodAudienceArgs = {
  sub_category_id: Scalars['ID']['input'];
};


export type QueryAutoPodHostProjectionArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  no_of_spots: Scalars['Int']['input'];
  pod_amount: Scalars['Float']['input'];
};


export type QueryAutoPodVenueSlotsArgs = {
  auto_pod_doc_id: Scalars['ID']['input'];
  venue_id: Scalars['ID']['input'];
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


export type QueryBookingDetailArgs = {
  booking_id: Scalars['ID']['input'];
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


export type QueryBugArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBugOccurrencesArgs = {
  bug_id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryBugsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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


export type QueryChatParticipantsArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryCheckoutQuoteArgs = {
  input: CheckoutQuoteInput;
};


export type QueryClubArgs = {
  club_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminAutoPodsArgs = {
  location_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClubAdminCandidatesArgs = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  super_category_id?: InputMaybe<Scalars['ID']['input']>;
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


export type QueryClubAdminMatchingClubsArgs = {
  id: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryClubAdminPodAttendeesArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminPodAuditLogsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminPodAuditLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryClubAdminPodFeedbackArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminPodForEditArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryClubAdminPodHostArgs = {
  pod_doc_id: Scalars['ID']['input'];
  user_id: Scalars['ID']['input'];
};


export type QueryClubAdminPodPaymentsArgs = {
  pod_doc_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryClubAdminPodsTableArgs = {
  club_id?: InputMaybe<Scalars['ID']['input']>;
  query?: InputMaybe<TableQueryInput>;
  status?: InputMaybe<PodRowStatus>;
};


export type QueryClubAdminProfileArgs = {
  id: Scalars['ID']['input'];
};


export type QueryClubAdminProfilesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryClubBySlugArgs = {
  club_slug: Scalars['String']['input'];
};


export type QueryClubFollowersArgs = {
  club_doc_id: Scalars['ID']['input'];
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


export type QueryCoinAdminStatsArgs = {
  months?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCoinTransactionsTableArgs = {
  pod_doc_id?: InputMaybe<Scalars['ID']['input']>;
  query?: InputMaybe<TableQueryInput>;
};


export type QueryCoinUserSearchArgs = {
  term: Scalars['String']['input'];
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


export type QueryContentReportArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContentReportsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryContractArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContractPdfBase64Args = {
  id: Scalars['ID']['input'];
};


export type QueryContractsTableArgs = {
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


export type QueryCoworkersArgs = {
  role?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
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


export type QueryDataCloneJobArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryDbBackupsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryDbRestoreJobArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
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


export type QueryEmailFragmentArgs = {
  key: Scalars['String']['input'];
};


export type QueryEmailLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEmailLogDashboardArgs = {
  range_days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmailLogStatsArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmailLogsTableArgs = {
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


export type QueryGiftCardAdminStatsArgs = {
  months?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGiftCardByCodeArgs = {
  code: Scalars['String']['input'];
};


export type QueryGiftCardTransactionsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryGiftCardsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryGrievanceTicketArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGrievanceTicketsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryHostArgs = {
  host_doc_id: Scalars['ID']['input'];
};


export type QueryHostAutoPodsArgs = {
  location_id?: InputMaybe<Scalars['ID']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryHostByUserArgs = {
  user_id: Scalars['ID']['input'];
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


export type QueryHostPodPendingViewArgs = {
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


export type QueryLeaderboardArgs = {
  category: LeaderboardCategory;
  period?: InputMaybe<LeaderboardPeriod>;
};


export type QueryLeaderboardPointsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryLegalDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLegalDocumentPdfBase64Args = {
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


export type QueryLinkPreviewArgs = {
  id: Scalars['String']['input'];
  kind: LinkPreviewKind;
  secondary_id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLiveAdsTableArgs = {
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


export type QueryMailAutomationPreviewArgs = {
  input: MailAutomationRuleInput;
};


export type QueryMailAutomationThreadsArgs = {
  account_id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMailPreferenceAnalyticsArgs = {
  range_days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMailPreferenceLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMailPreferencesByTokenArgs = {
  e: Scalars['String']['input'];
  t: Scalars['String']['input'];
};


export type QueryMarketingCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type QueryMarketingCampaignPreviewCardsArgs = {
  type: MarketingCampaignCardType;
};


export type QueryMarketingCampaignsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMarketingDashboardArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryMediaFileArgs = {
  fileId: Scalars['ID']['input'];
};


export type QueryMediaFilesArgs = {
  fileType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMeetingSlotsArgs = {
  exclude_meeting_id?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<SurveyKind>;
};


export type QueryMembershipBenefitsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMembershipNewsSubscribersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryMembershipPlansTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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


export type QueryMyBrandPickupLocationsArgs = {
  brand_doc_id: Scalars['ID']['input'];
};


export type QueryMyCallbackRequestsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyClubPodsArgs = {
  club_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyClubPodsSummaryArgs = {
  club_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyCoHostedPodsArgs = {
  status?: InputMaybe<CoHostStatus>;
};


export type QueryMyDashboardLayoutArgs = {
  dashboard_id: Scalars['ID']['input'];
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


export type QueryMyPaymentArgs = {
  payment_doc_id: Scalars['ID']['input'];
};


export type QueryMyPodDraftArgs = {
  draft_id: Scalars['ID']['input'];
};


export type QueryMyPodMembershipsArgs = {
  status?: InputMaybe<MembershipStatus>;
};


export type QueryMyProductAnalyticsArgs = {
  product_doc_id: Scalars['ID']['input'];
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


export type QueryOpenAiUsageDashboardArgs = {
  range_days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOpenAiUsageLogArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOpenAiUsageLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPartnerDashboardArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryPartnerEcommStatsArgs = {
  brand_doc_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPartnersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPaymentArgs = {
  payment_doc_id: Scalars['ID']['input'];
};


export type QueryPaymentDetailArgs = {
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


export type QueryPaymentTotalsArgs = {
  filter?: InputMaybe<PaymentFilterInput>;
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


export type QueryPinnedStaffMessagesArgs = {
  peer_id: Scalars['ID']['input'];
};


export type QueryPodArgs = {
  include_deleted?: InputMaybe<Scalars['Boolean']['input']>;
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodAttendanceBoardArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodAttendeeSeatsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodAuditLogsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodAuditLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodBySlugsArgs = {
  club_slug: Scalars['String']['input'];
  pod_slug: Scalars['String']['input'];
};


export type QueryPodCancellationsArgs = {
  kind?: InputMaybe<PodCancelKind>;
};


export type QueryPodCommentsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodDashboardArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPodExpensePodSummaryArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodExpensePodsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodExpensesTableArgs = {
  pod_doc_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodFeedbackFormArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryPodFeedbackSummaryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  pod_id: Scalars['ID']['input'];
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


export type QueryPodMediaBoardArgs = {
  pod_doc_id: Scalars['ID']['input'];
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
  host_user_id?: InputMaybe<Scalars['ID']['input']>;
  pod_id: Scalars['ID']['input'];
  venue_bill_amount: Scalars['Float']['input'];
};


export type QueryPodSpotFillsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodSpotLimitsArgs = {
  pod_doc_id: Scalars['ID']['input'];
};


export type QueryPodWithdrawalGroupsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodWithdrawalSummaryArgs = {
  pod_id: Scalars['ID']['input'];
};


export type QueryPodWithdrawalsTableArgs = {
  pod_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPodsArgs = {
  filter?: InputMaybe<PodFilterInput>;
};


export type QueryPodsForProductArgs = {
  product_doc_id: Scalars['ID']['input'];
};


export type QueryPodsTableArgs = {
  include_deleted?: InputMaybe<Scalars['Boolean']['input']>;
  lifecycle?: InputMaybe<PodLifecycle>;
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


export type QueryPolicyAcceptanceDetailArgs = {
  acceptance_id: Scalars['ID']['input'];
};


export type QueryPolicyAcceptancesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPolicyBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryPolicyNotifyRecipientCountArgs = {
  policy_doc_id: Scalars['ID']['input'];
};


export type QueryPolicyPdfBase64Args = {
  slug: Scalars['String']['input'];
};


export type QueryPolicyStatsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryPolicyVersionsArgs = {
  policy_doc_id: Scalars['ID']['input'];
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
  no_of_spots: Scalars['Int']['input'];
  pod_amount: Scalars['Float']['input'];
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


export type QueryProductShippingQuoteArgs = {
  input: ProductShippingQuoteInput;
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


export type QueryPublicPodEarningsEstimateArgs = {
  no_of_spots: Scalars['Int']['input'];
  pod_amount: Scalars['Float']['input'];
  venue_amount?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryPublicTranslationsArgs = {
  locale: Scalars['String']['input'];
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


export type QueryRateLimitEventsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryRateLimitRuleArgs = {
  rule_id: Scalars['ID']['input'];
};


export type QueryRateLimitRulesTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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
  footer_note?: InputMaybe<Scalars['String']['input']>;
  fragment_key?: InputMaybe<Scalars['String']['input']>;
  mjml: Scalars['String']['input'];
  vars?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRenderMarketingCampaignArgs = {
  input: MarketingCampaignPreviewInput;
};


export type QueryReportedProblemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReportedProblemsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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


export type QuerySearchStaffMessagesArgs = {
  filter?: InputMaybe<StaffSearchInput>;
  peer_id: Scalars['ID']['input'];
};


export type QuerySearchSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryShortLinkArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortLinkClicksArgs = {
  id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryShortLinkFunnelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortLinkJourneysArgs = {
  id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryShortLinkQrArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortLinkStatsArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortLinksTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QuerySlackChannelHistoryArgs = {
  channel: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStaffCallsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  peer_id: Scalars['ID']['input'];
};


export type QueryStaffLinkPreviewArgs = {
  url: Scalars['String']['input'];
};


export type QueryStaffMessageEditsArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStaffMessagesArgs = {
  before?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  peer_id: Scalars['ID']['input'];
};


export type QueryStatusReportsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryStoriesArgs = {
  author_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryStoryViewersArgs = {
  post_doc_id: Scalars['ID']['input'];
};


export type QuerySuggestedTicketPricesArgs = {
  no_of_spots: Scalars['Int']['input'];
  venue_amount?: InputMaybe<Scalars['Float']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
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


export type QueryTechContainerLogsArgs = {
  name: Scalars['String']['input'];
  tail?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTechDockerContainersTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryTechServerInfoArgs = {
  sslHost?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTelemetryDashboardArgs = {
  range_days?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTelemetryLogsExportArgs = {
  level?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTelemetryLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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
  priority_first?: InputMaybe<TicketPriority>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort_by?: InputMaybe<Scalars['String']['input']>;
  sort_dir?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<TicketStatus>;
};


export type QueryTranslationGroupsArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryTranslationsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryUploadSettingsArgs = {
  surface: UploadSurface;
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


export type QueryUserBadgeProgressArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserBadgesArgs = {
  user_id: Scalars['ID']['input'];
};


export type QueryUserChangeLogsTableArgs = {
  query?: InputMaybe<TableQueryInput>;
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


export type QueryUsernameAvailabilityArgs = {
  username: Scalars['String']['input'];
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


export type QueryVenueAutoPodsArgs = {
  location_id?: InputMaybe<Scalars['ID']['input']>;
  venue_id?: InputMaybe<Scalars['ID']['input']>;
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


export type QueryVenuePodsArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryVenuePodsSummaryArgs = {
  venue_id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryVenueSlotDecisionArgs = {
  slot_id: Scalars['ID']['input'];
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


export type QueryVideoCompressionJobArgs = {
  job_id: Scalars['String']['input'];
};


export type QueryWaCampaignArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type QueryWaCampaignDashboardArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWaCampaignReachArgs = {
  audience: WaCampaignAudience;
  audience_list_id?: InputMaybe<Scalars['ID']['input']>;
  contacts?: InputMaybe<Array<WaManualContactInput>>;
  user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryWaCampaignRecipientsArgs = {
  campaign_id: Scalars['ID']['input'];
  query?: InputMaybe<TableQueryInput>;
};


export type QueryWaCampaignRecipientsCsvArgs = {
  campaign_id: Scalars['ID']['input'];
};


export type QueryWaCampaignUserSearchArgs = {
  search: Scalars['String']['input'];
};


export type QueryWaCampaignsTableArgs = {
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


export type QueryWaLogsArgs = {
  query?: InputMaybe<TableQueryInput>;
};


export type QueryWaUserLeadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWaUserLeadsArgs = {
  input?: InputMaybe<WaPageInput>;
};


export type QueryWarehouseApprovalRequestsArgs = {
  status?: InputMaybe<ApprovalStatus>;
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


export type QueryWhatsappMessageLogArgs = {
  id: Scalars['ID']['input'];
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

/** One selectable app, as the systems collection knows it. */
export type RateLimitAppOption = {
  __typename?: 'RateLimitAppOption';
  app: Scalars['String']['output'];
  label: Scalars['String']['output'];
  surface: Scalars['String']['output'];
};

/** One breach: a request refused, or one a MONITOR rule recorded and let through. */
export type RateLimitEvent = {
  __typename?: 'RateLimitEvent';
  app: Scalars['String']['output'];
  channel: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  device_id?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ip?: Maybe<Scalars['String']['output']>;
  key_by: Scalars['String']['output'];
  limit: Scalars['Int']['output'];
  /** The identity the allowance was counted per, e.g. ip:203.0.113.4 */
  limit_key: Scalars['String']['output'];
  method?: Maybe<Scalars['String']['output']>;
  mode: Scalars['String']['output'];
  operation?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  retry_after: Scalars['Int']['output'];
  rule_id: Scalars['ID']['output'];
  rule_name: Scalars['String']['output'];
  surface: Scalars['String']['output'];
  user_agent?: Maybe<Scalars['String']['output']>;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['ID']['output']>;
};

export type RateLimitEventPage = {
  __typename?: 'RateLimitEventPage';
  rows: Array<RateLimitEvent>;
  total: Scalars['Int']['output'];
};

/**
 * The vocabulary the rule editor renders.
 *
 * Served rather than hardcoded in the portal, so a value added on the server
 * becomes an option in the editor without a portal release.
 */
export type RateLimitOptions = {
  __typename?: 'RateLimitOptions';
  algorithms: Array<Scalars['String']['output']>;
  apps: Array<RateLimitAppOption>;
  audiences: Array<Scalars['String']['output']>;
  channels: Array<Scalars['String']['output']>;
  key_by: Array<Scalars['String']['output']>;
  modes: Array<Scalars['String']['output']>;
  operation_types: Array<Scalars['String']['output']>;
  roles: Array<RateLimitRoleOption>;
  surfaces: Array<Scalars['String']['output']>;
};

export type RateLimitRoleOption = {
  __typename?: 'RateLimitRoleOption';
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/**
 * One rate limiting rule.
 *
 * A rule answers four questions: which traffic it governs (surface / app /
 * channel / operation), what the allowance is (limit per window, by algorithm),
 * who the allowance is counted per (key_by), and what happens on a breach
 * (mode, block_seconds, message).
 */
export type RateLimitRule = {
  __typename?: 'RateLimitRule';
  /** FIXED_WINDOW | SLIDING_WINDOW | TOKEN_BUCKET. */
  algorithm: Scalars['String']['output'];
  /** The app key within that surface (tech, finance, mweb, native), or * for all. */
  app: Scalars['String']['output'];
  /** ALL | ANONYMOUS | AUTHENTICATED. */
  audience: Scalars['String']['output'];
  /** Cool-off after a breach, in seconds. 0 means the window alone is the penalty. */
  block_seconds: Scalars['Int']['output'];
  blocked_count: Scalars['Int']['output'];
  /** TOKEN_BUCKET only: how far above the limit one burst may go. */
  burst: Scalars['Int']['output'];
  /** GRAPHQL | REST | SOCKET | ALL. */
  channel: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  /** Addresses this rule never applies to. Globs allowed, so a /24 is 10.1.2.* */
  exempt_ips: Array<Scalars['String']['output']>;
  exempt_roles: Array<Scalars['String']['output']>;
  hit_count: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** IP | USER | DEVICE | IP_USER | API_KEY | SYSTEM | GLOBAL. */
  key_by: Scalars['String']['output'];
  last_blocked_at?: Maybe<Scalars['String']['output']>;
  last_hit_at?: Maybe<Scalars['String']['output']>;
  limit: Scalars['Int']['output'];
  /** What a refused caller is told. Falls back to the platform default. */
  message?: Maybe<Scalars['String']['output']>;
  /** HTTP methods. Empty means every method. */
  methods: Array<Scalars['String']['output']>;
  /** ENFORCE refuses the request. MONITOR records the breach and lets it through. */
  mode: Scalars['String']['output'];
  name: Scalars['String']['output'];
  notify_slack: Scalars['Boolean']['output'];
  /** ALL | QUERY | MUTATION | SUBSCRIPTION. */
  operation_type: Scalars['String']['output'];
  /** GraphQL field names; * wildcards allowed. Empty means every field. */
  operations: Array<Scalars['String']['output']>;
  /** REST path globs such as /upload*. Empty means every path. */
  paths: Array<Scalars['String']['output']>;
  /** Lower runs first. Every matching rule is still evaluated, so ceilings stack. */
  priority: Scalars['Int']['output'];
  /** NATIVE | MWEB | PORTAL | ADMIN_PORTAL | WEBSITE | API | SERVER | UNKNOWN | ALL. */
  surface: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  window_seconds: Scalars['Int']['output'];
};

export type RateLimitRuleInput = {
  algorithm?: InputMaybe<Scalars['String']['input']>;
  app?: InputMaybe<Scalars['String']['input']>;
  audience?: InputMaybe<Scalars['String']['input']>;
  block_seconds?: InputMaybe<Scalars['Int']['input']>;
  burst?: InputMaybe<Scalars['Int']['input']>;
  channel?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  exempt_ips?: InputMaybe<Array<Scalars['String']['input']>>;
  exempt_roles?: InputMaybe<Array<Scalars['String']['input']>>;
  key_by?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  methods?: InputMaybe<Array<Scalars['String']['input']>>;
  mode?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notify_slack?: InputMaybe<Scalars['Boolean']['input']>;
  operation_type?: InputMaybe<Scalars['String']['input']>;
  operations?: InputMaybe<Array<Scalars['String']['input']>>;
  paths?: InputMaybe<Array<Scalars['String']['input']>>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  surface?: InputMaybe<Scalars['String']['input']>;
  window_seconds?: InputMaybe<Scalars['Int']['input']>;
};

export type RateLimitRulePage = {
  __typename?: 'RateLimitRulePage';
  rows: Array<RateLimitRule>;
  total: Scalars['Int']['output'];
};

export type RateLimitSettings = {
  __typename?: 'RateLimitSettings';
  active_rule_count: Scalars['Int']['output'];
  allow_ips: Array<Scalars['String']['output']>;
  block_ips: Array<Scalars['String']['output']>;
  default_message: Scalars['String']['output'];
  /** Master switch. Off means every request passes, whatever the rules say. */
  enabled: Scalars['Boolean']['output'];
  event_count: Scalars['Int']['output'];
  event_retention_days: Scalars['Int']['output'];
  exempt_roles: Array<Scalars['String']['output']>;
  log_blocks: Scalars['Boolean']['output'];
  /** Forces every rule to MONITOR without editing any of them. */
  monitor_only: Scalars['Boolean']['output'];
  notify_slack: Scalars['Boolean']['output'];
  rule_count: Scalars['Int']['output'];
  /** Send X-RateLimit-Limit / -Remaining / -Reset and Retry-After. */
  send_headers: Scalars['Boolean']['output'];
  /**
   * REDIS or MEMORY — where the counters actually live right now.
   *
   * Not a setting: it is read from the live connection. MEMORY means the count
   * is per server process, which is the right answer for one container and the
   * wrong one the moment there are two.
   */
  store: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type RateLimitSettingsInput = {
  allow_ips?: InputMaybe<Array<Scalars['String']['input']>>;
  block_ips?: InputMaybe<Array<Scalars['String']['input']>>;
  default_message?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  event_retention_days?: InputMaybe<Scalars['Int']['input']>;
  exempt_roles?: InputMaybe<Array<Scalars['String']['input']>>;
  log_blocks?: InputMaybe<Scalars['Boolean']['input']>;
  monitor_only?: InputMaybe<Scalars['Boolean']['input']>;
  notify_slack?: InputMaybe<Scalars['Boolean']['input']>;
  send_headers?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RateLimitStats = {
  __typename?: 'RateLimitStats';
  blocked_24h: Scalars['Int']['output'];
  monitored_24h: Scalars['Int']['output'];
  store: Scalars['String']['output'];
  top_rules: Array<RateLimitTally>;
  top_systems: Array<RateLimitTally>;
};

/**
 * One system the server has been called by: a portal, mWeb, the app, a website,
 * an API-key integration. Written by the traffic itself, so a surface added
 * later appears here the first time it calls.
 */
export type RateLimitSystem = {
  __typename?: 'RateLimitSystem';
  app: Scalars['String']['output'];
  blocked: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  last_seen_at?: Maybe<Scalars['String']['output']>;
  requests: Scalars['Int']['output'];
  /** How many enabled rules could govern this system today. */
  rule_count: Scalars['Int']['output'];
  surface: Scalars['String']['output'];
};

export type RateLimitTally = {
  __typename?: 'RateLimitTally';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
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
  /** Duncit Coins to spend (1 coin = 1 rupee off). Clamped server-side to the live balance and to the bill. */
  redeem_coins?: InputMaybe<Scalars['Int']['input']>;
  /** Seats being booked (default 1). The ticket price is charged per seat; add-on products are charged once. */
  seats?: InputMaybe<Scalars['Int']['input']>;
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
  /**
   * Coins EACH side of a referral earns — the referrer and the new member.
   * Read-only here: it is a coin payout rule, set in Finance > Duncit Coin >
   * Settings alongside the earn rates, and reported here so the copy that quotes
   * it can never drift from what is actually paid.
   */
  coins_per_referral: Scalars['Int']['output'];
  gift_description: Scalars['String']['output'];
  /** Share message template, with its {code}, {link} and {coins} placeholders. */
  share_message: Scalars['String']['output'];
};

/** Finance > Referrals. Every field is optional; an omitted one is left alone. */
export type ReferralSettingsInput = {
  gift_description?: InputMaybe<Scalars['String']['input']>;
  share_message?: InputMaybe<Scalars['String']['input']>;
};

export type RefundStatus =
  | 'NONE'
  | 'NOT_ELIGIBLE'
  | 'PENDING'
  | 'PROCESSED';

export type RegisterInput = {
  /**
   * Every policy the person ticked in the acceptance dialog.
   *
   * Re-verified server-side against `signupPolicies` before the account is
   * created — the tick boxes shape the form, they cannot stop a hand-rolled
   * mutation. A list that does not cover the required set fails the signup.
   */
  accepted_policy_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Which app they accepted in. Recorded on every acceptance row. */
  accepted_policy_surface?: InputMaybe<PolicyAcceptanceSurface>;
  city?: InputMaybe<Scalars['String']['input']>;
  dob: Scalars['String']['input'];
  email: Scalars['String']['input'];
  first_name: Scalars['String']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  /** The dial code the number belongs to, such as +91. Chosen from a list. */
  phone_extension: Scalars['String']['input'];
  /**
   * The account's phone number — digits only, without the dial code.
   *
   * Required and unique: it is the second way an account is identified, so a
   * number already registered fails the signup instead of creating a second
   * person behind the same phone. Google signup collects it later; this door
   * asks for it up front.
   */
  phone_number: Scalars['String']['input'];
  /**
   * A friend's referral code. Optional, and checked before the account is
   * created: a code that does not exist fails the signup rather than quietly
   * costing both sides their coins.
   */
  referral_code?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type ReportAppBuildInput = {
  /**
   * Why the artifact is missing on an otherwise successful build. Send this
   * instead of failing the report: a build that compiled still deserves its row
   * and its Slack post, and this is the line that explains the absent download.
   */
  artifact_error?: InputMaybe<Scalars['String']['input']>;
  artifact_file_id?: InputMaybe<Scalars['String']['input']>;
  artifact_url?: InputMaybe<Scalars['String']['input']>;
  /**
   * Everything the build produced. When present this is the whole truth and the
   * singular artifact_* fields below are ignored; those remain only so a reporter
   * talking to a server that predates this list still lands its primary artifact.
   */
  artifacts?: InputMaybe<Array<AppBuildArtifactInput>>;
  branch?: InputMaybe<Scalars['String']['input']>;
  build_name?: InputMaybe<Scalars['String']['input']>;
  commit_sha?: InputMaybe<Scalars['String']['input']>;
  commits?: InputMaybe<Array<AppBuildCommitInput>>;
  deletions?: InputMaybe<Scalars['Int']['input']>;
  /**
   * The dispatch this run is fulfilling, when the portal started it. Claims the
   * QUEUED row the portal already wrote instead of creating a second one, and
   * carries the operator's env and artifact choices onto the reports.
   */
  dispatch_id?: InputMaybe<Scalars['String']['input']>;
  duration_seconds?: InputMaybe<Scalars['Int']['input']>;
  /** Why the build failed. Ignored unless status is FAILED. */
  error_message?: InputMaybe<Scalars['String']['input']>;
  files_changed?: InputMaybe<Scalars['Int']['input']>;
  insertions?: InputMaybe<Scalars['Int']['input']>;
  platform: AppBuildPlatform;
  size_mb?: InputMaybe<Scalars['Float']['input']>;
  /**
   * What the runner is doing right now, e.g. "Compiling with Gradle". Sent with
   * a RUNNING report as the build moves through its stages; each distinct value
   * is appended to the build's stage list.
   */
  stage?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to SUCCESS. FAILED rows carry no artifact. */
  status?: InputMaybe<AppBuildStatus>;
  /** The GitHub actor whose merge triggered a push build. */
  triggered_by?: InputMaybe<Scalars['String']['input']>;
  version: Scalars['String']['input'];
  workflow_run_id?: InputMaybe<Scalars['String']['input']>;
  workflow_run_url?: InputMaybe<Scalars['String']['input']>;
};

/** One selectable chip on the app's Report a Problem form. */
export type ReportProblemCategory = {
  __typename?: 'ReportProblemCategory';
  is_active: Scalars['Boolean']['output'];
  /** Stable key stored on the report, so renaming a label never orphans rows. */
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
};

export type ReportProblemCategoryInput = {
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * What the app renders on Report a Problem.
 *
 * The chips and the prompt used to be hardcoded in the app, so adding a category
 * meant a release. Support edits them here instead.
 */
export type ReportProblemConfig = {
  __typename?: 'ReportProblemConfig';
  allow_media: Scalars['Boolean']['output'];
  categories: Array<ReportProblemCategory>;
  max_media: Scalars['Int']['output'];
  message_hint: Scalars['String']['output'];
  message_label: Scalars['String']['output'];
  message_min_length: Scalars['Int']['output'];
};

/**
 * Where a reported problem is announced on Slack.
 *
 * Deliberately NOT part of ReportProblemConfig: that one is readable by every
 * signed-in user because the app renders its form from it, and the workspace's
 * channel list is not theirs to see.
 */
export type ReportProblemSlackSettings = {
  __typename?: 'ReportProblemSlackSettings';
  /** Channel the announcement is posted to. Empty falls back to the Tech portal's feedback / default channel. */
  channel_id: Scalars['String']['output'];
  /**
   * The channel's name as it read when it was picked — display only, so this
   * page can still name a channel the bot has since lost sight of.
   */
  channel_name: Scalars['String']['output'];
  /** Channels the bot can see, to pick from. Empty when Slack is unconfigured or unreachable. */
  channels: Array<SlackChannel>;
  /** Whether a new report is announced on Slack at all. Off still files the report. */
  enabled: Scalars['Boolean']['output'];
  /** Why the channel list could not be read, when it could not. Empty otherwise. */
  error: Scalars['String']['output'];
  /** False when no Slack bot token is configured — nothing can be announced then. */
  slack_configured: Scalars['Boolean']['output'];
};

/** Why the reporter says it should not be there. */
export type ReportReason =
  | 'HARASSMENT'
  | 'HATE'
  | 'MISINFORMATION'
  | 'NUDITY'
  | 'OTHER'
  | 'SCAM'
  | 'SPAM'
  | 'VIOLENCE';

/** Where the Legal team has taken it. */
export type ReportStatus =
  | 'ACTIONED'
  | 'DISMISSED'
  | 'IN_REVIEW'
  | 'RECEIVED';

export type ReportStatusCount = {
  __typename?: 'ReportStatusCount';
  count: Scalars['Int']['output'];
  status: ReportStatus;
};

/**
 * What was reported.
 *
 * A story is the only surface that raises one today; the type exists so the
 * next surface files into the same record and the same Legal queue rather than
 * growing a second reports table.
 */
export type ReportTargetType =
  | 'CLUB'
  | 'POD'
  | 'POST'
  | 'PRODUCT'
  | 'PROFILE'
  | 'STORY';

export type RequestCallbackInput = {
  pod_id?: InputMaybe<Scalars['ID']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Continue with OTP — signing in with a one-time code instead of a password.
 *
 * Its own input rather than PasswordResetLookupInput, so a client document
 * reads as the door it opens; the fields and the channels are the same ones.
 */
export type RequestLoginOtpInput = {
  channel: PasswordResetChannel;
  /** EMAIL only. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** PHONE only — the dial code, e.g. +91. */
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  /** PHONE only — digits, without the dial code. */
  phone_number?: InputMaybe<Scalars['String']['input']>;
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

export type SaveGrievanceOfficerInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
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

/**
 * Who the host just scanned in. Everything the attendee has on file that helps a
 * host recognise and reach them at the door — blank strings where they have not
 * filled a field, so the client renders only what exists.
 */
export type ScannedAttendee = {
  __typename?: 'ScannedAttendee';
  /** Single-line postal address, already joined server-side. */
  address: Scalars['String']['output'];
  bio: Scalars['String']['output'];
  city: Scalars['String']['output'];
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  /** When they joined this pod (ISO), from their membership. */
  joined_at?: Maybe<Scalars['String']['output']>;
  phone: Scalars['String']['output'];
  /** App path to their public profile (/u/<id>), so each surface builds its own link. */
  profile_path: Scalars['String']['output'];
  profile_photo: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
  whatsapp: Scalars['String']['output'];
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

/** One WhatsApp template campaign message. Every template parameter must be filled. */
export type SendAisensyCampaignInput = {
  /** Values for CTA buttons whose link carries a {{n}}. */
  buttons?: InputMaybe<Array<AisensyButtonInput>>;
  /** API campaign name exactly as it appears in AiSensy — falls back to the configured default. */
  campaign_name?: InputMaybe<Scalars['String']['input']>;
  /** Country code + number, digits only (e.g. 919582998897). */
  destination: Scalars['String']['input'];
  /** The header asset — required by every template whose header is IMAGE, VIDEO or FILE. */
  media?: InputMaybe<AisensyMediaInput>;
  /** Ordered template variables ({{1}}, {{2}}, …). */
  template_params: Array<Scalars['String']['input']>;
  /** Name AiSensy records for the contact. */
  user_name: Scalars['String']['input'];
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

/** Post a message — supports the full Slack message surface. Provide at least one of text/blocks/attachments. */
export type SendSlackMessageInput = {
  /** JSON array of legacy attachments (stringified). */
  attachments_json?: InputMaybe<Scalars['String']['input']>;
  /** JSON array of Block Kit blocks (stringified). */
  blocks_json?: InputMaybe<Scalars['String']['input']>;
  /** Channel ID (e.g. C0123ABCD) — defaults to the configured default channel. */
  channel?: InputMaybe<Scalars['String']['input']>;
  icon_emoji?: InputMaybe<Scalars['String']['input']>;
  link_names?: InputMaybe<Scalars['Boolean']['input']>;
  mrkdwn?: InputMaybe<Scalars['Boolean']['input']>;
  reply_broadcast?: InputMaybe<Scalars['Boolean']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  /** Reply in a thread (the parent message's ts). */
  thread_ts?: InputMaybe<Scalars['String']['input']>;
  unfurl_links?: InputMaybe<Scalars['Boolean']['input']>;
  unfurl_media?: InputMaybe<Scalars['Boolean']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type SendWaCampaignInput = {
  audience: WaCampaignAudience;
  /** AUDIENCE_LIST audience only — the saved Target Audience list. */
  audience_list_id?: InputMaybe<Scalars['ID']['input']>;
  /** Values for the template's CTA buttons whose link carries a {{n}}. */
  buttons?: InputMaybe<Array<AisensyButtonInput>>;
  /** MANUAL_NUMBERS audience only — the numbers to send to. */
  contacts?: InputMaybe<Array<WaManualContactInput>>;
  /**
   * The header asset every message in this send carries. Left out, the one
   * attached to the campaign in the AiSensy console is used; a template that
   * needs one and has neither is refused before a single message is spent.
   */
  media?: InputMaybe<AisensyMediaInput>;
  /** Internal name for this send. */
  name: Scalars['String']['input'];
  /** ISO time to send at. Absent, or already past, sends immediately. */
  scheduled_at?: InputMaybe<Scalars['String']['input']>;
  /** Ordered template variables — literal text, or {{first_name}} style tokens. */
  template_params: Array<Scalars['String']['input']>;
  /** SPECIFIC_USERS audience only — the accounts to send to. */
  user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Must be one of the saved WhatsApp campaign names. */
  wa_campaign_name: Scalars['String']['input'];
};

/** One test message to one number — the check before pointing a template at an audience. */
export type SendWaTestInput = {
  /** Values for the template's CTA buttons whose link carries a {{n}}. */
  buttons?: InputMaybe<Array<AisensyButtonInput>>;
  /** Country code + number, digits only (e.g. 919582998897). */
  destination: Scalars['String']['input'];
  /**
   * The header asset. Left out, the one attached to the campaign in the AiSensy
   * console is used; a template that needs one and has neither is refused here
   * rather than at AiSensy.
   */
  media?: InputMaybe<AisensyMediaInput>;
  template_params: Array<Scalars['String']['input']>;
  user_name: Scalars['String']['input'];
  wa_campaign_name: Scalars['String']['input'];
};

/** The link a share should hand out. */
export type ShareLink = {
  __typename?: 'ShareLink';
  /** The short code, or null when the plain destination is being handed out. */
  code?: Maybe<Scalars['String']['output']>;
  /** The duncit.com short link, or the plain destination when the link is retired. */
  url: Scalars['String']['output'];
};

/**
 * What is being shared. The destination behind each one is built by the server
 * from the thing itself, never taken from the request.
 */
export type ShareLinkTarget =
  | 'CLUB'
  | 'GIFT_CARD'
  | 'POD'
  /** A pod's rating form, sent by its host. */
  | 'POD_FEEDBACK'
  | 'POD_IDEA'
  /** The venue map link a shared pod message carries. */
  | 'POD_LOCATION'
  /** A pod's media upload page, sent by its host to the people who came. */
  | 'POD_MEDIA'
  | 'POST'
  | 'PROFILE'
  | 'REFERRAL';

/**
 * How one person has their console chrome arranged: the taskbar along the
 * bottom of every portal and the Agent tab stuck to its edge.
 *
 * Kept on the server rather than in the browser because the shell renders in
 * all seventeen consoles and each is its own origin — "per browser" would mean
 * "per portal you happen to have open".
 */
export type ShellWorkspaceState = {
  __typename?: 'ShellWorkspaceState';
  /** LEFT or RIGHT — which side the Agent tab is stuck to. */
  agent_edge: Scalars['String']['output'];
  /** How far down that edge the Agent tab sits, 0 (top) to 1 (bottom). */
  agent_offset: Scalars['Float']['output'];
  /** Whether the taskbar clock counts seconds. */
  clock_seconds: Scalars['Boolean']['output'];
  /** IANA zone for the taskbar clock, or '' to follow the admin's setting. */
  clock_zone: Scalars['String']['output'];
  /** Window ids currently rolled up to the taskbar. */
  minimised: Array<Scalars['String']['output']>;
  /** Whether the sidebar is minimised to its icon rail. */
  sidebar_collapsed: Scalars['Boolean']['output'];
};

/** Every field optional: the shell saves the one thing that changed. */
export type ShellWorkspaceStateInput = {
  agent_edge?: InputMaybe<Scalars['String']['input']>;
  agent_offset?: InputMaybe<Scalars['Float']['input']>;
  clock_seconds?: InputMaybe<Scalars['Boolean']['input']>;
  clock_zone?: InputMaybe<Scalars['String']['input']>;
  minimised?: InputMaybe<Array<Scalars['String']['input']>>;
  sidebar_collapsed?: InputMaybe<Scalars['Boolean']['input']>;
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

export type ShortLink = {
  __typename?: 'ShortLink';
  campaign_id?: Maybe<Scalars['ID']['output']>;
  click_count: Scalars['Int']['output'];
  code: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  destination_url: Scalars['String']['output'];
  first_clicked_at?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  last_clicked_at?: Maybe<Scalars['String']['output']>;
  medium: ShortLinkMedium;
  medium_other?: Maybe<Scalars['String']['output']>;
  /** The link you hand out, e.g. https://duncit.com/aB3xY9Zq */
  short_url: Scalars['String']['output'];
  source: ShortLinkSource;
  source_other?: Maybe<Scalars['String']['output']>;
  /** Where the code actually lands, with the utm tags and dl marker applied. */
  tagged_url: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  utm_campaign?: Maybe<Scalars['String']['output']>;
  utm_medium: Scalars['String']['output'];
  utm_source: Scalars['String']['output'];
};

/** One row of a breakdown — a value and how many clicks carried it. */
export type ShortLinkBreakdown = {
  __typename?: 'ShortLinkBreakdown';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
};

export type ShortLinkCampaign = {
  __typename?: 'ShortLinkCampaign';
  campaign_id: Scalars['ID']['output'];
  kind: ShortLinkCampaignKind;
  name: Scalars['String']['output'];
  utm_campaign: Scalars['String']['output'];
};

/** Where a short link's campaign comes from. */
export type ShortLinkCampaignKind =
  /** A marketing campaign. */
  | 'EMAIL'
  /** Defined by the platform; what the apps file every share under. */
  | 'SHARE';

/** A single recorded click. Addresses are hashed on the way in, never stored. */
export type ShortLinkClick = {
  __typename?: 'ShortLinkClick';
  browser: Scalars['String']['output'];
  city?: Maybe<Scalars['String']['output']>;
  click_id: Scalars['String']['output'];
  clicked_at: Scalars['String']['output'];
  country?: Maybe<Scalars['String']['output']>;
  device_type: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  os: Scalars['String']['output'];
  platform: Scalars['String']['output'];
  referrer_host?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
};

export type ShortLinkClickTablePage = {
  __typename?: 'ShortLinkClickTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ShortLinkClick>;
  total: Scalars['Int']['output'];
};

/** One payment credited to a click. */
export type ShortLinkConversion = {
  __typename?: 'ShortLinkConversion';
  amount: Scalars['Float']['output'];
  at: Scalars['String']['output'];
  payment_id: Scalars['ID']['output'];
};

export type ShortLinkDailyPoint = {
  __typename?: 'ShortLinkDailyPoint';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type ShortLinkFunnel = {
  __typename?: 'ShortLinkFunnel';
  /** Percentage of clicks that ended in a payment. */
  conversion_rate: Scalars['Float']['output'];
  /** Revenue attributed to this link. */
  revenue: Scalars['Float']['output'];
  steps: Array<ShortLinkFunnelStep>;
};

export type ShortLinkFunnelStep = {
  __typename?: 'ShortLinkFunnelStep';
  count: Scalars['Int']['output'];
  step: ShortLinkJourneyStep;
};

export type ShortLinkInput = {
  campaign_id?: InputMaybe<Scalars['ID']['input']>;
  destination_url: Scalars['String']['input'];
  label: Scalars['String']['input'];
  medium: ShortLinkMedium;
  /** Required when medium is OTHER. */
  medium_other?: InputMaybe<Scalars['String']['input']>;
  source: ShortLinkSource;
  /** Required when source is OTHER. */
  source_other?: InputMaybe<Scalars['String']['input']>;
};

/** One click, who it turned into, and how far it got. */
export type ShortLinkJourney = {
  __typename?: 'ShortLinkJourney';
  city?: Maybe<Scalars['String']['output']>;
  click_id: Scalars['String']['output'];
  clicked_at: Scalars['String']['output'];
  /** Every payment this click earned, oldest first. */
  conversions: Array<ShortLinkConversion>;
  /** Everything this visitor spent, across every payment. */
  converted_amount?: Maybe<Scalars['Float']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  device_type: Scalars['String']['output'];
  furthest_step: ShortLinkJourneyStep;
  id: Scalars['ID']['output'];
  platform: Scalars['String']['output'];
  steps: Array<ShortLinkJourneyEntry>;
  user_email?: Maybe<Scalars['String']['output']>;
  user_id?: Maybe<Scalars['ID']['output']>;
  user_name?: Maybe<Scalars['String']['output']>;
};

export type ShortLinkJourneyEntry = {
  __typename?: 'ShortLinkJourneyEntry';
  at: Scalars['String']['output'];
  step: ShortLinkJourneyStep;
};

/** How far a click got. Ordered — a later step implies the earlier ones. */
export type ShortLinkJourneyStep =
  | 'CHECKOUT_STARTED'
  | 'CLICKED'
  | 'LANDED'
  | 'PAID'
  | 'SIGNED_UP'
  | 'SURVEY_DONE'
  | 'VIEWED_POD';

export type ShortLinkJourneyTablePage = {
  __typename?: 'ShortLinkJourneyTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ShortLinkJourney>;
  total: Scalars['Int']['output'];
};

/** How the traffic arrives. Becomes utm_medium. */
export type ShortLinkMedium =
  | 'AFFILIATE'
  | 'BANNER'
  | 'CPC'
  | 'DIRECT'
  | 'DISPLAY'
  | 'DISPLAY_AD'
  | 'EMAIL'
  | 'INFLUENCER'
  | 'IN_APP'
  | 'MESSAGING'
  | 'ORGANIC_SEARCH'
  | 'ORGANIC_SOCIAL'
  | 'OTHER'
  | 'PAID_SOCIAL'
  | 'PUSH_NOTIFICATION'
  | 'QR_CODE'
  | 'REFERRAL'
  | 'SEARCH'
  | 'SMS'
  | 'SOCIAL'
  | 'VIDEO';

export type ShortLinkOption = {
  __typename?: 'ShortLinkOption';
  label: Scalars['String']['output'];
  requires_text: Scalars['Boolean']['output'];
  /** What this option puts in the URL. Empty for OTHER, which is free text. */
  utm_value: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type ShortLinkOptions = {
  __typename?: 'ShortLinkOptions';
  mediums: Array<ShortLinkOption>;
  sources: Array<ShortLinkOption>;
};

/**
 * Where a link is being handed out. Becomes utm_source. OTHER carries free
 * text in source_other.
 */
export type ShortLinkSource =
  | 'AFFILIATE'
  | 'DIRECT_LINK_SHARE'
  | 'DISCORD'
  | 'EMAIL'
  | 'FACEBOOK'
  | 'GOOGLE_ADS'
  | 'GOOGLE_SEARCH'
  | 'INFLUENCER'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'OTHER'
  | 'QR_CODE'
  | 'REDDIT'
  | 'REFERRAL_PARTNER'
  | 'SMS'
  | 'TELEGRAM'
  | 'THREADS'
  | 'WHATSAPP'
  | 'X_TWITTER'
  | 'YOUTUBE';

export type ShortLinkStats = {
  __typename?: 'ShortLinkStats';
  browsers: Array<ShortLinkBreakdown>;
  cities: Array<ShortLinkBreakdown>;
  countries: Array<ShortLinkBreakdown>;
  countries_reached: Scalars['Int']['output'];
  daily: Array<ShortLinkDailyPoint>;
  devices: Array<ShortLinkBreakdown>;
  oses: Array<ShortLinkBreakdown>;
  /** Where the click came from — Instagram, WhatsApp, Direct… */
  platforms: Array<ShortLinkBreakdown>;
  referrers: Array<ShortLinkBreakdown>;
  total_clicks: Scalars['Int']['output'];
  /** Distinct visitors, counted by hashed address. */
  unique_visitors: Scalars['Int']['output'];
};

export type ShortLinkTablePage = {
  __typename?: 'ShortLinkTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<ShortLink>;
  total: Scalars['Int']['output'];
};

export type SignContractInput = {
  designation: Scalars['String']['input'];
  full_name: Scalars['String']['input'];
  initials: Scalars['String']['input'];
  /** Data URL or hosted image. Must be under 5 MB. */
  signature_image: Scalars['String']['input'];
  signature_method: SignatureMethod;
};

export type SignLegalDocumentInput = {
  designation: Scalars['String']['input'];
  full_name: Scalars['String']['input'];
  initials: Scalars['String']['input'];
  /** Data URL or hosted image. Must be under 5 MB. */
  signature_image: Scalars['String']['input'];
  signature_method: SignatureMethod;
};

export type SignatureMethod =
  | 'DRAW'
  | 'TYPE'
  | 'UPLOAD';

export type SigningStatus =
  | 'SIGNED'
  | 'UNSIGNED';

export type SlackChannel = {
  __typename?: 'SlackChannel';
  id: Scalars['ID']['output'];
  is_member: Scalars['Boolean']['output'];
  is_private: Scalars['Boolean']['output'];
  /** Deep archive link to the channel — copy/share to reach it in Slack. */
  link: Scalars['String']['output'];
  name: Scalars['String']['output'];
  num_members: Scalars['Int']['output'];
  topic: Scalars['String']['output'];
};

/**
 * One message already posted in a channel. Authors arrive as ids, so the name
 * and avatar are resolved from the workspace directory server-side — a client
 * cannot do it without the bot token.
 */
export type SlackMessage = {
  __typename?: 'SlackMessage';
  avatar: Scalars['String']['output'];
  is_bot: Scalars['Boolean']['output'];
  /** Replies hanging off this message. Threads are read in Slack, not here. */
  reply_count: Scalars['Int']['output'];
  text: Scalars['String']['output'];
  /** Slack's own message id: the epoch-seconds timestamp it was posted at. */
  ts: Scalars['String']['output'];
  user_id: Scalars['String']['output'];
  user_name: Scalars['String']['output'];
};

/**
 * What the installed bot token may actually do.
 *
 * Every Slack failure this portal can show is really a permissions question, and
 * Slack answers it in a response HEADER that nobody can see. This is that header,
 * turned into a list, plus the links to change it.
 */
export type SlackPermissions = {
  __typename?: 'SlackPermissions';
  /** Where a workspace admin changes any of this. */
  app_url: Scalars['String']['output'];
  /** False when no bot token is configured at all. */
  configured: Scalars['Boolean']['output'];
  /** Slack's own reference for what these scopes mean. */
  docs_url: Scalars['String']['output'];
  /** Why the scopes could not be read, when they could not. Empty otherwise. */
  error: Scalars['String']['output'];
  scopes: Array<SlackScope>;
  /**
   * False when Slack did not report the token's scopes. Every scope below is
   * then unknown rather than ungranted — a token can work perfectly and still
   * not say so, and rendering that as a column of red crosses would be a lie.
   */
  scopes_known: Scalars['Boolean']['output'];
  /** The workspace the token belongs to. Empty when it could not be read. */
  team: Scalars['String']['output'];
};

/** One thing the bot is, or is not, allowed to do. */
export type SlackScope = {
  __typename?: 'SlackScope';
  granted: Scalars['Boolean']['output'];
  /** What stops working without it, in plain terms. */
  purpose: Scalars['String']['output'];
  /**
   * False for scopes that only buy a convenience. A workspace can withhold one
   * and everything else still works, so a missing optional scope is not a fault.
   */
  required: Scalars['Boolean']['output'];
  /** The Slack scope name, e.g. channels:history. */
  scope: Scalars['String']['output'];
};

export type SlackSendResult = {
  __typename?: 'SlackSendResult';
  channel: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  ts: Scalars['String']['output'];
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

/**
 * What pressing a card does. Asked rather than inferred: an in-app path and
 * a web address look alike to a validator and nothing alike to a person.
 */
export type SomethingForYouAction =
  | 'NONE'
  | 'ROUTE'
  | 'URL';

export type SomethingForYouInput = {
  action_type?: InputMaybe<SomethingForYouAction>;
  bottom_text?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  link_path?: InputMaybe<Scalars['String']['input']>;
  link_url?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

/**
 * One card in the "Something for you" rail at the bottom of Home. The same row
 * renders in mWeb and in the native app, so a promotion changes in one place.
 */
export type SomethingForYouItem = {
  __typename?: 'SomethingForYouItem';
  action_type: SomethingForYouAction;
  bottom_text: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_url: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  /** In-app path, e.g. /referral. Used when action_type is ROUTE. */
  link_path: Scalars['String']['output'];
  /** An address outside the product. Used when action_type is URL. */
  link_url: Scalars['String']['output'];
  sort_order: Scalars['Int']['output'];
  /** At most 30 characters — the card is a fixed size on both surfaces. */
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

/**
 * A call that happened between two coworkers.
 *
 * The audio and video went browser to browser, so this row is the only record
 * that it took place.
 */
export type StaffCall = {
  __typename?: 'StaffCall';
  duration_seconds: Scalars['Int']['output'];
  ended_at?: Maybe<Scalars['String']['output']>;
  from_user_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** AUDIO or VIDEO. */
  kind: Scalars['String']['output'];
  /** ANSWERED, MISSED, DECLINED or CANCELLED. */
  outcome: Scalars['String']['output'];
  /** The mp4 this call was recorded to, once FFmpeg has produced it. */
  recording_url?: Maybe<Scalars['String']['output']>;
  started_at?: Maybe<Scalars['String']['output']>;
  to_user_id: Scalars['ID']['output'];
};

/**
 * How one person has staff chat set up — what was open and how it looks.
 *
 * On the server rather than in localStorage because the same panel renders in
 * all seventeen consoles: "per browser" meant it forgot everything the moment
 * you moved to a different portal, and knew nothing at all on a second machine.
 */
export type StaffChatState = {
  __typename?: 'StaffChatState';
  bubble_color: Scalars['String']['output'];
  cam_id: Scalars['String']['output'];
  cam_label: Scalars['String']['output'];
  /** COMPACT or COMFORTABLE. */
  density: Scalars['String']['output'];
  enter_to_send: Scalars['Boolean']['output'];
  font_size: Scalars['Int']['output'];
  /** The microphone and camera chosen in Audio & video settings. */
  mic_id: Scalars['String']['output'];
  /** Their names — a deviceId is per origin, a label is what matches elsewhere. */
  mic_label: Scalars['String']['output'];
  /** The conversation that was open, so a refresh returns to it. */
  open_peer_id?: Maybe<Scalars['ID']['output']>;
  panel_open: Scalars['Boolean']['output'];
  /** The team filter, or '' for everyone. */
  role_filter: Scalars['String']['output'];
  /** IANA zone for every timestamp, or '' to follow the machine. */
  time_zone: Scalars['String']['output'];
};

/** Every field optional: the panel saves the one thing that changed. */
export type StaffChatStateInput = {
  bubble_color?: InputMaybe<Scalars['String']['input']>;
  cam_id?: InputMaybe<Scalars['String']['input']>;
  cam_label?: InputMaybe<Scalars['String']['input']>;
  density?: InputMaybe<Scalars['String']['input']>;
  enter_to_send?: InputMaybe<Scalars['Boolean']['input']>;
  font_size?: InputMaybe<Scalars['Int']['input']>;
  mic_id?: InputMaybe<Scalars['String']['input']>;
  mic_label?: InputMaybe<Scalars['String']['input']>;
  open_peer_id?: InputMaybe<Scalars['ID']['input']>;
  panel_open?: InputMaybe<Scalars['Boolean']['input']>;
  role_filter?: InputMaybe<Scalars['String']['input']>;
  time_zone?: InputMaybe<Scalars['String']['input']>;
};

/**
 * One entry of a browser's ICE configuration.
 *
 * STUN alone lets two browsers find each other when at least one of them can be
 * reached directly; a TURN relay is what carries the call when neither can, and
 * a company where people work from different networks needs one for calls to
 * connect at all.
 */
export type StaffIceServer = {
  __typename?: 'StaffIceServer';
  credential: Scalars['String']['output'];
  urls: Array<Scalars['String']['output']>;
  /** TURN only. Empty for a public STUN server, which needs no credentials. */
  username: Scalars['String']['output'];
};

/**
 * What a link in a message turns into on screen. An outside link gets an Open
 * Graph card; one of our own consoles gets the portal it points at and whether
 * the person reading can actually open it.
 */
export type StaffLinkPreview = {
  __typename?: 'StaffLinkPreview';
  /** Why not, when they cannot. */
  access_note?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** Whether the CALLER can open it. Always true for an outside link. */
  has_access: Scalars['Boolean']['output'];
  image?: Maybe<Scalars['String']['output']>;
  /** True when it points at one of our own consoles. */
  internal: Scalars['Boolean']['output'];
  /** Which console, when internal. */
  portal?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type StaffMessage = {
  __typename?: 'StaffMessage';
  attachment_name: Scalars['String']['output'];
  /** Loudness per slice, 0-1, for a voice note waveform. */
  attachment_peaks: Array<Scalars['Float']['output']>;
  /** Bytes, so a reader can judge before downloading. 0 when unknown. */
  attachment_size: Scalars['Int']['output'];
  attachment_type: Scalars['String']['output'];
  /** An ImageKit URL when a file came with it. */
  attachment_url: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  /**
   * Set when the author took it back. The row stays and the words go, because a
   * line that vanishes from the middle of a conversation reads as a bug.
   */
  deleted_at?: Maybe<Scalars['String']['output']>;
  /** Set when it reached any of their open tabs — the second tick. */
  delivered_at?: Maybe<Scalars['String']['output']>;
  /** Set when the author changed it, so the reader is told. */
  edited_at?: Maybe<Scalars['String']['output']>;
  /** Whose words these originally were, when it was forwarded on. */
  forwarded_from?: Maybe<Scalars['ID']['output']>;
  from_user_id: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  /** Who was named with @ in the text. */
  mentions: Array<Scalars['ID']['output']>;
  /** Set when somebody pinned it. Pins belong to the thread, not to a person. */
  pinned_at?: Maybe<Scalars['String']['output']>;
  pinned_by?: Maybe<Scalars['ID']['output']>;
  /**
   * Who reacted and with what. Empty on a deleted message — there is nothing
   * left to have reacted to.
   */
  reactions: Array<StaffReaction>;
  /** When the recipient read it; null until they do. */
  read_at?: Maybe<Scalars['String']['output']>;
  /** The message this one answers, when it is a reply. */
  reply_to_id?: Maybe<Scalars['ID']['output']>;
  text: Scalars['String']['output'];
  to_user_id: Scalars['ID']['output'];
};

/** One earlier wording of a message, kept when its author changed it. */
export type StaffMessageEdit = {
  __typename?: 'StaffMessageEdit';
  at?: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
};

/** Whether someone is at their desk. Held for as long as their socket is. */
export type StaffPresence = {
  __typename?: 'StaffPresence';
  /** When they last had a socket open — what 'last seen' reads from. */
  last_seen?: Maybe<Scalars['String']['output']>;
  since?: Maybe<Scalars['String']['output']>;
  /** ONLINE, AWAY, BUSY or OFFLINE. */
  status: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** One person's reaction to one message. At most one per person per message. */
export type StaffReaction = {
  __typename?: 'StaffReaction';
  at?: Maybe<Scalars['String']['output']>;
  /** The emoji itself. Any is allowed; the bar offers six. */
  emoji: Scalars['String']['output'];
  user_id: Scalars['ID']['output'];
};

/** Narrows a thread search. Every field is optional and they combine. */
export type StaffSearchInput = {
  /** ISO timestamps, inclusive. */
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  /** Only what this person wrote. */
  from_user_id?: InputMaybe<Scalars['ID']['input']>;
  /** Only messages carrying a file. */
  only_files?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only messages containing a link. */
  only_links?: InputMaybe<Scalars['Boolean']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
};

/** A conversation you already have, for the list down the side. */
export type StaffThread = {
  __typename?: 'StaffThread';
  last_at?: Maybe<Scalars['String']['output']>;
  /** So the list can show 'You: …' without comparing ids in the browser. */
  last_from_me: Scalars['Boolean']['output'];
  last_text: Scalars['String']['output'];
  peer: Coworker;
  unread: Scalars['Int']['output'];
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

/**
 * One problem report typed into the public status page.
 *
 * The probes answer "is the host returning an HTTP status"; this is everything
 * they cannot see — a login that loops, a blank page, a payment that hangs.
 */
export type StatusReport = {
  __typename?: 'StatusReport';
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  environment: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Screenshots the reporter attached. */
  image_urls: Array<Scalars['String']['output']>;
  impact: StatusReportImpact;
  /**
   * Read off the request by the server, never from the submitted body — the
   * form is public, so a body could claim to be anyone.
   */
  ip?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Triage note written from the Tech portal. */
  note: Scalars['String']['output'];
  page_url: Scalars['String']['output'];
  /** Catalogue slug of the affected service, or empty when the reporter was not sure. */
  service_key: Scalars['String']['output'];
  /** The catalogue's display name as it read when the report was filed. */
  service_name: Scalars['String']['output'];
  /** The affected service's address, as the catalogue held it when the report was filed. */
  service_url: Scalars['String']['output'];
  /** Images an operator attached while triaging. */
  staff_image_urls: Array<Scalars['String']['output']>;
  status: StatusReportStatus;
  updated_at: Scalars['String']['output'];
  user_agent?: Maybe<Scalars['String']['output']>;
  /** Set only when the reporter happened to be signed in on that browser. */
  user_id?: Maybe<Scalars['String']['output']>;
};

/**
 * One screenshot, sent inline with the report.
 *
 * Base64 rather than an upload URL on purpose: handing an unauthenticated form
 * a credential that can put files on our storage is a bigger door than the one
 * it is meant to open. The server does the upload.
 */
export type StatusReportImageInput = {
  /** Raw base64, or a data: URI straight out of a FileReader. */
  data: Scalars['String']['input'];
  file_name: Scalars['String']['input'];
  mime_type?: InputMaybe<Scalars['String']['input']>;
};

/** What the reporter is actually seeing, so a row can be triaged unread. */
export type StatusReportImpact =
  | 'CANNOT_ACCESS'
  | 'ERRORS'
  | 'LOGIN'
  | 'OTHER'
  | 'PAYMENT'
  | 'SLOW';

/** How a report was triaged. NEW until somebody in Tech picks it up. */
export type StatusReportStatus =
  | 'CLOSED'
  | 'IN_PROGRESS'
  | 'NEW'
  | 'RESOLVED';

export type StatusReportSubmitResult = {
  __typename?: 'StatusReportSubmitResult';
  id?: Maybe<Scalars['ID']['output']>;
  ok: Scalars['Boolean']['output'];
};

/** Server-side table page for the shared table engine (statusReportsTable). */
export type StatusReportTablePage = {
  __typename?: 'StatusReportTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<StatusReport>;
  total: Scalars['Int']['output'];
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

export type SubmitAccountDeletionRequestInput = {
  /** The 6-digit code from requestAccountDeletionOtp. */
  otp: Scalars['String']['input'];
  /** Optional: why they are leaving. Shown to whoever reviews it. */
  reason?: InputMaybe<Scalars['String']['input']>;
  surface?: InputMaybe<AccountDeletionSurface>;
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
  /**
   * Left out by the apps: the server reads it from the weakest score, so the
   * guest is not asked to triage their own feedback.
   */
  category?: InputMaybe<BouncerFeedbackCategory>;
  message?: InputMaybe<Scalars['String']['input']>;
  pod_id: Scalars['ID']['input'];
  /** The OVERALL score, 1-5. The only one that is required. */
  rating: Scalars['Int']['input'];
  /** Per-part scores. Anything the pod does not have is ignored. */
  ratings?: InputMaybe<Array<BouncerAspectRatingInput>>;
};

export type SubmitContactInput = {
  attachments?: InputMaybe<Array<Scalars['String']['input']>>;
  captcha_answer?: InputMaybe<Scalars['String']['input']>;
  /** Human check, required only when nobody is signed in. See the captchaChallenge query. */
  captcha_token?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  message: Scalars['String']['input'];
  name: Scalars['String']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitFaqQuestionInput = {
  captcha_answer?: InputMaybe<Scalars['String']['input']>;
  /** Human check, required only when nobody is signed in. See the captchaChallenge query. */
  captcha_token?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  question: Scalars['String']['input'];
  super_category_slug?: InputMaybe<Scalars['String']['input']>;
};

export type SubmitGrievanceInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  captcha_answer?: InputMaybe<Scalars['String']['input']>;
  /** Human check, required only when nobody is signed in. See the captchaChallenge query. */
  captcha_token?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  source?: InputMaybe<GrievanceSource>;
  subject: Scalars['String']['input'];
  /**
   * The support ticket being escalated. Nullable in the SCHEMA only so a build
   * that predates the field, or a grievance forwarded from the mailbox, is still
   * recorded — every form requires it.
   */
  support_ticket_ref?: InputMaybe<Scalars['String']['input']>;
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

export type SubmitStatusReportInput = {
  captcha_answer?: InputMaybe<Scalars['String']['input']>;
  /** Human check, required only when nobody is signed in. See the captchaChallenge query. */
  captcha_token?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  /** Screenshots. Capped server-side — the rest are dropped, never the report. */
  images?: InputMaybe<Array<StatusReportImageInput>>;
  impact?: InputMaybe<StatusReportImpact>;
  message: Scalars['String']['input'];
  name: Scalars['String']['input'];
  page_url?: InputMaybe<Scalars['String']['input']>;
  /** Catalogue slug from /status/services. Omit or leave empty when unsure. */
  service_key?: InputMaybe<Scalars['String']['input']>;
};

export type SubscribeNewsletterInput = {
  captcha_answer?: InputMaybe<Scalars['String']['input']>;
  /** Human check, required only when nobody is signed in. See the captchaChallenge query. */
  captcha_token?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  source?: InputMaybe<NewsletterSource>;
};

/**
 * One row of the Create-a-Pod Step-4 "Suggested Ticket Prices" table: an ₹x99
 * candidate ticket price and the host's projected payout at that price (every
 * payable spot sold, all deductions applied at the caller's effective rates).
 */
export type SuggestedTicketPrice = {
  __typename?: 'SuggestedTicketPrice';
  host_receives: Scalars['Float']['output'];
  price: Scalars['Float']['output'];
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

/** One dependency, as one `package.json` declares it. */
export type TechDependencyUpdate = {
  __typename?: 'TechDependencyUpdate';
  /** dependencies | devDependencies | peerDependencies | optionalDependencies */
  kind: Scalars['String']['output'];
  /** Newest published version, or null when the registry was never asked. */
  latest?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Exactly what the manifest declares — the range, not a resolved version. */
  range: Scalars['String']['output'];
  updateType: TechUpdateType;
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

export type TechExecResult = {
  __typename?: 'TechExecResult';
  exitCode: Scalars['Int']['output'];
  stderr: Scalars['String']['output'];
  stdout: Scalars['String']['output'];
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

/** One `package.json`, with its dependency rows and their counts. */
export type TechPackageUpdate = {
  __typename?: 'TechPackageUpdate';
  dependencies: Array<TechDependencyUpdate>;
  major: Scalars['Int']['output'];
  minor: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  outdated: Scalars['Int']['output'];
  patch: Scalars['Int']['output'];
  /** Repo-relative path to the manifest. */
  path: Scalars['String']['output'];
  private: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

/** Every manifest in the repo against the registry, as of one sweep. */
export type TechPackageUpdatesReport = {
  __typename?: 'TechPackageUpdatesReport';
  /** ISO time of the last successful sweep; null when none has succeeded. */
  checkedAt?: Maybe<Scalars['String']['output']>;
  /** Why the last sweep failed, when it did. */
  error?: Maybe<Scalars['String']['output']>;
  major: Scalars['Int']['output'];
  minor: Scalars['Int']['output'];
  outdated: Scalars['Int']['output'];
  packages: Array<TechPackageUpdate>;
  patch: Scalars['Int']['output'];
  registry: Scalars['String']['output'];
  totalDependencies: Scalars['Int']['output'];
  totalPackages: Scalars['Int']['output'];
  /** Distinct dependency names the registry was asked about. */
  uniqueDependencies: Scalars['Int']['output'];
};

export type TechRestartResult = {
  __typename?: 'TechRestartResult';
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
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

/**
 * How far a declared range is behind what npm publishes.
 *
 * INTERNAL is a `workspace:`/`file:` range that resolves inside the repo, and
 * UNKNOWN is a range no registry can answer for — an alias, a git host, a
 * tarball URL — or a name the registry did not return.
 */
export type TechUpdateType =
  | 'INTERNAL'
  | 'MAJOR'
  | 'MINOR'
  | 'PATCH'
  | 'UNKNOWN'
  | 'UP_TO_DATE';

/** The machine the surface was running on, as it described itself. */
export type TelemetryClient = {
  __typename?: 'TelemetryClient';
  app_version?: Maybe<Scalars['String']['output']>;
  device_model?: Maybe<Scalars['String']['output']>;
  device_os_version?: Maybe<Scalars['String']['output']>;
  locale?: Maybe<Scalars['String']['output']>;
  network?: Maybe<Scalars['String']['output']>;
  referrer?: Maybe<Scalars['String']['output']>;
  screen?: Maybe<Scalars['String']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  viewport?: Maybe<Scalars['String']['output']>;
};

export type TelemetryClientImportInput = {
  app_version?: InputMaybe<Scalars['String']['input']>;
  device_model?: InputMaybe<Scalars['String']['input']>;
  device_os_version?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  network?: InputMaybe<Scalars['String']['input']>;
  referrer?: InputMaybe<Scalars['String']['input']>;
  screen?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  viewport?: InputMaybe<Scalars['String']['input']>;
};

export type TelemetryCountBucket = {
  __typename?: 'TelemetryCountBucket';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
};

export type TelemetryDashboard = {
  __typename?: 'TelemetryDashboard';
  active_bugs: Scalars['Int']['output'];
  by_environment: Array<TelemetryCountBucket>;
  by_level: Array<TelemetryCountBucket>;
  by_source: Array<TelemetryCountBucket>;
  range_days: Scalars['Int']['output'];
  series: Array<TelemetrySeriesPoint>;
  top_bugs: Array<Bug>;
  total_logs: Scalars['Int']['output'];
};

export type TelemetryError = {
  __typename?: 'TelemetryError';
  message: Scalars['String']['output'];
  name: Scalars['String']['output'];
  stack?: Maybe<Scalars['String']['output']>;
};

export type TelemetryErrorImportInput = {
  message?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  stack?: InputMaybe<Scalars['String']['input']>;
};

export type TelemetryLog = {
  __typename?: 'TelemetryLog';
  app: Scalars['String']['output'];
  client?: Maybe<TelemetryClient>;
  component: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  /** Extra structured context the caller attached, JSON-stringified. */
  data_json?: Maybe<Scalars['String']['output']>;
  /** Duncit device id (x-duid) and the surface's per-tab / per-launch id. */
  duid?: Maybe<Scalars['String']['output']>;
  environment: Scalars['String']['output'];
  error?: Maybe<TelemetryError>;
  host?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Read off the request by the server, so neither can be forged by a body. */
  ip?: Maybe<Scalars['String']['output']>;
  level: Scalars['String']['output'];
  os?: Maybe<Scalars['String']['output']>;
  page: Scalars['String']['output'];
  platform: Scalars['String']['output'];
  portal?: Maybe<Scalars['String']['output']>;
  session_id?: Maybe<Scalars['String']['output']>;
  /** Normalized surface key (mWeb / mobileApp:ios / portal:crm / server). */
  source: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  user?: Maybe<TelemetryUser>;
  user_agent?: Maybe<Scalars['String']['output']>;
  /** Signed-in account id, denormalized so the table can filter on one person. */
  user_id?: Maybe<Scalars['String']['output']>;
};

/**
 * One log row from an export file. Matched on the id it already carries, so
 * importing the same file twice adds nothing the second time.
 */
export type TelemetryLogImportInput = {
  app: Scalars['String']['input'];
  client?: InputMaybe<TelemetryClientImportInput>;
  component: Scalars['String']['input'];
  created_at?: InputMaybe<Scalars['String']['input']>;
  data_json?: InputMaybe<Scalars['String']['input']>;
  duid?: InputMaybe<Scalars['String']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  error?: InputMaybe<TelemetryErrorImportInput>;
  host?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  ip?: InputMaybe<Scalars['String']['input']>;
  level: Scalars['String']['input'];
  os?: InputMaybe<Scalars['String']['input']>;
  page: Scalars['String']['input'];
  platform?: InputMaybe<Scalars['String']['input']>;
  portal?: InputMaybe<Scalars['String']['input']>;
  session_id?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  user?: InputMaybe<TelemetryUserImportInput>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
};

export type TelemetryLogImportResult = {
  __typename?: 'TelemetryLogImportResult';
  created: Scalars['Int']['output'];
  /**
   * Rows whose own timestamp is already past the retention window. They landed,
   * but the next daily cleanup deletes them again — reported so a restore that
   * will not survive says so at the time, not the next morning.
   */
  expiring: Scalars['Int']['output'];
  /** Rows already present under the same id, so nothing was written for them. */
  skipped: Scalars['Int']['output'];
};

export type TelemetryLogTablePage = {
  __typename?: 'TelemetryLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<TelemetryLog>;
  total: Scalars['Int']['output'];
};

export type TelemetrySeriesPoint = {
  __typename?: 'TelemetrySeriesPoint';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type TelemetrySettings = {
  __typename?: 'TelemetrySettings';
  /** Levels written to the DB (the rest only ship to SigNoz). */
  persisted_levels: Array<Scalars['String']['output']>;
  /**
   * The secret inside the read-only JSON feed URLs (/telemetry/logs.json?key=…).
   * Those routes carry no login, so this string is the only thing guarding every
   * stack trace, address and email the platform has recorded. Rotate it the
   * moment a copied URL leaves safe hands.
   */
  public_api_key: Scalars['String']['output'];
  /** Days a persisted log/bug is kept before the daily cleanup deletes it (1..90). */
  retention_days: Scalars['Int']['output'];
  /** Master switch for shipping logs to SigNoz (OTLP). */
  signoz_enabled: Scalars['Boolean']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/**
 * The account behind a log. Server-resolved from the request's verified token
 * and that account's record — never from anything the sender put in the body.
 */
export type TelemetryUser = {
  __typename?: 'TelemetryUser';
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  roles: Array<Scalars['String']['output']>;
};

export type TelemetryUserImportInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
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
  /** The address to reply to when there is no account behind the ticket. */
  guest_email?: Maybe<Scalars['String']['output']>;
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
  source: TicketSource;
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

/**
 * Where the request came from. WEBSITE is the contact form on duncit.com,
 * which anyone can use without an account. EMAIL is a message that arrived in a
 * mailbox connected under Mail Automation.
 */
export type TicketSource =
  | 'APP'
  | 'EMAIL'
  | 'WEBSITE';

export type TicketStatus =
  | 'CLOSED'
  | 'OPEN'
  | 'PENDING'
  | 'RESOLVED';

/** Where every app reads the current time from. */
export type TimeSource =
  /** Each device's own clock. */
  | 'BROWSER'
  /** A fixed anchor set by an admin; the clock runs forward from there. */
  | 'CUSTOM'
  /** The server's clock — the default, keeps every device in step. */
  | 'SERVER';

export type TrackedImage = {
  __typename?: 'TrackedImage';
  load_count: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type TrackedLink = {
  __typename?: 'TrackedLink';
  click_count: Scalars['Int']['output'];
  kind: TrackedLinkKind;
  url: Scalars['String']['output'];
};

export type TrackedLinkKind =
  /** A link MJML rendered as a button. */
  | 'CTA'
  | 'LINK'
  /** An opt-out, kept apart so it never reads as ordinary engagement. */
  | 'UNSUBSCRIBE';

/** Export format for support chat / ticket transcripts. */
export type TranscriptFormat =
  | 'DOCX'
  | 'TXT';

/** A translation key with every locale's text — one row in the admin table. */
export type Translation = {
  __typename?: 'Translation';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  /** Second key segment, e.g. 'shop' — lets the admin filter page-wise. */
  page: Scalars['String']['output'];
  /** First key segment, e.g. 'mweb' — lets the admin filter portal-wise. */
  surface: Scalars['String']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
  values: Array<TranslationEntry>;
};

/** One translated string for one locale. */
export type TranslationEntry = {
  __typename?: 'TranslationEntry';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

/**
 * One namespace — the surface + page pair every key under it shares, e.g.
 * 'mweb' + 'shop'. The admin lists these first and drills into the entries, so a
 * catalogue of hundreds of keys reads as a few dozen pages instead of one flat
 * wall.
 */
export type TranslationGroup = {
  __typename?: 'TranslationGroup';
  /** surface + page joined, e.g. 'mweb.shop' — the table's stable row id. */
  id: Scalars['ID']['output'];
  key_count: Scalars['Int']['output'];
  /** One entry per ACTIVE locale, so translated < key_count reads as a gap. */
  locales: Array<TranslationGroupLocaleCount>;
  page: Scalars['String']['output'];
  surface: Scalars['String']['output'];
};

/** How many of a namespace's keys carry text in one locale. */
export type TranslationGroupLocaleCount = {
  __typename?: 'TranslationGroupLocaleCount';
  locale: Scalars['String']['output'];
  translated: Scalars['Int']['output'];
};

/** Server-side table page of namespaces for the shared table engine. */
export type TranslationGroupTablePage = {
  __typename?: 'TranslationGroupTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<TranslationGroup>;
  total: Scalars['Int']['output'];
};

/** Server-side table page for the shared table engine. */
export type TranslationTablePage = {
  __typename?: 'TranslationTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<Translation>;
  total: Scalars['Int']['output'];
};

export type TranslationValueEntry = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type TranslationValueInput = {
  locale: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/**
 * A build asked for from the Tech portal, rather than one that happened because
 * something was merged.
 */
export type TriggerAppBuildInput = {
  /**
   * Which server and database the built app talks to. This is baked into the
   * binary at compile time and cannot be changed afterwards, which is the whole
   * reason the choice is here.
   */
  app_env: AppBuildEnv;
  /**
   * Which artifacts to produce. Android accepts APK, AAB or both; iOS accepts
   * only IPA. Asking for fewer is faster — an APK-only Android build skips the
   * bundle task entirely.
   */
  artifacts: Array<AppBuildArtifactKind>;
  platform: AppBuildPlatform;
  /** Branch or tag to build. Defaults to main for PRODUCTION, staging for STAGING. */
  ref?: InputMaybe<Scalars['String']['input']>;
  /** Submit an Android AAB to Google Play internal testing after it builds. */
  submit_to_play_store?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Where a dispatched build can be watched while the runner picks it up. */
export type TriggerAppBuildResult = {
  __typename?: 'TriggerAppBuildResult';
  /**
   * The workflow's run list on GitHub, filtered to this branch. A dispatch
   * answers before a run exists, so this is the only link available until the
   * runner sends its first report and the row gains a real run url.
   */
  actions_url: Scalars['String']['output'];
  build: AppBuild;
};

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

/**
 * Every field is optional: the console saves the one card the operator touched
 * rather than rewriting the whole schedule from a form it may have half-loaded.
 */
export type UpdateAccountDeletionCronInput = {
  cron_batch_size?: InputMaybe<Scalars['Int']['input']>;
  cron_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  cron_frequency?: InputMaybe<AccountDeletionCronFrequency>;
  /** `HH:mm`. Refused if it cannot be parsed — a schedule nothing can read never fires. */
  cron_time_of_day?: InputMaybe<Scalars['String']['input']>;
  cron_weekday?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateAdPricingInput = {
  auto_per_day?: InputMaybe<Scalars['Float']['input']>;
  club_list_per_day?: InputMaybe<Scalars['Float']['input']>;
  currency_symbol?: InputMaybe<Scalars['String']['input']>;
  explore_scroll_per_day?: InputMaybe<Scalars['Float']['input']>;
  home_bottom_per_day?: InputMaybe<Scalars['Float']['input']>;
  max_days?: InputMaybe<Scalars['Int']['input']>;
  min_days?: InputMaybe<Scalars['Int']['input']>;
  placements?: InputMaybe<Array<AdPlacementCopyInput>>;
  pod_details_per_day?: InputMaybe<Scalars['Float']['input']>;
  pod_list_per_day?: InputMaybe<Scalars['Float']['input']>;
  sidebar_per_day?: InputMaybe<Scalars['Float']['input']>;
  status_per_day?: InputMaybe<Scalars['Float']['input']>;
  venue_list_per_day?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateAiMonitoringSettingsInput = {
  chip_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  chip_label?: InputMaybe<Scalars['String']['input']>;
  dialog_footnote?: InputMaybe<Scalars['String']['input']>;
  dialog_intro?: InputMaybe<Scalars['String']['input']>;
  dialog_points?: InputMaybe<Array<Scalars['String']['input']>>;
  dialog_title?: InputMaybe<Scalars['String']['input']>;
  dismiss_label?: InputMaybe<Scalars['String']['input']>;
  /** Replaces the body of the upload.image_scan system prompt. */
  image_prompt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAiPromptInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  target_model?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAppBuildSettingsInput = {
  /** Slack channel ID (e.g. C0123ABCD) Android builds announce to. Empty clears it. */
  android_channel?: InputMaybe<Scalars['String']['input']>;
  /** Slack channel ID iOS builds announce to. Empty clears it. */
  ios_channel?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAppSettingsInput = {
  /** Whether a host must verify an attendee's name and phone over OTP before marking them present by hand. The door scan is proof on its own and is never gated by this. */
  attendance_otp_required?: InputMaybe<Scalars['Boolean']['input']>;
  /** Account Health points a venue or host loses by withdrawing from an Auto Pod (0-100, 0 disables the penalty). */
  auto_pod_cancel_health_penalty?: InputMaybe<Scalars['Int']['input']>;
  /** How many days ahead a venue is shown its free slots when accepting an Auto Pod (1-60). */
  auto_pod_slot_window_days?: InputMaybe<Scalars['Int']['input']>;
  /** How many hours an Auto Pod waits for a venue before it leaves venues' lists and expires (1-720). */
  auto_pod_venue_expiry_hours?: InputMaybe<Scalars['Int']['input']>;
  /** CUSTOM anchor (ISO). Saving it stamps custom_time_set_at server-side. */
  custom_time?: InputMaybe<Scalars['String']['input']>;
  date_format?: InputMaybe<Scalars['String']['input']>;
  /** Days a Create-Pod draft is kept before auto-deletion (min 1). */
  draft_retention_days?: InputMaybe<Scalars['Int']['input']>;
  jwt_expires_in?: InputMaybe<Scalars['String']['input']>;
  jwt_no_expiry?: InputMaybe<Scalars['Boolean']['input']>;
  /** Max Backout attempts a user gets per pod (min 1). */
  max_backout_attempts?: InputMaybe<Scalars['Int']['input']>;
  /** Minimum age to use the app, in whole years (1-120). */
  min_signup_age?: InputMaybe<Scalars['Int']['input']>;
  /** Whether the sweep auto-cancels an upcoming pod whose finances are negative, refunding attendees under the venue's cancellation policy. */
  pod_auto_cancel_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** How many hours before a pod's start the auto-cancel finance check runs (1-8760). */
  pod_auto_cancel_lead_hours?: InputMaybe<Scalars['Int']['input']>;
  time_format?: InputMaybe<Scalars['String']['input']>;
  time_source?: InputMaybe<TimeSource>;
  time_zone?: InputMaybe<Scalars['String']['input']>;
  /** Account Health points deducted from a venue when its owner cancels a pod booked there (0-100, 0 disables the penalty). */
  venue_cancel_health_penalty?: InputMaybe<Scalars['Int']['input']>;
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

export type UpdateAutoPodInput = {
  available_perks?: InputMaybe<Array<Scalars['String']['input']>>;
  meeting_notes?: InputMaybe<Scalars['String']['input']>;
  meeting_platform?: InputMaybe<Scalars['String']['input']>;
  meeting_url?: InputMaybe<Scalars['String']['input']>;
  no_of_spots?: InputMaybe<Scalars['Int']['input']>;
  payment_terms?: InputMaybe<Scalars['String']['input']>;
  place_charges?: InputMaybe<Array<PodPlaceChargeInput>>;
  pod_amount?: InputMaybe<Scalars['Float']['input']>;
  pod_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_description?: InputMaybe<Scalars['String']['input']>;
  pod_end_date_time?: InputMaybe<Scalars['String']['input']>;
  pod_hashtag?: InputMaybe<Array<Scalars['String']['input']>>;
  pod_images_and_videos?: InputMaybe<Array<PodMediaInput>>;
  pod_info?: InputMaybe<Scalars['String']['input']>;
  pod_mode?: InputMaybe<PodMode>;
  pod_occurrence?: InputMaybe<PodOccurrence>;
  pod_title?: InputMaybe<Scalars['String']['input']>;
  product_requests?: InputMaybe<Array<PodProductRequestInput>>;
  reel_url?: InputMaybe<Scalars['String']['input']>;
  sub_category_id?: InputMaybe<Scalars['ID']['input']>;
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateBadgeInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  condition_type?: InputMaybe<BadgeConditionType>;
  description?: InputMaybe<Scalars['String']['input']>;
  image_url?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  role_key?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBrandingInput = {
  android_app_url?: InputMaybe<Scalars['String']['input']>;
  app_latest_version?: InputMaybe<Scalars['String']['input']>;
  app_min_supported_version?: InputMaybe<Scalars['String']['input']>;
  app_name?: InputMaybe<Scalars['String']['input']>;
  home_all_vibe_icon_layout?: InputMaybe<CategoryIconLayoutInput>;
  home_all_vibe_icon_url?: InputMaybe<Scalars['String']['input']>;
  home_header_tagline?: InputMaybe<Scalars['String']['input']>;
  home_show_all_vibe_categories?: InputMaybe<Scalars['Boolean']['input']>;
  home_vibe_heading?: InputMaybe<Scalars['String']['input']>;
  home_vibe_subheading?: InputMaybe<Scalars['String']['input']>;
  ios_app_url?: InputMaybe<Scalars['String']['input']>;
  login_background_image_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  login_background_image_url?: InputMaybe<Scalars['String']['input']>;
  login_background_video_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  login_background_video_url?: InputMaybe<Scalars['String']['input']>;
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
  gift_card_image_back?: InputMaybe<Scalars['String']['input']>;
  gift_card_image_front?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  icon_layout_mweb?: InputMaybe<CategoryIconLayoutInput>;
  icon_layout_native?: InputMaybe<CategoryIconLayoutInput>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  max_co_hosts?: InputMaybe<Scalars['Int']['input']>;
  media?: InputMaybe<Array<CategoryMediaInput>>;
  min_pax?: InputMaybe<Scalars['Int']['input']>;
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

export type UpdateClubAdminProfileInput = {
  category_id?: InputMaybe<Scalars['ID']['input']>;
  commission_pct?: InputMaybe<Scalars['Float']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  full_name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateContentReportStatusInput = {
  resolution?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ReportStatus>;
};

export type UpdateContractInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  counterparty?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  effective_from?: InputMaybe<Scalars['String']['input']>;
  effective_to?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ContractStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateEmailFragmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  footer_mjml?: InputMaybe<Scalars['String']['input']>;
  header_mjml?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEmailTemplateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  footer_note?: InputMaybe<Scalars['String']['input']>;
  fragment_key?: InputMaybe<Scalars['String']['input']>;
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
  refund_processing_days?: InputMaybe<Scalars['Int']['input']>;
  venue_payout_mode?: InputMaybe<PayoutMode>;
};

export type UpdateGrievanceStatusInput = {
  resolution?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<GrievanceStatus>;
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
  free_delivery_above?: InputMaybe<Scalars['Float']['input']>;
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
  /** Duncit warehouse (owner_kind DUNCIT) origin. Required for Duncit-owned products (enforced server-side). */
  pickup_location_id?: InputMaybe<Scalars['ID']['input']>;
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

/** Scalars are patched individually; a present rewards array replaces the whole list. */
export type UpdateLeaderboardSettingsInput = {
  points_per_club_pod?: InputMaybe<Scalars['Float']['input']>;
  points_per_host?: InputMaybe<Scalars['Float']['input']>;
  points_per_join?: InputMaybe<Scalars['Float']['input']>;
  points_per_product_sale?: InputMaybe<Scalars['Float']['input']>;
  points_per_venue_pod?: InputMaybe<Scalars['Float']['input']>;
  rewards?: InputMaybe<Array<LeaderboardRewardInput>>;
};

export type UpdateLegalDocumentInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  document_type?: InputMaybe<Scalars['String']['input']>;
  /** Off hides the document from the app without deleting it. */
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
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
  /**
   * Re-route the pod to a different slot (Admin / Club Admin edit at any stage).
   * A partner's slot re-enters that venue's approval queue exactly like a host
   * resubmission; the previously held slot is released. Omit to leave the
   * pod's current booking untouched.
   */
  venue_slot_id?: InputMaybe<Scalars['ID']['input']>;
  what_this_pod_offers?: InputMaybe<Array<Scalars['String']['input']>>;
  zone_name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePolicyInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Email everyone who has already accepted this policy that it changed.
   *
   * A deliberate tick, never inferred: a typo fix in a heading is not a reason
   * to write to everybody. Ignored unless the CONTENT actually changed, because
   * a notice about an unchanged policy is a notice nobody can act on.
   */
  notify_accepted_users?: InputMaybe<Scalars['Boolean']['input']>;
  /** Legal's own note on what changed, shown in the notice. Optional. */
  notify_summary?: InputMaybe<Scalars['String']['input']>;
  policy_type?: InputMaybe<Scalars['String']['input']>;
  requires_signup_acceptance?: InputMaybe<Scalars['Boolean']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sort_order?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateReportProblemConfigInput = {
  allow_media?: InputMaybe<Scalars['Boolean']['input']>;
  categories?: InputMaybe<Array<ReportProblemCategoryInput>>;
  max_media?: InputMaybe<Scalars['Int']['input']>;
  message_hint?: InputMaybe<Scalars['String']['input']>;
  message_label?: InputMaybe<Scalars['String']['input']>;
  message_min_length?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateReportProblemSlackInput = {
  /** Channel ID (e.g. C0123ABCD). Empty falls back to the configured feedback / default channel. */
  channel_id?: InputMaybe<Scalars['String']['input']>;
  /** The channel's name as shown when it was picked. */
  channel_name?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
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

export type UpdateTelemetrySettingsInput = {
  persisted_levels?: InputMaybe<Array<Scalars['String']['input']>>;
  retention_days?: InputMaybe<Scalars['Int']['input']>;
  signoz_enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateUploadSettingInput = {
  ai_image_monitoring_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  allowed_image_formats?: InputMaybe<Array<Scalars['String']['input']>>;
  allowed_video_formats?: InputMaybe<Array<Scalars['String']['input']>>;
  crop_presets?: InputMaybe<Array<UploadCropPresetInput>>;
  default_crop_key?: InputMaybe<Scalars['String']['input']>;
  image_compression_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  image_max_dimension?: InputMaybe<Scalars['Int']['input']>;
  image_quality?: InputMaybe<Scalars['Int']['input']>;
  max_image_mb?: InputMaybe<Scalars['Int']['input']>;
  max_video_mb?: InputMaybe<Scalars['Int']['input']>;
  video_compression_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  video_crf?: InputMaybe<Scalars['Int']['input']>;
  video_max_height?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateUserInput = {
  assigned_city?: InputMaybe<Scalars['String']['input']>;
  assigned_zones?: InputMaybe<Array<Scalars['String']['input']>>;
  bio?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  dob?: InputMaybe<Scalars['String']['input']>;
  /**
   * The account's email address, changed directly.
   *
   * An admin needs no one-time code here: the OTP that gates this same change
   * on mWeb and the native app exists to prove the person owns the address they
   * are typing, and an admin editing somebody else's record has already been
   * authorised by their role. Blank clears the address.
   */
  email?: InputMaybe<Scalars['String']['input']>;
  first_name?: InputMaybe<Scalars['String']['input']>;
  host_commission_pct?: InputMaybe<Scalars['Float']['input']>;
  host_share_pct?: InputMaybe<Scalars['Float']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  /** Blank clears the number — it is cleared as a pair with phone_extension. */
  phone_number?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  profile_photo?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
  state?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
  whatsapp_extension?: InputMaybe<Scalars['String']['input']>;
  /** Blank clears the number — it is cleared as a pair with whatsapp_extension. */
  whatsapp_number?: InputMaybe<Scalars['String']['input']>;
  zone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVenueSlotInput = {
  block?: InputMaybe<Scalars['Boolean']['input']>;
  end_at?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  start_at?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWaPricingInput = {
  authentication_per_msg: Scalars['Float']['input'];
  currency_symbol: Scalars['String']['input'];
  marketing_per_msg: Scalars['Float']['input'];
  service_per_msg: Scalars['Float']['input'];
  utility_per_msg: Scalars['Float']['input'];
};

/** Every role is optional: the ones sent are updated, the rest keep their stored value. */
export type UpdateWithdrawalMinimumsInput = {
  club_admin?: InputMaybe<Scalars['Float']['input']>;
  ecomm_manager?: InputMaybe<Scalars['Float']['input']>;
  host?: InputMaybe<Scalars['Float']['input']>;
  venue_owner?: InputMaybe<Scalars['Float']['input']>;
};

export type UploadCropPreset = {
  __typename?: 'UploadCropPreset';
  enabled: Scalars['Boolean']['output'];
  height: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  /** Target output resolution; 0×0 = keep the source resolution (No Crop). */
  width: Scalars['Int']['output'];
};

export type UploadCropPresetInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  key: Scalars['String']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Source-pixel crop rectangle from the client crop UI (react-easy-crop). */
export type UploadCropRectInput = {
  height: Scalars['Float']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type UploadSetting = {
  __typename?: 'UploadSetting';
  ai_image_monitoring_enabled: Scalars['Boolean']['output'];
  allowed_image_formats: Array<Scalars['String']['output']>;
  allowed_video_formats: Array<Scalars['String']['output']>;
  crop_presets: Array<UploadCropPreset>;
  default_crop_key: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image_compression_enabled: Scalars['Boolean']['output'];
  image_max_dimension: Scalars['Int']['output'];
  image_quality: Scalars['Int']['output'];
  max_image_mb: Scalars['Int']['output'];
  max_video_mb: Scalars['Int']['output'];
  surface: UploadSurface;
  updated_at?: Maybe<Scalars['String']['output']>;
  video_compression_enabled: Scalars['Boolean']['output'];
  video_crf: Scalars['Int']['output'];
  video_max_height: Scalars['Int']['output'];
};

export type UploadSurface =
  | 'MOBILE'
  | 'MWEB'
  | 'PORTALS';

export type UploadedImage = {
  __typename?: 'UploadedImage';
  fileId: Scalars['String']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type UpsertLocaleInput = {
  code: Scalars['String']['input'];
  english_label?: InputMaybe<Scalars['String']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  is_rtl?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
  sort_order?: InputMaybe<Scalars['Int']['input']>;
};

export type UpsertTranslationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  /** Only the locales supplied are written; others keep their existing text. */
  values?: InputMaybe<Array<TranslationValueInput>>;
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
  /** The Gmail address linked to this account, or null when Google is not connected. Shown beside the email in the admin user list so support can see both ways in. */
  google_email?: Maybe<Scalars['String']['output']>;
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
  /** BCP-47 language the user picked (e.g. en-IN). Drives every surface. */
  locale?: Maybe<Scalars['String']['output']>;
  onboarding_survey_completed: Scalars['Boolean']['output'];
  pet_profile?: Maybe<PetProfile>;
  phone_extension: Scalars['String']['output'];
  phone_number: Scalars['String']['output'];
  pincode?: Maybe<Scalars['String']['output']>;
  profile_links: Array<ProfileLink>;
  profile_photo?: Maybe<Scalars['String']['output']>;
  profile_visibility?: Maybe<ProfileVisibility>;
  /** Private profiles this user has asked to follow and is still waiting on. */
  requested_user_ids: Array<Scalars['ID']['output']>;
  roles: Array<Scalars['String']['output']>;
  saved_pod_ids: Array<Scalars['ID']['output']>;
  /** The location the user last selected in the header (persisted choice). */
  selected_location_id?: Maybe<Scalars['ID']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  status?: Maybe<UserStatus>;
  /**
   * IANA zone the account is pinned to (e.g. Asia/Kolkata). Empty means the
   * surface should fall back to the device zone.
   */
  timezone?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['ID']['output'];
  /**
   * The globally unique @handle this profile is shared as — what
   * /u/<username> carries. Null only on accounts created before handles
   * existed and not yet migrated; readers fall back to user_id for those.
   */
  username?: Maybe<Scalars['String']['output']>;
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

/** A saved address in the user's address book (Profile Settings › Addresses). */
export type UserAddress = {
  __typename?: 'UserAddress';
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  is_default: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  landmark: Scalars['String']['output'];
  line1: Scalars['String']['output'];
  line2: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
  pincode: Scalars['String']['output'];
  state: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type UserAddressInput = {
  city: Scalars['String']['input'];
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  is_default?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  landmark?: InputMaybe<Scalars['String']['input']>;
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  pincode: Scalars['String']['input'];
  state: Scalars['String']['input'];
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

/** What happened to the account (not to the individual field). */
export type UserChangeAction =
  | 'CREATE'
  | 'DELETE'
  | 'UPDATE';

/**
 * Who made the change, relative to the account it changed. Editing your own
 * profile is USER, editing someone else's is ADMIN, and a write with no
 * signed-in caller (signup, webhook, background job) is SYSTEM.
 */
export type UserChangeActorType =
  | 'ADMIN'
  | 'SYSTEM'
  | 'USER';

/** One immutable entry: one field of one user, changed once. */
export type UserChangeLog = {
  __typename?: 'UserChangeLog';
  action: UserChangeAction;
  actor_name: Scalars['String']['output'];
  actor_type: UserChangeActorType;
  /** The account that made the change; null for SYSTEM writes. */
  actor_user_id?: Maybe<Scalars['ID']['output']>;
  /** When the change was recorded. */
  created_at: Scalars['String']['output'];
  /** Document path of the field, e.g. profile.first_name. */
  field: Scalars['String']['output'];
  /** Human label for the same field, e.g. First Name. */
  field_label: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  new_value: Scalars['String']['output'];
  old_value: Scalars['String']['output'];
  source: UserChangeSource;
  /** The account the change was made TO. */
  user_id: Scalars['ID']['output'];
};

/** Server-side table page for the shared table engine. */
export type UserChangeLogTablePage = {
  __typename?: 'UserChangeLogTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<UserChangeLog>;
  total: Scalars['Int']['output'];
};

/** Which surface the change was made from. */
export type UserChangeSource =
  | 'ADMIN_PORTAL'
  | 'MWEB'
  | 'NATIVE'
  | 'PORTAL'
  | 'SERVER';

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

export type UsernameAvailability = {
  __typename?: 'UsernameAvailability';
  available: Scalars['Boolean']['output'];
  /** Null when available. */
  reason?: Maybe<UsernameRejection>;
  /** What the server actually checked — trimmed and lower-cased. */
  username: Scalars['String']['output'];
};

/**
 * Why a typed handle was refused. Codes rather than sentences: the client owns
 * the copy (rule 38), and this is answered on every keystroke.
 */
export type UsernameRejection =
  /** Not 3-30 lowercase letters, numbers and single hyphens. */
  | 'FORMAT'
  /** One of the words the platform keeps for itself (admin, support, …). */
  | 'RESERVED'
  /** Somebody else already has it. */
  | 'TAKEN';

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

/** Outcome of a venue owner cancelling a pod booked at their venue. */
export type VenueCancelPodResult = {
  __typename?: 'VenueCancelPodResult';
  /** Account Health points deducted from the venue for this cancellation. */
  health_penalty: Scalars['Int']['output'];
  /** The cancelled pod's id. */
  pod_id: Scalars['ID']['output'];
  /** Attendee payments refunded by this cancellation. */
  refunded_count: Scalars['Int']['output'];
  /** The venue's Account Health score after the deduction. */
  venue_health_score: Scalars['Int']['output'];
};

export type VenueCancellationChargeType =
  | 'AMOUNT'
  | 'PERCENT';

/** What a venue owner charges for a late cancellation, or whether they take one at all. */
export type VenueCancellationPolicy = {
  __typename?: 'VenueCancellationPolicy';
  /** Bookings may only be rescheduled, never cancelled. The bands do not apply while this is on. */
  reschedule_only: Scalars['Boolean']['output'];
  /** Ordered widest window first. */
  tiers: Array<VenueCancellationTier>;
};

export type VenueCancellationPolicyInput = {
  reschedule_only?: InputMaybe<Scalars['Boolean']['input']>;
  tiers?: InputMaybe<Array<VenueCancellationTierInput>>;
};

/** One band of a venue's cancellation policy — cancelling INSIDE hours_before of the slot start costs this much. */
export type VenueCancellationTier = {
  __typename?: 'VenueCancellationTier';
  charge_type: VenueCancellationChargeType;
  /** Hours before the slot start this band covers. The tightest matching band wins. */
  hours_before: Scalars['Int']['output'];
  /** A percent of the slot price (0-100), or a flat amount. */
  value: Scalars['Float']['output'];
};

export type VenueCancellationTierInput = {
  charge_type: VenueCancellationChargeType;
  hours_before: Scalars['Int']['input'];
  value: Scalars['Float']['input'];
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

/** One pod booked at a venue the caller owns (Partners → Venues → Pods). */
export type VenuePod = {
  __typename?: 'VenuePod';
  attendee_count: Scalars['Int']['output'];
  bucket: VenuePodBucket;
  /** Set when the pod was cancelled (soft-deleted). */
  cancelled_at?: Maybe<Scalars['String']['output']>;
  completed_at?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  host_names: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  is_active: Scalars['Boolean']['output'];
  no_of_spots: Scalars['Int']['output'];
  pod_amount: Scalars['Int']['output'];
  /** Attendee user ids — resolve names via publicUsersByIds. */
  pod_attendees: Array<Scalars['ID']['output']>;
  pod_date_time: Scalars['String']['output'];
  pod_end_date_time?: Maybe<Scalars['String']['output']>;
  pod_slug: Scalars['String']['output'];
  pod_title: Scalars['String']['output'];
  pod_type: PodType;
  venue_id: Scalars['ID']['output'];
  venue_name: Scalars['String']['output'];
};

/** Derived lifecycle bucket of a pod at a venue. */
export type VenuePodBucket =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ONGOING'
  | 'UPCOMING';

/** Roll-up figures for exactly the venuePods scope, over every pod in it. */
export type VenuePodSummary = {
  __typename?: 'VenuePodSummary';
  cancelled: Scalars['Int']['output'];
  completed: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  fill_rate: Scalars['Float']['output'];
  filled_spots: Scalars['Int']['output'];
  next_pod_date_time?: Maybe<Scalars['String']['output']>;
  ongoing: Scalars['Int']['output'];
  /** Venues the figures cover. */
  scope_count: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  total_attendees: Scalars['Int']['output'];
  total_revenue: Scalars['Float']['output'];
  total_spots: Scalars['Int']['output'];
  upcoming: Scalars['Int']['output'];
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
  cancellation: VenueCancellationPolicy;
  holidays: Array<Scalars['String']['output']>;
  operating_hours: VenueOperatingHours;
  rules: VenueRules;
  weekly_off_days: Array<Scalars['Int']['output']>;
};

export type VenueSettingsInput = {
  auto_extend?: InputMaybe<VenueAutoExtendInput>;
  cancellation?: InputMaybe<VenueCancellationPolicyInput>;
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
  /** True for a whole-day / whole-date-range booking — render 'Whole day' instead of clock times. */
  whole_day: Scalars['Boolean']['output'];
};

/**
 * How a new slot that overlaps an existing one in the SAME space is resolved.
 * Slots in different spaces never conflict — two courts may share a time window.
 */
export type VenueSlotConflictMode =
  /** Reject the whole request — nothing is created. The default. */
  | 'FAIL'
  /**
   * Delete the colliding slots and create the new ones in their place. A BOOKED
   * slot, or one holding a PENDING request, is never deleted: the new slots
   * that collide with one are dropped instead.
   */
  | 'REPLACE'
  /** Drop the colliding new slots and create the rest. */
  | 'SKIP';

/**
 * One booking request with the venue's money on it — powers the decision page
 * the request email links to. Readable before AND after the decision, so a
 * re-opened link shows the outcome instead of an error.
 */
export type VenueSlotDecision = {
  __typename?: 'VenueSlotDecision';
  decided_at?: Maybe<Scalars['String']['output']>;
  decision: VenueSlotDecisionKind;
  /** Set only when the owner declined and gave a reason. */
  decline_reason: Scalars['String']['output'];
  end_at: Scalars['String']['output'];
  host_email: Scalars['String']['output'];
  host_name: Scalars['String']['output'];
  host_phone: Scalars['String']['output'];
  pod_description: Scalars['String']['output'];
  pod_id: Scalars['ID']['output'];
  pod_title: Scalars['String']['output'];
  /** The slot's gross price, before Duncit's venue commission. */
  price: Scalars['Int']['output'];
  requested_at: Scalars['String']['output'];
  slot_id: Scalars['ID']['output'];
  /** The venue space this slot is for ('' = whole venue). */
  space_label: Scalars['String']['output'];
  start_at: Scalars['String']['output'];
  venue_commission_amount: Scalars['Float']['output'];
  /** Duncit's commission on the venue's side — the venue's only deduction. */
  venue_commission_pct: Scalars['Float']['output'];
  venue_id: Scalars['ID']['output'];
  venue_name: Scalars['String']['output'];
  /** What the venue takes home if the pod sells out; the slot price is a ceiling. */
  venue_receives: Scalars['Float']['output'];
  /** True for a whole-day / whole-date-range booking. */
  whole_day: Scalars['Boolean']['output'];
};

/** The owner's answer to a booking request. NONE = still waiting. */
export type VenueSlotDecisionKind =
  | 'APPROVED'
  | 'DECLINED'
  | 'NONE';

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
  /** True for a whole-day / whole-date-range booking. */
  whole_day: Scalars['Boolean']['output'];
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

export type VerifyPasswordResetCodeInput = {
  channel: PasswordResetChannel;
  email?: InputMaybe<Scalars['String']['input']>;
  otp: Scalars['String']['input'];
  phone_extension?: InputMaybe<Scalars['String']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
};

export type VerifyRazorpayInput = {
  payment_doc_id: Scalars['ID']['input'];
  razorpay_order_id: Scalars['String']['input'];
  razorpay_payment_id: Scalars['String']['input'];
  razorpay_signature: Scalars['String']['input'];
};

export type VideoCompressionJob = {
  __typename?: 'VideoCompressionJob';
  error?: Maybe<Scalars['String']['output']>;
  job_id: Scalars['String']['output'];
  pct: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type WaCampaign = {
  __typename?: 'WaCampaign';
  audience: WaCampaignAudience;
  audience_list_id?: Maybe<Scalars['ID']['output']>;
  /** What filled the CTA links, for a template whose button URL carries a {{n}}. */
  buttons: Array<AisensyButton>;
  campaign_id: Scalars['ID']['output'];
  /** MANUAL_NUMBERS only — the numbers this send was given. */
  contacts: Array<WaManualContact>;
  /** msg_rate × sent_count — what the messages that actually went out cost. */
  cost: Scalars['Float']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  failed_count: Scalars['Int']['output'];
  /** The header asset every message in this send carried. Null for a text template. */
  media?: Maybe<AisensyMedia>;
  /** The per-message rate frozen at send time. A later price change never moves it. */
  msg_rate: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  /** How many people the audience resolved to at send time. */
  recipient_count: Scalars['Int']['output'];
  /** When a scheduled send is due. Null for one that went out immediately. */
  scheduled_at?: Maybe<Scalars['String']['output']>;
  sent_at?: Maybe<Scalars['String']['output']>;
  sent_count: Scalars['Int']['output'];
  /** Matched the audience but had no usable number or an empty variable. */
  skipped_count: Scalars['Int']['output'];
  status: WaCampaignStatus;
  /** MARKETING, UTILITY, AUTHENTICATION or SERVICE — empty when AiSensy never said. */
  template_category: Scalars['String']['output'];
  /** The template behind the campaign, as AiSensy had it when this send was created. */
  template_name: Scalars['String']['output'];
  template_params: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
  /** SPECIFIC_USERS only — the accounts that were picked. */
  user_ids: Array<Scalars['ID']['output']>;
  /** The AiSensy campaign/template this send used. */
  wa_campaign_name: Scalars['String']['output'];
};

/** Who a WhatsApp campaign goes to. A newsletter subscriber has no phone number, so it is not an option here. */
export type WaCampaignAudience =
  | 'ALL_USERS'
  | 'AUDIENCE_LIST'
  /** Numbers typed in, which may belong to nobody with an account. */
  | 'MANUAL_NUMBERS'
  /** Accounts picked one by one — their saved WhatsApp number is used. */
  | 'SPECIFIC_USERS';

export type WaCampaignNameInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** An AiSensy campaign name marketing may pick. AiSensy cannot list these, so the list is maintained here. */
export type WaCampaignNameOption = {
  __typename?: 'WaCampaignNameOption';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** One person the send walked over — the answer to who it reached and who it did not. */
export type WaCampaignRecipient = {
  __typename?: 'WaCampaignRecipient';
  /** How many times the send has been attempted for this person (a retry updates the row). */
  attempts: Scalars['Int']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  destination: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Why they were skipped, or the reason AiSensy refused. Empty when sent. */
  reason: Scalars['String']['output'];
  status: WaRecipientStatus;
  /** AiSensy's own id for the queued message — the trace back to their side. */
  submitted_message_id: Scalars['String']['output'];
  /** The template variables as they were filled for this person. */
  template_params: Array<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type WaCampaignRecipientPage = {
  __typename?: 'WaCampaignRecipientPage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WaCampaignRecipient>;
  total: Scalars['Int']['output'];
};

export type WaCampaignStatus =
  /** Called off before it ran — never the same fact as one that ran and failed. */
  | 'CANCELLED'
  | 'FAILED'
  /** Waiting for its hour — still cancellable. */
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT';

export type WaCampaignTablePage = {
  __typename?: 'WaCampaignTablePage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WaCampaign>;
  total: Scalars['Int']['output'];
};

/** A variable a template parameter may carry, resolved per recipient. */
export type WaCampaignVariable = {
  __typename?: 'WaCampaignVariable';
  description: Scalars['String']['output'];
  /** Write it as {{name}} inside a template parameter. */
  name: Scalars['String']['output'];
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

/** What WhatsApp cost and reached over a window. Every figure uses the rate each send froze. */
export type WaDashboard = {
  __typename?: 'WaDashboard';
  by_category: Array<WaDashboardCategory>;
  campaigns: Scalars['Int']['output'];
  currency_symbol: Scalars['String']['output'];
  messages_failed: Scalars['Int']['output'];
  messages_sent: Scalars['Int']['output'];
  messages_skipped: Scalars['Int']['output'];
  top_campaigns: Array<WaDashboardCampaign>;
  total_cost: Scalars['Float']['output'];
};

/** A send worth looking at first — the ones that cost the most. */
export type WaDashboardCampaign = {
  __typename?: 'WaDashboardCampaign';
  campaign_id: Scalars['ID']['output'];
  cost: Scalars['Float']['output'];
  messages: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  sent_at?: Maybe<Scalars['String']['output']>;
  status: WaCampaignStatus;
  template_category: Scalars['String']['output'];
  wa_campaign_name: Scalars['String']['output'];
};

/** What one category cost over the window. */
export type WaDashboardCategory = {
  __typename?: 'WaDashboardCategory';
  campaigns: Scalars['Int']['output'];
  /** MARKETING, UTILITY, AUTHENTICATION, SERVICE — or empty for sends AiSensy never categorised. */
  category: Scalars['String']['output'];
  cost: Scalars['Float']['output'];
  failed: Scalars['Int']['output'];
  messages: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

/** The platform default header assets, alone — for the Settings tab. */
export type WaDefaultMedia = {
  __typename?: 'WaDefaultMedia';
  document_filename: Scalars['String']['output'];
  /** The default DOCUMENT, for a FILE header. Empty when no default is set. */
  document_url: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  /** The default IMAGE. Empty when no default is set. */
  url: Scalars['String']['output'];
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

export type WaLogPage = {
  __typename?: 'WaLogPage';
  page: Scalars['Int']['output'];
  page_size: Scalars['Int']['output'];
  rows: Array<WaLogRow>;
  total: Scalars['Int']['output'];
};

/**
 * One WhatsApp send, whichever way it started.
 *
 * A marketing send is one row per CAMPAIGN, because it is planned, billed and
 * retried as a unit. A message the platform sent by itself is one row per
 * MESSAGE, because there is nothing above it — its counters are simply 1 or 0.
 * The row's kind is what decides which detail view opens behind it.
 */
export type WaLogRow = {
  __typename?: 'WaLogRow';
  /** Meta's category, which is what the per-message rate was read from. */
  category: Scalars['String']['output'];
  /** The frozen rate times the messages that actually went out. */
  cost: Scalars['Float']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  failed_count: Scalars['Int']['output'];
  /** The campaign id for a campaign send; the message log id for an automatic one. */
  id: Scalars['ID']['output'];
  /** CAMPAIGN or AUTOMATIC. */
  kind: Scalars['String']['output'];
  msg_rate: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  /** The campaign's error, or why one message was skipped or failed. */
  reason: Scalars['String']['output'];
  recipient_count: Scalars['Int']['output'];
  /** The AiSensy campaign name for a campaign send; the scenario key for an automatic one. */
  reference: Scalars['String']['output'];
  sent_count: Scalars['Int']['output'];
  skipped_count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  /** The audience for a campaign send; the number reached for an automatic one. */
  target: Scalars['String']['output'];
};

/** One typed-in recipient. The country code is its own field so it is never guessed. */
export type WaManualContact = {
  __typename?: 'WaManualContact';
  extension: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
};

export type WaManualContactInput = {
  extension: Scalars['String']['input'];
  name: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

/**
 * Which platform default an asset is. One per header kind an operator can set:
 * a single picture cannot stand in for a document header. There is no VIDEO —
 * no template here carries a video header, and one would need an asset on its
 * own scenario.
 */
export type WaMediaKind =
  | 'DOCUMENT'
  | 'IMAGE';

export type WaMember = {
  __typename?: 'WaMember';
  is_business: Scalars['Boolean']['output'];
  jid: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phone: Scalars['String']['output'];
};

export type WaMessageLogRow = {
  __typename?: 'WaMessageLogRow';
  audience: Scalars['String']['output'];
  campaign: Scalars['String']['output'];
  category: Scalars['String']['output'];
  created_at?: Maybe<Scalars['String']['output']>;
  destination: Scalars['String']['output'];
  duration_ms: Scalars['Int']['output'];
  entity_id: Scalars['String']['output'];
  event_key: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  media_filename: Scalars['String']['output'];
  /**
   * The header asset this message carried, as it went out. Blank on a text
   * template — and blank on the send that came back "Media URL Missing", which
   * is the failure it is here to make visible.
   */
  media_url: Scalars['String']['output'];
  msg_rate: Scalars['Float']['output'];
  params: Array<Scalars['String']['output']>;
  /** Why it was skipped, or how it failed. */
  reason: Scalars['String']['output'];
  recipient_user_id?: Maybe<Scalars['ID']['output']>;
  /** SENDING, SENT, SKIPPED or FAILED. */
  status: Scalars['String']['output'];
  submitted_message_id: Scalars['String']['output'];
  template_category: Scalars['String']['output'];
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

export type WaPreference = {
  __typename?: 'WaPreference';
  categories: Array<WaPreferenceCategory>;
  destination: Scalars['String']['output'];
  /** False when there is no sendable number — the screen shows an 'add a number' state. */
  reachable: Scalars['Boolean']['output'];
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** One switch on a person's own WhatsApp settings screen. */
export type WaPreferenceCategory = {
  __typename?: 'WaPreferenceCategory';
  category: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  required: Scalars['Boolean']['output'];
};

/** What a WhatsApp message costs, by the category Meta bills on. */
export type WaPricing = {
  __typename?: 'WaPricing';
  authentication_per_msg: Scalars['Float']['output'];
  currency_symbol: Scalars['String']['output'];
  marketing_per_msg: Scalars['Float']['output'];
  /** Service conversations are free today — a rate is kept so that can change without a deploy. */
  service_per_msg: Scalars['Float']['output'];
  utility_per_msg: Scalars['Float']['output'];
};

export type WaQr = {
  __typename?: 'WaQr';
  qr_code?: Maybe<Scalars['String']['output']>;
  status: WaStatus;
};

/** What happened to one person in a send. SKIPPED means nothing was attempted for them. */
export type WaRecipientStatus =
  | 'FAILED'
  | 'SENT'
  | 'SKIPPED';

/** One automatic WhatsApp message, and whether AiSensy can actually deliver it. */
export type WaScenario = {
  __typename?: 'WaScenario';
  audience: Scalars['String']['output'];
  /** Why this cannot send right now. Empty when it can. */
  blocker: Scalars['String']['output'];
  campaign: Scalars['String']['output'];
  campaign_status: Scalars['String']['output'];
  /** False for a ticket, a refund or an account change — those cannot be switched off. */
  can_disable: Scalars['Boolean']['output'];
  /** Our consent category — billing, reminder, feedback… not Meta's. */
  category: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  /** Stable id. Stored on every log row, so renaming a campaign never orphans history. */
  event_key: Scalars['String']['output'];
  /** What makes it fire, in a sentence. */
  fires: Scalars['String']['output'];
  /** The header asset the CAMPAIGN carries. Non-empty means every send must supply one. */
  media_url: Scalars['String']['output'];
  /** Whether the template's header is an image, video or document every send must carry. */
  needs_media: Scalars['Boolean']['output'];
  override_media_filename: Scalars['String']['output'];
  /** The admin's own header asset. It wins over the campaign's; reconcile never touches it. */
  override_media_url: Scalars['String']['output'];
  /** One label per placeholder, in order. */
  params: Array<Scalars['String']['output']>;
  /** Meta's category, which decides the per-message rate. */
  template_category: Scalars['String']['output'];
  /** The live template's header kind — TEXT, IMAGE, VIDEO, FILE, or empty for none. */
  template_header_format: Scalars['String']['output'];
  template_name: Scalars['String']['output'];
  /** How many values the live template expects. */
  template_params: Scalars['Int']['output'];
  template_status: Scalars['String']['output'];
};

export type WaScenarioBoard = {
  __typename?: 'WaScenarioBoard';
  catalogue_error: Scalars['String']['output'];
  /** False when AiSensy could not be read; the rows still render without live state. */
  catalogue_ok: Scalars['Boolean']['output'];
  default_document_filename: Scalars['String']['output'];
  /**
   * The platform default header DOCUMENT, for the FILE-header templates one
   * picture cannot stand in for — the payment and booking messages.
   */
  default_document_url: Scalars['String']['output'];
  default_media_filename: Scalars['String']['output'];
  /**
   * The platform default header asset: what every media-header scenario sends
   * when neither the row nor its campaign carries one. Empty means unset — and
   * with no campaign at AiSensy carrying an asset, unset means every one of
   * those scenarios fails with "Media URL Missing".
   */
  default_media_url: Scalars['String']['output'];
  /** The kill switch. Off by default — nothing sends until somebody turns it on. */
  global_enabled: Scalars['Boolean']['output'];
  rows: Array<WaScenario>;
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

export type WaTestSendResult = {
  __typename?: 'WaTestSendResult';
  message: Scalars['String']['output'];
  ok: Scalars['Boolean']['output'];
  /** AiSensy's own id for the queued message. */
  submitted_message_id: Scalars['String']['output'];
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

/** An account the 'send to these people' picker offers — one that carries a usable number. */
export type WaUserOption = {
  __typename?: 'WaUserOption';
  /** Country code + number, digits only, exactly as AiSensy would be given it. */
  destination: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Wallet = {
  __typename?: 'Wallet';
  balance: Scalars['Float']['output'];
  /** balance >= min_withdrawal_amount, decided server-side — clients must not re-derive it. */
  can_withdraw: Scalars['Boolean']['output'];
  currency_symbol: Scalars['String']['output'];
  /** Role-wise minimum withdrawal amount that applies to this wallet. */
  min_withdrawal_amount: Scalars['Float']['output'];
  next_payout_at: Scalars['String']['output'];
  payout_mode: PayoutMode;
  /** Which of the four capacities this wallet withdraws in (precedence: VENUE_OWNER, CLUB_ADMIN, ECOMM_MANAGER, HOST). */
  withdrawer_role: WithdrawerRole;
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
  /** Empty on a rejected request — the money went back, so the pods are free again. */
  allocations: Array<WithdrawalAllocation>;
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
  withdrawer_role: WithdrawerRole;
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

/**
 * Which pod's earnings funded a slice of a withdrawal.
 *
 * Decided once, when the withdrawal is requested, by drawing the withdrawer's
 * un-withdrawn pod credits oldest first. It is an accounting attribution, not a
 * physical fact — a wallet holds one fungible balance — so Finance reads it as
 * "where this money came from", never as a separate payable.
 */
export type WithdrawalAllocation = {
  __typename?: 'WithdrawalAllocation';
  amount: Scalars['Float']['output'];
  kind: PaymentReleaseKind;
  pod_id: Scalars['ID']['output'];
  /** Frozen at request time, so a soft-deleted pod still renders a title. */
  pod_title: Scalars['String']['output'];
  release_id: Scalars['String']['output'];
  /** The capacity THIS pod's money was earned in, derived from the payout leg. */
  role: WithdrawerRole;
};

export type WithdrawalMethod =
  | 'IMPS'
  | 'NEFT'
  | 'UPI';

/** Role-wise minimum withdrawal amounts (Finance → Withdrawals → Withdrawal Settings). */
export type WithdrawalMinimums = {
  __typename?: 'WithdrawalMinimums';
  club_admin: Scalars['Float']['output'];
  ecomm_manager: Scalars['Float']['output'];
  host: Scalars['Float']['output'];
  venue_owner: Scalars['Float']['output'];
};

export type WithdrawalStatus =
  | 'PAID'
  | 'PENDING'
  | 'REJECTED';

/**
 * The capacity a payout was withdrawn in. Stamped on the withdrawal when it is
 * requested and never resolved live, so it cannot change with the user's roles.
 */
export type WithdrawerRole =
  | 'CLUB_ADMIN'
  | 'ECOMM_MANAGER'
  | 'HOST'
  | 'VENUE_OWNER';
