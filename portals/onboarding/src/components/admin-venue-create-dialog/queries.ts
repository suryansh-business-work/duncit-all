import { gql } from '@apollo/client';
import {
  blankBankAccountValues,
  type BankAccountValues,
} from '../../forms/validation/bankAccount';

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

export const REGISTRATION_CONFIG = gql`
  query OnboardingVenueRegistrationConfig {
    venueRegistrationConfig {
      amenities
      facilities
      security
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

export interface VenueCategoryValue {
  super_category_id: string;
  super_category_name: string;
  category_id: string;
  category_name: string;
  sub_category_id: string;
  sub_category_name: string;
}

export const blankVenueCategory: VenueCategoryValue = {
  super_category_id: '',
  super_category_name: '',
  category_id: '',
  category_name: '',
  sub_category_id: '',
  sub_category_name: '',
};

export interface Step1 {
  venue_name: string;
  venue_type: string;
  capacity: number;
  description: string;
  amenities: string[];
  facilities: string[];
  security: string[];
  cover_image_url: string;
  gallery: string[];
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
  venue_category: VenueCategoryValue;
  tags: string[];
}

export interface Step3 {
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob: string;
  owner_address: string;
  bank_account: BankAccountValues;
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
  amenities: [],
  facilities: [],
  security: [],
  cover_image_url: '',
  gallery: [],
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
  venue_category: blankVenueCategory,
  tags: [],
};

export const blankS3: Step3 = {
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  owner_dob: '',
  owner_address: '',
  bank_account: blankBankAccountValues(),
};
