import { XStack, YStack } from 'tamagui';
import type { VenueChatReadMark } from '@duncit/utils';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { useTranslation } from '@/hooks/useTranslation';

/** A face's edge — small enough to sit under a line without crowding it. */
const FACE = 18;

/**
 * "Seen" as Google Chat shows it: the small faces of the other members who
 * have read the thread as far as this line (`seenFacesByLine` decides which
 * line), at its trailing edge, named once for a screen reader. Nothing under
 * a line nobody has stopped at.
 */
export function VenueChatSeenFaces({
  lineId,
  faces,
}: Readonly<{ lineId: string; faces: readonly VenueChatReadMark[] | undefined }>) {
  const { t } = useTranslation();
  if (!faces || faces.length === 0) return null;
  const names = faces.map((face) => face.name).join(', ');

  return (
    <XStack
      testID={`venue-chat-seen-${lineId}`}
      accessible
      role="img"
      aria-label={t('availability.offers.chat.seenBy', { vars: { names } })}
      justifyContent="flex-end"
      paddingHorizontal={16}
      gap={2}
    >
      {faces.map((face) => (
        <YStack
          key={face.user_id}
          testID={`venue-chat-seen-face-${face.user_id}`}
          borderRadius={FACE / 2}
          borderWidth={1}
          borderColor="$background"
          aria-hidden
        >
          <AttendeeAvatar uri={face.photo ?? ''} name={face.name} size={FACE} />
        </YStack>
      ))}
    </XStack>
  );
}
