import { describe, expect, it } from 'vitest';
import { buildOwnStoryItem } from '../storyViewerItem';

const story = (id: string, created_at: string) => ({
  id,
  image_url: `http://x/${id}.jpg`,
  media_type: 'IMAGE',
  caption: '',
  created_at,
  expires_at: null,
});

describe('buildOwnStoryItem', () => {
  it('returns null when there are no stories', () => {
    expect(buildOwnStoryItem('Riya', null, [])).toBeNull();
  });

  it('orders slides oldest → newest and carries the post id + avatar', () => {
    const item = buildOwnStoryItem('Riya', 'http://x/me.jpg', [
      story('b', '2026-06-09T12:00:00.000Z'),
      story('a', '2026-06-09T10:00:00.000Z'),
    ]);
    expect(item?.avatarUrl).toBe('http://x/me.jpg');
    expect(item?.slides?.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
