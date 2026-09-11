import { useState } from 'react';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmationPodCard } from '@/components/checkout/ConfirmationPodCard';
import { ActionButton, Row } from '@/components/checkout/SuccessParts';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
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

/** Payment success view — a calm success mark, the receipt, the booked pod,
 * ticket + invoice download and navigation. RN twin of mWeb's CheckoutSuccess. */
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
  const { primary, muted } = useThemeColors();
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
    <YStack testID="checkout-success" alignItems="center" gap={16} paddingVertical={12}>
      <YStack
        width={96}
        height={96}
        borderRadius={48}
        backgroundColor="$primarySoft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="check-circle" size={56} color={primary} />
      </YStack>
      <TwoToneHeading
        lead={t('mweb.checkout.successTitle')}
        trail={t('mweb.checkout.successOverline')}
        stacked
        align="center"
      />
      <Text fontSize={14} color="$muted" textAlign="center">
        {t('mweb.checkout.successSubtitle')}
      </Text>
      <SurfaceCard alignSelf="stretch" gap={10}>
        <Row
          label={t('mweb.checkout.amountPaid')}
          value={formatMoney(payment.currency_symbol, payment.total)}
          bold
        />
        <YStack height={1} backgroundColor="$borderColor" />
        <Row
          label={t('mweb.checkout.paidOn')}
          value={formatDateTime(payment.paid_at ?? payment.created_at)}
        />
        <YStack height={1} backgroundColor="$borderColor" />
        <Row label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no ?? '—'} />
      </SurfaceCard>

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
          height={48}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="600" color="$color">
            {t('mweb.checkout.home')}
          </Text>
        </XStack>
        <XStack
          testID="success-profile"
          role="button"
          aria-label={t('mweb.checkout.viewBookings')}
          onPress={onProfile}
          flex={1}
          height={48}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {profileAction}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
