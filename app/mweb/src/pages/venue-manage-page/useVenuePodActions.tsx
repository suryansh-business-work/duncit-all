import { useState, type ReactNode } from 'react';
import {
  changeRequestMenuKey,
  venueCancelSuccessMessage,
  type VenueCancelPodResult,
} from '@duncit/utils';
import { useRequestPodChange } from '@duncit/pod-change-requests';
import type { StudioPod } from '../../components/studio-pods';
import { notifySuccess } from '../../components/notify';
import VenueCancelPodDialog from './VenueCancelPodDialog';
import VenuePodDetailDialog from './VenuePodDetailDialog';
import { useTranslation } from '../../i18n/useTranslation';

interface Options {
  currencySymbol: string;
  /** Re-reads the venue's pods once one is cancelled. */
  refetch: () => Promise<unknown>;
  /** Anything else the page derived from the bookings (the slot-earnings strip). */
  onPodsChanged?: () => Promise<unknown>;
}

export interface VenuePodActions {
  /** Spread onto `StudioPodsSection` / `StudioPodsBody`. */
  rowActions: {
    onOpenPod: (pod: StudioPod) => void;
    onCancelPod: (pod: StudioPod) => void;
    onRequestChange: (pod: StudioPod) => void;
    requestChangeLabel: string;
  };
  /** The detail sheet, the cancel dialog and the change request — render once. */
  dialogs: ReactNode;
}

/**
 * What only the venue side can do with one of its pod rows: open its detail
 * sheet, cancel it, or ask Duncit to move it. Venue Studio's pods section and
 * the "Pods at Your Venue" page both list rows, so both take the actions from
 * here rather than wiring the three dialogs twice (rule 40).
 */
export function useVenuePodActions({ currencySymbol, refetch, onPodsChanged }: Options): VenuePodActions {
  const { t } = useTranslation();
  const [openPod, setOpenPod] = useState<StudioPod | null>(null);
  const [podToCancel, setPodToCancel] = useState<StudioPod | null>(null);
  // "Request Change Venue" — the venue owner asking Duncit to move the pod
  // rather than cancelling it and refunding everybody.
  const change = useRequestPodChange({ onFiled: notifySuccess });

  // The line is the shared one — every number in it comes from the server.
  const handleCancelled = async (result: VenueCancelPodResult) => {
    setPodToCancel(null);
    notifySuccess(venueCancelSuccessMessage(result, t));
    await refetch();
    await onPodsChanged?.();
  };

  return {
    rowActions: {
      onOpenPod: setOpenPod,
      onCancelPod: setPodToCancel,
      onRequestChange: (pod) =>
        change.open({ podDocId: pod.id, role: 'VENUE', attendeeCount: pod.attendee_count }),
      requestChangeLabel: t(changeRequestMenuKey('VENUE')),
    },
    dialogs: (
      <>
        <VenuePodDetailDialog pod={openPod} currencySymbol={currencySymbol} onClose={() => setOpenPod(null)} />
        <VenueCancelPodDialog pod={podToCancel} onClose={() => setPodToCancel(null)} onCancelled={handleCancelled} />
        {change.dialog}
      </>
    ),
  };
}
