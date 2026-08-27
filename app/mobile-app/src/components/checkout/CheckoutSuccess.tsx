import { useState } from 'react';

import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { ConfirmationPodCard } from '@/components/checkout/ConfirmationPodCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CheckoutPayment, CheckoutPod } from '@/hooks/useCheckout';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface CheckoutSuccessProps {
  payment: NonNullable<CheckoutPayment>;
  pod?: CheckoutPod;
  onDownloadInvoice: () => Promise<void>;
  onDownloadTicket?: () => Promise<void>;
  onHome: () => void;
  onProfile: () => void;
  /** Label for the secondary action (defaults to "My bookings"; the product
   * checkout routes to "My orders"). */
  profileLabel?: string;
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
  profileLabel,
}: Readonly<CheckoutSuccessProps>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  const profileAction = profileLabel ?? t('mweb.checkout.myBookings');
  const invoiceLabel = t('mweb.checkout.downloadInvoice');
  const [busy, setBusy] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const venueTotal = (pod?.place_charges ?? []).reduce((sum, charge) => sum + charge.amount, 0);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDownloadInvoice();
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorInvoiceDownload')));
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
      setError(toErrorMessage(e, t('mweb.checkout.errorTicketDownload')));
    } finally {
      setTicketBusy(false);
    }
  };

  return (
    <YStack testID="checkout-success" alignItems="center" gap={14} padding={20}>
      <MaterialIcons name="check-circle" size={64} color={semantic.success} />
      <Text fontSize={20} fontWeight="700" color="$color" textAlign="center">
        {t('mweb.checkout.successTitle')}
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
        <Row label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no ?? '—'} />
        <Row
          label={t('mweb.checkout.amountPaid')}
          value={formatMoney(payment.currency_symbol, payment.total)}
        />
        <Row
          label={t('mweb.checkout.paidOn')}
          value={formatDateTime(payment.paid_at ?? payment.created_at)}
        />
      </YStack>

      {pod ? <ConfirmationPodCard pod={pod} /> : null}

      {venueTotal > 0 ? (
        <XStack testID="success-venue-note" alignItems="center" gap={6} alignSelf="stretch">
          <MaterialIcons name="storefront" size={16} color={muted} />
          <Text fontSize={12} color="$muted" flex={1}>
            {t('mweb.checkout.venueChargesPaid', {
              vars: { amount: formatMoney(payment.currency_symbol, venueTotal) },
            })}
          </Text>
        </XStack>
      ) : null}

      {error ? (
        <Text testID="invoice-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}

      {onDownloadTicket ? (
        <ActionButton
          testID="download-ticket"
          ariaLabel={t('mweb.ticket.download')}
          busy={ticketBusy}
          onPress={() => void downloadTicket()}
          label={t('mweb.ticket.download')}
          iconName="confirmation-number"
          variant="filled"
        />
      ) : null}

      <ActionButton
        testID="download-invoice"
        ariaLabel={invoiceLabel}
        busy={busy}
        onPress={() => void download()}
        label={invoiceLabel}
        iconName="download"
        variant="outlined"
      />

      <XStack gap={10} alignSelf="stretch">
        <XStack
          testID="success-home"
          role="button"
          aria-label={t('mweb.checkout.goHome')}
          onPress={onHome}
          flex={1}
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="700" color={onPrimary}>
            {t('mweb.checkout.home')}
          </Text>
        </XStack>
        <XStack
          testID="success-profile"
          role="button"
          aria-label={t('mweb.checkout.viewBookings')}
          onPress={onProfile}
          flex={1}
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="700" color="$color">
            {profileAction}
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
  const { t } = useTranslation();
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
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner size="small" color={filled ? onPrimary : '$primary'} />
      ) : (
        <MaterialIcons name={iconName} size={18} color={filled ? onPrimary : primary} />
      )}
      <Text
        fontSize={14}
        fontWeight={filled ? '700' : '600'}
        color={filled ? onPrimary : '$primary'}
      >
        {busy ? t('mweb.checkout.preparing') : label}
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
      <Text fontSize={13} fontWeight="600" color="$color">
        {value}
      </Text>
    </XStack>
  );
}
