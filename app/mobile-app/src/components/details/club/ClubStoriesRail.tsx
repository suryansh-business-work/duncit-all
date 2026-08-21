import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';
import { isStoryLive, parseApiError } from '@duncit/utils';

import { ConfirmSheet } from '@/components/DuncitDialog';
import { ReportStorySheet } from '@/components/status/ReportStorySheet';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideoPreviewSheet } from '@/components/status/StatusVideoPreviewSheet';
import { StatusViewer } from '@/components/status/StatusViewer';
import { DeleteClubStoryDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useClubStories } from '@/hooks/useClubStories';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useStatusStore } from '@/stores/status.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import type { StatusGroup } from '@/hooks/useStatus';

interface Props {
  clubId: string;
  clubName: string;
  /**
   * Only a club's admins may post to its rail, so the Add tile is theirs alone.
   * The server refuses everyone else regardless — this is what stops a member
   * being shown a button that would only ever tell them no.
   */
  canPost: boolean;
}

/**
 * The club's ephemeral 24h stories plus the admin-only "Add" tile — the RN twin
 * of mWeb's ClubStoriesSection. Expired stories never render: the server filters
 * them and `isStoryLive` catches the boundary while the screen stays open.
 */
export function ClubStoriesRail({ clubId, clubName, canPost }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const { stories, refetch } = useClubStories(clubId);
  const { uploading, error, progress, pendingVideo, pickAndUpload, confirmVideo, cancelVideo } =
    useStatusUpload({ clubId });
  const recordView = useStatusStore((s) => s.recordView);
  const seenIds = useStatusStore((s) => s.seenIds);
  // The group is frozen while the viewer is open, so the 60s poll cannot
  // rewind an in-progress story (the home rail freezes its order the same way).
  const [openAtIndex, setOpenAtIndex] = useState<number | null>(null);
  const [openGroup, setOpenGroup] = useState<StatusGroup | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      // Server-owned, and per story: a club admin may delete any of them, an
      // author only their own, everybody else none.
      canDelete: story.can_delete ?? false,
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

  const removeStory = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await graphqlRequest(DeleteClubStoryDocument, { id: pendingDelete }, { auth: true });
      setPendingDelete(null);
      close();
      await refetch();
    } catch (e) {
      setPendingDelete(null);
      setDeleteError(parseApiError(e) || t('contentReport.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const railError = error || deleteError;

  return (
    <YStack gap={8} testID="club-stories">
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="auto-stories" size={15} color={primary} />
        <Text fontSize={16} fontWeight="700" color="$color">
          Stories
        </Text>
      </XStack>
      {railError ? (
        <Text testID="club-story-error" fontSize={12} color="$danger">
          {railError}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {canPost ? (
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
        ) : null}
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
        onDelete={setPendingDelete}
        onReport={setReporting}
      />
      <ReportStorySheet storyId={reporting} onClose={() => setReporting(null)} />
      <ConfirmSheet
        open={!!pendingDelete}
        busy={deleting}
        testIDPrefix="club-story-delete"
        title={t('contentReport.deleteConfirmTitle')}
        message={t('contentReport.deleteConfirmBody')}
        cancelLabel={t('contentReport.deleteCancel')}
        confirmLabel={t('contentReport.deleteConfirmCta')}
        busyLabel={t('contentReport.deleting')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => fireAndForget(removeStory())}
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
