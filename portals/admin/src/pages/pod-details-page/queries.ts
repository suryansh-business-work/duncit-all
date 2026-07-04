import { gql } from '@apollo/client';

export const POD_DETAIL = gql`
  query AdminPodDetail($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      meeting_url
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_attendees
      pod_hits
      zone_name
      club_id
      club_slug
      location_id
      venue_id
      products_enabled
      like_count
      comment_count
      is_active
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export const POD_FINANCE_BREAKDOWN = gql`
  query AdminPodFinanceBreakdown($pod_id: ID!) {
    podFinanceBreakdown(pod_id: $pod_id) {
      pod_id
      pod_title
      settlement_status
      frozen
      bookings_count
      collected_total
      currency_symbol
      has_venue
      completed_at
      waterfall {
        version
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        duncit_revenue
        host_earn_pct
      }
    }
  }
`;
