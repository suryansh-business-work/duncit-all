import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { canRejoin, podHistoryGate, refundLabel, type PodMembership } from '@/utils/pod-history';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function ActionButton({
  testID,
  icon,
  label,
  onPress,
  variant = 'outlined',
  disabled = false,
  onDisabledPress,
}: Readonly<{
  testID: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'contained' | 'outlined' | 'danger';
  disabled?: boolean;
  /** Runs instead of onPress while disabled — a dead control that says why it
   * is dead beats one that swallows the tap in silence. */
  onDisabledPress?: () => void;
}>) {
  const { onPrimary, color, danger, primary } = useThemeColors();
  const contained = variant === 'contained';
  const labelTint = contained ? onPrimary : color;
  const iconTint = contained ? onPrimary : primary;
  const tint = variant === 'danger' ? danger : labelTint;

  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={() => {
        if (disabled) onDisabledPress?.();
        else onPress();
      }}
      alignItems="center"
      justifyContent="center"
      gap={6}
      height={42}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={contained ? 0 : 1}
      borderColor={variant === 'danger' ? '$danger' : '$borderColor'}
      backgroundColor={contained ? '$primary' : 'transparent'}
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={16} color={variant === 'danger' ? danger : iconTint} />
      <Text fontSize={13} fontWeight="600" color={tint}>
        {label}
      </Text>
    </XStack>
  );
}

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
function LivePodActions({
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
