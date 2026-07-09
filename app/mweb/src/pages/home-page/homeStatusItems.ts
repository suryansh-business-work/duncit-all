import type { HomeStatusViewerItem } from './HomeStatusViewer';

/** A rail tile + the viewer payload it opens. Building these as one ordered list
 * lets the viewer walk to the next/previous follower's story (bug 2). */
export interface HomeStatusEntry {
  key: string;
  label: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  initials: string;
  /** False once every slide has been seen — greys the ring (Bug 2). */
  active: boolean;
  viewer: HomeStatusViewerItem;
}

export function initials(name?: string | null): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function firstMedia(items?: Array<{ url?: string | null; type?: string | null }>) {
  return (items ?? []).find((item) => !!item?.url) ?? null;
}

interface BuildArgs {
  followedClubs: any[];
  hostPods: any[];
  followedUsers: any[];
  followedPosts: any[];
}

function clubEntry(club: any): HomeStatusEntry {
  const moments = (club.club_moments ?? []).filter((item: any) => item?.url);
  const media = firstMedia(moments) ?? firstMedia(club.club_feature_images_and_videos);
  return {
    key: `club-${club.id}`,
    label: club.club_name,
    imageUrl: media?.type === 'VIDEO' ? null : media?.url,
    videoUrl: media?.type === 'VIDEO' ? media?.url : null,
    initials: initials(club.club_name),
    active: true,
    viewer: {
      kind: 'club',
      label: club.club_name,
      subLabel: 'Club status',
      avatarUrl: firstMedia(club.club_feature_images_and_videos)?.url,
      mediaUrl: media?.url,
      mediaType: media?.type,
      slides: moments.map((moment: any, index: number) => ({
        mediaUrl: moment.url,
        mediaType: moment.type,
        subLabel: `Club status ${index + 1}/${moments.length}`,
      })),
      targetUrl: club.club_id ? `/club/${club.club_id}` : undefined,
      internal: true,
    },
  };
}

function podEntry(pod: any): HomeStatusEntry {
  const media = firstMedia(pod.pod_images_and_videos);
  return {
    key: `pod-${pod.id}`,
    label: pod.pod_title,
    imageUrl: media?.type === 'VIDEO' ? null : media?.url,
    videoUrl: media?.type === 'VIDEO' ? media?.url : null,
    initials: initials(pod.pod_title),
    active: true,
    viewer: {
      kind: 'pod',
      label: pod.pod_title,
      subLabel: 'Your pod status',
      mediaUrl: media?.url,
      mediaType: media?.type,
      slides: (pod.pod_images_and_videos ?? []).map((item: any, index: number) => ({
        mediaUrl: item.url,
        mediaType: item.type,
        subLabel: `Pod status ${index + 1}/${pod.pod_images_and_videos.length}`,
      })),
      targetUrl: pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : undefined,
      internal: true,
    },
  };
}

function userEntry(user: any, followedPosts: any[]): HomeStatusEntry {
  const posts = followedPosts.filter((post) => post.author_id === user.user_id);
  const firstPost = posts[0];
  const firstIsVideo = firstPost?.media_type === 'VIDEO';
  const name = user.first_name || user.full_name || 'User';
  return {
    key: `user-${user.user_id}`,
    label: name,
    imageUrl: firstIsVideo ? null : firstPost?.image_url || user.profile_photo,
    videoUrl: firstIsVideo ? firstPost?.image_url : null,
    initials: initials(user.full_name || user.first_name),
    // Unseen while any of the author's stories hasn't been opened (Bug 2).
    active: posts.some((post) => !post.seen_by_me),
    viewer: {
      kind: 'user',
      label: name,
      subLabel: user.full_name,
      avatarUrl: user.profile_photo,
      mediaUrl: firstPost?.image_url || user.profile_photo,
      mediaType: firstPost?.media_type ?? 'IMAGE',
      slides: posts.map((post, index) => ({
        id: post.id,
        mediaUrl: post.image_url,
        mediaType: post.media_type ?? 'IMAGE',
        subLabel: post.caption || `Status ${index + 1}/${posts.length}`,
        createdAt: post.created_at,
        expiresAt: post.expires_at,
        likeCount: post.likes_count ?? 0,
        likedByMe: post.liked_by_me ?? false,
      })),
      targetUrl: `/u/${user.user_id}`,
      internal: true,
    },
  };
}

/** Ordered rail entries: followed clubs → your hosted pods → followed users.
 * (The "my status" tile is handled separately by the rail.) */
export function buildHomeStatusEntries({
  followedClubs,
  hostPods,
  followedUsers,
  followedPosts,
}: BuildArgs): HomeStatusEntry[] {
  return [
    ...followedClubs.map((c) => clubEntry(c)),
    ...hostPods.map((p) => podEntry(p)),
    ...followedUsers.map((u) => userEntry(u, followedPosts)),
  ];
}

/** Build the "my status" viewer payload from the signed-in user's stories. */
export function buildMyStatusViewer(me: any): HomeStatusViewerItem | null {
  const stories = (me?.my_stories ?? []) as any[];
  if (stories.length === 0) return null;
  const first = stories[0];
  return {
    kind: 'mine',
    label: me?.full_name || me?.first_name || 'My status',
    avatarUrl: me?.profile_photo,
    mediaUrl: first.image_url,
    mediaType: first.media_type,
    slides: stories.map((story, storyIndex) => ({
      id: story.id,
      mediaUrl: story.image_url,
      mediaType: story.media_type,
      subLabel: story.caption || `Story ${storyIndex + 1}/${stories.length}`,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
    })),
  };
}
