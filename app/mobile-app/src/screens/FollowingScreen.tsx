import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FeedList } from '@/components/FeedList';
import { PodCard } from '@/components/home/PodCard';
import { TabScreen } from '@/components/TabScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useFollowing, type FollowedClub, type FollowedPerson } from '@/hooks/useFollowing';
import type { RootStackParamList } from '@/navigation/types';

type Tab = 'PEOPLE' | 'CLUBS' | 'PODS';
const TABS: Tab[] = ['PEOPLE', 'CLUBS', 'PODS'];
const TAB_LABELS: Record<Tab, string> = { PEOPLE: 'People', CLUBS: 'Clubs', PODS: 'Pods' };
const EMPTY_TEXT: Record<Tab, string> = {
  PEOPLE: "You're not following anyone yet. Follow people to see them here.",
  CLUBS: "You're not following any clubs yet. Follow a club to see it here.",
  PODS: "You're not following any pods yet. Follow a pod to see it here.",
};

/** One followed person — avatar + name, opens their public profile. */
function PersonRow({ person, onPress }: Readonly<{ person: FollowedPerson; onPress: () => void }>) {
  return (
    <XStack
      testID={`following-person-${person.user_id}`}
      role="button"
      aria-label={`Open ${person.full_name ?? 'profile'}`}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      {person.profile_photo ? (
        <AppImage
          source={{ uri: person.profile_photo }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />
      ) : (
        <YStack
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={16} fontWeight="900" color="$onPrimary">
            {(person.full_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </YStack>
      )}
      <Text flex={1} fontSize={15} fontWeight="800" color="$color" numberOfLines={1}>
        {person.full_name || 'Duncit user'}
      </Text>
      <MaterialIcons name="chevron-right" size={22} color="#9aa0a6" />
    </XStack>
  );
}

/** One followed club — logo + name, opens the club. */
function ClubRow({ club, onPress }: Readonly<{ club: FollowedClub; onPress: () => void }>) {
  const logo = club.club_feature_images_and_videos?.[0]?.url ?? '';
  return (
    <XStack
      testID={`following-club-${club.id}`}
      role="button"
      aria-label={`Open ${club.club_name}`}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      {logo ? (
        <AppImage source={{ uri: logo }} style={{ width: 44, height: 44, borderRadius: 12 }} />
      ) : (
        <YStack
          width={44}
          height={44}
          borderRadius={12}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="groups" size={22} color="#ffffff" />
        </YStack>
      )}
      <Text flex={1} fontSize={15} fontWeight="800" color="$color" numberOfLines={1}>
        {club.club_name}
      </Text>
      <MaterialIcons name="chevron-right" size={22} color="#9aa0a6" />
    </XStack>
  );
}

/** Following tab — the people, clubs and pods the user follows (parity with
 * mWeb's FollowPage). Fixes followed people/clubs not appearing here. */
export function FollowingScreen() {
  const { people, followedClubs, followedPods, isLoading, refetch } = useFollowing();
  const { openPod, openClub } = useDetailNav();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 520);
  const [tab, setTab] = useState<Tab>('PEOPLE');

  const counts: Record<Tab, number> = {
    PEOPLE: people.length,
    CLUBS: followedClubs.length,
    PODS: followedPods.length,
  };

  return (
    <TabScreen testID="following-screen">
      <XStack gap={8} paddingHorizontal={16} paddingVertical={8}>
        {TABS.map((value) => {
          const selected = tab === value;
          return (
            <XStack
              key={value}
              testID={`following-tab-${value.toLowerCase()}`}
              role="button"
              aria-pressed={selected}
              onPress={() => setTab(value)}
              flex={1}
              height={36}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="900" color={selected ? '$onPrimary' : '$color'}>
                {TAB_LABELS[value]} {counts[value]}
              </Text>
            </XStack>
          );
        })}
      </XStack>

      {tab === 'PEOPLE' ? (
        <FeedList
          testID="following-list"
          isLoading={isLoading}
          isEmpty={counts.PEOPLE === 0}
          emptyText={EMPTY_TEXT.PEOPLE}
          onRefresh={refetch}
          data={people}
          keyExtractor={(person) => person.user_id}
          renderItem={(person) => (
            <PersonRow
              person={person}
              onPress={() => navigation.navigate('PublicProfile', { userId: person.user_id })}
            />
          )}
        />
      ) : null}
      {tab === 'CLUBS' ? (
        <FeedList
          testID="following-list"
          isLoading={isLoading}
          isEmpty={counts.CLUBS === 0}
          emptyText={EMPTY_TEXT.CLUBS}
          onRefresh={refetch}
          data={followedClubs}
          keyExtractor={(club) => club.id}
          renderItem={(club) => (
            <ClubRow club={club} onPress={() => openClub(club.id, club.club_name)} />
          )}
        />
      ) : null}
      {tab === 'PODS' ? (
        <FeedList
          testID="following-list"
          isLoading={isLoading}
          isEmpty={counts.PODS === 0}
          emptyText={EMPTY_TEXT.PODS}
          onRefresh={refetch}
          data={followedPods}
          keyExtractor={(pod) => pod.id}
          renderItem={(pod) => (
            <PodCard pod={pod} width={cardWidth} onPress={() => openPod(pod.id, pod.pod_title)} />
          )}
        />
      ) : null}
    </TabScreen>
  );
}
