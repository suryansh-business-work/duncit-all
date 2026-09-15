import { useMemo, useState } from 'react';
import { XStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ScrollRail } from '@/components/ScrollRail';
import { StatusViewer } from '@/components/status/StatusViewer';
import type { StatusGroup } from '@/hooks/useStatus';
import type { PublicProfileStory } from '@/hooks/usePublicProfile';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  authorId: string;
  name: string;
  photo?: string | null;
  stories: PublicProfileStory[];
}

/**
 * A member's active stories on their public profile — the RN twin of mWeb's
 * PublicProfileStories.
 *
 * The rings open the SAME viewer the home rail does, so a story opened from a
 * profile runs its 15s timeline and auto-advances like every other story on the
 * app. It used to open the plain image viewer: a still frame with a close
 * button and no progress bar at all.
 */
export function PublicProfileStories({ authorId, name, photo, stories }: Readonly<Props>) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // The rail and the viewer read the same oldest → newest slides, so the ring
  // that was tapped is the slide that opens.
  const group = useMemo<StatusGroup | null>(() => {
    const slides = [...stories]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((story) => ({
        id: story.id,
        imageUrl: story.image_url,
        mediaType:
          String(story.media_type ?? 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        caption: story.caption ?? null,
        createdAt: story.created_at,
        expiresAt: story.expires_at,
        seenByMe: story.seen_by_me ?? false,
        likedByMe: false,
        likesCount: 0,
      }));
    const cover = slides.at(-1);
    if (!cover) return null;
    return { authorId, name, photo, slides, cover };
  }, [stories, authorId, name, photo]);

  if (!group) return null;

  return (
    <>
      <ScrollRail testID="public-profile-stories" gap={12} paddingHorizontal={4}>
        {group.slides.map((slide, index) => (
          <XStack
            pressStyle={PRESS_STYLE.surface}
            key={slide.id}
            testID={`public-profile-story-${index}`}
            role="button"
            tabIndex={0}
            aria-label={t('mweb.a11y.openStatusNumber', { vars: { number: index + 1 } })}
            onPress={() => setOpenIndex(index)}
            borderRadius={36}
            borderWidth={3}
            borderColor="$accent"
            padding={2}
          >
            <AppImage
              source={{ uri: slide.imageUrl ?? '' }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          </XStack>
        ))}
      </ScrollRail>

      <StatusViewer
        status={openIndex === null ? null : group}
        startIndex={openIndex ?? 0}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
