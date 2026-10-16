import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  /** Pod rooms: when the whole room is deleted (ISO). */
  deletesAt: string | null;
  /** Club rooms: how many days a message is kept. */
  retentionDays: number | null;
}

/** How long what members write is kept — mWeb's ChatRetentionNotice (rule 27).
 * Renders nothing when there is nothing to promise. */
export function ChatRetentionNotice({ deletesAt, retentionDays }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  let line: string | null = null;
  if (deletesAt) line = t('mweb.chatRoom.deletesOn', { vars: { date: formatDateTime(deletesAt) } });
  else if (retentionDays)
    line = t('mweb.chatRoom.deletesAfterDays', { vars: { days: retentionDays } });
  if (!line) return null;
  return (
    <XStack
      testID="chat-retention-notice"
      alignItems="center"
      justifyContent="center"
      gap={6}
      paddingHorizontal={16}
      paddingBottom={8}
    >
      <MaterialIcons name="schedule" size={14} color={muted} />
      <Text fontSize={12} color="$muted" textAlign="center" flexShrink={1}>
        {line}
      </Text>
    </XStack>
  );
}
