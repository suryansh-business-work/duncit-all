import { useEffect, useRef } from 'react';
import type { ScrollView as RNScrollView } from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import { ChatHistoryTop } from '@/components/chat/ChatHistoryTop';
import { DuncitButton } from '@/components/DuncitButton';
import { ListSkeleton } from '@/components/Skeleton/ListSkeleton';
import { NESTED_SCROLL_HEIGHT } from '@/constants/nested-scroll';
import type { useChatPreview } from '@/hooks/useChatPreview';
import { useHistoryTopScroll } from '@/hooks/useChatHistory';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ChatPreviewLine } from './ChatPreviewLine';

/** Keeps the line being read in place when an older page lands above it. */
const KEEP_POSITION = { minIndexForVisible: 0 } as const;
/** Few lines sit at the bottom of the box, newest last, as a chat does. */
const BOTTOM_ALIGNED = { flexGrow: 1, justifyContent: 'flex-end' } as const;

interface Props {
  chat: ReturnType<typeof useChatPreview>;
}

/**
 * The lines of a chat preview in a fixed-height box, oldest first. Scrolling
 * up to its top loads the earlier page; the control at the top asks for the
 * same page for screen-reader and switch users.
 */
function ChatPreviewList({ chat }: Readonly<Props>) {
  const listRef = useRef<RNScrollView>(null);
  // Open on the newest line, as a chat does — only when the newest line
  // changes, never when an older page is put above what the reader is looking at.
  const newestId = chat.messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, [newestId]);

  const loadEarlier = () => fireAndForget(chat.loadEarlier());
  const onScroll = useHistoryTopScroll(() => {
    if (chat.canLoadEarlier) loadEarlier();
  });

  return (
    <ScrollView
      ref={listRef}
      nestedScrollEnabled
      height={NESTED_SCROLL_HEIGHT}
      onScroll={onScroll}
      scrollEventThrottle={64}
      maintainVisibleContentPosition={KEEP_POSITION}
      contentContainerStyle={BOTTOM_ALIGNED}
      testID="chat-preview-list"
    >
      <YStack gap={12}>
        <ChatHistoryTop
          testIDPrefix="chat-preview"
          loading={chat.loadingEarlier}
          failed={chat.earlierFailed}
          hasOlder={chat.canLoadEarlier}
          onLoadOlder={loadEarlier}
        />
        {chat.messages.map((m) => (
          <ChatPreviewLine key={m.id} message={m} />
        ))}
      </YStack>
    </ScrollView>
  );
}

/** What the chat preview card shows inside its surface: loading, error, empty or the lines. */
export function ChatPreviewBody({ chat }: Readonly<Props>) {
  const { t } = useTranslation();

  if (chat.loading) return <ListSkeleton count={3} testID="chat-preview-loading" />;
  if (chat.error) {
    return (
      <YStack gap={8} testID="chat-preview-error">
        <Text role="alert" fontSize={13} color="$danger">
          {t('mweb.chat.previewFailed')}
        </Text>
        <DuncitButton
          testID="chat-preview-retry"
          label={t('mweb.chat.previewRetry')}
          variant="outline"
          size="sm"
          onPress={() => fireAndForget(chat.retry())}
        />
      </YStack>
    );
  }
  if (chat.messages.length === 0) {
    return (
      <Text role="status" fontSize={13} color="$muted" testID="chat-preview-empty">
        {t('mweb.chat.noMessagesYet')}
      </Text>
    );
  }
  return <ChatPreviewList chat={chat} />;
}
