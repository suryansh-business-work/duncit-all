import { Text, XStack } from 'tamagui';

import { CHAT_EMOJIS } from '@/constants/chat';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface EmojiBarProps {
  onSelect: (emoji: string) => void;
  testID?: string;
}

/** Horizontal quick-emoji strip — used both to insert into the composer and to
 * react to a message (RN twin of mWeb's EmojiPopover). */
export function EmojiBar({ onSelect, testID = 'emoji-bar' }: Readonly<EmojiBarProps>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID={testID}
      flexWrap="wrap"
      gap={4}
      paddingHorizontal={10}
      paddingVertical={8}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      {CHAT_EMOJIS.map((emoji) => (
        <Text
          key={emoji}
          testID={`emoji-${emoji}`}
          role="button"
          tabIndex={0}
          hitSlop={4}
          aria-label={`${t('mweb.chat.emoji')} ${emoji}`}
          onPress={() => onSelect(emoji)}
          fontSize={24}
          padding={6}
          pressStyle={PRESS_STYLE.inline}
        >
          {emoji}
        </Text>
      ))}
    </XStack>
  );
}
