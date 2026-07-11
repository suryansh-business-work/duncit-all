import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useFaqs, useFaqSearch } from '@/hooks/useLibrary';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useFaqs', () => {
  it('loads groups, and captures errors', async () => {
    mockRequest.mockResolvedValueOnce({
      publicFaqGroups: [
        {
          super_category: { id: 's', name: 'General', icon: null, slug: 'general' },
          faqs: [{ id: 'f1', question: 'Q', answer: 'A' }],
        },
      ],
    });
    const ok = renderHook(() => useFaqs());
    await waitFor(() => expect(ok.result.current.isLoading).toBe(false));
    expect(ok.result.current.groups).toHaveLength(1);

    mockRequest.mockRejectedValueOnce(new Error('x'));
    const bad = renderHook(() => useFaqs());
    await waitFor(() => expect(bad.result.current.isLoading).toBe(false));
    expect(bad.result.current.error).toBeDefined();
  });
});

const faq = (id: string) => ({ id, question: `Q${id}`, answer: `A${id}` });

describe('useFaqSearch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('skips the server for an empty query', () => {
    const { result } = renderHook(() => useFaqSearch('   '));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('debounces, then fetches matching FAQs from the server', async () => {
    mockRequest.mockResolvedValue({ faqs: [faq('1')] });
    const { result } = renderHook(() => useFaqSearch('refund'));
    expect(result.current.isLoading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled(); // still inside the debounce window

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { search: 'refund' },
      { auth: true },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((f) => f.id)).toEqual(['1']);
  });

  it('only keeps the latest request when the query changes mid-flight', async () => {
    mockRequest
      .mockResolvedValueOnce({ faqs: [faq('old')] })
      .mockResolvedValueOnce({ faqs: [faq('new')] });
    const { result, rerender } = renderHook((props: { q: string }) => useFaqSearch(props.q), {
      initialProps: { q: 're' },
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'refund' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((f) => f.id)).toEqual(['new']);
  });

  it('ignores a stale failure after the query changes', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ faqs: [faq('new')] });
    const { result, rerender } = renderHook((props: { q: string }) => useFaqSearch(props.q), {
      initialProps: { q: 're' },
    });
    act(() => {
      jest.advanceTimersByTime(350); // request 1 fires, will reject as stale
    });
    rerender({ q: 'refund' });
    act(() => {
      jest.advanceTimersByTime(350); // request 2 fires
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((f) => f.id)).toEqual(['new']);
  });

  it('clears the results when the search fails', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFaqSearch('refund'));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results).toEqual([]);
  });

  it('resets to empty when the query is cleared', async () => {
    mockRequest.mockResolvedValue({ faqs: [faq('1')] });
    const { result, rerender } = renderHook((props: { q: string }) => useFaqSearch(props.q), {
      initialProps: { q: 'refund' },
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    rerender({ q: '' });
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
  });
});
