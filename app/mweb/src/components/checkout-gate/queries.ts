import { gql } from '@apollo/client';

/**
 * The account facts a checkout is refused without. Its own small query so
 * every checkout surface can ask the same question; Apollo serves them all from
 * one cache entry rather than three round trips.
 */
export const CHECKOUT_ELIGIBILITY = gql`
  query CheckoutEligibility {
    me {
      user_id
      phone_number
      is_email_verified
    }
  }
`;

export interface CheckoutEligibilityMe {
  user_id: string;
  phone_number: string | null;
  is_email_verified: boolean | null;
}
