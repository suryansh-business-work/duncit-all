import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ScrollRail } from '@/components/ScrollRail';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStoryRail, type StoryRailItem, type StoryTarget } from '@/hooks/useStoryRail';
import { useStatusStore } from '@/stores/status.store';
import { graphqlRequest } from '@/services/graphql.client';
import { TogglePostLikeDocument } from '@/graphql/posts';
import type { StatusGroup } from '@/hooks/useStatus';
import { AdCard } from '@/components/ads/AdCard';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useOfficialStatus } from '@/hooks/useOfficialStatus';
import { buildAdStory } from '@/components/status/adStory';
import { buildOfficialStory, type OfficialStory } from '@/components/status/officialStory';
import {
  openOfficialLink,
  openStoryTarget,
  pickSlideSeen,
  pickViewerStatus,
} from '@/components/status/statusRailActions';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusVideoPreviewSheet } from '@/components/status/StatusVideoPreviewSheet';
import { StatusViewer } from '@/components/status/StatusViewer';
import { StoryViewersSheet } from '@/components/status/StoryViewersSheet';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** True once every slide in the group has been seen (server flag or this
 * session's views) — sends the tile to the end of the rail and drops its ring. */
function isGroupSeen(group: StatusGroup, seenIds: Set<string>) {
  return group.slides.length > 0 && group.slides.every((s) => s.seenByMe || seenIds.has(s.id));
}

/** Fisher–Yates shuffle returning a fresh copy — randomises the unseen tiles on
 * every data load (refresh / app open) so the rail order feels alive. */
function shuffleStatus<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = swap;
  }
  return copy;
}

/** Duncit's own pinned tile, at the very head of the rail — before "Your story"
 * and before the sponsored tile. Renders nothing while no status is live, and
 * greys its ring through the rail's own seen rule, like every other tile.
 * Hoisted: a component defined inside another is remade on every render. */
function OfficialStatusTile({
  story,
  seenIds,
  onPress,
}: Readonly<{ story: OfficialStory | null; seenIds: Set<string>; onPress: () => void }>) {
  const { t } = useTranslation();
  if (!story) return null;
  return (
    <StatusTile
      testID="status-official-tile"
      label={t('mweb.status.officialTile')}
      image={story.photo}
      seen={isGroupSeen(story, seenIds)}
      onPress={onPress}
    />
  );
}

/** Home status rail — Duncit's own pinned status first (when one is live), then
 * the "Your story" upload tile, the sponsored tile, and the followed clubs /
 * people ordered as [unseen (randomised)] → [seen, at the end]. The own tile
 * shows upload progress (Bug 1), and the viewer supports like (Bug 5), viewers
 * (Bug 4) and delete (Bug 7). */
