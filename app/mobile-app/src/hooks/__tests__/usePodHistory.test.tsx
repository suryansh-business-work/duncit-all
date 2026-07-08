import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { graphqlRequest } from '@/services/graphql.client';
import {
  usePodBackout,
  usePodBackoutDeduction,
  usePodHistory,
  usePodHistoryCategories,
  usePodInvoice,
  usePodRejoin,
  usePodTicket,
} from '@/hooks/usePodHistory';

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

beforeEach(() => {
  mockRequest.mockReset();
  writeFile.mockReset().mockResolvedValue(undefined);
  isAvailable.mockReset().mockResolvedValue(true);
  share.mockReset().mockResolvedValue(undefined);
});

const membership = { id: 'm1', pod_id: 'p1', pod: { id: 'pod1' } };

describe('usePodHistory', () => {
  it('loads memberships and exposes a pod-deduped list', async () => {
    mockRequest.mockResolvedValueOnce({
      myPodMemberships: [
        membership,
        { id: 'm2', pod_id: 'p1', pod: { id: 'pod1' } },
        { id: 'm3', pod_id: 'p2', pod: { id: 'pod2' } },
      ],
    });
    const { result } = renderHook(() => usePodHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(3);
    expect(result.current.uniqueItems.map((m) => m.id)).toEqual(['m1', 'm3']);
  });

  it('captures a fetch error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => usePodHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('refetch re-runs the query', async () => {
    mockRequest.mockResolvedValue({ myPodMemberships: [membership] });
    const { result } = renderHook(() => usePodHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

describe('usePodBackout', () => {
  it('calls backoutPod with the pod doc id', async () => {
    mockRequest.mockResolvedValueOnce({ backoutPod: { id: 'm1' } });
    const { result } = renderHook(() => usePodBackout());
    await act(async () => {
      await result.current.backout('pod1');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { pod_doc_id: 'pod1' },
      { auth: true },
    );
    expect(result.current.busy).toBe(false);
  });

  it('clears busy even when the mutation fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => usePodBackout());
    await act(async () => {
      await expect(result.current.backout('pod1')).rejects.toThrow('fail');
    });
    expect(result.current.busy).toBe(false);
  });
});

describe('usePodRejoin', () => {
  it('calls rejoinPod with the pod doc id', async () => {
    mockRequest.mockResolvedValueOnce({ rejoinPod: { id: 'm1', status: 'JOINED' } });
    const { result } = renderHook(() => usePodRejoin());
    await act(async () => {
      await result.current.rejoin('pod1');
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { pod_doc_id: 'pod1' },
      { auth: true },
    );
    expect(result.current.busy).toBe(false);
  });

  it('clears busy even when the rejoin fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => usePodRejoin());
    await act(async () => {
      await expect(result.current.rejoin('pod1')).rejects.toThrow('fail');
    });
    expect(result.current.busy).toBe(false);
  });
});

describe('usePodInvoice', () => {
  it('writes the base64 PDF and opens the share sheet', async () => {
    mockRequest.mockResolvedValueOnce({ paymentInvoicePdfBase64: 'BASE64' });
    const { result } = renderHook(() => usePodInvoice());
    await act(async () => {
      await result.current.download('pay1');
    });
    expect(writeFile).toHaveBeenCalledWith('file:///cache/pod-invoice-pay1.pdf', 'BASE64', {
      encoding: 'base64',
    });
    expect(share).toHaveBeenCalledWith('file:///cache/pod-invoice-pay1.pdf', {
      mimeType: 'application/pdf',
    });
  });

  it('throws when the invoice is empty', async () => {
    mockRequest.mockResolvedValueOnce({ paymentInvoicePdfBase64: '' });
    const { result } = renderHook(() => usePodInvoice());
    await act(async () => {
      await expect(result.current.download('pay1')).rejects.toThrow('Invoice not available');
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('throws when sharing is unavailable', async () => {
    mockRequest.mockResolvedValueOnce({ paymentInvoicePdfBase64: 'BASE64' });
    isAvailable.mockResolvedValueOnce(false);
    const { result } = renderHook(() => usePodInvoice());
    await act(async () => {
      await expect(result.current.download('pay1')).rejects.toThrow('Sharing is not available');
    });
    expect(share).not.toHaveBeenCalled();
  });
});

describe('usePodTicket', () => {
  it('resolves the ticket then writes the PDF and shares it', async () => {
    mockRequest
      .mockResolvedValueOnce({ myEventTicketForPod: { id: 't1', ticket_code: 'TKT-9' } })
      .mockResolvedValueOnce({ eventTicketPdfBase64: 'TBASE64' });
    const { result } = renderHook(() => usePodTicket());
    await act(async () => {
      await result.current.download('pod1');
    });
    expect(writeFile).toHaveBeenCalledWith('file:///cache/ticket-TKT-9.pdf', 'TBASE64', {
      encoding: 'base64',
    });
    expect(share).toHaveBeenCalled();
  });

  it('throws when there is no ticket for the pod', async () => {
    mockRequest.mockResolvedValueOnce({ myEventTicketForPod: null });
    const { result } = renderHook(() => usePodTicket());
    await act(async () => {
      await expect(result.current.download('pod1')).rejects.toThrow('Ticket not available');
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('throws when the resolved ticket PDF is empty', async () => {
    mockRequest
      .mockResolvedValueOnce({ myEventTicketForPod: { id: 't1', ticket_code: 'TKT-9' } })
      .mockResolvedValueOnce({ eventTicketPdfBase64: '' });
    const { result } = renderHook(() => usePodTicket());
    await act(async () => {
      await expect(result.current.download('pod1')).rejects.toThrow('Ticket not available');
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('throws when sharing is unavailable for a ticket', async () => {
    mockRequest
      .mockResolvedValueOnce({ myEventTicketForPod: { id: 't1', ticket_code: 'TKT-9' } })
      .mockResolvedValueOnce({ eventTicketPdfBase64: 'TBASE64' });
    isAvailable.mockResolvedValueOnce(false);
    const { result } = renderHook(() => usePodTicket());
    await act(async () => {
      await expect(result.current.download('pod1')).rejects.toThrow('Sharing is not available');
    });
    expect(share).not.toHaveBeenCalled();
  });
});

describe('usePodHistoryCategories', () => {
  const cats = [{ id: 's1', name: 'For You', level: 'SUPER', parent_id: null }];

  it('loads the category tree', async () => {
    mockRequest.mockResolvedValueOnce({ categories: cats });
    const { result } = renderHook(() => usePodHistoryCategories());
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]?.id).toBe('s1');
  });

  it('stays empty when the request fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodHistoryCategories());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolveFn: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const { unmount } = renderHook(() => usePodHistoryCategories());
    unmount();
    await act(async () => {
      resolveFn({ categories: cats });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});

describe('usePodBackoutDeduction', () => {
  it('loads the backout deduction %', async () => {
    mockRequest.mockResolvedValueOnce({
      publicFinanceSettings: { default_backout_deduction_pct: 12 },
    });
    const { result } = renderHook(() => usePodBackoutDeduction());
    await waitFor(() => expect(result.current).toBe(12));
  });

  it('stays 0 when the request fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodBackoutDeduction());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('ignores a response that resolves after unmount', async () => {
    let resolveFn: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const { unmount } = renderHook(() => usePodBackoutDeduction());
    unmount();
    await act(async () => {
      resolveFn({ publicFinanceSettings: { default_backout_deduction_pct: 5 } });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
