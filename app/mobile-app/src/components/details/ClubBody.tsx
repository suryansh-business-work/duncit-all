import { Image, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AttendeesSection, buildAttendeePeople } from '@/components/details/PodSections';
import type { ClubDetail, ClubPod, PodPerson } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PodCard } from '@/components/home/PodCard';

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <YStack flex={1} alignItems="flex-start">
      <Text fontSize={18} fontWeight="900" color="$color">
        {value}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

/** The club-details body — summary, stats, WhatsApp chat, moments and the
 * club's upcoming pods (each opens the pod). */
export function ClubBody({
  club,
  pods,
  members,
  cardWidth,
  onOpenPod,
  onOpenMember,
}: Readonly<{
  club: ClubDetail;
  pods: ClubPod[];
  members: PodPerson[];
  cardWidth: number;
  onOpenPod: (pod: ClubPod) => void;
  onOpenMember: (userId: string) => void;
}>) {
  const { onPrimary } = useThemeColors();
  const moments = club.club_moments.filter((m) => !!m.url);
  const chat = club.club_whats_app_group_link || club.club_whats_app_community_link;

  return (
    <YStack padding={16} gap={18}>
      <Text fontSize={24} fontWeight="900" color="$color">
        {club.club_name}
      </Text>
      {club.club_description ? (
        <Text fontSize={14} color="$muted" lineHeight={20}>
          {club.club_description}
        </Text>
      ) : null}
      <XStack
        gap={8}
        padding={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Stat value={pods.length} label="pods" />
        <Stat value={moments.length} label="moments" />
        <Stat value={club.meetup_venues_id.length} label="venues" />
      </XStack>
      {members.length > 0 ? (
        <YStack gap={8} testID="club-members">
          <Text fontSize={16} fontWeight="900" color="$color">
            Members
          </Text>
          <AttendeesSection
            people={buildAttendeePeople(
              members,
              members.map((member) => member.user_id),
              [],
            )}
            spots={0}
            onOpenProfile={onOpenMember}
          />
        </YStack>
      ) : null}
      {chat ? (
        <XStack
          testID="club-chat"
          role="button"
          aria-label="Chat on WhatsApp"
          onPress={() => void Linking.openURL(chat)}
          alignItems="center"
          justifyContent="center"
          gap={8}
          height={48}
          borderRadius={14}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="chat" size={18} color={onPrimary} />
          <Text fontSize={14} fontWeight="900" color="$onPrimary">
            Chat on WhatsApp
          </Text>
        </XStack>
      ) : null}
      {moments.length > 0 ? (
        <YStack gap={8}>
          <Text fontSize={16} fontWeight="900" color="$color">
            Moments
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {moments.map((moment, i) => (
              <Image
                key={`${i}-${moment.url}`}
                source={{ uri: moment.url }}
                style={{ width: 120, height: 150, borderRadius: 14 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </YStack>
      ) : null}
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="900" color="$color">
          Upcoming pods
        </Text>
        {pods.length === 0 ? (
          <Text testID="club-no-pods" fontSize={13} color="$muted">
            No active pods in this club yet.
          </Text>
        ) : (
          pods.map((pod) => (
            <PodCard key={pod.id} pod={pod} width={cardWidth} onPress={() => onOpenPod(pod)} />
          ))
        )}
      </YStack>
    </YStack>
  );
}
