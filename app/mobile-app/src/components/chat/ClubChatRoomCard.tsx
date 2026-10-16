import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ChatRoomAvatar } from '@/components/chat/ChatRoomAvatar';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { ClubChatRoom } from '@/hooks/useClubChatRooms';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { formatDateTime } from '@/utils/date-format';
import { PodMessageType } from '@/generated/graphql/graphql';

/** The room's last line, in the reader's words: a photo or sticker by name. */
function lastLine(room: ClubChatRoom, t: Translate): string {
  if (!room.last_message_at) return t('mweb.chat.noMessagesYet');
  if (room.last_message_type === PodMessageType.Image) return t('mweb.chat.lastPhoto');
  if (room.last_message_type === PodMessageType.Sticker) return t('mweb.chat.lastSticker');
  return room.last_message_preview || t('mweb.chat.clubChat');
}

/** A club room row in the Chats screen's Clubs tab — mWeb's ClubChatsPanel row. */
export function ClubChatRoomCard({ room, onPress }: Readonly<{ room: ClubChatRoom; onPress: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const line = lastLine(room, t);
  return (
    <SurfaceCard
      testID={`club-chat-room-${room.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${room.club_name}, ${line}`}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={12}
      padding={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <ChatRoomAvatar coverUrl={room.cover_url} fallbackIcon="groups" />
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="600" numberOfLines={1}>
          {room.club_name}
        </Text>
        <Text fontSize={13} color="$muted" numberOfLines={1}>
          {line}
        </Text>
        {room.last_message_at ? (
          <Text fontSize={11} color="$muted">
            {formatDateTime(room.last_message_at)}
          </Text>
        ) : null}
      </YStack>
      <XStack>
        <MaterialIcons name="chevron-right" size={22} color={muted} />
      </XStack>
    </SurfaceCard>
  );
}
