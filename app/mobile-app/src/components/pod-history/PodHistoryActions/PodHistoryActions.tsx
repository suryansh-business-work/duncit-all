import { XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { canRejoin, podHistoryGate, refundLabel, type PodMembership } from '@/utils/pod-history';

import { ActionButton } from './ActionButton';
import { LivePodActions } from './LivePodActions';

export interface PodHistoryActionsProps {
  item: PodMembership;
  /** True once the server says this pod has no Backout attempts left. Absent
   * while that query is still open, which renders the same as "not maxed". */
  backoutMaxed?: boolean;
  backingOut: boolean;
  rejoining: boolean;
  invoiceBusy: boolean;
  ticketBusy: boolean;
  onPodDetails: () => void;
  onBackout: () => void;
  /** Pressed instead of onBackout once the attempts are spent — says why. */
  onBackoutBlocked?: () => void;
  onRejoin: () => void;
  onRefundStatus: () => void;
  onInvoice: () => void;
  onTicket: () => void;
  onSupport: () => void;
}

/**
 * Everything this booking can still have done to it — RN twin of mWeb's
 * PodHistoryActions.
 *
 * Two of these are gated by the participation rules rather than by the
 * membership status, and both are absent rather than disabled when they do not
 * apply: a pod that has already happened cannot be backed out of, and a booking
 * nobody asked a refund for has no refund status to report. An action the pod
 * itself no longer allows is absent; one this person has simply run out of
 * stays put and explains itself when pressed.
 */
export function PodHistoryActions({
  item,
  backoutMaxed = false,
  backingOut,
  rejoining,
  invoiceBusy,
  ticketBusy,
  onPodDetails,
  onBackout,
  onBackoutBlocked,
  onRejoin,
  onRefundStatus,
  onInvoice,
  onTicket,
  onSupport,
}: Readonly<PodHistoryActionsProps>) {
  const { t } = useTranslation();
  // A deleted pod keeps its booking record but only allows Invoice + Support.
  const isDeleted = !!item.pod?.is_deleted;
  const showRejoin = canRejoin(item);
  const gate = podHistoryGate(item);
  return (
    <XStack flexWrap="wrap" gap={8}>
      {isDeleted ? null : (
        <LivePodActions
          item={item}
          canBackout={gate.canBackout}
          backoutMaxed={backoutMaxed}
          showRefundState={gate.showRefundState}
          refundText={refundLabel(gate.refundStatus, t)}
          showRejoin={showRejoin}
          backingOut={backingOut}
          rejoining={rejoining}
          ticketBusy={ticketBusy}
          onPodDetails={onPodDetails}
          onBackout={onBackout}
          onBackoutBlocked={onBackoutBlocked}
          onRejoin={onRejoin}
          onRefundStatus={onRefundStatus}
          onTicket={onTicket}
        />
      )}
      <ActionButton
        testID="ph-invoice"
        icon="receipt-long"
        label={invoiceBusy ? t('mweb.podHistory.downloading') : t('mweb.podHistory.invoice')}
        disabled={!item.payment_id || invoiceBusy}
        onPress={onInvoice}
      />
      <ActionButton
        testID="ph-support"
        icon="contact-support"
        label={t('mweb.podHistory.contactSupport')}
        onPress={onSupport}
      />
    </XStack>
  );
}
