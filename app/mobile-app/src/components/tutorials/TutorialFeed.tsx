import { useMemo, useRef, useState } from 'react';
import { FlatList, useWindowDimensions, type LayoutChangeEvent, type ViewToken } from 'react-native';
import { Spinner, YStack } from 'tamagui';
import { useIsFocused } from '@react-navigation/native';
import { REEL_PRELOAD_DISTANCE, withFocusedFirst } from '@duncit/utils';

import type { TutorialItem, TutorialTopic } from '@/hooks/useTutorialFeed';
import { TutorialReel } from './TutorialReel';

interface Props {
  rows: TutorialItem[];
  topics: readonly TutorialTopic[];
  focusId: string;
  loadingMore: boolean;
  onEndReached: () => void;
  onLike: (item: TutorialItem) => void;
  onComment: (item: TutorialItem) => void;
  onShare: (item: TutorialItem) => void;
  onWatched: (item: TutorialItem) => void;
}

/**
 * The vertical, one-tutorial-per-screen pager — the Explore reels approach:
 * it measures its own height, keeps the current card ±2 mounted, and plays only
 * the visible card while the screen is focused.
 */
export function TutorialFeed({ rows, topics, focusId, loadingMore, onEndReached, onLike, onComment, onShare, onWatched }: Readonly<Props>) {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const focused = useIsFocused();
  const ordered = useMemo(() => withFocusedFirst(rows, focusId), [rows, focusId]);
  const topicLabels = useMemo(() => new Map(topics.map((topic) => [topic.key, topic.label])), [topics]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (index != null) setActiveIndex(index);
  }).current;

  const onLayout = (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height);

  return (
    <YStack flex={1} onLayout={onLayout} testID="tutorials-feed">
      {height > 0 ? (
        <FlatList
          data={ordered}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          windowSize={REEL_PRELOAD_DISTANCE * 2 + 1}
          initialNumToRender={REEL_PRELOAD_DISTANCE + 1}
          maxToRenderPerBatch={2}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={onEndReached}
          onEndReachedThreshold={REEL_PRELOAD_DISTANCE}
          ListFooterComponent={loadingMore ? <Spinner padding={16} color="$primary" /> : null}
          renderItem={({ item, index }) => (
            <TutorialReel
              item={item}
              topicLabel={topicLabels.get(item.topic) ?? ''}
              width={width}
              height={height}
              isActive={focused && index === activeIndex}
              soundOn={soundOn}
              onToggleSound={() => setSoundOn((on) => !on)}
              onLike={() => onLike(item)}
              onComment={() => onComment(item)}
              onShare={() => onShare(item)}
              onWatched={() => onWatched(item)}
            />
          )}
        />
      ) : null}
    </YStack>
  );
}
