import { Modal } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { YStack } from 'tamagui';

import type { RazorpayErrorLike } from '@duncit/utils';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import type { RazorpayOrder, RazorpaySignature } from '@/hooks/useCheckout';

interface Props {
  order: RazorpayOrder | null;
  open: boolean;
  onSuccess: (sig: RazorpaySignature) => void;
  /** What Razorpay said went wrong, or null when the buyer closed the sheet. */
  onFailure: (error: RazorpayErrorLike | null) => void;
}

/** Inline HTML that loads Razorpay's hosted checkout and posts the result back
 * to the app. Keeps the integration SDK-free (works in Expo Go + production). */
export function buildRazorpayHtml(order: RazorpayOrder): string {
  const options = {
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    order_id: order.order_id,
    prefill: { email: order.prefill_email, contact: order.prefill_contact },
    theme: { color: '#ff4f73' },
  };
  // The failure is posted WITH what Razorpay said, and posted ONCE. Razorpay
  // fires `payment.failed` and then `ondismiss` as the sheet closes, so
  // reporting both overwrote the real reason with "the buyer closed it" —
  // which is how a gateway timeout came to be shown as a cancellation.
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;background:#0b0b0f">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var sent = false;
  var post = function (m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var fail = function (error) { if (sent) return; sent = true; post({ type: 'failed', error: error || null }); };
  var options = ${JSON.stringify(options)};
  options.handler = function (r) { sent = true; post({ type: 'success', razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }); };
  options.modal = { ondismiss: function () { fail(null); } };
  try { var rzp = new Razorpay(options); rzp.on('payment.failed', function (r) { fail(r && r.error); }); rzp.open(); }
  catch (e) { fail({ description: String(e) }); }
</script></body></html>`;
}

/** Full-screen modal hosting the Razorpay checkout WebView. */
export function RazorpayWebView({ order, open, onSuccess, onFailure }: Readonly<Props>) {
  const onMessage = (event: WebViewMessageEvent) => {
    let data: { type?: string; error?: RazorpayErrorLike | null } & Partial<RazorpaySignature>;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (
      data.type === 'success' &&
      data.razorpay_order_id &&
      data.razorpay_payment_id &&
      data.razorpay_signature
    ) {
      onSuccess({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });
    } else {
      onFailure(data.error ?? null);
    }
  };

  return (
    <Modal
      visible={open && !!order}
      transparent
      animationType="slide"
      onRequestClose={() => onFailure(null)}
    >
      <ModalThemeScope>
        <YStack flex={1} backgroundColor="#0b0b0f" testID="razorpay-webview">
          {order ? (
            <WebView
              testID="razorpay-webview-frame"
              originWhitelist={['*']}
              javaScriptEnabled
              source={{ html: buildRazorpayHtml(order), baseUrl: 'https://checkout.razorpay.com' }}
              onMessage={onMessage}
              style={{ flex: 1, backgroundColor: '#0b0b0f' }}
            />
          ) : null}
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
