import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  POD_SERIES_PREVIEW_SDL,
  buildPodSeriesPlan,
  multiDateTiersFromEditor,
  type MultiDateDiscountTier,
  type PodSeriesPlan,
  type PodSeriesSkipReason,
} from '@duncit/utils';
import { useDateFormat } from '../../../../utils/dateFormat';
import type { CreatePodFormValues } from '../create-pod.types';

export const POD_SERIES_PREVIEW = gql(POD_SERIES_PREVIEW_SDL);

export interface SeriesPreviewDate {
  start_at: string;
  end_at?: string | null;
  slot_id?: string | null;
  price?: number | null;
  available: boolean;
  reason?: PodSeriesSkipReason | null;
}

interface PreviewData {
  podSeriesPreview: {
    max_occurrences: number;
    max_span_days: number;
    max_discount_pct: number;
    default_multi_date_discount_tiers: MultiDateDiscountTier[];
    dates: SeriesPreviewDate[];
  };
}

/** The values the plan is built from — the form's, with Dates as ISO. */
export function seriesPlanOf(values: CreatePodFormValues, timeZone: string): PodSeriesPlan | null {
  return buildPodSeriesPlan(
    {
      ...values,
      pod_date_time: values.pod_date_time ? values.pod_date_time.toISOString() : null,
      pod_end_date_time: values.pod_end_date_time ? values.pod_end_date_time.toISOString() : null,
      repeat_discount_tiers: values.repeat_discount_enabled
        ? multiDateTiersFromEditor(values.repeat_discount_tiers)
        : [],
    },
    timeZone
  );
}

/**
 * Every date the host's recurring plan would run on, as the SERVER sees it —
 * each with its slot or the reason it cannot run. The host's own unticked
 * dates are not sent here (they stay listed, unticked); only publishing
 * leaves them out.
 */
export function useSeriesPreview(values: CreatePodFormValues) {
  const { timeZone } = useDateFormat();
  const startMs = values.pod_date_time?.getTime();
  const endMs = values.pod_end_date_time?.getTime();
  const plan = useMemo(
    () => seriesPlanOf({ ...values, repeat_skip_dates: [] }, timeZone),
    // The fields the plan reads, so typing a title does not ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      values.repeat_enabled,
      values.repeat_frequency,
      values.repeat_ends_on,
      values.pod_mode,
      values.venue_id,
      values.venue_slot_id,
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
