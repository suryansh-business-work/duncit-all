import { renderHook } from '@testing-library/react-native';

import { useStatus } from '@/hooks/useStatus';

jest.mock('@/stores/status.store', () => {
  const author = (id: string, name: string) => ({
    user_id: id,
    full_name: name,
    profile_photo: null,
  });
  const post = (id: string, authorId: string, createdAt: string) => ({
    id,
    author_id: authorId,
    author: author(authorId, authorId === 'a1' ? 'Asha' : 'Ben'),
    image_url: `img-${id}`,
    caption: '',
    created_at: createdAt,
  });
  const state = {
    data: {
      posts: [
        post('p1', 'a1', '2026-06-09T09:00:00.000Z'),
        post('p2', 'a1', '2026-06-09T11:00:00.000Z'),
        post('p3', 'a2', '2026-06-09T08:00:00.000Z'),
      ],
      myPosts: [
        {
          id: 'm1',
          author_id: 'me',
          image_url: 'y1',
          caption: '',
          created_at: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          author_id: 'me',
          image_url: 'y2',
          caption: '',
          created_at: '2026-06-08T00:00:00.000Z',
        },
      ],
    },
    isLoading: false,
    fetch: jest.fn(),
  };
  return { useStatusStore: (selector: (s: unknown) => unknown) => selector(state) };
});

describe('useStatus', () => {
  it('groups posts by author keeping the latest, and finds my latest', () => {
    const { result } = renderHook(() => useStatus());

    expect(result.current.statuses).toHaveLength(2);
    const asha = result.current.statuses.find((s) => s.authorId === 'a1');
    expect(asha?.latest.id).toBe('p2');
    expect(asha?.name).toBe('Asha');
    expect(result.current.myLatest?.id).toBe('m2');
  });
});
