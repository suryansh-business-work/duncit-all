import { describe, expect, it } from 'vitest';

import { buildAdViewer, buildHomeStatusEntries, buildMyStatusViewer } from '../homeStatusItems';
import { buildStoryViewerItem } from '../storyViewerItem';

const identity = <T,>(items: T[]) => items;
const later = new Date(Date.now() + 3_600_000).toISOString();

describe('club rings', () => {
  const club = (over: object = {}) => ({ id: 'c1', club_id: 'runners', club_name: 'Runners', club_feature_images_and_videos: [{ url: 'logo.png', type: 'IMAGE' }], ...over });
  const story = (over: object = {}) => ({ id: 's1', club_id: 'c1', image_url: 'a.jpg', media_type: 'IMAGE', expires_at: later, ...over });
  const build = (c: object, stories: object[]) =>
    buildHomeStatusEntries({ followedClubs: [c], followedUsers: [], followedPosts: [], clubStories: stories }, identity)[0];

  it('uses the first image story as the tile and counts likes and own-like state', () => {
    const entry = build(club(), [story({ likes_count: 4, liked_by_me: true, caption: 'Race day', seen_by_me: false })]);
    expect(entry.imageUrl).toBe('a.jpg');
    expect(entry.videoUrl).toBeNull();
    expect(entry.active).toBe(true);
    expect(entry.viewer.avatarUrl).toBe('logo.png');
    expect(entry.viewer.targetUrl).toBe('/club/runners');
    expect(entry.viewer.slides?.[0]).toMatchObject({ subLabel: 'Race day', likeCount: 4, likedByMe: true });
  });

  it('uses a video story as the tile video, defaults the media type, numbers uncaptioned slides and starts likes at zero', () => {
    const entry = build(club({ club_id: undefined, club_feature_images_and_videos: undefined }), [
      story({ media_type: 'VIDEO', image_url: 'v.mp4', seen_by_me: true }),
      story({ id: 's2', media_type: null, image_url: 'b.jpg', seen_by_me: true }),
    ]);
    expect(entry.imageUrl).toBeNull();
    expect(entry.videoUrl).toBe('v.mp4');
    expect(entry.active).toBe(false);
    expect(entry.viewer.avatarUrl).toBeUndefined();
    expect(entry.viewer.targetUrl).toBeUndefined();
    expect(entry.viewer.slides?.map((s) => s.subLabel)).toEqual(['Club status 1/2', 'Club status 2/2']);
    expect(entry.viewer.slides?.[1]).toMatchObject({ mediaType: 'IMAGE', likeCount: 0, likedByMe: false });
  });

  it('treats a first story with no media type as an image', () => {
    expect(build(club(), [story({ media_type: null })]).viewer.mediaType).toBe('IMAGE');
  });

  it('has no avatar when the club media has no usable url', () => {
    const entry = build(club({ club_feature_images_and_videos: [{ url: '', type: 'IMAGE' }, null] }), [story()]);
    expect(entry.viewer.avatarUrl).toBeUndefined();
  });

  it('drops a club whose only story has expired', () => {
    const entries = buildHomeStatusEntries({ followedClubs: [club()], followedUsers: [], followedPosts: [], clubStories: [story({ expires_at: '2000-01-01T00:00:00.000Z' })] }, identity);
    expect(entries).toEqual([]);
  });

  it('builds no club rings when no club stories are given', () => {
    expect(buildHomeStatusEntries({ followedClubs: [club()], followedUsers: [], followedPosts: [] }, identity)).toEqual([]);
  });
});

describe('person rings', () => {
  const user = (over: object = {}) => ({ user_id: 'u1', first_name: 'Asha', full_name: 'Asha Verma', profile_photo: 'p.jpg', ...over });
  const post = (over: object = {}) => ({ id: 'p1', author_id: 'u1', image_url: 'x.jpg', media_type: 'IMAGE', expires_at: later, ...over });
  const build = (u: object, posts: object[]) => buildHomeStatusEntries({ followedClubs: [], followedUsers: [u], followedPosts: posts }, identity)[0];

  it('shows the story image, keeps the caption and counts likes', () => {
    const entry = build(user(), [post({ caption: 'Hi', likes_count: 2, liked_by_me: true })]);
    expect(entry.label).toBe('Asha');
    expect(entry.imageUrl).toBe('x.jpg');
    expect(entry.initials).toBe('AV');
    expect(entry.viewer.slides?.[0]).toMatchObject({ subLabel: 'Hi', likeCount: 2, likedByMe: true });
    expect(entry.viewer.targetUrl).toBe('/u/u1');
  });

  it('falls back to the profile photo when the story has no image, and to a generic name and initials', () => {
    const entry = build(user({ first_name: '', full_name: '' }), [post({ image_url: '', media_type: null })]);
    expect(entry.label).toBe('User');
    expect(entry.imageUrl).toBe('p.jpg');
    expect(entry.viewer.mediaUrl).toBe('p.jpg');
    expect(entry.viewer.mediaType).toBe('IMAGE');
    expect(entry.initials).toBe('');
  });

  it('names a person by full name when there is no first name, and takes initials from the first name when there is no full name', () => {
    expect(build(user({ first_name: '' }), [post()]).label).toBe('Asha Verma');
    expect(build(user({ full_name: '' }), [post()]).initials).toBe('A');
  });

  it('plays a video story as the tile video and numbers uncaptioned slides', () => {
    const entry = build(user(), [post({ media_type: 'VIDEO', image_url: 'v.mp4' }), post({ id: 'p2', media_type: null })]);
    expect(entry.imageUrl).toBeNull();
    expect(entry.videoUrl).toBe('v.mp4');
    expect(entry.viewer.slides?.map((s) => s.subLabel)).toEqual(['Status 1/2', 'Status 2/2']);
    expect(entry.viewer.slides?.[1]).toMatchObject({ mediaType: 'IMAGE', likeCount: 0, likedByMe: false });
  });
});

