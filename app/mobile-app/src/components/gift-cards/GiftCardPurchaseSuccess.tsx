import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
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
 * panel only says where it went and hands over the receipt (rule 27 twin). The
 * look matches the checkout success: a green check on its tonal disc. */
export function GiftCardPurchaseSuccess({
  payment,
  recipientEmail,
  onDownloadInvoice,
  onHome,
  onMyCards,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, primary } = useThemeColors();
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
    <YStack testID="gift-card-purchase-success" alignItems="center" gap={16} paddingVertical={16}>
      <YStack
        width={80}
        height={80}
        borderRadius={40}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primarySoft"
      >
        <MaterialIcons name="check" size={44} color={primary} />
      </YStack>
      <YStack gap={8} alignItems="center">
        <TwoToneHeading lead={t('mweb.giftCards.successTitle')} align="center" />
        <Text testID="gift-card-success-body" fontSize={14} color="$muted" textAlign="center">
          {body}
        </Text>
      </YStack>
      <SurfaceCard alignSelf="stretch" gap={10}>
        <Row label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no ?? '—'} />
        <Row
          label={t('mweb.checkout.amountPaid')}
          value={formatMoney(payment.currency_symbol, payment.total)}
          bold
        />
        <Row
          label={t('mweb.checkout.paidOn')}
          value={formatDateTime(payment.paid_at ?? payment.created_at)}
        />
      </SurfaceCard>
      {error ? (
        <Text testID="gift-card-invoice-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      <YStack alignSelf="stretch" gap={10}>
        <PrimaryButton
          testID="gift-card-success-my-cards"
          label={t('mweb.giftCards.viewMyCards')}
          onPress={onMyCards}
        />
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
          height={52}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          opacity={busy ? 0.6 : 1}
          pressStyle={PRESS_STYLE.control}
        >
          {busy ? (
            <Spinner size="small" color="$color" />
          ) : (
            <MaterialIcons name="download" size={18} color={ink} />
          )}
          <Text fontSize={15} fontWeight="600" color="$color">
            {busy ? t('mweb.checkout.preparing') : invoiceLabel}
          </Text>
        </XStack>
        <DuncitButton
          testID="gift-card-success-home"
          label={t('mweb.checkout.home')}
          variant="outline"
          tone="neutral"
          size="lg"
          fullWidth
          onPress={onHome}
        />
      </YStack>
    </YStack>
  );
}

function Row({
  label,
  value,
  bold = false,
}: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" gap={12}>
      <Text fontSize={14} color="$muted">
        {label}
      </Text>
      <Text
        flexShrink={1}
        fontSize={14}
        fontWeight={bold ? '700' : '600'}
        color="$color"
        textAlign="right"
      >
        {value}
      </Text>
    </XStack>
  );
}
