import { act, renderHook, waitFor } from '@testing-library/react-native';

import { shareBase64File } from '@/components/public-page/publicPageRequests';
import {
  MyProductOrderDocument,
  MyProductOrderSellerInvoiceDocument,
} from '@/graphql/order-detail';
import { PodInvoicePdfDocument } from '@/graphql/pod-history';
import { MyPodShopReturnsDocument } from '@/graphql/pod-shop-returns';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/components/public-page/publicPageRequests', () => ({
  shareBase64File: jest.fn(),
}));

const mockRequest = graphqlRequest as jest.Mock;
const mockShare = shareBase64File as jest.Mock;

const order = { id: 'o1', order_no: 'ORD-9', payment_id: 'pay-1' };
type Answers = Map<unknown, unknown>;

function answer(answers: Answers) {
  mockRequest.mockImplementation(async (doc: unknown) => {
    if (!answers.has(doc)) throw new Error('unexpected document');
    const value = answers.get(doc);
    if (value instanceof Error) throw value;
    return value;
  });
}

const loaded = (): Answers =>
  new Map<unknown, unknown>([
    [MyProductOrderDocument, { myProductOrder: order }],
    [
      MyPodShopReturnsDocument,
      {
        myPodShopReturns: [
          { id: 'r1', order_id: 'o1' },
          { id: 'r2', order_id: 'other' },
        ],
      },
    ],
  ]);

async function mount(answers = loaded()) {
  answer(answers);
  const hook = renderHook(() => useOrderDetail('o1'));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return { answers, ...hook };
}

beforeEach(() => {
  mockRequest.mockReset();
  mockShare.mockReset();
});

describe('useOrderDetail', () => {
  it('loads the order and only the returns that belong to it', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.returns).toHaveLength(1));
    expect(result.current.order).toEqual(order);
    expect(result.current.returns[0]).toMatchObject({ id: 'r1' });
    expect(result.current.error).toBe('');
    expect(mockRequest.mock.calls.find((c) => c[0] === MyProductOrderDocument)?.[1]).toEqual({
      id: 'o1',
    });
  });

  it('shows the server message when the order fails and the returns line on its own failure', async () => {
    const answers = loaded();
    answers.set(MyProductOrderDocument, new Error('Order not found'));
    answers.set(MyPodShopReturnsDocument, new Error('down'));
    const { result } = await mount(answers);
    await waitFor(() => expect(result.current.returnsError).not.toBe(''));
    expect(result.current.error).toBe('Order not found');
    expect(result.current.order).toBeNull();
  });

  it('reload re-reads both queries', async () => {
    const { result } = await mount();
    mockRequest.mockClear();
    await act(async () => {
      await result.current.reload();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('shares the payment invoice under the order number', async () => {
    const answers = loaded();
    answers.set(PodInvoicePdfDocument, { paymentInvoicePdfBase64: 'QUJD' });
    mockShare.mockResolvedValue(true);
    const { result } = await mount(answers);
    await act(async () => {
      await result.current.downloadInvoice(order as never);
    });
    expect(mockShare).toHaveBeenCalledWith('QUJD', 'invoice-ORD-9.pdf', 'application/pdf');
    expect(mockRequest.mock.calls.find((c) => c[0] === PodInvoicePdfDocument)?.[1]).toEqual({
      id: 'pay-1',
    });
    expect(result.current.notice).toBeNull();
    expect(result.current.downloading).toBeNull();
  });

  it('says so when there is no share sheet', async () => {
    const answers = loaded();
    answers.set(PodInvoicePdfDocument, { paymentInvoicePdfBase64: 'QUJD' });
    mockShare.mockResolvedValue(false);
    const { result } = await mount(answers);
    await act(async () => {
      await result.current.downloadInvoice(order as never);
    });
    expect(result.current.notice).toEqual({
      tone: 'error',
      text: expect.any(String),
    });
    act(() => result.current.setNotice(null));
    expect(result.current.notice).toBeNull();
  });

  it('refuses an empty document as a failed download', async () => {
    const answers = loaded();
    answers.set(PodInvoicePdfDocument, { paymentInvoicePdfBase64: '' });
    const { result } = await mount(answers);
    await act(async () => {
      await result.current.downloadInvoice(order as never);
    });
    expect(mockShare).not.toHaveBeenCalled();
    expect(result.current.notice?.tone).toBe('error');
  });

  it('shares the seller invoice and reports the server refusal in words', async () => {
    const answers = loaded();
    answers.set(MyProductOrderSellerInvoiceDocument, {
      myProductOrderSellerInvoice: {
        content_base64: 'WFla',
        filename: 'inv.pdf',
        mime: 'application/pdf',
      },
    });
    mockShare.mockResolvedValue(true);
    const { result } = await mount(answers);
    await act(async () => {
      await result.current.downloadSellerInvoice({ id: 'o1' });
    });
    expect(mockShare).toHaveBeenCalledWith('WFla', 'seller-inv.pdf', 'application/pdf');

    answers.set(MyProductOrderSellerInvoiceDocument, new Error('Invoice not booked yet'));
    await act(async () => {
      await result.current.downloadSellerInvoice({ id: 'o1' });
    });
    expect(result.current.notice).toEqual({ tone: 'error', text: 'Invoice not booked yet' });
    expect(result.current.downloading).toBeNull();
  });
});
