import { Text, XStack, YStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';
import { AppImage } from '@/components/AppImage';
import type { RoomMember } from '@/hooks/useRoomMembers';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  members: readonly RoomMember[];
  onPick: (member: RoomMember) => void;
}

/** The @ list over the composer: members whose name matches what follows `@`.
 * mWeb twin: chat-room-page/MentionSuggestions. */
export function MentionSuggestionList({ members, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  if (members.length === 0) return null;
  return (
    <YStack
      testID="chat-mention-suggestions"
      role="list"
      aria-label={t('mweb.chatRoom.mention.suggestions')}
      marginHorizontal={12}
      marginBottom={4}
      borderWidth={1}
      borderColor="$cardBorder"
      borderRadius={12}
      backgroundColor="$surface"
      overflow="hidden"
    >
      {members.map((member) => (
        <XStack
          key={member.user_id}
          testID={`chat-mention-option-${member.user_id}`}
          role="button"
          tabIndex={0}
          aria-label={member.full_name}
          onPress={() => onPick(member)}
          alignItems="center"
          gap={10}
          paddingHorizontal={12}
          minHeight={44}
          pressStyle={PRESS_STYLE.row}
        >
          {member.profile_photo ? (
            <AppImage
              source={{ uri: member.profile_photo }}
              accessibilityLabel=""
              style={{ width: 28, height: 28, borderRadius: 14 }}
            />
          ) : (
            <YStack
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={12} fontWeight="700" color="$color">
                {member.full_name.charAt(0)}
              </Text>
            </YStack>
          )}
          <Text fontSize={14} color="$color" numberOfLines={1} flex={1}>
            {member.full_name}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
