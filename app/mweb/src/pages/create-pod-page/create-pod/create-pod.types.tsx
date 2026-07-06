/** Shared option lists + form value shape for the host Create Pod stepper. */
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

export interface CreatePodFormValues {
  /** Pod location — defaults to the host's selected location; filters clubs + venues. */
  location_id: string;
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
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  pod_amount: number;
  no_of_spots: number;
  pod_hashtag_text: string;
  media_text: string;
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
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 0,
  pod_hashtag_text: '',
  media_text: '',
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

/** Rich location shape — enough for the header-style LocationDialog picker. */
export interface CreatePodLocation {
  id: string;
  location_name: string;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  location_image?: string | null;
  location_pincode?: string | null;
  active_club_count?: number | null;
  location_zones?: { zone_name: string; pincode?: string | null }[] | null;
}

/** A venue partner whose published slots the host can book. */
export interface CreatePodVenue {
  id: string;
  owner_user_id?: string | null;
  venue_name: string;
  venue_type?: string | null;
  capacity?: number | null;
  capacity_items?: { label: string; capacity: number }[] | null;
  cover_image_url?: string | null;
  location_id?: string | null;
  city?: string | null;
  locality?: string | null;
  address_line1?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
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

/** Host's onboarded category — auto-selected (read-only) on the pod. */
export interface CreatePodHostCategory {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}

export interface CreatePodProduct {
  id: string;
  product_name: string;
  unit_cost: number;
  available_count: number;
  image_url?: string | null;
}

export type CreatePodForm = UseFormReturn<CreatePodFormValues>;
