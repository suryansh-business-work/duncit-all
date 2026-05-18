export type DocRow = { type: string; url: string };

export interface VenueStep1 {
  venue_name: string;
  venue_type: string;
  capacity: number;
  description: string;
  location_id: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  locality: string;
  postal_code: string;
  address_line1: string;
  address_line2: string;
  cover_image_url: string;
  gallery: string[];
}

export interface VenueStep2 {
  documents: DocRow[];
  gstin: string;
  pan: string;
}

export interface VenueStep3 {
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: string;
  owner_address: string;
}

export const VENUE_TYPES = ['Cafe', 'Restaurant', 'Sports Turf', 'Studio', 'Banquet', 'Park', 'Other'];
export const DOC_TYPES = ['GST Certificate', 'PAN Card', 'Property Document', 'Trade License', 'Other'];
export const STEPS = ['Details', 'Documents', 'Owner', 'Submit'];

export const blankStep1: VenueStep1 = {
  venue_name: '',
  venue_type: 'Cafe',
  capacity: 10,
  description: '',
  location_id: '',
  country: 'India',
  country_code: 'IN',
  state: '',
  state_code: '',
  city: '',
  locality: '',
  postal_code: '',
  address_line1: '',
  address_line2: '',
  cover_image_url: '',
  gallery: [],
};

export const blankStep2: VenueStep2 = { documents: [], gstin: '', pan: '' };

export const blankStep3: VenueStep3 = {
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  owner_dob: '',
  owner_address: '',
};