describe('buildAdViewer', () => {
  it('opens an image ad in a new tab to the advertiser page', () => {
    expect(buildAdViewer({ ad_title: 'Sale', ad_type: 'IMAGE', media_url: 'ad.jpg', redirect_url: 'https://ad.example' })).toMatchObject({
      kind: 'ad',
      label: 'Sale',
      mediaType: 'IMAGE',
      targetUrl: 'https://ad.example',
      internal: false,
    });
  });

  it('labels an untitled ad Sponsored, plays a video ad, and offers no link without a redirect', () => {
    expect(buildAdViewer({ ad_title: null, ad_type: 'VIDEO', media_url: 'ad.mp4', redirect_url: null })).toMatchObject({
      label: 'Sponsored',
      mediaType: 'VIDEO',
      targetUrl: undefined,
    });
    expect(buildAdViewer({ media_url: 'ad.jpg' }).mediaType).toBe('IMAGE');
  });
});

describe('buildMyStatusViewer', () => {
  const mine = (over: object = {}) => ({ user_id: 'u1', full_name: 'Asha Verma', first_name: 'Asha', profile_photo: 'p.jpg', my_stories: [{ id: 's1', image_url: 'a.jpg', media_type: 'IMAGE', expires_at: later }], ...over });

  it('labels the viewer by full name, then first name, then a plain fallback', () => {
    expect(buildMyStatusViewer(mine())?.label).toBe('Asha Verma');
    expect(buildMyStatusViewer(mine({ full_name: '' }))?.label).toBe('Asha');
    expect(buildMyStatusViewer(mine({ full_name: '', first_name: '' }))?.label).toBe('My status');
  });

  it('has no viewer without live stories, whether missing, empty or expired', () => {
    expect(buildMyStatusViewer(null)).toBeNull();
    expect(buildMyStatusViewer(mine({ my_stories: undefined }))).toBeNull();
    expect(buildMyStatusViewer(mine({ my_stories: [{ id: 's', image_url: 'a', expires_at: '2000-01-01T00:00:00.000Z' }] }))).toBeNull();
  });

  it('numbers uncaptioned stories and keeps captions', () => {
    const viewer = buildMyStatusViewer(mine({ my_stories: [{ id: 's1', image_url: 'a', caption: 'Mine' }, { id: 's2', image_url: 'b' }] }));
    expect(viewer?.slides?.map((s) => s.subLabel)).toEqual(['Mine', 'Story 2/2']);
  });
});

describe('buildStoryViewerItem', () => {
  it('has no viewer for no stories', () => {
    expect(buildStoryViewerItem('Asha', null, [])).toBeNull();
  });

  it('orders stories oldest first and keeps their ids, captions and times', () => {
    const item = buildStoryViewerItem('Asha', 'p.jpg', [
      { id: 'new', image_url: 'n', created_at: '2026-06-02T00:00:00.000Z', caption: 'New', expires_at: '2026-06-03T00:00:00.000Z', media_type: 'VIDEO' },
      { id: 'old', image_url: 'o', created_at: '2026-06-01T00:00:00.000Z' },
    ]);
    expect(item?.label).toBe('Asha');
    expect(item?.avatarUrl).toBe('p.jpg');
    expect(item?.slides?.map((s) => s.id)).toEqual(['old', 'new']);
    expect(item?.slides?.[0]).toMatchObject({ mediaType: 'IMAGE', caption: undefined, createdAt: '2026-06-01T00:00:00.000Z', expiresAt: undefined });
    expect(item?.slides?.[1]).toMatchObject({ mediaType: 'VIDEO', caption: 'New', expiresAt: '2026-06-03T00:00:00.000Z' });
  });

  it('copes with stories that have no creation time', () => {
    const item = buildStoryViewerItem('A', null, [{ id: 'a', image_url: 'x' }, { id: 'b', image_url: 'y', created_at: null }]);
    expect(item?.slides).toHaveLength(2);
    expect(item?.slides?.[0].createdAt).toBeUndefined();
  });
});
