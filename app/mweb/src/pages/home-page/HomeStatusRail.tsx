import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useMutation } from '@apollo/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import HomeStatusTile from './HomeStatusTile';
import HomeStatusViewer from './HomeStatusViewer';
import MyStatusUploadTile from './MyStatusUploadTile';
import StoryViewersDialog from './StoryViewersDialog';
import { buildHomeStatusEntries, buildMyStatusViewer } from './homeStatusItems';
import { DELETE_STORY_POST, RECORD_STORY_VIEW, TOGGLE_STORY_LIKE } from './queries';

interface HomeStatusRailProps {
  me?: any;
  branding?: any;
  followedClubs: any[];
  hostPods: any[];
  followedPosts: any[];
  followedUsers: any[];
}

export default function HomeStatusRail({
  me,
  followedClubs,
  hostPods,
  followedPosts,
  followedUsers,
}: Readonly<HomeStatusRailProps>) {
  // Index into the ordered viewer sequence ([my status, …entries]); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);

  const [recordView] = useMutation(RECORD_STORY_VIEW);
  const [toggleLike] = useMutation(TOGGLE_STORY_LIKE);
  const [deleteStory] = useMutation(DELETE_STORY_POST, { refetchQueries: ['HomeFeed'] });

  const buildEntries = useCallback(
    () => buildHomeStatusEntries({ followedClubs, hostPods, followedUsers, followedPosts }),
    [followedClubs, hostPods, followedUsers, followedPosts],
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
  const activeItem = activeIndex == null ? null : viewerItems[activeIndex] ?? null;
  const activeKind = activeItem?.kind;

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
      <Box
        sx={{
          mx: { xs: -1.25, sm: -2 },
          px: { xs: 1.25, sm: 2 },
          pt: 0.25,
          pb: 1,
          mb: 1.25,
          minHeight: 96,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollPaddingInline: 12,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="flex-start" sx={{ width: 'max-content' }}>
          <MyStatusUploadTile me={me} onView={() => setActiveIndex(0)} />
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
        </Stack>
      </Box>
      <HomeStatusViewer
        item={activeItem}
        onClose={() => setActiveIndex(null)}
        onNext={goNext}
        onPrev={goPrev}
        onDelete={activeKind === 'mine' ? setPendingDelete : undefined}
        onViewers={activeKind === 'mine' ? setViewersStoryId : undefined}
        onToggleLike={activeKind === 'user' ? handleLike : undefined}
        onRecordView={activeKind === 'user' ? handleRecordView : undefined}
      />
      <StoryViewersDialog storyId={viewersStoryId} onClose={() => setViewersStoryId(null)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete story?"
        message="This story will be removed for everyone. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
