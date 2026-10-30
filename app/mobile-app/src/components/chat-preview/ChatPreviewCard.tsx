import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { chatPreviewAction, type ChatPreviewKind } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard/SurfaceCard';
import { useChatPreview } from '@/hooks/useChatPreview';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { ChatPreviewBody } from './ChatPreviewBody';
import { ChatPreviewJoin } from './ChatPreviewJoin';

interface ChatPreviewCardProps {
  kind: ChatPreviewKind;
  /** The pod's or club's document id. */
  id: string;
  /** A member opens the full room. */
  onOpen: () => void;
  /** A club visitor joins the room by following the club; the card re-reads after. */
  onJoinClub?: () => Promise<void>;
  /** Changes when the viewer's access may have changed (a booking), so the card re-reads. */
  reloadKey?: string;
}

/**
 * The chat at the bottom of a pod's or a club's details: everything said in the
 * room, newest at the bottom, readable by anyone signed in. A member opens the
 * room to post; a visitor is told what to do first. mWeb twin:
 * components/chat-preview/ChatPreviewCard.
 */
export function ChatPreviewCard({
  kind,
  id,
  onOpen,
  onJoinClub,
  reloadKey,
}: Readonly<ChatPreviewCardProps>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const chat = useChatPreview(kind, id, reloadKey);
  // The details screen stays mounted under the chat room: coming back must
  // show what was said there without a manual refresh.
  useRefetchOnFocus(chat.retry, 'ChatPreview');

  const action = chatPreviewAction(kind, !!chat.preview?.is_member);
  const lockedHint = kind === 'POD' ? t('mweb.chat.podChatLocked') : t('mweb.chatRoom.joinToChat');

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
        <ChatPreviewBody chat={chat} />
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
          <ChatPreviewJoin lockedHint={lockedHint} onJoinClub={onJoinClub} onJoined={chat.retry} />
        ) : null}
      </SurfaceCard>
    </YStack>
  );
}
