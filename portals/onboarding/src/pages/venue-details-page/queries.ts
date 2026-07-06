import { gql } from '@apollo/client';

export const VENUE_DETAILS = gql`
  query AdminVenueDetails($venue_doc_id: ID!) {
    venue(venue_doc_id: $venue_doc_id) {
      id
      venue_name
      venue_type
      description
      cover_image_url
      capacity
      status
      city
      state
      locality
      country
      postal_code
      address_line1
      owner_name
      owner_email
      owner_phone
      tags
      submitted_at
      approved_at
    }
  }
`;

export const VENUE_PODS = gql`
  query VenuePods($venue_id: ID!) {
    pods(filter: { venue_id: $venue_id }) {
      id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_mode
      is_active
      venue_approval_status
      host_names
      club_slug
    }
  }
`;

export interface VenuePod {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  is_active: boolean;
  venue_approval_status: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
  host_names: string[];
  club_slug: string;
}

const SLOT_FIELDS = `id venue_id start_at end_at price status booked_by_pod_id booked_pod_title notes created_at`;

export const ADMIN_VENUE_SLOTS = gql`
  query AdminVenueSlots($venue_id: ID!, $from: String, $to: String) {
    adminVenueSlots(venue_id: $venue_id, from: $from, to: $to) { ${SLOT_FIELDS} }
  }
`;

export const ADMIN_CREATE_VENUE_SLOTS = gql`
  mutation AdminCreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
    adminCreateVenueSlots(input: $input) { id start_at end_at price status notes }
  }
`;

export const ADMIN_UPDATE_VENUE_SLOT = gql`
  mutation AdminUpdateVenueSlot($slot_id: ID!, $input: UpdateVenueSlotInput!) {
    adminUpdateVenueSlot(slot_id: $slot_id, input: $input) { id start_at end_at price status notes }
  }
`;

export const ADMIN_DELETE_VENUE_SLOT = gql`
  mutation AdminDeleteVenueSlot($slot_id: ID!) {
    adminDeleteVenueSlot(slot_id: $slot_id)
  }
`;

export interface AdminVenueDetails {
  id: string;
  venue_name: string;
  venue_type: string;
  description: string;
  cover_image_url: string;
  capacity: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  city: string;
  state: string;
  locality: string;
  country: string;
  postal_code: string;
  address_line1: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  tags: string[];
  submitted_at: string | null;
  approved_at: string | null;
}
