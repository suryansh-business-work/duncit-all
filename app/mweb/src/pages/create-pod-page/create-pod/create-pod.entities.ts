/** The catalogue entities the host Create Pod stepper picks from. */
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
  location_zones?: CreatePodLocationZone[] | null;
}

/** A city's locality/zone — what step 1's Locality dropdown lists. */
export interface CreatePodLocationZone {
  zone_name: string;
  pincode?: string | null;
  active_club_count?: number | null;
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
  /** A whole-day (or whole-date-range) booking. */
  whole_day: boolean;
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

/** A SUB-level category and the fewest people its activity needs (0 = unset).
 * Set by an admin in Category Management; floors the host's spots slider. */
export interface CreatePodSubCategory {
  id: string;
  min_pax: number;
}
