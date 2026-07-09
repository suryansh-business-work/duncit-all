import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStoryRail, type StoryRailItem, type StoryTarget } from '@/hooks/useStoryRail';
import { useStatusStore } from '@/stores/status.store';
import { graphqlRequest } from '@/services/graphql.client';
import { TogglePostLikeDocument } from '@/graphql/posts';
import type { StatusGroup } from '@/hooks/useStatus';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusViewer } from '@/components/status/StatusViewer';
import { StoryViewersSheet } from '@/components/status/StoryViewersSheet';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** True once every slide in the group has been seen (server flag or this
 * session's views) — greys the ring (Bug 2). */
function isGroupSeen(group: StatusGroup, seenIds: Set<string>) {
  return group.slides.length > 0 && group.slides.every((s) => s.seenByMe || seenIds.has(s.id));
}

/** Home status rail — "Your story" upload tile first, then followed clubs /
 * people. Rings grey once seen (Bug 2), the own tile shows upload progress
 * (Bug 1), and the viewer supports like (Bug 5), viewers (Bug 4) and delete
 * (Bug 7). */
export function StatusRail({ userPhoto }: Readonly<StatusRailProps>) {
  const { mine, items } = useStoryRail();
  const { uploading, progress, pickAndUpload } = useStatusUpload();
  const { openClub } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recordView = useStatusStore((s) => s.recordView);
  const deleteStory = useStatusStore((s) => s.deleteStory);
  const seenIds = useStatusStore((s) => s.seenIds);
  // Index into the ordered list (mine first, then followed content); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);
  const myCoverIsVideo = mine?.cover.mediaType === 'VIDEO';

  const groups = useMemo(() => (mine ? [mine, ...items] : items), [mine, items]);
  const active = activeIndex != null ? (groups[activeIndex] ?? null) : null;
  const activeIsMine = active != null && active === mine;
  // Followed people carry a `user-…` key; the own group and club items don't.
  const activeKey = (active as StoryRailItem | null)?.key;
  const activeIsPerson = !!activeKey && activeKey.startsWith('user-');
  const openAt = (groupIndex: number) => setActiveIndex(groupIndex);
  const goNext = () => setActiveIndex((i) => (i != null && i < groups.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));

  const openTarget = (target: StoryTarget) => {
    setActiveIndex(null);
    if (target.kind === 'club') openClub(target.id, target.title);
    else navigation.navigate('PublicProfile', { userId: target.id });
  };

  const toggleLike = useCallback((slideId: string) => {
    graphqlRequest(TogglePostLikeDocument, { id: slideId }, { auth: true }).catch(() => undefined);
  }, []);

  const confirmDelete = () => {
    const id = pendingDelete;
    setPendingDelete(null);
    setActiveIndex(null);
    /* istanbul ignore next -- the dialog only opens with a pending id */
    if (id) deleteStory(id).catch(() => undefined);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        <StatusTile
          testID="status-mine"
          label={uploading ? 'Posting…' : 'Your story'}
          image={myCoverIsVideo ? userPhoto : (mine?.cover.imageUrl ?? userPhoto)}
          badge
          progress={progress}
          onPress={() => {
            if (uploading) return;
            if (mine) openAt(0);
            else void pickAndUpload();
          }}
          onBadgePress={() => {
            if (!uploading) void pickAndUpload();
          }}
        />
        {items.map((item, itemIndex) => (
          <StatusTile
            key={item.key}
            testID={`status-${item.key}`}
            label={item.name}
            image={item.photo ?? item.cover.imageUrl}
            seen={isGroupSeen(item, seenIds)}
            onPress={() => openAt(mine ? itemIndex + 1 : itemIndex)}
          />
        ))}
      </ScrollView>
      <StatusViewer
        status={active}
        onClose={() => setActiveIndex(null)}
        onNext={goNext}
        onPrev={goPrev}
        onOpenTarget={openTarget}
        onDelete={activeIsMine ? setPendingDelete : undefined}
        onViewers={activeIsMine ? setViewersStoryId : undefined}
        onToggleLike={activeIsPerson ? toggleLike : undefined}
        onSlideSeen={activeIsPerson ? recordView : undefined}
      />
      <StoryViewersSheet storyId={viewersStoryId} onClose={() => setViewersStoryId(null)} />
      <ConfirmDialog
        testID="status-delete-confirm"
        open={pendingDelete !== null}
        title="Delete story?"
        message="This story will be removed for everyone. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
