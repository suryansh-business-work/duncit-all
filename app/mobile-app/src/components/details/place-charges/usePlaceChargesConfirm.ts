import { useCallback, useMemo, useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import { placeChargesTicketDraft, type PodPlaceCharge } from '@duncit/utils';

import { createTicket } from '@/hooks/useSupport';

export interface PlaceChargesPod {
  id: string;
  pod_title?: string | null;
  place_charges?: readonly PodPlaceCharge[] | null;
}

export interface PlaceChargesReport {
  status: 'idle' | 'pending' | 'done' | 'failed';
  ticketNo: string | null;
}

const IDLE: PlaceChargesReport = { status: 'idle', ticketNo: null };

/**
 * Asks, just before Join / Book on a pod with place charges, whether the member
 * is OK paying them — to the venue, at the venue, with no part for Duncit.
 * `confirm()` resolves true on "I'm OK" (and at once for a pod with no
 * charges), false on Cancel. "Report to support" opens a ticket in one tap —
 * once: the button becomes the ticket number.
 * mWeb twin: pages/pod-details-page/place-charges/usePlaceChargesConfirm.
 */
export function usePlaceChargesConfirm(pod: PlaceChargesPod, currency: string) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<PlaceChargesReport>(IDLE);
  const resolver = useRef<((go: boolean) => void) | null>(null);
  // A second tap while the first is still with the server must not open a
  // second ticket; state alone updates too late to stop it.
  const inFlight = useRef(false);
  // Memoised so the empty fallback is one array, not a new one every render
  // that would re-create onReport each time.
  const charges = useMemo(() => pod.place_charges ?? [], [pod.place_charges]);
  const hasCharges = charges.length > 0;

  const answer = useCallback((go: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    resolve?.(go);
  }, []);

  const confirm = useCallback((): Promise<boolean> => {
    if (!hasCharges) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpen(true);
    });
  }, [hasCharges]);

  const onReport = useCallback(async () => {
    if (inFlight.current || report.status === 'done') return;
    inFlight.current = true;
    setReport({ status: 'pending', ticketNo: null });
    try {
      const draft = placeChargesTicketDraft({
        podId: pod.id,
        podTitle: pod.pod_title ?? '',
        charges,
        currencySymbol: currency,
      });
      const ticket = await createTicket(draft.subject, draft.body_text, draft.category, [], {
        id: draft.pod_id,
        title: draft.pod_title,
      });
      setReport(
        ticket.ticketNo
          ? { status: 'done', ticketNo: ticket.ticketNo }
          : { status: 'failed', ticketNo: null },
      );
    } catch (error) {
      logs.mobileApp.error('pod-details', 'reportPlaceCharges', { error, podId: pod.id });
      setReport({ status: 'failed', ticketNo: null });
    } finally {
      inFlight.current = false;
    }
  }, [charges, currency, pod.id, pod.pod_title, report.status]);

  return {
    confirm,
    dialog: {
      open,
      charges,
      currency,
      report,
      onAccept: () => answer(true),
      onCancel: () => answer(false),
      onReport,
    },
  };
}

export type PlaceChargesDialogProps = ReturnType<typeof usePlaceChargesConfirm>['dialog'];
