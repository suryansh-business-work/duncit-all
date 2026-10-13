import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePexelsPhotos } from '@/components/create-pod/cover-picker/usePexelsPhotos';
import { ImportRemoteImageDocument, PexelsSearchDocument } from '@/graphql/pexels';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const photo = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });
const page = (photos: unknown[], next_page: string | null = null) => ({
  pexelsSearch: { photos, next_page },
});

beforeEach(() => mockRequest.mockReset());

describe('usePexelsPhotos', () => {
  it('stays idle while inactive', () => {
    const { result } = renderHook(() => usePexelsPhotos('hiking', 'landscape', false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.photos).toEqual([]);
  });

  it('searches the seed on open with the orientation and page size', async () => {
    mockRequest.mockResolvedValue(page([photo('1'), photo('2')], 'more'));
    const { result } = renderHook(() => usePexelsPhotos('hiking', 'landscape', true));
    await waitFor(() => expect(result.current.photos).toHaveLength(2));
    expect(mockRequest.mock.calls[0][0]).toBe(PexelsSearchDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({
      query: 'hiking',
      page: 1,
      perPage: 24,
      orientation: 'landscape',
    });
    expect(result.current.query).toBe('hiking');
    expect(result.current.hasMore).toBe(true);
    expect(result.current.searching).toBe(false);
  });

  it('sends nulls for a blank query and orientation, and has no more pages', async () => {
    mockRequest.mockResolvedValue(page([photo('1')]));
    const { result } = renderHook(() => usePexelsPhotos('', '', true));
    await waitFor(() => expect(result.current.photos).toHaveLength(1));
    expect(mockRequest.mock.calls[0][1]).toMatchObject({ query: null, orientation: null });
    expect(result.current.hasMore).toBe(false);
  });

  it('treats a missing result as an empty list', async () => {
    mockRequest.mockResolvedValue({ pexelsSearch: null });
    const { result } = renderHook(() => usePexelsPhotos('x', 'landscape', true));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.photos).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('search replaces the grid with the typed term; loadMore appends the next page', async () => {
    mockRequest.mockResolvedValueOnce(page([photo('1')], 'more'));
    const { result } = renderHook(() => usePexelsPhotos('hiking', 'landscape', true));
    await waitFor(() => expect(result.current.photos).toHaveLength(1));

    act(() => result.current.setQuery('beach'));
    mockRequest.mockResolvedValueOnce(page([photo('9')], 'more'));
    await act(async () => {
      await result.current.search();
    });
    expect(mockRequest.mock.calls[1][1]).toMatchObject({ query: 'beach', page: 1 });
    expect(result.current.photos.map((p) => p.id)).toEqual(['9']);

    mockRequest.mockResolvedValueOnce(page([photo('10')]));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockRequest.mock.calls[2][1]).toMatchObject({ query: 'beach', page: 2 });
    expect(result.current.photos.map((p) => p.id)).toEqual(['9', '10']);
    expect(result.current.hasMore).toBe(false);
  });

  it('shows one actionable message on failure and lets the caller clear it', async () => {
    mockRequest.mockRejectedValue(new Error('The request timed out. Please try again.'));
    const { result } = renderHook(() => usePexelsPhotos('hiking', 'landscape', true));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).not.toContain('timed out');
    expect(result.current.searching).toBe(false);
    act(() => result.current.setError(null));
    expect(result.current.error).toBeNull();
  });

  it('re-seeds and re-searches when the seed changes', async () => {
    mockRequest.mockResolvedValue(page([]));
    const { result, rerender } = renderHook(
      ({ seed }: { seed: string }) => usePexelsPhotos(seed, 'landscape', true),
      { initialProps: { seed: 'hiking' } },
    );
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    rerender({ seed: 'yoga' });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(result.current.query).toBe('yoga');
  });

  describe('importPhoto', () => {
    async function mountReady() {
      mockRequest.mockResolvedValueOnce(page([]));
      const hook = renderHook(() => usePexelsPhotos('hiking', 'landscape', true));
      await waitFor(() => expect(hook.result.current.searching).toBe(false));
      return hook;
    }

    it('copies the large size into ImageKit and returns the hosted url', async () => {
      const { result } = await mountReady();
      mockRequest.mockResolvedValueOnce({
        importRemoteImageToImagekit: { url: 'https://ik.example/pods/1.jpg' },
      });
      const url = await result.current.importPhoto(
        photo('1', { src_large: 'https://px/large.jpg', src_medium: 'https://px/med.jpg' }),
      );
      expect(url).toBe('https://ik.example/pods/1.jpg');
      expect(mockRequest.mock.calls.at(-1)?.[0]).toBe(ImportRemoteImageDocument);
      expect(mockRequest.mock.calls.at(-1)?.[1]).toEqual({
        remoteUrl: 'https://px/large.jpg',
        folder: '/pods',
      });
    });

    it('falls back to the medium size', async () => {
      const { result } = await mountReady();
      mockRequest.mockResolvedValueOnce({
        importRemoteImageToImagekit: { url: 'https://ik/2.jpg' },
      });
      await result.current.importPhoto(photo('2', { src_medium: 'https://px/med.jpg' }));
      expect(mockRequest.mock.calls.at(-1)?.[1]).toMatchObject({ remoteUrl: 'https://px/med.jpg' });
    });

    it('rejects a photo with no usable size without calling the server', async () => {
      const { result } = await mountReady();
      mockRequest.mockClear();
      await expect(result.current.importPhoto(photo('3'))).rejects.toThrow('no usable size');
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('rejects when the server returns no url', async () => {
      const { result } = await mountReady();
      mockRequest.mockResolvedValueOnce({ importRemoteImageToImagekit: null });
      await expect(
        result.current.importPhoto(photo('4', { src_large: 'https://px/l.jpg' })),
      ).rejects.toThrow('No URL returned');
    });
  });
});