export function StatusRail({ userPhoto }: Readonly<StatusRailProps>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const { mine, items } = useStoryRail();
  const { uploading, progress, pendingVideo, pickAndUpload, confirmVideo, cancelVideo } =
    useStatusUpload();
  const { openClub } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const recordView = useStatusStore((s) => s.recordView);
  const deleteStory = useStatusStore((s) => s.deleteStory);
  const seenIds = useStatusStore((s) => s.seenIds);
  // Index into the ordered list (mine first, then followed content); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // The sponsored story opens on its own rather than joining the ordered list:
  // it is not somebody's story to walk to, and keeping it out leaves the tile
  // indexes (and everything that reads them) exactly as they were.
  const [adOpen, setAdOpen] = useState(false);
  // Duncit's own pinned group opens the same way, and for the same reason.
  const [officialOpen, setOfficialOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);
  const { ads } = useActiveAds('STATUS');
  const ad = ads[0];
  const adStory = useMemo(() => (ad ? buildAdStory(ad) : null), [ad]);
  const myCoverIsVideo = mine?.cover.mediaType === 'VIDEO';
  // The live Duncit statuses for the city the viewer has SELECTED.
  const {
    statuses: officialStatuses,
    seenIds: officialSeenIds,
    recordView: recordOfficialView,
  } = useOfficialStatus();
  const officialName = t('mweb.status.officialName');
  const officialStory = useMemo(
    () => buildOfficialStory(officialStatuses, officialName),
    [officialStatuses, officialName],
  );

  // Stable-per-load shuffle: re-shuffles only when `items` changes (refetch /
  // app open), NOT on every seen change.
  const shuffled = useMemo(() => shuffleStatus(items), [items]);
  // Order = own-status first, then unseen (in shuffled order), then the seen
  // tiles at the end. Read against the CURRENT seen state.
  const orderGroups = useCallback(() => {
    const unseen = shuffled.filter((g) => !isGroupSeen(g, seenIds));
    const seen = shuffled.filter((g) => isGroupSeen(g, seenIds));
    return mine ? [mine, ...unseen, ...seen] : [...unseen, ...seen];
  }, [mine, shuffled, seenIds]);
  // Freeze the order while a story is open: the rail sits behind the full-screen
  // viewer, so re-partitioning on `seenIds` mid-view would re-index the open
  // story and make it jump. Recompute ONLY when the viewer is closed (and on data
  // reload) — on close the just-seen tile drops its ring and slides to the end.
  const [groups, setGroups] = useState(() => orderGroups());
  useEffect(() => {
    if (activeIndex === null) setGroups(orderGroups());
  }, [activeIndex, orderGroups]);

  const active = activeIndex == null ? undefined : groups[activeIndex];
  const activeIsMine = active != null && active === mine;
  // Followed people carry a `user-…` key; the own group and club items don't.
  const activeKey = (active as StoryRailItem | undefined)?.key;
  const activeIsPerson = !!activeKey && activeKey.startsWith('user-');
  const openAt = (groupIndex: number) => setActiveIndex(groupIndex);
  const goNext = () => setActiveIndex((i) => (i != null && i < groups.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));
  // The followed tiles are the frozen `groups` minus the leading own-status tile
  // (rendered separately as the upload tile).
  const followed = (mine ? groups.slice(1) : groups) as StoryRailItem[];

  const closeViewer = () => {
    setAdOpen(false);
    setOfficialOpen(false);
    setActiveIndex(null);
  };

  const openTarget = (target: StoryTarget) => {
    closeViewer();
    openStoryTarget(target, navigation, openClub);
  };

  // A pinned group has no siblings to walk to, so it gets no next/prev.
  const standalone = adOpen || officialOpen;
  const viewerStatus = pickViewerStatus(
    { official: officialOpen, ad: adOpen },
    { official: officialStory, ad: adStory, active },
  );
  const slideSeen = pickSlideSeen(
    { official: officialOpen, person: activeIsPerson },
    { official: recordOfficialView, story: recordView },
  );

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
      {/* The mock frames the story rail in its own card, with a decorative
       * paper-plane doodle trailing the tiles. */}
      <SurfaceCard marginHorizontal={16} paddingHorizontal={0} paddingVertical={12}>
        <ScrollRail
          testID="status-rail-scroll"
          gap={12}
          paddingHorizontal={14}
          alignItems="flex-start"
        >
          <OfficialStatusTile
            story={officialStory}
            seenIds={officialSeenIds}
            onPress={() => setOfficialOpen(true)}
          />
          <StatusTile
            testID="status-mine"
            label={uploading ? 'Posting…' : 'Your story'}
            image={myCoverIsVideo ? userPhoto : (mine?.cover.imageUrl ?? userPhoto)}
            badge
            progress={progress}
            onPress={() => {
              if (uploading) return;
              if (mine) openAt(0);
              else fireAndForget(pickAndUpload());
            }}
            onBadgePress={() => {
              if (!uploading) fireAndForget(pickAndUpload());
            }}
          />
          {/* The sponsored tile sits second, right after "Your story" (mock).
              Tapping it opens the ad as a story, never the advertiser's page. */}
          {ad ? (
            <AdCard
              ad={ad}
              variant="tile"
              testID="ad-slot-STATUS"
              onPress={() => setAdOpen(true)}
            />
          ) : null}
          {followed.map((item, itemIndex) => (
            <StatusTile
              key={item.key}
              testID={`status-${item.key}`}
              label={item.name}
              image={item.photo ?? item.cover.imageUrl}
              seen={isGroupSeen(item, seenIds)}
              onPress={() => openAt(mine ? itemIndex + 1 : itemIndex)}
            />
          ))}
          {/* Decorative dotted-arrow doodle from the mock. */}
          <XStack
            aria-hidden
            alignItems="center"
            gap={5}
            paddingTop={22}
            paddingLeft={6}
            opacity={0.55}
          >
            <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
            <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
            <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
            <MaterialIcons
              name="near-me"
              size={22}
              color={accent}
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </XStack>
        </ScrollRail>
      </SurfaceCard>
      {/* A pinned story — sponsored or Duncit's own — has no siblings to walk
          to, so it gets no next/prev: running past its end closes the viewer
          (which falls back to onClose). */}
      <StatusViewer
        status={viewerStatus}
        onClose={closeViewer}
        onNext={standalone ? undefined : goNext}
        onPrev={standalone ? undefined : goPrev}
        onOpenTarget={openTarget}
        onOpenLink={openOfficialLink}
        onDelete={activeIsMine ? setPendingDelete : undefined}
        onViewers={activeIsMine ? setViewersStoryId : undefined}
        onToggleLike={activeIsPerson ? toggleLike : undefined}
        onSlideSeen={slideSeen}
        authorUserId={activeIsMine ? mine?.authorId : undefined}
        onOpenAuthor={(userId) => openTarget({ kind: 'user', id: userId })}
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
      <StoryViewersSheet storyId={viewersStoryId} onClose={() => setViewersStoryId(null)} />
      <ConfirmDialog
        testID="status-delete-confirm"
        open={pendingDelete !== null}
        title={t('mweb.common.deleteStory')}
        message="This story will be removed for everyone. This can't be undone."
        confirmLabel={t('mweb.common.delete')}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
