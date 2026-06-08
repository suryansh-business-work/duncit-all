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
}: CheckoutSuccessProps) {
  const { onPrimary, primary } = useThemeColors();
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
        <XStack
          testID="download-ticket"
          role="button"
          aria-label="Download ticket"
          aria-disabled={ticketBusy}
          onPress={ticketBusy ? undefined : () => void downloadTicket()}
          alignItems="center"
          justifyContent="center"
          gap={8}
          alignSelf="stretch"
          height={46}
          borderRadius={999}
          backgroundColor="$primary"
          opacity={ticketBusy ? 0.6 : 1}
          pressStyle={{ opacity: 0.85 }}
        >
          {ticketBusy ? (
            <Spinner size="small" color={onPrimary} />
          ) : (
            <MaterialIcons name="confirmation-number" size={18} color={onPrimary} />
          )}
          <Text fontSize={14} fontWeight="900" color={onPrimary}>
            {ticketBusy ? 'Preparing…' : 'Download ticket'}
          </Text>
        </XStack>
      ) : null}

      <XStack
        testID="download-invoice"
        role="button"
        aria-label="Download invoice"
        aria-disabled={busy}
        onPress={busy ? undefined : () => void download()}
        alignItems="center"
        justifyContent="center"
        gap={8}
        alignSelf="stretch"
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$primary"
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        {busy ? (
          <Spinner size="small" color="$primary" />
        ) : (
          <MaterialIcons name="download" size={18} color={primary} />
        )}
        <Text fontSize={14} fontWeight="800" color="$primary">
          {busy ? 'Preparing…' : 'Download invoice'}
        </Text>
      </XStack>

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

function Row({ label, value }: { label: string; value: string }) {
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
