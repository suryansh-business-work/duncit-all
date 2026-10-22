import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  POD_SERIES_LIMITS_SDL,
  POD_SERIES_PREVIEW_SDL,
  buildPodSeriesPlan,
  instantBookingInput,
  multiDateTiersFromEditor,
  type MultiDateDiscountTier,
  type PodSeriesPlan,
  type PodSeriesSkipReason,
} from '@duncit/utils';
import { useDateFormat } from '../../../../utils/dateFormat';
import type { CreatePodFormValues } from '../create-pod.types';

export const POD_SERIES_PREVIEW = gql(POD_SERIES_PREVIEW_SDL);
export const POD_SERIES_LIMITS = gql(POD_SERIES_LIMITS_SDL);

export interface SeriesPreviewDate {
  start_at: string;
  end_at?: string | null;
  slot_id?: string | null;
  price?: number | null;
  available: boolean;
  reason?: PodSeriesSkipReason | null;
  /** The venue has no slot for it yet — it opens one when it accepts. */
  on_request: boolean;
}

interface SeriesLimits {
  max_occurrences: number;
  max_span_days: number;
  max_discount_pct: number;
  default_multi_date_discount_tiers: MultiDateDiscountTier[];
}

interface PreviewData {
  podSeriesPreview: SeriesLimits & { dates: SeriesPreviewDate[] };
}

/** The values the plan is built from — the form's, with Dates as ISO. */
export function seriesPlanOf(values: CreatePodFormValues, timeZone: string): PodSeriesPlan | null {
  const start = values.pod_date_time ? values.pod_date_time.toISOString() : null;
  const end = values.pod_end_date_time ? values.pod_end_date_time.toISOString() : null;
  return buildPodSeriesPlan(
    {
      ...values,
      pod_date_time: start,
      pod_end_date_time: end,
      // The first date's instant booking; a held slot id (an older draft) wins over it.
      venue_booking: instantBookingInput({
        start,
        end,
        pax: values.no_of_spots,
        pets: values.venue_booking_pets,
        spaceLabel: values.venue_space_label,
      }),
      repeat_discount_tiers: values.repeat_discount_enabled
        ? multiDateTiersFromEditor(values.repeat_discount_tiers)
        : [],
    },
    timeZone
  );
}

/** The Pod Settings a plan is held to (how far the end day may go), read once
 * the host switches to Recurring — before there is a plan to preview. */
export function usePodSeriesLimits(enabled: boolean): SeriesLimits | null {
  const { data } = useQuery<{ podSeriesLimits: SeriesLimits }>(POD_SERIES_LIMITS, {
    skip: !enabled,
    fetchPolicy: 'cache-first',
  });
  return data?.podSeriesLimits ?? null;
}

/**
 * Every date the host's recurring plan would run on, as the SERVER sees it —
 * each with its slot, whether the venue opens one on request, or the reason it
 * cannot run. The host's own left-out dates are not sent here (they stay on
 * the calendar, marked); only publishing leaves them out.
 */
export function useSeriesPreview(values: CreatePodFormValues) {
  const { timeZone } = useDateFormat();
  const startMs = values.pod_date_time?.getTime();
  const endMs = values.pod_end_date_time?.getTime();
  const customKey = values.repeat_custom_days.join(',');
  const plan = useMemo(
    () => seriesPlanOf({ ...values, repeat_skip_dates: [] }, timeZone),
    // The fields the plan reads, so typing a title does not ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      values.repeat_enabled,
      values.repeat_frequency,
      values.repeat_ends_on,
      customKey,
      values.pod_mode,
      values.venue_id,
      values.venue_slot_id,
      values.venue_space_label,
      values.no_of_spots,
      values.venue_booking_pets,
      startMs,
      endMs,
      timeZone,
    ]
  );
  const query = useQuery<PreviewData>(POD_SERIES_PREVIEW, {
    variables: { input: plan },
    skip: !plan,
    fetchPolicy: 'network-only',
  });
  return {
    plan,
    loading: query.loading,
    error: query.error ?? null,
    preview: plan ? (query.data?.podSeriesPreview ?? null) : null,
  };
}
