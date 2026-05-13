import { gql } from '@apollo/client';

export const PUBLIC_FINANCE = gql`
  query PublicFinanceSettings {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      dummy_mode
    }
  }
`;

export const CHECKOUT_ME = gql`
  query CheckoutMe {
    me {
      user_id
      first_name
      last_name
      email
      phone_number
      phone_extension
    }
  }
`;

export const CHECKOUT_POD = gql`
  query CheckoutPod($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      zone_name
      no_of_spots
      pod_attendees
      pod_images_and_videos {
        url
        type
      }
      club_id
      location_id
      venue_id
    }
  }
`;

export const DUMMY_CHECKOUT = gql`
  mutation DummyCheckout($input: DummyCheckoutInput!) {
    dummyCheckout(input: $input) {
      id
      payment_id
      invoice_no
      total
      currency_symbol
      status
    }
  }
`;

export interface CheckoutState {
  pod_id?: string;
  pod_title?: string;
  amount?: number;
  description?: string;
}

export interface CheckoutForm {
  email: string;
  phone: string;
  billing_address: string;
  method: string;
  simulate_failure: boolean;
}
