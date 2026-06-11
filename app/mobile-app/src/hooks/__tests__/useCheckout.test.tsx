import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  MobileCheckoutInvoiceDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutPodDocument,
  MobileCreateRazorpayOrderDocument,
  MobileDummyCheckoutDocument,
  MobilePreviewCouponDocument,
  MobilePublicFinanceDocument,
  MobileVerifyRazorpayDocument,
} from '@/graphql/checkout';
import { graphqlRequest } from '@/services/graphql.client';
import { useCheckout } from '@/hooks/useCheckout';
import type { CheckoutFormValues } from '@/forms/checkout';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const writeFile = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;
const share = Sharing.shareAsync as jest.Mock;

const values: CheckoutFormValues = {
  email: 'r@d.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  billing_address: '12 Main Street',
  method: 'DUMMY_UPI',
  simulate_failure: false,
};

function route(doc: unknown) {
  if (doc === MobilePublicFinanceDocument)
    return Promise.resolve({
      publicFinanceSettings: {
        platform_fee_pct: 10,
        gst_pct: 18,
        currency_symbol: '₹',
        dummy_mode: true,
      },
    });
  if (doc === MobileCheckoutMeDocument)
    return Promise.resolve({
      me: { user_id: 'u1', email: 'r@d.com', phone_number: '9', phone_extension: '+91' },
    });
  if (doc === MobileCheckoutPodDocument)
    return Promise.resolve({
      pod: { id: 'p1', pod_title: 'Pod', pod_amount: 500, pod_images_and_videos: [] },
    });
  if (doc === MobileDummyCheckoutDocument)
    return Promise.resolve({
      dummyCheckout: {
        id: 'pay1',
        invoice_no: 'INV-1',
        total: 500,
        currency_symbol: '₹',
        status: 'SUCCESS',
      },
    });
  if (doc === MobilePreviewCouponDocument)
    return Promise.resolve({
      previewCoupon: {
        ok: true,
        message: null,
        code: 'TEN',
        discount_pct: 10,
        original_total: 500,
        discount_amount: 50,
        final_total: 450,
        currency_symbol: '₹',
      },
    });
  if (doc === MobileCheckoutInvoiceDocument)
    return Promise.resolve({ paymentInvoicePdfBase64: 'B64' });
  if (doc === MobileCreateRazorpayOrderDocument)
    return Promise.resolve({
      createRazorpayOrder: {
        payment_doc_id: 'd1',
        key_id: 'rzp',
        order_id: 'order_1',
        amount: 59000,
        currency: 'INR',
        name: 'Duncit',
        description: 'desc',
        prefill_email: 'r@d.com',
        prefill_contact: '9876543210',
        currency_symbol: '₹',
        total: 590,
      },
    });
  if (doc === MobileVerifyRazorpayDocument)
    return Promise.resolve({
      verifyRazorpayPayment: {
        id: 'pay2',
        invoice_no: 'INV-2',
        total: 590,
        currency_symbol: '₹',
        status: 'SUCCESS',
      },
    });
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(route);
  writeFile.mockReset().mockResolvedValue(undefined);
  isAvailable.mockReset().mockResolvedValue(true);
  share.mockReset().mockResolvedValue(undefined);
});

