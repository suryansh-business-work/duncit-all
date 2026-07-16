/** Option lists + form value shape for the host Create Pod stepper. */
import type { UseFormReturn } from 'react-hook-form';

export const POD_TYPES = [
  { value: 'NATIVE_FREE', label: 'Native - Free' },
  { value: 'NATIVE_PAID', label: 'Native - Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native - Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native - Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native - Paid' },
] as const;

export interface PodProductRequest {
  product_id: string;
  quantity: number;
}

export interface PodPlaceCharge {
  label: string;
  amount: number;
  note: string;
}

/** RN inputs are strings; numbers/dates are parsed by the schema + mapper. */
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
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_description: string;
  pod_info: string;
  /** Local date-time in `YYYY-MM-DD HH:mm`. */
  pod_date_time_text: string;
  pod_end_date_time_text: string;
  pod_type: string;
  pod_amount_text: string;
  no_of_spots_text: string;
  pod_hashtag_text: string;
  media_text: string;
  /** Optional reel video URL — plays in the Explore feed while the pod is live. */
  reel_url: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  products_enabled: boolean;
  product_requests: PodProductRequest[];
  place_charges: PodPlaceCharge[];
  payment_terms: string;
  /** Client-side publish gate — host must accept the Organizer Terms (last step). */
  agreed_to_terms: boolean;
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
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_description: '',
  pod_info: '',
  pod_date_time_text: '',
  pod_end_date_time_text: '',
  pod_type: 'NATIVE_FREE',
  pod_amount_text: '0',
  no_of_spots_text: '0',
  pod_hashtag_text: '',
  media_text: '',
  reel_url: '',
  what_this_pod_offers: [],
  available_perks: [],
  products_enabled: false,
  product_requests: [],
  place_charges: [],
  payment_terms: '',
  agreed_to_terms: false,
};

export interface CreatePodClub {
  id: string;
  club_name: string;
  location_id?: string | null;
  /** Club's locality (a Location zone_name) — used by the locality filter. */
  locality?: string | null;
  super_category_id?: string | null;
  /** Club's Sub-level category (matched against the host's sub_category_id). */
  category_id?: string | null;
  /** How many APPROVED+active venues auto-match this club (location + category). */
  matched_venues_count?: number | null;
  /** Ids of the venues that match this club — the venue picker is scoped to these. */
  matched_venues?: { id: string }[] | null;
  club_description?: string | null;
  club_feature_images_and_videos?: { url: string; type?: string | null }[] | null;
}

/** A city's locality/zone with its live active-club count. */
export interface CreatePodLocationZone {
  zone_name: string;
  pincode?: string | null;
  active_club_count?: number | null;
}

export interface CreatePodLocation {
  id: string;
  location_name: string;
  city?: string | null;
  state?: string | null;
  location_zones?: CreatePodLocationZone[] | null;
}

/** One flagged issue returned by the AI + rules moderation preflight. */
export interface PodModerationViolation {
  field: string;
  step: string;
  type: string;
  message: string;
  evidence?: string | null;
}

export interface PodModerationResult {
  allowed: boolean;
  violations: PodModerationViolation[];
}

/** A venue partner whose published slots the host can book. */
export interface CreatePodVenue {
  id: string;
  owner_user_id?: string | null;
  venue_name: string;
  venue_type?: string | null;
  capacity?: number | null;
  capacity_items?: { label: string; capacity: number }[] | null;
  location_id?: string | null;
  city?: string | null;
  locality?: string | null;
  address_line1?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
}

/** One bookable availability slot from the venue partner's calendar. */
export interface CreatePodSlot {
  id: string;
  start_at: string;
  end_at: string;
  price: number;
  /** The venue space/capacity-item this slot is for ('' = whole venue). */
  space_label: string;
  /** Guests this slot's space can hold — drives the pod's No. of spots. */
  capacity: number;
  status: string;
}

/** One of the host's onboarded categories — the host picks which one the pod is for. */
export interface CreatePodHostCategory {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}

/** Finance settings that feed the pricing panel (public query). */
export interface CreatePodFinance {
  platform_fee_pct: number;
  gst_pct: number;
  currency_symbol: string;
}

export interface CreatePodProduct {
  id: string;
  product_name: string;
  unit_cost: number;
  available_count: number;
}

export type CreatePodForm = UseFormReturn<CreatePodFormValues>;
