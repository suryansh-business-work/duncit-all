import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Spinner, YStack } from 'tamagui';
import { isNearBottom, type AskDuncitMessageView } from '@duncit/utils';

import { JumpToLatestButton } from '@/components/support-chat/JumpToLatestButton';
import { useTranslation } from '@/hooks/useTranslation';
import { AskMessageBubble } from './AskMessageBubble';

interface Props {
  messages: AskDuncitMessageView[];
  hasMore: boolean;
  loadingOlder: boolean;
  canRollback: boolean;
  voice: boolean;
  speakingId: string | null;
  empty: ReactElement;
  onLoadOlder: () => void;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
  onRate: (messageId: string, rating: 'UP' | 'DOWN') => void;
  onSpeak: (messageId: string, text: string) => void;
}

/** Show "move to bottom" once the reader is this far up. */
const JUMP_THRESHOLD = 240;

/**
 * The conversation — the twin of mWeb's MessageList. An inverted FlatList:
 * virtualized by React Native, it stays at the newest message while the reader
 * is there (offset 0 is the bottom) and loads older pages at its far end.
 */
export function AskMessageList(props: Readonly<Props>) {
  const { messages, hasMore, loadingOlder, onLoadOlder } = props;
  const { t } = useTranslation();
  const listRef = useRef<FlatList<AskDuncitMessageView>>(null);
  const [showJump, setShowJump] = useState(false);
  // Newest first for the inverted list; the shared thread is oldest→newest.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const fromBottom = e.nativeEvent.contentOffset.y;
    setShowJump(!isNearBottom(fromBottom, JUMP_THRESHOLD));
  }, []);

  const onEndReached = useCallback(() => {
    if (hasMore && !loadingOlder) onLoadOlder();
  }, [hasMore, loadingOlder, onLoadOlder]);

  const renderItem = useCallback(
    ({ item }: { item: AskDuncitMessageView }) => (
      <YStack paddingHorizontal={12} paddingVertical={6}>
        <AskMessageBubble
          message={item}
          canRollback={props.canRollback}
          voice={props.voice}
          speaking={props.speakingId === item.id}
          onDecide={props.onDecide}
          onRollback={props.onRollback}
          onRate={props.onRate}
          onSpeak={props.onSpeak}
        />
      </YStack>
    ),
    [
      props.canRollback,
      props.voice,
      props.speakingId,
      props.onDecide,
      props.onRollback,
      props.onRate,
      props.onSpeak,
    ],
  );

  if (!messages.length) return <YStack flex={1}>{props.empty}</YStack>;

  return (
    <YStack flex={1} position="relative">
      <FlatList
        ref={listRef}
        testID="ask-duncit-messages"
        accessibilityLabel={t('askDuncit.conversationLabel')}
        inverted
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        initialNumToRender={12}
        windowSize={9}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={loadingOlder ? <Spinner size="small" marginVertical={8} /> : null}
      />
      {showJump && (
        <JumpToLatestButton
          testID="ask-duncit-jump"
          bottom={16}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        />
      )}
    </YStack>
  );
}