describe('useCheckout', () => {
  it('loads finance, me and pod', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.finance?.gst_pct).toBe(18);
    expect(result.current.me?.email).toBe('r@d.com');
    expect(result.current.pod?.pod_title).toBe('Pod');
  });

  it('skips the pod query when no podId is given', async () => {
    const { result } = renderHook(() => useCheckout(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).not.toHaveBeenCalledWith(
      MobileCheckoutPodDocument,
      expect.anything(),
      expect.anything(),
    );
    expect(result.current.pod).toBeNull();
  });

  it('pays via the dummy gateway with the mapped input', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let payment;
    await act(async () => {
      payment = await result.current.pay(values, 500);
    });
    expect(payment).toMatchObject({ status: 'SUCCESS', invoice_no: 'INV-1' });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDummyCheckoutDocument,
      expect.objectContaining({
        input: expect.objectContaining({
          pod_id: 'p1',
          amount: 500,
          contact_email: 'r@d.com',
          billing_address: '12 Main Street',
          simulate_failure: false,
        }),
      }),
      { auth: true },
    );
  });

  it('creates a Razorpay order then verifies the signature', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let createdOrder;
    await act(async () => {
      createdOrder = await result.current.createRazorpayOrder(values, 590);
    });
    expect(createdOrder).toMatchObject({ order_id: 'order_1', key_id: 'rzp' });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCreateRazorpayOrderDocument,
      expect.objectContaining({
        input: expect.objectContaining({ pod_id: 'p1', amount: 590, contact_email: 'r@d.com' }),
      }),
      { auth: true },
    );

    let verified;
    await act(async () => {
      verified = await result.current.verifyRazorpay('d1', {
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig_1',
      });
    });
    expect(verified).toMatchObject({ status: 'SUCCESS', invoice_no: 'INV-2' });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileVerifyRazorpayDocument,
      expect.objectContaining({
        input: expect.objectContaining({ payment_doc_id: 'd1', razorpay_payment_id: 'pay_1' }),
      }),
      { auth: true },
    );
  });

  it('previews a coupon for the payment step', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let preview;
    await act(async () => {
      preview = await result.current.previewCoupon('TEN', 500);
    });
    expect(preview).toMatchObject({ ok: true, discount_amount: 50, final_total: 450 });
    expect(mockRequest).toHaveBeenCalledWith(
      MobilePreviewCouponDocument,
      expect.objectContaining({ input: expect.objectContaining({ code: 'TEN', amount: 500 }) }),
      { auth: true },
    );
  });

  it('threads the coupon code into the dummy + razorpay inputs', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay(values, 450, 'TEN');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDummyCheckoutDocument,
      expect.objectContaining({ input: expect.objectContaining({ coupon_code: 'TEN' }) }),
      { auth: true },
    );
    await act(async () => {
      await result.current.createRazorpayOrder(values, 450, 'TEN');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCreateRazorpayOrderDocument,
      expect.objectContaining({ input: expect.objectContaining({ coupon_code: 'TEN' }) }),
      { auth: true },
    );
  });

  it('downloads the invoice via the share sheet', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.downloadInvoice('pay1', 'INV/1');
    });
    expect(writeFile).toHaveBeenCalledWith('file:///cache/invoice-INV-1.pdf', 'B64', {
      encoding: 'base64',
    });
    expect(share).toHaveBeenCalled();
  });

  it('throws when the invoice base64 is empty', async () => {
    mockRequest.mockImplementation((doc) =>
      doc === MobileCheckoutInvoiceDocument
        ? Promise.resolve({ paymentInvoicePdfBase64: '' })
        : route(doc),
    );
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.downloadInvoice('pay1', 'INV-1')).rejects.toThrow(
        'Invoice not available',
      );
    });
  });

  it('tolerates a load failure and still settles', async () => {
    mockRequest
      .mockReset()
      .mockImplementation((doc) =>
        doc === MobileCheckoutMeDocument ? Promise.reject(new Error('down')) : route(doc),
      );
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toBeNull();
  });

  it('maps a null pod id and the default description when no pod is loaded', async () => {
    const { result } = renderHook(() => useCheckout(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay(values, 100);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDummyCheckoutDocument,
      expect.objectContaining({
        input: expect.objectContaining({
          pod_id: null,
          description: 'Pod booking · Booking',
        }),
      }),
      { auth: true },
    );
  });

  it('previews a coupon with a null pod id when none is set', async () => {
    const { result } = renderHook(() => useCheckout(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.previewCoupon('TEN', 100);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobilePreviewCouponDocument,
      expect.objectContaining({ input: expect.objectContaining({ pod_id: null }) }),
      { auth: true },
    );
  });

  it('throws when sharing is unavailable for the invoice', async () => {
    isAvailable.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.downloadInvoice('pay1', 'INV-1')).rejects.toThrow(
        'Sharing is not available',
      );
    });
  });
});
