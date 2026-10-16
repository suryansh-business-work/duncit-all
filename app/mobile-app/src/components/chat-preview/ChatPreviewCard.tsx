import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { chatPreviewAction, type ChatPreviewKind } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ListSkeleton } from '@/components/Skeleton/ListSkeleton';
import { SurfaceCard } from '@/components/SurfaceCard/SurfaceCard';
import { useChatPreview } from '@/hooks/useChatPreview';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ChatPreviewLine } from './ChatPreviewLine';

interface ChatPreviewCardProps {
  kind: ChatPreviewKind;
  /** The pod's or club's document id. */
  id: string;
  /** A member opens the full room. */
  onOpen: () => void;
  /** A club visitor joins the room by following the club; the card re-reads after. */
  onJoinClub?: () => Promise<void>;
}

/**
 * The chat at the bottom of a pod's or a club's details: everything said in the
 * room, newest at the bottom, readable by anyone signed in. A member opens the
 * room to post; a visitor is told what to do first. mWeb twin:
 * components/chat-preview/ChatPreviewCard.
 */
export function ChatPreviewCard({ kind, id, onOpen, onJoinClub }: Readonly<ChatPreviewCardProps>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  const chat = useChatPreview(kind, id);
  const listRef = useRef<ScrollView>(null);

  // Open on the newest line, as a chat does — only when the newest line
  // changes, never when an older page is put above what the reader is looking at.
  const newestId = chat.messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, [newestId]);

  const action = chatPreviewAction(kind, !!chat.preview?.is_member);
  const lockedHint = kind === 'POD' ? t('mweb.chat.podChatLocked') : t('mweb.chatRoom.joinToChat');

  let body: ReactNode;
  if (chat.loading) {
    body = <ListSkeleton count={3} testID="chat-preview-loading" />;
  } else if (chat.error) {
    body = (
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
  } else if (chat.messages.length === 0) {
    body = (
      <Text role="status" fontSize={13} color="$muted" testID="chat-preview-empty">
        {t('mweb.chat.noMessagesYet')}
      </Text>
    );
  } else {
    body = (
      <ScrollView
        ref={listRef}
        nestedScrollEnabled
        style={{ maxHeight: 360 }}
        testID="chat-preview-list"
      >
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
      </ScrollView>
    );
  }

  return (
    <YStack gap={10} paddingHorizontal={16} testID={`chat-preview-${kind.toLowerCase()}`}>
      <XStack alignItems="center" justifyContent="space-between">
        <YStack>
          <Text role="heading" fontSize={18} fontWeight="700" color="$color">
            {kind === 'POD' ? t('mweb.chat.podChat') : t('mweb.chat.clubChat')}
          </Text>
          {chat.preview ? (
            <XStack alignItems="center" gap={6} testID="chat-preview-status">
              <YStack
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor={chat.preview.closed ? '$muted' : '$primary'}
              />
              <Text fontSize={13} color={chat.preview.closed ? '$muted' : '$accent'}>
                {chat.preview.closed ? t('mweb.chatRoom.ended') : t('mweb.chat.liveNow')}
              </Text>
            </XStack>
          ) : null}
        </YStack>
        {chat.total > 0 ? (
          <YStack
            backgroundColor="$primary"
            borderRadius={999}
            paddingHorizontal={10}
            paddingVertical={4}
          >
            <Text fontSize={12} fontWeight="700" color="$onPrimary" testID="chat-preview-count">
              {t('mweb.chat.messageCount', { count: chat.total })}
            </Text>
          </YStack>
        ) : null}
      </XStack>
      <SurfaceCard gap={14}>
        {body}
        {chat.preview && action === 'OPEN' ? (
          <DuncitButton
            testID="chat-preview-open"
            label={t('mweb.chat.openChat')}
            fullWidth
            icon={<MaterialIcons name="chat-bubble-outline" size={18} color={onPrimary} />}
            onPress={onOpen}
          />
        ) : null}
        {chat.preview && action !== 'OPEN' ? (
          <YStack gap={8}>
            {onJoinClub ? (
              <DuncitButton
                testID="chat-preview-join"
                label={t('mweb.chat.joinRoom')}
                fullWidth
                accessibilityHint={lockedHint}
                icon={<MaterialIcons name="lock-outline" size={18} color={onPrimary} />}
                onPress={() =>
                  fireAndForget(
                    (async () => {
                      await onJoinClub();
                      await chat.retry();
                    })(),
                  )
                }
              />
            ) : (
              // A pod is joined by booking, which this card cannot do — the room
              // reads as locked, not as a button that does nothing.
              <XStack
                testID="chat-preview-locked"
                aria-disabled
                accessible
                accessibilityLabel={`${t('mweb.chat.joinRoom')}. ${lockedHint}`}
                alignItems="center"
                justifyContent="center"
                gap={8}
                height={48}
                borderRadius={999}
                borderWidth={1}
                borderColor="$cardBorder"
              >
                <MaterialIcons name="lock-outline" size={18} color={muted} />
                <Text fontSize={15} fontWeight="600" color="$muted">
                  {t('mweb.chat.joinRoom')}
                </Text>
              </XStack>
            )}
            <Text fontSize={13} color="$muted" textAlign="center" testID="chat-preview-locked-hint">
              {lockedHint}
            </Text>
          </YStack>
        ) : null}
      </SurfaceCard>
    </YStack>
  );
}
