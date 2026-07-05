/** The four cascading levels the picker can render. */
export type LocationLevel = 'country' | 'state' | 'city' | 'locality';

/** A locality/area inside a city (one Location doc's zone). */
export interface LocationZone {
  zone_name: string;
  zone_code?: string | null;
  pincode?: string | null;
}

/** One admin-managed Location document (a city + its zones). */
export interface LocationDoc {
  id: string;
  location_name?: string | null;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  location_pincode?: string | null;
  location_zones?: LocationZone[] | null;
  is_active?: boolean | null;
}

/**
 * The structured value the picker emits. Every consumer reads only the fields
 * it persists — clubs/sliders keep `location_id`; the CRM keeps city/locality
 * strings — but the picker always fills the whole shape from the admin DB so
 * nothing drifts out of sync.
 */
export interface AdminLocationValue {
  /** The selected city's Location document id ('' until a city is chosen). */
  location_id: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  /** The selected zone/area name ('' if none chosen or the level is hidden). */
  locality: string;
  /** Pincode of the chosen zone, falling back to the city's location_pincode. */
  pincode: string;
}

export const EMPTY_LOCATION: AdminLocationValue = {
  location_id: '',
  country: '',
  country_code: '',
  state: '',
  state_code: '',
  city: '',
  locality: '',
  pincode: '',
};
