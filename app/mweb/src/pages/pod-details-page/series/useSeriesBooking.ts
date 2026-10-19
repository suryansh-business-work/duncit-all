import { useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import type { NavigateFunction } from 'react-router';
import {
  JOIN_FREE_POD_DATES_SDL,
  bookableSeriesDates,
  pickedSeriesDates,
  POD_SERIES_DATES_SDL,
  seriesBookingEstimate,
  ticketDiscountFor,
  type MultiDateDiscountTier,
  type SeriesDateRow,
} from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';
import { useBookingClashGuard } from '../clash/useBookingClashGuard';

export const POD_SERIES_DATES = gql(POD_SERIES_DATES_SDL);
export const JOIN_FREE_POD_DATES = gql(JOIN_FREE_POD_DATES_SDL);

interface SeriesDatesData {
  podSeriesDates: {
    parent_pod_id: string;
    multi_date_discount_tiers: MultiDateDiscountTier[];
    /** The viewer hosts this pod — only then may a date open its own page. */
    is_host: boolean;
    dates: SeriesDateRow[];
  } | null;
}

interface SeriesPod {
  id: string;
  pod_title?: string | null;
  pod_type?: string | null;
  pod_amount?: number | null;
  series_role?: string | null;
  ticket_discount_enabled?: boolean | null;
  ticket_discount_tiers?: { min_tickets: number; discount_pct: number }[] | null;
}

interface Args {
  pod: SeriesPod | null;
  seats: number;
  navigate: NavigateFunction;
  onError: (message: string) => void;
}

/**
 * A recurring pod on its details page: its dates, and booking the ones the
 * member picks. Booking one date goes through that date's own checkout (or
 * free join); several dates of a paid pod go through one checkout carrying
 * them all. Native twin: screens/PodDetailsScreen/useSeriesBooking.
 */
export function useSeriesBooking({ pod, seats, navigate, onError }: Readonly<Args>) {
  const role = pod?.series_role ?? null;
  const { data, refetch } = useQuery<SeriesDatesData>(POD_SERIES_DATES, {
    variables: { pod_doc_id: pod?.id ?? '' },
    skip: !pod?.id || !role,
    fetchPolicy: 'cache-and-network',
  });
  const [joinFreeDates, joinState] = useMutation<{
    joinFreePodDates: { joined: string[]; failed: { pod_doc_id: string; message: string }[] };
  }>(JOIN_FREE_POD_DATES);
  const clash = useBookingClashGuard();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const series = data?.podSeriesDates ?? null;
  const rows = useMemo(() => series?.dates ?? [], [series]);
  const tiers = series?.multi_date_discount_tiers ?? [];
  const openRows = useMemo(() => bookableSeriesDates(rows), [rows]);
  const chosenRows = useMemo(() => pickedSeriesDates(rows, picked), [rows, picked]);
  const chosen = useMemo(() => chosenRows.map((row) => row.pod_doc_id), [chosenRows]);
  // Each date's ticket after its own multi-ticket tier, then the multi-date tier.
  const netFor = (row: SeriesDateRow) => (pod ? ticketDiscountFor(Number(row.pod_amount) || 0, seats, pod).net : 0);
  const estimate = seriesBookingEstimate(chosenRows.map(netFor), tiers);

  const togglePicked = (dateId: string) =>
    setPicked((current) => (current.includes(dateId) ? current.filter((id) => id !== dateId) : [...current, dateId]));
  const toggleAll = () => setPicked(chosen.length === openRows.length ? [] : openRows.map((row) => row.pod_doc_id));
  // The picker opens with the next open date ticked.
  const openPicker = () => {
    setPicked(openRows.slice(0, 1).map((row) => row.pod_doc_id));
    setOpen(true);
  };

  const confirm = async () => {
    if (!pod || chosen.length === 0) return;
    // Every chosen date is checked against the member's other bookings first.
    if (!(await clash.check(chosen))) return;
    if (pod.pod_type === 'FREE') {
      try {
        const res = await joinFreeDates({ variables: { pod_doc_id: pod.id, date_pod_ids: chosen } });
        const [firstFailure] = res.data?.joinFreePodDates?.failed ?? [];
        if (firstFailure) onError(firstFailure.message);
        setOpen(false);
        await refetch();
        const [firstJoined] = res.data?.joinFreePodDates?.joined ?? [];
        if (firstJoined) navigate(`/pod/${firstJoined}/booked`);
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    // One date is booked like any pod; several go together under the recurring pod.
    const target = chosen.length === 1 ? chosen[0] : pod.id;
    const params = new URLSearchParams({ title: pod.pod_title ?? '', amount: String(estimate.gross), seats: String(seats) });
    if (chosen.length > 1) params.set('dates', chosen.join(','));
    setOpen(false);
    navigate(`/checkout/${target}?${params.toString()}`);
  };

  return {
    /** This pod is recurring (its parent row or one of its dates). */
    active: !!role,
    /** Booking goes through the date picker — true on the recurring pod itself. */
    picksDates: role === 'PARENT',
    rows,
    /** The dates the member can tick, in date order. */
    openRows,
    /** The viewer hosts this pod, as the server decides it. */
    isHost: series?.is_host ?? false,
    tiers,
    open,
    setOpen,
    picked,
    togglePicked,
    toggleAll,
    chosen,
    /** A date's ticket for the chosen seats, after the multi-ticket tier. */
    netFor,
    estimate,
    busy: joinState.loading,
    confirm,
    /** "You already have a pod at this time" — rendered by SeriesBookingDialog. */
    clash,
    /**
     * The Book handler for this pod: the date picker on a recurring pod, else
     * `handler` once the member has seen (and accepted) any time clash.
     */
    guard: (handler: () => void) => {
      if (role === 'PARENT') return openPicker;
      const podId = pod?.id;
      return () =>
        fireAndForget(
          (async () => {
            if (!podId || (await clash.check([podId]))) handler();
          })(),
          logs.mWeb,
          'pod-details',
          'bookingClash',
        );
    },
  };
}

export type SeriesBooking = ReturnType<typeof useSeriesBooking>;
