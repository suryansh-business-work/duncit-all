import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { chatReplyText } from '@duncit/utils';

import { PRESS_STYLE } from '@duncit/buttons-native';
import type { ChatMessage } from '@/hooks/useChat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  replyTo: ChatMessage;
  /** The writer's own line reads "You", not their name. */
  mine: boolean;
  onCancel: () => void;
}

/** What the next message answers, over the composer, until it is sent or
 * cancelled. mWeb twin: chat-room-page/ChatReplyStrip. */
export function ChatReplyStrip({ replyTo, mine, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const name = mine ? t('mweb.chatRoom.reply.you') : (replyTo.user_name ?? '');
  return (
    <XStack
      testID="chat-reply-strip"
      alignItems="center"
      gap={8}
      paddingHorizontal={12}
      paddingVertical={6}
      backgroundColor="$soft"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <YStack width={3} alignSelf="stretch" borderRadius={2} backgroundColor="$primary" />
      <YStack flex={1}>
        <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
          {t('mweb.chatRoom.reply.replyingTo', { vars: { name } })}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {chatReplyText(replyTo, t)}
        </Text>
      </YStack>
      <XStack
        testID="chat-reply-cancel"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.chatRoom.reply.cancel')}
        onPress={onCancel}
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        borderRadius={18}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="close" size={20} color={muted} />
      </XStack>
    </XStack>
  );
}
