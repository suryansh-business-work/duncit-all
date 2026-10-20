/** Shared option lists + form value shape for the host Create Pod stepper. */
import type { UseFormReturn } from 'react-hook-form';
import type { PodPickerProduct, PodSeriesFrequency, TicketDiscountTier } from '@duncit/utils';
import type { Translate } from '../../../i18n/fallback';
export type {
  CreatePodClub,
  CreatePodLocation,
  CreatePodLocationZone,
  CreatePodVenue,
  CreatePodSlot,
  CreatePodHostCategory,
  PodModerationViolation,
  PodModerationResult,
  CreatePodSubCategory,
} from './create-pod.entities';

export const podTypes = (t: Translate) => [
  { value: 'FREE', label: t('mweb.createPod.free') },
  { value: 'PAID', label: t('mweb.common.paid') },
] as const;

/** The only pod types — FREE and PAID. */
export const POD_TYPE_VALUES = new Set<string>(['FREE', 'PAID']);

export const isFreePodType = (podType?: string | null) => podType === 'FREE';

export interface PodProductRequest {
  product_id: string;
  quantity: number;
}

export interface PodPlaceCharge {
  label: string;
  amount: number;
  note: string;
}

export interface CreatePodFormValues {
  /** Pod location — defaults to the host's selected location; filters clubs + venues. */
  location_id: string;
  /** Optional locality within the city — narrows clubs to that zone. */
  locality: string;
  /** Which of the host's onboarded categories this pod is for: `${super}|${sub}`. */
  host_category_key: string;
  pod_title: string;
  club_id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  venue_id: string;
  /** The venue partner's availability slot the pod books (physical pods). */
  venue_slot_id: string;
  /** Selected venue space/type (a capacity item label) — drives No. of spots. */
  venue_space_label: string;
  /** Instant booking (no slot id): PER_PAX guests (0 = not per guest) and
   * whether pets come (pet fee). The window is pod_date_time..pod_end_date_time. */
  venue_booking_pax: number;
  venue_booking_pets: boolean;
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_description: string;
  pod_info: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  /** Blank (null) until the host types a price — ₹0 is only valid for a FREE pod. */
  pod_amount: number | null;
  no_of_spots: number;
  pod_hashtag_text: string;
  media_text: string;
  /** Optional hosted reel video URL — shows in Explore while the pod is live. */
  reel_url: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  products_enabled: boolean;
  product_requests: PodProductRequest[];
  place_charges: PodPlaceCharge[];
  ticket_discount_enabled: boolean;
  ticket_discount_tiers: TicketDiscountTier[];
  payment_terms: string;
  /** Client-side publish gate — host must accept the Organizer Terms (last step). */
  agreed_to_terms: boolean;
  /** Hidden: the Pod Request this pod answers ('' when none) — the server books its confirmed slot. */
  partner_request_id: string;
  /** Recurring pod: off = one time. On, the first date repeats at
   * `repeat_frequency` until `repeat_ends_on` (yyyy-MM-dd, admin zone). */
  repeat_enabled: boolean;
  repeat_frequency: PodSeriesFrequency;
  repeat_ends_on: string;
  /** Dates (ISO starts) the host left out on the calendar. */
  repeat_skip_dates: string[];
  /** CUSTOM only: the days (yyyy-MM-dd, admin zone) the host tapped on the calendar. */
  repeat_custom_days: string[];
  /** Multi-date booking discount, in the shared tier editor's shape (a
   * tier's `min_tickets` is its number of dates). Prefilled from Pod Settings. */
  repeat_discount_enabled: boolean;
  repeat_discount_tiers: TicketDiscountTier[];
}

export const blankCreatePodForm: CreatePodFormValues = {
  location_id: '',
  locality: '',
  host_category_key: '',
  pod_title: '',
  club_id: '',
  pod_mode: 'PHYSICAL',
  venue_id: '',
  venue_slot_id: '',
  venue_space_label: '',
  venue_booking_pax: 0,
  venue_booking_pets: false,
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_description: '',
  pod_info: '',
  pod_date_time: null,
  pod_end_date_time: null,
  // PAID by default — a host chooses Free on Step 4, for either mode.
  pod_type: 'PAID',
  pod_amount: null,
  no_of_spots: 0,
  pod_hashtag_text: '',
  media_text: '',
  reel_url: '',
  what_this_pod_offers: [],
  available_perks: [],
  products_enabled: false,
  product_requests: [],
  place_charges: [],
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
  payment_terms: '',
  agreed_to_terms: false,
  partner_request_id: '',
  repeat_enabled: false,
  repeat_frequency: 'WEEKLY',
  repeat_ends_on: '',
  repeat_skip_dates: [],
  repeat_custom_days: [],
  repeat_discount_enabled: false,
  repeat_discount_tiers: [],
};

/** The catalogue row Step 4's product picker renders. Aliased to the shared
 * shape so the fields the query selects (image, brand, description, stock) and
 * the fields the picker reads cannot drift apart — and so native's twin is the
 * same type, not a second hand-kept copy (rules 27 + 40). */
export type CreatePodProduct = PodPickerProduct;

export type CreatePodForm = UseFormReturn<CreatePodFormValues>;
