import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';
import { isStoryLive } from '@duncit/utils';

import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideoPreviewSheet } from '@/components/status/StatusVideoPreviewSheet';
import { StatusViewer } from '@/components/status/StatusViewer';
import { useClubStories } from '@/hooks/useClubStories';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStatusStore } from '@/stores/status.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import type { StatusGroup } from '@/hooks/useStatus';

interface Props {
  clubId: string;
  clubName: string;
}

/**
 * The club's ephemeral 24h stories plus an "Add" tile that posts one to this
 * club — the RN twin of mWeb's ClubStoriesSection. Expired stories never
 * render: the server filters them and `isStoryLive` catches the boundary while
 * the screen stays open.
 */
export function ClubStoriesRail({ clubId, clubName }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { stories, refetch } = useClubStories(clubId);
  const { uploading, error, progress, pendingVideo, pickAndUpload, confirmVideo, cancelVideo } =
    useStatusUpload({ clubId });
  const recordView = useStatusStore((s) => s.recordView);
  const seenIds = useStatusStore((s) => s.seenIds);
  // The group is frozen while the viewer is open, so the 60s poll cannot
  // rewind an in-progress story (the home rail freezes its order the same way).
  const [openAtIndex, setOpenAtIndex] = useState<number | null>(null);
  const [openGroup, setOpenGroup] = useState<StatusGroup | null>(null);

  const live = useMemo(() => stories.filter((story) => isStoryLive(story.expires_at)), [stories]);

  // Refetch when an upload FINISHES — not on mount, where useClubStories has
  // already fetched.
  const wasUploading = useRef(false);
  useEffect(() => {
    if (wasUploading.current && !uploading) fireAndForget(refetch());
    wasUploading.current = uploading;
  }, [uploading, refetch]);

  const group = useMemo<StatusGroup | null>(() => {
    const slides = live.map((story) => ({
      id: story.id,
      imageUrl: story.image_url,
      mediaType: String(story.media_type ?? 'IMAGE').toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      caption: story.caption ?? null,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      seenByMe: (story.seen_by_me ?? false) || seenIds.has(story.id),
      likedByMe: false,
      likesCount: 0,
    }));
    const cover = slides[0];
    if (!cover) return null;
    return { authorId: clubId, name: clubName, photo: cover.imageUrl, slides, cover };
  }, [live, clubId, clubName, seenIds]);

  // Opening pins BOTH the tapped slide and the group it belongs to.
  const openAt = useCallback(
    (index: number) => {
      setOpenAtIndex(index);
      setOpenGroup(group);
    },
    [group],
  );

  const close = useCallback(() => {
    setOpenAtIndex(null);
    setOpenGroup(null);
  }, []);

  return (
    <YStack gap={8} testID="club-stories">
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="auto-stories" size={15} color={primary} />
        <Text fontSize={16} fontWeight="900" color="$color">
          Stories
        </Text>
      </XStack>
      {error ? (
        <Text testID="club-story-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        <StatusTile
          testID="club-story-add"
          label={uploading ? 'Posting…' : 'Add'}
          badge
          progress={progress}
          onPress={() => {
            if (!uploading) fireAndForget(pickAndUpload());
          }}
          onBadgePress={() => {
            if (!uploading) fireAndForget(pickAndUpload());
          }}
        />
        {live.map((story, index) => (
          <StatusTile
            key={story.id}
            testID={`club-story-${story.id}`}
            label={story.author?.full_name?.split(' ')[0] ?? 'Member'}
            image={story.media_type === 'VIDEO' ? null : story.image_url}
            seen={(story.seen_by_me ?? false) || seenIds.has(story.id)}
            onPress={() => openAt(index)}
          />
        ))}
      </ScrollView>
      <StatusViewer
        status={openGroup}
        startIndex={openAtIndex ?? 0}
        onClose={close}
        onNext={close}
        onPrev={close}
        onSlideSeen={recordView}
      />
      <StatusVideoPreviewSheet
        video={
          pendingVideo
            ? { uri: pendingVideo.uri, durationSeconds: pendingVideo.durationSeconds }
            : null
        }
        onCancel={cancelVideo}
        onConfirm={(trim) => fireAndForget(confirmVideo(trim))}
      />
    </YStack>
  );
}
