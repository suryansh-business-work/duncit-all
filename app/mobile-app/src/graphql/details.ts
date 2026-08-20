import { gql } from '@/generated/graphql';

/** Resolve a pod's doc id from the shared (mWeb) slug URL so a deep link like
 * /club/:clubSlug/pod/:podSlug opens the right pod. */
export const PodBySlugsDocument = gql(`
  query MobilePodBySlugs($clubSlug: String!, $podSlug: String!) {
    podBySlugs(club_slug: $clubSlug, pod_slug: $podSlug) {
      id
    }
  }
`);

/** Resolve a club's doc id from the shared (mWeb) slug URL (/club/:clubSlug). */
export const ClubBySlugDocument = gql(`
  query MobileClubBySlug($clubSlug: String!) {
    clubBySlug(club_slug: $clubSlug) {
      id
    }
  }
`);

/** Full pod for the details screen — mirrors mWeb's POD_DETAILS so the mobile
 * screen reaches feature parity (mode, meeting, products, venue/location). */
export const PodDetailsDocument = gql(`
  query MobilePodDetails($podId: ID!) {
    me {
      user_id
      profile_photo
      saved_pod_ids
    }
    pod(pod_doc_id: $podId) {
      id
      pod_id
      pod_title
      pod_description
      pod_info
      pod_images_and_videos {
        url
        type
      }
      pod_hosts_id
      host_names
      pod_attendees
      pod_date_time
      pod_end_date_time
      pod_mode
      meeting_platform
      meeting_url
      meeting_notes
      pod_type
      pod_amount
      no_of_spots
      seats_taken
      seats_available
      zone_name
      club_id
      club_slug
      club {
        club_id
        club_name
        club_description
        category_id
        super_category_id
        club_feature_images_and_videos {
          url
        }
      }
      location_id
      venue_id
      place_label
      place_detail
      what_this_pod_offers
      available_perks
      payment_terms
      pod_hits
      pod_occurrence
      place_charges {
        label
        amount
        note
      }
      products_enabled
      product_requests {
        product_id
        product_name
        image_url
        images
        unit_cost
        quantity
        available_count
        total_cost
        free_delivery_above
      }
      like_count
      liked_by_me
      comment_count
    }
    podMembershipState(pod_doc_id: $podId) {
      pod_id
      is_member
      status
      can_join
      can_backout
      spots_taken
      spots_total
      seats_available
      max_seats_per_booking
      my_seats
      refund_threshold_pct
      backout_in_process
      can_cancel_backout
      backout_attempts_used
      backout_attempts_max
      backout_deduction_pct
      backout_refund_amount
      backout_refund_coins
      backout_refund_per_seat
      released_seats_pending
      membership {
        id
        status
        referral_token
        refund_status
      }
    }
    locations {
      id
      location_name
      location_pincode
      location_zones {
        zone_name
        pincode
      }
    }
    publicVenues {
      id
      venue_name
      address_line1
      address_line2
      locality
      city
      state
      country
      postal_code
      lat
      lng
    }
    categories {
      id
      name
      level
      parent_id
    }
  }
`);

/** Public product detail (any signed-in user) for the Pod Shop info sheet. */
export const PublicInventoryProductDocument = gql(`
  query MobilePublicInventoryProduct($productDocId: ID!) {
    publicInventoryProduct(product_doc_id: $productDocId) {
      id
      product_name
      brand_id
      brand_name
      short_description
      description
      image_url
      images
      size_label
      color
      height_cm
      length_cm
      breadth_cm
      weight_kg
      unit_cost
      selling_price
      variants {
        id
        option_label
        color
        size_label
        unit_cost
        inventory_count
        images
      }
    }
  }
`);

/** Pods that currently stock a catalogue product — the per-pod cart context so
 * the buyer can add a product from the catalogue / standalone product detail
 * (which carry no pod context). Products and pods stay separate entities. */
export const PodsForProductDocument = gql(`
  query MobilePodsForProduct($productDocId: ID!) {
    podsForProduct(product_doc_id: $productDocId) {
      pod_id
      pod_title
      club_slug
      product_name
      unit_cost
      available_count
      free_delivery_above
      image_url
    }
  }
`);

/** Ratings & reviews for a product (summary + list) for the product-detail sheet. */
export const ProductReviewsDocument = gql(`
  query MobileProductReviews($id: ID!) {
    productReviewSummary(product_id: $id) {
      average_rating
      total
      star_counts
    }
    productReviews(product_id: $id) {
      id
      user_name
      rating
      comment
      images
      up_votes
      down_votes
      my_vote
      seller_reply
      seller_reply_at
      created_at
    }
  }
`);

export const CreateProductReviewDocument = gql(`
  mutation MobileCreateProductReview($input: CreateProductReviewInput!) {
    createProductReview(input: $input) { id }
  }
`);

export const VoteProductReviewDocument = gql(`
  mutation MobileVoteProductReview($review_id: ID!, $vote: Int!) {
    voteProductReview(review_id: $review_id, vote: $vote) { id up_votes down_votes my_vote }
  }
`);

export const RecordProductViewDocument = gql(`
  mutation MobileRecordProductView($productDocId: ID!) {
    recordProductView(product_doc_id: $productDocId)
  }
`);

export const RecordProductClickDocument = gql(`
  mutation MobileRecordProductClick($productDocId: ID!, $variantId: String) {
    recordProductClick(product_doc_id: $productDocId, variant_id: $variantId)
  }
`);

