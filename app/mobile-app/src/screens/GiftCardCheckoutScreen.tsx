import { useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ProcessingOverlay, RazorpayWebView } from '@/components/checkout';
import { GiftCardPurchaseSuccess, GiftCardVisual } from '@/components/gift-cards';
import { PaymentFailureDialog, usePaymentFailure } from '@/components/payment-failure';
import { StackScreen } from '@/components/StackScreen';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import {
  buildCheckoutContact,
  type RazorpayOrder,
  type RazorpaySignature,
} from '@/hooks/useCheckout';
import { useGiftCardCheckout, type GiftCardPayment } from '@/hooks/useGiftCardCheckout';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { formatMoney } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';

function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" gap={10}>
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text flex={1} fontSize={13} fontWeight="600" color="$color" textAlign="right">
        {value}
      </Text>
    </XStack>
  );
}

/** Gift card checkout — summary + contact form, charged at face value through
 * the dedicated gift-card payment engine (no coupons, coins or fees). RN twin
 * of mWeb's /gift-cards/checkout (rule 27). */
export function GiftCardCheckoutScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GiftCardCheckout'>>();
  const selection = route.params.selection;
  const {
    finance,
    me,
    initialValues,
    isLoading,
    pay,
    createRazorpayGiftCardOrder,
    verifyRazorpay,
    confirmingMessage,
    downloadInvoice,
  } = useGiftCardCheckout(selection);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<GiftCardPayment> | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);

  const currency = finance?.currency_symbol ?? '';
  const amountLabel = formatMoney(currency, selection.amount);
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const themeLabel = selection.scope_name || t('mweb.giftCards.shopTheme');
  const recipientLabel = selection.recipient_email || t('mweb.giftCards.checkoutSelf');
  const paymentFailure = usePaymentFailure(() => ({
    description: t('mweb.giftCards.checkoutTitle'),
    amount: selection.amount,
    currencySymbol: currency,
    paymentDocId: order?.payment_doc_id ?? null,
  }));

  const finishVerify = async (sig: RazorpaySignature) => {
    /* istanbul ignore next -- the Razorpay sheet only mounts when an order exists */
    if (!order) return;
    setOrder(null);
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyRazorpay(order.payment_doc_id, sig);
      if (result?.status === 'SUCCESS') setPayment(result);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorNotVerified')));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      if (razorpayEnabled) {
        setOrder(await createRazorpayGiftCardOrder(values));
        return;
      }
      if (dummyMode) {
        const result = await pay(values);
        if (result?.status === 'SUCCESS') setPayment(result);
        else setError(t('mweb.giftCards.failureBody'));
        return;
      }
      setError(t('mweb.checkout.errorNotConfigured'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.giftCards.failureBody')));
    } finally {
      setSubmitting(false);
    }
  };

  let body: ReactNode;
  if (payment) {
    body = (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <GiftCardPurchaseSuccess
          payment={payment}
          recipientEmail={selection.recipient_email}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onHome={() => navigation.navigate('Home')}
          onMyCards={() => navigation.navigate('GiftCards')}
        />
      </ScrollView>
    );
  } else if (isLoading && !finance) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="gift-card-checkout-loading" color="$primary" />
      </YStack>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <GiftCardVisual
          theme={selection}
          imageUrl={selection.scope_image_url}
          artworkFrontUrl={selection.scope_image_front_url}
          artworkBackUrl={selection.scope_image_back_url}
          amountLabel={amountLabel}
        />
        <YStack
          gap={6}
          padding={14}
          borderRadius={14}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <SummaryRow label={t('mweb.giftCards.checkoutTheme')} value={themeLabel} />
          <SummaryRow label={t('mweb.giftCards.checkoutAmount')} value={amountLabel} />
          <SummaryRow label={t('mweb.giftCards.checkoutRecipient')} value={recipientLabel} />
          <SummaryRow label={t('mweb.giftCards.checkoutTotal')} value={amountLabel} />
          <Text fontSize={11.5} color="$muted">
            {t('mweb.giftCards.checkoutNote')}
          </Text>
        </YStack>
        <CheckoutForm
          initialValues={initialValues}
          mainAddress={me?.address ?? null}
          contact={buildCheckoutContact(me)}
          contactLoading={isLoading && !me}
          loading={submitting}
          errorMessage={error}
          dummyMode={dummyMode}
          payLabel={t('mweb.giftCards.payCta', { vars: { amount: amountLabel } })}
          onSubmit={submit}
        />
      </ScrollView>
    );
  }

  return (
    <StackScreen title={t('mweb.giftCards.checkoutTitle')} testID="gift-card-checkout-screen">
      {body}
      <RazorpayWebView
        order={order}
        open={!!order}
        onSuccess={finishVerify}
        onFailure={(failureError) => {
          setOrder(null);
          paymentFailure.report(failureError).catch(() => undefined);
        }}
      />
      <PaymentFailureDialog
        failure={paymentFailure.failure}
        ticketNo={paymentFailure.ticketNo}
        ticketPending={paymentFailure.ticketPending}
        ticketFailed={paymentFailure.ticketFailed}
        onClose={paymentFailure.dismiss}
        onRetry={() => {
          paymentFailure.dismiss();
          setError(null);
        }}
      />
      <ProcessingOverlay open={submitting} message={confirmingMessage} />
    </StackScreen>
  );
}
