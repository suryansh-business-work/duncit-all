import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import {
  MyOpenReportDocument,
  ReportCategoriesDocument,
  ReportPostDocument,
  ReportProfileDocument,
} from '@/graphql/report';
import {
  reportPost,
  reportProfile,
  useMyOpenReport,
  useReportCategories,
} from '@/hooks/useReportContent';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

/** A request the test settles by hand, to land answers after an unmount. */
function deferred() {
  let resolve: (value: unknown) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const spam = { key: 'SPAM', label: 'Spam', description: '', requires_details: false };

beforeEach(() => {
  mockRequest.mockReset();
});

describe('useMyOpenReport', () => {
  it('asks nothing and holds nothing without a target', () => {
    const { result } = renderHook(() => useMyOpenReport(null));
    expect(result.current).toEqual({ checking: false, pending: null });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('reports the viewer’s still-open report on the target', async () => {
    mockRequest.mockResolvedValueOnce({ myOpenReport: { id: 'r1', report_no: 'REP-1' } });
    const { result } = renderHook(() => useMyOpenReport('post-1'));
    expect(result.current.checking).toBe(true);
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.pending).toEqual({ id: 'r1', report_no: 'REP-1' });
    expect(mockRequest).toHaveBeenCalledWith(
      MyOpenReportDocument,
      { id: 'post-1' },
      { auth: true },
    );
  });

  it('answers null when nothing is open', async () => {
    mockRequest.mockResolvedValueOnce({ myOpenReport: null });
    const { result } = renderHook(() => useMyOpenReport('post-1'));
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.pending).toBeNull();
  });

  it('logs a failed check and leaves the form open (nothing pending)', async () => {
    const warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
    const failure = new Error('offline');
    mockRequest.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useMyOpenReport('post-1'));
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.pending).toBeNull();
    expect(warn).toHaveBeenCalledWith('contentReport', 'myOpenReport', { error: failure });
    warn.mockRestore();
  });

  // Legal can close the earlier report at any time, so each open asks afresh.
  it('forgets the earlier answer when the target changes or the sheet closes', async () => {
    mockRequest.mockResolvedValueOnce({ myOpenReport: { id: 'r1', report_no: 'REP-1' } });
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useMyOpenReport(id),
      {
        initialProps: { id: 'post-1' as string | null },
      },
    );
    await waitFor(() => expect(result.current.pending).not.toBeNull());

    const next = deferred();
    mockRequest.mockReturnValueOnce(next.promise);
    rerender({ id: 'post-2' });
    expect(result.current).toEqual({ checking: true, pending: null });
    expect(mockRequest).toHaveBeenLastCalledWith(
      MyOpenReportDocument,
      { id: 'post-2' },
      { auth: true },
    );

    // Closed before post-2's answer lands: the stale answer is dropped.
    rerender({ id: null });
    expect(result.current).toEqual({ checking: false, pending: null });
    await act(async () => {
      next.resolve({ myOpenReport: { id: 'r2', report_no: 'REP-2' } });
    });
    expect(result.current).toEqual({ checking: false, pending: null });
  });
});

describe('useReportCategories', () => {
  it('does not read the categories while the sheet is closed', () => {
    const { result } = renderHook(() => useReportCategories(false));
    expect(result.current.categories).toEqual([]);
    expect(result.current.failed).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('reads the categories Legal manages once the sheet opens', async () => {
    mockRequest.mockResolvedValueOnce({ reportCategories: [spam] });
    const { result } = renderHook(() => useReportCategories(true));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual([spam]);
    expect(result.current.failed).toBe(false);
    expect(mockRequest).toHaveBeenCalledWith(ReportCategoriesDocument, undefined, { auth: true });
  });

  it('fails visibly and reads again on retry', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ reportCategories: [spam] });
    const { result } = renderHook(() => useReportCategories(true));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.categories).toEqual([]);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.categories).toEqual([spam]));
    expect(result.current.failed).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('drops an answer or a failure that lands after the sheet closed', async () => {
    const first = deferred();
    mockRequest.mockReturnValueOnce(first.promise);
    const { result, rerender } = renderHook(({ on }: { on: boolean }) => useReportCategories(on), {
      initialProps: { on: true },
    });
    rerender({ on: false });
    await act(async () => {
      first.resolve({ reportCategories: [spam] });
    });
    expect(result.current.categories).toEqual([]);

    const second = deferred();
    mockRequest.mockReturnValueOnce(second.promise);
    rerender({ on: true });
    rerender({ on: false });
    await act(async () => {
      second.reject(new Error('offline'));
    });
    expect(result.current.failed).toBe(false);
  });
});

describe('reportPost / reportProfile', () => {
  it('files a post or story report and answers with its reference', async () => {
    mockRequest.mockResolvedValueOnce({ reportPost: { id: 'r1', report_no: 'REP-9' } });
    await expect(reportPost('post-1', 'SPAM', 'links')).resolves.toBe('REP-9');
    expect(mockRequest).toHaveBeenCalledWith(
      ReportPostDocument,
      { id: 'post-1', reason: 'SPAM', details: 'links' },
      { auth: true },
    );
  });

  it('files a profile report and answers with its reference', async () => {
    mockRequest.mockResolvedValueOnce({ reportProfile: { id: 'r2', report_no: 'REP-10' } });
    await expect(reportProfile('user-1', 'SPAM', '')).resolves.toBe('REP-10');
    expect(mockRequest).toHaveBeenCalledWith(
      ReportProfileDocument,
      { id: 'user-1', reason: 'SPAM', details: '' },
      { auth: true },
    );
  });

  it('passes a refusal through to the caller', async () => {
    mockRequest.mockRejectedValueOnce(new Error('REPORT_ALREADY_PENDING'));
    await expect(reportPost('post-1', 'SPAM', '')).rejects.toThrow('REPORT_ALREADY_PENDING');
  });
});
