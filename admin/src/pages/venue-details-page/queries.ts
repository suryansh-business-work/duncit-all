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
