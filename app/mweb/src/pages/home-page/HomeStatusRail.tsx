import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import { useMutation } from '@apollo/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdTile from '../../components/ads/AdTile';
import { useActiveAds } from '../../components/ads/useActiveAds';
import HomeStatusTile from './HomeStatusTile';
import HomeStatusViewer from './HomeStatusViewer';
import MyStatusUploadTile from './MyStatusUploadTile';
import StoryViewersDialog from './StoryViewersDialog';
import { buildAdViewer, buildHomeStatusEntries, buildMyStatusViewer } from './homeStatusItems';
import { DELETE_STORY_POST, RECORD_STORY_VIEW, TOGGLE_STORY_LIKE } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface HomeStatusRailProps {
  me?: any;
  branding?: any;
  followedClubs: any[];
  hostPods: any[];
  followedPosts: any[];
  followedUsers: any[];
  /** Live club-attached stories — the club rings are built from these. */
  clubStories?: any[];
}

export default function HomeStatusRail({
  me,
  followedClubs,
  hostPods,
  followedPosts,
  followedUsers,
  clubStories,
}: Readonly<HomeStatusRailProps>) {
  const { t } = useTranslation();
  // Index into the ordered viewer sequence ([my status, …entries]); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // The sponsored story opens on its own rather than joining the sequence: it is
  // not somebody's story to walk to, and keeping it out leaves the tile indexes
  // (and everything that reads them) exactly as they were.
  const [adOpen, setAdOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);
  const { ads } = useActiveAds('STATUS');
  const ad = ads[0];
  const adViewer = useMemo(() => (ad ? buildAdViewer(ad) : null), [ad]);

  const [recordView] = useMutation(RECORD_STORY_VIEW);
  const [toggleLike] = useMutation(TOGGLE_STORY_LIKE);
  const [deleteStory] = useMutation(DELETE_STORY_POST, { refetchQueries: ['HomeFeed'] });

  const buildEntries = useCallback(
    () => buildHomeStatusEntries({ followedClubs, hostPods, followedUsers, followedPosts, clubStories }),
    [followedClubs, hostPods, followedUsers, followedPosts, clubStories],
  );
  // Order only while the viewer is closed (the rail sits behind the full-screen
  // viewer). This keeps an open story from re-indexing mid-view; on close / data
  // reload the unseen tiles reshuffle and any just-seen tile drops its ring and
  // slides to the end.
  const [entries, setEntries] = useState<ReturnType<typeof buildEntries>>(buildEntries);
  useEffect(() => {
    if (activeIndex === null) setEntries(buildEntries());
  }, [buildEntries, activeIndex]);

  const myViewer = useMemo(() => buildMyStatusViewer(me), [me]);
  const viewerItems = useMemo(
    () => (myViewer ? [myViewer, ...entries.map((e) => e.viewer)] : entries.map((e) => e.viewer)),
    [myViewer, entries],
  );
  const offset = myViewer ? 1 : 0;
  const openedItem = activeIndex == null ? null : viewerItems[activeIndex] ?? null;
  const activeItem = adOpen ? adViewer : openedItem;
  const activeKind = activeItem?.kind;
  const closeViewer = () => {
    setAdOpen(false);
    setActiveIndex(null);
  };

  // Walk to the next/previous follower's story (bug 2); past the end, close.
  const goNext = () =>
    setActiveIndex((i) => (i != null && i < viewerItems.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));

  const handleRecordView = useCallback(
    (id: string) => {
      recordView({ variables: { id } }).catch(() => undefined);
    },
    [recordView],
  );
  const handleLike = useCallback(
    (id: string) => {
      toggleLike({ variables: { id } }).catch(() => undefined);
    },
    [toggleLike],
  );
  const confirmDelete = () => {
    const id = pendingDelete;
    setPendingDelete(null);
    setActiveIndex(null);
    if (id) deleteStory({ variables: { id } }).catch(() => undefined);
  };

  return (
    <>
      {/* The mock frames the story rail in its own card, with a decorative
       * paper-plane doodle trailing the tiles. */}
      <Box
        sx={{
          borderRadius: '20px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 1.25,
          mb: 1.25,
          minHeight: 96,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollPaddingInline: 12,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack
          direction="row"
          spacing={1.1}
          sx={{
            alignItems: "flex-start",
            width: 'max-content',
            px: 1.5
          }}>
          <MyStatusUploadTile me={me} onView={() => setActiveIndex(0)} />
          {/* The sponsored tile sits second, right after "Your story" (mock). */}
          {ad && <AdTile ad={ad} onOpen={() => setAdOpen(true)} />}
          {entries.map((entry, entryIndex) => (
            <HomeStatusTile
              key={entry.key}
              label={entry.label}
              imageUrl={entry.imageUrl}
              videoUrl={entry.videoUrl}
              initials={entry.initials}
              active={entry.active}
              onClick={() => setActiveIndex(offset + entryIndex)}
            />
          ))}
          {/* Decorative dotted-arrow doodle from the mock. */}
          <Stack
            direction="row"
            spacing={0.6}
            aria-hidden
            sx={{
              alignItems: "center",
              pt: 3,
              pl: 0.75,
              opacity: 0.55,
              flex: '0 0 auto'
            }}>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <NearMeIcon sx={{ fontSize: 22, color: 'primary.main', transform: 'rotate(45deg)' }} />
          </Stack>
        </Stack>
      </Box>
      {/* A sponsored story has no siblings to walk to, so it gets no next/prev:
          running past its end closes the viewer (which falls back to onClose). */}
      <HomeStatusViewer
        item={activeItem}
        onClose={closeViewer}
        onNext={adOpen ? undefined : goNext}
        onPrev={adOpen ? undefined : goPrev}
        onDelete={activeKind === 'mine' ? setPendingDelete : undefined}
        onViewers={activeKind === 'mine' ? setViewersStoryId : undefined}
        onToggleLike={activeKind === 'user' ? handleLike : undefined}
        onRecordView={activeKind === 'user' ? handleRecordView : undefined}
      />
      <StoryViewersDialog storyId={viewersStoryId} onClose={() => setViewersStoryId(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('mweb.common.deleteStory')}
        message="This story will be removed for everyone. This can't be undone."
        confirmLabel={t('mweb.common.delete')}
        destructive
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
