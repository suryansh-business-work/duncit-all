import { Text, YStack } from 'tamagui';
import { chatReplyText, type ChatReplySnippet } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  quote: ChatReplySnippet;
  mine: boolean;
  /** Scrolls to the original when it is loaded. */
  onJump: (messageId: string) => void;
}

/** The answered line inside a reply bubble; tapping it shows the original.
 * mWeb twin: chat-room-page/MessageQuote. */
export function ChatMessageQuote({ quote, mine, onJump }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = quote.user_name ?? '';
  return (
    <YStack
      testID={`chat-quote-${quote.id}`}
      role="button"
      tabIndex={0}
      aria-label={t('mweb.chatRoom.reply.showOriginal', { vars: { name } })}
      onPress={() => onJump(quote.id)}
      borderLeftWidth={3}
      borderColor={mine ? '$onPrimary' : '$primary'}
      borderRadius={6}
      paddingHorizontal={8}
      paddingVertical={4}
      backgroundColor="$soft"
    >
      <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
        {name}
      </Text>
      <Text fontSize={12} color="$muted" numberOfLines={2}>
        {chatReplyText(quote, t)}
      </Text>
    </YStack>
  );
}