/** Public brand card (any signed-in user) for the product-detail brand dialog. */
export const PublicEcommBrandDocument = gql(`
  query MobilePublicEcommBrand($brandDocId: ID!) {
    publicEcommBrand(brand_doc_id: $brandDocId) {
      id
      brand_name
      logo_url
      cover_image_url
      tagline
      description
      website_url
      instagram_url
      product_categories
      established_year
      city
      state
      approved_product_count
    }
  }
`);

/** Public profiles for a pod's hosts + attendees — mirrors mWeb's POD_PEOPLE. */
export const PodPeopleDocument = gql(`
  query MobilePodPeople($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`);

/**
 * Join a FREE pod outright — no payment, no checkout.
 *
 * A free pod is forced to `pod_amount` 0 server-side, so sending it through the
 * paid checkout asked the server to charge nothing and got "Amount must be
 * greater than 0" back: free pods could not be joined from the app at all.
 * mWeb has always called this. `seats` books several at once, and the referral
 * token is what credits whoever shared the link.
 */
export const JoinFreePodDocument = gql(`
  mutation MobileJoinFreePod($podId: ID!, $referral: String, $seats: Int) {
    joinFreePod(pod_doc_id: $podId, referral_token: $referral, seats: $seats) {
      id
      status
      seats
    }
  }
`);

/** Seats each attendee's booking holds — the "+N other members" label. Mirrors
 * mWeb's POD_ATTENDEE_SEATS (rule 27). */
export const PodAttendeeSeatsDocument = gql(`
  query MobilePodAttendeeSeats($podId: ID!) {
    podAttendeeSeats(pod_doc_id: $podId) {
      user_id
      seats
    }
  }
`);

/** Filled Backout seats — struck-through attendees. Mirrors mWeb's POD_SPOT_FILLS. */
export const PodSpotFillsDocument = gql(`
  query MobilePodSpotFills($podId: ID!) {
    podSpotFills(pod_doc_id: $podId) {
      backout_no
      backed_out_user_id
      backed_out_user_name
      backed_out_profile_photo
      replacement_user_id
      replacement_user_name
      filled_at
    }
  }
`);

/** Comments thread for a pod (auth) — mirrors mWeb's POD_COMMENTS. */
export const PodCommentsDocument = gql(`
  query MobilePodComments($podId: ID!) {
    podComments(pod_doc_id: $podId) {
      id
      author_id
      author_name
      author_photo
      text
      like_count
      liked_by_me
      created_at
    }
  }
`);

/** Add a comment to a pod (auth). */
export const AddPodCommentDocument = gql(`
  mutation MobileAddPodComment($podId: ID!, $text: String!) {
    addPodComment(pod_doc_id: $podId, text: $text) {
      id
      author_id
      author_name
      author_photo
      text
      like_count
      liked_by_me
      created_at
    }
  }
`);

/** Like/unlike a pod comment (auth) — explore item 4. */
export const TogglePodCommentLikeDocument = gql(`
  mutation MobileTogglePodCommentLike($podId: ID!, $commentId: ID!) {
    togglePodCommentLike(pod_doc_id: $podId, comment_id: $commentId) {
      id
      like_count
      liked_by_me
    }
  }
`);

/** Delete one of the viewer's own comments (auth). */
export const DeletePodCommentDocument = gql(`
  mutation MobileDeletePodComment($podId: ID!, $commentId: ID!) {
    deletePodComment(pod_doc_id: $podId, comment_id: $commentId)
  }
`);

/** Ratings list for a club. */
export const ClubRatingsDocument = gql(`
  query MobileClubRatings($clubId: ID!) {
    clubRatings(club_doc_id: $clubId) {
      id
      user_id
      user_name
      user_photo
      stars
      comment
      created_at
    }
  }
`);

/** Submit or update a club rating (auth). */
export const AddClubRatingDocument = gql(`
  mutation MobileAddClubRating($clubId: ID!, $stars: Int!, $comment: String) {
    addClubRating(club_doc_id: $clubId, stars: $stars, comment: $comment) {
      id
      rating
      ratings_count
    }
  }
`);

/** Club + its active pods for the club-details screen. */
export const ClubDetailsDocument = gql(`
  query MobileClubDetails($clubId: ID!) {
    me {
      user_id
      following_club_ids
      following_user_ids
    }
    club(club_doc_id: $clubId) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      who_we_are
      what_we_do
      perks
      values
      faqs {
        question
        answer
      }
      hosts {
        id
        name
        avatar_url
      }
      club_admins {
        id
        name
        avatar_url
        email
        phone
        whatsapp
      }
      club_whats_app_community_link
      club_whats_app_group_link
      matched_venues_count
      matched_venues {
        id
        venue_name
        address_line1
        address_line2
        locality
        city
        state
        country
        postal_code
        lat
        lng
      }
      followers_count
      category_id
      super_category_id
      rating
      ratings_count
    }
    pods(filter: { club_id: $clubId, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      seats_taken
      seats_available
      host_names
      pod_images_and_videos {
        url
        type
      }
      club_id
      club_slug
      pod_mode
      place_label
      place_detail
    }
    categories {
      id
      name
      level
      parent_id
    }
  }
`);

/** The people behind a club's Total Members count — mWeb's CLUB_FOLLOWERS. */
export const MobileClubFollowersDocument = gql(`
  query MobileClubFollowers($clubId: ID!) {
    clubFollowers(club_doc_id: $clubId) {
      user_id
      username
      full_name
      first_name
      profile_photo
    }
  }
`);
