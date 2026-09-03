import { gql } from '@/generated/graphql';

/**
 * The Club Admin's documents on the phone — the dashboard figures, the clubs
 * they administer, their pods, the AI-monitored audit trail and the editors
 * behind a pod and a club.
 *
 * Every read is club-scoped by the server from the caller's own membership;
 * the app never widens it with a client filter. The Partners console and mWeb
 * read the same root fields through `@duncit/pod-form`'s documents (rule 27).
 * Every selection is written out in full: the mobile codegen reads these
 * templates statically, so a spliced-in fragment string is not an option.
 */

/** Sixteen numbers, the monthly trend and the two lists behind the dashboard. */
export const ClubAdminDashboardDocument = gql(`
  query MobileClubAdminDashboard($from: String, $to: String) {
    clubAdminDashboard(from: $from, to: $to) {
      kpis {
        assigned_clubs
        total_pods
        upcoming_pods
        completed_pods
        total_bookings
        backed_out
        total_attendees
        total_spots
        fill_rate
        total_followers
        new_followers
        avg_rating
        ratings_count
        active_hosts
        total_revenue
        currency_symbol
      }
      trend {
        label
        pods
        bookings
        followers
        revenue
      }
      clubs {
        club_id
        club_slug
        club_name
        total_pods
        upcoming_pods
        completed_pods
        followers
        rating
        revenue
      }
      categories {
        category_id
        name
        super_category
        clubs
        pods
      }
    }
  }
`);

/** The "Your clubs" rows — cover, category, locality and the pod counts the
 * plain Club type does not carry. */
export const MyAdminClubsTableDocument = gql(`
  query MobileMyAdminClubsTable($query: TableQueryInput) {
    myAdminClubsTable(query: $query) {
      total
      rows {
        id
        club_name
        slug
        cover_image_url
        super_category
        category
        locality
        followers_count
        total_pods
        upcoming_pods
        is_verified
      }
    }
  }
`);

/** One club's pods, EVERY stage included, narrowed server-side by `status`. */
export const ClubAdminPodsTableDocument = gql(`
  query MobileClubAdminPodsTable($club_id: ID, $query: TableQueryInput, $status: PodRowStatus) {
    clubAdminPodsTable(club_id: $club_id, query: $query, status: $status) {
      total
      rows {
        id
        pod_id
        club_slug
        pod_title
        pod_date_time
        no_of_spots
        seats_taken
        host_names
        is_active
        is_deleted
        completed_at
        venue_approval_status
      }
    }
  }
`);

/** The AI-monitored action trail of one pod in the caller's clubs. */
export const ClubAdminPodAuditLogsDocument = gql(`
  query MobileClubAdminPodAuditLogs($pod_doc_id: ID!) {
    clubAdminPodAuditLogs(pod_doc_id: $pod_doc_id) {
      id
      pod_id
      pod_title
      club_id
      actor_user_id
      actor_name
      source
      action
      changes {
        field
        from
        to
      }
      note
      ai_risk
      ai_summary
      ai_reviewed_at
      created_at
    }
  }
`);

/** The same trail across every club the caller administers, paged. */
export const ClubAdminPodAuditLogsTableDocument = gql(`
  query MobileClubAdminPodAuditLogsTable($query: TableQueryInput) {
    clubAdminPodAuditLogsTable(query: $query) {
      total
      rows {
        id
        pod_id
        pod_title
        club_id
        actor_user_id
        actor_name
        source
        action
        changes {
          field
          from
          to
        }
        note
        ai_risk
        ai_summary
        ai_reviewed_at
        created_at
      }
    }
  }
`);

/** Approved hosts for the assign-host picker (club-admin scoped). */
export const ClubAdminHostSearchDocument = gql(`
  query MobileClubAdminHostSearch($search: String) {
    clubAdminHostSearch(search: $search) {
      user_id
      full_name
      email
    }
  }
`);

/** Single-pod fetch for the edit route — a cancelled pod stays editable here. */
export const ClubAdminPodForEditDocument = gql(`
  query MobileClubAdminPodForEdit($pod_doc_id: ID!) {
    clubAdminPodForEdit(pod_doc_id: $pod_doc_id) {
      id
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
      reel_url
      club_id
      venue_id
      venue_slot_id
      location_id
      zone_name
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_hashtag
      pod_hosts_id
      host_names
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      no_of_spots
      pod_info
      what_this_pod_offers
      available_perks
      payment_terms
      place_charges {
        label
        amount
        note
      }
      products_enabled
      product_requests {
        product_id
        quantity
      }
    }
  }
`);

/** One club, in the shape both the pinned-club editor and the club form read. */
export const ClubAdminClubDocument = gql(`
  query MobileClubAdminClub($club_doc_id: ID!) {
    club(club_doc_id: $club_doc_id) {
      id
      club_id
      club_name
      club_description
      location_id
      locality
      super_category_id
      category_id
      matched_venues_count
      matched_venues {
        id
      }
      club_feature_images_and_videos {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_group_link
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
      is_active
    }
  }
`);

export const ClubAdminCreatePodDocument = gql(`
  mutation MobileClubAdminCreatePod($input: CreatePodInput!) {
    clubAdminCreatePod(input: $input) {
      id
    }
  }
`);

export const ClubAdminUpdatePodDocument = gql(`
  mutation MobileClubAdminUpdatePod($pod_doc_id: ID!, $input: UpdatePodInput!) {
    clubAdminUpdatePod(pod_doc_id: $pod_doc_id, input: $input) {
      id
    }
  }
`);

export const ClubAdminDeletePodDocument = gql(`
  mutation MobileClubAdminDeletePod($pod_doc_id: ID!) {
    clubAdminDeletePod(pod_doc_id: $pod_doc_id)
  }
`);

export const ClubAdminUpdateClubDocument = gql(`
  mutation MobileClubAdminUpdateClub($club_doc_id: ID!, $input: UpdateClubInput!) {
    clubAdminUpdateClub(club_doc_id: $club_doc_id, input: $input) {
      id
    }
  }
`);
