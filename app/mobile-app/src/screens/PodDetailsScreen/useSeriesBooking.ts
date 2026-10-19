import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  bookableSeriesDates,
  pickedSeriesDates,
  seriesBookingEstimate,
  ticketDiscountFor,
  type SeriesDateRow,
} from '@duncit/utils';

import { JoinFreePodDatesDocument, PodSeriesDatesDocument } from '@/graphql/pod-series';
import type { PodDetail } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

import { useBookingClashGuard } from './useBookingClashGuard';

type SeriesDates = NonNullable<ResultOf<typeof PodSeriesDatesDocument>['podSeriesDates']>;

/**
 * A recurring pod on its details screen: its dates, and booking the ones the
 * member ticks (the first open one to start, or "select all"). One date is
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
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clash = useBookingClashGuard();

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
  const bookable = useMemo(() => bookableSeriesDates(rows), [rows]);
  const pickedRows = useMemo(() => pickedSeriesDates(rows, picked), [rows, picked]);
  const chosen = useMemo(() => pickedRows.map((row) => row.pod_doc_id), [pickedRows]);

  // The first open date starts ticked; a reload (after booking) starts over.
  useEffect(() => {
    const [first] = bookable;
    setPicked(first ? [first.pod_doc_id] : []);
  }, [bookable]);

  /** One date's ticket for the chosen seats, after its own multi-ticket tier. */
  const netFor = useCallback(
    (row: SeriesDateRow) =>
      pod ? ticketDiscountFor(Number(row.pod_amount) || 0, seats, pod).net : 0,
    [pod, seats],
  );
  // Each ticked date at its own net price, then the multi-date tier.
  const estimate = seriesBookingEstimate(pickedRows.map(netFor), tiers);

  const togglePicked = (dateId: string) =>
    setPicked((current) =>
      current.includes(dateId) ? current.filter((id) => id !== dateId) : [...current, dateId],
    );
  const toggleAll = () =>
    setPicked(chosen.length === bookable.length ? [] : bookable.map((row) => row.pod_doc_id));

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
    // Every chosen date is checked against the member's other bookings first.
    if (!(await clash.check(chosen))) return;
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
    /** The dates open to book, in date order. */
    bookable,
    tiers,
    /** The viewer hosts this pod — only they open a single date's screen. */
    isHost: series?.is_host ?? false,
    open,
    setOpen,
    picked,
    togglePicked,
    toggleAll,
    netFor,
    chosen,
    estimate,
    busy,
    error,
    confirm,
    reload: load,
    /** "You already have a pod at this time" — rendered by PodDetailsOverlays. */
    clash,
    /**
     * The Book handler for this pod: the date picker on a recurring pod, else
     * `handler` once the member has seen (and accepted) any time clash.
     */
    guard: (handler: () => void) => {
      if (role === 'PARENT') return () => setOpen(true);
      return () =>
        fireAndForget(
          (async () => {
            if (!podId || (await clash.check([podId]))) handler();
          })(),
        );
    },
  };
}

export type SeriesBooking = ReturnType<typeof useSeriesBooking>;
