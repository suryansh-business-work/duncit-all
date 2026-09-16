import { buildOfficialStory } from '@/components/status/officialStory';
import type { OfficialStatusSource } from '@duncit/utils';

// Must stay in the future relative to "now" — isStoryLive filters out anything
// already expired, which would silently drop this status from the slides.
const futureExpiry = new Date(Date.now() + 3 * 3_600_000).toISOString();

const videoStatus: OfficialStatusSource = {
  id: 'st-video',
  media_url: 'http://x/clip.mp4',
  media_type: 'VIDEO',
  caption: 'Watch this',
  link_url: null,
  expires_at: null,
  is_active: true,
  seen_by_me: false,
};

const imageStatus: OfficialStatusSource = {
  id: 'st-image',
  media_url: 'http://x/pic.jpg',
  media_type: 'IMAGE',
  caption: null,
  link_url: '/pods/live',
  expires_at: futureExpiry,
  is_active: true,
  seen_by_me: true,
};

describe('buildOfficialStory', () => {
  it('returns null when there are no statuses at all', () => {
    expect(buildOfficialStory([], 'Duncit')).toBeNull();
  });

  it('returns null when every status is switched off (no live slides)', () => {
    const inactive: OfficialStatusSource = { ...videoStatus, is_active: false };
    expect(buildOfficialStory([inactive], 'Duncit')).toBeNull();
  });

  it('builds the pinned group from the live statuses, in the given order', () => {
    const result = buildOfficialStory([videoStatus, imageStatus], 'Duncit');
    expect(result).not.toBeNull();
    expect(result?.authorId).toBe('official-status');
    expect(result?.name).toBe('Duncit');
    expect(result?.official).toBe(true);
    // The first status is the tile's cover, whatever its media type.
    expect(result?.cover.id).toBe('st-video');
    // The IMAGE slide anywhere in the list becomes the tile's picture.
    expect(result?.photo).toBe('http://x/pic.jpg');
    expect(result?.slides).toEqual([
      {
        id: 'st-video',
        imageUrl: 'http://x/clip.mp4',
        mediaType: 'VIDEO',
        caption: 'Watch this',
        linkUrl: null,
        expiresAt: null,
        seenByMe: false,
        likedByMe: false,
        likesCount: 0,
      },
      {
        id: 'st-image',
        imageUrl: 'http://x/pic.jpg',
        mediaType: 'IMAGE',
        caption: null,
        linkUrl: '/pods/live',
        expiresAt: futureExpiry,
        seenByMe: true,
        likedByMe: false,
        likesCount: 0,
      },
    ]);
  });

  it('falls back to no photo when every live status is a video', () => {
    const result = buildOfficialStory([videoStatus], 'Duncit');
    expect(result?.photo).toBeNull();
  });
});
