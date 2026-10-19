import { gql } from '@/generated/graphql';

/**
 * Recurring pods — the same operations mWeb sends (`@duncit/utils`
 * pod-series), re-declared inline because the app's codegen only sees
 * documents written in this workspace.
 */

/** Every date a recurring plan would run on, each with its slot or why not. */
export const PodSeriesPreviewDocument = gql(`
  query MobilePodSeriesPreview($input: PodSeriesPlanInput!) {
    podSeriesPreview(input: $input) {
      frequency
      max_occurrences
      max_span_days
      max_discount_pct
      default_multi_date_discount_tiers {
        min_dates
        discount_pct
      }
      dates {
        start_at
        end_at
        slot_id
        price
        available
        reason
        on_request
      }
    }
  }
`);

/** The Pod Settings a plan is held to — read before there is a plan, to bound the end day. */
export const PodSeriesLimitsDocument = gql(`
  query MobilePodSeriesLimits {
    podSeriesLimits {
      max_occurrences
      max_span_days
      max_discount_pct
      default_multi_date_discount_tiers {
        min_dates
        discount_pct
      }
    }
  }
`);

/** Publishes the draft as ONE recurring pod with every date that can run. */
export const PublishPodDraftSeriesDocument = gql(`
  mutation MobilePublishPodDraftSeries($draft_id: ID!, $input: CreatePodInput!, $plan: PodSeriesPlanInput!) {
    publishPodDraftSeries(draft_id: $draft_id, input: $input, plan: $plan) {
      series_id
      parent_pod_id
      created_count
      skipped {
        date
        reason
      }
    }
  }
`);

/** Every date of a recurring pod, for Pod Details (mWeb: POD_SERIES_DATES_SDL). */
export const PodSeriesDatesDocument = gql(`
  query MobilePodSeriesDates($pod_doc_id: ID!) {
    podSeriesDates(pod_doc_id: $pod_doc_id) {
      parent_pod_id
      frequency
      multi_date_discount_tiers {
        min_dates
        discount_pct
      }
      is_host
      dates {
        pod_doc_id
        slug
        start_at
        end_at
        status
        seats_available
        my_seats
        pod_amount
        bookable
      }
    }
  }
`);

/** Joins the picked dates of a FREE recurring pod (mWeb: JOIN_FREE_POD_DATES_SDL). */
export const JoinFreePodDatesDocument = gql(`
  mutation MobileJoinFreePodDates($pod_doc_id: ID!, $date_pod_ids: [ID!]!) {
    joinFreePodDates(pod_doc_id: $pod_doc_id, date_pod_ids: $date_pod_ids) {
      joined
      failed {
        pod_doc_id
        message
      }
    }
  }
`);

/** The exact bill for several dates in one checkout (mWeb: RECURRING_CHECKOUT_QUOTE_SDL). */
export const RecurringCheckoutQuoteDocument = gql(`
  query MobileRecurringCheckoutQuote($input: RecurringCheckoutQuoteInput!) {
    recurringCheckoutQuote(input: $input) {
      dates
      currency_symbol
      ticket_gross
      ticket_discount_amount
      ticket_discount_pct
      multi_date_discount_amount
      multi_date_discount_pct
      add_ons_total
      coupon_code
      coupon_discount
      coins_redeemed
      subtotal
      platform_fee_amount
      gst_amount
      round_off
      total
      original_total
    }
  }
`);

/** Venue owner: accept or decline every still-pending date of a series. */
export const VenueDecidePodSeriesDocument = gql(`
  mutation MobileVenueDecidePodSeries($series_id: ID!, $approve: Boolean!, $reason: String) {
    venueDecidePodSeries(series_id: $series_id, approve: $approve, reason: $reason) {
      decided
      failed
    }
  }
`);
