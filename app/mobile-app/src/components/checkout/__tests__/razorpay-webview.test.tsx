import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import {
  RazorpayWebView,
  buildRazorpayHtml,
  shouldLoadInSheet,
} from '@/components/checkout/RazorpayWebView';
import type { RazorpayOrder } from '@/hooks/useCheckout';
import { renderWithProviders } from '@/utils/test-utils';

const order = {
  payment_doc_id: 'd1',
  key_id: 'rzp_test_123',
  order_id: 'order_9',
  amount: 59000,
  currency: 'INR',
  name: 'Duncit',
  description: 'Pod booking',
  prefill_email: 'r@d.com',
  prefill_contact: '9876543210',
  currency_symbol: '₹',
  total: 590,
} as RazorpayOrder;

const message = (data: unknown) =>
  fireEvent(screen.getByTestId('razorpay-webview-frame'), 'message', {
    nativeEvent: { data: typeof data === 'string' ? data : JSON.stringify(data) },
  });

describe('buildRazorpayHtml', () => {
  it('embeds the key id, order id and checkout script', () => {
    const html = buildRazorpayHtml(order);
    expect(html).toContain('checkout.razorpay.com/v1/checkout.js');
    expect(html).toContain('rzp_test_123');
    expect(html).toContain('order_9');
  });

  it('asks Razorpay to list the phone\'s UPI apps', () => {
    expect(buildRazorpayHtml(order)).toContain('"webview_intent":true');
  });
});

describe('shouldLoadInSheet', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => openURL.mockRestore());

  it('keeps Razorpay and bank pages inside the sheet', () => {
    expect(shouldLoadInSheet({ url: 'https://api.razorpay.com/v1/payments/create/checkout' })).toBe(true);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('opens a UPI app link on the phone and keeps the sheet where it is', () => {
    expect(shouldLoadInSheet({ url: 'upi://pay?pa=merchant@icici&am=590.00' })).toBe(false);
    expect(openURL).toHaveBeenCalledWith('upi://pay?pa=merchant@icici&am=590.00');
  });

  it('turns an Android intent link into the scheme link the OS can open', () => {
    expect(
      shouldLoadInSheet({ url: 'intent://pay?pa=m@icici#Intent;scheme=upi;package=com.phonepe.app;end' }),
    ).toBe(false);
    expect(openURL).toHaveBeenCalledWith('upi://pay?pa=m@icici');
  });

  it('does not throw when no installed app can open the link', async () => {
    openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));
    expect(shouldLoadInSheet({ url: 'phonepe://pay?pa=m@icici' })).toBe(false);
    await new Promise((resolve) => setImmediate(resolve));
  });
});

describe('RazorpayWebView', () => {
  it('forwards a successful payment signature', () => {
    const onSuccess = jest.fn();
    const onFailure = jest.fn();
    renderWithProviders(
      <RazorpayWebView order={order} open onSuccess={onSuccess} onFailure={onFailure} />,
    );
    message({
      type: 'success',
      razorpay_order_id: 'order_9',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    });
    expect(onSuccess).toHaveBeenCalledWith({
      razorpay_order_id: 'order_9',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('treats a dismiss message as a cancel', () => {
    const onFailure = jest.fn();
    renderWithProviders(
      <RazorpayWebView order={order} open onSuccess={jest.fn()} onFailure={onFailure} />,
    );
    message({ type: 'dismiss' });
    expect(onFailure).toHaveBeenCalled();
  });

  it('ignores malformed messages', () => {
    const onSuccess = jest.fn();
    const onFailure = jest.fn();
    renderWithProviders(
      <RazorpayWebView order={order} open onSuccess={onSuccess} onFailure={onFailure} />,
    );
    message('not-json');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('routes navigations through the UPI hand-off', () => {
    renderWithProviders(
      <RazorpayWebView order={order} open onSuccess={jest.fn()} onFailure={jest.fn()} />,
    );
    expect(screen.getByTestId('razorpay-webview-frame').props.onShouldStartLoadWithRequest).toBe(
      shouldLoadInSheet,
    );
  });

  it('renders nothing without an order', () => {
    renderWithProviders(
      <RazorpayWebView order={null} open={false} onSuccess={jest.fn()} onFailure={jest.fn()} />,
    );
    expect(screen.queryByTestId('razorpay-webview-frame')).toBeNull();
  });
});
