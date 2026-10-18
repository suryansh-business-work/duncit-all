import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { buildPodSeriesPlan, multiDateTiersFromEditor, type PodSeriesPlan } from '@duncit/utils';

import { PodSeriesPreviewDocument } from '@/graphql/pod-series';
import { PodSeriesFrequency } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { parseDateTimeText } from '../create-pod.form';
import type { CreatePodFormValues } from '../create-pod.types';

export type SeriesPreview = ResultOf<typeof PodSeriesPreviewDocument>['podSeriesPreview'];
export type SeriesPreviewDate = SeriesPreview['dates'][number];

/** The plan for the form — mWeb's `seriesPlanOf`, reading the app's typed
 * date-time text instead of Dates. Null while there is nothing to ask about. */
export function seriesPlanOf(values: CreatePodFormValues, timeZone: string): PodSeriesPlan | null {
  return buildPodSeriesPlan(
    {
      ...values,
      pod_date_time: parseDateTimeText(values.pod_date_time_text)?.toISOString() ?? null,
      pod_end_date_time: parseDateTimeText(values.pod_end_date_time_text)?.toISOString() ?? null,
      repeat_discount_tiers: values.repeat_discount_enabled
        ? multiDateTiersFromEditor(values.repeat_discount_tiers)
        : [],
    },
    timeZone,
  );
}

/** Every date the plan would run on, as the SERVER sees it. The host's own
 * unticked dates are not sent (they stay listed, unticked). mWeb twin. */
export function useSeriesPreview(values: CreatePodFormValues, timeZone: string) {
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
      .catch((e: unknown) => active && setError(toErrorMessage(e, 'Could not check these dates.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `key` is the plan's identity; the object itself changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { plan, preview: plan ? preview : null, loading, error };
}
