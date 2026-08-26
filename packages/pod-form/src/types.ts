import type { SlotFormatter, SlotLabels } from '@duncit/slots';

export type PodMode = 'PHYSICAL' | 'VIRTUAL';

export interface PodPlaceCharge {
  label: string;
  amount: number;
  note: string;
}

export interface PodProductRequest {
  product_id: string;
  quantity: number;
}

/**
 * The unified SUPERSET of every field the Admin and Partner pod editors edit.
 * Dates are `Date | null` (MUI X pickers); perks/offers are string arrays;
 * media is newline-separated text.
 */
export interface PodFormValues {
  pod_id?: string;
  pod_title: string;
  club_id: string;
  /**
   * Auto Pod mode only: the category chosen INSTEAD of a club (a pod inherits
   * its category from its club, and an Auto Pod has no club until one claims
   * it). Empty and ignored for an ordinary pod.
   */
  super_category_id: string;
  sub_category_id: string;
  pod_mode: PodMode;
  venue_id: string;
  venue_slot_id: string;
  location_id: string;
  zone_name: string;
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_hosts_id: string[];
  pod_description: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  pod_amount: number;
  pod_occurrence: string;
  no_of_spots: number;
  pod_info: string;
  pod_hashtag_text: string;
  media_text: string;
  /** Explore reel video URL — set = reel enabled while the pod is live. */
  reel_url: string;
  payment_terms: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  place_charges: PodPlaceCharge[];
  products_enabled: boolean;
  product_requests: PodProductRequest[];
  is_active: boolean;
}

/**
 * Feature flags that gate BOTH which sections render and which schema branches
 * validate. Admin turns (nearly) everything on; the partner/host flows turn the
 * admin-only sections off and turn the venue-slot picker on.
 */
export interface PodFormConfig {
  /** Host picker + `pod_hosts_id` min-1 rule. */
  showHosts: boolean;
  /** Reserved location/zone editing (no editor exists in either source form yet). */
  showLocationZone: boolean;
  /** Venue availability-slot picker (drives date/time) + slot-required rule. */
  showVenueSlot: boolean;
  /** Optional per-venue place charges editor. */
  showPlaceCharges: boolean;
  /** Feed selected-product cost into the finance price breakdown. */
  showInventory: boolean;
  /** Live platform-fee / GST / payout breakdown for paid pods. */
  showFinance: boolean;
  /** Active/inactive toggle (only shown while editing an existing pod). */
  showIsActive: boolean;
  /** Approved-products section + product validation rules. */
  showProducts: boolean;
  /** Explore reel video field (`reel_url`). Off when omitted. */
  showReel?: boolean;
  /**
   * Min-1 host rule when hosts are shown. Defaults to true (admin). Club-admin
   * turns it off — the server injects the acting admin when none is supplied.
   */
  requireHosts?: boolean;
  /**
   * Exactly one host: the picker becomes a single-select and more than one id
   * is a validation error. Admin turns it on (finance settles against
   * `pod_hosts_id[0]`, so a second host is never paid). Off when omitted —
   * Club Admin keeps assigning several.
   */
  singleHost?: boolean;
  /**
   * Auto Pod mode: the author writes the pod ONLY. No club, venue, host, date
   * or mode — a venue, a host and a club admin each enrol later, in any order.
   * A required category field replaces the club picker, the When/Where and
   * Products sections are dropped, the pod type is fixed to PAID (an Auto Pod
   * is physical and never free) and "Save as Draft" is gone. Off when omitted.
   */
  autoPod?: boolean;
  /**
   * Auto Pod mode only: the category is fixed (a Club Admin opening one for
   * their club, or a template a host or club has already enrolled on) and is
   * shown read-only.
   */
  lockCategory?: boolean;
}

/** A host option in the assign-host pickers. */
export interface PodHostOption {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
}

/** Server-backed host search injected by the portal (e.g. clubAdminHostSearch). */
export type SearchPodHosts = (term: string) => Promise<PodHostOption[]>;

