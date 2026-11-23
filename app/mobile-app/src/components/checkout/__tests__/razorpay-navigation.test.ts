import {
  externalUrlFor,
  isExternalPaymentUrl,
  schemeOf,
} from '@/components/checkout/razorpayNavigation';

describe('schemeOf', () => {
  it('reads the scheme case-insensitively', () => {
    expect(schemeOf('UPI://pay?pa=x@ybl')).toBe('upi');
    expect(schemeOf('  https://api.razorpay.com/v1/checkout')).toBe('https');
  });

  it('answers empty for a relative or schemeless url', () => {
    expect(schemeOf('/v1/checkout')).toBe('');
    expect(schemeOf('')).toBe('');
  });
});

describe('isExternalPaymentUrl', () => {
  it.each([
    'upi://pay?pa=merchant@icici&am=590.00',
    'intent://pay?pa=merchant@icici#Intent;scheme=upi;package=com.phonepe.app;end',
    'phonepe://pay?pa=merchant@icici',
    'tez://upi/pay?pa=merchant@icici',
    'paytmmp://pay?pa=merchant@icici',
  ])('hands %s to the phone', (url) => {
    expect(isExternalPaymentUrl(url)).toBe(true);
  });

  it.each([
    'https://api.razorpay.com/v1/payments/create/checkout',
    'http://bank.example/acs',
    'about:blank',
    'data:text/html,<p>x</p>',
    '/relative/path',
  ])('keeps %s inside the sheet', (url) => {
    expect(isExternalPaymentUrl(url)).toBe(false);
  });
});

describe('externalUrlFor', () => {
  it('rebuilds an Android intent link as the scheme link the UPI app answers', () => {
    expect(
      externalUrlFor(
        'intent://pay?pa=merchant@icici&am=590.00#Intent;scheme=upi;package=com.phonepe.app;end',
      ),
    ).toBe('upi://pay?pa=merchant@icici&am=590.00');
  });

  it('leaves an intent link with no scheme, or no Intent fragment, as it was', () => {
    const noScheme = 'intent://pay?pa=x#Intent;package=com.phonepe.app;end';
    expect(externalUrlFor(noScheme)).toBe(noScheme);
    expect(externalUrlFor('intent://pay?pa=x')).toBe('intent://pay?pa=x');
  });

  it('returns any other link unchanged', () => {
    expect(externalUrlFor('upi://pay?pa=x@ybl')).toBe('upi://pay?pa=x@ybl');
  });
});
