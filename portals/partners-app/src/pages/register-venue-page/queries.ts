import { gql } from '@apollo/client';

export const MY_VENUE = gql`
  query MyVenue {
    me {
      user_id
      full_name
      first_name
      last_name
      email
    }
    myVenue {
      id
      step_completed
      status
      created_at
      updated_at
      is_active
      venue_name
      venue_type
      capacity
      description
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
      cover_image_url
      city
      locality
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;

export const STEP1 = gql`
  mutation V1($input: VenueStep1Input!) {
    submitVenueStep1(input: $input) { id step_completed status }
  }
`;

export const STEP2 = gql`
  mutation V2($input: VenueStep2Input!) {
    submitVenueStep2(input: $input) { id step_completed }
  }
`;

export const STEP3 = gql`
  mutation V3($input: VenueStep3Input!) {
    submitVenueStep3(input: $input) { id step_completed }
  }
`;

export const FINAL = gql`
  mutation VFinal { submitVenueFinal { id status } }
`;