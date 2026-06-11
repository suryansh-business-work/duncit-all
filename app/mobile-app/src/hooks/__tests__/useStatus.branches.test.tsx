import { renderHook } from '@testing-library/react-native';

import { useStatus } from '@/hooks/useStatus';

const mockStatusState: { data: unknown; isLoading: boolean; fetch: jest.Mock } = {
  data: { stories: [], myStories: [] },
  isLoading: false,
  fetch: jest.fn(),
};
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) => selector(mockStatusState),
}));

beforeEach(() => mockStatusState.fetch.mockReset());

describe('useStatus branch coverage', () => {
  it('labels an authorless story "User" and forwards a forced refetch', () => {
    mockStatusState.data = {
      stories: [
        {
          id: 'p1',
          author_id: 'x',
          author: null,
          image_url: 'i',
          // media_type omitted → falls back to IMAGE.
          caption: '',
          created_at: '2026-06-09T00:00:00.000Z',
        },
      ],
      myStories: [],
    };
    const { result } = renderHook(() => useStatus());
    expect(result.current.statuses[0]!.name).toBe('User');
    expect(result.current.statuses[0]!.photo).toBeUndefined();

    result.current.refetch();
    expect(mockStatusState.fetch).toHaveBeenCalledWith(true);
  });

  it('returns empty derivations when the feed is missing', () => {
    mockStatusState.data = undefined;
    const { result } = renderHook(() => useStatus());
    expect(result.current.statuses).toEqual([]);
    expect(result.current.mine).toBeNull();
  });

  it('orders slides oldest-first and uses the newest as the cover', () => {
    const author = { user_id: 'a1', full_name: 'Asha', profile_photo: null };
    mockStatusState.data = {
      stories: [
        {
          id: 'newer',
          author_id: 'a1',
          author,
          media_type: 'IMAGE',
          image_url: 'i',
          caption: '',
          created_at: '2026-06-09T11:00:00.000Z',
        },
        {
          id: 'older',
          author_id: 'a1',
          author,
          media_type: 'IMAGE',
          image_url: 'i',
          caption: '',
          created_at: '2026-06-09T09:00:00.000Z',
        },
      ],
      myStories: [],
    };
    const { result } = renderHook(() => useStatus());
    expect(result.current.statuses).toHaveLength(1);
    expect(result.current.statuses[0]!.slides.map((s) => s.id)).toEqual(['older', 'newer']);
    expect(result.current.statuses[0]!.cover.id).toBe('newer');
  });
});
