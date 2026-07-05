import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'tamagui';

import type { RootStackParamList } from '@/navigation/types';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStoryRail, type StoryTarget } from '@/hooks/useStoryRail';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusViewer } from '@/components/status/StatusViewer';

interface StatusRailProps {
  userName: string;
  userPhoto?: string | null;
}

/** Home status rail — "Your story" upload tile first, then the same followed
 * clubs / people mWeb shows (bug 3). Tapping one opens the viewer, which walks
 * the whole ordered list so the next/previous story is a tap or swipe away
 * (bug 2) and can deep-link into the club/profile via "Open details". */
export function StatusRail({ userPhoto }: Readonly<StatusRailProps>) {
  const { mine, items } = useStoryRail();
  const { uploading, pickAndUpload } = useStatusUpload();
  const { openClub } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Index into the ordered list (mine first, then followed content); null = closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const myCoverIsVideo = mine?.cover.mediaType === 'VIDEO';

  const groups = useMemo(() => (mine ? [mine, ...items] : items), [mine, items]);
  const active = activeIndex != null ? (groups[activeIndex] ?? null) : null;
  const openAt = (groupIndex: number) => setActiveIndex(groupIndex);
  const goNext = () => setActiveIndex((i) => (i != null && i < groups.length - 1 ? i + 1 : null));
  const goPrev = () => setActiveIndex((i) => (i != null && i > 0 ? i - 1 : i));

  const openTarget = (target: StoryTarget) => {
    setActiveIndex(null);
    if (target.kind === 'club') openClub(target.id, target.title);
    else navigation.navigate('PublicProfile', { userId: target.id });
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
        {items.map((item, itemIndex) => (
          <StatusTile
            key={item.key}
            testID={`status-${item.key}`}
            label={item.name}
            image={item.photo ?? item.cover.imageUrl}
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
      />
    </>
  );
}
