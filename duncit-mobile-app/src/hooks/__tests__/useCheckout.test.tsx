import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  MobileCheckoutInvoiceDocument,
  MobileCheckoutMeDocument,
  MobileCheckoutPodDocument,
  MobileDummyCheckoutDocument,
  MobilePublicFinanceDocument,
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
  if (doc === MobileCheckoutInvoiceDocument)
    return Promise.resolve({ paymentInvoicePdfBase64: 'B64' });
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
});
