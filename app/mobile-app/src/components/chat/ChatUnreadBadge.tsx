import { Text, XStack } from 'tamagui';
import { formatUnreadBadge } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

/** A chat row's unread count; nothing for zero. mWeb twin: ChatRoomRowShell's badge. */
export function ChatUnreadBadge({
  count,
  testID,
}: Readonly<{ count?: number | null; testID: string }>) {
  const { t } = useTranslation();
  const label = formatUnreadBadge(count);
  if (!label) return null;
  return (
    <XStack
      testID={testID}
      aria-label={t('mweb.chats.unread', { count: count ?? 0, vars: { count: count ?? 0 } })}
      minWidth={22}
      height={22}
      paddingHorizontal={6}
      borderRadius={11}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={11} fontWeight="700" color="$onPrimary">
        {label}
      </Text>
    </XStack>
  );
}
