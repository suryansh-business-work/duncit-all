import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  seriesBookingEstimate,
  seriesDatesForChoice,
  ticketDiscountFor,
  type SeriesBookingChoice,
  type SeriesDateRow,
} from '@duncit/utils';

import { JoinFreePodDatesDocument, PodSeriesDatesDocument } from '@/graphql/pod-series';
import type { PodDetail } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

type SeriesDates = NonNullable<ResultOf<typeof PodSeriesDatesDocument>['podSeriesDates']>;

/**
 * A recurring pod on its details screen: its dates, and booking the ones the
 * member picks — the next one, all of them, or a hand-picked set. One date is
 * booked like any pod (its own checkout or free join); several dates of a
 * paid pod go through one checkout carrying them all. mWeb twin:
 * pages/pod-details-page/series/useSeriesBooking.
 */
export function useSeriesBooking(
  pod: PodDetail | null | undefined,
  seats: number,
  navigation: NativeStackNavigationProp<RootStackParamList>,
) {
  const { t } = useTranslation();
  const role = pod?.series_role ?? null;
  const podId = pod?.id ?? '';
  const [series, setSeries] = useState<SeriesDates | null>(null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<SeriesBookingChoice>('NEXT');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!podId || !role) return;
    try {
      const data = await graphqlRequest(
        PodSeriesDatesDocument,
        { pod_doc_id: podId },
        { auth: true },
      );
      setSeries(data.podSeriesDates ?? null);
    } catch (err) {
      setError(toErrorMessage(err, t('mweb.podSeriesBooking.loadFailed')));
    }
  }, [podId, role, t]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const rows = useMemo<SeriesDateRow[]>(() => (series?.dates ?? []) as SeriesDateRow[], [series]);
  const tiers = series?.multi_date_discount_tiers ?? [];
  const chosen = useMemo(() => seriesDatesForChoice(rows, choice, picked), [rows, choice, picked]);
  // Each date's ticket after its own multi-ticket tier, then the multi-date tier.
  const perDate = pod ? ticketDiscountFor(Number(pod.pod_amount) || 0, seats, pod).net : 0;
  const estimate = seriesBookingEstimate(perDate, chosen.length, tiers);

  const togglePicked = (dateId: string) =>
    setPicked((current) =>
      current.includes(dateId) ? current.filter((id) => id !== dateId) : [...current, dateId],
    );

  const joinFree = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await graphqlRequest(
        JoinFreePodDatesDocument,
        { pod_doc_id: podId, date_pod_ids: chosen },
        { auth: true },
      );
      const { joined, failed } = data.joinFreePodDates;
      const [firstFailure] = failed;
      if (firstFailure) setError(firstFailure.message);
      setOpen(false);
      await load();
      const [firstJoined] = joined;
      if (firstJoined) navigation.navigate('FreeJoinSuccess', { podId: firstJoined });
    } catch (err) {
      setError(toErrorMessage(err, t('mweb.podDetails.couldNotJoin')));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pod || chosen.length === 0) return;
    if (pod.pod_type === 'FREE') {
      await joinFree();
      return;
    }
    setOpen(false);
    // One date is booked like any pod; several go together under the recurring pod.
    const [onlyDate] = chosen;
    if (chosen.length === 1 && onlyDate)
      navigation.navigate('Checkout', { podId: onlyDate, seats });
    else navigation.navigate('Checkout', { podId, seats, dateIds: chosen });
  };

  return {
    /** This pod is recurring (its parent row or one of its dates). */
    active: !!role,
    rows,
    tiers,
    open,
    setOpen,
    choice,
    setChoice,
    picked,
    togglePicked,
    chosen,
    estimate,
    busy,
    error,
    confirm,
    reload: load,
    /** The Book handler for this pod: the date picker on a recurring pod, else `handler`. */
    guard: (handler: () => void) => (role === 'PARENT' ? () => setOpen(true) : handler),
  };
}

export type SeriesBooking = ReturnType<typeof useSeriesBooking>;
