import { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { ListSkeleton } from '@/components/Skeleton/ListSkeleton';
import type { useChatPreview } from '@/hooks/useChatPreview';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ChatPreviewLine } from './ChatPreviewLine';

interface Props {
  chat: ReturnType<typeof useChatPreview>;
}

/** The lines of a chat preview, oldest first, under a "show earlier" control. */
function ChatPreviewList({ chat }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      {chat.canLoadEarlier ? (
        <DuncitButton
          testID="chat-preview-earlier"
          label={t('mweb.chat.showEarlier')}
          variant="ghost"
          size="sm"
          loading={chat.loadingEarlier}
          onPress={() => fireAndForget(chat.loadEarlier())}
        />
      ) : null}
      {chat.earlierFailed ? (
        <Text role="alert" fontSize={12} color="$danger" textAlign="center">
          {t('mweb.chat.previewFailed')}
        </Text>
      ) : null}
      {chat.messages.map((m) => (
        <ChatPreviewLine key={m.id} message={m} />
      ))}
    </YStack>
  );
}

/** What the chat preview card shows inside its surface: loading, error, empty or the lines. */
export function ChatPreviewBody({ chat }: Readonly<Props>) {
  const { t } = useTranslation();
  const listRef = useRef<ScrollView>(null);

  // Open on the newest line, as a chat does — only when the newest line
  // changes, never when an older page is put above what the reader is looking at.
  const newestId = chat.messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, [newestId]);

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
  return (
    <ScrollView
      ref={listRef}
      nestedScrollEnabled
      style={{ maxHeight: 360 }}
      testID="chat-preview-list"
    >
      <ChatPreviewList chat={chat} />
    </ScrollView>
  );
}
