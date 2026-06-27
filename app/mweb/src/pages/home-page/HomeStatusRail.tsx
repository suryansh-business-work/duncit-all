import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import HomeStatusTile from './HomeStatusTile';
import HomeStatusViewer from './HomeStatusViewer';
import MyStatusUploadTile from './MyStatusUploadTile';
import { buildHomeStatusEntries, buildMyStatusViewer } from './homeStatusItems';

interface HomeStatusRailProps {
  me?: any;
  branding?: any;
  followedClubs: any[];
  followedPods: any[];
  hostPods: any[];
  followedPosts: any[];
  followedUsers: any[];
}

export default function HomeStatusRail({
  me,
  branding,
  followedClubs,
  followedPods,
  hostPods,
  followedPosts,
  followedUsers,
}: Readonly<HomeStatusRailProps>) {
  // Index into the ordered viewer sequence ([my status, …entries]); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const entries = useMemo(
    () =>
      buildHomeStatusEntries({
        followedClubs,
        hostPods,
        followedPods,
        followedUsers,
        followedPosts,
      }),
    [followedClubs, hostPods, followedPods, followedUsers, followedPosts],
  );

  const myViewer = useMemo(() => buildMyStatusViewer(me), [me]);
  const viewerItems = useMemo(
    () => (myViewer ? [myViewer, ...entries.map((e) => e.viewer)] : entries.map((e) => e.viewer)),
    [myViewer, entries],
  );
  const offset = myViewer ? 1 : 0;
  const activeItem = activeIndex != null ? viewerItems[activeIndex] ?? null : null;

  // Walk to the next/previous follower's story (bug 2); past the end, close.
  const goNext = () =>
    setActiveIndex((i) => (i != null && i < viewerItems.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));

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
      />
    </>
  );
}
