import { useMemo, useState } from 'react';
import { ScrollView } from 'tamagui';

import { useStatus } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusViewer } from '@/components/status/StatusViewer';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** Home status rail — "Your story" upload tile first (tap to pick + post an
 * image), then everyone's latest statuses; tapping one opens the viewer. The
 * viewer walks the whole ordered list so the next/previous author's story is one
 * tap or swipe away (bug 2). */
export function StatusRail({ userName, userPhoto }: Readonly<StatusRailProps>) {
  const { statuses, mine } = useStatus();
  const { uploading, pickAndUpload } = useStatusUpload();
  // Index into the ordered list (mine first, then everyone else); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const myCoverIsVideo = mine?.cover.mediaType === 'VIDEO';

  const groups = useMemo(() => (mine ? [mine, ...statuses] : statuses), [mine, statuses]);
  const active = activeIndex != null ? (groups[activeIndex] ?? null) : null;
  const openAt = (groupIndex: number) => setActiveIndex(groupIndex);
  const goNext = () => setActiveIndex((i) => (i != null && i < groups.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));

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
          ring
          badge
          onPress={() => {
            if (uploading) return;
            if (mine) openAt(0);
            else void pickAndUpload();
          }}
          onBadgePress={() => {
            if (!uploading) void pickAndUpload();
          }}
        />
        {statuses.map((status, statusIndex) => (
          <StatusTile
            key={status.authorId}
            testID={`status-${status.authorId}`}
            label={status.name}
            image={status.photo ?? status.cover.imageUrl}
            onPress={() => openAt(mine ? statusIndex + 1 : statusIndex)}
          />
        ))}
      </ScrollView>
      <StatusViewer
        status={active}
        onClose={() => setActiveIndex(null)}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  );
}
