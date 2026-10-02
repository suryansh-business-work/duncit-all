/** The mock shapes the `utils` demos run on — each one the real API answer. */
import type {
  SignupGoogleDetails,
  TicketDiscountTier,
  AutoPodRow,
  HostChartRange,
  MonthlyEarning,
  ParticipantPod,
  StatusCounts,
  StatusPalette,
  BadgeCondition,
  ContactChannel,
  SignupContactStatus,
  PasswordRecoveryChannel,
  SignupStep,
  PasswordRecoveryStep,
  PodAttendanceLock,
  PodAttendanceMode,
  PodAttendanceViewer,
  PodFeedbackReminderChoice,
  PodFeedbackScores,
  PodParticipationFields,
  PodPhaseFields,
  UsernameRejection,
  VenueCancelPodResult,
  VenueOwnerStats,
  VenuePodRow,
  ClubAdminKpis,
  ClubAdminRange,
  PodAuditAction,
  PodAuditRisk,
  PodAuditSource,
  PodStatusFields,
  ClubCityLocation,
  LaunchPageMedia,
  OfficialStatusSource,
  ParcelDims,
  BrandWizardFacts,
} from '@duncit/utils';

export interface StudioModeMock {
  roles: string[];
  saved_mode: 'USER' | 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB';
  is_product_visible: boolean;
}

/** The venues a partner owns, as `myVenues` answers them — newest first. */
export interface VenueSwitcherMock {
  venues: { id: string; venue_name: string; city: string; status: string }[];
  selected_venue_id: string | null;
}

/** One pending pod as the rating prompt receives it, plus the guest's answers. */
export interface PodFeedbackMock {
  title: string;
  /** `feedback_aspects` from the server — a virtual pod has no VENUE or FOOD. */
  serverAspects: string[];
  scores: PodFeedbackScores;
  message: string;
  closedWith: PodFeedbackReminderChoice;
}

/** One badge's standing for one member, exactly as `myBadgeProgress` reports it. */
export interface BadgeMock {
  rows: Array<{
    title: string;
    condition_type: BadgeCondition;
    current: number;
    target: number;
    achieved: boolean;
  }>;
}

/** A real booking row as the API hands it to every surface. */
export interface BookingMock {
  pod_datetime: string;
  fields: PodParticipationFields;
}

/** What the @handle field holds, plus the server's last answer about it. */
export interface ContactChangeMock {
  email: string;
  phone_extension: string;
  phone_number: string;
  whatsapp_extension: string;
  whatsapp_number: string;
  channel: ContactChannel;
  draftExtension: string;
  draftNumber: string;
  /** The as-you-type answer for the draft number. */
  numberStatus: SignupContactStatus;
  /** The `phone_otp_verification` feature flag (PHONE_OTP_FLAG). */
  phoneOtp: boolean;
  /** Whether the box was changed since the dialog opened on the account's value. */
  edited: boolean;
}

export interface SignupStepMock {
  step: SignupStep;
}

export interface SignupFlowMock {
  /** Which door is being walked: the email form, or Google. */
  door: 'EMAIL' | 'GOOGLE';
  /** The number row both signup forms spell the same way, plus the date of
   * birth the Google door's step asks beside it. */
  values: SignupGoogleDetails;
}

export interface PasswordRecoveryMock {
  channel: PasswordRecoveryChannel;
  step: PasswordRecoveryStep;
  extension: string;
  number: string;
  email: string;
  /** Seconds since the last code went out. */
  sentSecondsAgo: number;
  resendAfterSeconds: number;
}

export interface HandleMock {
  current: string;
  typed: string;
  available: boolean | null;
  reason: UsernameRejection | null;
}

/** The head of a `podAttendanceBoard` answer — the fields every attendance rule reads. */
export interface AttendanceBoardMock {
  pod_id: string;
  viewer: PodAttendanceViewer;
  can_mark: boolean;
  otp_required: boolean;
  pod_mode: PodAttendanceMode;
  /** Why the roster is read-only, or OPEN. EXPIRED is the host's completion
   * window running out — it shuts their side and leaves the admin's open. */
  lock: PodAttendanceLock;
  /** When that window closes (ISO), or null when the pod has no usable start. */
  complete_deadline: string | null;
  /** Seats on one booking still without a name against them. */
  companions_required: number;
  /** What the Club Admin typed into the by-name mark. Try `rohan`. */
  search: string;
}

/** A slice of the Home feed, plus the instant the rails are drawn at. */
export interface PhaseMock {
  now: string;
  pods: Array<PodPhaseFields & { pod_id: string }>;
}

/** The host's own pods, as `myHostPods` hands them over. */
export interface HostSectionsMock {
  pods: Array<{ pod_id: string; pod_title: string; venue_approval_status: string }>;
}

/** A pod's money, as the host sizing it sees it. */
/** One employee expense claim, as both consoles read it back. */
export interface ContactInviteMock {
  phone_book: { name: string; phones: string[] }[];
  already_invited: string[];
  ticked: string[];
  sent: number;
  failed: number;
}

export interface ClaimMock {
  category: string;
  status: string;
  amount: number;
  merchant: string;
}

