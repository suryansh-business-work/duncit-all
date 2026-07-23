import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  MobileAvailableCouponsDocument,
  MobileCheckoutInvoiceDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutSaveAddressDocument,
  MobilePreviewCouponDocument,
  MobilePublicFinanceDocument,
  MobileVerifyRazorpayDocument,
} from '@/graphql/checkout';
import {
  MobileCreateRazorpayProductOrderDocument,
  MobileDummyProductCheckoutDocument,
} from '@/graphql/productCheckout';
import { graphqlRequest } from '@/services/graphql.client';
import { useProductCheckout } from '@/hooks/useProductCheckout';
import type { CheckoutFormValues } from '@/forms/checkout';
import type { ProductCartItemInput } from '@/generated/graphql/graphql';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const isAvailable = Sharing.isAvailableAsync as jest.Mock;

const items: ProductCartItemInput[] = [{ product_id: 'a', pod_id: 'p1', quantity: 2 }];
const ctx = { items, podTitle: 'Sunset Jam', couponCode: null };

const values: CheckoutFormValues = {
  full_name: 'Riya Sharma',
  email: 'r@d.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  same_as_main: false,
  line1: '12 Main Street',
  line2: 'Apt 4',
  landmark: 'Near Park',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
  billing_email: '',
  has_gstin: false,
  gstin: '',
  save_as_main: false,
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
  if (doc === MobileAvailableCouponsDocument)
    return Promise.resolve({
      availableCouponsForPod: [
        {
          id: 'c1',
          code: 'SAVE20',
          description: '',
          discount_pct: 20,
          min_order_amount: 0,
          scope: 'GLOBAL',
        },
      ],
    });
  if (doc === MobileDummyProductCheckoutDocument)
    return Promise.resolve({
      dummyProductCheckout: {
        id: 'pay1',
        invoice_no: 'INV-1',
        total: 200,
        currency_symbol: '₹',
        status: 'SUCCESS',
      },
    });
  if (doc === MobileCreateRazorpayProductOrderDocument)
    return Promise.resolve({
      createRazorpayProductOrder: {
        payment_doc_id: 'd1',
        key_id: 'rzp',
        order_id: 'order_1',
        amount: 20000,
        currency: 'INR',
        name: 'Duncit',
        description: 'desc',
        prefill_email: 'r@d.com',
        prefill_contact: '9876543210',
        currency_symbol: '₹',
        total: 200,
      },
    });
  if (doc === MobileVerifyRazorpayDocument)
    return Promise.resolve({
      verifyRazorpayPayment: {
        id: 'pay2',
        invoice_no: 'INV-2',
        total: 200,
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
        original_total: 200,
        discount_amount: 20,
        final_total: 180,
        currency_symbol: '₹',
      },
    });
  if (doc === MobileCheckoutInvoiceDocument)
    return Promise.resolve({ paymentInvoicePdfBase64: 'B64' });
  return Promise.resolve({});
}

beforeEach(() => {
  mockRequest.mockReset().mockImplementation(route);
  (FileSystem.writeAsStringAsync as jest.Mock).mockReset().mockResolvedValue(undefined);
  isAvailable.mockReset().mockResolvedValue(true);
  (Sharing.shareAsync as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('useProductCheckout', () => {
  it('loads finance, me and the available coupons', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.finance?.gst_pct).toBe(18);
    expect(result.current.me?.email).toBe('r@d.com');
    expect(result.current.availableCoupons).toHaveLength(1);
    expect(result.current.initialValues.country).toBe('India');
  });

  it('scopes the coupon lookup to no pod when the podId is empty', async () => {
    const { result } = renderHook(() => useProductCheckout(''));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest).toHaveBeenCalledWith(
      MobileAvailableCouponsDocument,
      { pod_id: null },
      { auth: true },
    );
  });

  it('tolerates an available-coupons fetch failure and still settles', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileAvailableCouponsDocument) return Promise.reject(new Error('down'));
      return route(doc);
    });
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.availableCoupons).toEqual([]);
  });

  it('tolerates a load failure and still settles', async () => {
    mockRequest
      .mockReset()
      .mockImplementation((doc) =>
        doc === MobileCheckoutMeDocument ? Promise.reject(new Error('down')) : route(doc),
      );
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.me).toBeNull();
  });

  it('pays via the product dummy engine with the mapped input', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let payment;
    await act(async () => {
      payment = await result.current.payProduct(values, ctx);
    });
    expect(payment).toMatchObject({ status: 'SUCCESS', invoice_no: 'INV-1' });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileDummyProductCheckoutDocument);
    expect(call![1].input).toMatchObject({
      items,
      description: 'Product order · Sunset Jam',
      delivery_pincode: '411001',
      simulate_failure: false,
    });
    expect(call![1].input.shipping_address).toMatchObject({ line1: '12 Main Street' });
  });

  it('creates a Razorpay product order then verifies the signature', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let order;
    await act(async () => {
      order = await result.current.createRazorpayProductOrder(values, ctx);
    });
    expect(order).toMatchObject({ order_id: 'order_1', key_id: 'rzp' });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCreateRazorpayProductOrderDocument,
      expect.objectContaining({ input: expect.objectContaining({ items }) }),
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
  });

  it('threads the applied coupon into the product input', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.payProduct(values, { ...ctx, couponCode: 'TEN' });
    });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileDummyProductCheckoutDocument);
    expect(call![1].input.coupon_code).toBe('TEN');
  });

  it('previews a coupon scoped to the pod', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let preview;
    await act(async () => {
      preview = await result.current.previewCoupon('TEN', 200);
    });
    expect(preview).toMatchObject({ ok: true, final_total: 180 });
    expect(mockRequest).toHaveBeenCalledWith(
      MobilePreviewCouponDocument,
      expect.objectContaining({ input: expect.objectContaining({ pod_id: 'p1', amount: 200 }) }),
      { auth: true },
    );
  });

  it('saves the entered address as the main address when opted in', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createRazorpayProductOrder({ ...values, save_as_main: true }, ctx);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCheckoutSaveAddressDocument,
      expect.objectContaining({
        input: { address: expect.objectContaining({ line1: '12 Main Street' }) },
      }),
      { auth: true },
    );
  });

  it('downloads the invoice via the share sheet', async () => {
    const { result } = renderHook(() => useProductCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.downloadInvoice('pay1', 'INV/1');
    });
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/invoice-INV-1.pdf',
      'B64',
      { encoding: 'base64' },
    );
    expect(Sharing.shareAsync).toHaveBeenCalled();
  });
});
