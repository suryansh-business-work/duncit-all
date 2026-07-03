import { gql } from '@apollo/client';

export const MY_VENUE = gql`
  query MyVenue($venue_id: ID) {
    me {
      user_id
      full_name
      first_name
      last_name
      email
    }
    myVenue(venue_id: $venue_id) {
      id
      step_completed
      status
      created_at
      updated_at
      is_active
      venue_name
      venue_type
      capacity
      capacity_items {
        label
        capacity
      }
      venue_category {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
      description
      amenities
      facilities
      security
      location_id
      country
      country_code
      state
      state_code
      city
      locality
      postal_code
      address_line1
      address_line2
      cover_image_url
      gallery
      gstin
      pan
      documents { type url }
      owner_name
      owner_email
      owner_phone
      owner_dob
      owner_address
      reviewer_notes
      # Leaves & Holidays section edits settings.holidays
      settings {
        holidays
      }
    }
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

export const VENUE_SETTINGS_FRAGMENT = `
  settings {
    operating_hours {
      open
      close
    }
    weekly_off_days
    holidays
    rules {
      buffer_minutes
      min_notice_minutes
      max_advance_days
      max_bookings_per_slot
      allow_instant_booking
      allow_waitlist
      booking_approval_required
      allow_multiple_bookings
    }
    auto_extend {
      enabled
      template_id
      horizon_days
      until
    }
  }
`;

export const MY_VENUES = gql`
  query MyVenues {
    myVenues {
      id
      status
      created_at
      updated_at
      venue_name
      venue_type
      capacity
      capacity_items {
        label
        capacity
      }
      cover_image_url
      city
      locality
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;

export const REGISTRATION_CONFIG = gql`
  query VenueRegistrationConfig {
    venueRegistrationConfig {
      venue_types
      doc_types
      capacity_item_limit
      amenities
      facilities
      security
    }
  }
`;

export const STEP1 = gql`
  mutation V1($input: VenueStep1Input!, $venue_id: ID) {
    submitVenueStep1(input: $input, venue_id: $venue_id) { id step_completed status }
  }
`;

export const STEP2 = gql`
  mutation V2($input: VenueStep2Input!, $venue_id: ID) {
    submitVenueStep2(input: $input, venue_id: $venue_id) { id step_completed }
  }
`;

export const STEP3 = gql`
  mutation V3($input: VenueStep3Input!, $venue_id: ID) {
    submitVenueStep3(input: $input, venue_id: $venue_id) { id step_completed }
  }
`;

export const FINAL = gql`
  mutation VFinal($venue_id: ID) { submitVenueFinal(venue_id: $venue_id) { id status } }
`;

export const UPDATE_APPROVED_VENUE = gql`
  mutation UpdateApprovedVenue($venue_id: ID!, $input: UpdateApprovedVenueInput!) {
    updateApprovedVenue(venue_id: $venue_id, input: $input) { id status updated_at }
  }
`;

export const UPDATE_VENUE_HOLIDAYS = gql`
  mutation UpdateVenueHolidays($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      settings { holidays }
    }
  }
`;