/** Public finance settings feeding the live price breakdown. */
export interface PodFormFinance {
  platform_fee_pct: number;
  gst_pct: number;
  currency_symbol?: string;
}

export interface PodOption {
  value: string;
  label: string;
}

/** Input for the optional server-backed meeting-link generator. */
export interface GenerateMeetingLinkInput {
  platform: string;
  title: string;
  startISO: string;
  endISO?: string;
}

/**
 * Non-form-value data + injected behaviours the form needs. Passed once to
 * `<PodForm>` and shared with sections via context so props stay shallow.
 */
export interface PodFormData {
  config: PodFormConfig;
  clubs: any[];
  venues: any[];
  users: any[];
  products: any[];
  finance?: PodFormFinance;
  /** Portal-specific accessor for the venue ids linked to a club. */
  getClubVenueIds: (club: any) => string[];
  /** When provided, the meeting platform renders as a select of these options. */
  meetingPlatforms?: PodOption[];
  /** When provided, shows an auto-generate button next to the meeting link. */
  onGenerateMeetingLink?: (input: GenerateMeetingLinkInput) => Promise<string>;
  /** When provided, the media field uses a rich picker instead of a textarea. */
  onPickImage?: () => Promise<string | null>;
  /** When provided, the reel field uses a video picker instead of a URL input. */
  onPickVideo?: () => Promise<string | null>;
  /** When provided (and hosts are shown), hosts use a server-search picker. */
  searchHosts?: SearchPodHosts;
  /**
   * The admin-configured formatter, from `useDateFormat()`. Required: the slot
   * calendar buckets days and renders times through it, so a missing formatter
   * would silently fall back to device-local behaviour (rule 11).
   */
  dateFormatter: SlotFormatter & { formatPattern: (input: Date, pattern: string) => string };
  /**
   * Slot-picker copy. Required and never defaulted, so no English literal ships
   * inside the shared form (rule 38). Portals pass `shell.slots.*`.
   */
  slotLabels: Readonly<SlotLabels>;
  /**
   * The DOCUMENT id of the pod being edited (not `pod_id`, which is the
   * human-readable code). Set only on an edit, and only so the spots control
   * can ask the server for the range a live pod may be resized within — its
   * booked slot is no longer in any list this form reads.
   */
  editingPodDocId?: string;
}

export const POD_TYPES: PodOption[] = [
  { value: 'NATIVE_FREE', label: 'Native · Free' },
  { value: 'NATIVE_PAID', label: 'Native · Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native · Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native · Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native · Paid' },
];

export const OCCURRENCES: PodOption[] = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALTERNATE_DAY', label: 'Alternate day' },
  { value: 'WEEKENDS_ONLY', label: 'Weekends only' },
];

export const POD_MODES: PodOption[] = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

/** The AutoPod's own pod_type — physical, and never free. */
export const AUTO_POD_TYPE = 'PAID';

export const blankPodFormValues: PodFormValues = {
  pod_id: '',
  pod_title: '',
  club_id: '',
  super_category_id: '',
  sub_category_id: '',
  pod_mode: 'PHYSICAL',
  venue_id: '',
  venue_slot_id: '',
  location_id: '',
  zone_name: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hosts_id: [],
  pod_description: '',
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 0,
  pod_info: '',
  pod_hashtag_text: '',
  media_text: '',
  reel_url: '',
  payment_terms: '',
  what_this_pod_offers: [],
  available_perks: [],
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  is_active: true,
};

/**
 * Where an Auto Pod template starts: PAID (the only type it can be), one
 * ticket-price floor above free, and the two spots a physical pod needs before
 * anyone but the host is billed.
 */
export const blankAutoPodFormValues: PodFormValues = {
  ...blankPodFormValues,
  pod_type: AUTO_POD_TYPE,
  pod_amount: 1,
  no_of_spots: 2,
};
