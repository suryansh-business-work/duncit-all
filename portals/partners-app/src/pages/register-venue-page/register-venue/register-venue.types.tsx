/** Location fields shared by the cascading pickers, geocoder finder and the
 * registration form values. */
export interface VenueLocationValues {
  location_id: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  locality: string;
  postal_code: string;
}

/** One named capacity the venue offers (e.g. "Banquet hall" → 120). Number
 * inputs surface as strings while typing, so capacity is a union. */
export interface CapacityRow {
  label: string;
  capacity: number | string;
}

export interface DocRow {
  type: string;
  url: string;
}

export interface RegisterVenueValues extends VenueLocationValues {
  venue_name: string;
  description: string;
  cover_image_url: string;
  gallery: string[];
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
  address_line1: string;
  address_line2: string;
  venue_type: string;
  capacity_items: CapacityRow[];
  amenities: string[];
  facilities: string[];
  security: string[];
  documents: DocRow[];
  gstin: string;
  pan: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: string;
  owner_address: string;
}

export type VenueSectionKey =
  | 'details'
  | 'type-capacity'
  | 'amenities'
  | 'documents'
  | 'owner'
  | 'leaves'
  | 'review';

/** How the form is being used:
 * - register: new/draft/rejected — everything editable, submit for review.
 * - edit-approved: APPROVED venue — only description, images, capacity,
 *   owner contact and appended documents may change; the rest renders disabled.
 * - view: SUBMITTED — read-only while under review. */
export type RegisterVenueMode = 'register' | 'edit-approved' | 'view';

/** Served by the `venueRegistrationConfig` query — never hardcode these lists. */
export interface VenueRegistrationConfig {
  venue_types: string[];
  doc_types: string[];
  capacity_item_limit: number;
  amenities: string[];
  facilities: string[];
  security: string[];
}

export const blankRegisterVenueValues: RegisterVenueValues = {
  venue_name: '',
  description: '',
  cover_image_url: '',
  gallery: [],
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
  address_line1: '',
  address_line2: '',
  location_id: '',
  country: 'India',
  country_code: 'IN',
  state: '',
  state_code: '',
  city: '',
  locality: '',
  postal_code: '',
  venue_type: '',
  capacity_items: [],
  amenities: [],
  facilities: [],
  security: [],
  documents: [],
  gstin: '',
  pan: '',
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  owner_dob: '',
  owner_address: '',
};
