import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { buildPodSeriesPlan, multiDateTiersFromEditor, type PodSeriesPlan } from '@duncit/utils';

import { PodSeriesLimitsDocument, PodSeriesPreviewDocument } from '@/graphql/pod-series';
import { PodSeriesFrequency } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { parseDateTimeText, venueBookingOf } from '../create-pod.form';
import type { CreatePodFormValues } from '../create-pod.types';

export type SeriesPreview = ResultOf<typeof PodSeriesPreviewDocument>['podSeriesPreview'];
export type SeriesPreviewDate = SeriesPreview['dates'][number];
export type SeriesLimits = ResultOf<typeof PodSeriesLimitsDocument>['podSeriesLimits'];

/** The plan for the form — mWeb's `seriesPlanOf`, reading the app's typed
 * date-time text instead of Dates. Null while there is nothing to ask about. */
export function seriesPlanOf(values: CreatePodFormValues, timeZone: string): PodSeriesPlan | null {
  return buildPodSeriesPlan(
    {
      ...values,
      pod_date_time: parseDateTimeText(values.pod_date_time_text)?.toISOString() ?? null,
      pod_end_date_time: parseDateTimeText(values.pod_end_date_time_text)?.toISOString() ?? null,
      // The first date's instant booking; a held slot id (a Pod Request) wins over it.
      venue_booking: venueBookingOf(values),
      repeat_discount_tiers: values.repeat_discount_enabled
        ? multiDateTiersFromEditor(values.repeat_discount_tiers)
        : [],
    },
    timeZone,
  );
}

/** The Pod Settings a plan is held to — read once, before there is a plan, so
 * the end day can be bounded. Null until it lands (or when it cannot). */
export function useSeriesLimits(enabled: boolean): SeriesLimits | null {
  const [limits, setLimits] = useState<SeriesLimits | null>(null);
  const loaded = limits !== null;
  useEffect(() => {
    if (!enabled || loaded) return;
    let active = true;
    graphqlRequest(PodSeriesLimitsDocument, {}, { auth: true })
      .then((data) => active && setLimits(data.podSeriesLimits))
      // The server still holds the span when a date is picked past it.
      .catch((e: unknown) => console.warn('[podSeriesLimits]', toErrorMessage(e)));
    return () => {
      active = false;
    };
  }, [enabled, loaded]);
  return limits;
}

/** Every date the plan would run on, as the SERVER sees it. The host's own
 * left-out dates are not sent (they stay marked on the calendar). mWeb twin. */
export function useSeriesPreview(values: CreatePodFormValues, timeZone: string) {
  const { t } = useTranslation();
  const plan = useMemo(
    () => seriesPlanOf({ ...values, repeat_skip_dates: [] }, timeZone),
    // The fields the plan reads, so typing a title does not ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      values.repeat_enabled,
      values.repeat_frequency,
      values.repeat_ends_on,
      values.repeat_custom_days,
      values.pod_mode,
      values.venue_id,
      values.venue_slot_id,
      values.venue_space_label,
      values.venue_booking_pax,
      values.venue_booking_pets,
      values.pod_date_time_text,
      values.pod_end_date_time_text,
      timeZone,
    ],
  );
  const key = plan ? JSON.stringify(plan) : '';
  const [preview, setPreview] = useState<SeriesPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) {
      setPreview(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    // The generated enum is a TS enum; the shared plan carries its string value.
    const input = { ...plan, frequency: plan.frequency as PodSeriesFrequency };
    graphqlRequest(PodSeriesPreviewDocument, { input }, { auth: true })
      .then((data) => active && setPreview(data.podSeriesPreview))
      .catch(
        (e: unknown) => active && setError(toErrorMessage(e, t('mweb.podSeries.previewFailed'))),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `key` is the plan's identity; the object itself changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { plan, preview: plan ? preview : null, loading, error };
}
