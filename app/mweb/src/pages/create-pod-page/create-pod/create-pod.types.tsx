/** Shared option lists + form value shape for the host Create Pod stepper. */
import type { UseFormReturn } from 'react-hook-form';

export const POD_TYPES = [
  { value: 'NATIVE_FREE', label: 'Native - Free' },
  { value: 'NATIVE_PAID', label: 'Native - Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native - Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native - Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native - Paid' },
] as const;

export const OCCURRENCES = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALTERNATE_DAY', label: 'Alternate day' },
  { value: 'WEEKENDS_ONLY', label: 'Weekends only' },
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
  /** City the host wants to run the pod in — filters the club list (step 1). */
  location_id: string;
  pod_title: string;
  club_id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  venue_id: string;
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_description: string;
  pod_info: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  pod_amount: number;
  pod_occurrence: string;
  no_of_spots: number;
  pod_hashtag_text: string;
  media_text: string;
  what_this_pod_offers: string[];
  available_perks: string[];
  products_enabled: boolean;
  product_requests: PodProductRequest[];
  place_charges: PodPlaceCharge[];
  payment_terms: string;
}

export const blankCreatePodForm: CreatePodFormValues = {
  location_id: '',
  pod_title: '',
  club_id: '',
  pod_mode: 'PHYSICAL',
  venue_id: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_description: '',
  pod_info: '',
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 0,
  pod_hashtag_text: '',
  media_text: '',
  what_this_pod_offers: [],
  available_perks: [],
  products_enabled: false,
  product_requests: [],
  place_charges: [],
  payment_terms: '',
};

export interface CreatePodClub {
  id: string;
  club_name: string;
  meetup_venues_id?: string[] | null;
  club_description?: string | null;
  club_feature_images_and_videos?: { url: string; type?: string | null }[] | null;
}

export interface CreatePodLocation {
  id: string;
  location_name: string;
  city?: string | null;
}

/** Venue id → location id pairs (from publicVenues) for the club-by-location filter. */
export interface VenueLocationRef {
  id: string;
  location_id?: string | null;
}

export interface CreatePodVenue {
  id: string;
  venue_name: string;
  city?: string | null;
  locality?: string | null;
  address_line1?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface CreatePodProduct {
  id: string;
  product_name: string;
  unit_cost: number;
  available_count: number;
  image_url?: string | null;
}

export type CreatePodForm = UseFormReturn<CreatePodFormValues>;
