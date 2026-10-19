import { Text } from 'tamagui';
import { mentionTarget, splitMentions, type MentionMember } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

type Ink = '$onPrimary' | '$color' | '$muted';

interface Props {
  text: string;
  ink: Ink;
  /** The people this message mentions, named by the server. */
  mentioned: readonly MentionMember[];
  onOpenProfile?: (userId: string) => void;
}

/**
 * A message's words with each real @mention drawn bold and tappable to that
 * profile. An @word that names nobody the server recorded stays plain text.
 * mWeb twin: chat-room-page/MessageText.
 */
export function ChatMessageText({ text, ink, mentioned, onOpenProfile }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Text fontSize={14} color={ink}>
      {splitMentions(text).map((part, index) => {
        const userId = part.mention ? mentionTarget(part.text, mentioned) : null;
        const key = `${index}:${part.text}`;
        if (!userId) return <Text key={key}>{part.text}</Text>;
        const name = mentioned.find((m) => m.user_id === userId)?.full_name ?? part.text;
        return (
          <Text
            key={key}
            testID={`chat-mention-${userId}`}
            role="link"
            aria-label={t('mweb.chatRoom.mention.openProfile', { vars: { name } })}
            fontWeight="700"
            textDecorationLine="underline"
            onPress={() => onOpenProfile?.(userId)}
          >
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
}
