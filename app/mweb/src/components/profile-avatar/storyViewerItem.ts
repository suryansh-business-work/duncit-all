import type { HomeStatusViewerItem } from '../../pages/home-page/HomeStatusViewer';

interface Story {
  id: string;
  image_url: string;
  media_type?: string | null;
  caption?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
}

/** Build the own-story viewer item from my active stories, oldest → newest, so
 * the viewer walks them as slides with their ids (for delete, item 12). */
export function buildOwnStoryItem(
  name: string,
  avatarUrl: string | null,
  stories: Story[],
): HomeStatusViewerItem | null {
  if (stories.length === 0) return null;
  const slides = [...stories]
    .sort((a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime())
    .map((story) => ({
      id: story.id,
      mediaUrl: story.image_url,
      mediaType: story.media_type ?? 'IMAGE',
      caption: story.caption ?? undefined,
      createdAt: story.created_at ?? undefined,
      expiresAt: story.expires_at ?? undefined,
    }));
  return { label: name, avatarUrl, slides };
}
