import { describe, expect, it } from 'vitest';
import { getFeedCardHeader } from '../feedHeader';
import type { FeedClub, FeedPost } from '../queries';

const post: FeedPost = {
  id: 'p1',
  author_id: 'u1',
  club_id: 'c-doc-1',
  image_url: 'https://cdn.example/p.jpg',
  media_type: 'IMAGE',
  kind: 'POST',
  caption: 'hello',
  likes_count: 0,
  liked_by_me: false,
  comments_count: 0,
  created_at: '2026-07-01T00:00:00.000Z',
  author: {
    user_id: 'u1',
    full_name: 'Asha Verma',
    first_name: 'Asha',
    profile_photo: 'https://cdn.example/a.jpg',
  },
};

const club: FeedClub = {
  id: 'c-doc-1',
  club_id: 'CLUB-1',
  club_name: 'Runners Club',
  club_feature_images_and_videos: [{ url: 'https://cdn.example/cover.jpg', type: 'IMAGE' }],
};

describe('getFeedCardHeader', () => {
  it('uses the club name, cover and club route when a club resolves', () => {
    expect(getFeedCardHeader(post, club)).toEqual({
      name: 'Runners Club',
      avatarUrl: 'https://cdn.example/cover.jpg',
      to: '/club/CLUB-1',
    });
  });

  it('falls back to the author profile route when the club has no slug', () => {
    const header = getFeedCardHeader(post, { ...club, club_id: null, club_feature_images_and_videos: [] });
    expect(header).toEqual({ name: 'Runners Club', avatarUrl: null, to: '/u/u1' });
  });

  it('uses the author name, photo and public profile route without a club', () => {
    expect(getFeedCardHeader(post, null)).toEqual({
      name: 'Asha Verma',
      avatarUrl: 'https://cdn.example/a.jpg',
      to: '/u/u1',
    });
  });

  it('degrades to first name, then "User", when author fields are missing', () => {
    const noFull = { ...post, author: { user_id: 'u1', first_name: 'Asha' } };
    expect(getFeedCardHeader(noFull).name).toBe('Asha');
    expect(getFeedCardHeader({ ...post, author: null })).toEqual({
      name: 'User',
      avatarUrl: null,
      to: '/u/u1',
    });
  });
});
