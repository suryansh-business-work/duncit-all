import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { ConfirmationPodCard } from '@/components/checkout/ConfirmationPodCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CheckoutPayment, CheckoutPod } from '@/hooks/useCheckout';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';

export interface CheckoutSuccessProps {
  payment: NonNullable<CheckoutPayment>;
  pod?: CheckoutPod;
  onDownloadInvoice: () => Promise<void>;
  onDownloadTicket?: () => Promise<void>;
  onHome: () => void;
  onProfile: () => void;
}

/** Payment success view — ticket + invoice download + navigation. RN twin of
 * mWeb's CheckoutSuccess. */
export function CheckoutSuccess({
  payment,
  pod,
  onDownloadInvoice,
  onDownloadTicket,
  onHome,
  onProfile,
}: Readonly<CheckoutSuccessProps>) {
  const { onPrimary } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDownloadInvoice();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not download invoice.'));
    } finally {
      setBusy(false);
    }
  };

  const downloadTicket = async () => {
    /* istanbul ignore next -- TS narrowing guard: the ticket button only mounts when onDownloadTicket exists */
    if (!onDownloadTicket) return;
    setTicketBusy(true);
    setError(null);
    try {
      await onDownloadTicket();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not download ticket.'));
    } finally {
      setTicketBusy(false);
    }
  };

  return (
    <YStack testID="checkout-success" alignItems="center" gap={14} padding={20}>
      <MaterialIcons name="check-circle" size={64} color={semantic.success} />
      <Text fontSize={20} fontWeight="900" color="$color" textAlign="center">
        Payment successful
      </Text>
      <YStack
        alignSelf="stretch"
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={16}
        gap={6}
      >
        <Row label="Invoice" value={payment.invoice_no ?? '—'} />
        <Row label="Amount paid" value={formatMoney(payment.currency_symbol, payment.total)} />
        <Row label="Paid on" value={formatDateTime(payment.paid_at ?? payment.created_at)} />
      </YStack>

      {pod ? <ConfirmationPodCard pod={pod} /> : null}

      {error ? (
        <Text testID="invoice-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}

      {onDownloadTicket ? (
        <ActionButton
          testID="download-ticket"
          ariaLabel="Download ticket"
          busy={ticketBusy}
          onPress={() => void downloadTicket()}
          label="Download ticket"
          iconName="confirmation-number"
          variant="filled"
        />
      ) : null}

      <ActionButton
        testID="download-invoice"
        ariaLabel="Download invoice"
        busy={busy}
        onPress={() => void download()}
        label="Download invoice"
        iconName="download"
        variant="outlined"
      />

      <XStack gap={10} alignSelf="stretch">
        <XStack
          testID="success-home"
          role="button"
          aria-label="Go home"
          onPress={onHome}
          flex={1}
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={14} fontWeight="900" color={onPrimary}>
            Home
          </Text>
        </XStack>
        <XStack
          testID="success-profile"
          role="button"
          aria-label="View bookings"
          onPress={onProfile}
          flex={1}
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={14} fontWeight="900" color="$color">
            My bookings
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

interface ActionButtonProps {
  testID: string;
  ariaLabel: string;
  busy: boolean;
  onPress: () => void;
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  variant: 'filled' | 'outlined';
}

/** Stretched pill button with a busy spinner — used for ticket/invoice downloads. */
function ActionButton({
  testID,
  ariaLabel,
  busy,
  onPress,
  label,
  iconName,
  variant,
}: Readonly<ActionButtonProps>) {
  const { onPrimary, primary } = useThemeColors();
  const filled = variant === 'filled';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={busy}
      onPress={busy ? undefined : onPress}
      alignItems="center"
      justifyContent="center"
      gap={8}
      alignSelf="stretch"
      height={46}
      borderRadius={999}
      borderWidth={filled ? 0 : 1}
      borderColor="$primary"
      backgroundColor={filled ? '$primary' : undefined}
      opacity={busy ? 0.6 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      {busy ? (
        <Spinner size="small" color={filled ? onPrimary : '$primary'} />
      ) : (
        <MaterialIcons name={iconName} size={18} color={filled ? onPrimary : primary} />
      )}
      <Text
        fontSize={14}
        fontWeight={filled ? '900' : '800'}
        color={filled ? onPrimary : '$primary'}
      >
        {busy ? 'Preparing…' : label}
      </Text>
    </XStack>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between">
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text fontSize={13} fontWeight="800" color="$color">
        {value}
      </Text>
    </XStack>
  );
}
