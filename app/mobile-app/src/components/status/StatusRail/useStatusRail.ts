import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStoryRail, type StoryRailItem, type StoryTarget } from '@/hooks/useStoryRail';
import { useStatusStore } from '@/stores/status.store';
import { graphqlRequest } from '@/services/graphql.client';
import { TogglePostLikeDocument } from '@/graphql/posts';
import { useActiveAds } from '@/hooks/useActiveAds';
import { useOfficialStatus } from '@/hooks/useOfficialStatus';
import { buildAdStory } from '@/components/status/adStory';
import { buildOfficialStory } from '@/components/status/officialStory';
import {
  openStoryTarget,
  pickSlideSeen,
  pickViewerStatus,
} from '@/components/status/statusRailActions';
import type { useTranslation } from '@/hooks/useTranslation';

import { isGroupSeen, shuffleStatus } from './railOrder';

/** The rail's data, frozen tile order, open-story state and viewer callbacks. */
export function useStatusRail(t: ReturnType<typeof useTranslation>['t']) {
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
  const [reporting, setReporting] = useState<string | null>(null);
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
  // Somebody else's story — a followed person's or a club's — can be reported.
  // The viewer's own, an ad and Duncit's pinned group cannot.
  const activeIsClub = !!activeKey && activeKey.startsWith('club-');
  const canReport = activeIsPerson || activeIsClub;
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

  return {
    mine,
    upload: { uploading, progress, pendingVideo, pickAndUpload, confirmVideo, cancelVideo },
    seenIds,
    setOfficialOpen,
    setAdOpen,
    pendingDelete,
    setPendingDelete,
    viewersStoryId,
    setViewersStoryId,
    reporting,
    setReporting,
    ad,
    myCoverIsVideo,
    officialSeenIds,
    officialStory,
    activeIsMine,
    activeIsPerson,
    canReport,
    openAt,
    goNext,
    goPrev,
    followed,
    closeViewer,
    openTarget,
    standalone,
    viewerStatus,
    slideSeen,
    toggleLike,
    confirmDelete,
  };
}
