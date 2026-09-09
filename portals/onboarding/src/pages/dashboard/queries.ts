import { gql } from '@apollo/client';

/**
 * Everything the overview draws, in one round trip.
 *
 * `ecommBrands` rides behind `@include` rather than being asked for outright:
 * the field is non-null and the server refuses it while `is_product_visible`
 * is off, and a refusal on a non-null field nulls the whole query root — the
 * entire dashboard would go dark over one card. With the flag off the field is
 * never asked for, and the e-commerce segment simply is not drawn.
 */
export const ONBOARDING_DASHBOARD = gql`
  query OnboardingDashboard($withEcomm: Boolean!) {
    me {
      user_id
      full_name
      first_name
      last_name
      email
      phone_number
      phone_extension
      profile_photo
      roles
      created_at
    }
    hosts {
      id
      status
      submitted_at
    }
    venues {
      id
      status
      submitted_at
    }
    ecommBrands @include(if: $withEcomm) {
      id
      status
      submitted_at
    }
    surveys {
      id
    }
    onboardingMeetings {
      id
      kind
      created_at
    }
  }
`;
