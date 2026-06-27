import { describe, expect, it } from 'vitest';
import { buildHomeStatusEntries, buildMyStatusViewer, initials } from '../homeStatusItems';

const baseArgs = {
  followedClubs: [] as any[],
  hostPods: [] as any[],
  followedPods: [] as any[],
  followedUsers: [] as any[],
  followedPosts: [] as any[],
};

describe('initials', () => {
  it('takes up to two leading letters, uppercased', () => {
    expect(initials('Asha Verma')).toBe('AV');
    expect(initials('madonna')).toBe('M');
    expect(initials(null)).toBe('');
  });
});

describe('buildHomeStatusEntries (bug 2/3 order)', () => {
  it('orders clubs → host pods → followed pods → users', () => {
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
      followedPods: [
        { id: 'p2', pod_id: 'pod2', pod_title: 'Fan Pod', club_slug: 'cl', pod_images_and_videos: [{ url: 'b.mp4', type: 'VIDEO' }] },
      ],
      followedUsers: [{ user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'u.jpg' }],
      followedPosts: [
        { author_id: 'u1', image_url: 'st.jpg', media_type: 'IMAGE', caption: 'Hi', created_at: 'now', expires_at: 'later' },
      ],
    });
    expect(entries.map((e) => e.key)).toEqual(['club-c1', 'pod-p1', 'pod-p2', 'user-u1']);
    expect(entries[2].videoUrl).toBe('b.mp4');
    expect(entries[1].viewer.subLabel).toBe('Your pod status');
    expect(entries[2].viewer.subLabel).toBe('Followed pod');
    expect(entries[3].viewer.slides?.[0]?.mediaUrl).toBe('st.jpg');
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
