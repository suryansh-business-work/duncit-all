import { describe, expect, it } from 'vitest';
import { buildHomeStatusEntries, buildMyStatusViewer, initials } from '../homeStatusItems';

const baseArgs = {
  followedClubs: [] as any[],
  hostPods: [] as any[],
  followedUsers: [] as any[],
  followedPosts: [] as any[],
};

/** Deterministic (identity) shuffle so ordering assertions stay stable. */
const identity = <T,>(items: T[]) => items;

describe('initials', () => {
  it('takes up to two leading letters, uppercased', () => {
    expect(initials('Asha Verma')).toBe('AV');
    expect(initials('madonna')).toBe('M');
    expect(initials(null)).toBe('');
  });
});

describe('buildHomeStatusEntries (bug 2/3 order)', () => {
  it('orders clubs → your hosted pods → users', () => {
    const entries = buildHomeStatusEntries({
      ...baseArgs,
      followedClubs: [
        {
          id: 'c1',
          club_id: 'club1',
          club_name: 'Runners',
          club_moments: [{ url: 'm.jpg', type: 'IMAGE' }],
          club_feature_images_and_videos: [],
        },
      ],
      hostPods: [
        { id: 'p1', pod_id: 'pod1', pod_title: 'Host Pod', club_slug: 'cl', pod_images_and_videos: [{ url: 'a.jpg', type: 'IMAGE' }] },
      ],
      followedUsers: [{ user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'u.jpg' }],
      followedPosts: [
        { id: 'sp1', author_id: 'u1', image_url: 'st.jpg', media_type: 'IMAGE', caption: 'Hi', created_at: 'now', expires_at: 'later' },
      ],
    }, identity);
    expect(entries.map((e) => e.key)).toEqual(['club-c1', 'pod-p1', 'user-u1']);
    expect(entries[1].viewer.subLabel).toBe('Your pod status');
    expect(entries[2].viewer.slides?.[0]?.mediaUrl).toBe('st.jpg');
    // The user's story carries a post id so it can be liked/recorded/viewed.
    expect(entries[2].viewer.kind).toBe('user');
    expect(entries[2].viewer.slides?.[0]?.id).toBeDefined();
  });

  it('marks a user ring unseen until every story is seen (Bug 2)', () => {
    const withSeen = (seen: boolean) =>
      buildHomeStatusEntries({
        ...baseArgs,
        followedUsers: [{ user_id: 'u1', full_name: 'Asha', first_name: 'Asha' }],
        followedPosts: [
          { id: 'p1', author_id: 'u1', image_url: 'a.jpg', media_type: 'IMAGE', seen_by_me: seen },
        ],
      })[0];
    expect(withSeen(false).active).toBe(true);
    expect(withSeen(true).active).toBe(false);
  });

  it('places unseen tiles first and pushes seen tiles to the end', () => {
    const entries = buildHomeStatusEntries(
      {
        ...baseArgs,
        followedUsers: [
          { user_id: 'seen', full_name: 'Seen One', first_name: 'Seen' },
          { user_id: 'unseen', full_name: 'Unseen One', first_name: 'Unseen' },
        ],
        followedPosts: [
          { id: 'ps', author_id: 'seen', image_url: 'a.jpg', media_type: 'IMAGE', seen_by_me: true },
          { id: 'pu', author_id: 'unseen', image_url: 'b.jpg', media_type: 'IMAGE', seen_by_me: false },
        ],
      },
      identity,
    );
    expect(entries.map((e) => e.key)).toEqual(['user-unseen', 'user-seen']);
  });
});

describe('buildMyStatusViewer', () => {
  it('returns null without stories and a payload with them', () => {
    expect(buildMyStatusViewer({ full_name: 'Me', my_stories: [] })).toBeNull();
    const viewer = buildMyStatusViewer({
      full_name: 'Me',
      profile_photo: 'me.jpg',
      my_stories: [{ image_url: 'a.jpg', media_type: 'IMAGE', caption: '', created_at: 'now', expires_at: 'later' }],
    });
    expect(viewer?.label).toBe('Me');
    expect(viewer?.slides).toHaveLength(1);
  });
});
