import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { CheckoutSuccess, OrderSummary } from '@/components/checkout';
import { StackScreen } from '@/components/StackScreen';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import { useCheckout, type CheckoutPayment } from '@/hooks/useCheckout';
import type { RootStackParamList } from '@/navigation/types';
import { buildBreakup } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';

/** Checkout — order summary + contact/payment form running the dummy gateway.
 * RN twin of mWeb's CheckoutPage. */
export function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const podId = route.params?.podId ?? '';
  const { finance, pod, me, isLoading, pay, downloadInvoice } = useCheckout(podId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<CheckoutPayment> | null>(null);

  const amount = Number(pod?.pod_amount ?? 0);
  const breakup = buildBreakup(amount, finance);

  const submit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await pay(values, amount);
      if (result?.status === 'SUCCESS') setPayment(result);
      else setError('Payment failed. Please try again.');
    } catch (e) {
      setError(toErrorMessage(e, 'Payment failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StackScreen title="Checkout" testID="checkout-screen">
      {isLoading && !finance ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="checkout-loading" color="$primary" />
        </YStack>
      ) : !breakup ? (
        <Text testID="checkout-unavailable" padding={24} color="$muted">
          Checkout is unavailable right now. Please try again later.
        </Text>
      ) : payment ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <CheckoutSuccess
            payment={payment}
            onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
            onHome={() => navigation.navigate('Home')}
            onProfile={() => navigation.navigate('PodHistory')}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          <OrderSummary pod={pod} breakup={breakup} />
          <CheckoutForm
            initialValues={{
              email: me?.email ?? '',
              phone_extension: me?.phone_extension ?? '+91',
              phone_number: me?.phone_number ?? '',
            }}
            loading={submitting}
            errorMessage={error}
            onSubmit={submit}
          />
        </ScrollView>
      )}
    </StackScreen>
  );
}
