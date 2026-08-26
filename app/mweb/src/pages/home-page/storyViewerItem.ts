import type { HomeStatusViewerItem } from './HomeStatusViewer';

interface Story {
  id: string;
  image_url: string;
  media_type?: string | null;
  caption?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
}

/** Build a viewer item from an author's active stories, oldest → newest, so the
 * viewer walks them as timed slides carrying their ids (for delete, item 12).
 * Used for my own story ring and for a member's stories on their profile. */
export function buildStoryViewerItem(
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
