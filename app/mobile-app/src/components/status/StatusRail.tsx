import { useState } from 'react';
import { ScrollView } from 'tamagui';

import { useStatus, type StatusGroup } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusViewer } from '@/components/status/StatusViewer';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** Home status rail — "Your story" upload tile first (tap to pick + post an
 * image), then everyone's latest statuses; tapping one opens the viewer. */
export function StatusRail({ userName, userPhoto }: Readonly<StatusRailProps>) {
  const { statuses, mine } = useStatus();
  const { uploading, pickAndUpload } = useStatusUpload();
  const [active, setActive] = useState<StatusGroup | null>(null);
  const myCoverIsVideo = mine?.cover.mediaType === 'VIDEO';

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
            if (mine) setActive(mine);
            else void pickAndUpload();
          }}
          onBadgePress={() => {
            if (!uploading) void pickAndUpload();
          }}
        />
        {statuses.map((status) => (
          <StatusTile
            key={status.authorId}
            testID={`status-${status.authorId}`}
            label={status.name}
            image={status.photo ?? status.cover.imageUrl}
            onPress={() => setActive(status)}
          />
        ))}
      </ScrollView>
      <StatusViewer status={active} onClose={() => setActive(null)} />
    </>
  );
}
