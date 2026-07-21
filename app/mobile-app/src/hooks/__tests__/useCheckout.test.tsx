import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  MobileAvailableCouponsDocument,
  MobileCheckoutInvoiceDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutPodDocument,
  MobileCheckoutSaveAddressDocument,
  MobileCreateRazorpayOrderDocument,
  MobileDummyCheckoutDocument,
  MobilePreviewCouponDocument,
  MobilePublicFinanceDocument,
  MobileVerifyRazorpayDocument,
} from '@/graphql/checkout';
import { graphqlRequest } from '@/services/graphql.client';
import {
  buildCheckoutBilling,
  buildCheckoutContact,
  buildCheckoutInitialValues,
  sumSelectedProducts,
  useCheckout,
  type CheckoutMe,
} from '@/hooks/useCheckout';
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
  it('loads finance, me, pod and available coupons', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.finance?.gst_pct).toBe(18);
    expect(result.current.me?.email).toBe('r@d.com');
    expect(result.current.pod?.pod_title).toBe('Pod');
    expect(result.current.availableCoupons).toHaveLength(1);
  });

  it('tolerates an available-coupons fetch failure', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileAvailableCouponsDocument) return Promise.reject(new Error('down'));
      return route(doc);
    });
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.availableCoupons).toEqual([]);
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
          contact_name: 'Riya Sharma',
          contact_email: 'r@d.com',
          billing: expect.objectContaining({ line1: '12 Main Street', city: 'Pune' }),
          simulate_failure: false,
        }),
      }),
      { auth: true },
    );
    const dummyCall = mockRequest.mock.calls.find((c) => c[0] === MobileDummyCheckoutDocument);
    expect('billing_address' in dummyCall![1].input).toBe(false);
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

  it('defaults same-as-main off when there is no saved main address', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues.same_as_main).toBe(false);
    expect(result.current.initialValues.country).toBe('India');
  });

  it('prefills initial values from the saved main address', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileCheckoutMeDocument)
        return Promise.resolve({
          me: {
            user_id: 'u1',
            first_name: 'Riya',
            last_name: 'Sharma',
            email: 'r@d.com',
            phone_number: '9876543210',
            phone_extension: '+91',
            address: {
              line1: '9 Palm Road',
              line2: 'Flat 2',
              landmark: 'Near Lake',
              city: 'Delhi',
              state: 'Delhi',
              pincode: '110001',
              country: 'India',
            },
          },
        });
      return route(doc);
    });
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues).toMatchObject({
      full_name: 'Riya Sharma',
      same_as_main: true,
      line1: '9 Palm Road',
      city: 'Delhi',
    });
  });

  it('saves the entered address as the main address when opted in', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay({ ...values, save_as_main: true }, 500);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCheckoutSaveAddressDocument,
      {
        input: { address: expect.objectContaining({ line1: '12 Main Street', country: 'India' }) },
      },
      { auth: true },
    );
  });

  it('defaults the saved address country to India when left empty', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay({ ...values, save_as_main: true, country: '' }, 500);
    });
    const saveCall = mockRequest.mock.calls.find((c) => c[0] === MobileCheckoutSaveAddressDocument);
    expect(saveCall![1].input.address.country).toBe('India');
  });

  it('does not save the main address on a normal pay', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay(values, 500);
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      MobileCheckoutSaveAddressDocument,
      expect.anything(),
      expect.anything(),
    );
  });

  it('defaults selected products to an empty list and a zero add-on total', async () => {
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.productTotal).toBe(0);
    await act(async () => {
      await result.current.pay(values, 500);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDummyCheckoutDocument,
      expect.objectContaining({ input: expect.objectContaining({ selected_products: [] }) }),
      { auth: true },
    );
  });

  it('sends the selected products on both the dummy + razorpay inputs', async () => {
    const selected = [{ product_id: 'pr1', quantity: 2 }];
    const { result } = renderHook(() => useCheckout('p1', selected));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay(values, 900);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDummyCheckoutDocument,
      expect.objectContaining({ input: expect.objectContaining({ selected_products: selected }) }),
      { auth: true },
    );
    await act(async () => {
      await result.current.createRazorpayOrder(values, 900);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      MobileCreateRazorpayOrderDocument,
      expect.objectContaining({ input: expect.objectContaining({ selected_products: selected }) }),
      { auth: true },
    );
  });

  it('passes the chosen variant, strips client-only pricing, and ships to the entered address', async () => {
    const selected = [
      { product_id: 'pr1', variant_id: 'v1', quantity: 1, unit_cost: 240 },
      { product_id: 'pr2', variant_id: '', quantity: 2, unit_cost: 100 },
    ];
    const { result } = renderHook(() => useCheckout('p1', selected));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay(values, 900);
    });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileDummyCheckoutDocument);
    const input = call![1].input;
    // variant_id rides along; unit_cost (display-only) and empty variant ids are stripped.
    expect(input.selected_products).toEqual([
      { product_id: 'pr1', variant_id: 'v1', quantity: 1 },
      { product_id: 'pr2', quantity: 2 },
    ]);
    // The delivery address mirrors the entered billing fields + contact.
    expect(input.shipping_address).toMatchObject({
      name: values.full_name,
      line1: values.line1,
      city: values.city,
      pincode: values.pincode,
      country: values.country || 'India',
    });

    // Defensive: a missing entered line1 still ships a well-formed address.
    await act(async () => {
      await result.current.pay({ ...values, line1: undefined as unknown as string }, 900);
    });
    const last = mockRequest.mock.calls.filter((c) => c[0] === MobileDummyCheckoutDocument).pop();
    expect(last![1].input.shipping_address.line1).toBe('');
  });

  it('ships to the saved main address when "same as main" is on', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileCheckoutMeDocument)
        return Promise.resolve({
          me: {
            user_id: 'u1',
            email: 'r@d.com',
            phone_number: '9876543210',
            phone_extension: '+91',
            // A sparse saved address exercises the per-field '' fallbacks too.
            address: { line1: '9 Palm Road' },
          },
        });
      return route(doc);
    });
    const { result } = renderHook(() => useCheckout('p1', [{ product_id: 'pr1', quantity: 1 }]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay({ ...values, same_as_main: true }, 900);
    });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileDummyCheckoutDocument);
    expect(call![1].input.shipping_address).toMatchObject({
      line1: '9 Palm Road',
      line2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
  });

  it('falls back to the entered fields when "same as main" is on with no saved address', async () => {
    const { result } = renderHook(() => useCheckout('p1', [{ product_id: 'pr1', quantity: 1 }]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay({ ...values, same_as_main: true }, 900);
    });
    const call = mockRequest.mock.calls.find((c) => c[0] === MobileDummyCheckoutDocument);
    expect(call![1].input.shipping_address.line1).toBe('12 Main Street');
  });

  it('computes the product add-on total from the pod catalogue', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileCheckoutPodDocument)
        return Promise.resolve({
          pod: {
            id: 'p1',
            pod_title: 'Pod',
            pod_amount: 500,
            pod_images_and_videos: [],
            product_requests: [
              { product_id: 'pr1', product_name: 'Tee', unit_cost: 200 },
              { product_id: 'pr2', product_name: 'Cap', unit_cost: 50 },
            ],
          },
        });
      return route(doc);
    });
    const { result } = renderHook(() =>
      useCheckout('p1', [
        { product_id: 'pr1', quantity: 2 },
        { product_id: 'missing', quantity: 3 },
      ]),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // pr1 200×2 = 400; an unknown id contributes nothing.
    expect(result.current.productTotal).toBe(400);
  });

  it('skips saving when opted in but a main address already exists', async () => {
    mockRequest.mockReset().mockImplementation((doc: unknown) => {
      if (doc === MobileCheckoutMeDocument)
        return Promise.resolve({
          me: { user_id: 'u1', email: 'r@d.com', address: { line1: '9 Palm Road', city: 'Delhi' } },
        });
      return route(doc);
    });
    const { result } = renderHook(() => useCheckout('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.pay({ ...values, save_as_main: true }, 500);
    });
    expect(mockRequest).not.toHaveBeenCalledWith(
      MobileCheckoutSaveAddressDocument,
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('buildCheckoutInitialValues', () => {
  it('returns empty defaults when there is no user', () => {
    expect(buildCheckoutInitialValues(null)).toMatchObject({
      full_name: '',
      same_as_main: false,
      line1: '',
      country: 'India',
    });
  });

  it('seeds contact + address from the loaded user', () => {
    const me = {
      first_name: 'Riya',
      last_name: 'Sharma',
      email: 'r@d.com',
      phone_extension: '+91',
      phone_number: '9876543210',
      address: {
        line1: 'A',
        line2: 'B',
        landmark: 'C',
        city: 'D',
        state: 'E',
        pincode: 'F',
        country: 'IN',
      },
    } as unknown as CheckoutMe;
    expect(buildCheckoutInitialValues(me)).toMatchObject({
      full_name: 'Riya Sharma',
      same_as_main: true,
      line1: 'A',
      country: 'IN',
    });
  });
});

describe('buildCheckoutBilling', () => {
  const mainAddress = {
    line1: 'Main St 1',
    line2: 'L2',
    landmark: 'LM',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    country: 'India',
  };

  it('uses the entered fields when not same-as-main (no gstin/email)', () => {
    const billing = buildCheckoutBilling(values, mainAddress);
    expect(billing).toMatchObject({ line1: '12 Main Street', city: 'Pune' });
    expect(billing.gstin).toBeUndefined();
    expect(billing.email).toBeUndefined();
  });

  it('uses the saved main address when same-as-main is on', () => {
    const billing = buildCheckoutBilling({ ...values, same_as_main: true }, mainAddress);
    expect(billing).toMatchObject({ line1: 'Main St 1', city: 'Delhi' });
  });

  it('falls back to entered fields when same-as-main but no saved address', () => {
    expect(buildCheckoutBilling({ ...values, same_as_main: true }, null).line1).toBe(
      '12 Main Street',
    );
    expect(
      buildCheckoutBilling({ ...values, same_as_main: true }, { ...mainAddress, line1: '' }).line1,
    ).toBe('12 Main Street');
  });

  it('includes GSTIN only when has_gstin is on + a distinct billing email', () => {
    const withExtras = buildCheckoutBilling(
      { ...values, has_gstin: true, gstin: '27AAAAA0000A1Z', billing_email: 'bill@d.com' },
      null,
    );
    expect(withExtras.gstin).toBe('27AAAAA0000A1Z');
    expect(withExtras.email).toBe('bill@d.com');
    expect(
      buildCheckoutBilling({ ...values, billing_email: 'r@d.com' }, null).email,
    ).toBeUndefined();
  });

  it('omits the GSTIN when has_gstin is off even if a value is present', () => {
    const billing = buildCheckoutBilling(
      { ...values, has_gstin: false, gstin: '27AAAAA0000A1Z' },
      null,
    );
    expect(billing.gstin).toBeUndefined();
  });

  it('defaults the country to India when empty', () => {
    expect(buildCheckoutBilling({ ...values, country: '' }, null).country).toBe('India');
  });
});

describe('sumSelectedProducts', () => {
  const pod = {
    product_requests: [
      { product_id: 'a', unit_cost: 100 },
      { product_id: 'b', unit_cost: null },
    ],
  } as unknown as Parameters<typeof sumSelectedProducts>[0];

  it('sums picked line totals, skipping unknown ids and nullish costs', () => {
    expect(
      sumSelectedProducts(pod, [
        { product_id: 'a', quantity: 2 },
        { product_id: 'b', quantity: 1 },
        { product_id: 'z', quantity: 5 },
      ]),
    ).toBe(200);
  });

  it('returns 0 for no pod or no picks', () => {
    expect(sumSelectedProducts(null, [{ product_id: 'a', quantity: 2 }])).toBe(0);
    expect(sumSelectedProducts(pod, [])).toBe(0);
  });
});

describe('buildCheckoutContact', () => {
  it('returns null until the profile has loaded', () => {
    expect(buildCheckoutContact(null)).toBeNull();
  });

  it('resolves name/email/phone from the loaded profile', () => {
    expect(
      buildCheckoutContact({
        first_name: 'Neha',
        last_name: 'Verma',
        email: 'neha@d.com',
        phone_extension: '+91',
        phone_number: '9000000000',
      } as unknown as CheckoutMe),
    ).toEqual({
      name: 'Neha Verma',
      email: 'neha@d.com',
      phone_extension: '+91',
      phone_number: '9000000000',
    });
  });

  it('falls back to empty strings for a sparse profile', () => {
    expect(
      buildCheckoutContact({ first_name: null, last_name: null } as unknown as CheckoutMe),
    ).toEqual({ name: '', email: '', phone_extension: '', phone_number: '' });
  });
});
