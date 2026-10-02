import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import type { PodMembership } from '@/utils/pod-history';

import { ActionButton } from './ActionButton';

interface LiveActionsProps {
  item: PodMembership;
  /** From the shared participation rules — computed once by the parent. */
  canBackout: boolean;
  /** True once the server says this pod has no Backout attempts left. */
  backoutMaxed: boolean;
  showRefundState: boolean;
  /** The refund word, from the request rather than the booking's stale copy. */
  refundText: string;
  showRejoin: boolean;
  backingOut: boolean;
  rejoining: boolean;
  ticketBusy: boolean;
  onPodDetails: () => void;
  onBackout: () => void;
  onBackoutBlocked?: () => void;
  onRejoin: () => void;
  onRefundStatus: () => void;
  onTicket: () => void;
}

/** The buttons a pod that still exists offers, over and above Invoice + Support. */
export function LivePodActions({
  item,
  canBackout,
  backoutMaxed,
  showRefundState,
  refundText,
  showRejoin,
  backingOut,
  rejoining,
  ticketBusy,
  onPodDetails,
  onBackout,
  onBackoutBlocked,
  onRejoin,
  onRefundStatus,
  onTicket,
}: Readonly<LiveActionsProps>) {
  const { t } = useTranslation();
  // Only the spent-attempts case has something to say. Backout is also dead
  // while the mutation is in flight, and "you have used them all" is a lie there.
  const onBackoutDisabled = backoutMaxed ? onBackoutBlocked : undefined;
  return (
    <>
      <ActionButton
        testID="ph-pod-details"
        icon="arrow-forward"
        label={t('mweb.podHistory.goToPodDetails')}
        variant="contained"
        disabled={!item.pod?.id}
        onPress={onPodDetails}
      />
      {canBackout ? (
        <TourAnchor tour="booking" anchor="booking-backout">
          <ActionButton
            testID="ph-backout"
            icon="restart-alt"
            label={backingOut ? t('mweb.podHistory.backingOut') : t('mweb.podHistory.backoutPod')}
            variant="danger"
            disabled={item.status !== 'JOINED' || backingOut || backoutMaxed}
            onPress={onBackout}
            onDisabledPress={onBackoutDisabled}
          />
        </TourAnchor>
      ) : null}
      {showRejoin ? (
        <ActionButton
          testID="ph-rejoin"
          icon="replay"
          label={rejoining ? t('mweb.podHistory.rejoining') : t('mweb.podHistory.rejoinPod')}
          variant="contained"
          disabled={rejoining}
          onPress={onRejoin}
        />
      ) : null}
      {showRefundState ? (
        <ActionButton
          testID="ph-refund"
          icon="receipt-long"
          label={t('mweb.podHistory.refundChip', { vars: { status: refundText } })}
          onPress={onRefundStatus}
        />
      ) : null}
      <TourAnchor tour="booking" anchor="booking-ticket">
        <ActionButton
          testID="ph-ticket"
          icon="confirmation-number"
          label={ticketBusy ? t('mweb.podHistory.downloading') : t('mweb.podHistory.ticket')}
          variant="contained"
          disabled={item.status !== 'JOINED' || !item.pod?.id || ticketBusy}
          onPress={onTicket}
        />
      </TourAnchor>
    </>
  );
}