export interface GoogleInviteMock {
  /** What Google hands back. Truncated here; the real one is a long JWT. */
  idToken: string;
  /** The address Google verified, echoed by the server on the refusal. */
  email: string;
  /** How many times the person pressed — the button, then the invite. */
  taps: number;
  /** Somebody else signing in afterwards. Blank for nobody. */
  secondCredential: string;
}

export interface SpotsMock {
  total_spots: number;
  price_per_spot: number;
}

/** One Auto Pod offer as a queue query returns it, plus the city the viewing host has selected. */
export interface AutoPodAnyOrderMock {
  row: AutoPodRow;
  /** The Location id picked at the top of the host's page; '' when none. */
  selected_location_id: string;
}

/** Notification rows exactly as `myNotifications` hands them over. */
export interface FollowRowsMock {
  rows: Array<{
    label: string;
    actionType: string | null;
    requestId: string | null;
    status: string | null;
    actorId: string | null;
    followBackStatus: string;
  }>;
}

/** A host’s Create-Pod drafts as `myPodDrafts` returns them, with the server’s
 * own deletion date on each, plus the instant to judge them against. */
export interface DraftsMock {
  now: string;
  drafts: Array<{ id: string; pod_title: string; expires_at: string | null }>;
}

/** Profiles as `publicUserProfile` describes them to the viewer: their own
 * follow state towards the person, and whether that person follows them. */
export interface FollowButtonMock {
  profiles: Array<{
    label: string;
    status: 'NONE' | 'REQUESTED' | 'FOLLOWING';
    followsViewer: boolean;
  }>;
}

/** One product order, as every surface holds it while deciding what to show. */
export interface OrderMock {
  fulfilment_method: string;
  fulfilment_status: string;
  /** ShipRocket's airway bill; empty until a courier is assigned. */
  awb: string;
}

export interface HostInsightsMock {
  range: HostChartRange;
  podDates: string[];
  pods: ParticipantPod[];
  statusCounts: StatusCounts;
  earnings: MonthlyEarning[];
  palette: StatusPalette;
}

/** Pods at a partner's venue as `venuePods` lists them, plus the admin-configured cancel penalty. */
export interface VenuePodsMock {
  pods: Array<VenuePodRow & { pod_id: string; pod_title: string }>;
  /** `publicAppSettings.venue_cancel_health_penalty`; null before the query answers. */
  cancel_penalty: number | null;
  /** What `venueCancelPod` answered with once the upcoming pod was cancelled. */
  cancel_result: VenueCancelPodResult;
}


/** One owner's figures across their venues, as `venueOwnerStats` answers them. */
export interface VenueDashboardMock {
  stats: VenueOwnerStats;
}

/** A Koramangala running club's admin: the dashboard figures, one pod row and one audit entry. */
export interface ClubAdminMock {
  kpis: ClubAdminKpis;
  range: ClubAdminRange;
  /** The clock the range is measured from, so the boundary is reproducible. */
  now: string;
  /** One row of `clubAdminPodsTable`, as the status chip reads it. */
  pod: PodStatusFields & { pod_title: string };
  /** One entry of `clubAdminPodAuditLogs`. */
  audit: { action: PodAuditAction; source: PodAuditSource; ai_risk: PodAuditRisk };
  /** Venues the club is explicitly attached to. Empty = never attached, which
   * restricts nothing — clear it and every public venue comes back. */
  meetup_venues_id: string[];
  /** `publicVenues` — server-filtered to APPROVED + active, so no `status`. */
  publicVenues: { id: string; venue_name: string; is_active: boolean }[];
  /** `myVenues` — what this person OWNS, unapproved rows included. */
  myVenues: { id: string; venue_name: string; status: string; is_active: boolean }[];
}


export interface SeatsSoldMock {
  pod_attendees: string[];
  pod_hosts_id: string[];
  seats_taken: number;
  price_per_seat: number;
}

/** A pod's multi-ticket offer plus the seats one checkout is booking. */
export interface TicketDiscountMock {
  pod_id: string;
  pod_amount: number;
  no_of_spots: number;
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
  seats: number;
  is_free: boolean;
}

export interface ClubGroupingMock {
  locations: ClubCityLocation[];
  clubs: { club_name: string; location_id: string; locality: string }[];
  openCityId: string;
  /** The opened city's zones, in the admin's order — the Create a Pod Locality dropdown. */
  zones: string[];
}

/** One packed unit as the product form holds it. */
export type ParcelMock = ParcelDims;

/** A brand part-way through the Partners console wizard. */
export type BrandWizardMock = BrandWizardFacts;

/** One city from the `locations` query, with its launch waitlist fields. */
export interface CityLaunchMock {
  location_name: string;
  is_launched: boolean | null;
  subscriber_count: number;
  launch_target: number;
  /** As locationLaunchStatus answers it: the city's own file where set, else the global one. */
  launch_media: LaunchPageMedia;
}

/** Marketing > Status, as the apps' `officialStatuses` query answers it. */
export interface OfficialStatusMock {
  /** The clock the rail reads — move it past an expiry to watch a tile drop out. */
  now: string;
  statuses: OfficialStatusSource[];
}

/** Admin → Branding → Theme tokens, as the `branding` query answers it. */
export interface ThemeTokensMock {
  theme_token_source: 'LOCAL' | 'SERVER';
  theme_tokens_light: { primary: string; primaryHover: string; accent: string };
  theme_tokens_dark: { primary: string; accent: string };
}
