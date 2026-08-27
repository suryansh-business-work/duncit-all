import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import type { GiftCardPayment } from '@/hooks/useGiftCardCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { formatDateTime } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  payment: NonNullable<GiftCardPayment>;
  /** The recipient the card was emailed to; empty when the buyer kept it. */
  recipientEmail: string;
  onDownloadInvoice: () => Promise<void>;
  onHome: () => void;
  onMyCards: () => void;
}

/** Purchase success — the card is created and emailed by the server, so this
 * panel only says where it went and hands over the receipt (rule 27 twin). */
export function GiftCardPurchaseSuccess({
  payment,
  recipientEmail,
  onDownloadInvoice,
  onHome,
  onMyCards,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary, primary } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invoiceLabel = t('mweb.checkout.downloadInvoice');
  const body = recipientEmail
    ? t('mweb.giftCards.successGiftBody', { vars: { email: recipientEmail } })
    : t('mweb.giftCards.successSelfBody');

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

  return (
    <YStack testID="gift-card-purchase-success" alignItems="center" gap={14} padding={20}>
      <MaterialIcons name="check-circle" size={64} color={semantic.success} />
      <Text fontSize={20} fontWeight="700" color="$color" textAlign="center">
        {t('mweb.giftCards.successTitle')}
      </Text>
      <Text testID="gift-card-success-body" fontSize={13.5} color="$muted" textAlign="center">
        {body}
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
      {error ? (
        <Text testID="gift-card-invoice-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack
        testID="gift-card-download-invoice"
        role="button"
        aria-label={invoiceLabel}
        aria-disabled={busy}
        onPress={
          busy
            ? undefined
            : () => {
                download().catch(() => undefined);
              }
        }
        alignItems="center"
        justifyContent="center"
        gap={8}
        alignSelf="stretch"
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$primary"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? (
          <Spinner size="small" color="$primary" />
        ) : (
          <MaterialIcons name="download" size={18} color={primary} />
        )}
        <Text fontSize={14} fontWeight="600" color="$primary">
          {busy ? t('mweb.checkout.preparing') : invoiceLabel}
        </Text>
      </XStack>
      <XStack gap={10} alignSelf="stretch">
        <XStack
          testID="gift-card-success-home"
          role="button"
          aria-label={t('mweb.checkout.home')}
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
          testID="gift-card-success-my-cards"
          role="button"
          aria-label={t('mweb.giftCards.viewMyCards')}
          onPress={onMyCards}
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
            {t('mweb.giftCards.viewMyCards')}
          </Text>
        </XStack>
      </XStack>
    </YStack>
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
