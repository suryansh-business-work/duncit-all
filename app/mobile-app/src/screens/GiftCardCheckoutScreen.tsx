import { useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { ProcessingOverlay, RazorpayWebView } from '@/components/checkout';
import { GiftCardPurchaseSuccess, GiftCardVisual } from '@/components/gift-cards';
import { GiftCardTotalCard } from '@/components/gift-cards/GiftCardTotalCard';
import {
  GiftCardDeliveryAddress,
  useGiftCardDeliveryForm,
} from '@/components/gift-cards/GiftCardDeliveryAddress';
import { GiftCardScopeType } from '@/generated/graphql/graphql';
import { giftCardPurchaseTotals } from '@duncit/forms/schemas';
import { PaymentFailureDialog, usePaymentFailure } from '@/components/payment-failure';
import { StackScreen } from '@/components/StackScreen';
import { useLoadingRegion } from '@/components/Skeleton';
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
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Gift card checkout — the total (every card at face value, plus the delivery
 * fee once on a printed order), the delivery address for printed cards, and the
 * contact form, through the dedicated gift-card payment engine (no coupons or
 * coins). RN twin of mWeb's /gift-cards/checkout (rule 27). */
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
  const loadingRegion = useLoadingRegion();

  const currency = finance?.currency_symbol ?? '';
  const printed = selection.delivery_mode === 'PHYSICAL';
  const totals = giftCardPurchaseTotals(
    {
      amount: String(selection.amount),
      quantity: String(selection.quantity),
      delivery_mode: selection.delivery_mode,
    },
    selection.shipping_fee,
  );
  const totalLabel = formatMoney(currency, totals.total);
  const deliveryForm = useGiftCardDeliveryForm(me);
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const forWhom = printed
    ? t('mweb.giftCards.checkoutPrinted')
    : selection.recipient_email || t('mweb.giftCards.checkoutSelf');
  const paymentFailure = usePaymentFailure(() => ({
    description: t('mweb.giftCards.checkoutTitle'),
    amount: totals.total,
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
    // A printed order needs a courier-ready address before any money moves.
    if (printed && !(await deliveryForm.trigger())) {
      setError(t('mweb.giftCards.deliveryAddressHint'));
      return;
    }
    const shipTo = printed ? deliveryForm.getValues() : null;
    setSubmitting(true);
    setError(null);
    try {
      if (razorpayEnabled) {
        setOrder(await createRazorpayGiftCardOrder(values, shipTo));
        return;
      }
      if (dummyMode) {
        const result = await pay(values, shipTo);
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
      <RefreshScrollView contentContainerStyle={{ padding: 16 }}>
        <GiftCardPurchaseSuccess
          payment={payment}
          recipientEmail={selection.recipient_email}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onHome={() => navigation.navigate('Home')}
          onMyCards={() => navigation.navigate('GiftCards')}
          printed={printed}
        />
      </RefreshScrollView>
    );
  } else if (isLoading && !finance) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="gift-card-checkout-loading" color="$primary" {...loadingRegion} />
      </YStack>
    );
  } else {
    body = (
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <GiftCardVisual
          theme={{
            scope_type: GiftCardScopeType.Shop,
            scope_name: '',
            design_name: selection.design_name,
          }}
          imageUrl=""
          artworkFrontUrl={selection.front_url}
          artworkBackUrl={selection.back_url}
          amountLabel={formatMoney(currency, selection.amount)}
          minHeight={180}
        />
        <Text testID="gift-card-checkout-recipient" fontSize={13} color="$muted">
          {t('mweb.giftCards.checkoutFor', { vars: { who: forWhom } })}
        </Text>
        <GiftCardTotalCard totals={totals} currency={currency} />
        <Text fontSize={12} color="$muted">
          {printed ? t('mweb.giftCards.checkoutNotePrinted') : t('mweb.giftCards.checkoutNote')}
        </Text>
        {printed ? <GiftCardDeliveryAddress control={deliveryForm.control} /> : null}
        <CheckoutForm
          initialValues={initialValues}
          mainAddress={me?.address ?? null}
          contact={buildCheckoutContact(me)}
          contactLoading={isLoading && !me}
          loading={submitting}
          errorMessage={error}
          dummyMode={dummyMode}
          payLabel={t('mweb.giftCards.payCta', { vars: { amount: totalLabel } })}
          onSubmit={submit}
        />
      </RefreshScrollView>
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
