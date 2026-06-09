import { Text, XStack } from 'tamagui';

import { CHAT_EMOJIS } from '@/constants/chat';

interface EmojiBarProps {
  onSelect: (emoji: string) => void;
  testID?: string;
}

/** Horizontal quick-emoji strip — used both to insert into the composer and to
 * react to a message (RN twin of mWeb's EmojiPopover). */
export function EmojiBar({ onSelect, testID = 'emoji-bar' }: Readonly<EmojiBarProps>) {
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
          aria-label={`Emoji ${emoji}`}
          onPress={() => onSelect(emoji)}
          fontSize={24}
          padding={6}
          pressStyle={{ opacity: 0.6 }}
        >
          {emoji}
        </Text>
      ))}
    </XStack>
  );
}
