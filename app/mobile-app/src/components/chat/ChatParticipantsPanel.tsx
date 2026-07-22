import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChatPerson } from '@/hooks/useChat';

interface PersonProps {
  person: ChatPerson;
  isHost?: boolean;
  onPress: () => void;
}

/** One tappable avatar + name; hosts get a badge. Hoisted so it isn't redefined
 * per render (Sonar S6478). */
function PersonChip({ person, isHost, onPress }: Readonly<PersonProps>) {
  const { onPrimary, primary } = useThemeColors();
  const initial = (person.full_name?.[0] ?? 'U').toUpperCase();
  return (
    <YStack
      testID={`chat-person-${person.user_id}`}
      role="button"
      aria-label={person.full_name}
      onPress={onPress}
      width={64}
      alignItems="center"
      gap={4}
      pressStyle={{ opacity: 0.7 }}
    >
      <YStack
        width={46}
        height={46}
        borderRadius={23}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {person.profile_photo ? (
          <AppImage
            source={{ uri: person.profile_photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={17} fontWeight="900" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>
      {isHost ? (
        <XStack
          alignItems="center"
          gap={2}
          paddingHorizontal={6}
          paddingVertical={1}
          borderRadius={999}
          backgroundColor={primary}
        >
          <MaterialIcons name="star" size={9} color={onPrimary} />
          <Text fontSize={9} fontWeight="900" color={onPrimary}>
            Host
          </Text>
        </XStack>
      ) : null}
      <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
        {person.full_name}
      </Text>
    </YStack>
  );
}

interface Props {
  hosts: ChatPerson[];
  participants: ChatPerson[];
  count: number;
  onOpenProfile: (userId: string) => void;
}

/** The chat-detail people panel: host(s) with a badge, participants and a live
 * participant count. Tapping anyone opens their public profile. */
export function ChatParticipantsPanel({
  hosts,
  participants,
  count,
  onOpenProfile,
}: Readonly<Props>) {
  if (hosts.length === 0 && participants.length === 0) return null;
  return (
    <YStack
      testID="chat-participants"
      gap={6}
      paddingHorizontal={12}
      paddingVertical={8}
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Text fontSize={12} fontWeight="800" color="$muted">
        {count} {count === 1 ? 'participant' : 'participants'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 12 }}
      >
        {hosts.map((host) => (
          <PersonChip
            key={host.user_id}
            person={host}
            isHost
            onPress={() => onOpenProfile(host.user_id)}
          />
        ))}
        {participants.map((person) => (
          <PersonChip
            key={person.user_id}
            person={person}
            onPress={() => onOpenProfile(person.user_id)}
          />
        ))}
      </ScrollView>
    </YStack>
  );
}
