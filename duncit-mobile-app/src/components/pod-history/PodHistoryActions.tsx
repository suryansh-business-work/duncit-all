import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { refundLabel, type PodMembership } from '@/utils/pod-history';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function ActionButton({
  testID,
  icon,
  label,
  onPress,
  variant = 'outlined',
  disabled = false,
}: {
  testID: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'contained' | 'outlined' | 'danger';
  disabled?: boolean;
}) {
  const { onPrimary, color, danger, primary } = useThemeColors();
  const contained = variant === 'contained';
  const tint = variant === 'danger' ? danger : contained ? onPrimary : color;

  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={() => {
        if (!disabled) onPress();
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
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons
        name={icon}
        size={16}
        color={variant === 'danger' ? danger : contained ? onPrimary : primary}
      />
      <Text fontSize={13} fontWeight="800" color={tint}>
        {label}
      </Text>
    </XStack>
  );
}

export interface PodHistoryActionsProps {
  item: PodMembership;
  backingOut: boolean;
  invoiceBusy: boolean;
  onPodDetails: () => void;
  onBackout: () => void;
  onRefundStatus: () => void;
  onInvoice: () => void;
  onSupport: () => void;
}

/** Action buttons for a membership — RN twin of mWeb's PodHistoryDetails actions. */
export function PodHistoryActions({
  item,
  backingOut,
  invoiceBusy,
  onPodDetails,
  onBackout,
  onRefundStatus,
  onInvoice,
  onSupport,
}: PodHistoryActionsProps) {
  return (
    <XStack flexWrap="wrap" gap={8}>
      <ActionButton
        testID="ph-pod-details"
        icon="arrow-forward"
        label="Go to Pod Details"
        variant="contained"
        disabled={!item.pod?.id}
        onPress={onPodDetails}
      />
      <ActionButton
        testID="ph-backout"
        icon="restart-alt"
        label={backingOut ? 'Backing out…' : 'Backout Pod'}
        variant="danger"
        disabled={item.status !== 'JOINED' || backingOut}
        onPress={onBackout}
      />
      <ActionButton
        testID="ph-refund"
        icon="receipt-long"
        label={`Refund: ${refundLabel(item.refund_status)}`}
        onPress={onRefundStatus}
      />
      <ActionButton
        testID="ph-invoice"
        icon="receipt-long"
        label={invoiceBusy ? 'Downloading…' : 'Invoice'}
        disabled={!item.payment_id || invoiceBusy}
        onPress={onInvoice}
      />
      <ActionButton
        testID="ph-support"
        icon="contact-support"
        label="Contact Support"
        onPress={onSupport}
      />
    </XStack>
  );
}
