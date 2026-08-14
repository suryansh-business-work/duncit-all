import { gql } from '@apollo/client';

/**
 * The three account facts a checkout is refused without. Its own small query so
 * every checkout surface can ask the same question; Apollo serves them all from
 * one cache entry rather than three round trips.
 */
export const CHECKOUT_ELIGIBILITY = gql`
  query CheckoutEligibility {
    me {
      user_id
      phone_number
      is_email_verified
      address {
        line1
      }
    }
  }
`;

export interface CheckoutEligibilityMe {
  user_id: string;
  phone_number: string | null;
  is_email_verified: boolean | null;
  address: { line1: string | null } | null;
}
