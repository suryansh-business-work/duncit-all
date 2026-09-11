import { gql } from '@apollo/client';

/** The whole venue record, read-only. The admin console never writes a venue —
 * approvals and edits live in the Onboarding portal — so this is one query with
 * no mutations beside it. */
export const VENUE_DETAIL = gql`
  query AdminVenueDetail($venue_doc_id: ID!) {
    venue(venue_doc_id: $venue_doc_id) {
      id
      venue_no
      owner_user_id
      step_completed
      venue_name
      venue_type
      status
      is_active
      pod_count
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
      tags
      cover_image_url
      gallery
      country
      country_code
      state_code
      location_id
      address_line1
      address_line2
      city
      state
      locality
      postal_code
      lat
      lng
      owner_name
      owner_email
      owner_phone
      owner_dob
      owner_address
      gstin
      pan
      bank_account {
        payout_method
        account_holder_name
        account_number
        ifsc_code
        upi_id
      }
      venue_share_pct
      venue_commission_pct
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
        cancellation {
          reschedule_only
          tiers {
            hours_before
            charge_type
            value
          }
          trigger_hours
          refund_tiers {
            hours_before
            refund_pct
          }
        }
      }
      documents {
        type
        url
        uploaded_at
      }
      reviewer_notes
      submitted_at
      approved_at
      rejected_at
      created_at
      updated_at
    }
  }
`;

export type VenueStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface VenueCapacityItem {
  label: string;
  capacity: number;
}

export interface VenueCancellationTier {
  hours_before: number;
  charge_type: 'PERCENT' | 'AMOUNT';
  value: number;
}

export interface VenueRefundTier {
  hours_before: number;
  refund_pct: number;
}

export interface VenueSettings {
  operating_hours: { open: string; close: string };
  weekly_off_days: number[];
  holidays: string[];
  rules: {
    buffer_minutes: number;
    min_notice_minutes: number;
    max_advance_days: number;
    max_bookings_per_slot: number;
    allow_instant_booking: boolean;
    allow_waitlist: boolean;
    booking_approval_required: boolean;
    allow_multiple_bookings: boolean;
  };
  auto_extend: {
    enabled: boolean;
    template_id?: string | null;
    horizon_days: number;
    until: string;
  };
  cancellation: {
    reschedule_only: boolean;
    tiers: VenueCancellationTier[];
    trigger_hours: number;
    refund_tiers: VenueRefundTier[];
  };
}

export interface VenueDocument {
  type: string;
  url: string;
  uploaded_at: string;
}

export interface AdminVenueDetail {
  id: string;
  venue_no?: string | null;
  owner_user_id: string;
  step_completed: number;
  venue_name: string;
  venue_type: string;
  status: VenueStatus;
  is_active: boolean;
  pod_count: number;
  capacity: number;
  capacity_items: VenueCapacityItem[];
  venue_category: {
    super_category_id?: string | null;
    category_id?: string | null;
    sub_category_id?: string | null;
    super_category_name: string;
    category_name: string;
    sub_category_name: string;
  };
  description: string;
  amenities: string[];
  facilities: string[];
  security: string[];
  tags: string[];
  cover_image_url: string;
  gallery: string[];
  country: string;
  country_code: string;
  state_code: string;
  location_id?: string | null;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  locality: string;
  postal_code: string;
  lat?: number | null;
  lng?: number | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_dob?: string | null;
  owner_address: string;
  gstin: string;
  pan: string;
  bank_account: {
    payout_method?: string | null;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  };
  venue_share_pct: number;
  venue_commission_pct: number;
  settings: VenueSettings;
  documents: VenueDocument[];
  reviewer_notes: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
}
