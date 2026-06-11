import { renderHook } from '@testing-library/react-native';

import { useStatus } from '@/hooks/useStatus';

jest.mock('@/stores/status.store', () => {
  const author = (id: string, name: string) => ({
    user_id: id,
    full_name: name,
    profile_photo: null,
  });
  const story = (id: string, authorId: string, createdAt: string, mediaType = 'IMAGE') => ({
    id,
    author_id: authorId,
    author: author(authorId, authorId === 'a1' ? 'Asha' : 'Ben'),
    image_url: `img-${id}`,
    media_type: mediaType,
    caption: '',
    created_at: createdAt,
  });
  const state = {
    data: {
      stories: [
        story('p1', 'a1', '2026-06-09T09:00:00.000Z'),
        story('p2', 'a1', '2026-06-09T11:00:00.000Z', 'VIDEO'),
        story('p3', 'a2', '2026-06-09T08:00:00.000Z'),
      ],
      myStories: [
        {
          id: 'm1',
          author_id: 'me',
          image_url: 'y1',
          media_type: 'IMAGE',
          caption: '',
          created_at: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          author_id: 'me',
          image_url: 'y2',
          media_type: 'IMAGE',
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
  it('groups stories by author keeping every slide chronologically', () => {
    const { result } = renderHook(() => useStatus());

    expect(result.current.statuses).toHaveLength(2);
    const asha = result.current.statuses.find((s) => s.authorId === 'a1');
    expect(asha?.slides.map((slide) => slide.id)).toEqual(['p1', 'p2']);
    expect(asha?.cover.id).toBe('p2');
    expect(asha?.cover.mediaType).toBe('VIDEO');
    expect(asha?.name).toBe('Asha');
  });

  it('builds my own group with the newest slide as the cover', () => {
    const { result } = renderHook(() => useStatus());
    expect(result.current.mine?.slides.map((slide) => slide.id)).toEqual(['m1', 'm2']);
    expect(result.current.mine?.cover.id).toBe('m2');
  });
});
