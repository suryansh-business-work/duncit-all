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
      dates {
        start_at
        end_at
        slot_id
        price
        available
        reason
      }
    }
  }
`);

/** Publishes the draft as a recurring series — one pod per date that can run. */
export const PublishPodDraftSeriesDocument = gql(`
  mutation MobilePublishPodDraftSeries($draft_id: ID!, $input: CreatePodInput!, $plan: PodSeriesPlanInput!) {
    publishPodDraftSeries(draft_id: $draft_id, input: $input, plan: $plan) {
      series_id
      created_count
      skipped {
        date
        reason
      }
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
