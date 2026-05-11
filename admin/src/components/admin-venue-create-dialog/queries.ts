import { gql } from '@apollo/client';

export const USERS = gql`
  query UsersForVenueCreate {
    users {
      user_id
      full_name
      email
      phone_number
    }
  }
`;

export const LOCATIONS_FOR_VENUE = gql`
  query LocationsForVenueForm {
    locations(filter: { is_active: true }) {
      id
      country
      country_code
      state
      state_code
      city
      location_name
      location_pincode
      location_zones {
        zone_name
        zone_code
        pincode
      }
    }
  }
`;

export const ADMIN_CREATE_VENUE = gql`
  mutation AdminCreateVenue(
    $owner_user_id: ID!
    $step1: VenueStep1Input!
    $step2: VenueStep2Input!
    $step3: VenueStep3Input!
    $submit: Boolean
  ) {
    adminCreateVenue(
      owner_user_id: $owner_user_id
      step1: $step1
      step2: $step2
      step3: $step3
      submit: $submit
    ) {
      id
      status
    }
  }
`;

export const VENUE_TYPES = ['Cafe', 'Co-working', 'Restaurant', 'Park', 'Studio', 'Other'];
export const DOC_TYPES = [
  'GST Certificate',
  'PAN Card',
  'Property Document',
  'Trade License',
  'Other',
];

export interface Step1 {
  venue_name: string;
  venue_type: string;
  capacity: number;
  description: string;
  cover_image_url: string;
  address_line1: string;
  address_line2: string;
  location_id: string;
  country: string;
  country_code: string;
  city: string;
  state: string;
  state_code: string;
  locality: string;
  postal_code: string;
  tags: string[];
}

export interface Step3 {
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: string;
  owner_address: string;
}

export interface DocEntry {
  type: string;
  url: string;
}

export const blankS1: Step1 = {
  venue_name: '',
  venue_type: 'Cafe',
  capacity: 10,
  description: '',
  cover_image_url: '',
  address_line1: '',
  address_line2: '',
  location_id: '',
  country: 'India',
  country_code: 'IN',
  city: '',
  state: '',
  state_code: '',
  locality: '',
  postal_code: '',
  tags: [],
};

export const blankS3: Step3 = {
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  owner_dob: '',
  owner_address: '',
};
